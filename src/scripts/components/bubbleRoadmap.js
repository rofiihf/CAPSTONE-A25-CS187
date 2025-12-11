// bubbleRoadmap.js

export default function bubbleRoadmap(message) {
  // Bungkus utama bubble (ikut gaya bot)
  const container = document.createElement('div');
  container.classList.add('chat-bubble', 'bot', 'roadmap-bubble');

  // Teks utama dari bot (kalimat pembuka)
  const mainText = document.createElement('p');
  mainText.classList.add('bot-text');
  mainText.textContent =
    message.text || 'Berikut roadmap belajar yang aku susun untukmu 👇';
  container.appendChild(mainText);

  // Ambil data roadmap dari message
  // (diisi dari response.meta.roadmap oleh presenter Tahap 1)
  const roadmap = message.roadmap || message.meta?.roadmap || message.meta;
  if (!roadmap) return container; // kalau belum ada datanya, ya cuma teks saja

  // Judul roadmap (job role)
  const title = document.createElement('h4');
  title.classList.add('roadmap-title');
  title.textContent = roadmap.job_role
    ? `Roadmap: ${roadmap.job_role}`
    : 'Roadmap Belajar';
  container.appendChild(title);

  // List subskill
  const list = document.createElement('ul');
  list.classList.add('roadmap-list');

  (roadmap.subskills || []).forEach((sub) => {
    const item = document.createElement('li');
    item.classList.add('roadmap-item');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('roadmap-skill-name');
    nameSpan.textContent = sub.name || '-';

    const levelSpan = document.createElement('span');
    levelSpan.classList.add(
      'roadmap-skill-level',
      // kelas tambahan berdasarkan level untuk styling warna
      sub.level ? `level-${sub.level.toLowerCase()}` : 'level-unknown'
    );
    levelSpan.textContent = sub.level || '-';

    item.appendChild(nameSpan);
    item.appendChild(levelSpan);
    list.appendChild(item);
  });

  container.appendChild(list);

  return container;
}
