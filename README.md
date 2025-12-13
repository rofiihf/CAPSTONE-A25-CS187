# Capstone Project: AI-Powered Learning Roadmap Assistant (A25-CS187)

Selamat datang di repositori resmi untuk Capstone Project A25-CS187. Proyek ini adalah asisten belajar berbasis chatbot cerdas yang dirancang untuk membuat peta jalan (roadmap) pembelajaran yang dipersonalisasi, merekomendasikan kursus, dan melacak progres pengguna menggunakan kecerdasan buatan (AI) dan pembelajaran adaptif.

## 🌟 Fitur Utama

* **Adaptive Roadmap Generation:** Membuat alur belajar yang disesuaikan dengan profil, minat, dan tingkat kemampuan pengguna menggunakan *Machine Learning*.
* **Interactive Chatbot Widget:** Antarmuka percakapan yang ramah pengguna untuk berinteraksi dengan sistem, menanyakan materi, atau meminta rekomendasi.
* **Skill Assessment & Quizzes:** Fitur kuis untuk menilai pemahaman pengguna sebelum atau sesudah menyelesaikan modul pembelajaran.
* **Course Recommendation System:** Merekomendasikan materi pembelajaran spesifik berdasarkan roadmap yang telah dibuat.
* **User Profile Management:** Melacak progres belajar, histori chat, dan pencapaian pengguna.
* **Micro-Frontend/Widget Architecture:** Frontend dirancang agar dapat diintegrasikan sebagai widget pada platform lain.

## 🛠️ Teknologi yang Digunakan

Proyek ini menggunakan arsitektur *monorepo* yang terdiri dari tiga komponen utama:

### 1. Frontend (`/src` & `/dist`)
* **Bahasa:** HTML5, CSS3, JavaScript (ES6+)
* **Build Tool:** Webpack
* **Fitur:** Progressive Web App (PWA) dengan Service Worker (`sw.js`), Custom Web Components.

### 2. Backend API (`/backend`)
* **Runtime:** Node.js
* **Framework:** Express.js
* **Autentikasi:** Custom Middleware / Token-based auth
* **Data Handling:** JSON storage (untuk prototipe/skala kecil)

### 3. Machine Learning Engine (`/backend_ml`)
* **Bahasa:** Python 3.12+
* **Framework:** (Kemungkinan FastAPI/Flask berdasarkan struktur `app/`)
* **Library Utama:**
    * `scikit-learn`: Untuk model klasifikasi intent.
    * `faiss`: Untuk pencarian vektor (vector search) dan knowledge base.
    * `pandas` & `numpy`: Pemrosesan data.
    * `joblib`: Serialisasi model.

## 📋 Prasyarat Instalasi

Sebelum memulai, pastikan perangkat Anda telah terinstal:

* [Node.js](https://nodejs.org/) (Versi 16 atau lebih baru direkomendasikan)
* [Python](https://www.python.org/) (Versi 3.9 atau lebih baru)
* [npm](https://www.npmjs.com/) (Biasanya terinstal bersama Node.js)

## 🚀 Cara Instalasi dan Menjalankan

Karena proyek ini terdiri dari beberapa layanan, Anda perlu menjalankannya di terminal yang berbeda.

### Langkah 1: Setup Backend (Node.js)

1.  Buka terminal dan masuk ke folder backend:
    ```bash
    cd backend
    ```
2.  Instal dependensi:
    ```bash
    npm install
    ```
3.  Jalankan server:
    ```bash
    npm start
    # atau
    node app.js
    ```
    *Server backend biasanya berjalan di port 3000 atau sesuai konfigurasi `.env`.*

### Langkah 2: Setup Machine Learning Engine (Python)

1.  Buka terminal baru dan masuk ke folder ML:
    ```bash
    cd backend_ml
    ```
2.  (Opsional tapi disarankan) Buat virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Untuk Linux/Mac
    # atau
    venv\Scripts\activate     # Untuk Windows
    ```
3.  Instal dependensi Python:
    ```bash
    pip install -r requirements.txt
    ```
4.  Jalankan layanan ML:
    ```bash
    python main.py
    ```

### Langkah 3: Setup Frontend

1.  Buka terminal baru dan kembali ke root folder proyek:
    ```bash
    npm install
    ```
2.  Build asset frontend menggunakan Webpack:
    ```bash
    npm run build
    ```
3.  Buka file `dist/index.html` atau `src/public/index.html` di browser Anda, atau gunakan Live Server untuk pengalaman pengembangan yang lebih baik.

## 📂 Susunan Project

```text
capstone-a25-cs187/
├── backend/                # Layanan Backend API (Node.js)
│   ├── controllers/        # Logika kontroler (Auth, Chat, Quiz, Roadmap)
│   ├── data/               # Penyimpanan data JSON (Profiles, Courses, Quiz)
│   ├── routes/             # Definisi endpoint API
│   └── app.js              # Entry point backend
├── backend_ml/             # Layanan AI/ML (Python)
│   ├── app/                # Logika inti ML (Intent, Roadmap Engine)
│   ├── data/               # Data latih dan knowledge base
│   └── main.py             # Entry point service ML
├── src/                    # Source code Frontend
│   ├── public/             # Aset statis (Images, HTML)
│   ├── scripts/            # Logika JS (Components, Pages, Services)
│   ├── styles/             # File CSS
│   └── widget/             # Kode khusus untuk Widget Iframe
├── dist/                   # Hasil build frontend (Webpack output)
├── package.json            # Manajemen dependensi root/frontend
└── webpack.config.js       # Konfigurasi build tool
