import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set in environment")

client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "openai/gpt-oss-120b"

EVAL_PROMPT_TEMPLATE = """You are an expert technical recruiter conducting a thorough resume screening.

JOB DESCRIPTION:
{jd_text}

CANDIDATE RESUME:
{cv_text}

Evaluate this candidate against the JD and respond with STRICT JSON only, in exactly this shape:

{{
  "candidate_name": "string (extract from resume, or 'Unknown Candidate' if not found)",
  "reasoning": "string (2-3 sentence overall rationale for the match score)",
  "overall_match_score": number (0-10, one decimal place, overall CV-JD fit),
  "skills_match": {{
    "matched": ["skills from the JD the candidate clearly has"],
    "partial": ["skills the candidate has some but incomplete evidence of"],
    "missing": ["required JD skills with no evidence in the resume"]
  }},
  "experience_match": "string (relevant experience summary and total relevant years, vs what JD asks for)",
  "education_match": "string (how education/certifications align with JD requirements, if any)",
  "key_strengths": ["2-4 short bullet points on what makes this candidate stand out"],
  "key_gaps": ["2-4 short bullet points on missing requirements or weak areas"],
  "projects_achievements_relevance": "string (how relevant their listed projects/achievements are to this role)",
  "ats_quality_score": number (0-10, one decimal place, resume formatting/clarity/ATS-parseability quality, independent of JD fit),
  "red_flags": ["any concerns worth verifying in interview: unexplained gaps, inconsistent dates, unverifiable claims, job hopping, etc. Empty array if none."],
  "interview_questions": ["3 to 4 targeted interview questions based on THIS candidate's specific resume content and gaps"],
  "recruiter_summary": "string (3-4 sentence final summary a recruiter could paste directly into a hiring note)",
  "recommendation": "one of exactly: 'Shortlist', 'Consider', 'Not Suitable'"
}}

Be specific and reference actual resume content — avoid generic statements. Keep all list items concise (under 15 words each).
"""


def evaluate_cv_with_groq(jd_text: str, cv_text: str) -> dict:
    """Calls Groq once to fully evaluate one CV against the JD.
    Raises on failure — caller is responsible for catching and recording the error."""
    prompt = EVAL_PROMPT_TEMPLATE.format(jd_text=jd_text, cv_text=cv_text)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content
    parsed = json.loads(raw_text)

    required = ["overall_match_score", "reasoning", "recommendation"]
    missing = [f for f in required if f not in parsed]
    if missing:
        raise ValueError(f"Malformed Groq response, missing fields {missing}: {parsed}")

    parsed["overall_match_score"] = float(parsed["overall_match_score"])
    if "ats_quality_score" in parsed and parsed["ats_quality_score"] is not None:
        parsed["ats_quality_score"] = float(parsed["ats_quality_score"])
    parsed.setdefault("candidate_name", "Unknown Candidate")
    parsed.setdefault("skills_match", {"matched": [], "partial": [], "missing": []})
    parsed.setdefault("key_strengths", [])
    parsed.setdefault("key_gaps", [])
    parsed.setdefault("red_flags", [])
    parsed.setdefault("interview_questions", [])

    return parsed