// src/scripts/view/messageView.js

import MessagePresenter from "./messagePresenter.js";
import { generateBubbleChat } from "../../components/generateBubbleChat.js";
import MessageModel from "./messageModel.js";
import { createChoiceBubble } from "../../components/bubbleChoice.js";
import { createLevelQuizQuestionBubble } from "../../components/bubbleLevelQuiz.js";
import bubbleRoadmap from "../../components/bubbleRoadmap.js";
import { bubbleCourseRecommendation } from "../../components/bubbleRecommendation.js";

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
  #clearChatIcon;


  
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
            <button class="theme-toggle" aria-label="Toggle dark mode">
              <span class="theme-toggle-track">
                <span class="theme-toggle-thumb"></span>
              </span>
            </button>
              <button type="button" class="clear-chat" aria-label="Clear chat">
                <img
                  src="./images/icons/broom.png"
                  alt="Clear chat"
                  class="clear-chat-icon"
                />
              </button>
              <button type="button" class="logout-btn" aria-label="Logout">
                <img src="./images/icons/logout.png" alt="Logout" class="logout-icon" />
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
    this.#clearChatIcon = root.querySelector(".clear-chat-icon")

    const savedTheme = localStorage.getItem("dico_theme");
    const isDark = savedTheme === "dark";
    this.#applyTheme(isDark);

    this.#bindEvents();

    this.#presenter.renderInitialMessages();
  }

  clearChat() {
    this.#chatContainer.innerHTML = "";
    this.#typingElement = null;
    this.#quickActionsElement = null;
  }

  renderMessage(message) {
    if (!message) return;

    const extra = message.extra || {};
    const type = extra.type;

    // ===== RENDER ROADMAP BUBBLE =====
    if (type === "roadmap") {
      try {
        // Pastikan modul sudah di-import secara global (di index.js biasanya)
        if (typeof bubbleRoadmap === "function") {
          const bubble = bubbleRoadmap({
            id: message.id,
            sender: "bot",
            text: message.text,
            roadmap: extra.roadmap || null,
            meta: extra
          });
          this.#appendToChat(bubble);
          return;
        } else {
          console.warn("bubbleRoadmap tidak ditemukan.");
        }
      } catch (err) {
        console.error("Error render roadmap bubble:", err);
      }
    }

    // ===== RENDER COURSE RECOMMENDATION BUBBLE =====
    if (type === "course-recommendation") {
      try {
        if (typeof bubbleCourseRecommendation === "function") {
          const bubble = bubbleCourseRecommendation({
            id: message.id,
            sender: "bot",
            text: message.text,
            timestamp: message.timestamp,
            courses: extra.courses || []
          });
          this.#appendToChat(bubble);
          return;
        } else {
          console.warn("bubbleCourseRecommendation tidak ditemukan.");
        }
      } catch (err) {
        console.error("Error render course recommendation bubble:", err);
      }
    }

    // ===== DEFAULT BUBBLE (BUBBLE TEXT BIASA) =====
    try {
      const bubble = generateBubbleChat(message);
      this.#appendToChat(bubble);
    } catch (err) {
      console.error("Error render default bubble:", err);
    }

  }

  // helper kecil supaya nggak ulang-ulang kode append + scroll
  #appendToChat(element) {
    this.#chatContainer.appendChild(element);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
  }

  // render bubble pilihan (chips) untuk pilih minat / jumlah pertanyaan
  renderChoiceBubble({ title, options, onChoose }) {
    const bubble = createChoiceBubble({ title, options, onChoose });
    this.#appendToChat(bubble);
  }

  // render bubble pertanyaan quiz (A–E)
  renderLevelQuizQuestion({ question, index, total, onAnswer }) {
    const bubble = createLevelQuizQuestionBubble({
      question,
      index,
      total,
      onAnswer,
    });
    this.#appendToChat(bubble);
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
      button.dataset.action = action.id;

      button.addEventListener('click', () => {
        // lempar ke presenter
        this.#presenter.handleQuickAction(action.id);
      });

      container.appendChild(button);
    });

    this.#chatContainer.appendChild(container);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
    this.#quickActionsElement = container;
  }
  
  showQuickActions(actions) {
    this.renderQuickActions(actions);
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

  #applyTheme(isDark) {
    if (!this.#container) return;

    // toggle class theme
    this.#container.classList.toggle("dark-theme", isDark);
    localStorage.setItem("dico_theme", isDark ? "dark" : "light");

    // ganti icon clear chat
    if (this.#clearChatIcon) {
      this.#clearChatIcon.src = isDark
        ? "./images/icons/clean.png"   // 🔥 icon untuk DARK theme
        : "./images/icons/broom.png";  // 🔆 icon untuk LIGHT theme
    }
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
        const isCurrentlyDark = this.#container.classList.contains("dark-theme");
        this.#applyTheme(!isCurrentlyDark);
      });
    }
        // ===== listener untuk roadmap course click (delegasi ke presenter) =====
    // listen pada chat container supaya event yang di-dispatch dari bubble (wrapper) bisa ditangkap
    if (this.#chatContainer) {
      this.#chatContainer.addEventListener("roadmap:courseClick", (ev) => {
        // ev.detail = { courseRef, title, sourceMessageId }
        try {
          const detail = ev.detail || {};
          // delegasikan ke presenter
          if (this.#presenter && typeof this.#presenter.handleCourseClick === "function") {
            this.#presenter.handleCourseClick(detail);
          } else {
            console.warn("Presenter tidak punya method handleCourseClick");
          }
        } catch (e) {
          console.error("roadmap:courseClick handler error", e);
        }
      });
    }
  }
}

