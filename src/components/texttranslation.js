import React, { useState } from 'react';
import axios from 'axios';
import './texttranslation.css'; // Ensure the path to the CSS file is correct

const DocumentTranslator = () => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('es');
  const [status, setStatus] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  const languageOptions = [
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'bn', label: 'Bengali' },
    { value: 'te', label: 'Telugu' },
    { value: 'mr', label: 'Marathi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'kn', label: 'Kannada' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'pa', label: 'Punjabi' },
    { value: 'or', label: 'Odia' },
    { value: 'as', label: 'Assamese' },
    { value: 'ur', label: 'Urdu' },
    { value: 'hi', label: 'Hindi' },
    { value: 'mr', label: 'Marathi' },
    { value: 'sa', label: 'Sanskrit' }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatus('');
    setDownloadLink('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setStatus('Please select a DOCX file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setStatus('Translating...');

        const response = await axios.post('http://127.0.0.1:5001/upload', {
          file: event.target.result,
          language: language
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.file_url) {
          setDownloadLink(response.data.file_url);
          setStatus('');
        } else {
          setStatus(response.data.error || 'Translation failed');
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="doc-translator-body">
      <div className="doc-translator-form-container">
        <h1 className="doc-translator-title">Document Translator</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="docxFile" className="doc-translator-label">Select DOCX File</label>
            <input 
              className="doc-translator-input"
              type="file" 
              id="docxFile"
              accept=".docx"
              onChange={handleFileChange}
              required 
            />
          </div>

          <div>
            <label htmlFor="targetLanguage" className="doc-translator-label">Target Language</label>
            <select 
              className="doc-translator-select"
              id="targetLanguage"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="doc-translator-button"
            type="submit" 
            disabled={!file}
          >
            Translate Document
          </button>
        </form>

        {status && (
          <div className="doc-translator-status-message">
            {status}
          </div>
        )}

        {downloadLink && (
          <div className="doc-translator-download-link">
            <a 
              href={downloadLink} 
              download={`translated_document_${language}.docx`}
            >
              Download Translated Document
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTranslator;
