# CAPSTONE-A25-CS187

Siap. Berikut **full isi `README.md` versi final** yang sudah rapi, konsisten, dan siap **langsung kamu copas** tanpa perlu edit lagi.
Bahasanya diposisikan dari sudut pandang **coder/pengembang aplikasi Dicobuddy (Learning Buddy)**, cocok untuk **capstone / showcase**.

---

```md
# Dicobuddy — Learning Buddy  
**Capstone Project A25-CS187**

Dicobuddy adalah aplikasi **Learning Buddy berbasis web** yang dirancang untuk membantu pengguna mendapatkan **arah belajar yang lebih tepat, personal, dan terstruktur**. Aplikasi ini menggabungkan **chat berbasis AI**, **asesmen kemampuan melalui quiz**, serta **roadmap belajar adaptif** yang disesuaikan dengan tujuan dan minat pengguna.

Dicobuddy dikembangkan sebagai solusi atas permasalahan umum dalam proses belajar mandiri, di mana banyak pengguna kesulitan menentukan materi awal, jalur pembelajaran, dan rekomendasi kursus yang sesuai dengan kemampuan mereka yang sebenarnya.

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Session
- Login menggunakan **email dan password**
- Session berbasis cookie menggunakan `express-session`
- Menjaga konteks pengguna selama penggunaan aplikasi

### 💬 Chat Learning Buddy
- Chat interaktif berbasis AI
- Memberikan:
  - Jawaban pembelajaran
  - Rekomendasi materi dan kursus
  - Insight sesuai konteks pengguna
- Mendukung klasifikasi intent dan penyajian sumber belajar

### 📝 Quiz & Skill Leveling
- Quiz untuk mengukur kemampuan pengguna
- Hasil quiz menentukan level:
  - Beginner
  - Intermediate
  - Advanced
- Data skill disimpan dalam **learning profile** pengguna

### 🧭 Roadmap Belajar (Job Role Mode)
- Mode chat khusus untuk tujuan karier
- Contoh: *Frontend Developer, Data Analyst, Mobile Developer*
- Menghasilkan roadmap belajar yang terstruktur dan bertahap

### 🌗 Tema & Preferensi
- Toggle **Light / Dark Mode**
- Preferensi disimpan di `localStorage`

---

## Tech Stack

### Frontend
- Vanilla JavaScript
- Webpack + Babel
- CSS (custom)
- SPA dengan hash routing

### Backend API
- Node.js
- Express.js
- express-session
- bcrypt
- CORS
- Penyimpanan data berbasis file JSON

### ML Backend
- FastAPI
- scikit-learn (intent classification)
- Sentence-Transformers
- FAISS (knowledge retrieval)
- Uvicorn

---

## Arsitektur Sistem

```

[ Client Browser ]
|
|  (Webpack Dev Server :5500)
v
[ Frontend SPA ]
|
|  API & Chat Request
v
[ Backend Node.js :5000 ]
|
|  Forward Request
v
[ ML Backend FastAPI :8000 ]

```

---

## 📁 Struktur Folder

```

CAPSTONE-A25-CS187-main/
├── src/                      # Frontend
│   ├── public/
│   ├── scripts/
│   └── styles/
├── backend/                  # Backend API (Node.js)
│   ├── app.js
│   ├── routes/
│   ├── controllers/
│   └── data/
│       ├── users_hashed.json
│       ├── quiz.json
│       ├── course.json
│       └── user_profile/
├── backend_ml/               # ML Backend (FastAPI)
│   ├── main.py
│   ├── app/
│   └── requirements.txt
├── webpack.config.js
└── package.json

````

---

## Prasyarat

- Node.js (LTS disarankan)
- Python 3.10 atau lebih baru
- pip / virtual environment (opsional tapi disarankan)

---

## Konfigurasi Environment

### Backend Node (`backend/.env`)
```env
PORT=5000
SESSION_SECRET=your-session-secret
BOT_API_URL=http://localhost:8000/chat
````

### ML Backend (Opsional)

```env
DEFAULT_TOPK=5
MODEL_API_ALLOWED_ORIGINS=*
```

> ⚠️ Catatan Keamanan
> API key dan credential sebaiknya disimpan dalam environment variable dan **tidak di-commit** ke repository publik.

---

## Cara Menjalankan Aplikasi (Development)

### 1️⃣ Jalankan ML Backend (FastAPI)

```bash
cd backend_ml
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Cek:

```
http://localhost:8000/health
```

---

### 2️⃣ Jalankan Backend API (Node.js)

```bash
cd backend
npm install
node app.js
```

Cek:

```
http://localhost:5000/
```

---

### 3️⃣ Jalankan Frontend (Webpack Dev Server)

```bash
npm install
npm run dev
```

Buka di browser:

```
http://localhost:5500/#/login
```

---

## Login (Development)

Data user disimpan di:

```
backend/data/users_hashed.json
```

Password menggunakan hash bcrypt.
Untuk membuat hash baru:

```js
const bcrypt = require("bcrypt");
bcrypt.hash("password123", 10).then(console.log);
```

Salin hasil hash ke field `password` pada user JSON.

---

## Endpoint API (Ringkas)

### Auth

* `POST /api/auth/login`
* `POST /api/auth/logout`
* `GET /api/auth/me`

### Chat

* `POST /chat`
* `POST /chat/job`

### Quiz

* `GET /api/quiz/topics`
* `GET /api/quiz/questions`
* `POST /api/quiz/score`

### Course

* `GET /api/courses-map`

---

## Build Frontend

```bash
npm run build
```

Output build akan tersedia di folder `dist/`.


tinggal bilang, nanti aku sesuaikan ✨
```
