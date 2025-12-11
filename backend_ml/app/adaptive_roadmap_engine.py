# adaptive_roadmap_engine.py
def evaluate_subskill_status(subskill, course_progress_map):
    """
    subskill: 1 dict roadmap subskill
    course_progress_map: dict {course_name: percent}
    """

    # Kumpulkan semua course id dari mapped_courses (beginner, intermediate, advanced)
    mapped = subskill.get("mapped_courses", {}) or {}
    all_course_ids = []
    for lvl, arr in mapped.items():
        if isinstance(arr, list):
            all_course_ids.extend(arr)

    if not all_course_ids:
        return "not_started"

    # Cek progress untuk setiap course
    completed = False
    in_progress = False

    for cid in all_course_ids:
        # convert id to str because backend stores keys as strings
        cid_str = str(cid)

        if cid_str not in course_progress_map:
            # jika course belum pernah disentuh user
            continue

        progress = course_progress_map.get(cid_str, 0)

        if progress >= 100:
            completed = True
        elif 0 < progress < 100:
            in_progress = True

    if completed:
        return "completed"

    if in_progress:
        return "in_progress"

    return "not_started"


def generate_user_skill_status(roadmap, profile):
    """
    roadmap: hasil generate_roadmap_response()
    profile: full user profile (from backend)
    """
    if not roadmap or "subskills" not in roadmap:
        return {}

    # map progress Dicoding
    course_map = {}
    cp = profile.get("platform_data", {}).get("course_progress", {})

    # Normalisasi, ubah ke string
    for k, v in cp.items():
        course_map[str(k)] = float(v)

    output = {}

    for s in roadmap["subskills"]:
        sid = s.get("id")
        if not sid:
            continue

        status = evaluate_subskill_status(s, course_map)

        output[sid] = {
            "name": s.get("name"),
            "status": status
        }

    return output
