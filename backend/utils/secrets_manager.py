import boto3
import os
import json

def get_openai_api_key():
    """Recupera la chiave API di OpenAI da AWS Secrets Manager"""
    secret_name = os.getenv("OPENAI_SECRET_NAME", "openai_api_key")
    region_name = os.getenv("AWS_REGION", "us-east-1")

    try:
        client = boto3.client("secretsmanager", region_name=region_name)
        response = client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response["SecretString"])
        return secret.get("OPENAI_API_KEY")
    
    except Exception as e:
        print(f"Errore nel recupero della chiave API: {e}")
        return None
