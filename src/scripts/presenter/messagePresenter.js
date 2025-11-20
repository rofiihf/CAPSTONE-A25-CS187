// src/scripts/presenter/messagePresenter.js

export default class MessagePresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  renderInitialMessages() {
    try {
      const data = this.#model.getAllMessages();
      this.#view.clearChat();

      data.forEach((message) => {
        this.#view.renderMessage(message);
      });

    } catch (error) {
      console.error("Error rendering initial messages:", error);
    }
  }

  async handleUserSubmit() {
    try {
      const text = this.#view.getUserInput();
      if (!text) return;

      this.#view.setInputDisabled(true);

      const userMessage = this.#model.addMessage(text, "user");
      this.#view.renderMessage(userMessage);

      this.#view.resetInput();

      this.#view.showTypingIndicator();

      await this.#simulateBotReply();

    } catch (error) {
      console.error("Error handling submit:", error);
    }
  }

  async #simulateBotReply() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const botResponse = "Halo, chatbot ini masih dalam perkembangan.";
        const botMessage = this.#model.addMessage(botResponse, "bot");

        this.#view.hideTypingIndicator();
        this.#view.renderMessage(botMessage);
        this.#view.setInputDisabled(false);

        resolve();
      }, 1500);
    });
  }
}
