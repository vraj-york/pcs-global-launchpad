#!/usr/bin/env python3
"""
Test RAG Infrastructure

This script tests:
1. S3 bucket access
2. Database connectivity
3. Bedrock Titan Embeddings access
4. End-to-end document processing

Run after infrastructure deployment and database initialization:
    python scripts/test_rag_infrastructure.py --env dev
"""

import boto3
import psycopg2
import json
import argparse
import sys
import time
from typing import Dict, List

from env_config import EnvConfigError, exit_on_config_error, get_rds_connection_info

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{GREEN}✓{RESET} {text}")


def print_error(text: str):
    """Print error message"""
    print(f"{RED}✗{RESET} {text}")


def print_info(text: str):
    """Print info message"""
    print(f"{YELLOW}→{RESET} {text}")


def get_db_credentials(secret_arn: str, region: str) -> Dict[str, str]:
    """Retrieve database credentials from Secrets Manager"""
    client = boto3.client('secretsmanager', region_name=region)
    # Note: SecretId parameter accepts both secret name and ARN
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response['SecretString'])


def get_stack_outputs(stack_name: str, region: str) -> Dict[str, str]:
    """Get CloudFormation stack outputs"""
    cf_client = boto3.client('cloudformation', region_name=region)
    
    try:
        response = cf_client.describe_stacks(StackName=stack_name)
        outputs = response['Stacks'][0]['Outputs']
        
        result = {}
        for output in outputs:
            result[output['OutputKey']] = output['OutputValue']
        
        return result
    except Exception as e:
        print_error(f"Could not get outputs from stack {stack_name}: {str(e)}")
        return {}


def test_s3_access(env_name: str, region: str) -> bool:
    """Test S3 bucket access"""
    print_header("TEST 1: S3 Bucket Access")
    
    s3_client = boto3.client('s3', region_name=region)
    
    # Get bucket name from CloudFormation
    outputs = get_stack_outputs(f"ChatbotS3Stack-{env_name}", region)
    bucket_name = outputs.get('DocumentsBucketName')
    
    if not bucket_name:
        print_error("Could not get S3 bucket name from CloudFormation")
        return False
    
    print_info(f"Testing bucket: {bucket_name}")
    
    try:
        # Test bucket exists and is accessible
        response = s3_client.head_bucket(Bucket=bucket_name)
        print_success("Bucket exists and is accessible")
        
        # Test list objects
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print_success("Can list objects in bucket")
        
        # Test upload
        test_key = "test/connectivity-test.txt"
        test_content = f"Connectivity test at {time.time()}"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=test_content.encode('utf-8'),
            ServerSideEncryption='AES256'
        )
        print_success(f"Successfully uploaded test file: {test_key}")
        
        # Test download
        response = s3_client.get_object(Bucket=bucket_name, Key=test_key)
        content = response['Body'].read().decode('utf-8')
        if content == test_content:
            print_success("Successfully downloaded and verified test file")
        
        # Test delete
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        print_success("Successfully deleted test file")
        
        print_success(f"\nS3 Access Test: PASSED")
        return True
        
    except Exception as e:
        print_error(f"S3 access test failed: {str(e)}")
        return False


