from app.graph.state import EvalState, CVResult
# from app.utils.gemini_client import evaluate_cv_with_gemini
from app.utils.groq_client import evaluate_cv_with_groq


def evaluate_cv_node(state: dict) -> dict:
    """Runs on a single CV (fanned out via Send). Evaluates it against the JD."""
    jd_text = state["jd_text"]
    cv: CVResult = state["cv"]

    # If PDF parsing already failed upstream, skip evaluation and pass the error through
    if cv.get("error"):
        return {"cvs": [cv]}

    try:
        r = evaluate_cv_with_groq(jd_text, cv["raw_text"])
        updated_cv: CVResult = {
            **cv,
            "candidate_name": r["candidate_name"],
            "reasoning": r["reasoning"],
            "overall_match_score": r["overall_match_score"],
            "skills_match": r["skills_match"],
            "experience_match": r.get("experience_match"),
            "education_match": r.get("education_match"),
            "key_strengths": r["key_strengths"],
            "key_gaps": r["key_gaps"],
            "projects_achievements_relevance": r.get("projects_achievements_relevance"),
            "ats_quality_score": r.get("ats_quality_score"),
            "red_flags": r["red_flags"],
            "interview_questions": r["interview_questions"],
            "recruiter_summary": r.get("recruiter_summary"),
            "recommendation": r.get("recommendation"),
            "candidate_ranking": None,  # set later, once we can see the whole batch
            "error": None,
        }
    except Exception as e:
        updated_cv: CVResult = {
            **cv,
            "candidate_name": cv.get("candidate_name") or "Unknown Candidate",
            "overall_match_score": None,
            "error": f"Evaluation failed: {e}",
        }

    return {"cvs": [updated_cv]}


def rank_all_node(state: EvalState) -> dict:
    cvs = state["cvs"]

    scored = [c for c in cvs if c.get("overall_match_score") is not None]
    failed = [c for c in cvs if c.get("overall_match_score") is None]

    scored.sort(key=lambda c: c["overall_match_score"], reverse=True)

    total = len(scored)
    for i, c in enumerate(scored):
        c["candidate_ranking"] = f"{i + 1} of {total}"

    return {"ranked": scored + failed}