# User Profile Modification Analysis

## User Profile Structure

Based on the sample profile (`b64852a0-24a2-4731-830b-9314db2b13ca.json`), the user profile has the following structure:

```json
{
  "user_id": "string",
  "platform_data": {
    "name": "string",
    "email": "string",
    "active_courses": ["array of course names"],
    "active_tutorials": 0,
    "completed_tutorials": 0,
    "is_graduated": 0,
    "exam_score": "",
    "submission_rating": "",
    "course_progress": {
      "course_name": 0-100
    }
  },
  "learning_profile": {
    "goals": [],
    "skills": {},
    "weaknesses": [],
    "strengths": [],
    "current_focus": {
      "course": "string",
      "module": 0
    },
    "learning_style": null,
    "progress_score": {},
    "history": []
  },
  "created_at": "ISO timestamp",
  "updated_at": "Unix timestamp",
  "progress_history": [
    {
      "timestamp": "Unix timestamp",
      "course_progress": {}
    }
  ],
  "roadmap_progress": {
    "job_role": "string",
    "created_at": "Unix timestamp",
    "last_updated": "Unix timestamp",
    "skills_status": {
      "skill_id": {
        "level": "Beginner|Intermediate|Advanced",
        "status": "not_started|in_progress|completed",
        "assessed_at": "Unix timestamp",
        "progress_percent": 0-100
      }
    }
  }
}
```

---

## All Functions That Modify User Profiles

### 1. **Core Save Function**
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `save_json(path: str, data: Any)`
- **Line:** 20-24
- **What it does:** Atomic write to JSON file (writes to `.tmp` then replaces)
- **Used by:** All profile modification functions

---

### 2. **Profile Loading**
**File:** `backend_ml/app/handler.py`
- **Function:** `load_user_profile(user_id: str)`
- **Line:** 151-173
- **What it does:** Loads profile from `user_profiles/{user_id}.json`
- **Does NOT modify:** Only reads

---

### 3. **Roadmap Initialization & Updates**

#### 3.1. Job Description Flow (Creates/Updates Roadmap)
**File:** `backend_ml/app/handler.py`
- **Function:** `handle_job_description_flow(user_id: str, job_text: str)`
- **Line:** 500-628
- **Modifies:**
  - `profile["roadmap_progress"]` - Creates entire roadmap structure
  - `profile["roadmap_progress"]["job_role"]`
  - `profile["roadmap_progress"]["skills_status"]` - Initializes all skills
  - `profile["roadmap_progress"]["created_at"]`
  - `profile["roadmap_progress"]["last_updated"]`
- **Calls:** `update_skill_progress_from_courses()`, `auto_assess_skill_level_from_progress()`
- **Saves:** Line 609

#### 3.2. Update Skill Progress from Courses
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `update_skill_progress_from_courses(profile: Dict, canonical_roadmap: Dict)`
- **Line:** 294-338
- **Modifies:**
  - `roadmap["skills_status"][skill_id]["progress_percent"]` - Updates based on course progress
  - `roadmap["last_updated"]`
- **Does NOT save:** Returns updated roadmap (caller must save)

#### 3.3. Auto-Assess Skill Level from Progress
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `auto_assess_skill_level_from_progress(profile: Dict)`
- **Line:** 399-440
- **Modifies:**
  - `roadmap["skills_status"][skill_id]["level"]` - Auto-assesses Beginner/Intermediate/Advanced
  - `roadmap["skills_status"][skill_id]["status"]` - Updates not_started/in_progress/completed
  - `roadmap["skills_status"][skill_id]["assessed_at"]`
  - `roadmap["last_updated"]`
- **Does NOT save:** Returns updated roadmap (caller must save)

#### 3.4. Manual Skill Assessment Update
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `update_skill_assessment(user_id: str, subskill_id: str, level: str)`
- **Line:** 345-396
- **Modifies:**
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["level"]`
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["status"]`
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["assessed_at"]`
  - `profile["roadmap_progress"]["last_updated"]`
- **Saves:** Line 394

#### 3.5. Mark Skill Completed
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `mark_skill_completed(user_id: str, subskill_id: str)`
- **Line:** 443-459
- **Modifies:**
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["status"]` → "completed"
  - `profile["roadmap_progress"]["last_updated"]`
- **Saves:** Line 458