def test_database_connectivity(env_name: str, region: str) -> bool:
    """Test database connectivity and schema"""
    print_header("TEST 2: Database Connectivity")

    try:
        db_info = get_rds_connection_info(env_name)
    except EnvConfigError as exc:
        print_error(str(exc))
        return False

    db_host = db_info["host"]
    db_port = db_info["port"]
    db_name = db_info["dbname"]
    secret_arn = db_info["secret_arn"]
    
    print_info(f"Connecting to: {db_host}:{db_port}/{db_name}")
    
    try:
        # Get credentials
        credentials = get_db_credentials(secret_arn, region)
        
        # Connect to database
        conn = psycopg2.connect(
            host=db_host,
            port=int(db_port),
            dbname=db_name,
            user=credentials['username'],
            password=credentials['password'],
            connect_timeout=10
        )
        cursor = conn.cursor()
        print_success("Successfully connected to database")
        
        # Test pgvector extension
        cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        result = cursor.fetchone()
        if result:
            print_success(f"pgvector extension installed: v{result[1]}")
        else:
            print_error("pgvector extension not found - run init_database.py first")
            return False
        
        # Test tables exist
        required_tables = ['documents', 'document_chunks', 'query_history']
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        )
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        for table in required_tables:
            if table in existing_tables:
                print_success(f"Table '{table}' exists")
            else:
                print_error(f"Table '{table}' missing - run init_database.py first")
                return False
        
        # Test vector index exists
        cursor.execute(
            "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_chunk_embedding_hnsw';"
        )
        if cursor.fetchone():
            print_success("Vector similarity index (HNSW) exists")
        else:
            print_error("Vector index missing - run init_database.py first")
            return False
        
        # Test insert and query
        cursor.execute("""
            INSERT INTO documents (filename, s3_key, s3_bucket, status)
            VALUES ('test.txt', 'test/test.txt', 'test-bucket', 'ready')
            RETURNING id;
        """)
        doc_id = cursor.fetchone()[0]
        print_success(f"Successfully inserted test document (ID: {doc_id})")
        
        # Clean up
        cursor.execute(f"DELETE FROM documents WHERE id = {doc_id};")
        conn.commit()
        print_success("Successfully cleaned up test data")
        
        cursor.close()
        conn.close()
        
        print_success("\nDatabase Connectivity Test: PASSED")
        return True
        
    except Exception as e:
        print_error(f"Database connectivity test failed: {str(e)}")
        return False


