// bubbleLevelQuiz.js
export function createLevelQuizQuestionBubble({ question, index, total, onAnswer }) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", "bot", "bubble-quiz");

  const meta = document.createElement("p");
  meta.classList.add("quiz-meta");
  meta.textContent = `Pertanyaan ${index}/${total}`;
  bubble.appendChild(meta);

  const textEl = document.createElement("p");
  textEl.classList.add("quiz-question-text");
  textEl.textContent = question.text;
  bubble.appendChild(textEl);

  const optionsWrapper = document.createElement("div");
  optionsWrapper.classList.add("quiz-options");

  // flag supaya onAnswer cuma jalan sekali
  let answered = false;

  question.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("quiz-option-btn");

    const codeSpan = document.createElement("span");
    codeSpan.classList.add("quiz-option-code");
    codeSpan.textContent = opt.code;

    const labelSpan = document.createElement("span");
    labelSpan.classList.add("quiz-option-label");
    labelSpan.textContent = opt.label;

    btn.appendChild(codeSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener("click", () => {
      if (answered) return;           // kalau sudah pernah jawab, ignore klik berikutnya
      answered = true;

      // disable SEMUA tombol di pertanyaan ini
      const allBtns = optionsWrapper.querySelectorAll(".quiz-option-btn");
      allBtns.forEach((b) => {
        b.disabled = true;
        b.classList.add("quiz-option-btn--disabled");
      });

      // tandai tombol yang dipilih
      btn.classList.add("quiz-option-btn--selected");

      // lempar ke presenter
      onAnswer(opt);
    });

    optionsWrapper.appendChild(btn);
  });

  bubble.appendChild(optionsWrapper);

  return bubble;
}
