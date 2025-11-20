// import './components/message.js';
import MessageView from './view/messageView.js';

document.addEventListener('DOMContentLoaded', () => {
  const view = new MessageView();
  view.initialize();

  // === THEME TOGGLE (Light / Dark) ===
  const container = document.querySelector('.chatbot-container');
  const themeToggleButton = document.querySelector('.theme-toggle');
  const THEME_KEY = 'dico-theme';

  function applyTheme(theme) {
    const isDark = theme === 'dark';

    if (!container) return;

    if (isDark) {
      container.classList.add('dark-theme');
    } else {
      container.classList.remove('dark-theme');
    }

    updateThemeIcon(isDark);
  }

  function updateThemeIcon(isDark) {
    if (!themeToggleButton) return;
    const icon = themeToggleButton.querySelector('i');
    if (!icon) return;

    icon.classList.remove('fa-moon', 'fa-sun');
    icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
  }

  // Initial theme
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
  } else {
    applyTheme('light');
  }

  // Toggle theme on click
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
      const isDarkNow = !container.classList.contains('dark-theme');
      const nextTheme = isDarkNow ? 'dark' : 'light';
      applyTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  }
});

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
