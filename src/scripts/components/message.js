// TEMPORARY!! FRONT-END ONLY 
// Jadi bakalan ada perubahan kedepannya kalau udah ada backend.

// Handle User Input

import { generateBubbleChat } from "../templates.js";
import { dummyData } from "../data/dummy.js";


const form = document.querySelector(".input-chat-form");
const chatContainerElement = document.querySelector(".chat-message");
const userInputChat = document.querySelector("#user-chat");

function renderChat(chatData) {
  const bubbleChat = generateBubbleChat(chatData);
  chatContainerElement.appendChild(bubbleChat);
  chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
}

function addChat(text, sender) {
  const newChat = {
    id: `chatbot-ai-${Date.now()}`,
    sender,
    text,
    timestamp: new Date().toISOString(),
  };

  dummyData.push(newChat);
  renderChat(newChat);
}


function renderInitialChats() {
  chatContainerElement.innerHTML = "";
  dummyData.forEach((chat) => renderChat(chat));
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); 

  const text = userInputChat.value.trim();
  if (!text) return;

  userInputChat.disabled = true;

  addChat(text, "user");
  form.reset();

  setTimeout(() => {
    const botReply = `Halo, chatbot ini masih dalam perkembangan, mohon bersabar.`;
    addChat(botReply, "bot");

    userInputChat.disabled = false;
  }, 1000);
});

userInputChat.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});


  renderInitialChats();
;