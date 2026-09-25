import operator
from typing import TypedDict, List, Optional, Annotated


class SkillsMatch(TypedDict):
    matched: List[str]
    partial: List[str]
    missing: List[str]


class CVResult(TypedDict):
    filename: str
    candidate_name: Optional[str]
    raw_text: str

    reasoning: Optional[str]
    overall_match_score: Optional[float]          # 0-10
    skills_match: Optional[SkillsMatch]
    experience_match: Optional[str]
    education_match: Optional[str]
    key_strengths: Optional[List[str]]
    key_gaps: Optional[List[str]]
    projects_achievements_relevance: Optional[str]
    ats_quality_score: Optional[float]             # 0-10
    red_flags: Optional[List[str]]
    interview_questions: Optional[List[str]]
    recruiter_summary: Optional[str]
    recommendation: Optional[str]                  # "Shortlist" | "Consider" | "Not Suitable"
    candidate_ranking: Optional[str]                # e.g. "1 of 4" — set after ranking, not by the LLM

    error: Optional[str]


class EvalState(TypedDict):
    jd_text: str
    input_cvs: List[CVResult]
    cvs: Annotated[List[CVResult], operator.add]
    ranked: List[CVResult]  