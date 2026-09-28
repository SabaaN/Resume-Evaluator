from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware

from app.utils.pdf_parser import extract_text_from_pdf
from app.utils.jd_parser import extract_text_from_doc
from app.graph.workflow import compiled_graph
from app.graph.state import CVResult
from app.models.schemas import EvaluateResponse, CVResultResponse

MAX_CVS = 10

app = FastAPI(title="Resume Evaluator API")

# Adjust origins for your actual frontend dev/prod URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    jd: UploadFile = File(...),
    cvs: list[UploadFile] = File(...),
    additional_requirements: str = Form(default=""),
):
    jd_filename = (jd.filename or "").lower()
    jd_extension = jd_filename.rsplit(".", 1)[-1] if "." in jd_filename else ""
    if jd_extension not in {"txt", "pdf", "doc", "docx"}:
        raise HTTPException(400, "JD must be a .txt, .pdf, .doc, or .docx file")

    if len(cvs) == 0:
        raise HTTPException(400, "At least one CV is required")
    if len(cvs) > MAX_CVS:
        raise HTTPException(400, f"Maximum {MAX_CVS} CVs allowed, got {len(cvs)}")

    for f in cvs:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(400, f"'{f.filename}' is not a PDF")

    jd_bytes = await jd.read()
    try:
        if jd_extension == "txt":
            jd_text = jd_bytes.decode("utf-8")
        elif jd_extension == "pdf":
            jd_text = extract_text_from_pdf(jd_bytes)
        else:
            jd_text = extract_text_from_doc(jd_bytes, jd_extension)
    except UnicodeDecodeError:
        raise HTTPException(400, "JD file must be UTF-8 encoded text")
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not jd_text.strip():
        raise HTTPException(400, "JD file is empty")

    if additional_requirements.strip():
        jd_text = f"{jd_text}\n\nADDITIONAL REQUIREMENTS (specified separately by the recruiter):\n{additional_requirements.strip()}"


    input_cvs: list[CVResult] = []
    for f in cvs:
        file_bytes = await f.read()
        try:
            text = extract_text_from_pdf(file_bytes)
            input_cvs.append({
                "filename": f.filename,
                "candidate_name": None,
                "raw_text": text,
                "score": None,
                "reasoning": None,
                "error": None,
            })
        except ValueError as e:
            input_cvs.append({
                "filename": f.filename,
                "candidate_name": None,
                "raw_text": "",
                "score": None,
                "reasoning": None,
                "error": str(e),
            })

    result = compiled_graph.invoke({
        "jd_text": jd_text,
        "input_cvs": input_cvs,
        "cvs": [],
        "ranked": [],
    })

    ranked = result["ranked"]
    response_items = [
        CVResultResponse(
            filename=c["filename"],
            candidate_name=c.get("candidate_name"),
            reasoning=c.get("reasoning"),
            overall_match_score=c.get("overall_match_score"),
            skills_match=c.get("skills_match"),
            experience_match=c.get("experience_match"),
            education_match=c.get("education_match"),
            key_strengths=c.get("key_strengths"),
            key_gaps=c.get("key_gaps"),
            projects_achievements_relevance=c.get("projects_achievements_relevance"),
            ats_quality_score=c.get("ats_quality_score"),
            red_flags=c.get("red_flags"),
            interview_questions=c.get("interview_questions"),
            recruiter_summary=c.get("recruiter_summary"),
            recommendation=c.get("recommendation"),
            candidate_ranking=c.get("candidate_ranking"),
            error=c.get("error"),
            is_top_3=(i < 3 and c.get("overall_match_score") is not None),
        )
        for i, c in enumerate(ranked)
    ]

    return EvaluateResponse(total_cvs=len(cvs), ranked=response_items)

@app.get("/health")
async def health():
    return {"status": "ok"}
