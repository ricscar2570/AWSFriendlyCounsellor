import json

def handle_error(error_message):
    """Genera un messaggio di errore standardizzato."""
    return {
        "statusCode": 500,
        "body": json.dumps({"error": error_message}),
        "headers": {"Content-Type": "application/json"}
    }
