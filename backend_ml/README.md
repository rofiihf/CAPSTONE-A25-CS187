# Dokumentasi

# Step By Step Run Application
1. ```pip install -r requirements.txt```
2. ```uvicorn main:app --reload```

## Create Message
`POST` http://localhost:8000/chat

Body
```json
{
    "user_id": "ahsdga6sfdrbasd1273816asd",
    "text": "Step by step belajar terkait flutter"
}
```

Response
```json
{
    "response": "Untuk belajar Flutter secara step-by-step, Anda dapat mengikuti kurikulum berikut:\n\n1. Belajar Membuat Aplikasi Flutter untuk Pemula (Level 2, 40 jam) - [Doc 1]\n2. Belajar Fundamental Aplikasi Flutter (Level 3, 90 jam) - [Doc 2]\n3. Belajar Pengembangan Aplikasi Flutter Intermediate (Level 4, 80 jam) - [Doc 3]\n4. Menjadi Flutter Developer Expert (Level 5, 85 jam) - [Doc 4]\n\nDengan mengikuti kurikulum di atas, Anda dapat mempelajari konsep dasar Flutter, kemudian lanjut ke pengembangan aplikasi yang lebih kompleks, dan akhirnya menjadi seorang Flutter Developer Expert.\n\nSumber:\n[Doc 1] Belajar Membuat Aplikasi Flutter untuk Pemula\n[Doc 2] Belajar Fundamental Aplikasi Flutter\n[Doc 3] Belajar Pengembangan Aplikasi Flutter Intermediate\n[Doc 4] Menjadi Flutter Developer Expert",
    "intent": {
        "intent": "course",
        "mode": "default",
        "typePriority": [
            "course",
            "roadmap",
            "learning_path"
        ]
    },
    "sources": [
        {
            "id": 0,
            "title": "Belajar Membuat Aplikasi Flutter untuk Pemula",
            "score": 3.552858978509903
        },
        {
            "id": 1,
            "title": "Belajar Fundamental Aplikasi Flutter",
            "score": 3.5452605485916138
        },
        {
            "id": 2,
            "title": "Belajar Pengembangan Aplikasi Flutter Intermediate",
            "score": 3.5429381728172302
        },
        {
            "id": 3,
            "title": "Menjadi Flutter Developer Expert",
            "score": 3.185961663722992
        },
        {
            "id": 4,
            "title": "Belajar Fundamental Aplikasi Android",
            "score": 3.174313724040985
        }
    ],
    "meta": {
        "latency_ms": 577
    }
}
```

## Check Health Server
`GET` http://localhost:8000/health

Response
```json
{
    "status": "ok",
    "message": "API is running"
}
```