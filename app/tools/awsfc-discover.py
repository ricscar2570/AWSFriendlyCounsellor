#!/usr/bin/env python3
"""AWS Friendly Counsellor M5-A1 read-only discovery collector.

Uses the locally installed AWS CLI and its existing credential/profile chain.
No access key, secret key, session token, password, or resource payload is
written to the discovery bundle. The output contains inventory metadata only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
from typing import Any, Callable

FORMAT = "awsfc-aws-discovery"
FORMAT_VERSION = 1
COLLECTOR_VERSION = "1.0.0-m5a1"


def run_aws(args: list[str], profile: str | None = None, region: str | None = None) -> dict[str, Any]:
    cmd = ["aws", *args, "--output", "json", "--no-cli-pager"]
    if profile:
        cmd.extend(["--profile", profile])
    if region:
        cmd.extend(["--region", region])
    env = os.environ.copy()
    env["AWS_PAGER"] = ""
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        message = (proc.stderr or proc.stdout or "AWS CLI command failed").strip()
        raise RuntimeError(message[:2000])
    text = proc.stdout.strip()
    return json.loads(text) if text else {}


def arn_partition(arn: str | None) -> str:
    if arn and arn.startswith("arn:"):
        parts = arn.split(":")
        if len(parts) > 1 and parts[1]:
            return parts[1]
    return "aws"


def add(resources: list[dict[str, Any]], service: str, rtype: str, rid: Any,
        region: str = "global", arn: Any = None, name: Any = None,
        state: Any = None, metadata: dict[str, Any] | None = None) -> None:
    if rid is None or str(rid).strip() == "":
        return
    resources.append({
        "service": service,
        "type": rtype,
        "id": str(rid),
        "region": region,
        "arn": str(arn) if arn else None,
        "name": str(name) if name else None,
        "state": str(state) if state is not None else None,
        "metadata": metadata or {},
    })


def safe(call: Callable[[], None], errors: list[dict[str, str]], scope: str) -> None:
    try:
        call()
    except Exception as exc:
        errors.append({"scope": scope, "message": str(exc)[:2000]})


def enabled_regions(profile: str | None, bootstrap_region: str) -> list[str]:
    data = run_aws(["ec2", "describe-regions", "--all-regions"], profile, bootstrap_region)
    rows = data.get("Regions") or []
    allowed = {"opt-in-not-required", "opted-in", None}
    out = sorted({r.get("RegionName") for r in rows if r.get("RegionName") and r.get("OptInStatus") in allowed})
    return out or [bootstrap_region]


def collect_global(resources: list[dict[str, Any]], errors: list[dict[str, str]], profile: str | None, bootstrap_region: str) -> None:
    def s3():
        data = run_aws(["s3api", "list-buckets"], profile, bootstrap_region)
        for x in data.get("Buckets") or []:
            add(resources, "s3", "bucket", x.get("Name"), "global", name=x.get("Name"),
                metadata={"creation_date": x.get("CreationDate")})
    safe(s3, errors, "s3:list-buckets")

    def cloudfront():
        data = run_aws(["cloudfront", "list-distributions"], profile, bootstrap_region)
        for x in ((data.get("DistributionList") or {}).get("Items") or []):
            add(resources, "cloudfront", "distribution", x.get("Id"), "global", arn=x.get("ARN"),
                name=x.get("DomainName"), state=x.get("Status"),
                metadata={"enabled": bool(x.get("Enabled")), "http_version": x.get("HttpVersion")})
    safe(cloudfront, errors, "cloudfront:list-distributions")

    def route53():
        data = run_aws(["route53", "list-hosted-zones"], profile, bootstrap_region)
        for x in data.get("HostedZones") or []:
            add(resources, "route53", "hosted-zone", x.get("Id"), "global", name=x.get("Name"),
                metadata={"private_zone": bool((x.get("Config") or {}).get("PrivateZone"))})
    safe(route53, errors, "route53:list-hosted-zones")


def collect_region(resources: list[dict[str, Any]], errors: list[dict[str, str]], profile: str | None, region: str) -> None:
    def ec2_instances():
        data = run_aws(["ec2", "describe-instances"], profile, region)
        for res in data.get("Reservations") or []:
            for x in res.get("Instances") or []:
                add(resources, "ec2", "instance", x.get("InstanceId"), region,
                    state=(x.get("State") or {}).get("Name"),
                    metadata={"instance_type": x.get("InstanceType"), "vpc_id": x.get("VpcId"), "subnet_id": x.get("SubnetId")})
    safe(ec2_instances, errors, f"{region}:ec2:instances")

    for command, key, rtype, id_key, extra in [
        (["ec2", "describe-vpcs"], "Vpcs", "vpc", "VpcId", lambda x: {"is_default": bool(x.get("IsDefault"))}),
        (["ec2", "describe-subnets"], "Subnets", "subnet", "SubnetId", lambda x: {"vpc_id": x.get("VpcId"), "az": x.get("AvailabilityZone")}),
        (["ec2", "describe-security-groups"], "SecurityGroups", "security-group", "GroupId", lambda x: {"vpc_id": x.get("VpcId"), "group_name": x.get("GroupName")}),
        (["ec2", "describe-nat-gateways"], "NatGateways", "nat-gateway", "NatGatewayId", lambda x: {"vpc_id": x.get("VpcId"), "subnet_id": x.get("SubnetId")}),
    ]:
        def collect_simple(command=command, key=key, rtype=rtype, id_key=id_key, extra=extra):
            data = run_aws(command, profile, region)
            for x in data.get(key) or []:
                add(resources, "ec2", rtype, x.get(id_key), region, state=(x.get("State") if rtype=="nat-gateway" else None), metadata=extra(x))
        safe(collect_simple, errors, f"{region}:{':'.join(command)}")

    def elbv2():
        data = run_aws(["elbv2", "describe-load-balancers"], profile, region)
        for x in data.get("LoadBalancers") or []:
            add(resources, "elasticloadbalancing", "load-balancer", x.get("LoadBalancerArn"), region,
                arn=x.get("LoadBalancerArn"), name=x.get("LoadBalancerName"),
                state=(x.get("State") or {}).get("Code"),
                metadata={"type": x.get("Type"), "scheme": x.get("Scheme"), "vpc_id": x.get("VpcId")})
    safe(elbv2, errors, f"{region}:elbv2")

    def lambdas():
        data = run_aws(["lambda", "list-functions"], profile, region)
        for x in data.get("Functions") or []:
            add(resources, "lambda", "function", x.get("FunctionName"), region, arn=x.get("FunctionArn"),
                name=x.get("FunctionName"), metadata={"runtime": x.get("Runtime"), "memory_size": x.get("MemorySize"), "timeout": x.get("Timeout")})
    safe(lambdas, errors, f"{region}:lambda")

    def dynamodb():
        data = run_aws(["dynamodb", "list-tables"], profile, region)
        for name in data.get("TableNames") or []:
            add(resources, "dynamodb", "table", name, region, name=name)
    safe(dynamodb, errors, f"{region}:dynamodb")

    def rds():
        data = run_aws(["rds", "describe-db-instances"], profile, region)
        for x in data.get("DBInstances") or []:
            add(resources, "rds", "db-instance", x.get("DBInstanceIdentifier"), region, arn=x.get("DBInstanceArn"),
                name=x.get("DBName") or x.get("DBInstanceIdentifier"), state=x.get("DBInstanceStatus"),
                metadata={"engine": x.get("Engine"), "class": x.get("DBInstanceClass"), "multi_az": bool(x.get("MultiAZ"))})
        data = run_aws(["rds", "describe-db-clusters"], profile, region)
        for x in data.get("DBClusters") or []:
            add(resources, "rds", "db-cluster", x.get("DBClusterIdentifier"), region, arn=x.get("DBClusterArn"),
                state=x.get("Status"), metadata={"engine": x.get("Engine"), "multi_az": bool(x.get("MultiAZ"))})
    safe(rds, errors, f"{region}:rds")

    def ecs():
        data = run_aws(["ecs", "list-clusters"], profile, region)
        for arn in data.get("clusterArns") or []:
            add(resources, "ecs", "cluster", arn, region, arn=arn, name=str(arn).rsplit("/", 1)[-1])
    safe(ecs, errors, f"{region}:ecs")

    def eks():
        data = run_aws(["eks", "list-clusters"], profile, region)
        for name in data.get("clusters") or []:
            add(resources, "eks", "cluster", name, region, name=name)
    safe(eks, errors, f"{region}:eks")

    def apigw():
        data = run_aws(["apigateway", "get-rest-apis"], profile, region)
        for x in data.get("items") or []:
            add(resources, "apigateway", "rest-api", x.get("id"), region, name=x.get("name"),
                metadata={"endpoint_types": ((x.get("endpointConfiguration") or {}).get("types") or [])})
        data = run_aws(["apigatewayv2", "get-apis"], profile, region)
        for x in data.get("Items") or []:
            add(resources, "apigateway", "v2-api", x.get("ApiId"), region, name=x.get("Name"),
                metadata={"protocol_type": x.get("ProtocolType")})
    safe(apigw, errors, f"{region}:apigateway")

    def cognito():
        data = run_aws(["cognito-idp", "list-user-pools", "--max-results", "60"], profile, region)
        for x in data.get("UserPools") or []:
            add(resources, "cognito", "user-pool", x.get("Id"), region, name=x.get("Name"),
                state=x.get("Status"), metadata={"estimated_users": x.get("EstimatedNumberOfUsers")})
    safe(cognito, errors, f"{region}:cognito-idp")

    def alarms():
        data = run_aws(["cloudwatch", "describe-alarms"], profile, region)
        for x in data.get("MetricAlarms") or []:
            add(resources, "cloudwatch", "metric-alarm", x.get("AlarmName"), region, arn=x.get("AlarmArn"),
                name=x.get("AlarmName"), state=x.get("StateValue"),
                metadata={"namespace": x.get("Namespace"), "metric_name": x.get("MetricName")})
        for x in data.get("CompositeAlarms") or []:
            add(resources, "cloudwatch", "composite-alarm", x.get("AlarmName"), region, arn=x.get("AlarmArn"),
                name=x.get("AlarmName"), state=x.get("StateValue"))
    safe(alarms, errors, f"{region}:cloudwatch")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a credential-free read-only AWS inventory bundle for AWS Friendly Counsellor.")
    parser.add_argument("--profile", help="Existing AWS CLI profile name. No secret values are accepted.")
    parser.add_argument("--regions", help="Comma-separated regions. If omitted, enabled regions are discovered.")
    parser.add_argument("--bootstrap-region", default="us-east-1", help="Region used for STS/region discovery (default: us-east-1).")
    parser.add_argument("--output", default="awsfc-discovery.json", help="Output JSON path.")
    args = parser.parse_args()

    if not shutil.which("aws"):
        print("AWS CLI was not found on PATH.", file=sys.stderr)
        return 2

    try:
        identity = run_aws(["sts", "get-caller-identity"], args.profile, args.bootstrap_region)
    except Exception as exc:
        print(f"Unable to call sts:GetCallerIdentity: {exc}", file=sys.stderr)
        return 3

    account_id = str(identity.get("Account") or "")
    arn = identity.get("Arn")
    if len(account_id) != 12 or not account_id.isdigit():
        print("STS did not return a valid 12-digit account id.", file=sys.stderr)
        return 4

    if args.regions:
        regions = sorted({x.strip() for x in args.regions.split(",") if x.strip()})
    else:
        try:
            regions = enabled_regions(args.profile, args.bootstrap_region)
        except Exception as exc:
            print(f"Unable to discover enabled regions: {exc}", file=sys.stderr)
            return 5

    resources: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    collect_global(resources, errors, args.profile, args.bootstrap_region)
    for region in regions:
        collect_region(resources, errors, args.profile, region)

    dedup: dict[str, dict[str, Any]] = {}
    for item in resources:
        key = "|".join([item["service"], item["type"], item["region"], item["id"]])
        dedup.setdefault(key, item)

    out = {
        "format": FORMAT,
        "format_version": FORMAT_VERSION,
        "collector_version": COLLECTOR_VERSION,
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "account": {"id": account_id, "arn": arn, "partition": arn_partition(arn)},
        "regions": regions,
        "resources": list(dedup.values()),
        "errors": errors,
    }
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, sort_keys=True)
        fh.write("\n")

    print(f"Wrote {args.output}: {len(out['resources'])} resources across {len(regions)} regions; {len(errors)} non-fatal collection errors.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
