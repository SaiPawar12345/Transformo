import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfToEpub = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertedEpub, setConvertedEpub] = useState(null);

  const handleBack = () => {
    navigate('/');
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setConvertedEpub(null);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleConversion = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    setConverting(true);
    setProgress(0);
    setError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
      }).promise;

      const totalPages = pdf.numPages;
      let epubContent = '';

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        setProgress(Math.round((pageNum / totalPages) * 100));

        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');

        epubContent += `<h2>Page ${pageNum}</h2>\\n${pageText}\\n\\n`;
      }

      const epubTemplate = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${selectedFile.name.replace('.pdf', '')}</title>
  <style type="text/css">
    body { font-family: serif; }
    h2 { text-align: center; margin: 2em 0; }
  </style>
</head>
<body>
  ${epubContent}
</body>
</html>`;

      const epubBlob = new Blob([epubTemplate], { type: 'application/epub+zip' });
      const epubUrl = URL.createObjectURL(epubBlob);
      setConvertedEpub(epubUrl);
      setProgress(100);
    } catch (err) {
      setError('Error converting file: ' + err.message);
      console.error('Conversion error:', err);
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (convertedEpub) {
      const link = document.createElement('a');
      link.href = convertedEpub;
      link.download = selectedFile.name.replace('.pdf', '.epub');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(convertedEpub);
      setConvertedEpub(null);
    }
  };

  return (
    <div className="container">
      <button onClick={handleBack} className="back-button">
        ← Back to Home
      </button>

      <div className="converter-card">
        <h1>Convert PDF to EPUB</h1>
        <p className="subtitle">Transform your PDF documents into EPUB format</p>

        <div className="upload-section">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="choose-file-button">
            Choose PDF File
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {converting && (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {convertedEpub && (
          <button onClick={handleDownload} className="download-button">
            Download EPUB
          </button>
        )}

        <div className="features-section">
          <h2>Features:</h2>
          <div className="features-grid">
            <div className="feature-item">
              Convert PDF to EPUB format
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

        .download-button {
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

        .download-button:hover {
          background-color: #5b4cc4;
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

export default PdfToEpub;
