import React, { useState } from 'react';
import { NavBar } from './NavBar';
import { FiUpload, FiDownload, FiFile } from 'react-icons/fi';
import './PdfToDocs.css';

const CSVToJSON = () => {
  const [csvInput, setCsvInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  const convertCsvToJson = () => {
    try {
      setError(null);
      // Split the CSV into rows
      const rows = csvInput.trim().split('\n');
      
      if (rows.length < 2) {
        throw new Error('CSV must contain at least a header row and one data row');
      }

      // Extract headers (first row)
      const headers = rows[0].split(',').map(header => 
        header.replace(/^"(.*)"$/, '$1').trim()
      );

      // Parse data rows
      const jsonData = rows.slice(1).map(row => {
        // Split the row, handling quoted values with commas
        const values = [];
        let currentValue = '';
        let isInQuotes = false;

        for (let char of row) {
          if (char === '"') {
            isInQuotes = !isInQuotes;
          } else if (char === ',' && !isInQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        // Create object mapping headers to values
        const rowObject = {};
        headers.forEach((header, index) => {
          // Remove surrounding quotes and trim
          let value = values[index] || '';
          value = value.replace(/^"(.*)"$/, '$1').trim();

          // Try to parse number or boolean
          if (value.toLowerCase() === 'true') value = true;
          else if (value.toLowerCase() === 'false') value = false;
          else if (!isNaN(value) && value !== '') value = Number(value);

          rowObject[header] = value;
        });

        return rowObject;
      });

      // Convert to formatted JSON
      setJsonOutput(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      setError(error.message);
      setJsonOutput('');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a valid CSV file');
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setCsvInput(content);
        } catch (error) {
          console.error('Parse error:', error);
          setError('Invalid CSV format. Please check your file content.');
          setCsvInput('');
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file. Please try again.');
        setCsvInput('');
      };
      
      reader.readAsText(file);
    }
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    
    const blob = new Blob([jsonOutput], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.csv', '.json');
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
            <h2>CSV to JSON Converter</h2>
            <p>Convert your CSV files to JSON format</p>
          </div>
          
          <div className="drop-zone">
            <div className="icon-container">
              <input 
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input">
                <FiUpload size={50} />
                <p>Drag & Drop CSV file here or click to browse</p>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {csvInput && !error && (
            <div className="button-container">
              <button 
                onClick={convertCsvToJson} 
                className="convert-button"
              >
                Convert to JSON
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

export default CSVToJSON;