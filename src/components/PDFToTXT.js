import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import './PDFToTXT.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToTXT = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertedText, setConvertedText] = useState('');

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
      setConvertedText('');
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  // Extract text from PDF page with formatting
  const extractTextFromPage = async (pdf, pageNumber) => {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    let lastY, text = '';
    const lineSpacing = 5;
    let currentIndent = 0;
    let maxLineLength = 80; // Maximum characters per line

    // Sort items by vertical position (top to bottom) and horizontal position (left to right)
    const sortedItems = textContent.items
      .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

    // Group items by lines based on Y position
    const lines = [];
    let currentLine = [];
    
    sortedItems.forEach((item) => {
      if (currentLine.length === 0) {
        currentLine.push(item);
      } else {
        const lastItem = currentLine[currentLine.length - 1];
        const yDiff = Math.abs(item.transform[5] - lastItem.transform[5]);
        
        if (yDiff <= lineSpacing) {
          currentLine.push(item);
        } else {
          lines.push([...currentLine]);
          currentLine = [item];
        }
      }
    });
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Process each line
    lines.forEach((line, lineIndex) => {
      // Calculate line properties
      const xStart = Math.min(...line.map(item => item.transform[4]));
      const pageWidth = viewport.width;
      const lineWidth = Math.max(...line.map(item => item.transform[4] + item.width)) - xStart;
      
      // Determine alignment and indentation
      const relativeStart = xStart / pageWidth;
      const relativeWidth = lineWidth / pageWidth;
      
      // Add appropriate spacing before line
      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1];
        const yDiff = Math.abs(line[0].transform[5] - prevLine[0].transform[5]);
        
        if (yDiff > lineSpacing * 3) {
          text += '\n\n'; // Double line break for paragraphs
        } else {
          text += '\n'; // Single line break for lines
        }
      }

      // Calculate indentation
      const indentLevel = Math.round(relativeStart * 10);
      const indent = ' '.repeat(indentLevel * 2);

      // Add indentation
      text += indent;

      // Center text if it appears to be centered on the page
      if (relativeStart > 0.2 && relativeStart + relativeWidth < 0.8) {
        const padding = Math.floor((maxLineLength - line.reduce((acc, item) => acc + item.str.length, 0)) / 2);
        if (padding > 0) {
          text += ' '.repeat(padding);
        }
      }

      // Add the text content
      line.forEach((item, index) => {
        // Add space between words
        if (index > 0) {
          const prevItem = line[index - 1];
          const wordSpacing = item.transform[4] - (prevItem.transform[4] + prevItem.width);
          if (wordSpacing > item.width * 0.3) { // If space is wider than 30% of the average character width
            text += ' ';
          }
        }

        text += item.str;
      });
    });

    return text;
  };

  // Download text file
  const downloadTextFile = (text, fileName) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.replace('.pdf', '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handle conversion process
  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setConverting(true);
      setProgress(0);
      setError(null);
      setConvertedText('');

      // Load the PDF document
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      let extractedText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Update progress
        const currentProgress = Math.round(((pageNum - 1) / totalPages) * 100);
        setProgress(currentProgress);

        // Add page header
        extractedText += `${'='.repeat(80)}\n`;
        extractedText += `${' '.repeat(35)}Page ${pageNum}\n`;
        extractedText += `${'='.repeat(80)}\n\n`;

        // Extract text from current page
        const pageText = await extractTextFromPage(pdf, pageNum);
        extractedText += pageText + '\n\n';
      }

      setConvertedText(extractedText);
      setProgress(100);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="txt-converter">
      <button onClick={handleBack} className="txt-back-button">
        ← Back to Home
      </button>
      <div className="txt-converter-content">
        <div className="txt-converter-card">
          <h1>Convert PDF to TXT</h1>
          <p className="txt-description">
            Extract text from your PDF files while preserving layout
          </p>

          <div className="txt-upload-section">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="txt-file-input"
              id="txt-file-input"
            />
            <label htmlFor="txt-file-input" className="txt-file-label">
              Choose PDF File
            </label>
            {selectedFile && (
              <div className="txt-file-info">
                <p>{selectedFile.name}</p>
                <p className="txt-file-size">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {error && <div className="txt-error-message">{error}</div>}

          {selectedFile && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="txt-convert-button"
            >
              {converting ? 'Converting...' : 'Convert to TXT'}
            </button>
          )}

          {converting && (
            <div className="txt-progress-container">
              <div
                className="txt-progress-bar"
                style={{ width: `${progress}%` }}
              >
                <span className="txt-progress-text">{progress}%</span>
              </div>
            </div>
          )}

          {convertedText && (
            <div className="txt-results">
              <div className="txt-preview">
                <h3>Preview:</h3>
                <div className="txt-preview-content">
                  <pre>{convertedText.slice(0, 1000)}
                    {convertedText.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
              <button
                onClick={() => downloadTextFile(convertedText, selectedFile.name)}
                className="txt-download-button"
              >
                Download TXT File
              </button>
            </div>
          )}

          <div className="txt-features">
            <h2>Features:</h2>
            <ul>
              <li>Preserve indentation</li>
              <li>Maintain alignment</li>
              <li>Keep paragraphs</li>
              <li>Clean formatting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFToTXT;