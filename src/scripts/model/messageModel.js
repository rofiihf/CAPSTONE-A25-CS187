// src/scripts/model/messageModel.js

import { dummyData } from "../data/dummy.js";

export default class MessageModel {
  #messages;
  #initialMessages;

  constructor() {
    // simpan salinan awal pesan bot
    this.#initialMessages = dummyData.map((message) => ({ ...message }));
    this.#messages = this.#initialMessages.map((message) => ({ ...message }));
  }

  getAllMessages() {
    return this.#messages;
  }

  addMessage(text, sender) {
    const newMessage = {
      id: `chat-ai-${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
    };

    this.#messages.push(newMessage);
    return newMessage;
  }

  resetMessages() {
    // kembalikan hanya ke pesan awal
    this.#messages = this.#initialMessages.map((message) => ({ ...message }));
  }
}
