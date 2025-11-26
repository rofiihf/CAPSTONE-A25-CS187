// const fs = require("fs");
// const path = require("path");

const { fetchFromDicoding } = require("../services/api-services.js");

// Fungsi untuk mengambil data dari API Course Dicoding
async function handleGetCourses(req, res) {
  try {
    const fetchResponse = await fetchFromDicoding("/courses");
    
    res.json(fetchResponse);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil API courses "});
  }
}

module.exports = { handleGetCourses };
