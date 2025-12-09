import json
import datetime
from sqlalchemy import create_engine, text
from .config import DATABASE_URL
import requests
from sqlalchemy import create_engine, text


engine = create_engine(DATABASE_URL, future=True)

def log_query(user_id: str, query: str, intent, response: str, sources: list, meta: dict):
    ts = datetime.datetime.utcnow()
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO api_logs (
                    user_id_hash, query_text, intent_label, response_text, 
                    sources, meta, created_at
                ) VALUES (:u, :q, :i, :r, :s, :m, :t)
            """), {
                'u': user_id,
                'q': query[:2000],
                'i': json.dumps(intent),     # <-- Fix utama
                'r': response[:4000],
                's': json.dumps(sources),
                'm': json.dumps(meta),
                't': ts
            })
    except Exception as e:
        print("Error logging query:", e)
