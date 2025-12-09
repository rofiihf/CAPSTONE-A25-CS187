# app/test_roadmap.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from roadmap_engine import (
    infer_job_role_from_courses,
    initialize_roadmap_progress,
    update_skill_assessment,
    get_assessment_status
)
import json

def test_infer_job_role():
    print("\n=== TEST 1: Infer Job Role ===")
    
    # Test case 1: Front-End courses
    courses_fe = [
        "Belajar Dasar Pemrograman Web",
        "Belajar JavaScript"
    ]
    result = infer_job_role_from_courses(courses_fe)
    print(f"Courses: {courses_fe}")
    print(f"Inferred Role: {result}")
    assert result == "Front-End Web Developer", f"Expected Front-End, got {result}"
    print("✅ PASS\n")
    
    # Test case 2: AI courses
    courses_ai = [
        "Belajar Dasar AI",
        "Machine Learning untuk Pemula"
    ]
    result = infer_job_role_from_courses(courses_ai)
    print(f"Courses: {courses_ai}")
    print(f"Inferred Role: {result}")
    assert result == "AI Engineer", f"Expected AI Engineer, got {result}"
    print("✅ PASS\n")

def test_initialize_roadmap():
    print("\n=== TEST 2: Initialize Roadmap ===")
    
    user_id = "test_user_001"
    job_role = "Front-End Web Developer"
    
    result = initialize_roadmap_progress(user_id, job_role)
    print(json.dumps(result, indent=2))
    
    assert "skills_status" in result
    assert len(result["skills_status"]) == 6  # 6 subskills
    print("✅ PASS\n")

def test_update_assessment():
    print("\n=== TEST 3: Update Skill Assessment ===")
    
    # First, initialize roadmap for test user
    user_id = "test_user_001"
    
    # Load profile and add roadmap_progress
    from roadmap_engine import load_json, save_json, USER_PROFILES_DIR
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    
    if os.path.exists(profile_path):
        profile = load_json(profile_path)
        progress = initialize_roadmap_progress(user_id, "Front-End Web Developer")
        profile["roadmap_progress"] = progress
        save_json(profile_path, profile)
        print(f"✅ Initialized roadmap for {user_id}")
    else:
        print(f"⚠️ User profile not found: {user_id}")
        return
    
    # Now test assessment
    result = update_skill_assessment(
        user_id=user_id,
        subskill_id="html_css_fundamentals",
        level="Intermediate"
    )
    
    print(json.dumps(result, indent=2))
    
    # Check if updated
    skill = result["skills_status"]["html_css_fundamentals"]
    assert skill["level"] == "Intermediate"
    assert skill["status"] == "in_progress"
    print("✅ PASS\n")

def test_assessment_status():
    print("\n=== TEST 4: Get Assessment Status ===")
    
    user_id = "test_user_001"
    status = get_assessment_status(user_id)
    
    print(json.dumps(status, indent=2))
    assert status["total"] == 6
    print("✅ PASS\n")

if __name__ == "__main__":
    print("🚀 Starting Roadmap Engine Tests...\n")
    
    try:
        test_infer_job_role()
        test_initialize_roadmap()
        test_update_assessment()
        test_assessment_status()
        
        print("\n🎉 ALL TESTS PASSED!\n")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        import traceback
        traceback.print_exc()