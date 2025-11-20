export function generateBubbleChat ({
  id,
  sender,
  text,
  timestamp,
  type,
  courses,
}) {
  const message = document.createElement("div");
  message.classList.add("message", sender);
  message.dataset.id = id;
  message.dataset.timestamp = timestamp;

  // === Bubble khusus rekomendasi kelas ===
  if (type === "course-recommendation" && Array.isArray(courses) && courses.length) {
    message.classList.add("message--with-card");

    // teks pembuka di atas kartu
    const intro = document.createElement("p");
    intro.textContent = text;
    message.appendChild(intro);

    const list = document.createElement("div");
    list.classList.add("course-card-list");

    courses.forEach((course) => {
      const card = document.createElement("div");
      card.classList.add("course-card");

      const titleEl = document.createElement("div");
      titleEl.classList.add("course-card__title");
      titleEl.textContent = course.title;

      const meta = document.createElement("div");
      meta.classList.add("course-card__meta");

      const levelBadge = document.createElement("span");
      levelBadge.classList.add("course-card__badge");
      levelBadge.textContent = course.level;

      const pathEl = document.createElement("span");
      pathEl.classList.add("course-card__path");
      pathEl.textContent = course.path;

      meta.appendChild(levelBadge);
      meta.appendChild(pathEl);

      const desc = document.createElement("p");
      desc.classList.add("course-card__desc");
      desc.textContent = course.description;

      card.appendChild(titleEl);
      card.appendChild(meta);
      card.appendChild(desc);

      list.appendChild(card);
    });

    message.appendChild(list);
    return message;
  }

  // === Bubble teks biasa (default) ===
  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  message.appendChild(paragraph);
  return message;
}