def test_bedrock_embeddings(region: str) -> bool:
    """Test Bedrock Titan Embeddings access"""
    print_header("TEST 3: Bedrock Titan Embeddings")
    
    bedrock_client = boto3.client('bedrock-runtime', region_name=region)
    
    model_id = "amazon.titan-embed-text-v2:0"
    print_info(f"Testing model: {model_id}")
    
    try:
        # Test embedding generation
        test_texts = [
            "Hello world",
            "This is a test of the Titan Text Embeddings V2 model",
            "RAG systems combine retrieval and generation for better AI responses"
        ]
        
        for i, text in enumerate(test_texts, 1):
            body = json.dumps({
                "inputText": text,
                "dimensions": 1024,
                "normalize": True
            })
            
            response = bedrock_client.invoke_model(
                modelId=model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
            result = json.loads(response['body'].read())
            embedding = result.get('embedding', [])
            
            if len(embedding) == 1024:
                print_success(f"Test {i}: Generated 1024-dim embedding for '{text[:50]}...'")
            else:
                print_error(f"Test {i}: Unexpected embedding dimension: {len(embedding)}")
                return False
        
        # Test batch processing performance
        print_info("\nTesting batch performance...")
        start_time = time.time()
        
        for _ in range(10):
            body = json.dumps({
                "inputText": "Performance test",
                "dimensions": 1024,
                "normalize": True
            })
            bedrock_client.invoke_model(
                modelId=model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
        
        elapsed = time.time() - start_time
        avg_time = elapsed / 10
        print_success(f"Average embedding time: {avg_time:.3f}s (10 requests in {elapsed:.2f}s)")
        
        print_success("\nBedrock Embeddings Test: PASSED")
        return True
        
    except Exception as e:
        print_error(f"Bedrock embeddings test failed: {str(e)}")
        if "AccessDeniedException" in str(e):
            print_error("Make sure Titan Text Embeddings V2 model access is enabled in Bedrock console")
        return False


def test_end_to_end(env_name: str, region: str) -> bool:
    """Test end-to-end document processing"""
    print_header("TEST 4: End-to-End Document Processing")
    
    try:
        # Get all required resources
        s3_outputs = get_stack_outputs(f"ChatbotS3Stack-{env_name}", region)
        try:
            rds_info = get_rds_connection_info(env_name)
        except EnvConfigError as exc:
            print_error(str(exc))
            return False

        bucket_name = s3_outputs.get('DocumentsBucketName')
        db_host = rds_info["host"]
        db_port = rds_info["port"]
        db_name = rds_info["dbname"]
        secret_arn = rds_info["secret_arn"]

        if not bucket_name:
            print_error("Could not get S3 bucket name from CloudFormation")
            return False
        
        # 1. Upload test document to S3
        s3_client = boto3.client('s3', region_name=region)
        test_doc = "This is a test document for RAG system validation. " * 20
        test_key = f"test/end-to-end-test-{int(time.time())}.txt"
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=test_doc.encode('utf-8'),
            ServerSideEncryption='AES256'
        )
        print_success(f"Uploaded test document to S3: {test_key}")
        
        # 2. Generate embedding
        bedrock_client = boto3.client('bedrock-runtime', region_name=region)
        body = json.dumps({
            "inputText": test_doc[:500],  # First 500 chars
            "dimensions": 1024,
            "normalize": True
        })
        
        response = bedrock_client.invoke_model(
            modelId="amazon.titan-embed-text-v2:0",
            body=body,
            contentType="application/json",
            accept="application/json"
        )
        
        embedding = json.loads(response['body'].read())['embedding']
        print_success(f"Generated embedding (1024 dimensions)")
        
        # 3. Store in database
        credentials = get_db_credentials(secret_arn, region)
        conn = psycopg2.connect(
            host=db_host,
            port=int(db_port),
            dbname=db_name,
            user=credentials['username'],
            password=credentials['password']
        )
        cursor = conn.cursor()
        
        # Insert document
        cursor.execute("""
            INSERT INTO documents (filename, s3_key, s3_bucket, status)
            VALUES (%s, %s, %s, 'ready')
            RETURNING id;
        """, ("test-doc.txt", test_key, bucket_name))
        doc_id = cursor.fetchone()[0]
        print_success(f"Stored document metadata (ID: {doc_id})")
        
        # Insert chunk with embedding
        cursor.execute("""
            INSERT INTO document_chunks (document_id, chunk_index, chunk_text, chunk_embedding)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (doc_id, 0, test_doc, embedding))
        chunk_id = cursor.fetchone()[0]
        print_success(f"Stored chunk with embedding (ID: {chunk_id})")
        
        # 4. Test vector similarity search
        cursor.execute("""
            SELECT id, chunk_text, chunk_embedding <=> %s::vector AS distance
            FROM document_chunks
            WHERE document_id = %s
            ORDER BY chunk_embedding <=> %s::vector
            LIMIT 1;
        """, (embedding, doc_id, embedding))
        
        result = cursor.fetchone()
        if result and result[2] < 0.01:  # Should be very close to 0
            print_success(f"Vector similarity search working (distance: {result[2]:.6f})")
        else:
            print_error("Vector similarity search returned unexpected results")
            return False
        
        # Clean up
        cursor.execute(f"DELETE FROM documents WHERE id = {doc_id};")
        conn.commit()
        cursor.close()
        conn.close()
        
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        print_success("Cleaned up test data")
        
        print_success("\nEnd-to-End Test: PASSED")
        return True
        
    except Exception as e:
        print_error(f"End-to-end test failed: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Test RAG infrastructure"
    )
    parser.add_argument(
        "--env",
        type=str,
        default="stage",
        choices=["dev", "stage", "uat", "prod"],
        help="Environment name"
    )
    parser.add_argument(
        "--region",
        type=str,
        default="us-east-1",
        help="AWS region"
    )
    
    args = parser.parse_args()
    
    print_header("RAG INFRASTRUCTURE TEST SUITE")
    print(f"Environment: {args.env}")
    print(f"Region: {args.region}\n")
    
    # Check AWS credentials
    try:
        boto3.client('sts').get_caller_identity()
    except Exception as e:
        print_error("AWS credentials not configured!")
        print("Please run: aws configure")
        sys.exit(1)
    
    # Run tests
    results = []
    results.append(("S3 Access", test_s3_access(args.env, args.region)))
    results.append(("Database Connectivity", test_database_connectivity(args.env, args.region)))
    results.append(("Bedrock Embeddings", test_bedrock_embeddings(args.region)))
    results.append(("End-to-End Processing", test_end_to_end(args.env, args.region)))
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{GREEN}PASSED{RESET}" if result else f"{RED}FAILED{RESET}"
        print(f"{test_name:.<50} {status}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n{GREEN}All tests passed! RAG infrastructure is ready.{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}Some tests failed. Please review the output above.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
