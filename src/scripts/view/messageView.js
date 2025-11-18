// src/scripts/view/messageView.js

import MessagePresenter from "../presenter/messagePresenter.js";
import { generateBubbleChat } from "../components/bubbleChat.js";
import MessageModel from "../model/messageModel.js";

export default class MessageView {
  #presenter = null;
  #form = null;
  #input = null;
  #chatContainer = null;

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
  }

  renderMessage(message) {
    const bubble = generateBubbleChat(message);
    this.#chatContainer.appendChild(bubble);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
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
