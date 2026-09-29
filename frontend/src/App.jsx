import { useRef, useState } from 'react';
import UploadPanel from './components/UploadPanel';
import ResultsList from './components/ResultsList';
import ParticleBackground from './components/ParticleBackground';
import { evaluateCVs } from './api';
import './App.css';

export default function App() {
  const heroRef = useRef(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  async function handleEvaluate(jdFile, cvFiles, additionalRequirements) {
    setIsLoading(true);
    setApiError(null);
    setResults(null);

    try {
      const data = await evaluateCVs(jdFile, cvFiles, additionalRequirements);
      setResults(data.ranked);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        'Something went wrong while evaluating candidates.';
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const evaluated = Array.isArray(results) ? results.filter((r) => !r.error) : [];
  const shortlisted = evaluated.filter((r) => r.recommendation === 'Shortlist').length;
  const averageScore = evaluated.length
    ? evaluated.reduce((sum, r) => sum + (Number(r.overall_match_score) || 0), 0) / evaluated.length
    : 0;

  function handleHeroPointerMove(event) {
    if (!heroRef.current) return;
    const bounds = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
    heroRef.current.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
  }

  return (
    <main className="app-shell">
      <ParticleBackground />
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <span className="eyebrow">AI RECRUITING SPACE</span>
        </div>

        <div
          ref={heroRef}
          className="hero-copy"
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={() => heroRef.current?.style.setProperty('--pointer-x', '-999px')}
        >
          <div>
            <h1>Find the right<br /><em>candidate faster.</em></h1>
            <p className="app-subhead">
              Upload a job description and CVs. Let AI analyze fit, surface strengths,
              and rank candidates in seconds.
            </p>
            <div className="hero-pills">
              <span>✦ AI-powered matching</span>
              <span>✓ Ranked candidates</span>
              <span>✮ Easy evaluation</span>
            </div>
          </div>

          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-core"><span>✦</span><small></small></div>
            <div className="orbit-dot dot-one" />
            <div className="orbit-dot dot-two" />
            <div className="orbit-dot dot-three" />
          </div>
        </div>
      </header>

      <section className="workspace-section">
        <div className="section-label">
         
          <div>
            <strong>BUILD YOUR REQUIREMENTS</strong>
            <small>Provide the role requirements and resumes to evaluate.</small>
          </div>
        </div>
        <UploadPanel onEvaluate={handleEvaluate} isLoading={isLoading} />
      </section>

      {isLoading && (
        <div className="status-message loading-status">
          <span className="loading-spinner" />
          <div>
            <strong>Analyzing candidates</strong>
            <span>Comparing experience, skills, education, and role fit…</span>
          </div>
        </div>
      )}

      {apiError && (
        <div className="status-message error">
          <span className="status-icon">!</span>
          <div><strong>Evaluation failed</strong><span>{apiError}</span></div>
        </div>
      )}

      {results && (
        <section className="results-section">
          <div className="section-label">
            <div>
              <strong>CANDIDATES ANALYSIS</strong>
              <small>AI-ranked results with transparent reasoning.</small>
            </div>
          </div>

          <div className="results-overview">
            <div className="results-title">
              <div>
                <span className="results-kicker">EVALUATION COMPLETE</span>
                <h2>Your candidate shortlist</h2>
              </div>
              <span className="results-count">{evaluated.length} evaluated</span>
            </div>

            <div className="overview-stats">
              <div className="overview-stat">
                <span className="stat-icon">◎</span>
                <div><strong>{results.length}</strong><span>Total CVs</span></div>
              </div>
              <div className="overview-stat">
                <span className="stat-icon">✓</span>
                <div><strong>{shortlisted}</strong><span>Shortlisted</span></div>
              </div>
              <div className="overview-stat">
                <span className="stat-icon">✦</span>
                <div><strong>{averageScore ? averageScore.toFixed(1) : '—'}</strong><span>Average match</span></div>
              </div>
            </div>
          </div>

          <ResultsList results={results} />
        </section>
      )}
    </main>
  );
}