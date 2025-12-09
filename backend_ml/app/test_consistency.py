import asyncio
import json
import os
from app.handler import handle_query

# =============================================
# SETUP: Create test user profile
# =============================================
def create_test_user_profile():
    """Create a test user profile for consistency testing"""
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    USER_PROFILES_DIR = os.path.join(BASE_DIR, "user_profiles")
    
    # Ensure directory exists
    os.makedirs(USER_PROFILES_DIR, exist_ok=True)
    
    test_profile = {
        "user_id": "test_user_123",
        "platform_data": {
            "name": "Test User",
            "email": "test@example.com",
            "active_courses": [
                "Belajar Membangun Aplikasi Android Native Bagian I",
                "Belajar Pengembangan Aplikasi Android Intermediate",
                "Belajar Dasar Google Cloud",
                "Memulai Pemrograman dengan Dart",
                "Belajar Membuat Aplikasi Android untuk Pemula"
            ],
            "active_tutorials": 3,
            "completed_tutorials": 5,
            "is_graduated": 0,
            "exam_score": "",
            "submission_rating": ""
        },
        "learning_profile": {
            "goals": ["Android Development", "Cloud Computing"],
            "skills": {
                "Kotlin": "intermediate",
                "Java": "beginner"
            },
            "weaknesses": ["UI/UX Design"],
            "strengths": ["Logic", "Problem Solving"],
            "current_focus": {
                "course": "Belajar Membangun Aplikasi Android Native Bagian I",
                "module": 3
            },
            "learning_style": "visual",
            "progress_score": {
                "Belajar Membangun Aplikasi Android Native Bagian I": 45,
                "Memulai Pemrograman dengan Dart": 80
            },
            "history": []
        },
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }
    
    profile_path = os.path.join(USER_PROFILES_DIR, "test_user_123.json")
    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(test_profile, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Test profile created at: {profile_path}")
    return profile_path


# =============================================
# TEST: Consistency Check
# =============================================
async def test_consistency():
    """Test if bot gives consistent responses across multiple runs"""
    
    print("=" * 60)
    print("CONSISTENCY TEST - User Course Listing")
    print("=" * 60)
    
    user_id = "test_user_123"
    test_queries = [
        "apa saja kursus yang sedang saya ambil?",
        "kursus apa yang saya ikuti sekarang?",
        "tunjukkan progress belajar saya"
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"QUERY: {query}")
        print(f"{'='*60}")
        
        results = []
        courses_mentioned = []
        
        for run in range(3):
            print(f"\n--- Run {run+1} ---")
            result = await handle_query(user_id, query)
            
            response = result["response"]
            print(response)
            
            results.append(response)
            
            # Extract course names from response
            import re
            courses = re.findall(r'Belajar[^,.\n!?]+|Memulai[^,.\n!?]+', response)
            courses_mentioned.append(set(c.strip() for c in courses))
            
            await asyncio.sleep(0.5)
        
        # Check consistency
        print(f"\n{'='*60}")
        print("CONSISTENCY ANALYSIS")
        print(f"{'='*60}")
        
        # Check text similarity
        unique_responses = len(set(results))
        print(f"Unique responses: {unique_responses}/3")
        
        if unique_responses == 1:
            print("✅ PASS: All responses identical")
        elif unique_responses == 2:
            print("⚠️  PARTIAL: Responses slightly differ")
        else:
            print("❌ FAIL: Responses significantly differ")
        
        # Check course consistency
        all_courses = set.union(*courses_mentioned) if courses_mentioned else set()
        print(f"\nCourses mentioned across runs: {len(all_courses)}")
        for course in sorted(all_courses):
            count = sum(1 for cm in courses_mentioned if course in cm)
            status = "✅" if count == 3 else "⚠️"
            print(f"{status} {course}: {count}/3 runs")
        
        print("\n")


# =============================================
# TEST: Hallucination Detection
# =============================================
async def test_hallucination():
    """Test if bot hallucinates courses not in user profile"""
    
    print("\n" + "=" * 60)
    print("HALLUCINATION TEST")
    print("=" * 60)
    
    user_id = "test_user_123"
    
    # Expected courses (ground truth)
    expected_courses = {
        "Belajar Membangun Aplikasi Android Native Bagian I",
        "Belajar Pengembangan Aplikasi Android Intermediate",
        "Belajar Dasar Google Cloud",
        "Memulai Pemrograman dengan Dart",
        "Belajar Membuat Aplikasi Android untuk Pemula"
    }
    
    # Tricky queries that might trigger hallucination
    tricky_queries = [
        "ceritakan tentang kursus yang saya ambil",
        "kursus android apa yang saya ikuti?",
        "apa saja yang sedang saya pelajari di dicoding?",
    ]
    
    for query in tricky_queries:
        print(f"\n{'='*60}")
        print(f"QUERY: {query}")
        print(f"{'='*60}\n")
        
        result = await handle_query(user_id, query)
        response = result["response"]
        print(response)
        
        # Extract mentioned courses
        import re
        mentioned = set(re.findall(r'Belajar[^,.\n!?]+|Memulai[^,.\n!?]+', response))
        mentioned = {c.strip() for c in mentioned}
        
        # Check for hallucinations
        print(f"\n{'='*60}")
        hallucinated = mentioned - expected_courses
        
        if hallucinated:
            print(f"❌ HALLUCINATED COURSES DETECTED:")
            for course in hallucinated:
                print(f"   - {course}")
        else:
            print("✅ NO HALLUCINATIONS: All mentioned courses are valid")
        
        if mentioned and mentioned.issubset(expected_courses):
            print("✅ ACCURATE: Only mentioned courses from user profile")
        
        await asyncio.sleep(0.5)


# =============================================
# TEST: Profile vs Search Results
# =============================================
async def test_profile_vs_search():
    """Test if bot prioritizes profile data over search results"""
    
    print("\n" + "=" * 60)
    print("PROFILE PRIORITY TEST")
    print("=" * 60)
    
    user_id = "test_user_123"
    
    # Query that might confuse bot with search results
    queries = [
        "saya mau belajar flutter",  # Flutter NOT in profile
        "ceritakan tentang kursus belajar membuat aplikasi android untuk pemula",  # In profile
        "gimana cara belajar iOS development?",  # iOS NOT in profile
    ]
    
    for query in queries:
        print(f"\n{'='*60}")
        print(f"QUERY: {query}")
        print(f"{'='*60}\n")
        
        result = await handle_query(user_id, query)
        response = result["response"]
        query_type = result["meta"].get("query_type", "unknown")
        
        print(f"Detected as: {query_type}")
        print(f"Response:\n{response}\n")
        
        # Check if bot incorrectly claims user is enrolled in non-enrolled course
        problematic_phrases = [
            "kamu sedang belajar flutter",
            "kamu ambil flutter",
            "kursusmu tentang flutter",
            "kamu sedang belajar ios",
            "kamu ambil ios"
        ]
        
        is_problematic = any(phrase in response.lower() for phrase in problematic_phrases)
        
        if is_problematic:
            print("❌ FAIL: Bot incorrectly claimed user is enrolled in non-enrolled course")
        else:
            print("✅ PASS: Bot correctly distinguished enrollment vs recommendation")
        
        await asyncio.sleep(0.5)


# =============================================
# MAIN TEST RUNNER
# =============================================
async def run_all_tests():
    """Run all tests"""
    
    # Setup
    print("Setting up test environment...\n")
    profile_path = create_test_user_profile()
    
    # Run tests
    await test_consistency()
    await test_hallucination()
    await test_profile_vs_search()
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())