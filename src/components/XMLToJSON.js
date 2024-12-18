import React, { useState } from "react";
import { NavBar } from './NavBar';
import { FiUpload, FiDownload } from 'react-icons/fi';
import "./XMLToJSON.css";

const XmlToJsonConverter = () => {
  const [xmlContent, setXmlContent] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to convert XML to JSON
  const xmlToJSON = (xmlStr) => {
    // Create a new DOMParser
    const parser = new DOMParser();
    
    try {
      // Parse XML string to XML document
      const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
      
      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        throw new Error("Invalid XML format");
      }

      // Function to convert XML node to JavaScript object
      const convertNodeToObj = (node) => {
        // If it's a text node with only whitespace, skip it
        if (node.nodeType === 3 && !node.nodeValue.trim()) {
          return null;
        }

        // If it's a text node with content, return its value
        if (node.nodeType === 3) {
          const value = node.nodeValue.trim();
          // Try to convert to number if possible
          const num = Number(value);
          if (!isNaN(num) && value !== '') {
            return num;
          }
          // Check for boolean values
          if (value.toLowerCase() === 'true') return true;
          if (value.toLowerCase() === 'false') return false;
          return value;
        }

        const obj = {};
        const attributes = node.attributes;
        let hasAttributes = false;

        // Handle attributes
        if (attributes && attributes.length > 0) {
          hasAttributes = true;
          obj["@attributes"] = {};
          for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            obj["@attributes"][attr.nodeName] = attr.nodeValue;
          }
        }

        // Handle child nodes
        const childNodes = node.childNodes;
        let hasChildren = false;

        for (let i = 0; i < childNodes.length; i++) {
          const child = childNodes[i];
          const childResult = convertNodeToObj(child);

          if (childResult !== null) {
            hasChildren = true;
            const nodeName = child.nodeName;

            if (nodeName === "#text") {
              // If node has both text and attributes
              if (hasAttributes) {
                obj["#text"] = childResult;
              } else {
                return childResult;
              }
            } else {
              // Handle multiple children with same name
              if (obj[nodeName]) {
                if (!Array.isArray(obj[nodeName])) {
                  obj[nodeName] = [obj[nodeName]];
                }
                obj[nodeName].push(childResult);
              } else {
                obj[nodeName] = childResult;
              }
            }
          }
        }

        // If node has no children or attributes, return empty string
        if (!hasChildren && !hasAttributes) {
          return "";
        }

        return obj;
      };

      // Convert the entire document
      const result = {};
      const root = xmlDoc.documentElement;
      result[root.nodeName] = convertNodeToObj(root);

      return result;
    } catch (error) {
      throw new Error("Failed to parse XML: " + error.message);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    setJsonOutput(null);
    
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        setError("Please select a valid XML file");
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          // Store XML content for conversion
          setXmlContent(content);
          setError(null);
        } catch (error) {
          console.error('Parse error:', error);
          setError("Invalid XML format. Please check your file content.");
          setXmlContent(null);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading file. Please try again.");
        setXmlContent(null);
      };
      
      reader.readAsText(file);
    }
  };

  const convertToJson = () => {
    if (!xmlContent) {
      setError("Please upload a valid XML file first.");
      return;
    }

    try {
      setLoading(true);
      const jsonResult = xmlToJSON(xmlContent);
      const formattedJson = JSON.stringify(jsonResult, null, 2);
      setJsonOutput(formattedJson);
      setError(null);
    } catch (error) {
      console.error('Conversion error:', error);
      setError("Error converting XML to JSON. Please check your XML structure.");
      setJsonOutput(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.xml', '.json');
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
            <h2>XML to JSON</h2>
            <p>Convert your XML files to JSON format</p>
          </div>
          
          <div className="drop-zone">
            <div className="icon-container">
              <input 
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input">
                <FiUpload size={50} />
                <p>Drag & Drop XML file here or click to browse</p>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {xmlContent && !error && (
            <div className="button-container">
              <button 
                onClick={convertToJson} 
                className="convert-button"
                disabled={loading}
              >
                {loading ? "Converting..." : "Convert to JSON"}
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

export default XmlToJsonConverter;