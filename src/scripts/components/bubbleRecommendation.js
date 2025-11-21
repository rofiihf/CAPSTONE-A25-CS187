export function bubbleCourseRecommendation({ 
  id, 
  sender, 
  text, 
  timestamp, 
  courses,
}) {
  const message = document.createElement("div");
  message.classList.add("message", sender, "message--with-card");
  message.dataset.id = id;
  message.dataset.timestamp = timestamp;

  const intro = document.createElement("p");
  intro.textContent = text;
  message.appendChild(intro);

  const list = document.createElement("div");
  list.classList.add("course-card-list");

  courses.forEach(course => {
    const card = document.createElement("div");
    card.classList.add("course-card");

    const title = document.createElement("div");
    title.classList.add("course-card__title");
    title.textContent = course.title;

    const meta = document.createElement("div");
    meta.classList.add("course-card__meta");

    const level = document.createElement("span");
    level.classList.add("course-card__badge");
    level.textContent = course.level;

    const path = document.createElement("span");
    path.classList.add("course-card__path");
    path.textContent = course.path;

    meta.appendChild(level);
    meta.appendChild(path);

    const desc = document.createElement("p");
    desc.classList.add("course-card__desc");
    desc.textContent = course.description;

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(desc);
    list.appendChild(card);
  });

  message.appendChild(list);
  return message;
}