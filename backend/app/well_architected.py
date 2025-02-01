import json
import boto3

# Client per AWS Well-Architected Tool
well_architected_client = boto3.client("wellarchitected", region_name="us-east-1")

def get_best_practice(workload_type):
    """Recupera best practice AWS per il workload specifico"""
    try:
        response = well_architected_client.list_lenses()
        return response["LensSummaries"]
    except Exception as e:
        return f"Errore nel recupero best practice: {str(e)}"

def well_architected_lambda_handler(event, context):
    """Lambda Function per recuperare le best practice AWS"""
    try:
        body = json.loads(event['body'])
        workload = body.get('workloadType', "web")

        best_practices = get_best_practice(workload)

        return {
            "statusCode": 200,
            "body": json.dumps({"bestPractices": best_practices}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
