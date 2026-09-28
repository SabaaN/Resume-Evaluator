# Resume Evaluator

An AI-powered resume screening tool. Upload a job description and up to 10 candidate resumes, and the system evaluates each one independently against the JD — scoring fit, matching skills, flagging gaps, and generating recruiter-ready summaries — then ranks all candidates so you can quickly identify your top picks.

Built with **LangGraph** for orchestration, **Groq** (Llama/GPT-OSS models) for evaluation, **FastAPI** for the backend, and **React** for the dashboard.

---

## Features

- Upload one job description (`.txt`) and up to 10 candidate CVs (`.pdf`)
- Optional **Additional Requirements** field to capture anything missing from the JD (e.g. "remote only", "must have led a team")
- Each CV is evaluated independently and in parallel via a LangGraph fan-out, so one bad PDF or failed call never breaks the batch
- Per-candidate evaluation includes:
  - Overall CV–JD match score (0–10)
  - Skills match — matched / partial / missing
  - Experience match (relevant years & alignment)
  - Education & certifications match
  - Key strengths and key gaps
  - Projects & achievements relevance
  - CV quality / ATS score
  - Red flags / points to verify in interview
  - 3–4 tailored interview questions
  - Final recruiter summary
  - Recommendation: Shortlist / Consider / Not Suitable
  - Candidate ranking within the batch
- Results ranked automatically; top 3 highlighted with a podium view
- No database — fully stateless, in-memory per request

---

## Tech Stack

| Layer | Technology |
|---|---|
| Orchestration | LangGraph (fan-out / parallel evaluation) |
| LLM | Groq API (`openai/gpt-oss-120b`) — free tier, no card required |
| Backend | FastAPI (Python) |
| PDF parsing | pdfplumber |
| Frontend | React (Vite) |
| Styling | Plain CSS (custom properties, no framework) |

---

## Architecture

```
React Dashboard
   │  upload JD (.txt) + additional requirements (optional) + up to 10 CVs (.pdf)
   ▼
FastAPI  /evaluate
   │  parse JD text, merge in additional requirements
   │  extract text from each PDF (pdfplumber)
   ▼
LangGraph workflow
   │
   ├─ fan-out: one parallel branch per CV (Send)
   │     └─ evaluate_cv_node → Groq call → structured JSON per candidate
   │
   └─ rank_all_node → sorts by overall_match_score, assigns ranking
   ▼
FastAPI returns ranked JSON (all candidates, all fields)
   ▼
React Dashboard renders podium + ranked, expandable candidate cards
```

Each CV gets its **own independent LLM call** (rather than batching all CVs into one prompt) — this keeps evaluation quality high and means a failure on one CV never affects the others. The trade-off is that the JD and prompt instructions are resent on every call; see [Token Usage](#token-usage-estimate) below.

---

## Project Structure

```
cv_eval/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, /evaluate endpoint
│   │   ├── graph/
│   │   │   ├── state.py           # LangGraph state schema
│   │   │   ├── nodes.py           # evaluate_cv_node, rank_all_node
│   │   │   └── workflow.py        # graph wiring (fan-out via Send)
│   │   ├── utils/
│   │   │   ├── pdf_parser.py      # PDF text extraction
│   │   │   └── groq_client.py     # Groq API call + prompt template
│   │   └── models/
│   │       └── schemas.py         # Pydantic response models
│   ├── requirements.txt
│   └── .env                       # GROQ_API_KEY (not committed)
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js                 # Axios wrapper for /evaluate
    │   ├── index.css              # design tokens, global styles
    │   └── components/
    │       ├── UploadPanel.jsx    # JD / additional requirements / CV upload
    │       ├── ResultsList.jsx    # summary strip + ranked results
    │       ├── Podium.jsx         # top-3 podium view
    │       └── CandidateCard.jsx  # expandable per-candidate detail card
    └── package.json
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
GROQ_API_KEY=your_key_here
```

Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

Confirm it's up: `GET http://localhost:8000/health` → `{"status": "ok"}`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (default Vite port `5173`). Make sure this matches the CORS origins allowed in `backend/app/main.py`.

---

## API

### `POST /evaluate`

**Request** (`multipart/form-data`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `jd` | file (`.txt`) | Yes | Job description |
| `cvs` | file(s) (`.pdf`) | Yes | Up to 10 |
| `additional_requirements` | text | No | Freeform, merged into the JD context |

**Response**:

```json
{
  "total_cvs": 3,
  "ranked": [
    {
      "filename": "cv_strong_match.pdf",
      "candidate_name": "Ayesha Khan",
      "reasoning": "...",
      "overall_match_score": 9.5,
      "skills_match": { "matched": [...], "partial": [...], "missing": [...] },
      "experience_match": "...",
      "education_match": "...",
      "key_strengths": [...],
      "key_gaps": [...],
      "projects_achievements_relevance": "...",
      "ats_quality_score": 8.7,
      "red_flags": [...],
      "interview_questions": [...],
      "recruiter_summary": "...",
      "recommendation": "Shortlist",
      "candidate_ranking": "1 of 3",
      "error": null,
      "is_top_3": true
    }
  ]
}
```

Candidates with parsing or evaluation failures are still returned, with `error` populated and score fields `null` — the batch never fails wholesale because of one bad file.

---

## Token Usage (estimate)

Per CV, one LLM call handles the full structured evaluation:

| Component | ~Tokens |
|---|---|
| Fixed prompt instructions | ~480 |
| JD text (typical) | ~200–800 |
| CV text (typical 1–1.5 page resume) | ~500–700 |
| Output (full structured JSON) | ~500–900 |
| **Total per CV** | **~1,800–2,400** |

For a full 10-CV batch: roughly **20,000–30,000 tokens**, since the JD and instructions are resent on every parallel call (a deliberate trade-off for independent, high-quality per-candidate evaluation). Well within Groq's free-tier limits for normal usage.

---

## Design Notes

- **No database** — everything is processed in-memory per request; nothing is persisted server-side.
- **Fan-out over batching** — each CV is scored in its own LLM call rather than stuffing all CVs into one prompt, trading some token efficiency for independence and per-CV error isolation.
- **Model**: currently `openai/gpt-oss-120b` on Groq. Swappable in `backend/app/utils/groq_client.py`.

---

## Possible Future Improvements

- OCR fallback for scanned/image-based PDFs (currently text-only extraction via pdfplumber)
- Export ranked results to CSV/PDF report
- Persist evaluation history (would require adding a database)
- Support batching CVs into fewer calls if rate limits become a concern at higher volume
