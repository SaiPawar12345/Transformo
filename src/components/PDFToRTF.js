import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import './PDFToRTF.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToRTF = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertedRtf, setConvertedRtf] = useState('');

  const handleBack = () => navigate('/');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setConvertedRtf('');
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  // Convert color values to RTF color format
  const convertToRtfColor = (r, g, b) => `\\red${r}\\green${g}\\blue${b}`;

  // Enhanced RTF header with tab stops and grid settings
  const generateRtfHeader = () => {
    return '{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033\n' +
           '{\\fonttbl' +
           '{\\f0\\fnil\\fcharset0 Arial;}' +
           '{\\f1\\fnil\\fcharset0 Times New Roman;}' +
           '{\\f2\\fnil\\fcharset0 Helvetica;}' +
           '{\\f3\\fnil\\fcharset0 Calibri;}' +
           '{\\f4\\fnil\\fcharset0 Courier New;}' +
           '{\\f5\\fnil\\fcharset0 Symbol;}}\n' +
           '{\\colortbl;\\red0\\green0\\blue0;\\red255\\green0\\blue0;\\red0\\green0\\blue255;}\n' +
           '{\\\\gridtbl{\\\\gridrow{\\*\\gridcell}}}\\deftab720' +
           '{\\stylesheet' +
           '{\\s0\\snext0\\widctlpar\\hyphpar0\\kerning1\\dbch\\af6\\langfe2052\\dbch\\af7\\afs24\\alang1081\\loch\\f0\\fs24\\lang1033 Normal;}' +
           '{\\s1\\sbasedon0\\snext0\\rtlch\\af8\\afs32\\ab\\ltrch\\fcs1\\af0\\afs32\\ab\\hich\\af0\\loch\\f0\\fs32\\b Heading 1;}' +
           '{\\s2\\sbasedon0\\snext0\\rtlch\\af8\\afs28\\ab\\ltrch\\fcs1\\af0\\afs28\\ab\\hich\\af0\\loch\\f0\\fs28\\b Heading 2;}' +
           '{\\s3\\sbasedon0\\snext0\\qj\\widctlpar\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640 Grid;}}\n' +
           '\\viewkind4\\uc1\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440\n';
  };

  // Enhanced text metrics calculation
  const calculateTextMetrics = (item, viewport) => {
    const transform = item.transform;
    const fontSize = Math.max(1, Math.round(Math.abs(transform[0]) * viewport.scale));
    const x = Math.max(0, Math.round(transform[4]));
    const y = Math.max(0, Math.round(viewport.height - transform[5]));
    
    // Calculate rotation angle
    const rotation = Math.atan2(transform[1], transform[0]) * (180 / Math.PI);
    
    // Calculate text width and height
    const width = Math.max(0, (item.width || 0) * viewport.scale);
    const height = fontSize * 1.2; // Approximate line height
    
    return {
      fontSize,
      x,
      y,
      width,
      height,
      rotation: Math.round(rotation),
      isRotated: Math.abs(rotation) > 1
    };
  };

  // Process text style with left alignment
  const processTextStyle = (item, metrics, viewport, isTabular = false) => {
    let style = '';

    // Font size (RTF uses half-points)
    const fontSize = Math.max(1, metrics.fontSize * 2);
    style += `\\fs${fontSize}`;

    // Font family mapping
    const fontName = item.fontName || '';
    const fontMap = {
      'times': '\\f1',
      'helvetica': '\\f2',
      'calibri': '\\f3',
      'courier': '\\f4',
      'symbol': '\\f5'
    };

    // Find matching font
    const fontKey = Object.keys(fontMap).find(key => fontName.toLowerCase().includes(key));
    style += fontKey ? fontMap[fontKey] : '\\f0';

    // Font styles
    if (fontName.toLowerCase().includes('bold')) style += '\\b';
    if (fontName.toLowerCase().includes('italic')) style += '\\i';

    // Always use left alignment for table cells
    if (isTabular) {
      style += '\\ql';
    }

    return style;
  };

  // Enhanced text escaping
  const escapeRtfText = (text) => {
    if (!text) return '';
    return text
      .replace(/[\\{}]/g, '\\$&')
      .replace(/\r?\n/g, '\\par\n')
      .replace(/\t/g, '\\tab ')
      .replace(/[^\x00-\x7F]/g, char => `\\u${char.charCodeAt(0)}?`);
  };

  // Calculate fixed column positions from header row
  const calculateFixedColumnPositions = (lines, viewport) => {
    if (lines.length === 0) return [];

    // Use the first line as header to establish column positions
    const headerLine = lines[0][1];
    const positions = headerLine
      .sort((a, b) => a.transform[4] - b.transform[4])
      .map(item => Math.round(item.transform[4] * 20)); // Convert to twips

    // Ensure minimum spacing between columns
    const minSpacing = 2880; // 2 inches in twips
    return positions.filter((pos, index) => {
      if (index === 0) return true;
      return pos - positions[index - 1] >= minSpacing;
    });
  };

  // Enhanced text extraction with consistent left alignment
  const extractTextFromPage = async (pdf, pageNumber) => {
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      let text = '';

      // Group items by vertical position (lines)
      const lineGroups = new Map();
      const lineThreshold = viewport.height * 0.005;

      textContent.items
        .filter(item => item.str && item.str.trim())
        .forEach(item => {
          const y = Math.round(item.transform[5] / lineThreshold) * lineThreshold;
          if (!lineGroups.has(y)) {
            lineGroups.set(y, []);
          }
          lineGroups.get(y).push(item);
        });

      // Sort lines by vertical position (top to bottom)
      const sortedLines = Array.from(lineGroups.entries())
        .sort(([y1], [y2]) => y2 - y1);

      // Calculate fixed column positions from the first line (header)
      const columnPositions = calculateFixedColumnPositions(sortedLines, viewport);
      const isTabular = columnPositions.length > 1;

      if (isTabular) {
        // Add table formatting with left-aligned tabs
        text += '{\\pard\\plain\\s3';
        columnPositions.forEach(pos => {
          text += `\\tql\\tx${pos};`; // Use left-aligned tabs
        });
        text += '\n';
      }

      // Process each line
      sortedLines.forEach(([y, items], lineIndex) => {
        if (lineIndex > 0) {
          text += '\\par\\line\n';
        }

        // Sort items in line by horizontal position
        const lineItems = items.sort((a, b) => a.transform[4] - b.transform[4]);

        // Special handling for date headers (detect if line contains dates)
        const isDateHeader = lineItems.some(item => 
          item.str.match(/\d{4}-\d{2}-\d{2}/) || 
          item.str.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/)
        );

        if (isDateHeader) {
          // Center-align date headers
          text += '{\\pard\\qc\\b ';
          lineItems.forEach((item, idx) => {
            if (idx > 0) text += '\\tab ';
            text += escapeRtfText(item.str.trim());
          });
          text += '\\b0\\par}\n';
        } else {
          // Process regular items with left alignment
          lineItems.forEach((item, itemIndex) => {
            const metrics = calculateTextMetrics(item, viewport);

            if (isTabular && itemIndex > 0) {
              text += '\\tab ';
            }

            // Add text with style
            const style = processTextStyle(item, metrics, viewport, isTabular);
            const cleanText = escapeRtfText(item.str.trim());
            
            if (cleanText) {
              // For header row (first line), make it bold
              if (lineIndex === 0 && !isDateHeader) {
                text += `{${style}\\b ${cleanText}\\b0}`;
              } else {
                text += `{${style} ${cleanText}`;
              }
            }
          });
        }

        // Add extra spacing after headers
        if (lineIndex === 0 || isDateHeader) {
          text += '\\sa120\\sb120';
        }
      });

      if (isTabular) {
        text += '}'; // Close table formatting
      }

      return text;
    } catch (pageError) {
      console.error('Error processing page:', pageError);
      return `\\par Error processing page ${pageNumber}\\par\n`;
    }
  };

  // Download RTF file
  const downloadRtfFile = (rtfContent, fileName) => {
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.replace('.pdf', '')}.rtf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handle conversion with improved error handling
  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setConverting(true);
      setProgress(0);
      setError(null);
      setConvertedRtf('');

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
      }).promise;
      
      const totalPages = pdf.numPages;

      // Generate basic RTF header
      let rtfContent = generateRtfHeader();

      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          setProgress(Math.round((pageNum / totalPages) * 100));

          // Add page header
          rtfContent += '{\\pard\\par\\qc\\b\\fs28';
          rtfContent += escapeRtfText(`Page ${pageNum}`);
          rtfContent += '\\b0\\par}\n';

          // Add separator
          rtfContent += '{\\pard\\par\\qc';
          rtfContent += escapeRtfText('-'.repeat(40));
          rtfContent += '\\par}\n';

          // Extract page content
          const pageText = await extractTextFromPage(pdf, pageNum);
          rtfContent += pageText;

          // Add page break except for last page
          if (pageNum < totalPages) {
            rtfContent += '\\page\n';
          }
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          rtfContent += `\\par Error processing page ${pageNum}\\par\n`;
        }
      }

      // Close RTF document
      rtfContent += '}';

      setConvertedRtf(rtfContent);
      setProgress(100);
    } catch (error) {
      console.error('Conversion error:', error);
      setError('Error converting PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="rtf-converter">
      <button onClick={handleBack} className="rtf-back-button">
        ← Back to Home
      </button>
      <div className="rtf-converter-content">
        <div className="rtf-converter-card">
          <h1>Convert PDF to RTF</h1>
          <p className="rtf-description">
            Transform your PDF files into RTF format while preserving exact formatting
          </p>

          <div className="rtf-upload-section">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="rtf-file-input"
              id="rtf-file-input"
            />
            <label htmlFor="rtf-file-input" className="rtf-file-label">
              Choose PDF File
            </label>
            {selectedFile && (
              <div className="rtf-file-info">
                <p>{selectedFile.name}</p>
                <p className="rtf-file-size">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {error && <div className="rtf-error-message">{error}</div>}

          {selectedFile && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="rtf-convert-button"
            >
              {converting ? 'Converting...' : 'Convert to RTF'}
            </button>
          )}

          {converting && (
            <div className="rtf-progress-container">
              <div
                className="rtf-progress-bar"
                style={{ width: `${progress}%` }}
              >
                <span className="rtf-progress-text">{progress}%</span>
              </div>
            </div>
          )}

          {convertedRtf && (
            <div className="rtf-results">
              <div className="rtf-preview">
                <h3>Conversion Complete</h3>
                <div className="rtf-preview-content">
                  <p>Your RTF file is ready with preserved:</p>
                  <ul className="rtf-preserved-features">
                    <li>Font styles and sizes</li>
                    <li>Text positioning</li>
                    <li>Paragraph spacing</li>
                    <li>Page layout</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => downloadRtfFile(convertedRtf, selectedFile.name)}
                className="rtf-download-button"
              >
                Download RTF File
              </button>
            </div>
          )}

          <div className="rtf-features">
            <h2>Features</h2>
            <ul>
              <li>Exact formatting</li>
              <li>Layout preservation</li>
              <li>Font matching</li>
              <li>Position accuracy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFToRTF;