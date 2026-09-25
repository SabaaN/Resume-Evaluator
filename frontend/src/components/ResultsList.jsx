import CandidateCard from './CandidateCard';
import './ResultsList.css';

export default function ResultsList({ results }) {
  if (!results || results.length === 0) return null;

  return (
    <section className="results-list">
      <h2 className="results-heading">Results</h2>
      <p className="results-subheading">
        {results.length} candidate{results.length !== 1 ? 's' : ''} evaluated, ranked by overall match.
      </p>
      <div className="results-items">
        {results.map((candidate, i) => (
          <CandidateCard key={`${candidate.filename}-${i}`} candidate={candidate} />
        ))}
      </div>
    </section>
  );
} 