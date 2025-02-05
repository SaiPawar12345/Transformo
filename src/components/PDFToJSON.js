import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import './PDFToJSON.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToJSON = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);

  const handleBack = () => navigate('/');

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

  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setConverting(true);
      setError(null);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
      }).promise;

      const documentData = {
        title: selectedFile.name,
        totalPages: pdf.numPages,
        pages: []
      };

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        documentData.pages.push({
          pageNumber: pageNum,
          content: textContent.items.map(item => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            fontSize: item.fontSize,
            fontName: item.fontName
          }))
        });
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(documentData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFile.name.replace('.pdf', '')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Conversion error:', error);
      setError('Error converting PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="converter-container">
      <button onClick={handleBack} className="back-button">
        ← Back to Home
      </button>

      <div className="converter-card">
        <h1>Convert PDF to JSON</h1>
        <p className="subtitle">Transform your PDF documents into structured JSON files</p>

        <div className="upload-section">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="file-input"
            id="pdf-file-input"
          />
          <label htmlFor="pdf-file-input" className="choose-file-button">
            Choose PDF File
          </label>

          {selectedFile && (
            <div className="file-info">
              <p>{selectedFile.name}</p>
              <p className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {selectedFile && (
          <button
            onClick={handleConvert}
            disabled={converting}
            className="convert-button"
          >
            {converting ? 'Converting...' : 'Convert to JSON'}
          </button>
        )}

        <div className="features-section">
          <h2>Features:</h2>
          <div className="features-grid">
            <div className="feature-item">
              Convert PDF to editable JSON format
            </div>
            <div className="feature-item">
              Preserve text formatting and layout
            </div>
            <div className="feature-item">
              Fast and accurate conversion
            </div>
            <div className="feature-item">
              Easy to use interface
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFToJSON;