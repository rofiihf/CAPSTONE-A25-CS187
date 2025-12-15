# DicoBuddy: AI-Powered Learning Roadmap Assistant (A25-CS187)

## 👥 Anggota Kelompok

Anggota Kelompok:

| No | ID Dicoding | Nama Anggota | Role |
|----|-------------|--------------|------|
| 1  | M269D5Y1338 | Muhammad Pidha Iqbal Fadillah | Machine Learning |
| 2  | M891D5X1834 | Shafira Maulidina | Machine Learning |
| 3  | F269D5Y1759 | Rofi Hanif Fauzan | Front-End Web & Back-End with AI |
| 4  | F269D5Y1208 | Muhammad Alfian Adien | Front-End Web & Back-End with AI |
| 5  | F269D5Y1248 | Muhammad Faisal Ramdhani | Front-End Web & Back-End with AI |

## 📋 Prasyarat Instalasi

Sebelum memulai, pastikan perangkat Anda telah terinstal:

* [Node.js](https://nodejs.org/) (Versi 16 atau lebih baru direkomendasikan)
* [Python](https://www.python.org/) (Versi 3.9 atau lebih baru)
* [npm](https://www.npmjs.com/) (Biasanya terinstal bersama Node.js)

## 🚀 Cara Instalasi dan Menjalankan

### Langkah 1: Clone Repository

1.  Copy dibawah ini:
    ```bash
    git clone https://github.com/username/capstone-a25-cs187.git
    ```
2.  Pindah folder:
    ```bash
    cd capstone-a25-cs187
    ```

### Langkah 2: Setup Backend (Node.js)

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

### Langkah 3: Setup Machine Learning Engine (Python)

1.  Buka terminal baru dan masuk ke folder ML:
    ```bash
    cd backend_ml
    ```
2.  Instal dependensi Python:
    ```bash
    pip install -r requirements.txt
    ```
3.  Jalankan layanan ML:
    ```bash
    -m uvicorn main:app --reload
    ```
    atau
    
    ```bash
    python -m uvicorn main:app --reload
    ```

### Langkah 4: Setup Frontend

1.  Buka terminal baru dan kembali ke root folder proyek:
    ```bash
    npm install
    ```
    ```bash
    npm install --save-dev webpack webpack-cli webpack-dev-server webpack-merge css-loader style-loader babel-loader @babel/preset-env html-webpack-plugin
    ```
2.  Build asset frontend menggunakan Webpack:
    ```bash
    npm run build
    ```

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
```

## 🤖 AI Model Artifacts
```bash
https://drive.google.com/drive/folders/1XG3ClspW5g6SiWBmFXj_UsGWLo_jPsVy?usp=drive_link
```
