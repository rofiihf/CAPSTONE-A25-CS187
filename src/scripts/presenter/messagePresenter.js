// src/scripts/presenter/messagePresenter.js

export default class MessagePresenter {
  #view;
  #model;

  // mode percakapan: 'idle' | 'onboarding' | 'progress' | 'recommendation'
  #mode = 'idle';
  #step = 0;

  // state kecil untuk menyimpan jawaban user
  #onboardingProfile = { focus: '', level: '' };
  #progressState = { lastClass: '', selfScore: '' };

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  // ====== CLEAR CHAT ======
  handleClearChat() {
    // reset mode & langkah percakapan
    this.#mode = "idle";
    this.#step = 0;
    this.#onboardingProfile = { focus: "", level: "" };
    this.#progressState = { lastClass: "", selfScore: "" };

    // reset data pesan di model ke pesan awal
    if (typeof this.#model.resetMessages === "function") {
      this.#model.resetMessages();
    }

    // reset input form
    this.#view.resetInput();
    this.#view.setInputDisabled(false);

    // render ulang pesan awal + quick action
    this.renderInitialMessages();
  }

  renderInitialMessages() {
    try {
      const data = this.#model.getAllMessages();
      this.#view.clearChat();

      data.forEach((message) => {
        this.#view.renderMessage(message);
      });

      // setelah pesan awal muncul, tampilkan tombol mode percakapan
      this.#showMainQuickActions();
    } catch (error) {
      console.error("Error rendering initial messages:", error);
    }
  }

  // ================== QUICK ACTIONS (MODE) ==================

