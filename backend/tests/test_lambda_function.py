import pytest
from backend.lambda.lambda_function import get_best_aws_service

def test_lambda_function():
    response = get_best_aws_service(15)
    assert response is not None
