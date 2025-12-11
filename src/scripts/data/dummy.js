export const dummyData = [
  {
    id: 'chatbot-ai-232932',
    sender: 'bot',
    text: 'Halo!, Aku Dico dan aku siap membantu mu dalam sepanjang perjalanan di Program ASAH ini!. Silahkan tanya apa saja kepada ku 😊',
    timestamp: '2025-11-13T21:34:56.789Z'
  }
];

// === LEVEL QUIZ DUMMY DATA (Lebih banyak & variatif) ===
export const LEVEL_TOPICS = [
  {
    id: "frontend",
    label: "Front-End Web",
    questions: [
      {
        id: 1,
        text: "Sejauh mana kamu menguasai HTML dasar (tag, atribut, struktur dokumen)?",
        options: [
          { code: "A", label: "Baru tahu <html>, <head>, <body>", score: 1 },
          { code: "B", label: "Sudah nyaman pakai tag umum (div, p, img, a)", score: 2 },
          { code: "C", label: "Sering pakai struktur semantik (<header>, <main>, <section>)", score: 3 },
          { code: "D", label: "Paham aksesibilitas & semantic HTML dengan baik", score: 4 },
          { code: "E", label: "Belum tahu sama sekali", score: 0 },
        ],
      },
      {
        id: 2,
        text: "Bagaimana kemampuanmu dengan CSS layout (flexbox, grid)?",
        options: [
          { code: "A", label: "Masih pakai margin / padding manual untuk atur posisi", score: 1 },
          { code: "B", label: "Bisa pakai flexbox untuk layout sederhana", score: 2 },
          { code: "C", label: "Sudah nyaman pakai flexbox & grid untuk layout kompleks", score: 3 },
          { code: "D", label: "Paham konsep responsive design & breakpoint", score: 4 },
          { code: "E", label: "Belum pernah pakai", score: 0 },
        ],
      },
      {
        id: 3,
        text: "Seberapa jauh kamu memahami JavaScript dasar?",
        options: [
          { code: "A", label: "Tahu variabel & tipe data saja", score: 1 },
          { code: "B", label: "Bisa kondisi, loop, dan function sederhana", score: 2 },
          { code: "C", label: "Paham array, object, higher-order function (map/filter)", score: 3 },
          { code: "D", label: "Paham konsep this, closure, dan modular JS", score: 4 },
          { code: "E", label: "Belum paham sama sekali", score: 0 },
        ],
      },
      {
        id: 4,
        text: "Pengalamanmu memanipulasi DOM dengan JavaScript bagaimana?",
        options: [
          { code: "A", label: "Belum pernah menyentuh DOM", score: 0 },
          { code: "B", label: "Bisa ganti teks / style elemen dengan JS", score: 1 },
          { code: "C", label: "Sering buat interaksi (click, input, submit) dan update UI", score: 2 },
          { code: "D", label: "Punya pola sendiri untuk mengelola state & render ulang DOM", score: 3 },
          { code: "E", label: "Sudah biasa bikin mini-framework / pakai virtual DOM", score: 4 },
        ],
      },
      {
        id: 5,
        text: "Seberapa sering kamu bekerja dengan API (fetch, async/await)?",
        options: [
          { code: "A", label: "Belum pernah panggil API dari front-end", score: 0 },
          { code: "B", label: "Pernah coba fetch data dari API publik", score: 1 },
          { code: "C", label: "Biasa pakai async/await dan handle loading / error", score: 2 },
          { code: "D", label: "Pernah mengatur struktur service/API layer di project", score: 3 },
          { code: "E", label: "Terbiasa optimize request (caching, debounce, dsb)", score: 4 },
        ],
      },
      {
        id: 6,
        text: "Bagaimana pengalamanmu membuat SPA (Single Page Application)?",
        options: [
          { code: "A", label: "Belum pernah dengar istilah SPA", score: 0 },
          { code: "B", label: "Pernah bikin beberapa halaman dan switch pakai JS manual", score: 1 },
          { code: "C", label: "Pernah pakai router sederhana (hash / history API)", score: 2 },
          { code: "D", label: "Sering membuat SPA dengan arsitektur yang jelas (MVP/MVC, dsb.)", score: 3 },
          { code: "E", label: "Sudah biasa pakai framework SPA (React/Vue/Angular)", score: 4 },
        ],
      },
      {
        id: 7,
        text: "Seberapa jauh kamu memperhatikan performa dan optimasi front-end?",
        options: [
          { code: "A", label: "Belum pernah mikirin performa sama sekali", score: 0 },
          { code: "B", label: "Hanya sekadar compress gambar", score: 1 },
          { code: "C", label: "Pernah minimize asset & lazy-load gambar/script", score: 2 },
          { code: "D", label: "Pernah cek Lighthouse / Core Web Vitals dan memperbaikinya", score: 3 },
          { code: "E", label: "Rutin memprofiling performa & network di DevTools", score: 4 },
        ],
      },
      {
        id: 8,
        text: "Bagaimana tingkat kenyamananmu dengan tools build (npm, bundler, dsb.)?",
        options: [
          { code: "A", label: "Belum pernah pakai npm / bundler", score: 0 },
          { code: "B", label: "Pernah install package dengan npm / yarn", score: 1 },
          { code: "C", label: "Pernah setup project dengan bundler (Vite/Webpack)", score: 2 },
          { code: "D", label: "Paham script build, dev server, dan environment config", score: 3 },
          { code: "E", label: "Biasa mengatur struktur monorepo / advanced config", score: 4 },
        ],
      },
      {
        id: 9,
        text: "Seberapa sering kamu menggunakan Git dan GitHub dalam workflow?",
        options: [
          { code: "A", label: "Hanya tau git add/commit saja", score: 1 },
          { code: "B", label: "Sudah nyaman push/pull dan resolve conflict sederhana", score: 2 },
          { code: "C", label: "Sering pakai branch, PR, dan code review", score: 3 },
          { code: "D", label: "Pernah mengatur workflow tim (branching strategy, release)", score: 4 },
          { code: "E", label: "Jarang sekali atau belum pernah pakai", score: 0 },
        ],
      },
      {
        id: 10,
        text: "Seberapa sering kamu membuat project front-end dari nol (bukan tutorial)?",
        options: [
          { code: "A", label: "Baru ikut tutorial step-by-step", score: 1 },
          { code: "B", label: "Pernah 1–2 project kecil sendiri", score: 2 },
          { code: "C", label: "Sudah beberapa project real (tugas, lomba, freelance)", score: 3 },
          { code: "D", label: "Sering memimpin atau mengatur struktur project front-end", score: 4 },
          { code: "E", label: "Belum pernah sama sekali", score: 0 },
        ],
      },
    ],
  },

  {
    id: "android",
    label: "Android (Native/Kotlin)",
    questions: [
      {
        id: 1,
        text: "Seberapa jauh kamu memahami dasar pemrograman Kotlin/Java?",
        options: [
          { code: "A", label: "Baru tau tipe data & variabel", score: 1 },
          { code: "B", label: "Bisa kondisi, loop, dan function", score: 2 },
          { code: "C", label: "Paham OOP (class, inheritance, interface)", score: 3 },
          { code: "D", label: "Paham fitur lanjutan Kotlin (coroutine, extension)", score: 4 },
          { code: "E", label: "Belum pernah pakai Kotlin/Java", score: 0 },
        ],
      },
      // … boleh tambah 5–8 pertanyaan lagi dengan pola yang sama
    ],
  },

  {
    id: "data",
    label: "Data & Machine Learning",
    questions: [
      {
        id: 1,
        text: "Seberapa nyaman kamu bekerja dengan Python untuk analisis data?",
        options: [
          { code: "A", label: "Belum pernah pakai Python", score: 0 },
          { code: "B", label: "Pernah pakai sedikit untuk tugas", score: 1 },
          { code: "C", label: "Bisa pakai pandas / numpy untuk olah data", score: 2 },
          { code: "D", label: "Sering analisis data dan visualisasi (matplotlib/seaborn)", score: 3 },
          { code: "E", label: "Sering membangun pipeline analitik lengkap", score: 4 },
        ],
      },
      // … tambah lagi pertanyaan topik ML, model, evaluasi, dsb.
    ],
  },
];

export const LEVEL_THRESHOLD = {
  beginner: 10,      // total skor kecil → Beginner
  intermediate: 22,  // menengah
  advance: 30,       // tinggi → Advance
};
