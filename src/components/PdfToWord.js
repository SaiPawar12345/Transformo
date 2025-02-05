import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import './PdfToWord.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfToWord = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);

  // Handle navigation
  const handleBack = () => {
    navigate('/');
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  // Handle conversion process
  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setConverting(true);
      setProgress(0);
      setError(null);

      // Simulating conversion process
      for (let i = 0; i <= 100; i += 20) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create a sample Word file for demonstration
      const blob = new Blob(['Sample Word content'], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFile.name.replace('.pdf', '')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setConverting(false);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message);
      setConverting(false);
    }
  };

  return (
    <div className="word-converter">
      <button onClick={handleBack} className="word-back-button">
        ← Back to Home
      </button>
      <div className="word-converter-content">
        <div className="word-converter-card">
          <h1>Convert PDF to Word</h1>
          <p className="word-description">
            Transform your PDF documents into editable Word files
          </p>

          <div className="word-upload-section">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="word-file-input"
              id="word-file-input"
            />
            <label htmlFor="word-file-input" className="word-file-label">
              Choose PDF File
            </label>
            {selectedFile && (
              <div className="word-file-info">
                <p>{selectedFile.name}</p>
                <p className="word-file-size">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {error && <div className="word-error-message">{error}</div>}

          {selectedFile && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="word-convert-button"
            >
              {converting ? 'Converting...' : 'Convert to Word'}
            </button>
          )}

          {converting && (
            <div className="word-progress-container">
              <div
                className="word-progress-bar"
                style={{ width: `${progress}%` }}
              >
                <span className="word-progress-text">{progress}%</span>
              </div>
            </div>
          )}

          <div className="word-features">
            <h2>Features:</h2>
            <ul>
              <li>Convert PDF to editable Word format</li>
              <li>Preserve text formatting and layout</li>
              <li>Fast and accurate conversion</li>
              <li>Easy to use interface</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfToWord;
