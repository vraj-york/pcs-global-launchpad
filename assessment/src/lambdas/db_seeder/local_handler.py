import json
import psycopg2
from pathlib import Path
from handler import seed_questions


DATA_FILE = Path(__file__).parent / "data" / "questions.json"
# Your local DB credentials
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="bspdb",
    user="ahmad.a",
    password="test123"
)

stats = seed_questions(conn)

print(stats)

