// src/scripts/model/messageModel.js

import { dummyData } from "../data/dummy.js";
import { sendMessage, getCourses } from "../data/api.js";

export default class MessageModel {
  #messages;
  #initialMessages;

  constructor() {
    this.#initialMessages = dummyData.map((message) => ({ ...message }));
    this.#messages = this.#initialMessages.map((message) => ({ ...message }));
  }
  
  async processBotMessage(userMessage) {
    if (userMessage) {
      const defaultChatBot = "Terima kasih sudah bertanya. Saat ini Dico masih dalam tahap pengembangan, jadi aku baru bisa menjawab hal-hal dasar dan mencatat profil belajarmu. Kamu bisa klik salah satu tombol di bawah untuk mulai onboarding, cek progress, atau minta rekomendasi kelas."
      const fetchResponse = await sendMessage(defaultChatBot);
      const botReplyText = fetchResponse.reply || "Error: tidak ada balasan bot.";
      const botBubble = this.addMessage(botReplyText, "bot");
      return botBubble;
    } else {
      console.log("Terdapat error di process bot message.");
    }
  }

  async getAllData() {
    const fetchResponse = await getCourses();
    return fetchResponse;
  }
  
  getAllMessages() {
    return this.#messages;
  }


  addMessage(text, sender, extraOptions = {}) {
    const newMessage = {
      id: `chat-ai-${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      ...extraOptions, // <-- type, courses, dll
    };

    this.#messages.push(newMessage);
    return newMessage;
  }

  resetMessages() {
    // kembalikan hanya ke pesan awal
    this.#messages = this.#initialMessages.map((message) => ({ ...message }));
  }
}
