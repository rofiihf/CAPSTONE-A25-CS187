// import './components/message.js';
import MessageView from './pages/message/messageView.js';
import { initApp } from "./app.js";
import "../styles/style.css";

document.addEventListener('DOMContentLoaded', () => {
  // const presenter = new MessagePresenter
  // const view = new MessageView();
  // view.initialize();

  // === THEME TOGGLE (Light / Dark) ===
  const container = document.querySelector('.chatbot-container');
  const themeToggleButton = document.querySelector('.theme-toggle');
  const THEME_KEY = 'dico-theme';

  function updateThemeIcon(isDark) {
    if (!themeToggleButton) return;

    // Cek: pakai Font Awesome (<i>) atau teks/emoji biasa
    const iconEl = themeToggleButton.querySelector('i');

    if (iconEl) {
      // Versi Font Awesome
      iconEl.classList.remove('fa-moon', 'fa-sun');
      iconEl.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    } else {
      // Versi teks / emoji biasa
      themeToggleButton.textContent = isDark ? '☀️' : '🌙';
    }
  }

  function applyTheme(theme) {
    if (!container) return;

    const isDark = theme === 'dark';

    // Tambah/hapus class dark-theme di container utama
    container.classList.toggle('dark-theme', isDark);

    // Update tampilan ikon tombol
    updateThemeIcon(isDark);
  }

  // Tema awal (ambil dari localStorage kalau ada)
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
  } else {
    applyTheme('light');
  }

  // Toggle tema saat tombol diklik
  if (themeToggleButton && container) {
    themeToggleButton.addEventListener('click', () => {
      const isDarkNow = !container.classList.contains('dark-theme');
      const nextTheme = isDarkNow ? 'dark' : 'light';

      applyTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  }
  
  initApp();
  
});

// Service worker
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('./sw.js')
//       .then((registration) => {
//         console.log('Service Worker registered:', registration.scope);
//       })
//       .catch((error) => {
//         console.error('Service Worker registration failed:', error);
//       });
//   });
// }
// SEMENTARA, cachenya ga ilang ilang.