import React, { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import './splitPDF.css';
import { NavBar } from './NavBar';
import { FiUpload, FiTrash2, FiDownload, FiFile } from 'react-icons/fi';
import AccessibilityManager from './AccessibilityManager';
import './AccessibilityManager.css';

export const SplitPdf = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [splitRanges, setSplitRanges] = useState([{ start: 1, end: 1 }]);
  const [merged, setMerged] = useState(false);
  const [splitPdfUrls, setSplitPdfUrls] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    setSplitPdfUrls([]);
  };

  const handleRangeChange = (index, field, value) => {
    const newRanges = [...splitRanges];
    newRanges[index][field] = parseInt(value);
    setSplitRanges(newRanges);
  };

  const addRange = () => {
    setSplitRanges([...splitRanges, { start: 1, end: 1 }]);
  };

  const handleRemoveRange = (index) => {
    const newRanges = splitRanges.filter((_, i) => i !== index);
    setSplitRanges(newRanges);
  };

  const splitPdf = async () => {
    if (!pdfFile) {
      alert("Please select a PDF file.");
      return;
    }

    try {
      const fileArrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileArrayBuffer);
      const totalPages = pdfDoc.getPageCount();

      const splitPdfs = [];

      for (const range of splitRanges) {
        const { start, end } = range;
        if (start < 1 || end > totalPages || start > end) {
          alert(`Invalid range: Start page: ${start}, End page: ${end}`);
          return;
        }

        const splitDoc = await PDFDocument.create();
        for (let i = start - 1; i < end; i++) {
          const [page] = await splitDoc.copyPages(pdfDoc, [i]);
          splitDoc.addPage(page);
        }

        const splitPdfBytes = await splitDoc.save();
        const blob = new Blob([splitPdfBytes], { type: "application/pdf" });
        const splitPdfUrl = URL.createObjectURL(blob);
        splitPdfs.push(splitPdfUrl);
      }

      if (merged) {
        const mergedDoc = await PDFDocument.create();
        for (const splitUrl of splitPdfs) {
          const splitArrayBuffer = await fetch(splitUrl).then((res) => res.arrayBuffer());
          const splitDoc = await PDFDocument.load(splitArrayBuffer);
          const pages = await mergedDoc.copyPages(splitDoc, splitDoc.getPages().map((_, i) => i));
          pages.forEach((page) => mergedDoc.addPage(page));
        }

        const mergedPdfBytes = await mergedDoc.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const mergedPdfUrl = URL.createObjectURL(mergedBlob);
        setSplitPdfUrls([mergedPdfUrl]);
      } else {
        setSplitPdfUrls(splitPdfs);
      }
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("Failed to split the PDF.");
    }
  };

  return (
    <>
      <NavBar />
      <AccessibilityManager />
      <div className="merge-pdf-container">
        <div className="jpg-content">
          <header className="merge-pdf-header">
            <h1>Split PDF</h1>
            <p>Split your PDF into multiple documents</p>
          </header>

          <div className="merge-pdf-drop-zone">
            <label htmlFor="file-upload" className="merge-pdf-file-upload-label">
              <FiUpload /> Drag & Drop PDF file here or click to browse
            </label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="merge-pdf-file-upload-input"
              style={{ display: "none" }}
            />
          </div>

          {pdfFile && (
            <div className="uploaded-file-info">
              <div className="file-details">
                <FiFile />
                <span>{pdfFile.name}</span>
                <button onClick={handleRemoveFile} className="remove-file-btn">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          )}

          <div className="split-ranges">
            {splitRanges.map((range, index) => (
              <div key={index} className="range-input">
                <input
                  type="number"
                  min="1"
                  value={range.start}
                  onChange={(e) => handleRangeChange(index, 'start', e.target.value)}
                  placeholder="Start Page"
                />
                <input
                  type="number"
                  min="1"
                  value={range.end}
                  onChange={(e) => handleRangeChange(index, 'end', e.target.value)}
                  placeholder="End Page"
                />
                {index > 0 && (
                  <button 
                    onClick={() => handleRemoveRange(index)} 
                    className="remove-range-btn"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addRange} className="add-range-btn">
              Add Another Range
            </button>
          </div>

          <div className="merge-options">
            <label>
              <input
                type="checkbox"
                checked={merged}
                onChange={() => setMerged(!merged)}
              />
              Merge Split PDFs
            </label>
          </div>

          <button 
            onClick={splitPdf} 
            className="convert-btn"
            disabled={!pdfFile}
          >
            Split PDF
          </button>

          {splitPdfUrls.length > 0 && (
            <div className="download-section">
              <h3>Split PDF Files:</h3>
              <div className="download-grid">
                {splitPdfUrls.map((url, index) => (
                  <div key={index} className="download-item">
                    <a 
                      href={url} 
                      download={`split_pdf_${index + 1}.pdf`} 
                      className="download-btn"
                    >
                      <FiDownload /> Download PDF {index + 1}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SplitPdf;
