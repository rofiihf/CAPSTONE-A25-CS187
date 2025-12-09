import numpy as np
import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer
from typing import List
from pathlib import Path
from .config import KB_PARQUET, KB_EMBEDDINGS, KB_INDEX_FAISS, SBERT_MODEL_PATH

_model_cache = None

def load_kb(parquet_path: str = KB_PARQUET):
    df = pd.read_parquet(parquet_path)
    return df


def load_faiss(index_path: str = KB_INDEX_FAISS):
    idx = faiss.read_index(index_path)
    return idx


def load_embeddings(path: str = KB_EMBEDDINGS):
    return np.load(path)


def get_model(model_path: str = SBERT_MODEL_PATH):
    global _model_cache
    if _model_cache is None:
        _model_cache = SentenceTransformer(model_path)
    return _model_cache


def embed_texts(texts: List[str], model_path: str = SBERT_MODEL_PATH):
    m = get_model(model_path)
    embs = m.encode(texts, normalize_embeddings=True)
    return np.array(embs).astype('float32')


def rebuild_kb(parquet_path: str = KB_PARQUET, out_emb: str = KB_EMBEDDINGS, out_index: str = KB_INDEX_FAISS, model_path: str = SBERT_MODEL_PATH):
    df = load_kb(parquet_path)
    texts = df['text'].fillna("").tolist()
    embs = embed_texts(texts, model_path)
    np.save(out_emb, embs)
    dim = embs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embs)
    faiss.write_index(index, out_index)
    return embs, index
