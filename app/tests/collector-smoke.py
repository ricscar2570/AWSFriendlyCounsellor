import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "tools" / "awsfc-discover.py"
spec = importlib.util.spec_from_file_location("awsfc_discover", PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

REGION = "eu-central-1"
LB = "arn:aws:elasticloadbalancing:eu-central-1:123456789012:loadbalancer/app/web/abc"
TG = "arn:aws:elasticloadbalancing:eu-central-1:123456789012:targetgroup/web/def"
ECS_CLUSTER = "arn:aws:ecs:eu-central-1:123456789012:cluster/prod"
ECS_SERVICE = "arn:aws:ecs:eu-central-1:123456789012:service/prod/web"
WAF = "arn:aws:wafv2:eu-central-1:123456789012:regional/webacl/api/aaa"
API_STAGE = "arn:aws:apigateway:eu-central-1::/restapis/api123/stages/prod"


def fake_run(args, profile=None, region=None):
    key = tuple(args)
    if key[:2] == ("ec2", "describe-instances"):
        return {"Reservations": [{"Instances": [{
            "InstanceId": "i-123",
            "InstanceType": "t3.micro",
            "VpcId": "vpc-1",
            "SubnetId": "subnet-1",
            "State": {"Name": "running"},
            "SecurityGroups": [{"GroupId": "sg-1"}],
        }]}]}
    if key[:2] == ("ec2", "describe-vpcs"):
        return {"Vpcs": [{"VpcId": "vpc-1", "IsDefault": False}]}
    if key[:2] == ("ec2", "describe-subnets"):
        return {"Subnets": [{"SubnetId": "subnet-1", "VpcId": "vpc-1", "AvailabilityZone": REGION + "a"}]}
    if key[:2] == ("ec2", "describe-security-groups"):
        return {"SecurityGroups": [{"GroupId": "sg-1", "VpcId": "vpc-1", "GroupName": "web"}]}
    if key[:2] == ("ec2", "describe-nat-gateways"):
        return {"NatGateways": []}
    if key[:2] == ("elbv2", "describe-load-balancers"):
        return {"LoadBalancers": [{
            "LoadBalancerArn": LB,
            "LoadBalancerName": "web",
            "State": {"Code": "active"},
            "Type": "application",
            "Scheme": "internet-facing",
            "VpcId": "vpc-1",
            "SecurityGroups": ["sg-1"],
            "AvailabilityZones": [{"SubnetId": "subnet-1"}],
            "DNSName": "web.example.elb.amazonaws.com",
        }]}
    if key[:2] == ("elbv2", "describe-target-groups"):
        return {"TargetGroups": [{
            "TargetGroupArn": TG,
            "TargetGroupName": "web",
            "VpcId": "vpc-1",
            "Protocol": "HTTP",
            "Port": 80,
            "TargetType": "instance",
            "LoadBalancerArns": [LB],
        }]}
    if key[:2] == ("elbv2", "describe-target-health"):
        return {"TargetHealthDescriptions": [{
            "Target": {"Id": "i-123", "Port": 8080, "AvailabilityZone": REGION + "a"},
            "TargetHealth": {"State": "healthy"},
        }]}
    if key[:2] == ("lambda", "list-functions"):
        return {"Functions": []}
    if key[:2] == ("lambda", "list-event-source-mappings"):
        return {"EventSourceMappings": []}
    if key[:2] == ("dynamodb", "list-tables"):
        return {"TableNames": []}
    if key[:2] == ("rds", "describe-db-subnet-groups"):
        return {"DBSubnetGroups": []}
    if key[:2] == ("rds", "describe-db-instances"):
        return {"DBInstances": []}
    if key[:2] == ("rds", "describe-db-clusters"):
        return {"DBClusters": []}
    if key[:2] == ("ecs", "list-clusters"):
        return {"clusterArns": [ECS_CLUSTER]}
    if key[:2] == ("ecs", "list-services"):
        return {"serviceArns": [ECS_SERVICE]}
    if key[:2] == ("ecs", "describe-services"):
        return {"services": [{
            "serviceArn": ECS_SERVICE,
            "serviceName": "web",
            "status": "ACTIVE",
            "launchType": "FARGATE",
            "capacityProviderStrategy": [{"capacityProvider": "FARGATE"}],
            "networkConfiguration": {"awsvpcConfiguration": {
                "subnets": ["subnet-1"],
                "securityGroups": ["sg-1"],
            }},
            "loadBalancers": [{"targetGroupArn": TG, "containerName": "web", "containerPort": 8080}],
        }]}
    if key[:2] == ("eks", "list-clusters"):
        return {"clusters": []}
    if key[:2] == ("apigateway", "get-rest-apis"):
        return {"items": [{"id": "api123", "name": "api", "endpointConfiguration": {"types": ["REGIONAL"]}}]}
    if key[:2] == ("apigateway", "get-resources"):
        return {"items": []}
    if key[:2] == ("apigatewayv2", "get-apis"):
        return {"Items": []}
    if key[:2] == ("cognito-idp", "list-user-pools"):
        return {"UserPools": []}
    if key[:2] == ("sqs", "list-queues"):
        return {"QueueUrls": []}
    if key[:2] == ("sns", "list-topics"):
        return {"Topics": []}
    if key[:2] == ("sns", "list-subscriptions"):
        return {"Subscriptions": []}
    if key[:2] == ("events", "list-rules"):
        return {"Rules": []}
    if key[:2] == ("cloudwatch", "describe-alarms"):
        return {"MetricAlarms": [], "CompositeAlarms": []}
    if key[:2] == ("wafv2", "list-web-acls"):
        return {"WebACLs": [{"ARN": WAF, "Id": "aaa", "Name": "api"}]}
    if key[:2] == ("wafv2", "list-resources-for-web-acl"):
        resource_type = args[args.index("--resource-type") + 1]
        if resource_type == "APPLICATION_LOAD_BALANCER":
            return {"ResourceArns": [LB]}
        if resource_type == "API_GATEWAY":
            return {"ResourceArns": [API_STAGE]}
        return {"ResourceArns": []}
    if key[:2] == ("resourcegroupstaggingapi", "get-resources"):
        return {"ResourceTagMappingList": [{
            "ResourceARN": ECS_SERVICE,
            "Tags": [{"Key": "AWSFCProjectId", "Value": "project-1"}],
        }]}
    raise AssertionError(f"unexpected AWS command: {args}")


module.run_aws = fake_run
resources, relationships, errors = [], [], []
module.collect_region(resources, relationships, errors, None, REGION)
module.apply_resource_tags(resources, errors, None, REGION)

assert not errors, errors
assert any(r["service"] == "ec2" and r["type"] == "instance" and r["id"] == "i-123" for r in resources)
ecs_service = next(r for r in resources if r["service"] == "ecs" and r["type"] == "service" and r["id"] == ECS_SERVICE)
assert ecs_service["metadata"]["launch_type"] == "FARGATE"
assert "FARGATE" in ecs_service["metadata"]["capacity_providers"]
assert ecs_service["tags"]["AWSFCProjectId"] == "project-1"

def has(kind, source_service=None, target_service=None, source_id=None, target_id=None):
    for rel in relationships:
        if rel["kind"] != kind:
            continue
        if source_service and rel["source"]["service"] != source_service:
            continue
        if target_service and rel["target"]["service"] != target_service:
            continue
        if source_id and rel["source"]["id"] != source_id:
            continue
        if target_id and rel["target"]["id"] != target_id:
            continue
        return rel
    return None

assert has("forwards-to", "elasticloadbalancing", "elasticloadbalancing", LB, TG)
target_rel = has("routes-to-target", "elasticloadbalancing", "ec2", TG, "i-123")
assert target_rel and target_rel["metadata"]["health_state"] == "healthy"
assert has("routes-to-service", "elasticloadbalancing", "ecs", TG, ECS_SERVICE)
assert has("member-of-cluster", "ecs", "ecs", ECS_SERVICE, ECS_CLUSTER)
assert has("protected-by-waf", "elasticloadbalancing", "wafv2", LB, WAF)
api_waf = has("protected-by-waf", "apigateway", "wafv2", "api123", WAF)
assert api_waf and api_waf["metadata"]["stage"] == "prod"

stage = module.api_gateway_target_from_stage_arn(API_STAGE, REGION)
assert stage["service"] == "apigateway" and stage["type"] == "rest-api" and stage["id"] == "api123" and stage["stage"] == "prod"

assert module.elb_target_endpoint("instance", "i-123", REGION) == module.endpoint("ec2", "instance", "i-123", REGION)
assert module.elb_target_endpoint("ip", "10.0.0.8", REGION)["service"] == "external"
assert module.target_from_arn("arn:aws:lambda:eu-central-1:123456789012:function:fn:3", REGION)["id"] == "fn"

print("COLLECTOR SEMANTICS SMOKE PASS", {
    "resources": len(resources),
    "relationships": len(relationships),
    "errors": len(errors),
})
