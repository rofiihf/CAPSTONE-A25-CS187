// src/scripts/presenter/messagePresenter.js

import { sendMessage } from "../../data/api.js";
import { LEVEL_TOPICS, LEVEL_THRESHOLD } from "../../data/dummy.js";


export default class MessagePresenter {
  #view;
  #model;
  #authModel;
  #authService;
  #quickActions;
  #quizState;


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
      {
        id: "level-check",
        label: "Sudah di level mana aku",
      },
    ];
      this.#quizState = {
      step: "idle",       // idle | choose_topic | choose_count | questions
      topic: null,
      totalQuestions: 0,
      currentIndex: 0,
      totalScore: 0,
      questions: [],
    };
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

    // === QUICK ACTION KHUSUS QUIZ LEVEL ===
    if (actionId === "level-check") {
      this.startLevelCheckFlow();
      return;
    }
    // Kirim pesan template ke backend
    this.handleUserSubmit(action.message);
  }

  // ====== QUIZ "SUDAH DI LEVEL MANA AKU" (FRONTEND ONLY) ======
  startLevelCheckFlow() {
    this.#quizState = {
      step: "choose_topic",
      topic: null,
      totalQuestions: 0,
      currentIndex: 0,
      totalScore: 0,
      questions: [],
    };

    // Matikan input manual biar user pakai button saja
    this.#view.setInputDisabled(true);

    const intro = this.#model.addMessage(
      "Halo! Aku bantu cek dulu level belajarmu ya. Pilih dulu 1 minat belajar yang paling ingin kamu kuasai.",
      "bot"
    );
    this.#view.renderMessage(intro);

    this.#view.renderChoiceBubble({
      title: "Pilih 1 minat belajar",
      options: LEVEL_TOPICS.map((t) => ({ value: t.id, label: t.label })),
      onChoose: (opt) => this.handleChooseTopic(opt),
    });
  }

  handleChooseTopic(opt) {
    const topic = LEVEL_TOPICS.find((t) => t.id === opt.value);
    if (!topic) return;

    this.#quizState.topic = topic;
    this.#quizState.step = "choose_count";

    const userMsg = this.#model.addMessage(opt.label, "user");
    this.#view.renderMessage(userMsg);

    const explain = this.#model.addMessage(
      `Jadi, ${topic.label} ya. Sebelum mulai, aku akan kasih beberapa pertanyaan biar tahu levelmu. Semakin banyak pertanyaan yang kamu jawab, semakin akurat hasilnya.`,
      "bot"
    );
    this.#view.renderMessage(explain);

    this.#view.renderChoiceBubble({
      title: "Pilih jumlah pertanyaan",
      options: [
        { value: 5, label: "5 pertanyaan" },
        { value: 10, label: "10 pertanyaan" },
        { value: 15, label: "15 pertanyaan" },
      ],
      onChoose: (optCount) => this.handleChooseCount(optCount),
    });
  }

  handleChooseCount(opt) {
    const count = opt.value;
    const topic = this.#quizState.topic;
    const maxAvailable = topic.questions.length;

    this.#quizState.totalQuestions = Math.min(count, maxAvailable);
    this.#quizState.questions = topic.questions.slice(
      0,
      this.#quizState.totalQuestions
    );
    this.#quizState.step = "questions";
    this.#quizState.currentIndex = 0;
    this.#quizState.totalScore = 0;

    const userMsg = this.#model.addMessage(opt.label, "user");
    this.#view.renderMessage(userMsg);

    const info = this.#model.addMessage(
      `Nice! ${this.#quizState.totalQuestions} pertanyaan akan diajukan untukmu. Jawab saja sesuai yang kamu rasakan ya 😊`,
      "bot"
    );
    this.#view.renderMessage(info);

    this.showNextQuizQuestion();
  }

  showNextQuizQuestion() {
    const { currentIndex, questions, totalQuestions } = this.#quizState;

    if (currentIndex >= totalQuestions) {
      this.finishQuiz();
      return;
    }

    const question = questions[currentIndex];

    this.#view.renderLevelQuizQuestion({
      question,
      index: currentIndex + 1,
      total: totalQuestions,
      onAnswer: (opt) => this.handleQuizAnswer(question, opt),
    });
  }

  handleQuizAnswer(question, opt) {
    // tampilkan jawaban user sebagai bubble biasa
    const userMsg = this.#model.addMessage(
      `${opt.code}. ${opt.label}`,
      "user"
    );
    this.#view.renderMessage(userMsg);

    this.#quizState.totalScore += opt.score;
    this.#quizState.currentIndex += 1;

    this.showNextQuizQuestion();
  }

  finishQuiz() {
    const total = this.#quizState.totalScore;
    const { beginner, intermediate, advance } = LEVEL_THRESHOLD;

    let level = "Beginner";
    if (total <= beginner) {
      level = "Beginner";
    } else if (total <= intermediate) {
      level = "Intermediate";
    } else if (total >= advance) {
      level = "Advance";
    }

    const topicLabel = this.#quizState.topic?.label || "topik ini";

    const resultMsg = this.#model.addMessage(
      `Selesai! Berdasarkan jawabanmu, untuk ${topicLabel}, kamu saat ini berada di level **${level}**.`,
      "bot"
    );
    this.#view.renderMessage(resultMsg);

    // Reset state quiz & hidupkan lagi input manual
    this.#quizState.step = "idle";
    this.#view.setInputDisabled(false);
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
