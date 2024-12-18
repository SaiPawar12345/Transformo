import React, { useState } from "react";
import { NavBar } from './NavBar';
import { FiUpload, FiDownload } from 'react-icons/fi';
import "./JSONToXML.css";

const JsonToXmlConverter = () => {
  const [jsonContent, setJsonContent] = useState(null);
  const [xmlOutput, setXmlOutput] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to convert JSON to XML manually
  const jsonToXML = (obj) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    const addIndentation = (level) => {
      return "  ".repeat(level);
    };

    const convertToXml = (obj, parentKey = "root", level = 0) => {
      let xmlString = "";
      
      if (Array.isArray(obj)) {
        // Handle arrays
        obj.forEach((item, index) => {
          xmlString += `${addIndentation(level)}<${parentKey}>\n`;
          if (typeof item === "object" && item !== null) {
            xmlString += convertToXml(item, "item", level + 1);
          } else {
            xmlString += `${addIndentation(level + 1)}<item>${item}</item>\n`;
          }
          xmlString += `${addIndentation(level)}</${parentKey}>\n`;
        });
      } else if (typeof obj === "object" && obj !== null) {
        // Handle objects
        xmlString += `${addIndentation(level)}<${parentKey}>\n`;
        for (let key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === "object" && value !== null) {
              xmlString += convertToXml(value, key, level + 1);
            } else {
              xmlString += `${addIndentation(level + 1)}<${key}>${value}</${key}>\n`;
            }
          }
        }
        xmlString += `${addIndentation(level)}</${parentKey}>\n`;
      } else {
        // Handle primitive values
        xmlString += `${addIndentation(level)}<${parentKey}>${obj}</${parentKey}>\n`;
      }
      
      return xmlString;
    };

    xml += convertToXml(obj);
    return xml;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    setXmlOutput(null);
    
    if (file) {
      if (!file.name.toLowerCase().endsWith('.json')) {
        setError("Please select a valid JSON file");
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const parsedJson = JSON.parse(content);
          
          if (Object.keys(parsedJson).length === 0) {
            setError("The JSON file appears to be empty. Please provide valid JSON content.");
            setJsonContent(null);
            return;
          }
          
          setJsonContent(parsedJson);
          setError(null);
        } catch (error) {
          console.error('Parse error:', error);
          setError("Invalid JSON format. Please check your file content.");
          setJsonContent(null);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file. Please try again.");
        setJsonContent(null);
      };
      
      reader.readAsText(file);
    }
  };

  const convertToXml = () => {
    if (!jsonContent) {
      setError("Please upload a valid JSON file first.");
      return;
    }

    try {
      setLoading(true);
      const xml = jsonToXML(jsonContent);
      setXmlOutput(xml);
      setError(null);
    } catch (error) {
      console.error('Conversion error:', error);
      setError("Error converting JSON to XML. Please check your JSON structure.");
      setXmlOutput(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadXml = () => {
    if (!xmlOutput) return;
    
    const blob = new Blob([xmlOutput], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.json', '.xml');
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
            <h2>JSON to XML</h2>
            <p>Convert your JSON files to XML format</p>
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
                onClick={convertToXml} 
                className="convert-button"
                disabled={loading}
              >
                {loading ? "Converting..." : "Convert to XML"}
              </button>
            </div>
          )}

          {xmlOutput && !error && (
            <div className="output-container">
              <div className="output-header">
                <h3>XML Output</h3>
                <button 
                  onClick={downloadXml} 
                  className="download-button"
                >
                  <FiDownload size={20} />
                  Download XML
                </button>
              </div>
              <pre className="xml-output">
                {xmlOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JsonToXmlConverter;