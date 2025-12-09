"""
Debug utility to inspect user profiles and diagnose issues
"""
import json
import os
from pathlib import Path

def find_user_profiles_dir():
    """Locate user_profiles directory"""
    possible_paths = [
        "backend_ml/app/user_profiles",
        "../backend_ml/app/user_profiles",
        "app/user_profiles",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    return None

def list_all_profiles():
    """List all user profiles"""
    profiles_dir = find_user_profiles_dir()
    
    if not profiles_dir:
        print("❌ Could not find user_profiles directory")
        return []
    
    print(f"📁 User Profiles Directory: {profiles_dir}\n")
    
    profiles = []
    for filename in os.listdir(profiles_dir):
        if filename.endswith(".json"):
            user_id = filename.replace(".json", "")
            filepath = os.path.join(profiles_dir, filename)
            
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    profiles.append({
                        "user_id": user_id,
                        "filepath": filepath,
                        "data": data
                    })
            except Exception as e:
                print(f"⚠️  Error reading {filename}: {e}")
    
    return profiles

def inspect_profile(user_id: str):
    """Detailed inspection of a specific profile"""
    profiles = list_all_profiles()
    profile = next((p for p in profiles if p["user_id"] == user_id), None)
    
    if not profile:
        print(f"❌ Profile not found for user_id: {user_id}")
        return
    
    data = profile["data"]
    
    print("=" * 60)
    print(f"USER PROFILE INSPECTION: {user_id}")
    print("=" * 60)
    
    # Basic info
    print(f"\n📋 Basic Info:")
    print(f"   User ID: {data.get('user_id', 'N/A')}")
    plat = data.get("platform_data", {})
    print(f"   Name: {plat.get('name', 'N/A')}")
    print(f"   Email: {plat.get('email', 'N/A')}")
    
    # Courses
    print(f"\n📚 Active Courses:")
    courses = plat.get("active_courses", [])
    if courses:
        for idx, course in enumerate(courses, 1):
            print(f"   {idx}. {course}")
    else:
        print("   (No active courses)")
    
    # Progress
    print(f"\n📊 Progress:")
    print(f"   Active tutorials: {plat.get('active_tutorials', 0)}")
    print(f"   Completed tutorials: {plat.get('completed_tutorials', 0)}")
    print(f"   Graduated: {'Yes' if plat.get('is_graduated') else 'No'}")
    
    # Learning profile
    lp = data.get("learning_profile", {})
    
    print(f"\n🎯 Current Focus:")
    current = lp.get("current_focus", {})
    print(f"   Course: {current.get('course', 'N/A')}")
    print(f"   Module: {current.get('module', 0)}")
    
    print(f"\n💪 Skills:")
    skills = lp.get("skills", {})
    if skills:
        for skill, level in skills.items():
            print(f"   - {skill}: {level}")
    else:
        print("   (No skills recorded)")
    
    print(f"\n📈 Progress Scores:")
    scores = lp.get("progress_score", {})
    if scores:
        for course, score in scores.items():
            print(f"   - {course}: {score}%")
    else:
        print("   (No progress scores)")
    
    # Timestamps
    print(f"\n🕐 Timestamps:")
    print(f"   Created: {data.get('created_at', 'N/A')}")
    print(f"   Updated: {data.get('updated_at', 'N/A')}")
    
    print("\n" + "=" * 60)

def validate_profile_structure(user_id: str):
    """Validate if profile has correct structure"""
    profiles = list_all_profiles()
    profile = next((p for p in profiles if p["user_id"] == user_id), None)
    
    if not profile:
        print(f"❌ Profile not found: {user_id}")
        return False
    
    data = profile["data"]
    
    print("=" * 60)
    print(f"VALIDATION: {user_id}")
    print("=" * 60 + "\n")
    
    checks = {
        "Has user_id": "user_id" in data,
        "Has platform_data": "platform_data" in data,
        "Has learning_profile": "learning_profile" in data,
        "Has active_courses": "active_courses" in data.get("platform_data", {}),
        "active_courses is list": isinstance(data.get("platform_data", {}).get("active_courses"), list),
        "Has current_focus": "current_focus" in data.get("learning_profile", {}),
        "Has created_at": "created_at" in data,
        "Has updated_at": "updated_at" in data,
    }
    
    all_passed = True
    for check, passed in checks.items():
        status = "✅" if passed else "❌"
        print(f"{status} {check}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("✅ Profile structure is VALID")
    else:
        print("❌ Profile structure has ISSUES")
    
    return all_passed

def compare_profiles(user_id: str, num_loads: int = 5):
    """Load profile multiple times to check consistency"""
    profiles_dir = find_user_profiles_dir()
    
    if not profiles_dir:
        print("❌ Could not find user_profiles directory")
        return
    
    filepath = os.path.join(profiles_dir, f"{user_id}.json")
    
    if not os.path.exists(filepath):
        print(f"❌ Profile not found: {filepath}")
        return
    
    print("=" * 60)
    print(f"CONSISTENCY CHECK: Loading profile {num_loads} times")
    print("=" * 60 + "\n")
    
    loaded_data = []
    
    for i in range(num_loads):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            courses = data.get("platform_data", {}).get("active_courses", [])
            loaded_data.append(courses)
            print(f"Load {i+1}: {len(courses)} courses")
    
    # Check if all loads returned same data
    first_load = loaded_data[0]
    all_same = all(courses == first_load for courses in loaded_data)
    
    print()
    if all_same:
        print("✅ CONSISTENT: All loads returned identical data")
        print(f"   Courses: {', '.join(first_load)}")
    else:
        print("❌ INCONSISTENT: Loads returned different data")
        for i, courses in enumerate(loaded_data, 1):
            print(f"   Load {i}: {courses}")

def main():
    """Main menu"""
    print("\n" + "=" * 60)
    print("USER PROFILE DEBUGGER")
    print("=" * 60 + "\n")
    
    profiles = list_all_profiles()
    
    if not profiles:
        print("❌ No profiles found")
        return
    
    print(f"Found {len(profiles)} profile(s):\n")
    for idx, profile in enumerate(profiles, 1):
        user_id = profile["user_id"]
        courses_count = len(profile["data"].get("platform_data", {}).get("active_courses", []))
        print(f"{idx}. {user_id} ({courses_count} courses)")
    
    print("\nOptions:")
    print("1. Inspect specific profile")
    print("2. Validate profile structure")
    print("3. Check profile consistency")
    
    choice = input("\nEnter option (1-3): ").strip()
    
    if choice in ["1", "2", "3"]:
        user_id = input("Enter user_id: ").strip()
        
        if choice == "1":
            inspect_profile(user_id)
        elif choice == "2":
            validate_profile_structure(user_id)
        elif choice == "3":
            compare_profiles(user_id)
    else:
        print("Invalid option")

if __name__ == "__main__":
    main()