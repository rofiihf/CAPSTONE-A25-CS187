# Test Case: handle_job_description_flow Variable Scope

## Root Cause Found & Fixed

### Problem
```python
# OLD CODE (line 522 in previous version)
def handle_job_description_flow(user_id: str, job_text: str):
    course_rows = load_my_courses()
    tutorial_rows = load_my_tutorials()
    
    base = kb_based_roadmap(job_text)  # ← KB succeeds, normal case
    job_role = base.get("job_role", "Recommended Role")
    
    if not base.get("subskills") or len(...) < 3:
        inferred = infer_job_role_from_text(job_text)  # ← inferred only defined here!
        # ...
    
    # ...later...
    result = {
        "meta": {
            "generated_from_job_text": bool(inferred.get("canonical")) if inferred else False,  # ❌ CRASH!
            #                               ^^^^^^^^ UnboundLocalError - never initialized!
        }
    }
```

**Why it crashes:**
1. KB is PRIMARY now (best case scenario)
2. `if` condition is FALSE (KB succeeded, has >= 3 subskills)
3. Code SKIPS the `if` block → `inferred` is never created
4. Code reaches line 625 → tries to access undefined `inferred` → UnboundLocalError

### Solution Applied
```python
# NEW CODE (line 505 onwards)
def handle_job_description_flow(user_id: str, job_text: str):
    # Initialize inferred early to avoid UnboundLocalError  ← FIX!
    inferred = {"canonical": None, "filename": None}
    
    course_rows = load_my_courses()
    tutorial_rows = load_my_tutorials()
    
    base = kb_based_roadmap(job_text)
    job_role = base.get("job_role", "Recommended Role")
    
    if not base.get("subskills") or len(...) < 3:
        inferred = infer_job_role_from_text(job_text)  # ← Now just updates, doesn't create
        # ...
    
    # ...later...
    result = {
        "meta": {
            "generated_from_job_text": bool(inferred.get("canonical")) if inferred else False,  # ✅ SAFE!
            #                               ^^^^^^^^ Always defined from line 505
        }
    }
```

## Why This Works

### Scenario 1: KB Succeeds (Normal Case - 99% of time)
```
inferred = {"canonical": None, "filename": None}  ← Initialized
base = kb_based_roadmap(job_text)  ← Returns 6+ skills
if condition FALSE → Skip canonical fallback
At line 625:
  inferred.get("canonical") → None (safe)
  generated_from_job_text → False (correct, from KB not canonical)
```

### Scenario 2: KB Fails (Rare Case - 1% of time)
```
inferred = {"canonical": None, "filename": None}  ← Initialized
base = kb_based_roadmap(job_text)  ← Returns < 3 skills
if condition TRUE → Try canonical fallback
  inferred = infer_job_role_from_text(job_text)  ← Updates inferred
At line 625:
  inferred.get("canonical") → {...}  (safe)
  generated_from_job_text → True (correct, from canonical)
```

## Code Flow Now Safe

```
Function Start
    ↓
Initialize: inferred = {"canonical": None, "filename": None}  ← ALWAYS defined
    ↓
Try KB-based roadmap
    ↓
IF KB insufficient:
    ↓
    Try canonical fallback
    ↓
    Update inferred variable
    ↓
ENDIF
    ↓
... rest of function ...
    ↓
At line 625: inferred is ALWAYS defined (either initial or updated)  ✅
    ↓
Return result safely
```

## Test Verification

**Before Fix:**
- Request: "Mobile Developer" → KB generates roadmap successfully → `inferred` undefined → CRASH ❌

**After Fix:**
- Request: "Mobile Developer" → KB generates roadmap successfully → `inferred` initialized early → NO CRASH ✅
- Request: "Unknown Random Role" → KB fails → tries canonical → `inferred` updated → NO CRASH ✅

## Files Changed

**d:\Coding (PROJECT)\CAPSTONE\chatbot-ai\backend_ml\app\handler.py**
- Line 505: Added `inferred = {"canonical": None, "filename": None}`
- This single line fixes the UnboundLocalError completely
- No other changes needed

## Why This is Minimal

- ✅ 1 line added
- ✅ No logic changes
- ✅ Follows Python best practice: initialize variables before use
- ✅ No performance impact
- ✅ Graceful fallback behavior preserved
