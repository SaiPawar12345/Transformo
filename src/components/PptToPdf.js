import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PptToPdf = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBack = () => {
    navigate('/');
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
                 file.type === 'application/vnd.ms-powerpoint' ||
                 file.name.endsWith('.pptx') || 
                 file.name.endsWith('.ppt'))) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PowerPoint file (.pptx or .ppt)');
      setSelectedFile(null);
    }
  };

  const handleConversion = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setConverting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('http://localhost:5000/upload/ppt-to-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedFile.name.replace(/\.(pptx|ppt)$/, '')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setTimeout(() => {
        setProgress(0);
        setSelectedFile(null);
      }, 2000);
    } catch (err) {
      setError('Error converting file. Please try again.');
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="container">
      <button onClick={handleBack} className="back-button">
        ← Back to Home
      </button>

      <div className="converter-card">
        <h1>Convert PowerPoint to PDF</h1>
        <p className="subtitle">Transform your PowerPoint presentations into PDF documents</p>

        <div className="upload-section">
          <input
            type="file"
            accept=".pptx,.ppt"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="choose-file-button">
            Choose PowerPoint File
          </label>
          {selectedFile && (
            <p className="file-name">{selectedFile.name}</p>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {converting && (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {selectedFile && !converting && (
          <button onClick={handleConversion} className="convert-button">
            Convert to PDF
          </button>
        )}

        <div className="features-section">
          <h2>Features:</h2>
          <div className="features-grid">
            <div className="feature-item">
              Support for PPTX/PPT
            </div>
            <div className="feature-item">
              Preserve animations
            </div>
            <div className="feature-item">
              Maintain formatting
            </div>
            <div className="feature-item">
              High-quality output
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #1a1a1a;
          padding: 20px;
          position: relative;
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-size: 16px;
          padding: 10px;
        }

        .back-button:hover {
          text-decoration: underline;
        }

        .converter-card {
          background: white;
          border-radius: 24px;
          padding: 48px;
          width: 100%;
          max-width: 800px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
          color: #6c5ce7;
          font-size: 36px;
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .subtitle {
          color: #666;
          font-size: 16px;
          margin-bottom: 32px;
        }

        .upload-section {
          margin: 32px 0;
        }

        .file-input {
          display: none;
        }

        .choose-file-button {
          background-color: #6c5ce7;
          color: white;
          padding: 12px 32px;
          border-radius: 50px;
          cursor: pointer;
          display: inline-block;
          font-size: 16px;
          transition: background-color 0.2s;
        }

        .choose-file-button:hover {
          background-color: #5b4cc4;
        }

        .file-name {
          margin-top: 12px;
          color: #666;
        }

        .convert-button {
          background-color: #6c5ce7;
          color: white;
          padding: 12px 32px;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-size: 16px;
          margin: 20px 0;
          transition: background-color 0.2s;
        }

        .convert-button:hover {
          background-color: #5b4cc4;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin: 20px 0;
        }

        .progress {
          height: 100%;
          background-color: #6c5ce7;
          transition: width 0.3s ease;
        }

        .error-message {
          color: #ff4757;
          background-color: #ffe0e3;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .features-section {
          margin-top: 48px;
          text-align: left;
        }

        .features-section h2 {
          color: #6c5ce7;
          font-size: 20px;
          margin-bottom: 24px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .feature-item {
          background-color: #f8f7ff;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          color: #666;
          font-size: 15px;
        }

        @media (max-width: 600px) {
          .converter-card {
            padding: 24px;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default PptToPdf;
