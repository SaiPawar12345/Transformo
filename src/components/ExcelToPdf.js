import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ExcelToPdf = () => {
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
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 file.type === 'application/vnd.ms-excel' ||
                 file.name.endsWith('.xlsx') || 
                 file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid Excel file (.xlsx or .xls)');
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const doc = new jsPDF();
          
          // Add title
          doc.setFontSize(16);
          doc.setTextColor(108, 92, 231);
          doc.text('Excel to PDF Conversion', 14, 15);
          doc.setFontSize(10);
          doc.setTextColor(0);

          // Generate table
          doc.autoTable({
            startY: 25,
            head: [jsonData[0]], // First row as headers
            body: jsonData.slice(1), // Rest of the rows as data
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [108, 92, 231],
              textColor: 255,
              fontSize: 9,
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [248, 247, 255],
            },
          });

          // Save the PDF
          doc.save(selectedFile.name.replace(/\.(xlsx|xls)$/, '.pdf'));
          setProgress(100);
        } catch (err) {
          setError('Error converting file: ' + err.message);
        } finally {
          setConverting(false);
        }
      };

      reader.onerror = () => {
        setError('Error reading file');
        setConverting(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setError('Error converting file: ' + err.message);
      setConverting(false);
    }
  };

  return (
    <div className="container">
      <button onClick={handleBack} className="back-button">
        ← Back to Home
      </button>

      <div className="converter-card">
        <h1>Convert Excel to PDF</h1>
        <p className="subtitle">Transform your Excel spreadsheets into PDF documents</p>

        <div className="upload-section">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          <label htmlFor="file-input" className="choose-file-button">
            Choose Excel File
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
              Preserve table formatting
            </div>
            <div className="feature-item">
              Support for XLSX/XLS
            </div>
            <div className="feature-item">
              Maintain data integrity
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

export default ExcelToPdf;
