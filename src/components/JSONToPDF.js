import React, { useState } from "react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { NavBar } from './NavBar';
import { FiUpload, FiTrash2, FiDownload } from 'react-icons/fi';
import './JSONToPDF.css';

export const JsonToPdf = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateJSON = (text) => {
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleInputChange = (e) => {
    setJsonInput(e.target.value);
    setErrorMessage('');
  };

  const handleClear = () => {
    setJsonInput('');
    setErrorMessage('');
  };

  const convertToPdf = () => {
    if (!jsonInput.trim()) {
      setErrorMessage('Please enter JSON data');
      return;
    }

    try {
      const jsonData = JSON.parse(jsonInput);
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('JSON to PDF Conversion', 14, 15);
      doc.setFontSize(10);

      // Convert JSON to table format
      const tableData = [];
      const parseObject = (obj, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                parseObject(item, `${fullKey}[${index}]`);
              } else {
                tableData.push([`${fullKey}[${index}]`, JSON.stringify(item)]);
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            parseObject(value, fullKey);
          } else {
            tableData.push([fullKey, JSON.stringify(value)]);
          }
        });
      };

      parseObject(jsonData);

      // Generate table
      doc.autoTable({
        startY: 25,
        head: [['Key', 'Value']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      // Save the PDF
      doc.save('converted-json.pdf');
    } catch (error) {
      setErrorMessage('Invalid JSON format: ' + error.message);
      return;
    }

    setLoading(true);
    try {
      // No changes needed here
    } catch (error) {
      setErrorMessage('Error generating PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compress-pdf-container">
      <NavBar />
      <div className="compress-pdf-content">
        <h2>JSON to PDF Converter</h2>
        <div className="input-container">
          <textarea
            value={jsonInput}
            onChange={handleInputChange}
            placeholder="Paste your JSON here..."
            className="json-input"
          />
        </div>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        <div className="button-container">
          <button
            onClick={convertToPdf}
            disabled={loading}
            className="convert-button"
          >
            {loading ? (
              <span>Converting...</span>
            ) : (
              <><FiDownload /> Convert to PDF</>
            )}
          </button>
          <button onClick={handleClear} className="clear-button">
            <FiTrash2 /> Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonToPdf;
