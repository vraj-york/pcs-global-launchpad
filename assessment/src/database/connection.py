from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os
import json
import boto3
from typing import Generator
from urllib.parse import quote_plus
from dotenv import load_dotenv
from pathlib import Path
from utils.logger import logger


def normalize_database_url(url: str) -> str:
    """
    SQLAlchemy 2.x requires the postgresql:// scheme.
    Heroku and some tools still emit postgres://, which raises:
    NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres
    """
    normalized = url.strip()
    if normalized.startswith("postgres://"):
        normalized = "postgresql://" + normalized[len("postgres://") :]
    return normalized

def get_database_credentials() -> dict:
    """
    Get database credentials from either:
    1. Secrets Manager (Lambda environment)
    2. .env file (local development)
    """
    # Check if running in Lambda (RDS_SECRET_ARN is set)
    secret_arn = os.getenv("RDS_SECRET_ARN")
    
    if secret_arn:
        # Running in Lambda - get credentials from Secrets Manager
        # AWS Lambda automatically sets AWS_REGION environment variable
        logger.info(f"Fetching database credentials from Secrets Manager: {secret_arn}")
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        try:
            response = client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(response['SecretString'])
            logger.debug(f"Retrieved secret keys: {list(secret.keys())}")
            
            # Get username/password from Secrets Manager
            # Get host/port/dbname from environment variables (passed by CDK)
            creds = {
                'username': secret.get('username'),
                'password': secret.get('password'),
                'host': os.getenv('DB_HOST'),
                'port': int(os.getenv('DB_PORT', 5432)),
                'dbname': os.getenv('DB_NAME'),
            }
            logger.info(f"Database credentials loaded: username={creds.get('username')}, host={creds.get('host')}, dbname={creds.get('dbname')}")
            return creds
        except Exception as e:
            logger.error(f"Error fetching from Secrets Manager: {e}")
            raise ValueError(f"Failed to retrieve database credentials from Secrets Manager: {e}")
    else:
        # Running locally - load from .env
        logger.info("Running locally, loading database credentials from .env file")
        env_path = Path(__file__).parent.parent / ".env"
        load_dotenv(env_path, override=True)
        
        # Try DATABASE_URL first
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            logger.debug("Using DATABASE_URL from .env")
            return {'database_url': database_url}
        
        # Fallback to individual env vars
        logger.debug("Using individual DB_* environment variables from .env")
        return {
            'username': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'host': os.getenv('DB_HOST'),
            'port': os.getenv('DB_PORT', 5432),
            'dbname': os.getenv('DB_NAME'),
        }

# Global variables for lazy initialization
_engine = None
_SessionLocal = None

def get_database_url() -> str:
    """
    Build DATABASE_URL from credentials
    """
    creds = get_database_credentials()
    
    # If database_url is already provided, return it
    if 'database_url' in creds:
        return normalize_database_url(creds['database_url'])
    
    # Otherwise, build from components
    username = creds.get('username')
    password = creds.get('password')
    host = creds.get('host')
    port = creds.get('port', 5432)
    dbname = creds.get('dbname')
    
    if not all([username, password, host, dbname]):
        raise ValueError(
            f"Database configuration incomplete. Required: username, password, host, dbname. "
            f"Got: username={username}, host={host}, dbname={dbname}"
        )
    
    return normalize_database_url(
        f"postgresql://{quote_plus(str(username))}:{quote_plus(str(password))}"
        f"@{host}:{port}/{quote_plus(str(dbname))}"
    )

def get_engine():
    """
    Get or create SQLAlchemy engine (lazy initialization)
    """
    global _engine
    if _engine is None:
        logger.info("Initializing database engine")
        database_url = get_database_url()
        _engine = create_engine(
            database_url,
            pool_pre_ping=True,  # Verify connections before using
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600,  # Recycle connections after 1 hour
            echo=os.getenv("SQL_ECHO", "false").lower() == "true"  # Log SQL queries if enabled
        )
        logger.info("Database engine initialized successfully")
    return _engine

def get_session_local():
    """
    Get or create SessionLocal factory (lazy initialization)
    """
    global _SessionLocal
    if _SessionLocal is None:
        logger.debug("Creating SessionLocal factory")
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine()
        )
    return _SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI routes to get database session
    
    Usage:
        @router.get("/questions")
        def get_questions(db: Session = Depends(get_db)):
            ...
    """
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_context():
    """
    Context manager for database sessions (use in services/scripts)
    
    Usage:
        with get_db_context() as db:
            result = db.query(Question).all()
    """
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def test_connection() -> bool:
    """Test database connectivity"""
    try:
        logger.info("Testing database connection")
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False