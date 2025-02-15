def select_best_aws_service(services, budget):
    """Seleziona il miglior servizio AWS in base al costo"""
    best_service = None
    min_cost = float("inf")

    for service in services:
        if service["cost"] <= budget and service["cost"] < min_cost:
            min_cost = service["cost"]
            best_service = service

    return best_service if best_service else "Nessun servizio disponibile nel budget."
