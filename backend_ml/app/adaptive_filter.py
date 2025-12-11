# adaptive_filter.py
# -------------------------------------------------------------
# Adaptive filtering untuk roadmap berdasarkan skill_status user
# -------------------------------------------------------------

def normalize_level(level):
    """
    Normalize input level menjadi salah satu:
    - beginner
    - intermediate
    - advanced

    Input dapat berupa:
    - string ("beginner", "completed", "in_progress")
    - dict: { "name": "..", "status": "completed" }
    """

    if not level:
        return "beginner"

    # jika dict
    if isinstance(level, dict):
        level = level.get("status", "")

    # jika bukan string
    if not isinstance(level, str):
        return "beginner"

    lvl = level.strip().lower()

    # level asli
    if lvl in ("beginner", "intermediate", "advanced"):
        return lvl

    # mapping status Dicoding
    if lvl in ("completed", "selesai", "done"):
        return "advanced"

    if lvl in ("in_progress", "ongoing"):
        return "intermediate"

    return "beginner"


def filter_roadmap_for_user(roadmap: dict, skill_status: dict):
    """
    Adaptive filtering subskills roadmap berdasarkan skill_status user.
    """
    if not roadmap or "subskills" not in roadmap:
        return []

    if not isinstance(skill_status, dict):
        skill_status = {}

    filtered = []

    for sub in roadmap["subskills"]:
        sid = sub.get("id")

        # ambil status user utk subskill ini
        user_level = normalize_level(skill_status.get(sid, {}))

        # 1. Jika user sudah Advanced -> sembunyikan subskill ini
        if user_level == "advanced":
            continue

        # Copy subskill
        new_sub = dict(sub)

        # 2. Jika Intermediate -> hilangkan level Beginner
        if user_level == "intermediate":
            levels = dict(new_sub.get("levels", {}))
            if "beginner" in levels:
                levels.pop("beginner")
            new_sub["levels"] = levels

        filtered.append(new_sub)

    return filtered


def apply_adaptive_filter(roadmap: dict, profile: dict):
    """
    Wrapper: ambil skill_status dari profile -> adapt roadmap.
    """
    skill_status = (
        profile.get("roadmap_progress", {}).get("skills_status", {})
        if isinstance(profile, dict) else {}
    )

    result = filter_roadmap_for_user(roadmap, skill_status)

    return {
        "job_role": roadmap.get("job_role"),
        "version": roadmap.get("version"),
        "description": roadmap.get("description"),
        "subskills": result
    }
