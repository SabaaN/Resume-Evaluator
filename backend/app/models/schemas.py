from pydantic import BaseModel
from typing import Optional, List


class SkillsMatchResponse(BaseModel):
    matched: List[str] = []
    partial: List[str] = []
    missing: List[str] = []


class CVResultResponse(BaseModel):
    filename: str
    candidate_name: Optional[str]

    reasoning: Optional[str] = None
    overall_match_score: Optional[float] = None
    skills_match: Optional[SkillsMatchResponse] = None
    experience_match: Optional[str] = None
    education_match: Optional[str] = None
    key_strengths: Optional[List[str]] = None
    key_gaps: Optional[List[str]] = None
    projects_achievements_relevance: Optional[str] = None
    ats_quality_score: Optional[float] = None
    red_flags: Optional[List[str]] = None
    interview_questions: Optional[List[str]] = None
    recruiter_summary: Optional[str] = None
    recommendation: Optional[str] = None
    candidate_ranking: Optional[str] = None

    error: Optional[str] = None
    is_top_3: bool = False


class EvaluateResponse(BaseModel):
    total_cvs: int
    ranked: List[CVResultResponse]