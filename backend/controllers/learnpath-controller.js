const { fetchFromDicoding } = require("../services/api-services.js");

async function handleGetLearnPath(req, res) {
  try {
    const fetchResponse = await fetchFromDicoding("/learning_paths");

    res.json(fetchResponse);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil API learning path "});
  }
}

module.exports = { handleGetLearnPath }