// import './components/message.js';
import MessageView from './pages/message/messageView.js';
import { initApp } from "./app.js";
import "../styles/style.css";

document.addEventListener('DOMContentLoaded', () => {
  // const presenter = new MessagePresenter
  // const view = new MessageView();
  // view.initialize();
  const isWidget = window.__IS_WIDGET__ === true;
  if (isWidget) {
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";

    // pastikan container chatmu full height
    // kalau class-nya berbeda, ganti sesuai class kamu
    const container = document.querySelector('.chatbot-container');
    if (container) {
      container.style.height = "100vh";
    }
  }
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
  
    // inside SPA bootstrap or auth service
  window.addEventListener("message", async (ev) => {
    const { data } = ev;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "WIDGET_LOADED") {
      // optional: the outer script notified iframe that loader is ready
      // you can request initial data or do nothing
      return;
    }

    if (data.type === "CHECK_SESSION") {
      // call backend profile endpoint using credentials to include session cookie
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        if (!res.ok) {
          ev.source.postMessage({ type: "NO_SESSION" }, ev.origin || "*");
          return;
        }
        const json = await res.json();
        ev.source.postMessage({ type: "SESSION_OK", profile: json.profile ?? json.user ?? null }, ev.origin || "*");
      } catch (err) {
        ev.source.postMessage({ type: "NO_SESSION", error: String(err) }, ev.origin || "*");
      }
    }
  });

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