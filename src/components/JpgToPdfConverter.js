import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';

const ImagePreview = ({ id, src, index, moveImage }) => {
  const ref = React.useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'image',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'image',
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveImage(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref}
      className="image-preview-container"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <img 
        src={src} 
        alt={`Preview ${index + 1}`}
        className="image-preview"
      />
      <div className="image-number">{index + 1}</div>
    </div>
  );
};

const JpgToPdfConverter = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const generatePreviews = async () => {
      const previews = await Promise.all(
        selectedFiles.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: file.name,
                src: e.target.result,
                file: file
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      setImagePreviews(previews);
    };

    generatePreviews();
  }, [selectedFiles]);

  const handleBack = () => {
    navigate('/');
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/jpg' || 
      file.type === 'image/png'
    );

    if (validFiles.length === 0) {
      setError('Please select valid JPG or PNG images');
      setSelectedFiles([]);
    } else if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only JPG and PNG images are supported');
      setSelectedFiles(validFiles);
    } else {
      setError(null);
      setSelectedFiles(validFiles);
    }
  };

  const moveImage = (dragIndex, hoverIndex) => {
    const dragItem = imagePreviews[dragIndex];
    const newPreviews = [...imagePreviews];
    newPreviews.splice(dragIndex, 1);
    newPreviews.splice(hoverIndex, 0, dragItem);
    setImagePreviews(newPreviews);
    
    // Update selectedFiles order to match preview order
    const newFiles = newPreviews.map(preview => 
      selectedFiles.find(file => file.name === preview.id)
    );
    setSelectedFiles(newFiles);
  };

  const handleConversion = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setConverting(true);
    setProgress(0);

    try {
      const doc = new jsPDF();
      let currentPage = 0;

      for (const preview of imagePreviews) {
        try {
          if (currentPage > 0) {
            doc.addPage();
          }

          const img = new Image();
          img.src = preview.src;
          
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          let imgWidth = img.width;
          let imgHeight = img.height;
          
          if (imgWidth > pageWidth || imgHeight > pageHeight) {
            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            imgWidth *= ratio;
            imgHeight *= ratio;
          }
          
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          
          doc.addImage(preview.src, 'JPEG', x, y, imgWidth, imgHeight);
          currentPage++;
          
          setProgress((currentPage / selectedFiles.length) * 100);
        } catch (err) {
          console.error('Error processing image:', preview.id, err);
          setError(`Error processing image: ${preview.id}`);
        }
      }

      doc.save('converted-images.pdf');
    } catch (err) {
      setError('Error converting images: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <button onClick={handleBack} className="back-button">
          ← Back to Home
        </button>

        <div className="converter-card">
          <h1>Convert Images to PDF</h1>
          <p className="subtitle">Transform your JPG and PNG images into a PDF document</p>

          <div className="upload-section">
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="file-input"
              id="file-input"
              multiple
            />
            <label htmlFor="file-input" className="choose-file-button">
              Choose Images
            </label>
            {selectedFiles.length > 0 && (
              <p className="file-name">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected
              </p>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
          
          {converting && (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          {imagePreviews.length > 0 && (
            <div className="preview-section">
              <h3>Drag to Reorder Images</h3>
              <div className="image-list">
                {imagePreviews.map((preview, index) => (
                  <ImagePreview
                    key={preview.id}
                    id={preview.id}
                    src={preview.src}
                    index={index}
                    moveImage={moveImage}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && !converting && (
            <button onClick={handleConversion} className="convert-button">
              Convert to PDF
            </button>
          )}

          <div className="features-section">
            <h2>Features:</h2>
            <div className="features-grid">
              <div className="feature-item">
                Multiple image support
              </div>
              <div className="feature-item">
                Maintains image quality
              </div>
              <div className="feature-item">
                Auto-fit to page
              </div>
              <div className="feature-item">
                Drag & Drop reordering
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #1a1a1a;
            padding: 20px;
            position: relative;
          }

          .back-button {
            position: absolute;
            top: 20px;
            left: 20px;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            font-size: 16px;
            padding: 10px;
          }

          .back-button:hover {
            text-decoration: underline;
          }

          .converter-card {
            background: white;
            border-radius: 24px;
            padding: 48px;
            width: 100%;
            max-width: 800px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          h1 {
            color: #6c5ce7;
            font-size: 36px;
            margin: 0 0 12px 0;
            font-weight: 600;
          }

          .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 32px;
          }

          .upload-section {
            margin: 32px 0;
          }

          .file-input {
            display: none;
          }

          .preview-section {
            margin: 32px 0;
          }

          .preview-section h3 {
            color: #6c5ce7;
            margin-bottom: 16px;
          }

          .image-list {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
            padding: 16px;
            min-height: 150px;
            background: #f8f7ff;
            border-radius: 12px;
            width: 100%;
            overflow-y: auto;
            max-height: 400px;
          }

          .image-preview-container {
            position: relative;
            cursor: grab;
            transition: opacity 0.2s;
            aspect-ratio: 1;
          }

          .image-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #6c5ce7;
          }

          .image-number {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #6c5ce7;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }

          .choose-file-button {
            background-color: #6c5ce7;
            color: white;
            padding: 12px 32px;
            border-radius: 50px;
            cursor: pointer;
            display: inline-block;
            font-size: 16px;
            transition: background-color 0.2s;
          }

          .choose-file-button:hover {
            background-color: #5b4cc4;
          }

          .file-name {
            margin-top: 12px;
            color: #666;
          }

          .convert-button {
            background-color: #6c5ce7;
            color: white;
            padding: 12px 32px;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.2s;
          }

          .convert-button:hover {
            background-color: #5b4cc4;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 20px 0;
          }

          .progress {
            height: 100%;
            background-color: #6c5ce7;
            transition: width 0.3s ease;
          }

          .error-message {
            color: #ff4757;
            background-color: #ffe0e3;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
          }

          .features-section {
            margin-top: 48px;
            text-align: left;
          }

          .features-section h2 {
            color: #6c5ce7;
            font-size: 20px;
            margin-bottom: 24px;
          }

          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .feature-item {
            background-color: #f8f7ff;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            color: #666;
            font-size: 15px;
          }

          @media (max-width: 1200px) {
            .image-list {
              grid-template-columns: repeat(4, 1fr);
            }
          }

          @media (max-width: 900px) {
            .image-list {
              grid-template-columns: repeat(3, 1fr);
            }
          }

          @media (max-width: 600px) {
            .image-list {
              grid-template-columns: repeat(2, 1fr);
            }
            .converter-card {
              padding: 24px;
            }
            .features-grid {
              grid-template-columns: 1fr;
            }
            h1 {
              font-size: 28px;
            }
          }
        `}</style>
      </div>
    </DndProvider>
  );
};

export default JpgToPdfConverter;
