# Adaptive Roadmap System - Implementation Guide

## Overview

The adaptive roadmap system enables:
1. **Job Description Analysis** — Extract job role from free-form job descriptions
2. **Multi-layer Personalization** — Cross-check user skills, assess sub-skill levels (Beginner/Intermediate/Advanced)
3. **Personalized Learning Roadmaps** — Generate 6+ sub-skills per job role with course recommendations
4. **Progress Tracking** — Automatically update skill levels as users complete courses
5. **Adaptive Recommendations** — Suggest next steps based on current progress

---

## Architecture

### Backend Components

**Model Backend (Python/FastAPI)** — `backend_ml/`
- `app/handler.py` — Core chat handler + job-description flow
- `app/roadmap_engine.py` — Roadmap generation, assessment, and adaptive updates
- `main.py` — FastAPI app with roadmap endpoints

**Web Backend (Node.js/Express)** — `backend/`
- `controllers/roadmap-controller.js` — API handlers for roadmap operations
- `app.js` — Routes to expose roadmap endpoints

---

## API Endpoints

### Chat Endpoints

#### POST `/chat`
General chat interface (existing).
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What course should I take next?"}'
```

#### POST `/chat/job`
Request personalized roadmap from a job description.
```bash
curl -X POST http://localhost:3000/chat/job \
  -H "Content-Type: application/json" \
  -d '{"message": "Looking for a Frontend Web Developer role. Need HTML, CSS, React skills."}'
```

### Roadmap Endpoints

#### GET `/api/roadmap/recommendations`
Fetch adaptive recommendations based on current progress.
```bash
curl -X GET http://localhost:3000/api/roadmap/recommendations \
  -H "Cookie: sid=<session_id>"
```

**Response Example:**
```json
{
  "ok": true,
  "recommendations": {
    "job_role": "Frontend Web Developer",
    "completed_skills": [
      {"id": "html_css", "name": "HTML & CSS Fundamentals", "level": "Advanced"}
    ],
    "in_progress_skills": [
      {"id": "javascript_basics", "name": "JavaScript Basics", "level": "Intermediate"}
    ],
    "not_started_skills": [
      {"id": "react_fundamentals", "name": "React Fundamentals", "level": null}
    ],
    "recommended_next_skill": {"id": "javascript_basics", "name": "JavaScript Basics", "level": "Intermediate"},
    "total_progress_percent": 33
  }
}
```

#### POST `/api/roadmap/update-skill`
Manually update a specific skill's level (e.g., after a user self-assessment).
```bash
curl -X POST http://localhost:3000/api/roadmap/update-skill \
  -H "Content-Type: application/json" \
  -d '{
    "subskill_id": "html_css",
    "level": "Advanced",
    "notes": "Completed advanced CSS course"
  }' \
  -H "Cookie: sid=<session_id>"
```

#### POST `/api/roadmap/auto-update`
Automatically update all skills based on current course progress in user's profile.
```bash
curl -X POST http://localhost:3000/api/roadmap/auto-update \
  -H "Content-Type: application/json" \
  -d '{"message": "auto"}' \
  -H "Cookie: sid=<session_id>"
