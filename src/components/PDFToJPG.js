import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './PDFToJPG.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToJPG = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertedImages, setConvertedImages] = useState([]);

  // Handle navigation
  const handleBack = () => {
    navigate('/');
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setConvertedImages([]);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  // Convert PDF page to JPG
  const convertPageToJPG = async (pdf, pageNumber) => {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Download single image
  const downloadImage = (imageUrl, pageNumber) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${selectedFile.name.replace('.pdf', '')}_page${pageNumber}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all images as ZIP
  const downloadAllImages = async () => {
    const zip = new JSZip();
    
    convertedImages.forEach((image, index) => {
      const imgData = image.url.split(',')[1];
      zip.file(`${selectedFile.name.replace('.pdf', '')}_page${index + 1}.jpg`, imgData, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${selectedFile.name.replace('.pdf', '')}_all_pages.zip`);
  };

  // Handle conversion process
  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setConverting(true);
      setProgress(0);
      setError(null);
      setConvertedImages([]);

      // Load the PDF document
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const images = [];

      // Convert each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Update progress
        const currentProgress = Math.round((pageNum - 1) / totalPages * 100);
        setProgress(currentProgress);

        // Convert page to JPG
        const jpgUrl = await convertPageToJPG(pdf, pageNum);
        images.push({ url: jpgUrl, pageNumber: pageNum });
      }

      setConvertedImages(images);
      setProgress(100);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error.message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="jpg-converter">
      <button onClick={handleBack} className="jpg-back-button">
        ← Back to Home
      </button>
      <div className="jpg-converter-content">
        <div className="jpg-converter-card">
          <h1>Convert PDF to JPG</h1>
          <p className="jpg-description">
            Transform your PDF pages into high-quality JPG images
          </p>

          <div className="jpg-upload-section">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="jpg-file-input"
              id="jpg-file-input"
            />
            <label htmlFor="jpg-file-input" className="jpg-file-label">
              Choose PDF File
            </label>
            {selectedFile && (
              <div className="jpg-file-info">
                <p>{selectedFile.name}</p>
                <p className="jpg-file-size">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {error && <div className="jpg-error-message">{error}</div>}

          {selectedFile && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="jpg-convert-button"
            >
              {converting ? 'Converting...' : 'Convert to JPG'}
            </button>
          )}

          {converting && (
            <div className="jpg-progress-container">
              <div
                className="jpg-progress-bar"
                style={{ width: `${progress}%` }}
              >
                <span className="jpg-progress-text">{progress}%</span>
              </div>
            </div>
          )}

          {convertedImages.length > 0 && (
            <div className="jpg-results">
              <button onClick={downloadAllImages} className="jpg-download-all-button">
                Download All Images (ZIP)
              </button>
              <div className="jpg-images-grid">
                {convertedImages.map((image, index) => (
                  <div key={index} className="jpg-image-item">
                    <img src={image.url} alt={`Page ${image.pageNumber}`} />
                    <button
                      onClick={() => downloadImage(image.url, image.pageNumber)}
                      className="jpg-download-button"
                    >
                      Download Page {image.pageNumber}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="jpg-features">
            <h2>Features:</h2>
            <ul>
              <li>Convert PDF pages to JPG images</li>
              <li>High-quality image output</li>
              <li>Maintain original dimensions</li>
              <li>Process multiple pages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFToJPG;
