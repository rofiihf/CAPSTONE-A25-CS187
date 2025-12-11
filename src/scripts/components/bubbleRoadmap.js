// src/scripts/components/bubbleRoadmap.js
// Minimal variant: only show central dark title + roadmap content (no intro/desc)

export default function bubbleRoadmap(message = {}) {
  const data = message.roadmap || message.meta?.roadmap || message.meta || null;

  const wrapper = document.createElement("div");
  wrapper.classList.add(
    "message",
    message.sender || "bot",
    "message--with-card",
    "roadmap-bubble"
  );
  if (message.id) wrapper.dataset.id = message.id;
  if (message.timestamp) wrapper.dataset.timestamp = message.timestamp;

  if (!data) {
    const empty = document.createElement("div");
    empty.textContent = message.text || "Maaf, data roadmap tidak tersedia.";
    wrapper.appendChild(empty);
    return wrapper;
  }

  // CENTRAL TITLE (dark/tebal) — keep only this as the visible heading
  const centralTitle = document.createElement("h4");
  centralTitle.classList.add("roadmap-title");
  // prefer job_role/title/message.text for the dark center title
  centralTitle.textContent =
    (data.job_role && `Roadmap: ${data.job_role}`) ||
    data.title ||
    message.text ||
    "Roadmap";
  wrapper.appendChild(centralTitle);

  // --- learning_path style (courses array) ---
  if (data.type === "learning_path" || Array.isArray(data.courses)) {
    const list = document.createElement("div");
    list.classList.add("roadmap-list");

    const items = data.courses || [];
    items.forEach((it, idx) => {
      const item = document.createElement("div");
      item.classList.add("roadmap-item", "lp-course-item");

      const left = document.createElement("div");
      left.classList.add("lp-course-left");
      left.innerHTML = `<div class="roadmap-skill-name">${idx + 1}. ${escapeHtml(
        it.title || it.name || it.ref || it
      )}</div>`;

      const meta = document.createElement("div");
      meta.classList.add("lp-course-meta");
      const metaParts = [];
      if (it.level) metaParts.push(`Level: ${it.level}`);
      if (it.estimated_hours) metaParts.push(`Est: ${it.estimated_hours}h`);
      meta.textContent = metaParts.join(" • ");
      left.appendChild(meta);

      const right = document.createElement("div");
      right.classList.add("lp-course-right");

      const badge = document.createElement("div");
      badge.classList.add("roadmap-skill-level", levelClassFromLevel(it.level));
      badge.textContent = it.level ? `Lvl ${it.level}` : "";

      const detailBtn = document.createElement("button");
      detailBtn.type = "button";
      detailBtn.classList.add("quick-actions__button", "small");
      detailBtn.textContent = "Lihat detail";

      const detailContainer = document.createElement("div");
      detailContainer.classList.add("roadmap-course-detail");
      detailContainer.style.display = "none";

      detailBtn.addEventListener("click", () => {
        const open = detailContainer.style.display === "block";
        if (open) {
          detailContainer.style.display = "none";
          detailBtn.textContent = "Lihat detail";
        } else {
          if (!detailContainer.hasChildNodes()) {
            renderCourseDetail(detailContainer, it);
          }
          detailContainer.style.display = "block";
          detailBtn.textContent = "Sembunyikan";
        }
      });

      right.appendChild(badge);
      right.appendChild(detailBtn);

      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
      list.appendChild(detailContainer);
    });

    wrapper.appendChild(list);
    return wrapper;
  }

  // --- course-like object with modules ---
  if (data.modules || data.estimated_hours || data.level) {
    const modules = Array.isArray(data.modules)
      ? data.modules
      : typeof data.modules === "string"
      ? splitModulesString(data.modules)
      : [];
    if (modules.length) {
      const modulesList = document.createElement("div");
      modulesList.classList.add("roadmap-list");
      modules.forEach((m) => {
        const li = document.createElement("div");
        li.classList.add("roadmap-item");
        li.textContent = m;
        modulesList.appendChild(li);
      });
      wrapper.appendChild(modulesList);
      return wrapper;
    }

    if (data.text) {
      const p = document.createElement("p");
      p.textContent = data.text;
      wrapper.appendChild(p);
      return wrapper;
    }
  }

  // --- enhanced subskills object (FRONTEND_SUBSKILLS) ---
  if (data.job_role || Array.isArray(data.subskills)) {
    const container = document.createElement("div");
    container.classList.add("subskills-container");

    (data.subskills || []).forEach((sub, idx) => {
      const card = document.createElement("div");
      card.classList.add("subskill-card");

      const header = document.createElement("div");
      header.classList.add("subskill-header");
      header.setAttribute("role", "button");
      header.tabIndex = 0;

      const left = document.createElement("div");
      left.classList.add("subskill-left");
      left.innerHTML = `<div class="subskill-title">${idx + 1}. ${escapeHtml(sub.name || "-")}</div>
                        <div class="subskill-meta">Est: ${sub.estimated_hours || "-"}h • P:${sub.priority || "-"}</div>`;

      const right = document.createElement("div");
      right.classList.add("subskill-right");
      const chevron = document.createElement("span");
      chevron.classList.add("chev");
      chevron.textContent = "▾";
      right.appendChild(chevron);

      header.appendChild(left);
      header.appendChild(right);

      const content = document.createElement("div");
      content.classList.add("subskill-content");
      content.style.display = "none";

      const levels = ["beginner", "intermediate", "advanced"];
      levels.forEach((lvl) => {
        const arr = (sub.mapped_courses && sub.mapped_courses[lvl]) || (sub.courses && sub.courses[lvl]) || [];
        if (!arr || arr.length === 0) return;

        const section = document.createElement("div");
        section.classList.add("subskill-level-section");

        const head = document.createElement("div");
        head.classList.add("level-head");
        const badge = document.createElement("span");
        badge.classList.add("level-badge", `level-${lvl}`);
        badge.textContent = lvl.charAt(0).toUpperCase() + lvl.slice(1);
        head.appendChild(badge);
        section.appendChild(head);

        const list = document.createElement("div");
        list.classList.add("level-course-list");
        arr.forEach((course) => {
          const item = document.createElement("div");
          item.classList.add("roadmap-item", "course-row");
          item.textContent = typeof course === "string" ? course : (course.name || course.title || String(course.id));
          list.appendChild(item);
        });
        section.appendChild(list);
        content.appendChild(section);
      });

      if (!content.hasChildNodes()) {
        const p = document.createElement("div");
        p.classList.add("roadmap-item");
        p.style.marginTop = "6px";
        p.textContent = "Tidak ada course dipetakan untuk subskill ini.";
        content.appendChild(p);
      }

      function toggleSubskill() {
        const open = content.style.display === "block";
        if (open) {
          content.style.display = "none";
          chevron.textContent = "▾";
        } else {
          content.style.display = "block";
          chevron.textContent = "▴";
        }
      }
      header.addEventListener("click", toggleSubskill);
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSubskill();
        }
      });

      card.appendChild(header);
      card.appendChild(content);
      container.appendChild(card);
    });

    wrapper.appendChild(container);
    return wrapper;
  }

  // fallback: raw JSON
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  wrapper.appendChild(pre);
  return wrapper;
}

