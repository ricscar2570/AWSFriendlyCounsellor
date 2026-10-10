#!/usr/bin/env python3
"""AWS Friendly Counsellor M5-A2 read-only relationship discovery collector.

Uses the locally installed AWS CLI credential/profile chain. The collector writes
resource metadata and observed architecture relationships only. It never accepts
or writes AWS access keys, secret keys, session tokens, passwords, secret values,
Lambda environment values, database contents, S3 objects, or application payloads.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
from typing import Any, Callable

FORMAT = "awsfc-aws-discovery"
FORMAT_VERSION = 2
COLLECTOR_VERSION = "2.0.1-m5a2-audit"
SAFE_TAG_KEYS = {"awsfcprojectid"}


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
    body = proc.stdout.strip()
    return json.loads(body) if body else {}


def arn_partition(arn: str | None) -> str:
    if arn and arn.startswith("arn:"):
        parts = arn.split(":")
        if len(parts) > 1 and parts[1]:
            return parts[1]
    return "aws"


def arn_parts(arn: str | None) -> dict[str, str]:
    if not arn or not str(arn).startswith("arn:"):
        return {}
    parts = str(arn).split(":", 5)
    if len(parts) != 6:
        return {}
    return {
        "partition": parts[1],
        "service": parts[2],
        "region": parts[3] or "global",
        "account": parts[4],
        "resource": parts[5],
    }


def endpoint(service: str, rtype: str, rid: Any, region: str = "global") -> dict[str, str]:
    return {"service": service, "type": rtype, "id": str(rid), "region": region or "global"}


def target_from_arn(arn: str, fallback_region: str) -> dict[str, str] | None:
    p = arn_parts(arn)
    if not p:
        return None
    service, resource, region = p["service"], p["resource"], p["region"] or fallback_region
    if service == "lambda":
        name = resource.split("function:", 1)[-1].split(":", 1)[0]
        return endpoint("lambda", "function", name, region)
    if service == "sqs":
        return endpoint("sqs", "queue", resource, region)
    if service == "sns":
        return endpoint("sns", "topic", resource, region)
    if service == "dynamodb" and resource.startswith("table/"):
        name = resource.split("/", 1)[1].split("/", 1)[0]
        return endpoint("dynamodb", "table", name, region)
    if service == "kinesis" and "stream/" in resource:
        return endpoint("kinesis", "stream", resource.split("stream/", 1)[1].split("/", 1)[0], region)
    if service == "events":
        return endpoint("eventbridge", "rule", resource.split("/", 1)[-1], region)
    return endpoint(service, "arn-resource", arn, region)


def lambda_target_from_uri(uri: Any, region: str) -> dict[str, str] | None:
    if not uri:
        return None
    match = re.search(r"functions/(arn:[^/]+)/invocations", str(uri))
    if match:
        return target_from_arn(match.group(1), region)
    if str(uri).startswith("arn:"):
        return target_from_arn(str(uri), region)
    return None


def api_gateway_target_from_stage_arn(arn: Any, region: str) -> dict[str, str] | None:
    """Resolve an API Gateway stage ARN to the owning REST API when possible."""
    value = str(arn or "")
    match = re.search(r"/restapis/([^/]+)/stages/([^/]+)$", value)
    if not match:
        return endpoint("apigateway", "stage-arn", value, region) if value else None
    target = endpoint("apigateway", "rest-api", match.group(1), region)
    target["stage"] = match.group(2)
    return target


def elb_target_endpoint(target_type: Any, target_id: Any, region: str) -> dict[str, str] | None:
    """Map ELBv2 target-health IDs to graph endpoints without inventing resources."""
    if not target_id:
        return None
    target_type = str(target_type or "").lower()
    target_id = str(target_id)
    if target_type == "instance":
        return endpoint("ec2", "instance", target_id, region)
    if target_type == "lambda":
        return target_from_arn(target_id, region)
    if target_type == "alb":
        return endpoint("elasticloadbalancing", "load-balancer", target_id, region)
    if target_type == "ip":
        return endpoint("external", "ip-address", target_id, region)
    return endpoint("external", "elb-target", target_id, region)


def add(resources: list[dict[str, Any]], service: str, rtype: str, rid: Any,
        region: str = "global", arn: Any = None, name: Any = None,
        state: Any = None, metadata: dict[str, Any] | None = None,
        tags: dict[str, Any] | None = None) -> None:
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
        "tags": {str(k): str(v) for k, v in (tags or {}).items()},
        "metadata": metadata or {},
    })


def tag_list(rows: Any) -> dict[str, str]:
    """Retain only AWSFC project-scoping tags; arbitrary resource tags stay out of evidence."""
    out: dict[str, str] = {}
    if isinstance(rows, dict):
        items = rows.items()
    else:
        items = []
        for row in rows or []:
            if not isinstance(row, dict):
                continue
            items.append((row.get("Key", row.get("key")), row.get("Value", row.get("value"))))
    for key, value in items:
        if key is None or str(key).lower() not in SAFE_TAG_KEYS:
            continue
        out["AWSFCProjectId"] = str(value if value is not None else "")[:256]
    return out


def relate(relationships: list[dict[str, Any]], source: dict[str, str] | None,
           target: dict[str, str] | None, kind: str, evidence: str,
           metadata: dict[str, Any] | None = None) -> None:
    if not source or not target:
        return
    relationships.append({
        "source": source,
        "target": target,
        "kind": kind,
        "confidence": "observed",
        "evidence": evidence,
        "metadata": metadata or {},
    })


def safe(call: Callable[[], None], errors: list[dict[str, str]], scope: str) -> None:
    try:
        call()
    except Exception as exc:
        errors.append({"scope": scope, "message": str(exc)[:2000]})


def apply_resource_tags(resources: list[dict[str, Any]], errors: list[dict[str, str]],
                        profile: str | None, region: str) -> None:
    """Merge Resource Groups Tagging API metadata onto already discovered ARNs."""
    try:
        data = run_aws(["resourcegroupstaggingapi", "get-resources"], profile, region)
    except Exception as exc:
        errors.append({"scope": f"{region}:resourcegroupstaggingapi:get-resources", "message": str(exc)[:2000]})
        return
    by_arn = {
        str(row.get("ResourceARN")): tag_list(row.get("Tags") or [])
        for row in data.get("ResourceTagMappingList") or []
        if row.get("ResourceARN")
    }
    for resource in resources:
        arn = resource.get("arn")
        if arn and arn in by_arn:
            resource["tags"] = by_arn[arn]


def enabled_regions(profile: str | None, bootstrap_region: str) -> list[str]:
    data = run_aws(["ec2", "describe-regions", "--all-regions"], profile, bootstrap_region)
    rows = data.get("Regions") or []
    allowed = {"opt-in-not-required", "opted-in", None}
    out = sorted({r.get("RegionName") for r in rows if r.get("RegionName") and r.get("OptInStatus") in allowed})
    return out or [bootstrap_region]


def collect_global(resources: list[dict[str, Any]], relationships: list[dict[str, Any]],
                   errors: list[dict[str, str]], profile: str | None, bootstrap_region: str,
                   partition: str) -> None:
    def s3():
        data = run_aws(["s3api", "list-buckets"], profile, bootstrap_region)
        for x in data.get("Buckets") or []:
            bucket = x.get("Name")
            if not bucket:
                continue
            bucket_region = bootstrap_region
            try:
                loc = run_aws(["s3api", "get-bucket-location", "--bucket", bucket], profile, bootstrap_region)
                bucket_region = loc.get("LocationConstraint") or "us-east-1"
                if bucket_region == "EU":
                    bucket_region = "eu-west-1"
            except Exception as exc:
                errors.append({"scope": f"s3:{bucket}:location", "message": str(exc)[:2000]})
            bucket_tags = {}
            try:
                tag_data = run_aws(["s3api", "get-bucket-tagging", "--bucket", bucket], profile, bucket_region)
                bucket_tags = tag_list(tag_data.get("TagSet") or [])
            except Exception as exc:
                message = str(exc)
                if "NoSuchTagSet" not in message:
                    errors.append({"scope": f"s3:{bucket}:tags", "message": message[:2000]})
            add(resources, "s3", "bucket", bucket, "global", arn=f"arn:{partition}:s3:::{bucket}", name=bucket,
                tags=bucket_tags, metadata={"creation_date": x.get("CreationDate"), "bucket_region": bucket_region})
            try:
                n = run_aws(["s3api", "get-bucket-notification-configuration", "--bucket", bucket], profile, bucket_region)
                src = endpoint("s3", "bucket", bucket, "global")
                for row in n.get("LambdaFunctionConfigurations") or []:
                    relate(relationships, src, target_from_arn(row.get("LambdaFunctionArn"), bucket_region),
                           "notifies", "S3 LambdaFunctionConfiguration", {"events": row.get("Events") or []})
                for row in n.get("QueueConfigurations") or []:
                    relate(relationships, src, target_from_arn(row.get("QueueArn"), bucket_region),
                           "notifies", "S3 QueueConfiguration", {"events": row.get("Events") or []})
                for row in n.get("TopicConfigurations") or []:
                    relate(relationships, src, target_from_arn(row.get("TopicArn"), bucket_region),
                           "notifies", "S3 TopicConfiguration", {"events": row.get("Events") or []})
            except Exception as exc:
                errors.append({"scope": f"s3:{bucket}:notifications", "message": str(exc)[:2000]})
    safe(s3, errors, "s3:list-buckets")

    def cloudfront():
        data = run_aws(["cloudfront", "list-distributions"], profile, bootstrap_region)
        for x in ((data.get("DistributionList") or {}).get("Items") or []):
            origins = []
            src = endpoint("cloudfront", "distribution", x.get("Id"), "global")
            for origin in ((x.get("Origins") or {}).get("Items") or []):
                domain = str(origin.get("DomainName") or "")
                target = None
                match = re.match(r"^([^.]+)\.s3(?:[.-][^.]+)?\.amazonaws\.com$", domain)
                if match:
                    target = endpoint("s3", "bucket", match.group(1), "global")
                elif domain:
                    target = endpoint("external", "dns-name", domain, "global")
                origins.append({"id": origin.get("Id"), "domain_name": domain, "target": target,
                                "evidence": "CloudFront Origins"})
                relate(relationships, src, target, "routes-to", "CloudFront Origins", {"origin_id": origin.get("Id")})
            cf_tags = {}
            if x.get("ARN"):
                try:
                    tag_data = run_aws(["cloudfront", "list-tags-for-resource", "--resource", x.get("ARN")], profile, bootstrap_region)
                    cf_tags = tag_list(((tag_data.get("Tags") or {}).get("Items") or []))
                except Exception as exc:
                    errors.append({"scope": f"cloudfront:{x.get('Id')}:tags", "message": str(exc)[:2000]})
            add(resources, "cloudfront", "distribution", x.get("Id"), "global", arn=x.get("ARN"),
                name=x.get("DomainName"), state=x.get("Status"), tags=cf_tags,
                metadata={"enabled": bool(x.get("Enabled")), "http_version": x.get("HttpVersion"),
                          "origins": origins, "web_acl_id": x.get("WebACLId")})
            if x.get("WebACLId"):
                relate(relationships, src, endpoint("wafv2", "web-acl", x.get("WebACLId"), "global"),
                       "protected-by-waf", "CloudFront WebACLId")
    safe(cloudfront, errors, "cloudfront:list-distributions")

    def route53():
        data = run_aws(["route53", "list-hosted-zones"], profile, bootstrap_region)
        for x in data.get("HostedZones") or []:
            zid = x.get("Id")
            r53_tags = {}
            if zid:
                try:
                    tag_data = run_aws(["route53", "list-tags-for-resource", "--resource-type", "hostedzone",
                                        "--resource-id", str(zid).split("/")[-1]], profile, bootstrap_region)
                    r53_tags = tag_list(((tag_data.get("ResourceTagSet") or {}).get("Tags") or []))
                except Exception as exc:
                    errors.append({"scope": f"route53:{zid}:tags", "message": str(exc)[:2000]})
            add(resources, "route53", "hosted-zone", zid, "global",
                arn=f"arn:{partition}:route53:::{str(zid or '').lstrip('/')}", name=x.get("Name"), tags=r53_tags,
                metadata={"private_zone": bool((x.get("Config") or {}).get("PrivateZone"))})
            if not zid:
                continue
            try:
                records = run_aws(["route53", "list-resource-record-sets", "--hosted-zone-id", zid], profile, bootstrap_region)
                src = endpoint("route53", "hosted-zone", zid, "global")
                for rr in records.get("ResourceRecordSets") or []:
                    alias = (rr.get("AliasTarget") or {}).get("DNSName")
                    if alias:
                        relate(relationships, src, endpoint("external", "dns-name", str(alias).rstrip("."), "global"),
                               "routes-to", "Route53 AliasTarget", {"record_name": rr.get("Name"), "record_type": rr.get("Type")})
            except Exception as exc:
                errors.append({"scope": f"route53:{zid}:records", "message": str(exc)[:2000]})
    safe(route53, errors, "route53:list-hosted-zones")

    def global_waf():
        data = run_aws(["wafv2", "list-web-acls", "--scope", "CLOUDFRONT"], profile, "us-east-1")
        for x in data.get("WebACLs") or []:
            add(resources, "wafv2", "web-acl", x.get("ARN") or x.get("Id"), "global",
                arn=x.get("ARN"), name=x.get("Name"), metadata={"scope": "CLOUDFRONT", "id": x.get("Id")})
    safe(global_waf, errors, "wafv2:CLOUDFRONT")


def collect_region(resources: list[dict[str, Any]], relationships: list[dict[str, Any]],
                   errors: list[dict[str, str]], profile: str | None, region: str) -> None:
    def ec2_instances():
        data = run_aws(["ec2", "describe-instances"], profile, region)
        for res in data.get("Reservations") or []:
            for x in res.get("Instances") or []:
                sg_ids = [g.get("GroupId") for g in x.get("SecurityGroups") or [] if g.get("GroupId")]
                add(resources, "ec2", "instance", x.get("InstanceId"), region,
                    state=(x.get("State") or {}).get("Name"),
                    tags=tag_list(x.get("Tags") or []),
                    metadata={"instance_type": x.get("InstanceType"), "vpc_id": x.get("VpcId"),
                              "subnet_id": x.get("SubnetId"), "security_group_ids": sg_ids})
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
                add(resources, "ec2", rtype, x.get(id_key), region,
                    state=(x.get("State") if rtype == "nat-gateway" else None),
                    tags=tag_list(x.get("Tags") or []), metadata=extra(x))
        safe(collect_simple, errors, f"{region}:{':'.join(command)}")

    def elbv2():
        data = run_aws(["elbv2", "describe-load-balancers"], profile, region)
        for x in data.get("LoadBalancers") or []:
            arn = x.get("LoadBalancerArn")
            sg_ids = [v for v in x.get("SecurityGroups") or [] if v]
            subnet_ids = [a.get("SubnetId") for a in x.get("AvailabilityZones") or [] if a.get("SubnetId")]
            add(resources, "elasticloadbalancing", "load-balancer", arn, region, arn=arn,
                name=x.get("LoadBalancerName"), state=(x.get("State") or {}).get("Code"),
                metadata={"type": x.get("Type"), "scheme": x.get("Scheme"), "vpc_id": x.get("VpcId"),
                          "subnet_ids": subnet_ids, "security_group_ids": sg_ids, "dns_name": x.get("DNSName")})
        tgs = run_aws(["elbv2", "describe-target-groups"], profile, region)
        for x in tgs.get("TargetGroups") or []:
            arn = x.get("TargetGroupArn")
            target_type = x.get("TargetType")
            add(resources, "elasticloadbalancing", "target-group", arn, region, arn=arn, name=x.get("TargetGroupName"),
                metadata={"vpc_id": x.get("VpcId"), "protocol": x.get("Protocol"), "port": x.get("Port"),
                          "target_type": target_type, "load_balancer_arns": x.get("LoadBalancerArns") or []})
            src = endpoint("elasticloadbalancing", "target-group", arn, region)
            for lb in x.get("LoadBalancerArns") or []:
                relate(relationships, endpoint("elasticloadbalancing", "load-balancer", lb, region), src,
                       "forwards-to", "ELB target group association")
            if not arn:
                continue
            try:
                health = run_aws(["elbv2", "describe-target-health", "--target-group-arn", arn], profile, region)
                for row in health.get("TargetHealthDescriptions") or []:
                    target = row.get("Target") or {}
                    relate(
                        relationships,
                        src,
                        elb_target_endpoint(target_type, target.get("Id"), region),
                        "routes-to-target",
                        "ELB target health registration",
                        {
                            "port": target.get("Port"),
                            "availability_zone": target.get("AvailabilityZone"),
                            "health_state": (row.get("TargetHealth") or {}).get("State"),
                        },
                    )
            except Exception as exc:
                errors.append({"scope": f"{region}:elbv2:{arn}:target-health", "message": str(exc)[:2000]})
    safe(elbv2, errors, f"{region}:elbv2")

    def lambdas():
        data = run_aws(["lambda", "list-functions"], profile, region)
        for x in data.get("Functions") or []:
            vpc = x.get("VpcConfig") or {}
            add(resources, "lambda", "function", x.get("FunctionName"), region, arn=x.get("FunctionArn"),
                name=x.get("FunctionName"), state=x.get("State"),
                metadata={"runtime": x.get("Runtime"), "memory_size": x.get("MemorySize"), "timeout": x.get("Timeout"),
                          "vpc_id": vpc.get("VpcId"), "subnet_ids": vpc.get("SubnetIds") or [],
                          "security_group_ids": vpc.get("SecurityGroupIds") or []})
        mappings = run_aws(["lambda", "list-event-source-mappings"], profile, region)
        for x in mappings.get("EventSourceMappings") or []:
            source_arn = x.get("EventSourceArn")
            function_arn = x.get("FunctionArn")
            source = target_from_arn(source_arn, region) if source_arn else None
            target = target_from_arn(function_arn, region) if function_arn else None
            relate(relationships, source, target, "triggers", "Lambda EventSourceMapping",
                   {"state": x.get("State"), "uuid": x.get("UUID")})
    safe(lambdas, errors, f"{region}:lambda")

    def dynamodb():
        data = run_aws(["dynamodb", "list-tables"], profile, region)
        for name in data.get("TableNames") or []:
            try:
                detail = run_aws(["dynamodb", "describe-table", "--table-name", name], profile, region).get("Table") or {}
                add(resources, "dynamodb", "table", name, region, arn=detail.get("TableArn"), name=name,
                    state=detail.get("TableStatus"),
                    metadata={"billing_mode": (detail.get("BillingModeSummary") or {}).get("BillingMode"),
                              "latest_stream_arn": detail.get("LatestStreamArn")})
            except Exception as exc:
                errors.append({"scope": f"{region}:dynamodb:{name}:describe", "message": str(exc)[:2000]})
                add(resources, "dynamodb", "table", name, region, name=name)
    safe(dynamodb, errors, f"{region}:dynamodb")

    def rds():
        subnet_groups = run_aws(["rds", "describe-db-subnet-groups"], profile, region)
        for x in subnet_groups.get("DBSubnetGroups") or []:
            name = x.get("DBSubnetGroupName")
            subnet_ids = [s.get("SubnetIdentifier") for s in x.get("Subnets") or [] if s.get("SubnetIdentifier")]
            add(resources, "rds", "db-subnet-group", name, region, arn=x.get("DBSubnetGroupArn"), name=name,
                state=x.get("SubnetGroupStatus"), tags=tag_list(x.get("TagList") or []),
                metadata={"vpc_id": x.get("VpcId"), "subnet_ids": subnet_ids})
        data = run_aws(["rds", "describe-db-instances"], profile, region)
        for x in data.get("DBInstances") or []:
            group = x.get("DBSubnetGroup") or {}
            sg_ids = [g.get("VpcSecurityGroupId") for g in x.get("VpcSecurityGroups") or [] if g.get("VpcSecurityGroupId")]
            add(resources, "rds", "db-instance", x.get("DBInstanceIdentifier"), region, arn=x.get("DBInstanceArn"),
                name=x.get("DBName") or x.get("DBInstanceIdentifier"), state=x.get("DBInstanceStatus"),
                tags=tag_list(x.get("TagList") or []),
                metadata={"engine": x.get("Engine"), "class": x.get("DBInstanceClass"), "multi_az": bool(x.get("MultiAZ")),
                          "vpc_id": group.get("VpcId"), "db_subnet_group": group.get("DBSubnetGroupName"),
                          "security_group_ids": sg_ids})
        data = run_aws(["rds", "describe-db-clusters"], profile, region)
        for x in data.get("DBClusters") or []:
            sg_ids = [g.get("VpcSecurityGroupId") for g in x.get("VpcSecurityGroups") or [] if g.get("VpcSecurityGroupId")]
            add(resources, "rds", "db-cluster", x.get("DBClusterIdentifier"), region, arn=x.get("DBClusterArn"),
                state=x.get("Status"), tags=tag_list(x.get("TagList") or []),
                metadata={"engine": x.get("Engine"), "multi_az": bool(x.get("MultiAZ")),
                                                 "db_subnet_group": x.get("DBSubnetGroup"),
                                                 "security_group_ids": sg_ids})
    safe(rds, errors, f"{region}:rds")

    def ecs():
        data = run_aws(["ecs", "list-clusters"], profile, region)
        for arn in data.get("clusterArns") or []:
            add(resources, "ecs", "cluster", arn, region, arn=arn, name=str(arn).rsplit("/", 1)[-1])
            try:
                services = run_aws(["ecs", "list-services", "--cluster", arn], profile, region)
                arns = services.get("serviceArns") or []
                for start in range(0, len(arns), 10):
                    batch = arns[start:start+10]
                    if not batch:
                        continue
                    detail = run_aws(["ecs", "describe-services", "--cluster", arn, "--services", *batch, "--include", "TAGS"], profile, region)
                    for s in detail.get("services") or []:
                        conf = s.get("networkConfiguration") or {}
                        awsvpc = conf.get("awsvpcConfiguration") or {}
                        sid = s.get("serviceArn") or s.get("serviceName")
                        target_groups = [lb.get("targetGroupArn") for lb in s.get("loadBalancers") or [] if lb.get("targetGroupArn")]
                        add(resources, "ecs", "service", sid, region, arn=s.get("serviceArn"), name=s.get("serviceName"),
                            state=s.get("status"), tags=tag_list(s.get("tags") or []),
                            metadata={"cluster_arn": arn, "subnet_ids": awsvpc.get("subnets") or [],
                                                            "security_group_ids": awsvpc.get("securityGroups") or [],
                                                            "target_group_arns": target_groups,
                                                            "launch_type": s.get("launchType"),
                                                            "capacity_providers": [x.get("capacityProvider") for x in s.get("capacityProviderStrategy") or [] if x.get("capacityProvider")]})
                        service_ep = endpoint("ecs", "service", sid, region)
                        relate(relationships, service_ep, endpoint("ecs", "cluster", arn, region),
                               "member-of-cluster", "ECS service cluster")
                        for tg in target_groups:
                            relate(relationships, endpoint("elasticloadbalancing", "target-group", tg, region), service_ep,
                                   "routes-to-service", "ECS service load balancer configuration")
            except Exception as exc:
                errors.append({"scope": f"{region}:ecs:{arn}:services", "message": str(exc)[:2000]})
    safe(ecs, errors, f"{region}:ecs")

    def eks():
        data = run_aws(["eks", "list-clusters"], profile, region)
        for name in data.get("clusters") or []:
            try:
                detail = (run_aws(["eks", "describe-cluster", "--name", name], profile, region).get("cluster") or {})
                vpc = detail.get("resourcesVpcConfig") or {}
                sg_ids = list(vpc.get("securityGroupIds") or [])
                if vpc.get("clusterSecurityGroupId"):
                    sg_ids.append(vpc.get("clusterSecurityGroupId"))
                add(resources, "eks", "cluster", name, region, arn=detail.get("arn"), name=name, state=detail.get("status"),
                    tags=tag_list(detail.get("tags") or {}),
                    metadata={"vpc_id": vpc.get("vpcId"), "subnet_ids": vpc.get("subnetIds") or [],
                              "security_group_ids": sorted(set(sg_ids)), "version": detail.get("version")})
            except Exception as exc:
                errors.append({"scope": f"{region}:eks:{name}:describe", "message": str(exc)[:2000]})
                add(resources, "eks", "cluster", name, region, name=name)
    safe(eks, errors, f"{region}:eks")

    def apigw():
        data = run_aws(["apigateway", "get-rest-apis"], profile, region)
        for x in data.get("items") or []:
            api_id = x.get("id")
            add(resources, "apigateway", "rest-api", api_id, region, name=x.get("name"),
                tags=tag_list(x.get("tags") or {}),
                metadata={"endpoint_types": ((x.get("endpointConfiguration") or {}).get("types") or [])})
            if not api_id:
                continue
            try:
                tree = run_aws(["apigateway", "get-resources", "--rest-api-id", api_id], profile, region)
                for resource in tree.get("items") or []:
                    for method in (resource.get("resourceMethods") or {}).keys():
                        try:
                            integ = run_aws(["apigateway", "get-integration", "--rest-api-id", api_id,
                                             "--resource-id", resource.get("id"), "--http-method", method], profile, region)
                            target = lambda_target_from_uri(integ.get("uri"), region)
                            relate(relationships, endpoint("apigateway", "rest-api", api_id, region), target,
                                   "invokes", "API Gateway REST integration",
                                   {"resource_path": resource.get("path"), "http_method": method, "integration_type": integ.get("type")})
                        except Exception as exc:
                            errors.append({"scope": f"{region}:apigateway:{api_id}:{resource.get('id')}:{method}",
                                           "message": str(exc)[:2000]})
            except Exception as exc:
                errors.append({"scope": f"{region}:apigateway:{api_id}:resources", "message": str(exc)[:2000]})

        data = run_aws(["apigatewayv2", "get-apis"], profile, region)
        for x in data.get("Items") or []:
            api_id = x.get("ApiId")
            add(resources, "apigateway", "v2-api", api_id, region, name=x.get("Name"),
                tags=tag_list(x.get("Tags") or {}),
                metadata={"protocol_type": x.get("ProtocolType"), "api_endpoint": x.get("ApiEndpoint")})
            if not api_id:
                continue
            try:
                ints = run_aws(["apigatewayv2", "get-integrations", "--api-id", api_id], profile, region)
                for integ in ints.get("Items") or []:
                    target = lambda_target_from_uri(integ.get("IntegrationUri"), region)
                    relate(relationships, endpoint("apigateway", "v2-api", api_id, region), target,
                           "invokes", "API Gateway v2 integration",
                           {"integration_id": integ.get("IntegrationId"), "integration_type": integ.get("IntegrationType")})
            except Exception as exc:
                errors.append({"scope": f"{region}:apigatewayv2:{api_id}:integrations", "message": str(exc)[:2000]})
    safe(apigw, errors, f"{region}:apigateway")

    def cognito():
        data = run_aws(["cognito-idp", "list-user-pools", "--max-results", "60"], profile, region)
        for x in data.get("UserPools") or []:
            add(resources, "cognito", "user-pool", x.get("Id"), region, name=x.get("Name"),
                state=x.get("Status"), metadata={"estimated_users": x.get("EstimatedNumberOfUsers")})
    safe(cognito, errors, f"{region}:cognito-idp")

    def messaging():
        q = run_aws(["sqs", "list-queues"], profile, region)
        for url in q.get("QueueUrls") or []:
            name = str(url).rstrip("/").rsplit("/", 1)[-1]
            queue_tags = {}
            try:
                queue_tags = tag_list((run_aws(["sqs", "list-queue-tags", "--queue-url", url], profile, region).get("Tags") or {}))
            except Exception as exc:
                errors.append({"scope": f"{region}:sqs:{name}:tags", "message": str(exc)[:2000]})
            add(resources, "sqs", "queue", name, region, name=name, tags=queue_tags, metadata={"queue_url": url})
        t = run_aws(["sns", "list-topics"], profile, region)
        for row in t.get("Topics") or []:
            arn = row.get("TopicArn")
            name = str(arn).rsplit(":", 1)[-1] if arn else None
            topic_tags = {}
            if arn:
                try:
                    topic_tags = tag_list(run_aws(["sns", "list-tags-for-resource", "--resource-arn", arn], profile, region).get("Tags") or [])
                except Exception as exc:
                    errors.append({"scope": f"{region}:sns:{name}:tags", "message": str(exc)[:2000]})
            add(resources, "sns", "topic", name or arn, region, arn=arn, name=name, tags=topic_tags)
        subs = run_aws(["sns", "list-subscriptions"], profile, region)
        for row in subs.get("Subscriptions") or []:
            topic_arn = row.get("TopicArn")
            protocol = row.get("Protocol")
            target = target_from_arn(row.get("Endpoint"), region) if str(row.get("Endpoint") or "").startswith("arn:") else None
            source = target_from_arn(topic_arn, region) if topic_arn else None
            relate(relationships, source, target, "delivers-to", "SNS subscription", {"protocol": protocol})
    safe(messaging, errors, f"{region}:messaging")

    def eventbridge():
        data = run_aws(["events", "list-rules"], profile, region)
        for rule in data.get("Rules") or []:
            name = rule.get("Name")
            rule_tags = {}
            if rule.get("Arn"):
                try:
                    rule_tags = tag_list(run_aws(["events", "list-tags-for-resource", "--resource-arn", rule.get("Arn")], profile, region).get("Tags") or [])
                except Exception as exc:
                    errors.append({"scope": f"{region}:events:{name}:tags", "message": str(exc)[:2000]})
            add(resources, "eventbridge", "rule", name, region, arn=rule.get("Arn"), name=name, state=rule.get("State"),
                tags=rule_tags, metadata={"event_bus_name": rule.get("EventBusName") or "default"})
            if not name:
                continue
            try:
                targets = run_aws(["events", "list-targets-by-rule", "--rule", name,
                                   "--event-bus-name", rule.get("EventBusName") or "default"], profile, region)
                for row in targets.get("Targets") or []:
                    relate(relationships, endpoint("eventbridge", "rule", name, region),
                           target_from_arn(row.get("Arn"), region), "targets", "EventBridge rule target",
                           {"target_id": row.get("Id")})
            except Exception as exc:
                errors.append({"scope": f"{region}:events:{name}:targets", "message": str(exc)[:2000]})
    safe(eventbridge, errors, f"{region}:eventbridge")

    def alarms():
        data = run_aws(["cloudwatch", "describe-alarms"], profile, region)
        for x in data.get("MetricAlarms") or []:
            add(resources, "cloudwatch", "metric-alarm", x.get("AlarmName"), region, arn=x.get("AlarmArn"),
                name=x.get("AlarmName"), state=x.get("StateValue"),
                metadata={"namespace": x.get("Namespace"), "metric_name": x.get("MetricName"),
                          "dimensions": x.get("Dimensions") or []})
        for x in data.get("CompositeAlarms") or []:
            add(resources, "cloudwatch", "composite-alarm", x.get("AlarmName"), region, arn=x.get("AlarmArn"),
                name=x.get("AlarmName"), state=x.get("StateValue"))
    safe(alarms, errors, f"{region}:cloudwatch")

    def regional_waf():
        data = run_aws(["wafv2", "list-web-acls", "--scope", "REGIONAL"], profile, region)
        for x in data.get("WebACLs") or []:
            arn = x.get("ARN")
            rid = arn or x.get("Id")
            add(resources, "wafv2", "web-acl", rid, region, arn=arn, name=x.get("Name"),
                metadata={"scope": "REGIONAL", "id": x.get("Id")})
            if not arn:
                continue
            for resource_type in ["APPLICATION_LOAD_BALANCER", "API_GATEWAY"]:
                try:
                    assoc = run_aws(["wafv2", "list-resources-for-web-acl", "--web-acl-arn", arn,
                                     "--resource-type", resource_type], profile, region)
                    for resource_arn in assoc.get("ResourceArns") or []:
                        if resource_type == "APPLICATION_LOAD_BALANCER":
                            target = endpoint("elasticloadbalancing", "load-balancer", resource_arn, region)
                            metadata = {"resource_type": resource_type}
                        else:
                            target = api_gateway_target_from_stage_arn(resource_arn, region)
                            metadata = {"resource_type": resource_type, "stage_arn": resource_arn}
                            if target and target.get("stage"):
                                metadata["stage"] = target.pop("stage")
                        relate(relationships, target, endpoint("wafv2", "web-acl", rid, region),
                               "protected-by-waf", "WAFv2 associated resource", metadata)
                except Exception as exc:
                    errors.append({"scope": f"{region}:wafv2:{x.get('Name')}:{resource_type}",
                                   "message": str(exc)[:2000]})
    safe(regional_waf, errors, f"{region}:wafv2")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a credential-free read-only AWS resource + relationship bundle for AWS Friendly Counsellor.")
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
    relationships: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    partition = arn_partition(arn)
    collect_global(resources, relationships, errors, args.profile, args.bootstrap_region, partition)
    for region in regions:
        collect_region(resources, relationships, errors, args.profile, region)

    # Project-scoped Desired-vs-Actual assessment relies on explicit AWS resource tags
    # when available. Missing tag-read permission is retained as a coverage gap.
    for region in sorted(set(regions + ["us-east-1"])):
        apply_resource_tags(resources, errors, args.profile, region)

    dedup_resources: dict[str, dict[str, Any]] = {}
    for item in resources:
        key = "|".join([item["service"], item["type"], item["region"], item["id"]])
        dedup_resources.setdefault(key, item)

    dedup_rel: dict[str, dict[str, Any]] = {}
    for item in relationships:
        s, t = item["source"], item["target"]
        key = "=>".join([
            "|".join([s["service"], s["type"], s["region"], s["id"]]),
            item["kind"],
            "|".join([t["service"], t["type"], t["region"], t["id"]]),
        ])
        dedup_rel.setdefault(key, item)

    out = {
        "format": FORMAT,
        "format_version": FORMAT_VERSION,
        "collector_version": COLLECTOR_VERSION,
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "account": {"id": account_id, "arn": arn, "partition": arn_partition(arn)},
        "regions": regions,
        "resources": list(dedup_resources.values()),
        "relationships": list(dedup_rel.values()),
        "errors": errors,
    }
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, sort_keys=True)
        fh.write("\n")

    print(
        f"Wrote {args.output}: {len(out['resources'])} resources, "
        f"{len(out['relationships'])} relationships across {len(regions)} regions; "
        f"{len(errors)} non-fatal collection errors."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
