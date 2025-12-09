# Root Cause: Front-End Roadmap Being Saved Instead of Mobile

## Problem Summary
- User asks: "I want a Mobile roadmap"
- Chat responds with: "Mobile Android Developer" roadmap ✅ (correct)
- User profile saves: "Front-End Web Developer" roadmap ❌ (WRONG!)
- Inconsistency between what LLM returns vs what gets saved

## Root Cause Analysis

### The Call Chain (Traced)

```
handle_query(text="I want Mobile roadmap")
    ↓
intent == "job_role" detected
    ↓
handle_job_description_flow(user_id, text)  ← Line 996 in handler.py
    ↓
base = kb_based_roadmap(text)  ← Returns {job_role: "Mobile Android Developer", subskills: [6 Android courses]}
    ↓
Line 589 (OLD CODE - BROKEN):
    roadmap_progress = initialize_roadmap_progress(user_id, base.get("job_role", job_role))
    ↓
initialize_roadmap_progress() called with job_role = "Mobile Android Developer"
    ↓
try to find canonical JSON:
    - "mobile_android_developer_v1_enhanced.json" ❌ doesn't exist
    - "mobile_android_developer_v1.json" ❌ doesn't exist  
    - "mobile_android_developer.json" ❌ doesn't exist
    ↓
All fail → Falls back to neutral_defaults (LINE 263-271 in roadmap_engine.py):
    - "front_end_v1.json" ✅ FOUND! → LOADS THIS
    ↓
result = {job_role: "Front-End Web Developer", subskills: [6 Front-End skills]}
    ↓
Saved to profile ← WRONG ROADMAP!
```

### Why This Happened

**File:** `roadmap_engine.py` lines 263-271
```python
if canonical is None:
    # optional: try a neutral default if you have one, otherwise raise
    neutral_defaults = ["front_end_v1.json", "ai_engineer_v1.json"]
    for nd in neutral_defaults:
        try:
            canonical = load_canonical_roadmap(nd)
            break  # ← STOPS HERE, uses Front-End!
        except FileNotFoundError:
            continue
```

**Why it's a problem:**
- `initialize_roadmap_progress()` was designed for **canonical JSON roadmaps**
- It searches for a JSON file matching the job_role
- KB-generated job roles (from embeddings) will **never match JSON filenames**
- Result: Always falls back to hardcoded "front_end_v1.json"

---

## The Fix

### Root Issue: Using Wrong Function

**OLD (Broken) Code - Line 589:**
```python
# This IGNORES the base roadmap data we just built!
roadmap_progress = initialize_roadmap_progress(user_id, base.get("job_role", job_role))
```

Problem: `initialize_roadmap_progress()` throws away `base` and loads from JSON files instead.

**NEW (Fixed) Code - Lines 587-600:**
```python
# Build roadmap_progress structure from base roadmap (KB or canonical)
# IMPORTANT: Use base directly, don't call initialize_roadmap_progress()
# because it tries to load from JSON files and may override KB-generated data
roadmap_progress = {
    "job_role": base.get("job_role", job_role),
    "created_at": time.time(),
    "last_updated": time.time(),
    "skills_status": {s.get("id"): {
        "level": s.get("level"), 
        "status": "in_progress", 
        "assessed_at": time.time(),
        "progress_percent": 0
    } for s in base.get("subskills", [])}
}
```

Solution: **Use the `base` roadmap directly** (whether from KB or canonical JSON).

---

## Why This Fix Works

### Scenario 1: KB-Generated Roadmap (Normal case now)
```
User: "Mobile Developer"
    ↓
KB generates: {job_role: "Mobile Android Developer", subskills: [Android courses]}
    ↓
NEW CODE: Takes base directly
    ↓
Saves: {job_role: "Mobile Android Developer", ...} ✅ CORRECT
```

### Scenario 2: Canonical JSON Fallback (Rare case)
```
User: "Unknown Role"
    ↓
KB fails (< 3 subskills)
    ↓
Canonical fallback found: front_end_v1.json
    ↓
base = generate_base_roadmap(front_end_v1.json)
    ↓
NEW CODE: Takes base directly
    ↓
Saves: {job_role: "Front-End Web Developer", ...} ✅ STILL CORRECT
```

### Key Difference
- **OLD**: Always loads from JSON files → Always overwrites with Front-End
- **NEW**: Uses what we built (KB or canonical) → Respects the source

---

## Impact of Fix

### Before Fix
```json
{
  "chat_response": "Mobile Android Developer roadmap with Kotlin, Android Studio, Firebase",
  "user_profile.roadmap_progress.job_role": "Front-End Web Developer",
  "consistency": ❌ BROKEN
}
```

### After Fix
```json
{
  "chat_response": "Mobile Android Developer roadmap with Kotlin, Android Studio, Firebase",
  "user_profile.roadmap_progress.job_role": "Mobile Android Developer",
  "consistency": ✅ FIXED
}
```

---

## Code Changes

### File: `d:\Coding (PROJECT)\CAPSTONE\chatbot-ai\backend_ml\app\handler.py`

**Lines 587-600 (was 587-604):**

Removed:
```python
# OLD: try-catch with initialize_roadmap_progress
try:
    roadmap_progress = initialize_roadmap_progress(user_id, base.get("job_role", job_role))
except Exception:
    # fallback simple structure
    roadmap_progress = {...}
```

Added:
```python
# NEW: Use base directly, no function call
roadmap_progress = {
    "job_role": base.get("job_role", job_role),
    "created_at": time.time(),
    "last_updated": time.time(),
    "skills_status": {s.get("id"): {...} for s in base.get("subskills", [])}
}
```

---

## Why This Is Minimal

- ✅ 1 function call removed (`initialize_roadmap_progress()`)
- ✅ Data construction moved inline (simple, clear)
- ✅ No new dependencies
- ✅ Identical structure output
- ✅ Works with both KB and canonical sources
- ✅ Adaptive thresholds (70%/90%) unaffected

---

## Test Verification

### Before Fix
```
User Profile After "Mobile" Request:
{
  "roadmap_progress": {
    "job_role": "Front-End Web Developer",  ❌ WRONG
    "skills_status": {
      "html_css_fundamentals": {...},
      "javascript_basics": {...},
      ...
    }
  }
}
```

### After Fix (Expected)
```
User Profile After "Mobile" Request:
{
  "roadmap_progress": {
    "job_role": "Mobile Android Developer",  ✅ CORRECT
    "skills_status": {
      "skill_kb_0": {"name": "Android course 1", ...},
      "skill_kb_1": {"name": "Android course 2", ...},
      ...
    }
  }
}
```

---

## Related Components (Untouched)

These still work correctly:
- ✅ `update_skill_progress_from_courses()` - works on any roadmap
- ✅ `auto_assess_skill_level_from_progress()` - works on any roadmap
- ✅ `kb_based_roadmap()` - generates correct Mobile roadmap
- ✅ Adaptive thresholds (70%/90%) - applies to any roadmap

---

## Summary

**Root Cause:** Called `initialize_roadmap_progress()` which ignored KB data and loaded from JSON files, falling back to hardcoded Front-End.

**Fix:** Use the `base` roadmap directly instead of trying to load from JSON.

**Result:** Mobile roadmap saved correctly to profile, matching what chat returns. ✅
