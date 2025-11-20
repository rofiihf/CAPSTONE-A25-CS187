// src/scripts/view/messageView.js

import MessagePresenter from "../presenter/messagePresenter.js";
import { generateBubbleChat } from "../components/bubbleChat.js";
import MessageModel from "../model/messageModel.js";

export default class MessageView {
  #presenter = null;
  #form = null;
  #input = null;
  #chatContainer = null;
  #typingElement = null;
  #quickActionsElement = null;

  constructor() {
    this.#chatContainer = document.querySelector(".chat-message");
    this.#form = document.querySelector(".input-chat-form");
    this.#input = document.querySelector("#user-chat");
  }

  initialize() {
    this.#presenter = new MessagePresenter({
      view: this,
      model: new MessageModel(),
    });

    this.#bindEvents();
    this.#presenter.renderInitialMessages();
  }

  clearChat() {
    this.#chatContainer.innerHTML = "";
    this.#typingElement = null;
    this.#quickActionsElement = null;
  }

  renderMessage(message) {
    const bubble = generateBubbleChat(message);
    this.#chatContainer.appendChild(bubble);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
  }

  renderQuickActions(actions) {
    // hapus dulu kalau sudah ada
    if (this.#quickActionsElement) {
      this.#quickActionsElement.remove();
      this.#quickActionsElement = null;
    }

    const container = document.createElement('div');
    container.classList.add('quick-actions');

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('quick-actions__button');
      button.textContent = action.label;
      button.dataset.action = action.key;

      button.addEventListener('click', () => {
        // lempar ke presenter
        this.#presenter.handleQuickAction(action.key);
      });

      container.appendChild(button);
    });

    this.#chatContainer.appendChild(container);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
    this.#quickActionsElement = container;
  }

  clearQuickActions() {
    if (!this.#quickActionsElement) return;
    this.#quickActionsElement.remove();
    this.#quickActionsElement = null;
  }


  // ===== Typing indicator untuk bot =====
  showTypingIndicator() {
    if (this.#typingElement) return; // kalau sudah ada, jangan buat lagi

    const wrapper = document.createElement("div");
    wrapper.classList.add("message", "bot", "typing");

    const indicator = document.createElement("div");
    indicator.classList.add("typing-indicator");

    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement("span");
      dot.classList.add("typing-indicator__dot");
      indicator.appendChild(dot);
    }

    wrapper.appendChild(indicator);
    this.#chatContainer.appendChild(wrapper);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;

    this.#typingElement = wrapper;
  }

  hideTypingIndicator() {
    if (!this.#typingElement) return;
    this.#typingElement.remove();
    this.#typingElement = null;
  }

  setInputDisabled(state) {
    this.#input.disabled = state;
  }

  getUserInput() {
    return this.#input.value.trim();
  }

  resetInput() {
    this.#form.reset();
  }

  #bindEvents() {
    this.#form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#presenter.handleUserSubmit();
    });

    this.#input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.#form.requestSubmit();
      }
    });
  }
}
