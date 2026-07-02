"""
Lambda handler for FastAPI Assessment API
Uses Mangum to adapt FastAPI to AWS Lambda
"""
from mangum import Mangum
from api.main import app

def handler(event, context):
    """
    AWS Lambda handler function
    
    Wraps FastAPI app with Mangum for Lambda compatibility.
    """
    asgi_handler = Mangum(app, lifespan="off")
    return asgi_handler(event, context)
