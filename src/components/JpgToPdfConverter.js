import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { FiUpload, FiTrash2, FiDownload } from 'react-icons/fi';
import '../App.css';
import './JpgToPdfConverter.css';
import { NavBar } from './NavBar';

export const JpgToPdfConverter = () => {
  const [imgUrls, setImgUrls] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const imageUrls = files.map((file) => URL.createObjectURL(file));
      setImgUrls((prev) => [...prev, ...imageUrls]);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImgUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const convertToPDF = () => {
    if (imgUrls.length === 0) {
      alert("Please upload some JPG images first!");
      return;
    }

    const doc = new jsPDF();

    imgUrls.forEach((imgUrl, index) => {
      const img = new Image();
      img.src = imgUrl;

      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const aspectRatio = imgWidth / imgHeight;

        const maxWidth = 180;
        const maxHeight = 250;

        let width = maxWidth;
        let height = maxHeight;

        if (aspectRatio > 1) {
          height = maxWidth / aspectRatio;
        } else {
          width = maxHeight * aspectRatio;
        }

        if (index > 0) {
          doc.addPage();
        }

        doc.addImage(imgUrl, "JPEG", 10, 10, width, height);
        if (index === imgUrls.length - 1) {
          doc.save("converted.pdf");
        }
      };
    });
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("index", index);
  };

  const handleDrop = (e, targetIndex) => {
    const sourceIndex = e.dataTransfer.getData("index");
    const updatedImages = [...imgUrls];
    const draggedImage = updatedImages[sourceIndex];

    updatedImages.splice(sourceIndex, 1);
    updatedImages.splice(targetIndex, 0, draggedImage);

    setImgUrls(updatedImages);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <>
      <NavBar />
      <div className="jpg-to-pdf-container">
        <div className="jpg-content">
          <header className="merge-pdf-header">
            <h1>Convert JPG to PDF</h1>
            <p>Combine multiple JPG images into a single PDF document.</p>
          </header>

          <div className="merge-pdf-drop-zone">
            <label htmlFor="file-upload" className="merge-pdf-file-upload-label">
              <FiUpload /> Drag & Drop JPG files here or click to browse
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/jpeg"
              multiple
              onChange={handleFileChange}
              className="merge-pdf-file-upload-input"
            />
          </div>

          {imgUrls.length > 0 && (
            <div className="image-preview-section">
              {imgUrls.map((imgUrl, index) => (
                <div
                  key={index}
                  className="image-preview"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={handleDragOver}
                >
                  <img src={imgUrl} alt={`Uploaded ${index}`} className="image-thumbnail" />
                  <button className="remove-image-button" onClick={() => handleRemoveImage(index)}>
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imgUrls.length > 0 && (
            <button onClick={convertToPDF} className="convert-button">
              <FiDownload /> Convert to PDF
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default JpgToPdfConverter;
