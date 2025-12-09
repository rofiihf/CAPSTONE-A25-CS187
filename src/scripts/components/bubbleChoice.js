// bubbleChoice.js
export function createChoiceBubble({ title, options, onChoose }) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", "bot", "bubble-choice");

  if (title) {
    const titleEl = document.createElement("p");
    titleEl.classList.add("choice-title");
    titleEl.textContent = title;
    bubble.appendChild(titleEl);
  }

  const wrapper = document.createElement("div");
  wrapper.classList.add("choice-chip-wrapper");

  // flag supaya cuma boleh pilih sekali
  let chosen = false;

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("choice-chip");
    btn.textContent = opt.label;

    btn.addEventListener("click", () => {
      if (chosen) return;        // sudah pernah pilih? abaikan

      chosen = true;

      // disable semua chip di bubble ini
      const allBtns = wrapper.querySelectorAll(".choice-chip");
      allBtns.forEach((b) => {
        b.disabled = true;
        b.classList.add("choice-chip--disabled");
      });

      // tandai chip yang dipilih
      btn.classList.add("choice-chip--selected");

      onChoose(opt);
    });

    wrapper.appendChild(btn);
  });

  bubble.appendChild(wrapper);
  return bubble;
}
