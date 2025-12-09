from sqlalchemy import create_engine, text

from app.config import DATABASE_URL

def init_db():
    engine = create_engine(DATABASE_URL, future=True)

    # Schema creation
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        user_id_hash TEXT,
        query_text TEXT,
        intent_label JSONB,
        response_text TEXT,
        sources JSONB,
        meta JSONB,
        created_at TIMESTAMP
    );
    """

    with engine.begin() as conn:
        conn.execute(text(create_table_sql))

    return engine
