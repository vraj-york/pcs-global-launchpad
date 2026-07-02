"""
Database Migration Lambda

Runs versioned SQL migrations against the private PostgreSQL RDS instance.
Each .sql file in the migrations/ folder is a numbered migration that runs
exactly once. Already-applied migrations are skipped, so this lambda is
safe to invoke multiple times.

Adding a new table or schema change:
    1. Create a new file in migrations/ following the naming convention:
       <NNN>_<description>.sql  (e.g. 002_add_users_table.sql)
    2. Write standard SQL in that file (CREATE TABLE, ALTER TABLE, etc.)
    3. Invoke this lambda — it will apply only the new migration(s).

Usage:
    aws lambda invoke --function-name bispy-bot-db-init-dev response.json
"""

import json
import os
import boto3
import psycopg2
from typing import Dict, Any


MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")

# Bootstraps the migration tracking table on first run
BOOTSTRAP_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
"""


def get_db_credentials(secret_arn: str) -> Dict[str, str]:
    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response["SecretString"])


def ensure_database_exists(
    host: str,
    port: int,
    db_name: str,
    user: str,
    password: str,
) -> None:
    """
    Ensure *db_name* exists before we try to run migrations against it.

    Strategy (avoids needing CREATEDB privilege in the normal case):
    1. Probe the target database with a cheap connection attempt.
       - Success → database already exists, nothing to do.
       - Failure with "does not exist" → fall through to step 2.
    2. Connect to the ``postgres`` maintenance database and issue
       CREATE DATABASE.  This requires CREATEDB privilege on the DB user.
       - If that also fails with a permission error, raise a human-readable
         exception telling the operator exactly what SQL to run manually.
    """
    # Step 1: probe the target database directly.
    try:
        probe = psycopg2.connect(
            host=host,
            port=port,
            dbname=db_name,
            user=user,
            password=password,
            connect_timeout=10,
        )
        probe.close()
        print(f"Database '{db_name}' already exists.")
        return
    except psycopg2.OperationalError as exc:
        if "does not exist" not in str(exc):
            raise  # some other connection error — re-raise as-is

    # Step 2: target DB is missing — try to create it.
    print(f"Database '{db_name}' not found — attempting to create it.")
    bootstrap_conn = psycopg2.connect(
        host=host,
        port=port,
        dbname="postgres",
        user=user,
        password=password,
        connect_timeout=10,
    )
    try:
        bootstrap_conn.autocommit = True
        with bootstrap_conn.cursor() as cur:
            try:
                cur.execute(f'CREATE DATABASE "{db_name}";')
                print(f"Database '{db_name}' created successfully.")
            except psycopg2.errors.InsufficientPrivilege:
                raise RuntimeError(
                    f"Database '{db_name}' does not exist and the DB user "
                    f"'{user}' does not have CREATEDB privilege to create it.\n"
                    f"Ask the backend team to run once on their RDS instance:\n"
                    f"    CREATE DATABASE \"{db_name}\";\n"
                    f"Then invoke this Lambda again."
                )
    finally:
        bootstrap_conn.close()


def get_applied_migrations(cursor) -> set:
    cursor.execute("SELECT version FROM schema_migrations ORDER BY version;")
    return {row[0] for row in cursor.fetchall()}


def get_pending_migrations(applied: set) -> list:
    """
    Returns (filename, full_path) pairs for unapplied migrations,
    sorted by filename so migrations always run in order.
    """
    try:
        files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
    except FileNotFoundError:
        raise RuntimeError(f"Migrations directory not found: {MIGRATIONS_DIR}")

    return [
        (f, os.path.join(MIGRATIONS_DIR, f))
        for f in files
        if f not in applied
    ]


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    print("Starting database migration runner...")

    conn = None
    try:
        db_host = os.environ["DB_HOST"]
        db_port = os.environ["DB_PORT"]
        db_name = os.environ["DB_NAME"]
        secret_arn = os.environ["DB_SECRET_ARN"]

        credentials = get_db_credentials(secret_arn)

        # Guarantee the target database exists before connecting to it.
        # On a shared RDS instance the database must be created explicitly;
        # this is a no-op on subsequent Lambda invocations.
        ensure_database_exists(
            host=db_host,
            port=int(db_port),
            db_name=db_name,
            user=credentials["username"],
            password=credentials["password"],
        )

        print(f"Connecting to {db_host}:{db_port}/{db_name}")
        conn = psycopg2.connect(
            host=db_host,
            port=int(db_port),
            dbname=db_name,
            user=credentials["username"],
            password=credentials["password"],
            connect_timeout=10,
        )

        # Bootstrap the tracking table (safe to run every time)
        with conn:
            with conn.cursor() as cur:
                cur.execute(BOOTSTRAP_SQL)

        with conn.cursor() as cur:
            applied = get_applied_migrations(cur)

        print(f"Already applied: {sorted(applied) or 'none'}")

        pending = get_pending_migrations(applied)

        if not pending:
            print("No pending migrations — database is up to date.")
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "status": "up_to_date",
                    "applied": [],
                    "message": "No pending migrations",
                }),
            }

        ran = []
        for version, filepath in pending:
            print(f"Applying: {version}")
            with open(filepath, "r") as f:
                sql = f.read()

            # Each migration runs in its own transaction; rolls back on failure
            with conn:
                with conn.cursor() as cur:
                    cur.execute(sql)
                    cur.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s);",
                        (version,),
                    )

            print(f"✓ Applied: {version}")
            ran.append(version)

        print(f"Migration complete. Applied {len(ran)} migration(s): {ran}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "applied": ran,
                "message": f"Applied {len(ran)} migration(s)",
            }),
        }

    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(e)}),
        }

    finally:
        if conn and not conn.closed:
            conn.close()
