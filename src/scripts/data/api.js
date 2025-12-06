
// import { BACKEND_URL } from "../config.js";

// const ENDPOINTS = {
//   SEND_MESSAGE: `/chat`,
// }

export async function sendMessage(message) {
  try {
    const fetchResponse = await fetch("/chat", {
      method: "POST",
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    const json = await fetchResponse.json();

    return {
      ...json,
      ok: fetchResponse.ok,
    }
  } catch (error) {
    console.error(`Error: Backend not reachable: ${error}`);

    return {
      ok: false,
      reply: "Tidak dapat dijangkau.",
    }
  }
}
