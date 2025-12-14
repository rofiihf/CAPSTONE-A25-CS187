// src/scripts/presenter/messagePresenter.js
import { sendMessage, getQuizTopics, getQuizQuestions, submitQuizScore, loadCourseMap } from "../../data/api.js";
import { LEVEL_TOPICS as LEVEL_TOPICS_FALLBACK, LEVEL_THRESHOLD } from "../../data/dummy.js";
import { detectIntent } from "../../utils/intent-detector.js";
import bubbleRoadmap from "../../components/bubbleRoadmap.js";
import { bubbleCourseRecommendation } from "../../components/bubbleRecommendation.js";


export default class MessagePresenter {
  shouldRenderRoadmapOnStart = true;
  #view;
  #model;
  #authModel;
  #authService;
  #quickActions;
  #quizState;
  #courseMap;

  constructor({ model, authModel = null, authService = null, courseMap= [] } = {}) {
    this.#model = model;
    this.#authModel = authModel;
    this.#authService = authService;
    this.#courseMap = courseMap;
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
        label: "Aku mau tes skill ku",
      },
    ];
    this.#quizState = {
      step: "idle",       // idle | choose_topic | choose_count | questions
      topic: null,        // object: { id?, label? } as returned by API or fallback
      totalQuestions: 0,
      currentIndex: 0,
      totalScore: 0,      // not used for backend mode, kept for compatibility
      questions: [],      // array of question objects for rendering { text, options: [{code,label}], raw: original }
      answers: [],        // collected answers: { question, answer }
    };
    
  }

  setView(view) {
    this.#view = view;
  }

  setProfile(profile) {
    this.profile = profile;
  }

  async renderInitialMessages() {
    try {
      this.#view.clearChat();

      // === LOAD COURSE MAP ONCE (PRODUCTION SAFE) ===
      if (!Array.isArray(this.#courseMap) || this.#courseMap.length === 0) {
        const result = await loadCourseMap();

        if (result.ok && Array.isArray(result.courses)) {
          this.#courseMap = result.courses;
        } else {
          console.warn("Course map failed to load, using empty list");
          this.#courseMap = [];
        }
      }

      const messages = this.#model.getAllMessages();
      messages.forEach((msg) => this.#view.renderMessage(msg));

      if (this.shouldRenderRoadmapOnStart) {
        this.renderRoadmapFromProfile();
      }

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
    this.shouldRenderRoadmapOnStart = false;
    this.renderInitialMessages();
  }
  
  renderRoadmapFromProfile() {
    if (!this.profile || !this.profile.roadmap_progress) return;

    const rp = this.profile.roadmap_progress;

    const msg = this.#model.addMessage(
      "Ini roadmap belajarmu:",
      "bot",
      {
        type: "roadmap",
        roadmap: rp,
        courseMap: this.#courseMap
      }
    );

    this.#view.renderMessage(msg);
  }


  handleQuickAction(actionId) {
    const action = this.#quickActions.find((a) => a.id === actionId);
    if (!action) return;

    // hapus quick actions setelah dipilih
    this.#view.clearQuickActions();

    // quick action khusus quiz level
    if (actionId === "level-check") {
      this.startLevelCheckFlow();
      return;
    }

    // kirim pesan template ke backend
    this.handleUserSubmit(action.message);
  }

  getRecommendedCourses(profile) {
    if (!Array.isArray(this.#courseMap) || this.#courseMap.length === 0) {
      console.warn("Course map kosong");
      return [];
    }

    const level = profile?.level?.toLowerCase?.() ?? "beginner";

    return this.#courseMap
      .filter(c => c.level?.toLowerCase().includes(level))
      .slice(0, 5);
  }


  // ====== QUIZ "SUDAH DI LEVEL MANA AKU" (BACKEND MODE) ======
  async startLevelCheckFlow() {
    // reset state
    this.#quizState = {
      step: "choose_topic",
      topic: null,
      totalQuestions: 0,
      currentIndex: 0,
      totalScore: 0,
      questions: [],
      answers: [],
    };

    // matikan input manual supaya user pakai button saja
    this.#view.setInputDisabled(true);

    // tampilkan intro
    const intro = this.#model.addMessage(
      "Saya akan membantu mengecek level Anda. Pertama, pilih minat/topik yang ingin diuji.",
      "bot"
    );
    this.#view.renderMessage(intro);

    // ambil daftar topik dari backend
    let topicsResp;
    try {
      topicsResp = await getQuizTopics();
    } catch (err) {
      console.error("Failed to fetch quiz topics:", err);
      topicsResp = null;
    }

    let options;
    if (topicsResp && topicsResp.ok && Array.isArray(topicsResp.topics) && topicsResp.topics.length) {
      // backend may return topics as array of strings or objects
      options = topicsResp.topics.map((t) => {
        if (typeof t === "string") {
          return { value: t, label: t };
        }
        // if object, try common props
        return {
          value: t.id ?? t.key ?? t.tech_category ?? t.name ?? JSON.stringify(t),
          label: t.label ?? t.name ?? t.tech_category ?? (typeof t.title === "string" ? t.title : String(t.value ?? t.id ?? "")),
          raw: t
        };
      });
    } else {
      // fallback ke static LEVEL_TOPICS dari dummy.js
      console.warn("Using fallback LEVEL_TOPICS for quiz topics");
      options = (LEVEL_TOPICS_FALLBACK || []).map((t) => ({ value: t.id, label: t.label, raw: t }));
    }

    // render choice bubble with topics
    this.#view.renderChoiceBubble({
      title: "Pilih 1 minat belajar",
      options,
      onChoose: (opt) => this.handleChooseTopic(opt),
    });
  }

  handleChooseTopic(opt) {
    // opt: { value, label, raw? }
    if (!opt) return;

    // set topic
    this.#quizState.topic = opt;
    this.#quizState.step = "choose_count";

    // tampilkan pilihan user di chat
    const userMsg = this.#model.addMessage(opt.label, "user");
    this.#view.renderMessage(userMsg);

    const explain = this.#model.addMessage(
      `Baik. Untuk topik ${opt.label}, silakan pilih jumlah pertanyaan yang ingin kamu jawab.`,
      "bot"
    );
    this.#view.renderMessage(explain);

    // render choice untuk jumlah pertanyaan
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

  async handleChooseCount(opt) {
    const count = Number(opt.value) || 5;
    const topicObj = this.#quizState.topic;
    if (!topicObj) return;

    // tampilkan pilihan user
    const userMsg = this.#model.addMessage(opt.label, "user");
    this.#view.renderMessage(userMsg);

    // inform user
    const info = this.#model.addMessage(
      `Mengambil ${count} soal untuk topik ${topicObj.label}. Tunggu sebentar.`,
      "bot"
    );
    this.#view.renderMessage(info);

    // ambil soal dari backend
    let questionsResp;
    try {
      const topicIdentifier = topicObj.value ?? topicObj.label;
      questionsResp = await getQuizQuestions(topicIdentifier, count);
    } catch (err) {
      console.error("Failed to fetch quiz questions:", err);
      questionsResp = null;
    }

    if (!questionsResp || !questionsResp.ok || !Array.isArray(questionsResp.questions) || questionsResp.questions.length === 0) {
      // gagal ambil soal — beri info dan enable input kembali
      const errMsg = this.#model.addMessage(
        "Gagal mengambil soal. Silakan coba lagi nanti.",
        "bot"
      );
      this.#view.renderMessage(errMsg);
      this.#quizState.step = "idle";
      this.#view.setInputDisabled(false);
      return;
    }

    // map soal backend ke format yang dipakai komponen UI
    const mapped = questionsResp.questions.map((q, idx) => {
      // backend expected fields: question (or question_desc), options array, correct_answer (not used here)
      const text = q.question ?? q.question_desc ?? q.question_text ?? "";
      const opts = Array.isArray(q.options) ? q.options : [
        q.option_1, q.option_2, q.option_3, q.option_4
      ].filter(Boolean);

      // map to { code: 'A'|'B'..., label }
      const codes = ["A", "B", "C", "D", "E"];
      const mappedOpts = opts.map((o, i) => ({
        code: codes[i] ?? String(i + 1),
        label: String(o)
      }));

      return {
        id: q.id ?? `q-${idx}`,
        text,
        options: mappedOpts,
        raw: q
      };
    });

    // store questions and reset answers
    this.#quizState.questions = mapped;
    this.#quizState.totalQuestions = mapped.length;
    this.#quizState.step = "questions";
    this.#quizState.currentIndex = 0;
    this.#quizState.answers = [];

    // inform readiness
    const readyMsg = this.#model.addMessage(
      `Siap. ${this.#quizState.totalQuestions} pertanyaan akan muncul sekarang.`,
      "bot"
    );
    this.#view.renderMessage(readyMsg);

    // show first question
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
      question: {
        text: question.text,
        options: question.options
      },
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

    // simpan jawaban (kirim nanti ke backend)
    this.#quizState.answers.push({
      question: question.text,
      answer: opt.label
    });

    // next
    this.#quizState.currentIndex += 1;
    this.showNextQuizQuestion();
  }

  async finishQuiz() {
    const topicObj = this.#quizState.topic;
    const answers = this.#quizState.answers || [];

    if (!topicObj) {
      const errMsg = this.#model.addMessage(
        "Topik quiz tidak ditemukan. Quiz dibatalkan.",
        "bot"
      );
      this.#view.renderMessage(errMsg);
      this.#quizState.step = "idle";
      this.#view.setInputDisabled(false);
      return;
    }

    // disable input supaya user menunggu sampai proses selesai
    this.#view.setInputDisabled(true);

    // panggil backend untuk penilaian
    let result;
    try {
      const topicIdentifier = topicObj.value ?? topicObj.label;
      result = await submitQuizScore(topicIdentifier, answers);
    } catch (err) {
      console.error("Failed to submit quiz score:", err);
      result = null;
    }

    if (!result || !result.ok) {
      const failMsg = this.#model.addMessage(
        "Gagal menghitung hasil. Silakan coba lagi nanti.",
        "bot"
      );
      this.#view.renderMessage(failMsg);
      this.#quizState.step = "idle";
      this.#view.setInputDisabled(false);
      return;
    }

    // tampilkan hasil dari backend
    // expected response: { ok:true, topic, total_questions, score, level, profile? }
    const level = result.level ?? "Unknown";
    const score = result.score ?? 0;
    const totalQ = result.total_questions ?? answers.length;

    const resultMsg = this.#model.addMessage(
      `Selesai. Untuk topik ${topicObj.label}, hasil: skor ${score}/${totalQ}. Level yang ditetapkan: ${level}.`,
      "bot"
    );
    this.#view.renderMessage(resultMsg);

    // === Integrasi profile update (MVP) ===
    // preferensi: jika backend sudah mengembalikan profile di response, gunakan itu;
    // jika tidak, minta authService atau authModel untuk refresh profile.
    try {
      // jika backend mengirimkan profile yang sudah di-update
      if (result.profile && this.#authModel && typeof this.#authModel.setUser === "function") {
        try {
          this.#authModel.setUser(result.profile);
        } catch (e) {
          console.warn("authModel.setUser failed:", e);
        }
      } else if (this.#authService && typeof this.#authService.fetchProfile === "function") {
        // panggil service untuk refresh profile
        try {
          await this.#authService.fetchProfile();
        } catch (e) {
          console.warn("authService.fetchProfile failed:", e);
        }
      } else if (this.#authModel && typeof this.#authModel.fetchProfile === "function") {
        // fallback ke model fetch
        try {
          await this.#authModel.fetchProfile();
        } catch (e) {
          console.warn("authModel.fetchProfile failed:", e);
        }
      } else {
        // tidak ada mekanisme refresh tersedia — hanya warn
        console.warn("No profile refresh mechanism available (authService/authModel).");
      }
    } catch (err) {
      console.warn("Error while attempting to refresh profile:", err);
    }

    // reset quiz state and re-enable input
    this.#quizState = {
      step: "idle",
      topic: null,
      totalQuestions: 0,
      currentIndex: 0,
      totalScore: 0,
      questions: [],
      answers: []
    };
    this.#view.setInputDisabled(false);
  }

  // ================== HANDLE INPUT FORM (Chat with model) ==================
  async handleUserSubmit(textOverride = null) {
    try {
      
      const rawText = textOverride ?? this.#view.getUserInput();
      const text = rawText.trim();
      
      if (!text) {
        return;
      }

      const intentResult = detectIntent(text);
      if (intentResult.intent && intentResult.confidence >= 0.7) {
        // treat as intent
        // this.#view.clearInputChat();
        if (intentResult.intent === "skill_assessment") {
          // render user message
          const userMessage = this.#model.addMessage(text, "user");
          this.#view.renderMessage(userMessage);
          this.#view.clearQuickActions();
          // start quiz flow
          this.startLevelCheckFlow();
          return;
        }
        // if (intentResult.intent === "roadmap_request") {
        //   // handle roadmap quick action
        //   const userMessage = this.#model.addMessage(text, "user");
        //   this.#view.renderMessage(userMessage);
        //   // call presenter method to show roadmap
        //   // e.g., this.handleRoadmapRequest();
        //   return;
        // }
        // ... other intents
      }


      // kalau dipanggil dari quick action → pakai textOverride
      // kalau dari form → pakai this.#view.getUserInput()

      // disable input saat proses
      this.#view.setInputDisabled(true);

      // simpan & tampilkan pesan user
      const userMessage = this.#model.addMessage(text, "user");
      this.#view.renderMessage(userMessage);

      // reset input + tampilkan typing indicator bot
      this.#view.resetInput();
      this.#view.showTypingIndicator();

      // === panggil backend chat ===
      const response = await sendMessage(text);

      if (response.profile) {
          console.log("Updating profile with backend data...");
          this.profile = response.profile;

          if (this.#authModel?.setUser) {
              this.#authModel.setUser(response.profile);
          }

          // And replace roadmap shown to UI
          if (response.meta?.type === "roadmap") {
              response.meta.roadmap = response.profile.roadmap_progress;
          }
      }

      console.log("DEBUG RESPONSE:", response);
      if (!response.meta) {
          const rp = response.profile?.roadmap_progress;
          if (rp) {
              console.warn("⚠️ Using fallback roadmap from profile (backend sent no meta)");
              response.meta = {
                  type: "roadmap",
                  roadmap: rp     // <-- use rp directly, do not cherry pick fields
              };
          }
      }


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

      // petakan meta dari backend/ML ke extra options
      const extraOptions = {};
      if (response.meta) extraOptions.meta = response.meta;
      if (response.sources) extraOptions.sources = response.sources;

      const metaType =
        response.meta?.type ||
        response.intent?.mode ||
        null;

      if (metaType) {
          extraOptions.type = metaType;

          // =============================================
          // 1) COURSE RECOMMENDATION
          // =============================================
          if (metaType === "course-recommendation" || metaType === "course_recommendation") {
            console.log("🎓 COURSE RECOMMENDATION DETECTED");

            if (!Array.isArray(response.meta?.courses)) {
              console.warn("Invalid courses payload:", response.meta?.courses);
              return;
            }

            const courseMapById = Object.fromEntries(
              this.#courseMap.map(c => [String(c.id), c])
            );

            const courses = response.meta.courses
              .map(c => {
                const full = courseMapById[String(c.id)];
                if (!full) return null;

                return {
                  id: full.id,
                  title: full.title || full.course_name || "Untitled Course",
                  level: full.level || "Beginner",

                  // ⬇️ WAJIB sesuai UI
                  path:
                    full.path ||
                    full.learning_path ||
                    (full.learning_path_id ? `Learning Path ${full.learning_path_id}` : ""),

                  description:
                    full.description ||
                    full.desc ||
                    (full.hours
                      ? `Durasi ${full.hours} jam`
                      : "Deskripsi kelas belum tersedia")
                };
              })
              .filter(Boolean);

            if (courses.length === 0) {
              const msg = this.#model.addMessage(
                "Maaf, detail kelas tidak dapat dimuat.",
                "bot"
              );
              this.#view.renderMessage(msg);
              return;
            }

            const botCard = this.#model.addMessage(
              "Berikut rekomendasi kelas untukmu:",
              "bot",
              { type: "course-recommendation", courses }
            );

            this.#view.renderMessage(botCard);
            return;
          }


          // =============================================
          // 2) ROADMAP HANDLING
          // =============================================
          if (metaType === "roadmap") {
              const roadmap = response.meta?.roadmap ?? null;

              console.debug("[PRESENTER] roadmap meta:", roadmap);
              console.debug("[PRESENTER] full response:", response);

              // Validasi roadmap
              if (!roadmap || 
                  typeof roadmap !== "object" || 
                  !roadmap.job_role || 
                  !Array.isArray(roadmap.subskills)) {
                  
                  // Roadmap invalid → tampilkan error message
                  const errorMsg = this.#model.addMessage(
                      "Maaf, roadmap tidak dapat dimuat. Data tidak valid.",
                      "bot"
                  );
                  this.#view.renderMessage(errorMsg);
                  return;
              }

              // Roadmap valid → render dengan bubble khusus
              const replyText = response.reply || `Roadmap untuk ${roadmap.job_role} telah dibuat!`;
              
              const botCard = this.#model.addMessage(
                  replyText,
                  "bot",
                  { 
                      type: "roadmap", 
                      roadmap: roadmap,
                      courseMap: this.#courseMap
                  }
              );

              this.#view.renderMessage(botCard);
              return;
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

  handleCourseClick({ courseRef }) {
    const course = this.#courseMap.find(c => String(c.id) === String(courseRef));

    if (!course) {
      const msg = this.#model.addMessage(
        `Detail course dengan ID ${courseRef} tidak ditemukan.`,
        "bot"
      );
      this.#view.renderMessage(msg);
      return;
    }

    const msg = this.#model.addMessage(
      `Detail course: ${course.title} (${course.level}, ${course.hours} jam)`,
      "bot"
    );

    this.#view.renderMessage(msg);
  }


}