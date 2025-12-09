# app/test_courses.py

# Data dummy courses (sesuaikan dengan excel kamu)
SAMPLE_COURSES = [
    {
        "course_id": "39",
        "course_name": "Belajar Dasar Pemrograman Web",
        "course_level_str": "1",
        "hours_to_study": 45,
        "learning_path_id": "1"
    },
    {
        "course_id": "38",
        "course_name": "Belajar Dasar Pemrograman JavaScript",
        "course_level_str": "1",
        "hours_to_study": 46,
        "learning_path_id": "1"
    },
    {
        "course_id": "40",
        "course_name": "Belajar Fundamental Front-End Web Development",
        "course_level_str": "2",
        "hours_to_study": 80,
        "learning_path_id": "1"
    },
    {
        "course_id": "41",
        "course_name": "Belajar Membuat Front-End Web untuk Pemula",
        "course_level_str": "1",
        "hours_to_study": 45,
        "learning_path_id": "1"
    },
    {
        "course_id": "42",
        "course_name": "Belajar Pengembangan Web Intermediate",
        "course_level_str": "3",
        "hours_to_study": 80,
        "learning_path_id": "1"
    }
]

SAMPLE_TUTORIALS = [
    {"tutorial_id": "1", "course_id": "39", "tutorial_title": "Pengenalan HTML"},
    {"tutorial_id": "2", "course_id": "39", "tutorial_title": "Pengenalan CSS"},
    {"tutorial_id": "3", "course_id": "38", "tutorial_title": "Variabel dan Tipe Data"}
]

def get_sample_courses():
    return SAMPLE_COURSES

def get_sample_tutorials():
    return SAMPLE_TUTORIALS