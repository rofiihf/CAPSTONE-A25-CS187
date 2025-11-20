// import './components/message.js';
import MessageView from './view/messageView.js';

document.addEventListener("DOMContentLoaded", () => {
  const view = new MessageView();
  view.initialize();
});

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