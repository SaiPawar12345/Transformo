import React, { useState } from 'react';
import { NavBar } from './NavBar';
import { FiUpload, FiDownload } from 'react-icons/fi';
import './JSONToCSV.css';

const JSONToCSV = () => {
  const [jsonContent, setJsonContent] = useState(null);
  const [csvOutput, setCsvOutput] = useState('');
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to convert JSON to CSV
  const convertToCSV = (jsonData) => {
    try {
      // Parse JSON if it's a string
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      // Handle different JSON structures
      let arrayData = [];
      if (Array.isArray(data)) {
        arrayData = data;
      } else if (typeof data === 'object' && data !== null) {
        // If it's a single object, wrap it in an array
        arrayData = [data];
      } else {
        throw new Error('Invalid JSON structure. Expected an object or array of objects.');
      }

      if (arrayData.length === 0) {
        throw new Error('No data to convert.');
      }

      // Get all possible headers from all objects
      const headers = new Set();
      arrayData.forEach(obj => {
        const collectHeaders = (obj, prefix = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              // For nested objects, recursively collect headers
              collectHeaders(value, fullKey);
            } else {
              headers.add(fullKey);
            }
          });
        };
        collectHeaders(obj);
      });

      const headerRow = Array.from(headers);

      // Convert data to CSV rows
      const rows = arrayData.map(obj => {
        return headerRow.map(header => {
          const getValue = (obj, path) => {
            const parts = path.split('.');
            let value = obj;
            for (const part of parts) {
              if (value === null || value === undefined) return '';
              value = value[part];
            }
            if (value === null || value === undefined) return '';
            if (Array.isArray(value)) return JSON.stringify(value);
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).replace(/"/g, '""');
          };

          const value = getValue(obj, header);
          return `"${value}"`;
        });
      });

      // Combine headers and rows
      const csvContent = [
        headerRow.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.join(','))
      ].join('\\n');

      return csvContent;
    } catch (error) {
      throw new Error(`Failed to convert JSON to CSV: ${error.message}`);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    setCsvOutput('');
    
    if (file) {
      if (!file.name.toLowerCase().endsWith('.json')) {
        setError('Please select a valid JSON file');
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          // Validate JSON
          JSON.parse(content);
          setJsonContent(content);
          setError(null);
        } catch (error) {
          console.error('Parse error:', error);
          setError('Invalid JSON format. Please check your file content.');
          setJsonContent(null);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file. Please try again.');
        setJsonContent(null);
      };
      
      reader.readAsText(file);
    }
  };

  const handleConversion = () => {
    if (!jsonContent) {
      setError('Please upload a JSON file first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csv = convertToCSV(jsonContent);
      setCsvOutput(csv);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message);
      setCsvOutput('');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!csvOutput) return;
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.json', '.csv');
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
            <h2>JSON to CSV Converter</h2>
            <p>Convert your JSON files to CSV format</p>
          </div>
          
          <div className="drop-zone">
            <div className="icon-container">
              <input 
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input">
                <FiUpload size={50} />
                <p>Drag & Drop JSON file here or click to browse</p>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {jsonContent && !error && (
            <div className="button-container">
              <button 
                onClick={handleConversion} 
                className="convert-button"
                disabled={loading}
              >
                {loading ? 'Converting...' : 'Convert to CSV'}
              </button>
            </div>
          )}

          {csvOutput && !error && (
            <div className="output-container">
              <div className="output-header">
                <h3>CSV Output</h3>
                <button 
                  onClick={downloadCSV} 
                  className="download-button"
                >
                  <FiDownload size={20} />
                  Download CSV
                </button>
              </div>
              <pre className="csv-output">
                {csvOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JSONToCSV;