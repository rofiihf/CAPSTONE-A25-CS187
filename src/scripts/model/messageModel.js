// src/scripts/model/messageModel.js

import { dummyData } from "../data/dummy.js";

export default class MessageModel {
  #messages = dummyData;

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
}
