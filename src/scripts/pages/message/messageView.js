// src/scripts/view/messageView.js

import MessagePresenter from "./messagePresenter.js";
import { generateBubbleChat } from "../../components/generateBubbleChat.js";
import MessageModel from "./messageModel.js";

export default class MessageView {
  #presenter;
  #form;
  #input;
  #chatContainer;
  #typingElement;
  #quickActionsElement;
  #clearChatButton;
  #logoutButton;
  #themeToggleButton;
  #container;

  
  constructor(arg) {
    console.log("🔥 MessageView constructor arg =", arg);
    const { presenter } = arg;
    this.#presenter = presenter;
  }
  render() {
    const root = document.querySelector("#app");

    root.innerHTML = `
      <div class="chatbot-container">
        <div class="header-container">
          <header class="page-header">
            <h1 class="brand-name">Dico</h1>
            <div class="header-actions">
              <button type="button" class="clear-chat">Clear chat</button>
              <button type="button" class="logout-btn">Logout</button>
              <button class="theme-toggle" aria-label="Toggle dark mode">
                <span class="theme-icon">🌓</span>
              </button>
          </header>
        </div>


        <!-- List Chat Message Bot dan User -->
        <div class="chat-message"></div>

        <div class="input-text-container">
          <div class="form-control">
            <form class="input-chat-form">
              <div class="prompt-textarea">
                <textarea name="user-chat" id="user-chat" class="textarea-user__chat-form" required
                  placeholder="Tanyakan Apa Saja"></textarea>
              </div>
              <div class="button-submit">
                <button class="submit-button__chat-form"><i class="fa-solid fa-arrow-up"></i></button>
              </div>
            </form>
        </div>
      </div>
    `
    this.#chatContainer = root.querySelector(".chat-message");
    this.#form = root.querySelector(".input-chat-form");
    this.#input = root.querySelector("#user-chat");
    this.#clearChatButton = root.querySelector(".clear-chat");
    this.#logoutButton = root.querySelector(".logout-btn");
    this.#themeToggleButton = root.querySelector(".theme-toggle");
    this.#container = root.querySelector(".chatbot-container");

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

    // tombol Clear Chat di header
    if (this.#clearChatButton) {
      this.#clearChatButton.addEventListener("click", () => {
        this.#presenter.handleClearChat();
      });
    }
    // tombol Logout di header
    if (this.#logoutButton) {
      this.#logoutButton.addEventListener("click", () => {
        this.#presenter.handleLogout();
      });
    }
    // tombol toggle theme
    if (this.#themeToggleButton && this.#container) {
      this.#themeToggleButton.addEventListener("click", () => {
        this.#container.classList.toggle("dark-theme");

        // opsional: simpan preferensi
        const isDark = this.#container.classList.contains("dark-theme");
        localStorage.setItem("dico_theme", isDark ? "dark" : "light");
      });
    }
  }
}

