const express = require('express');
const app = express();
app.use(express.json());

app.post('/chat', (req, res) => {
  console.log('Mock model received:', req.body);
  const userId = req.body.user_id || 'unknown';
  const text = req.body.text || req.body.message || '';

  // Simple mock reply and profile_update
  const reply = `Mock reply to: ${text}`;
  const profile_update = {
    learning_profile: {
      history: [
        {
          query: text,
          response: reply,
          timestamp: new Date().toISOString(),
          intent: { mode: 'mock' }
        }
      ]
    }
  };

  res.json({ ok: true, type: 'chat', response: reply, profile_update });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Mock model server listening on ${port}`));
