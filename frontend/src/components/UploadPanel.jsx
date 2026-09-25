import { useState, useRef } from 'react';
import './UploadPanel.css';

const MAX_CVS = 10;

export default function UploadPanel({ onEvaluate, isLoading }) {
    const [jdFile, setJdFile] = useState(null);
    const [cvFiles, setCvFiles] = useState([]);
    const [validationError, setValidationError] = useState(null);
    const [additionalRequirements, setAdditionalRequirements] = useState('');

    const jdInputRef = useRef(null);
    const cvInputRef = useRef(null);

    function handleJdChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.txt')) {
            setValidationError('Job description must be a .txt file.');
            return;
        }
        setValidationError(null);
        setJdFile(file);
    }

    function handleCvChange(e) {
        const incoming = Array.from(e.target.files);
        const nonPdf = incoming.find((f) => !f.name.toLowerCase().endsWith('.pdf'));
        if (nonPdf) {
            setValidationError(`"${nonPdf.name}" is not a PDF.`);
            return;
        }

        const combined = [...cvFiles, ...incoming];
        if (combined.length > MAX_CVS) {
            setValidationError(`You can upload up to ${MAX_CVS} CVs (you selected ${combined.length}).`);
            return;
        }

        setValidationError(null);
        setCvFiles(combined);
        cvInputRef.current.value = '';
    }

    function removeCv(index) {
        setCvFiles(cvFiles.filter((_, i) => i !== index));
    }

    function handleSubmit() {
  if (!jdFile) return setValidationError('Add a job description before evaluating.');
  if (cvFiles.length === 0) return setValidationError('Add at least one CV before evaluating.');
  setValidationError(null);
  onEvaluate(jdFile, cvFiles, additionalRequirements.trim());
}

    return (
        <section className="upload-panel">
            <div className="upload-row">
                <label className="upload-label">Job description</label>
                <div className="upload-dropzone" onClick={() => jdInputRef.current.click()}>
                    {jdFile ? (
                        <span className="file-chip">{jdFile.name}</span>
                    ) : (
                        <span className="dropzone-hint">Click to choose a .txt file</span>
                    )}
                </div>
                <input
                    ref={jdInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleJdChange}
                    hidden
                />
            </div>

            <div className="upload-row">
                <label className="upload-label" htmlFor="additional-requirements">
                    Additional requirements
                    <span className="upload-optional">Optional</span>
                </label>
                <textarea
                    id="additional-requirements"
                    className="requirements-textarea"
                    placeholder="Add anything missing from the JD e.g. must be willing to relocate, prefer candidates with startup experience, remote-only, etc."
                    value={additionalRequirements}
                    onChange={(e) => setAdditionalRequirements(e.target.value)}
                    rows={3}
                />
            </div>

            <div className="upload-row">
                <label className="upload-label">
                    Candidate CVs
                    <span className="upload-count">{cvFiles.length}/{MAX_CVS}</span>
                </label>
                <div
                    className="upload-dropzone"
                    onClick={() => cvFiles.length < MAX_CVS && cvInputRef.current.click()}
                >
                    <span className="dropzone-hint">
                        {cvFiles.length < MAX_CVS ? 'Click to add PDF resumes' : 'Maximum reached'}
                    </span>
                </div>
                <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleCvChange}
                    hidden
                />

                {cvFiles.length > 0 && (
                    <ul className="file-list">
                        {cvFiles.map((file, i) => (
                            <li key={`${file.name}-${i}`} className="file-list-item">
                                <span>{file.name}</span>
                                <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeCv(i)}
                                    aria-label={`Remove ${file.name}`}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {validationError && <p className="validation-error">{validationError}</p>}

            <button
                type="button"
                className="evaluate-btn"
                onClick={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? 'Evaluating…' : 'Evaluate candidates'}
            </button>
        </section>
    );
}