import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import './PdfToExcel.css';
import { useNavigate } from 'react-router-dom';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfToExcel = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);

  // Extract text from PDF
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true
      }).promise;

      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        
        // Sort items by their vertical position to maintain table structure
        const items = content.items.sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
            return a.transform[4] - b.transform[4];
          }
          return b.transform[5] - a.transform[5];
        });

        // Group items by row
        let currentY = items[0]?.transform[5];
        let currentRow = [];
        const rows = [];

        items.forEach(item => {
          if (Math.abs(item.transform[5] - currentY) > 5) {
            if (currentRow.length > 0) {
              rows.push(currentRow.join('\\t'));
              currentRow = [];
            }
            currentY = item.transform[5];
          }
          currentRow.push(item.str);
        });
        
        if (currentRow.length > 0) {
          rows.push(currentRow.join('\\t'));
        }

        fullText += rows.join('\\n') + '\\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  // Convert text to table structure
  const parseTableData = async (text) => {
    try {
      const rows = text.split('\\n').map(row => row.split('\\t'));
      return rows;
    } catch (error) {
      console.error('Error parsing table:', error);
      throw new Error('Failed to parse table structure');
    }
  };

  // Convert data to Excel
  const convertToExcel = async (data) => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Convert array of arrays to worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Auto-size columns
      const maxWidths = data.reduce((widths, row) => {
        row.forEach((cell, i) => {
          const cellWidth = cell ? cell.toString().length : 0;
          widths[i] = Math.max(widths[i] || 0, cellWidth);
        });
        return widths;
      }, []);

      worksheet['!cols'] = maxWidths.map(width => ({ wch: Math.min(50, width + 2) }));

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Table Data');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFile.name.replace('.pdf', '')}_table.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel conversion error:', error);
      throw new Error('Failed to generate Excel file');
    }
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

      // Step 1: Extract text with table structure
      setProgress(30);
      const text = await extractTextFromPDF(selectedFile);
      if (!text) {
        throw new Error('No text could be extracted from the PDF');
      }

      // Step 2: Parse table structure
      setProgress(60);
      const tableData = await parseTableData(text);
      if (!tableData || tableData.length === 0) {
        throw new Error('No table data could be extracted');
      }

      // Step 3: Convert to Excel
      setProgress(90);
      await convertToExcel(tableData);

      setProgress(100);
      setConverting(false);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message);
      setConverting(false);
    }
  };

  // Handle navigation
  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="excel-converter">
      <button onClick={handleBack} className="excel-back-button">
        ← Back to Home
      </button>
      <div className="excel-converter-content">
        <div className="excel-converter-card">
          <h1>Convert PDF to Excel</h1>
          <p className="excel-description">
            Transform your PDF tables into Excel spreadsheets
          </p>

          <div className="excel-upload-section">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="excel-file-input"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="excel-file-label">
              Choose PDF File
            </label>
            {selectedFile && (
              <div className="excel-file-info">
                <p>{selectedFile.name}</p>
                <p className="excel-file-size">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {error && <div className="excel-error-message">{error}</div>}

          {selectedFile && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="excel-convert-button"
            >
              {converting ? 'Converting...' : 'Convert to Excel'}
            </button>
          )}

          {converting && (
            <div className="excel-progress-container">
              <div
                className="excel-progress-bar"
                style={{ width: `${progress}%` }}
              >
                <span className="excel-progress-text">{progress}%</span>
              </div>
            </div>
          )}

          <div className="excel-features">
            <h2>Features:</h2>
            <ul>
              <li>Extract tables from PDF documents</li>
              <li>Preserve table structure and formatting</li>
              <li>Generate clean Excel spreadsheets</li>
              <li>Auto-sized columns for better readability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfToExcel;