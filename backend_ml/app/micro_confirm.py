def detect_confirmation_micro(text: str):
    if not text:
        return None

    t = text.lower().strip()

    YES = [
        "ya", "iya", "ok", "oke", "sip", "gas", "ini aja", "boleh", "lanjut",
        "setuju", "oke lanjut", "oke deh", "ambil ini"
    ]
    NO = [
        "ga", "gak", "tidak", "ga mau", "gak itu", "jangan", "skip", "nanti dulu"
    ]

    if t in YES or any(t.startswith(y) for y in YES):
        return "confirm_yes"

    if t in NO or any(t.startswith(n) for n in NO):
        return "confirm_no"

    return None
