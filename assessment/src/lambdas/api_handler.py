"""
Lambda handler for FastAPI application
Uses Mangum to wrap FastAPI for AWS Lambda
"""
from mangum import Mangum
from api.main import app
from utils.logger import logger

# Mangum handler - converts API Gateway events to ASGI
handler = Mangum(app, lifespan="off")

# For local testing
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting local development server...")
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )