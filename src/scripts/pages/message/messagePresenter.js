// src/scripts/presenter/messagePresenter.js

import { sendMessage } from "../../data/api.js";

export default class MessagePresenter {
  #view;
  #model;
  #authModel;
  #authService;

  constructor({ model, authModel = null, authService = null } = {}) {
    this.#model = model;
    this.#authModel = authModel;
    this.#authService = authService;
  }

  setView(view) {
    this.#view = view;
  }
  
  renderInitialMessages() {
    try {
      this.#view.clearChat();
      const messages = this.#model.getAllMessages();
      messages.forEach(msg => this.#view.renderMessage(msg));
    } catch (error) {
      console.error("Error rendering initial messages:", error);
    }
  }

  // ====== CLEAR CHAT ======
  async handleClearChat() {
    this.#model.resetMessages();
    this.#view.clearChat();
    this.#view.resetInput();
    this.renderInitialMessages();
  }

  // ================== HANDLE INPUT FORM ==================

  async handleUserSubmit() {
    try {
      const text = this.#view.getUserInput().trim();
      if (!text) {
        return;
      }  

      this.#view.setInputDisabled(true);

      const userMessage = this.#model.addMessage(text, "user");
      this.#view.renderMessage(userMessage);

      this.#view.resetInput();
      this.#view.setInputDisabled(true);
      this.#view.showTypingIndicator();

      const response = await sendMessage(text);

      this.#view.hideTypingIndicator();
      this.#view.setInputDisabled(false);

      if(!response.ok) {
        const errorBubble = this.#model.addMessage(
          "Maaf, server sedang diluar jangkauan.",
          "bot"
        );
        this.#view.renderMessage(errorBubble);
        return;
      }

      const botMessage = this.#model.addMessage(
        response.reply ?? "Bot tidak memberikan respons.",
        "bot",
        response.extra || {}
      );

      this.#view.renderMessage(botMessage);

    } catch (error) {
      console.error("Chat Error:", err);

      this.#view.hideTypingIndicator();
      this.#view.setInputDisabled(false);

      const errorMessage = this.#model.addMessage(
        "Terjadi kesalahan. Coba lagi.",
        "bot"
      );
      this.#view.renderMessage(errorMessage);
    }
  }

  // ====== LOGOUT ======
  async handleLogout() {
    try {
      if (this.#authService) {
        const res = await this.#authService.logout();
        if (!res?.ok) {
          console.warn("Logout response not ok", res);
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      if (this.#authModel && typeof this.#authModel.setUser === "function") {
        this.#authModel.setUser(null);
      }
      window.location.hash = "/login";
    }
  }

}
