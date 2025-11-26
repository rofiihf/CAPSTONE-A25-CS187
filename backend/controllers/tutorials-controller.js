const { fetchFromDicoding } = require("../services/api-services.js");

async function handleGetTutorials(req, res) {
  try {
    const fetchResponse = await fetchFromDicoding("/tutorials");
    
    res.json(fetchResponse);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil API tutorials "});
  }
}

module.exports = { handleGetTutorials }