  #showMainQuickActions() {
    this.#view.renderQuickActions([
      { key: "onboarding", label: "Mulai onboarding" },
      { key: "progress", label: "Cek progress belajar" },
      { key: "recommendation", label: "Minta rekomendasi kelas" },
    ]);
  }

  handleQuickAction(actionKey) {
    this.#view.clearQuickActions();

    let userText = "";
    this.#mode = "idle";
    this.#step = 0;

    if (actionKey === "onboarding") {
      this.#mode = "onboarding";
      userText = "Mulai onboarding";
    } else if (actionKey === "progress") {
      this.#mode = "progress";
      userText = "Cek progress belajar";
    } else if (actionKey === "recommendation") {
      this.#mode = "recommendation";
      userText = "Minta rekomendasi kelas";
    } else {
      return;
    }

    // tampilkan bubble user (isi dari tombol yang dipilih)
    const userMessage = this.#model.addMessage(userText, "user");
    this.#view.renderMessage(userMessage);

    this.#view.setInputDisabled(true);
    this.#view.showTypingIndicator();

    if (this.#mode === "onboarding") {
      this.#step = 1;
      this.#askOnboardingQuestion();
    } else if (this.#mode === "progress") {
      this.#step = 1;
      this.#askProgressQuestion();
    } else if (this.#mode === "recommendation") {
      this.#step = 1;
      this.#askRecommendationQuestion();
    }
  }

  // ================== HANDLE INPUT FORM ==================

  async handleUserSubmit() {
    try {
      const text = this.#view.getUserInput();
      if (!text || !text.trim()) return;

      this.#view.setInputDisabled(true);

      const userMessage = this.#model.addMessage(text, "user");
      this.#view.renderMessage(userMessage);

      this.#view.resetInput();
      this.#view.showTypingIndicator();

      if (this.#mode === "onboarding") {
        await this.#handleOnboardingAnswer(text);
      } else if (this.#mode === "progress") {
        await this.#handleProgressAnswer(text);
      } else if (this.#mode === "recommendation") {
        await this.#handleRecommendationAnswer(text);
      } else {
        await this.#handleDefaultReply(text);
      }
    } catch (error) {
      console.error("Error handling submit:", error);
      this.#view.hideTypingIndicator();
      this.#view.setInputDisabled(false);
    }
  }

  // helper untuk balasan dengan efek "ngetik"
  async #replyWithTyping(text) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.#view.hideTypingIndicator();
        const msg = this.#model.addMessage(text, "bot");
        this.#view.renderMessage(msg);
        this.#view.setInputDisabled(false);
        resolve();
      }, 800); // delay boleh kamu ganti (ms)
    });
  }

  // ================== MODE ONBOARDING ==================

  async #askOnboardingQuestion() {
    await this.#replyWithTyping(
      "Oke, kita mulai onboarding. Sekarang kamu ingin fokus di bidang apa? (misalnya: Front-End, Back-End, Android, Machine Learning, Cloud, atau lainnya?)"
    );
  }

  async #handleOnboardingAnswer(text) {
    if (this.#step === 1) {
      this.#onboardingProfile.focus = text.trim();
      this.#step = 2;

      await this.#replyWithTyping(
        `Keren, kamu tertarik di ${text}. Menurutmu levelmu di bidang ini apa? (Beginner, Intermediate, atau Advanced?)`
      );
    } else if (this.#step === 2) {
      this.#onboardingProfile.level = text.trim();
      this.#mode = "idle";
      this.#step = 0;

      await this.#replyWithTyping(
        `Sip, aku catat kamu tertarik di ${this.#onboardingProfile.focus} dengan level ${this.#onboardingProfile.level}. Nanti aku akan menyesuaikan saran belajar dan rekomendasi kelas dengan profil ini ya.`
      );

      this.#showMainQuickActions();
    } else {
      this.#mode = "idle";
      this.#step = 0;
      await this.#replyWithTyping(
        'Kalau kamu mau memulai onboarding lagi, tinggal klik tombol "Mulai onboarding" di bawah.'
      );
      this.#showMainQuickActions();
    }
  }

  // ================== MODE PROGRESS ==================

  async #askProgressQuestion() {
    await this.#replyWithTyping(
      "Baik, kita cek progress kamu. Kelas atau materi apa yang paling terakhir kamu pelajari di Dicoding?"
    );
  }

  async #handleProgressAnswer(text) {
    if (this.#step === 1) {
      this.#progressState.lastClass = text.trim();
      this.#step = 2;

      await this.#replyWithTyping(
        `Mantap, jadi kelas terakhir kamu adalah "${text}". Dari skala 1–5, seberapa paham kamu dengan materinya?`
      );
    } else if (this.#step === 2) {
      this.#progressState.selfScore = text.trim();
      this.#mode = "idle";
      this.#step = 0;

      await this.#replyWithTyping(
        `Oke, aku catat. Nanti aku bisa bantu saran langkah selanjutnya berdasarkan kelas "${this.#progressState.lastClass}" dan tingkat pemahaman ${this.#progressState.selfScore}/5. Kamu juga bisa langsung minta rekomendasi kelas berikutnya.`
      );

      this.#showMainQuickActions();
    } else {
      this.#mode = "idle";
      this.#step = 0;
      await this.#replyWithTyping(
        'Kalau mau cek progress lagi, klik tombol "Cek progress belajar" di bawah ya.'
      );
      this.#showMainQuickActions();
    }
  }

  // ================== MODE RECOMMENDATION ==================

  async #askRecommendationQuestion() {
    await this.#replyWithTyping(
      "Oke, aku bantu rekomendasi kelas. Kamu ingin fokus di path apa dulu? (misalnya: Front-End Web, Android, Back-End, Machine Learning)"
    );
  }

  async #handleRecommendationAnswer(text) {
    const focus = text.trim();
    this.#mode = "idle";
    this.#step = 0;

    await this.#replyWithTyping(
      `Untuk fokus di ${focus}, kamu bisa mulai dari kelas dasar dulu, lalu lanjut ke kelas menengah. Versi berikutnya nanti bisa kuhubungkan dengan roadmap pribadimu, tapi untuk sekarang kamu bisa lanjut tanya apa pun atau pilih mode lain di tombol bawah.`
    );

    this.#showMainQuickActions();
  }

  // ================== DEFAULT REPLY ==================

  async #handleDefaultReply() {
    await this.#replyWithTyping(
      "Terima kasih sudah bertanya. Saat ini Dico masih dalam tahap pengembangan, jadi aku baru bisa menjawab hal-hal dasar dan mencatat profil belajarmu. Kamu bisa klik salah satu tombol di bawah untuk mulai onboarding, cek progress, atau minta rekomendasi kelas."
    );

    this.#showMainQuickActions();
  }
}
