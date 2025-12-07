// bubbleProgress.js

export default function bubbleProgress(message) {
  const container = document.createElement('div');
  container.classList.add('chat-bubble', 'bot', 'progress-bubble');

  // Teks utama (ringkasan dari bot)
  const mainText = document.createElement('p');
  mainText.classList.add('bot-text');
  mainText.textContent =
    message.text || 'Berikut rangkuman progres belajarmu 👇';
  container.appendChild(mainText);

  // Ambil data progress
  const progress = message.progress || message.meta?.progress || message.meta;
  if (!progress) return container;

  // Judul
  const title = document.createElement('h4');
  title.classList.add('progress-title');
  title.textContent = progress.title || 'Progres Minggu Ini';
  container.appendChild(title);

  const list = document.createElement('ul');
  list.classList.add('progress-list');

  (progress.items || []).forEach((item) => {
    const li = document.createElement('li');
    li.classList.add('progress-item');

    const left = document.createElement('div');
    left.classList.add('progress-left');

    const skillName = document.createElement('span');
    skillName.classList.add('progress-skill-name');
    skillName.textContent = item.name || '-';

    const change = document.createElement('span');
    change.classList.add('progress-change');
    // contoh: "Beginner → Intermediate"
    if (item.from && item.to) {
      change.textContent = `${item.from} → ${item.to}`;
    } else if (item.to) {
      change.textContent = item.to;
    } else {
      change.textContent = item.status || '';
    }

    left.appendChild(skillName);
    left.appendChild(change);

    const badge = document.createElement('span');
    badge.classList.add('progress-badge');

    const status = (item.status || item.trend || '').toLowerCase();
    if (status.includes('naik') || status.includes('improve') || status.includes('up')) {
      badge.classList.add('progress-up');
      badge.textContent = 'Naik';
    } else if (status.includes('turun') || status.includes('down')) {
      badge.classList.add('progress-down');
      badge.textContent = 'Turun';
    } else {
      badge.classList.add('progress-neutral');
      badge.textContent = 'Stable';
    }

    li.appendChild(left);
    li.appendChild(badge);
    list.appendChild(li);
  });

  container.appendChild(list);

  return container;
}
