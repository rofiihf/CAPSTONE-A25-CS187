const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
// Ambil Data API Dicoding
async function fetchFromDicoding(endpoint) {
  const response = await fetch(`${process.env.BASE_URL}${endpoint}`, {
    headers: {
      "apikey": process.env.API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) throw new Error(`Error fetch: ${endpoint}` );

  return response.json();
}

module.exports = { fetchFromDicoding };