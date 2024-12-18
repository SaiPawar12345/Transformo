import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { NavBar } from './NavBar';
import { FiUpload, FiDownload } from 'react-icons/fi';
import './PDFToJSON.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToJSON = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const extractPDFContent = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF file first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read PDF file
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extract content from all pages
      const pagesContent = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text and structure
        const pageText = textContent.items
          .map(item => item.str)
          .filter(text => text.trim() !== '')
          .join(' ');

        pagesContent.push({
          pageNumber: pageNum,
          text: pageText,
          wordCount: pageText.split(/\s+/).length,
          characters: pageText.length
        });
      }

      // Create a structured JSON output
      const pdfJson = {
        fileName: pdfFile.name,
        totalPages: pdf.numPages,
        pages: pagesContent,
        metadata: await pdf.getMetadata().catch(() => ({}))
      };

      // Format and set JSON output
      setJsonOutput(JSON.stringify(pdfJson, null, 2));
      setError(null);
    } catch (error) {
      console.error('PDF parsing error:', error);
      setError('Error parsing PDF. Please make sure the file is not corrupted and try again.');
      setJsonOutput('');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    setJsonOutput('');
    
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a valid PDF file');
        setPdfFile(null);
        return;
      }
      
      setFileName(file.name);
      setPdfFile(file);
    }
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    
    const blob = new Blob([jsonOutput], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.pdf', '.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <NavBar />
      <div className="converter-container">
        <div className="converter-content">
          <div className="converter-header">
            <h2>PDF to JSON Converter</h2>
            <p>Convert your PDF files to structured JSON format</p>
          </div>
          
          <div className="drop-zone">
            <div className="icon-container">
              <input 
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input">
                <FiUpload size={50} />
                <p>Drag & Drop PDF file here or click to browse</p>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {pdfFile && !error && (
            <div className="button-container">
              <button 
                onClick={extractPDFContent} 
                className="convert-button"
                disabled={loading}
              >
                {loading ? 'Converting...' : 'Convert to JSON'}
              </button>
            </div>
          )}

          {jsonOutput && !error && (
            <div className="output-container">
              <div className="output-header">
                <h3>JSON Output</h3>
                <button 
                  onClick={downloadJson} 
                  className="download-button"
                >
                  <FiDownload size={20} />
                  Download JSON
                </button>
              </div>
              <pre className="json-output">
                {jsonOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PDFToJSON;