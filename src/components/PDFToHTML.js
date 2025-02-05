import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PDFToHTML.css';

const PDFToHTML = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleConversion = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file first');
      return;
    }

    setConverting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5006/api/convert/pdf-to-html', formData, {
        responseType: 'blob',
      });

      // Create a download link for the converted file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedFile.name.replace('.pdf', '')}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error converting PDF:', error);
      alert('Error converting PDF. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleChooseFile = () => {
    document.getElementById('fileInput').click();
  };

  return (
    <div className="pdf-to-html-container">
      <button className="back-button" onClick={handleBack}>
        ← Back to Home
      </button>

      <div className="converter-card">
        <h1>Convert PDF to HTML</h1>
        <p className="subtitle">Transform your PDF documents into editable HTML files</p>

        <input
          type="file"
          id="fileInput"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button 
          className="choose-file-button"
          onClick={handleChooseFile}
          disabled={converting}
        >
          Choose PDF File
        </button>

        {selectedFile && (
          <div className="selected-file">
            Selected: {selectedFile.name}
          </div>
        )}

        <div className="features-section">
          <h2>Features:</h2>
          <div className="features-grid">
            <div className="feature-item">
              Convert PDF to editable HTML format
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

        {converting && (
          <div className="converting-message">
            Converting... Please wait
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFToHTML;
