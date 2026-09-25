import { useState } from 'react';
import './CandidateCard.css';

const RECOMMENDATION_STYLES = {
  Shortlist: 'rec-shortlist',
  Consider: 'rec-consider',
  'Not Suitable': 'rec-not-suitable',
};

function SkillsGroup({ label, skills, variant }) {
  if (!skills || skills.length === 0) return null;
  return (
    <div className="skills-group">
      <span className={`skills-group-label ${variant}`}>{label}</span>
      <div className="skills-tags">
        {skills.map((skill, i) => (
          <span key={i} className={`skill-tag ${variant}`}>{skill}</span>
        ))}
      </div>
    </div>
  );
}

function ListBlock({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="detail-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function TextBlock({ title, text }) {
  if (!text) return null;
  return (
    <div className="detail-block">
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

export default function CandidateCard({ candidate }) {
  const [expanded, setExpanded] = useState(false);

  if (candidate.error) {
    return (
      <article className="candidate-card error-card">
        <div className="card-header">
          <div className="card-header-main">
            <span className="candidate-name">{candidate.filename}</span>
          </div>
        </div>
        <p className="error-text">{candidate.error}</p>
      </article>
    );
  }

  const recClass = RECOMMENDATION_STYLES[candidate.recommendation] || '';

  return (
    <article className={`candidate-card ${candidate.is_top_3 ? 'top-pick' : ''}`}>
      <button
        type="button"
        className="card-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="card-header-main">
          {candidate.candidate_ranking && (
            <span className="rank-badge">{candidate.candidate_ranking.split(' of ')[0]}</span>
          )}
          <div>
            <span className="candidate-name">{candidate.candidate_name}</span>
            <span className="candidate-filename">{candidate.filename}</span>
          </div>
        </div>
        <div className="card-header-meta">
          {candidate.recommendation && (
            <span className={`rec-badge ${recClass}`}>{candidate.recommendation}</span>
          )}
          <span className="score-value">{candidate.overall_match_score?.toFixed(1)}<span className="score-max">/10</span></span>
          <span className="expand-icon">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      <p className="reasoning-line">{candidate.reasoning}</p>

      {expanded && (
        <div className="card-details">
          {candidate.skills_match && (
            <div className="detail-block">
              <h4>Skills match</h4>
              <SkillsGroup label="Matched" skills={candidate.skills_match.matched} variant="matched" />
              <SkillsGroup label="Partial" skills={candidate.skills_match.partial} variant="partial" />
              <SkillsGroup label="Missing" skills={candidate.skills_match.missing} variant="missing" />
            </div>
          )}

          <TextBlock title="Experience" text={candidate.experience_match} />
          <TextBlock title="Education & certifications" text={candidate.education_match} />
          <TextBlock title="Projects & achievements" text={candidate.projects_achievements_relevance} />

          <ListBlock title="Key strengths" items={candidate.key_strengths} />
          <ListBlock title="Key gaps" items={candidate.key_gaps} />

          {candidate.ats_quality_score != null && (
            <div className="detail-block">
              <h4>CV quality / ATS score</h4>
              <p>{candidate.ats_quality_score.toFixed(1)}/10</p>
            </div>
          )}

          <ListBlock title="Red flags to verify" items={candidate.red_flags} />
          <ListBlock title="Suggested interview questions" items={candidate.interview_questions} />
          <TextBlock title="Recruiter summary" text={candidate.recruiter_summary} />
        </div>
      )}
    </article>
  );
}