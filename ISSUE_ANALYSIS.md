# Roadmap Assignment Issue Analysis

## Problem Summary
User asked for **"Mobile Roadmap"** but received **"Front-End Web Developer"** roadmap instead.

## Root Cause Analysis

### 1. **Current Logic Flow** (lines 507-523 in handler.py)
```python
kb_result = kb_based_roadmap(job_text)

if kb_result and kb_result.get("subskills"):
    base = kb_result
    job_role = kb_result.get("job_role", "Recommended Role")
else:
    inferred = infer_job_role_from_text(job_text)
    canonical = inferred.get("canonical")
    job_role = inferred.get("job_role") or "Recommended Role"

    if canonical:
        base = generate_base_roadmap(canonical, course_rows, tutorial_rows)
    else:
        # FALLBACK TO FRONT-END! ⚠️
        fallback = load_canonical_roadmap("front_end_v1.json")
        base = generate_base_roadmap(fallback, course_rows, tutorial_rows)
```

### 2. **What Happened With "Mobile Roadmap"**
1. `kb_based_roadmap("Mobile Roadmap")` was called
2. KB doesn't have enough matching "mobile" content → returns empty/insufficient subskills
3. Falls through to `infer_job_role_from_text("Mobile Roadmap")`
4. This function searches for JSON files in `roadmap/` folder
5. **Current roadmaps available**: Only `front_end_v1.json` exists
6. Function can't match "Mobile" to anything → returns `score: 0`
7. **Falls back to hardcoded Front-End JSON** ❌

### 3. **Why This Happened**
- **Only one canonical roadmap exists**: `front_end_v1.json`
- **Missing roadmaps**: Android/Mobile, Backend, Full-Stack, etc.
- **No job role matching**: When user says "Mobile", system finds 0 matching canonical roadmaps
- **Fallback behavior is hardcoded**: Always falls back to Front-End when no match found

---

## Solution Options

### **Option A: Create More Canonical Roadmaps** (Recommended for now)
**Complexity**: Low | **Time**: ~2-3 hours for 2-3 roadmaps
- Create `mobile_android_v1.json` (Android/Mobile Developer)
- Create `backend_v1.json` (Backend Developer)
- Follow same structure as `front_end_v1.json`
- Job description matching becomes exact

**Pros:**
- Works with existing infrastructure (no code changes)
- Fast to implement
- Pattern-based, easy to add more later
- Best control over skill definitions

**Cons:**
- Manual maintenance required for each new role
- Doesn't scale beyond ~5-10 roles

---

### **Option B: Use KB-Based Roadmaps Primarily** (More scalable)
**Complexity**: Medium | **Time**: ~1-2 hours
- Make KB the primary roadmap source (not fallback)
- Parse KB's "learning_path" entries as job roles
- Generate subskills dynamically from KB entries

**Implementation:**
```python
# Current priority (wrong):
# 1. Try KB-based roadmap
# 2. Fall back to canonical JSON

# Better priority:
# 1. Try canonical JSON first (user-defined roles)
# 2. Fall back to KB-based roadmap (dynamic)
```

**Pros:**
- Scales infinitely with KB content
- No manual roadmap creation needed
- More flexible/adaptive

**Cons:**
- Requires good KB data (must have learning_path entries)
- Less predictable skill definitions
- KB quality directly impacts output

---

### **Option C: Hybrid Approach** (Best for MVP) ⭐
**Complexity**: Low | **Time**: ~1 hour
- Keep canonical JSONs for known roles
- Use KB as true fallback when no canonical match
- **Change fallback logic**: Instead of always Front-End, generate from KB

**Implementation:**
1. Create `mobile_android_v1.json` (20 minutes)
2. Fix fallback logic in `handle_job_description_flow()` (20 minutes)
3. When no canonical match → use KB-based roadmap instead of Front-End

**Code change needed:**
```python
# BEFORE (line 522):
if canonical:
    base = generate_base_roadmap(canonical, course_rows, tutorial_rows)
else:
    fallback = load_canonical_roadmap("front_end_v1.json")  # ❌ Hardcoded
    base = generate_base_roadmap(fallback, course_rows, tutorial_rows)

# AFTER:
if canonical:
    base = generate_base_roadmap(canonical, course_rows, tutorial_rows)
else:
    # Use KB-based roadmap as true fallback (dynamic)
    kb_fallback = kb_based_roadmap(job_text)
    if kb_fallback.get("subskills"):
        base = kb_fallback
    else:
        # Only if KB also fails
        fallback = load_canonical_roadmap("front_end_v1.json")
        base = generate_base_roadmap(fallback, course_rows, tutorial_rows)
```

---

## Using Minimum Approach with Each Option

### Option A (Canonical JSON): ✅ Yes
- Progress tracking: Simple 70%/90% thresholds (already implemented)
- Already integrated with current code

### Option B (KB-only): ✅ Yes
- Progress tracking: Same 70%/90% thresholds work
- Adaptive functions don't care if roadmap is from KB or JSON
- No changes needed to `update_skill_progress_from_courses()` or `auto_assess_skill_level_from_progress()`

### Option C (Hybrid): ✅ Yes
- Works with both sources transparently
- Progress tracking continues to work unchanged

---

## Why Adaptive Functions Are Already Compatible

Your `update_skill_progress_from_courses()` and `auto_assess_skill_level_from_progress()` functions are **source-agnostic**:

1. They work on `profile["roadmap_progress"]` structure
2. That structure is the same whether built from JSON or KB
3. `progress_percent` field is initialized the same way
4. Thresholds (70%/90%) apply regardless of source

So switching to KB-based fallback requires **zero changes** to adaptive logic.

---

## Recommendation

**Go with Option C (Hybrid)** because:
1. ✅ Keeps your current infrastructure working
2. ✅ Enables "Mobile" roadmap immediately (create JSON)
3. ✅ Enables unlimited future roles via KB (no code needed)
4. ✅ Minimum effort (~1 hour)
5. ✅ Works perfectly with your adaptive 70%/90% thresholds
6. ✅ Can be progressively enhanced

**Implementation priority:**
1. Create `mobile_android_v1.json` (copy Front-End, modify skills for Android)
2. Fix fallback to use KB instead of hardcoded Front-End
3. Test with "Mobile" → should work immediately

---

## Data Files Needed (If using Option A or C)

For `mobile_android_v1.json`, you'd need structure like:
```json
{
  "job_role": "Mobile Android Developer",
  "subskills": [
    {
      "id": "java_kotlin_basics",
      "name": "Java/Kotlin Fundamentals",
      "keywords": ["java", "kotlin", "oop", "android studio"],
      "mapped_courses": {
        "beginner": ["android_course_1"],
        "intermediate": ["android_course_2"],
        "advanced": ["android_course_3"]
      }
    },
    ...
  ]
}
```

The user profile you showed has course: `"Belajar Membangun Aplikasi Android Native Bagian I"` (Android course!), so this roadmap makes sense.

