// src/scripts/presenter/messagePresenter.js

import { sendMessage } from "../../data/api.js";

export default class MessagePresenter {
  #view;
  #model;
  #authModel;
  #authService;
  #quickActions;

  constructor({ model, authModel = null, authService = null } = {}) {
    this.#model = model;
    this.#authModel = authModel;
    this.#authService = authService;
    this.#quickActions = [
      {
        id: "ask-courses",
        label: "Minta rekomendasi kelas",
        message:
          "Tolong rekomendasikan kelas yang paling relevan untuk saya saat ini.",
      },
      {
        id: "ask-roadmap",
        label: "Minta rekomendasi roadmap",
        message:
          "Tolong buatkan roadmap belajar yang sesuai untuk saya beserta level sub-skillnya.",
      },
      {
        id: "ask-progress",
        label: "Lihat progres minggu ini",
        message:
          "Tolong jelaskan progres belajar saya minggu ini, skill apa yang paling berkembang.",
      },
    ];
  }



  setView(view) {
    this.#view = view;
  }

  renderInitialMessages() {
    try {
      this.#view.clearChat();

      const messages = this.#model.getAllMessages();
      messages.forEach((msg) => this.#view.renderMessage(msg));

      // 🔥 TAMPILKAN QUICK ACTION SETELAH PESAN AWAL
      this.#view.renderQuickActions(this.#quickActions);
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
  handleQuickAction(actionId) {
    const action = this.#quickActions.find((a) => a.id === actionId);
    if (!action) return;

    // 🔥 Hapus quick actions setelah dipilih
    this.#view.clearQuickActions();

    // Kirim pesan template ke backend
    this.handleUserSubmit(action.message);
  }


  // ================== HANDLE INPUT FORM ==================

  async handleUserSubmit(textOverride = null) {
    try {
      // kalau dipanggil dari quick action → pakai textOverride
      // kalau dari form → pakai this.#view.getUserInput()
      const rawText = textOverride ?? this.#view.getUserInput();
      const text = rawText.trim();

      if (!text) {
        return;
      }

      // disable input saat proses
      this.#view.setInputDisabled(true);

      // simpan & tampilkan pesan user
      const userMessage = this.#model.addMessage(text, "user");
      this.#view.renderMessage(userMessage);

      // reset input + tampilkan typing indicator bot
      this.#view.resetInput();
      this.#view.showTypingIndicator();

      // === PANGGIL BACKEND ===
      const response = await sendMessage(text);

      // selesai loading
      this.#view.hideTypingIndicator();
      this.#view.setInputDisabled(false);

      // kalau backend error / tidak ok
      if (!response.ok) {
        const errorBubble = this.#model.addMessage(
          "Maaf, server sedang diluar jangkauan.",
          "bot"
        );
        this.#view.renderMessage(errorBubble);
        return;
      }

      // === PETAKAN META DARI BACKEND/ML KE EXTRA OPTIONS ===
      const extraOptions = {};

      if (response.meta) {
        extraOptions.meta = response.meta;
      }
      if (response.sources) {
        extraOptions.sources = response.sources;
      }

      const metaType = response.meta?.type;
      if (metaType) {
        extraOptions.type = metaType;

        if (metaType === "course-recommendation") {
          extraOptions.courses = response.meta.courses || [];
        }

        if (metaType === "roadmap") {
          extraOptions.roadmap = response.meta.roadmap || null;
        }

        if (metaType === "progress-summary") {
          extraOptions.progress = response.meta.progress || null;
        }
      }

      const botMessage = this.#model.addMessage(
        response.reply ?? "Bot tidak memberikan respons.",
        "bot",
        extraOptions
      );
      this.#view.renderMessage(botMessage);
    } catch (error) {
      console.error("Chat Error:", error);

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
