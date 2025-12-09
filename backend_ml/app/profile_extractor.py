from groq import Groq
import json
from .config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

async def extract_profile_data(user_message):
    prompt = f"""
    Dari pesan user berikut:
    "{user_message}"

    Ekstrak data pembelajaran user dalam format JSON:
    {{
        "goals": [],
        "skills": {{}},
        "weaknesses": [],
        "strengths": [],
        "learning_style": null
    }}

    Hanya isi field yang benar-benar disebut oleh user.
    Jangan mengarang.
    Output harus valid JSON.
    """

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
        temperature=0.2
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except:
        return {}