#### 3.6. Update Roadmap Skill Level
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `update_roadmap_skill_level(user_id: str, subskill_id: str, new_level: str, notes: str)`
- **Line:** 687-742
- **Modifies:**
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["level"]`
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["status"]`
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["assessed_at"]`
  - `profile["roadmap_progress"]["skills_status"][subskill_id]["notes"]`
  - `profile["roadmap_progress"]["last_updated"]`
- **Saves:** Line 737

#### 3.7. Auto-Update Roadmap from Progress
**File:** `backend_ml/app/roadmap_engine.py`
- **Function:** `auto_update_roadmap_from_progress(user_id: str, course_rows: List)`
- **Line:** 745-809
- **Modifies:**
  - `profile["roadmap_progress"]["skills_status"][skill_id]["level"]` - For all skills
  - `profile["roadmap_progress"]["skills_status"][skill_id]["status"]`
  - `profile["roadmap_progress"]["skills_status"][skill_id]["assessed_at"]`
  - `profile["roadmap_progress"]["last_updated"]`
- **Saves:** Line 804

---

### 4. **Learning Profile Updates**

#### 4.1. Update Current Focus (Course/Module)
**File:** `backend_ml/app/handler.py`
- **Function:** `update_current_focus(user_id: str, text: str, profile: Dict)`
- **Line:** 1135-1168
- **Modifies:**
  - `profile["learning_profile"]["current_focus"]["module"]` - Extracts from user text
  - `profile["learning_profile"]["current_focus"]["course"]` - Updates based on active_courses
  - `profile["updated_at"]`
- **Saves:** Line 1166

#### 4.2. Extract and Update Skills
**File:** `backend_ml/app/handler.py`
- **Function:** `extract_and_update_skills(user_id: str, response_text: str, profile: Dict)`
- **Line:** 1171-1239
- **Modifies:**
  - `profile["learning_profile"]["skills"][skill_name]` - Updates skill levels from LLM response
  - `profile["updated_at"]`
- **Saves:** Line 1237
- **Note:** Only updates skills that already exist in profile (safety check)

#### 4.3. Goal Definition (Profiling)
**File:** `backend_ml/app/handler.py`
- **Function:** `handle_query()` - Goal extraction section
- **Line:** 911-945
- **Modifies:**
  - `profile["learning_profile"]["goals"]` - Extracts roles from user text
  - `profile["learning_profile"]["target_skills"]` - Extracts skills from user text
  - `profile["updated_at"]`
- **Saves:** Line 935

#### 4.4. Mark Profile as Profiled
**File:** `backend_ml/app/handler.py`
- **Function:** `handle_query()` - Profiling marker
- **Line:** 896-900
- **Modifies:**
  - `profile["learning_profile"]["_profiled"]` → `True`
- **Saves:** Line 898

---

### 5. **Progress Tracking**

#### 5.1. Ensure Course Progress Exists
**File:** `backend_ml/app/handler.py`
- **Function:** `ensure_course_progress(profile: Dict)`
- **Line:** 1347-1354
- **Modifies:**
  - `profile["platform_data"]["course_progress"]` - Initializes with 0 for all active_courses if missing
- **Does NOT save:** Returns modified profile (caller must save)

#### 5.2. Save Progress Snapshot
**File:** `backend_ml/app/handler.py`
- **Function:** `save_progress_snapshot(user_id: str, profile: Dict)`
- **Line:** 1319-1330
- **Modifies:**
  - `profile["progress_history"]` - Appends new snapshot if course_progress changed
- **Saves:** Line 1330

#### 5.3. Map Course Delta to Subskills
**File:** `backend_ml/app/handler.py`
- **Function:** `map_course_delta_to_subskills(delta_map: Dict, roadmap: Dict)`
- **Line:** 1342-1345
- **Modifies:**
  - `roadmap["subskills"][i]["delta"]` - Calculates progress delta per subskill
- **Does NOT save:** Modifies roadmap dict in memory

---

### 6. **Main Query Handler (Multiple Updates)**
**File:** `backend_ml/app/handler.py`
- **Function:** `handle_query(user_id: str, text: str, ...)`
- **Line:** 716-1101
- **Modifies profile in multiple places:**
  - Line 746-748: Ensures course_progress exists, saves
  - Line 750: Saves progress snapshot
  - Line 752-758: Maps course deltas to subskills, saves
  - Line 897-898: Marks profile as profiled, saves
  - Line 932-935: Updates goals and target_skills, saves
  - Line 1050: Calls `extract_and_update_skills()` (saves internally)
  - Line 1058: Calls `update_current_focus()` (saves internally)

---

## API Endpoints That Modify Profiles

**File:** `backend_ml/main.py`

1. **POST `/chat`** (Line 56-82)
   - Calls `handle_query()` or `handle_job_description_flow()`
   - **Modifies:** Multiple profile fields (see above)

2. **POST `/roadmap/auto-update`** (Line 85-93)
   - Calls `auto_update_roadmap_from_progress()`
   - **Modifies:** `roadmap_progress["skills_status"]` for all skills

3. **POST `/roadmap/update-skill`** (Line 96-105)
   - Calls `update_roadmap_skill_level()`
   - **Modifies:** Single skill in `roadmap_progress["skills_status"]`

---

## Summary of All Profile Modification Points

### Direct File Writes (save_json calls):
1. `handler.py:748` - After ensuring course_progress
2. `handler.py:758` - After mapping course deltas
3. `handler.py:898` - After marking as profiled
4. `handler.py:935` - After goal extraction
5. `handler.py:1166` - After updating current_focus
6. `handler.py:1237` - After extracting/updating skills
7. `handler.py:1330` - After saving progress snapshot
8. `handler.py:609` - After job description flow (roadmap creation)
9. `roadmap_engine.py:394` - After manual skill assessment
10. `roadmap_engine.py:458` - After marking skill completed
11. `roadmap_engine.py:737` - After updating roadmap skill level
12. `roadmap_engine.py:804` - After auto-updating roadmap from progress

### Profile Fields Modified:
- `platform_data.course_progress` - Course completion percentages
- `platform_data.active_courses` - (Read-only, set externally)
- `learning_profile.goals` - User learning goals
- `learning_profile.target_skills` - Target skills
- `learning_profile.skills` - Skill assessments
- `learning_profile.current_focus` - Current course/module
- `learning_profile._profiled` - Profiling flag
- `roadmap_progress.*` - Entire roadmap structure
- `progress_history` - Historical progress snapshots
- `updated_at` - Timestamp

---

## Is Switching to Backend Database the Right Step?

### ✅ **YES, it's the right step!** Here's why:

#### Current Issues with File-Based Storage:
1. **No Concurrency Control:** Multiple requests can overwrite each other
2. **No Transactions:** Partial updates can corrupt data
3. **No Querying:** Can't efficiently search/filter users
4. **No Relationships:** Can't link profiles to other entities
5. **Scalability:** File I/O doesn't scale well
6. **Backup/Recovery:** Harder to manage than database backups
7. **Atomic Operations:** `save_json()` uses temp files but still risky under load

#### Benefits of Database Migration:
1. **ACID Transactions:** Ensures data consistency
2. **Concurrency:** Database handles concurrent writes safely
3. **Querying:** Easy to find users, aggregate data, generate reports
4. **Relationships:** Can link profiles to courses, assessments, etc.
5. **Performance:** Indexed queries are much faster
6. **Backup:** Standard database backup tools
7. **Audit Trail:** Can track all changes with timestamps
8. **Scalability:** Databases are designed for production workloads

#### Recommended Database Schema:
```sql
-- User Profiles Table
CREATE TABLE user_profiles (
    user_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    -- JSON columns for complex nested data (PostgreSQL/MySQL 5.7+)
    platform_data JSON,
    learning_profile JSON,
    roadmap_progress JSON,
    progress_history JSON
);

-- Or normalized approach:
CREATE TABLE user_profiles (
    user_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE course_progress (
    user_id VARCHAR,
    course_name VARCHAR,
    progress_percent INT,
    PRIMARY KEY (user_id, course_name)
);

CREATE TABLE roadmap_skills (
    user_id VARCHAR,
    skill_id VARCHAR,
    level VARCHAR,
    status VARCHAR,
    progress_percent INT,
    assessed_at TIMESTAMP,
    PRIMARY KEY (user_id, skill_id)
);
```

#### Migration Strategy:
1. **Phase 1:** Keep file-based as fallback, add database writes in parallel
2. **Phase 2:** Read from database, write to both (dual-write)
3. **Phase 3:** Read/write only from database, remove file code
4. **Phase 4:** Migrate existing profiles from files to database

#### Code Changes Needed:
- Replace `load_user_profile()` to read from DB
- Replace `save_json()` calls with database UPDATE/INSERT
- Add connection pooling
- Add transaction management
- Consider using an ORM (SQLAlchemy, Prisma, etc.)

---

## Conclusion

**Switching to a backend database is highly recommended** for production use. The current file-based system works for development but has significant limitations for a production chatbot service. The migration will require refactoring the save/load functions but will provide much better reliability, performance, and scalability.

