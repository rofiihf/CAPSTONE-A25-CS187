const { getAggregatedData } = require("../services/data-services");

async function handleData(req, res) {
  try {
    const data = await getAggregatedData();
    res.json({ learning_paths: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch learning data",
      detail: error.message, 
    });
  }
}

module.exports = { handleData };