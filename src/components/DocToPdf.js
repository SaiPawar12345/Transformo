import React, { useState } from "react";
import axios from "axios";
import './DocToPdf.css';
import { NavBar } from './NavBar'; // Import the NavBar component
import { FiUpload } from 'react-icons/fi';

const DocToPdf = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    // Validate file type
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.docx')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Please select a valid .docx file");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a .docx file.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5002/upload", formData, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 seconds timeout
      });

      // Create a link to download the PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${file.name.replace('.docx', '.pdf')}`
      );
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Conversion error:", err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        const errorData = await err.response.data.text();
        setError(`Server Error: ${errorData || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Please check if the server is running.");
      } else {
        // Something happened in setting up the request
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <NavBar /> {/* Add the NavBar here */}
      <div className="doc-to-pdf-container_1">
        <div className="merge-content">
          <div className="merge-header">
            <h2 className="doc-to-pdf-header_2">DOCX to PDF</h2>
            <p>Convert your Word documents to PDF format</p>
          </div>
          
          <div className="drop-zone">
            <div className="icon-container">
              <input 
                type="file" 
                accept=".docx" 
                onChange={handleFileChange}
                className="doc-to-pdf-input_3"
                id="file-input"
              />
              <label htmlFor="file-input">
                <FiUpload size={50} />
                <p>Drag & Drop DOCX files here or click to browse</p>
              </label>
            </div>
          </div>
          
          {loading && (
            <div className="doc-to-pdf-progress-container_5">
              <div 
                className="doc-to-pdf-progress-fill_6"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button 
            onClick={handleUpload} 
            disabled={loading || !file}
            className="doc-to-pdf-button_4"
          >
            {loading ? "Converting..." : "Convert to PDF"}
          </button>

          {error && (
            <p className="doc-to-pdf-error_7">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocToPdf;