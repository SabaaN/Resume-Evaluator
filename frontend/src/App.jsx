import { useState } from 'react';
import UploadPanel from './components/UploadPanel';
import ResultsList from './components/ResultsList';
import { evaluateCVs } from './api';
import './App.css';

export default function App() {
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

  return (
    <main>
      <header className="app-header">
        <h1>Resume Evaluator</h1>
        <p className="app-subhead">Upload a job description and up to 10 CVs to rank candidates by fit.</p>
      </header>

      <UploadPanel onEvaluate={handleEvaluate} isLoading={isLoading} />

      {isLoading && (
        <p className="status-message">Evaluating candidates — this can take a moment for larger batches…</p>
      )}

      {apiError && (
        <p className="status-message error">{apiError}</p>
      )}

      <ResultsList results={results} />
    </main>
  );
}