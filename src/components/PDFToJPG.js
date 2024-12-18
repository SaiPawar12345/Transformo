import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { FaUpload, FaDownload, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { NavBar } from './NavBar';
import './PDFToJPG.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfToJpgConverter = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState({});
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.warning('Only PDF files are allowed');
    }

    setSelectedFiles(prevFiles => {
      const newFiles = [...prevFiles];
      pdfFiles.forEach(file => {
        if (!prevFiles.find(f => f.name === file.name)) {
          newFiles.push(file);
        }
      });
      return newFiles;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (fileName) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    setConvertedImages(prevImages => {
      const newImages = { ...prevImages };
      delete newImages[fileName];
      return newImages;
    });
  };

  const convertPageToJPG = async (pdf, pageNumber) => {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 });
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

  const convertPDFToJPG = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one PDF file');
      return;
    }

    setConverting(true);
    setProgress(0);
    const newConvertedImages = {};
    const totalFiles = selectedFiles.length;

    try {
      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];
        const fileArrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(fileArrayBuffer).promise;
        const totalPages = pdf.numPages;
        const images = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const jpgUrl = await convertPageToJPG(pdf, pageNum);
          images.push({
            url: jpgUrl,
            pageNumber: pageNum
          });

          const totalProgress = ((fileIndex * totalPages + pageNum) / (totalFiles * totalPages)) * 100;
          setProgress(Math.round(totalProgress));
        }

        newConvertedImages[file.name] = images;
      }

      setConvertedImages(newConvertedImages);
      toast.success('Conversion completed successfully!');
    } catch (error) {
      console.error('Error converting PDF:', error);
      toast.error('Error converting PDF. Please try again.');
    } finally {
      setConverting(false);
      setProgress(100);
    }
  };

  const downloadImage = (imageUrl, fileName, pageNumber) => {
    saveAs(imageUrl, `${fileName.replace('.pdf', '')}_page${pageNumber}.jpg`);
  };

  const downloadAllImages = async () => {
    const zip = new JSZip();

    Object.entries(convertedImages).forEach(([fileName, images]) => {
      images.forEach((image) => {
        const imgData = image.url.split(',')[1];
        zip.file(`${fileName.replace('.pdf', '')}_page${image.pageNumber}.jpg`, imgData, { base64: true });
      });
    });

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, 'converted_images.zip');
  };

  return (
    <>
      <NavBar />
      <div className="app__container">
        <div className="app__wrapper">
          <div className="app__header">
            <div className="app__title">
              <h1>PDF to JPG Converter</h1>
              <p>Convert your PDF files to high-quality JPG images with ease</p>
            </div>
          </div>

          <div className="app__content">
            <div {...getRootProps()} className="dropzone">
              <input {...getInputProps()} />
              <div className="dropzone__content">
                <FaUpload className="dropzone__icon" />
                {isDragActive ? (
                  <p>Drop your PDF files here</p>
                ) : (
                  <p>Drag & drop PDF files here, or <span className="browse-text">browse</span></p>
                )}
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <h3>Selected Files</h3>
                {selectedFiles.map((file) => (
                  <div key={file.name} className="file-item">
                    <span>{file.name}</span>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="delete-btn"
                      title="Remove file"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="app__button"
              onClick={convertPDFToJPG}
              disabled={converting || selectedFiles.length === 0}
            >
              {converting ? 'Converting...' : 'Convert to JPG'}
            </button>

            {converting && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <div className="progress-text">{progress}%</div>
              </div>
            )}

            {Object.keys(convertedImages).length > 0 && (
              <div className="results-container">
                <div className="download-all-container">
                  <button onClick={downloadAllImages} className="app__button">
                    <FaDownload /> Download All Images
                  </button>
                </div>

                {Object.entries(convertedImages).map(([fileName, images]) => (
                  <div key={fileName} className="pdf-images-section">
                    <h3>{fileName}</h3>
                    <div className="image-grid">
                      {images.map((image, index) => (
                        <div key={index} className="image-item">
                          <img
                            src={image.url}
                            alt={`Page ${image.pageNumber}`}
                            className="converted-image"
                          />
                          <button
                            onClick={() => downloadImage(image.url, fileName, image.pageNumber)}
                            className="download-btn"
                          >
                            <FaDownload /> Download Page {image.pageNumber}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PdfToJpgConverter;