```

---

## Data Model

### User Profile Structure

```json
{
  "user_id": "uuid",
  "platform_data": {
    "name": "User Name",
    "active_courses": ["Course 1", "Course 2"],
    "course_progress": {
      "course_id_1": 75,
      "course_id_2": 30
    },
    "progress_history": [
      {
        "timestamp": 1702000000,
        "course_progress": { "course_id_1": 50, "course_id_2": 0 }
      }
    ]
  },
  "learning_profile": {
    "goals": ["Become a Frontend Developer"],
    "skills": { "HTML": "Intermediate", "CSS": "Beginner" },
    "weaknesses": ["JavaScript"],
    "strengths": ["CSS Design"]
  },
  "roadmap_progress": {
    "job_role": "Frontend Web Developer",
    "created_at": 1702000000,
    "last_updated": 1702100000,
    "skills_status": {
      "html_css": {
        "level": "Advanced",
        "status": "completed",
        "assessed_at": 1702100000,
        "notes": "Completed HTML/CSS course"
      },
      "javascript": {
        "level": "Intermediate",
        "status": "in_progress",
        "assessed_at": 1702050000
      }
    },
    "meta": {
      "filename": "front_end_v1.json",
      "generated_from_job_text": true
    }
  }
}
```

### Roadmap JSON Structure (e.g., `front_end_v1.json`)

```json
{
  "job_role": "Frontend Web Developer",
  "version": "1.0",
  "subskills": [
    {
      "id": "html_css",
      "name": "HTML & CSS Fundamentals",
      "keywords": ["html", "css", "web design"],
      "mapped_courses": ["course_1", "course_2"],
      "description": "Master HTML5 and CSS3 for web development"
    }
  ]
}
```

---

## Workflow Examples

### Example 1: Job Description → Roadmap

**User Input:**
```
"I want to become a Frontend Developer. I need to learn React, TypeScript, and responsive design."
```

**System Flow:**
1. `POST /chat/job` with the job description
2. `infer_job_role_from_text()` matches it to "Frontend Web Developer"
3. `handle_job_description_flow()` generates a roadmap with 6+ subskills
4. Each subskill is assessed based on user's current course progress
5. `next_step` recommendations are generated for each skill
6. Roadmap is persisted in user profile
7. Response includes `job_role`, `subskills`, `summary`, and `metadata`

**Example Response:**
```json
{
  "job_role": "Frontend Web Developer",
  "subskills": [
    {
      "id": "html_css",
      "name": "HTML & CSS Fundamentals",
      "level": "Beginner",
      "mapped_course_names": ["Belajar HTML & CSS"],
      "next_step": "Mulai dengan kursus 'Belajar HTML & CSS' dan fokus pada konsep dasar HTML & CSS."
    }
  ],
  "summary": "Rekomendasi peran: Frontend Web Developer\n- HTML & CSS Fundamentals: Beginner → Mulai dengan kursus 'Belajar HTML & CSS'...",
  "meta": {
    "generated_from_job_text": true,
    "filename": "front_end_v1.json"
  }
}
```

### Example 2: Progress Tracking & Auto-Update

**User completes courses:**
- Course 1 (HTML & CSS): 75% → 100%
- Course 2 (JavaScript): 0% → 60%

**System Detects Change:**
1. `POST /api/roadmap/auto-update` is called (manually or by a scheduled task)
2. `auto_update_roadmap_from_progress()` compares old vs. new progress
3. HTML & CSS skill is upgraded: `Beginner` → `Advanced`
4. JavaScript skill is upgraded: `null` → `Intermediate`
5. Profile is updated with new timestamps and statuses
6. Response confirms changes and returns updated roadmap

### Example 3: Answer Progress Questions

**User asks:**
```
"What skill have I developed the most this week?"
```

**System Flow:**
1. Chat handler detects `progress_keywords` in query
2. Calls `answer_progress_question()` instead of LLM
3. Compares `progress_history[-2]` vs. `progress_history[-1]`
4. Computes deltas for all courses
5. Returns max improvement course name and delta

**Example Response:**
```
"Skill yang paling berkembang baru-baru ini adalah 'Belajar JavaScript' dengan peningkatan 30 poin persentase."
```

---

## Setup & Configuration

### Environment Variables

**`backend/.env`**
```env
BOT_API_URL=http://localhost:8000/chat
SESSION_SECRET=your-secret-key
PORT=3000
```

**`backend_ml/.env`**
```env
GROQ_API_KEY=your-groq-api-key
SBERT_MODEL_PATH=path/to/sbert/model
MODEL_API_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5500
```

### Running the System

**Terminal 1: Start Model Backend**
```bash
cd backend_ml
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2: Start Web Backend**
```bash
cd backend
npm install
node app.js
```

**Terminal 3 (Optional): Test Endpoints**
```bash
# Test job-description flow
curl -X POST http://localhost:3000/chat/job \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to learn Frontend Development"}'

# Get recommendations
curl -X GET http://localhost:3000/api/roadmap/recommendations \
  -H "Cookie: sid=<your-session-id>"
```

---

## Customization & Extension

### Adding New Roadmap JSON Files

Place canonical roadmap files in `backend_ml/app/roadmap/`:
```
ai_engineer_v1.json
backend_developer_v1.json
mobile_developer_v1.json
...
```

The system will automatically match job descriptions to the best-fitting roadmap.

### Adjusting Assessment Rules

Modify `assess_subskill_level()` in `roadmap_engine.py` to change thresholds:
```python
def assess_subskill_level(user_progress: Dict[str, int], mapped_course_ids: List[str]) -> str:
    # Current: 80%+ = Advanced, 40%+ = Intermediate
    # Customize these thresholds as needed
```

### Improving Job Role Inference

Current method: keyword-based matching. For higher accuracy, use embeddings:
```python
# Use SBERT embeddings to match job description to roadmap titles
q_emb = _model.encode([job_text], normalize_embeddings=True)
# Compare with cached embeddings of all roadmap titles
```

---

## Troubleshooting

### Roadmap Not Persisting

**Check:**
- User profile file exists at `backend_ml/app/user_profiles/{user_id}.json`
- Ensure no JSON corruption; validate with Python: `json.load(open(path))`
- Check file permissions; ensure write access

### Auto-update Not Working

**Check:**
- `course_progress` dict in user profile has correct course IDs
- Canonical roadmap `mapped_courses` IDs match the course IDs
- Run `POST /api/roadmap/auto-update` manually; check logs for errors

### Job Description Matching Wrong Roadmap

**Check:**
- Ensure roadmap JSON files are in `backend_ml/app/roadmap/`
- Verify `job_role` field in each roadmap JSON
- Test keyword overlap in `roadmap_engine.py::infer_job_role_from_text()`

---

## Future Enhancements

1. **Embedding-based Job Matching** — Use SBERT to match job descriptions more accurately
2. **LLM-powered Assessments** — Use Groq LLM to quiz users on sub-skills
3. **Social Learning** — Track peer progress and suggest study groups
4. **Gamification** — Add badges, streaks, and milestones
5. **Mobile App** — Build React Native app to visualize roadmaps on mobile
6. **Integration with Dicoding API** — Auto-sync actual course progress

---

## Support

For issues or questions, check:
- Model backend logs: `backend_ml/app/logger.py` output
- Web backend logs: Node.js console output
- User profile JSON: `backend_ml/app/user_profiles/{user_id}.json`
