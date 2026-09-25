
import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in environment")

genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-3.6-flash"  # fast + cheap, good enough for this task

_model = genai.GenerativeModel(MODEL_NAME)

EVAL_PROMPT_TEMPLATE = """You are an expert technical recruiter. Evaluate how well the candidate's resume fits the given job description.

JOB DESCRIPTION:
{jd_text}

CANDIDATE RESUME:
{cv_text}

Instructions:
- Extract the candidate's full name from the resume if present, else use "Unknown Candidate".
- Score the fit from 0 to 10 (one decimal place allowed, e.g. 7.5), based on skills match, experience relevance, and overall alignment with the JD.
- Give a concise 2-3 sentence rationale explaining the score, referencing specific skills/experience.

Respond with STRICT JSON only, no markdown, no extra text, in exactly this shape:
{{
  "candidate_name": "string",
  "score": number,
  "reasoning": "string"
}}
"""


def _extract_json(text: str) -> dict:
    """Gemini sometimes wraps JSON in markdown fences; strip and parse."""
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def evaluate_cv_with_gemini(jd_text: str, cv_text: str) -> dict:
    """Calls Gemini to evaluate one CV against the JD. Returns dict with candidate_name, score, reasoning.
    Raises on failure — caller is responsible for catching and recording the error."""
    prompt = EVAL_PROMPT_TEMPLATE.format(jd_text=jd_text, cv_text=cv_text)

    response = _model.generate_content(
        prompt,
        generation_config={"temperature": 0.2},
    )

    raw_text = response.text
    parsed = _extract_json(raw_text)

    # basic validation
    if "score" not in parsed or "reasoning" not in parsed:
        raise ValueError(f"Malformed Gemini response: {parsed}")

    parsed["score"] = float(parsed["score"])
    parsed.setdefault("candidate_name", "Unknown Candidate")

    return parsed



