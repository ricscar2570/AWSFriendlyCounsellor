import json
import openai
from utils.secrets_manager import get_openai_api_key
from utils.region_mapping import get_region_name
from utils.error_handler import handle_error
from service_selector import select_best_aws_service
from fastapi import FastAPI

app = FastAPI()

openai.api_key = get_openai_api_key()

def get_best_aws_service(user_budget):
    try:
        services = fetch_services_from_db()
        return select_best_aws_service(services, user_budget)
    except Exception as e:
        return handle_error(str(e))

def lambda_handler(event, context):
    """API per ottenere il miglior servizio AWS in base al budget"""
    try:
        body = json.loads(event["body"])
        budget = body.get("budget", 0)

        best_service = get_best_aws_service(budget)

        return {
            "statusCode": 200,
            "body": json.dumps({"bestService": best_service}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    except Exception as e:
        return handle_error(str(e))
