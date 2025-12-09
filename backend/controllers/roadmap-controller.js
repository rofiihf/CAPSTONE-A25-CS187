// Roadmap management endpoints
async function getRoadmapRecommendations(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        reply: "Anda belum login",
      });
    }

    const MODEL_URL = process.env.BOT_API_URL;
    if (!MODEL_URL) {
      return res.status(400).json({
        ok: false,
        reply: "Model tidak dapat dijangkau."
      });
    }

    // Construct the model API URL (assuming /chat endpoint base, replace with /roadmap/recommendations)
    const baseUrl = MODEL_URL.replace('/chat', '');
    const recommendationsUrl = `${baseUrl}/roadmap/recommendations/${String(userId)}`;

    const fetchRecommendations = await fetch(recommendationsUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!fetchRecommendations.ok) {
      const text = await fetchRecommendations.text();
      return res.status(502).json({
        ok: false,
        reply: "ML backend error",
        detail: text
      });
    }

    const data = await fetchRecommendations.json();

    return res.json({
      ok: true,
      recommendations: data.recommendations || null,
      meta: data.meta || null,
    });

  } catch (error) {
    console.error("Roadmap Recommendations Error: ", error);
    return res.status(500).json({
      ok: false,
      reply: "Terjadi kesalahan pada server",
    });
  }
}

async function updateSkillLevel(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        reply: "Anda belum login",
      });
    }

    const { subskill_id, level, notes } = req.body;

    if (!subskill_id || !level) {
      return res.status(400).json({
        ok: false,
        reply: "subskill_id dan level harus disediakan",
      });
    }

    const MODEL_URL = process.env.BOT_API_URL;
    if (!MODEL_URL) {
      return res.status(400).json({
        ok: false,
        reply: "Model tidak dapat dijangkau."
      });
    }

    const baseUrl = MODEL_URL.replace('/chat', '');
    const updateUrl = `${baseUrl}/roadmap/update-skill`;

    const fetchUpdate = await fetch(updateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: String(userId),
        subskill_id: subskill_id,
        level: level,
        notes: notes || ""
      })
    });

    if (!fetchUpdate.ok) {
      const text = await fetchUpdate.text();
      return res.status(502).json({
        ok: false,
        reply: "ML backend error",
        detail: text
      });
    }

    const data = await fetchUpdate.json();

    return res.json({
      ok: true,
      roadmap_progress: data.roadmap_progress || null,
      meta: data.meta || null,
    });

  } catch (error) {
    console.error("Skill Update Error: ", error);
    return res.status(500).json({
      ok: false,
      reply: "Terjadi kesalahan pada server",
    });
  }
}

async function autoUpdateRoadmap(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        reply: "Anda belum login",
      });
    }

    const MODEL_URL = process.env.BOT_API_URL;
    if (!MODEL_URL) {
      return res.status(400).json({
        ok: false,
        reply: "Model tidak dapat dijangkau."
      });
    }

    const baseUrl = MODEL_URL.replace('/chat', '');
    const updateUrl = `${baseUrl}/roadmap/auto-update`;

    const fetchUpdate = await fetch(updateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: String(userId),
        text: "auto-update"
      })
    });

    if (!fetchUpdate.ok) {
      const text = await fetchUpdate.text();
      return res.status(502).json({
        ok: false,
        reply: "ML backend error",
        detail: text
      });
    }

    const data = await fetchUpdate.json();

    return res.json({
      ok: true,
      roadmap_progress: data.roadmap_progress || null,
      meta: data.meta || null,
    });

  } catch (error) {
    console.error("Auto Update Error: ", error);
    return res.status(500).json({
      ok: false,
      reply: "Terjadi kesalahan pada server",
    });
  }
}

module.exports = { getRoadmapRecommendations, updateSkillLevel, autoUpdateRoadmap };
