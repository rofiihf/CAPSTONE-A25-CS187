// src/scripts/presenter/messagePresenter.js

import { getCourses } from "../../data/api.js";
import { COURSE_LEVEL_ORDER } from "../../utils/mapping.js";
import { keywords } from "../../utils/path-keyword.js";

export default class MessagePresenter {
  #view;
  #model;

  // mode percakapan: 'idle' | 'onboarding' | 'progress' | 'recommendation'
  #mode = 'idle';
  #step = 0;

  // state kecil untuk menyimpan jawaban user
  #onboardingProfile = { focus: '', level: '' };
  #progressState = { lastClass: '', selfScore: '' };

  constructor({ model }) {
    this.#model = model;
  }

  setView(view) {
    this.#view = view;
  }
  
  async getData() {
    return await getCourses();
  }
  
  detectPathsFromUser(raw) {
    const matchedPaths = [];
    const pathKeywords = keywords;
    
    for (const [pathName, keywords] of Object.entries(pathKeywords)) {
      for (const kw of keywords) {
        if (raw.includes(kw)) {
          matchedPaths.push(pathName);
          break;
        }
      }
    }
  
    return matchedPaths;
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
  async #replyWithTyping(text, extraOptions = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.#view.hideTypingIndicator();
        const msg = this.#model.addMessage(text, "bot", extraOptions);
        this.#view.renderMessage(msg);
        this.#view.setInputDisabled(false);
        resolve();
      }, 800);
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

  async #getCourseRecommendations(focusText) {
    const raw = focusText.toLowerCase().trim();

    const searchPath = this.detectPathsFromUser(raw);
    if (searchPath.length === 0) {
      return null;
    }

    let targetPath = searchPath[0];
    console.log(searchPath);


    // ===== fallback ke profil onboarding kalau ada =====
    if (!targetPath && this.#onboardingProfile.focus) {
      const onboardLower = this.#onboardingProfile.focus.toLowerCase();
      if (
        onboardLower.includes("front") ||
        onboardLower.includes("web")
      ) {
        targetPath = "Front-End Web Developer";
      } else if (onboardLower.includes("android")) {
        targetPath = "Android";
      } else if (
        onboardLower.includes("machine") ||
        onboardLower.includes("ml")
      ) {
        targetPath = "Machine Learning";
      } else if (onboardLower.includes("back")) {
        targetPath = "Back-End";
      }
    }
    const data = await this.getData();

    if (!data || !data.learning_paths) {
      console.error("DATA TIDAK VALID:", data);
      return [];
    }
    
    
    const learning_paths = data.learning_paths;
    console.log("LEARNING PATHS =", learning_paths);
    // --- Cari learning path berdasarkan nama ---
    let selected_courses = learning_paths.find(
      lp => lp.name.toLowerCase() === (targetPath || "").toLowerCase()
    );
    console.log(selected_courses);
    // fallback
    if (!selected_courses) {
      return null;
    }
    // console.log(sorted_courses);
    const sorted_courses = selected_courses
      .courses.sort((a, b) =>
      COURSE_LEVEL_ORDER[a.level] - COURSE_LEVEL_ORDER[b.level]
    ).slice(0, 3);
    return sorted_courses;

    // --- HARUS return array courses ---
    // return selected_crs.courses.map(c => ({
    //   ...c,
    //   path: selected_crs.name,  // supaya bubbleCourseRecommendation punya path
    // })).slice(0, 3);
  }

  // ================== MODE RECOMMENDATION ==================

  async #askRecommendationQuestion() {
    await this.#replyWithTyping(
      "Oke, aku bantu rekomendasi kelas. Kamu ingin fokus di path apa dulu? (misalnya: Front-End Web, Android, Back-End, Machine Learning)"
    );
  }

  async #handleRecommendationAnswer(text) {
    const focus = text.trim();
    const recommended = await this.#getCourseRecommendations(focus);

    this.#mode = "idle";
    this.#step = 0;

    if(!recommended) {
      await this.#replyWithTyping(
        `Maaf, learning path ${focus} tidak tersedia.`
      );
      return;
    }

    await this.#replyWithTyping(
        `Berikut beberapa rekomendasi kelas Dicoding yang cocok untuk fokus ${focus}:`,
        {
          type: "course-recommendation",
          courses: recommended,
        },
      );
    
    this.#showMainQuickActions();
  }

  // ================== DEFAULT REPLY ==================

  async #handleDefaultReply(text) {
    const botBubble = await this.#model.processBotMessage(text);

    this.#view.hideTypingIndicator();
    this.#view.renderMessage(botBubble);

    this.#view.setInputDisabled();

    this.#showMainQuickActions();
  }

}