// helper functions (unchanged)
function levelClassFromLevel(level) {
  const s = String(level || "").toLowerCase();
  if (s.includes("1") || s.includes("beginner")) return "level-beginner";
  if (s.includes("2") || s.includes("intermediate")) return "level-intermediate";
  return "level-advanced";
}

function renderCourseDetail(containerEl, courseObj = {}) {
  const modules = Array.isArray(courseObj.modules)
    ? courseObj.modules
    : typeof courseObj.modules === "string"
    ? splitModulesString(courseObj.modules)
    : [];
  if (modules.length) {
    const ul = document.createElement("div");
    ul.classList.add("roadmap-list");
    modules.forEach((m) => {
      const li = document.createElement("div");
      li.classList.add("roadmap-item");
      li.textContent = m;
      ul.appendChild(li);
    });
    containerEl.appendChild(ul);
    return;
  } else if (courseObj.text) {
    const p = document.createElement("p");
    p.textContent = courseObj.text;
    containerEl.appendChild(p);
    return;
  } else {
    const p = document.createElement("div");
    p.textContent = "Detail modul tidak tersedia.";
    containerEl.appendChild(p);
    return;
  }
}

function splitModulesString(s = "") {
  if (!s) return [];
  let arr = s.split(/\t+/).map((x) => x.trim()).filter(Boolean);
  if (arr.length > 1) return arr;
  arr = s.split(/ {2,}/).map((x) => x.trim()).filter(Boolean);
  if (arr.length > 1) return arr;
  arr = s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (arr.length > 1) return arr;
  arr = s.split("•").map((x) => x.trim()).filter(Boolean);
  if (arr.length > 1) return arr;
  arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr;
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])
  );
}
