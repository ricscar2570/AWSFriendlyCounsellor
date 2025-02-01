import json
import boto3
import sqlite3
import openai
import os
import uuid
from app.well_architected import get_best_practice  # ✅ Importiamo la funzione per Well-Architected Tool

# AWS Clients
pricing_client = boto3.client("pricing", region_name="us-east-1")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("AWSRecommendations")

# OpenAI API Key (usare AWS Secrets Manager in produzione)
openai.api_key = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")

def get_aws_price(service_code, region, pricing_model):
    """Recupera il prezzo attuale di un servizio AWS per regione e piano di pricing"""
    try:
        response = pricing_client.get_products(
            ServiceCode=service_code,
            Filters=[
                {"Type": "TERM_MATCH", "Field": "location", "Value": region},
                {"Type": "TERM_MATCH", "Field": "termType", "Value": pricing_model}  # OnDemand, Reserved
            ]
        )
        product_data = json.loads(response["PriceList"][0])
        price_dimensions = list(product_data["terms"][pricing_model].values())[0]["priceDimensions"]
        price = list(price_dimensions.values())[0]["pricePerUnit"]["USD"]
        return float(price)
    except Exception as e:
        return f"Errore nel recupero prezzo: {str(e)}"

def get_data_transfer_cost(region):
    """Simula il costo di trasferimento dati in uscita per la regione selezionata"""
    data_transfer_rates = {
        "US East (N. Virginia)": 0.09,
        "US West (Oregon)": 0.08,
        "EU (Frankfurt)": 0.10,
        "Asia Pacific (Tokyo)": 0.12
    }
    return data_transfer_rates.get(region, 0.09)  # Default costo

def get_best_aws_service(budget, workload, scalability, reliability, region, pricing_model):
    """Seleziona il miglior servizio AWS aggiornato con prezzi reali e considerazione di dati di trasferimento"""
    conn = sqlite3.connect("backend/data/aws_services.db")
    cursor = conn.cursor()

    query = """
    SELECT name, scalability, reliability 
    FROM aws_services 
    WHERE scalability = ? AND reliability = ?
    """
    cursor.execute(query, (scalability, reliability))
    services = cursor.fetchall()
    conn.close()

    best_service = None
    for service in services:
        name = service[0]
        price = get_aws_price(name, region, pricing_model)
        data_transfer_cost = get_data_transfer_cost(region)
        total_cost = price + data_transfer_cost  # Consideriamo anche il costo di trasferimento dati

        if total_cost <= budget:
            best_service = {
                "service": name,
                "cost": total_cost,
                "scalability": service[1],
                "reliability": service[2],
                "region": region,
                "pricingModel": pricing_model,
                "dataTransferCost": data_transfer_cost
            }
            break

    return best_service if best_service else {"error": "Nessun servizio AWS trovato."}

def evaluate_service_with_gpt(service, budget, workload, scalability, reliability, region, pricing_model):
    """Utilizza GPT-4 per ottimizzare la scelta del servizio AWS e spiegare la raccomandazione"""
    try:
        prompt = f"""
        Sei un esperto AWS. Valuta la scelta del servizio {service} considerando i seguenti fattori:
        - Budget disponibile: {budget}$
        - Tipo di workload: {workload}
        - Scalabilità richiesta: {scalability}
        - Affidabilità richiesta: {reliability}
        - Regione AWS: {region}
        - Modello di pricing: {pricing_model}
        - Alternative AWS disponibili

        Spiega se {service} è la scelta migliore e suggerisci eventuali alternative con motivazioni dettagliate.
        """
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "Sei un consulente esperto in AWS."},
                      {"role": "user", "content": prompt}]
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Errore AI: {str(e)}"

def lambda_handler(event, context):
    """Gestisce le richieste API per raccomandazioni AWS"""
    try:
        body = json.loads(event['body'])
        action = body.get('action', '')  # Definisce il tipo di richiesta

        if action == "recommendation":
            user_id = body.get("userId", "unknown")
            budget = float(body.get('budget', 0))
            workload = body.get('workloadType', "web")
            scalability = body.get('scalability', "Alta")
            reliability = body.get('reliability', "Critica")
            region = body.get('region', "US East (N. Virginia)")
            pricing_model = body.get('pricingModel', "OnDemand")  # Default On-Demand

            best_service = get_best_aws_service(budget, workload, scalability, reliability, region, pricing_model)
            ai_evaluation = evaluate_service_with_gpt(best_service.get('service', 'Nessun Servizio'),
                                                      budget, workload, scalability, reliability,
                                                      region, pricing_model)

            response_data = {
                "bestService": best_service,
                "aiEvaluation": ai_evaluation,
                "message": "Raccomandazione completata"
            }

        elif action == "best_practices":
            workload = body.get('workloadType', "web")
            best_practices = get_best_practice(workload)
            response_data = {"bestPractices": best_practices}

        else:
            response_data = {"message": "Azione non riconosciuta."}

        return {
            "statusCode": 200,
            "body": json.dumps(response_data),
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
