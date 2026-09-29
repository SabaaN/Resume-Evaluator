# CV Evaluator

CV Evaluator is a web app for comparing candidate resumes with a job description. Upload a JD and up to 10 PDF resumes to get AI-generated match scores, skills comparisons, recruiter summaries, interview questions, and a ranked shortlist.

## Features

- Accepts job descriptions as `.txt`, `.pdf`, `.doc`, or `.docx` files.
- Accepts up to 10 candidate resumes in PDF format.
- Includes an optional field for requirements that are not in the JD.
- Evaluates each resume independently against the job description.
- Returns match and ATS quality scores, matched and missing skills, experience and education summaries, strengths, gaps, red flags, and tailored interview questions.
- Ranks candidates by match score and highlights the top three.
- Keeps requests in memory; the application does not use a database.

## Technology

- **Frontend:** React, Vite, Axios
- **Backend:** FastAPI, Python
- **Evaluation workflow:** LangGraph
- **LLM:** Groq API (`openai/gpt-oss-120b`)
- **Document parsing:** pdfplumber, python-docx, olefile

## Requirements

- Python 3.10 or later
- Node.js and npm
- A Groq API key

## Run locally

### 1. Configure and start the backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS or Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

Create `backend/.env` and add your API key:

```env
GROQ_API_KEY=your_groq_api_key
```

Start the API from the `backend` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

The API health check is available at [http://localhost:8000/health](http://localhost:8000/health). Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually [http://localhost:5173](http://localhost:5173)). The frontend currently sends API requests to `http://localhost:8000`; the backend CORS configuration allows ports 5173 and 3000.

## Using the app

1. Choose a job description file (`.txt`, `.pdf`, `.doc`, or `.docx`).
2. Optionally enter additional role requirements.
3. Add one or more PDF resumes, up to 10.
4. Select **Evaluate candidates** and review the ranked results.

Text is extracted from documents before evaluation. Scanned or image-only PDFs do not have OCR support and may return an extraction error.

## API

### `GET /health`

Returns the API status:

```json
{"status": "ok"}
```

### `POST /evaluate`

Accepts `multipart/form-data`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `jd` | File | Yes | `.txt`, `.pdf`, `.doc`, or `.docx` job description |
| `cvs` | File, repeated | Yes | One to 10 PDF resumes |
| `additional_requirements` | Text | No | Extra requirements appended to the JD context |

The response includes `total_cvs` and a `ranked` array. Each candidate result can include the filename, candidate name, overall match score, skills match, experience and education summaries, strengths, gaps, ATS quality score, red flags, interview questions, recruiter summary, recommendation, ranking, and any parsing or evaluation error.

Example request with `curl`:

```bash
curl -X POST http://localhost:8000/evaluate \
  -F "jd=@job-description.pdf" \
  -F "cvs=@resume-one.pdf" \
  -F "cvs=@resume-two.pdf" \
  -F "additional_requirements=Remote role; startup experience preferred"
```

## Project structure

```text
backend/
  app/
    main.py                 # FastAPI routes and upload handling
    graph/
      state.py              # LangGraph state types
      nodes.py              # Per-resume evaluation and ranking
      workflow.py           # Parallel evaluation workflow
    models/
      schemas.py            # API response models
    utils/
      pdf_parser.py         # PDF text extraction
      jd_parser.py          # Word document text extraction
      groq_client.py        # Groq prompt and API client
  requirements.txt
frontend/
  src/
    App.jsx                 # Main dashboard and evaluation state
    api.js                  # Backend API client
    components/
      UploadPanel.jsx       # JD and resume upload controls
      ResultsList.jsx       # Ranked result list
      CandidateCard.jsx     # Candidate evaluation details
      ParticleBackground.jsx # Decorative dashboard background
```

## Notes

- The Groq API key is required by the backend and should be kept in `backend/.env`; do not commit it.
- Each candidate is evaluated in a separate LLM call. Evaluation failures are returned per candidate where possible, so one failed resume does not discard the rest of the batch.
- The service does not persist uploaded documents or evaluation results in a database.
