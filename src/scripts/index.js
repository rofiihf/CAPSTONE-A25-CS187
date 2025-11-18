// import './components/message.js';
import MessageView from './view/messageView.js';

document.addEventListener("DOMContentLoaded", () => {
  const view = new MessageView();
  view.initialize();
});