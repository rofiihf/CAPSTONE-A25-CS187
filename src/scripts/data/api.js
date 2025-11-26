import { BOT_API } from "../config.js";

const ENDPOINTS = {
  SEND_MESSAGE: `${BOT_API}/chat`,
  LP_COURSE_DATA: `${BOT_API}/data`,
}

export async function sendMessage(message) {
  try {
    const data = JSON.stringify({ message });
    const fetchResponse = await fetch(ENDPOINTS.SEND_MESSAGE, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
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

export async function getCourses() {
  try {
    const fetchResponse = await fetch(ENDPOINTS.LP_COURSE_DATA);
    const json = await fetchResponse.json();
    return {
      ...json,
      ok: fetchResponse.ok,
    }
  } catch (error) {
    console.error(`Error: Backend not reachable: ${error}`);

    return {
      ok: false,
      reply: "Tidak dapat dijangkau",
    }
  }
}