export function bubbleChat ({
  id,
  sender,
  text,
  timestamp,
}) {
  const message = document.createElement("div");
  message.classList.add("message", sender);
  message.dataset.id = id;
  message.dataset.timestamp = timestamp;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  message.appendChild(paragraph);
  return message;
}