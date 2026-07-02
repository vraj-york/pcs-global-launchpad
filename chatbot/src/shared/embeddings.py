"""
Shared Embedding Utilities

Embedding generation logic used across the application.
- generate_embedding: Synchronous, for single query embeddings (fast, no blocking)
- generate_embeddings_batch: Asynchronous, for document ingestion (many chunks)

Optimized for scale with client reuse in batch operations.
"""

import json
import logging
import asyncio

from typing import List


logger = logging.getLogger(__name__)


def generate_embedding(
    text: str,
    model_id: str = "amazon.titan-embed-text-v2:0",
    dimensions: int = 1024,
    normalize: bool = True,
    region: str = "us-east-1",
) -> List[float]:
    """
    Generate embedding vector for text (synchronous)
    
    Used for single query embeddings. Synchronous is fine since:
    - Single embedding is fast (~200-500ms)
    - No need for async overhead for single requests
    - Simpler dependency management (works with newer boto3)

    Args:
        text: Input text
        model_id: Bedrock embedding model ID
        dimensions: Embedding dimensions
        normalize: Whether to normalize
        region: AWS region

    Returns:
        Embedding vector as list of floats
    """
    import boto3
    
    bedrock = boto3.client("bedrock-runtime", region_name=region)
    body = json.dumps({"inputText": text, "dimensions": dimensions, "normalize": normalize})

    try:
        response = bedrock.invoke_model(
            modelId=model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        
        # Read response body
        response_body = response["body"].read()
        result = json.loads(response_body)
        
        logger.debug(f"Generated embedding for text (length: {len(text)} chars)")
        return result["embedding"]
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {str(e)}", exc_info=True)
        raise


async def _generate_embedding_with_client(
    bedrock_client,
    text: str,
    model_id: str,
    dimensions: int,
    normalize: bool,
) -> List[float]:
    """
    Internal async function to generate embedding with a provided client.
    Allows client reuse for better performance in batch operations.
    """
    body = json.dumps({"inputText": text, "dimensions": dimensions, "normalize": normalize})

    try:
        response = await bedrock_client.invoke_model(
            modelId=model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        
        # Read response body
        response_body = await response["body"].read()
        result = json.loads(response_body)
        
        logger.debug(f"Generated embedding for text (length: {len(text)} chars)")
        return result["embedding"]
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {str(e)}", exc_info=True)
        raise


async def generate_embeddings_batch(
    texts: List[str],
    model_id: str = "amazon.titan-embed-text-v2:0",
    dimensions: int = 1024,
    normalize: bool = True,
    region: str = "us-east-1",
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts (async, processes concurrently)
    
    Used for document ingestion where many chunks need embeddings.
    Async processing with client reuse significantly reduces overhead.
    
    Optimized: Reuses a single session and client for all embeddings in the batch,
    significantly reducing connection overhead at scale.

    Args:
        texts: List of input texts
        model_id: Bedrock embedding model ID
        dimensions: Embedding dimensions
        normalize: Whether to normalize
        region: AWS region

    Returns:
        List of embedding vectors
    """
    import aioboto3
    
    logger.info(f"Generating embeddings for {len(texts)} texts")
    
    try:
        # Create single session and client for the entire batch (reuse optimization)
        session = aioboto3.Session()
        async with session.client("bedrock-runtime", region_name=region) as bedrock:
            # Generate embeddings concurrently using the same client
            tasks = [
                _generate_embedding_with_client(bedrock, text, model_id, dimensions, normalize)
                for text in texts
            ]
            embeddings = await asyncio.gather(*tasks)
        
        logger.info(f"Successfully generated {len(embeddings)} embeddings")
        return embeddings
        
    except Exception as e:
        logger.error(f"Failed to generate batch embeddings: {str(e)}", exc_info=True)
        raise
