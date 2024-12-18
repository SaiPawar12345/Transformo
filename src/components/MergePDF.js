import React, { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FiUpload, FiTrash2, FiArrowUp, FiArrowDown, FiFile, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './MergePDF.css';
import { NavBar } from './NavBar';
import AccessibilityManager from './AccessibilityManager';
import './AccessibilityManager.css';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ItemTypes = {
  PDF_FILE: 'pdf_file'
};

const DraggableFile = ({ file, index, moveFile, handleRemoveFile, pdfFiles }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file.file));
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        setPreview(canvas.toDataURL());
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    };

    loadPreview();
  }, [file]);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PDF_FILE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: ItemTypes.PDF_FILE,
    hover(item) {
      if (item.index !== index) {
        moveFile(item.index, index);
        item.index = index;
      }
    }
  });

  return (
    <motion.div
      ref={(node) => drag(drop(node))}
      className={`file-item ${isDragging ? 'dragging' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="file-preview">
        {preview && <img src={preview} alt="PDF preview" className="pdf-thumbnail" />}
      </div>
      <div className="file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-pages">Pages: {file.pages}</span>
      </div>
      <div className="file-actions">
        <button className="remove-button" onClick={() => handleRemoveFile(index)}>
          <FiTrash2 />
        </button>
        <button className="move-up" onClick={() => moveFile(index, index - 1)} disabled={index === 0}>
          <FiArrowUp />
        </button>
        <button className="move-down" onClick={() => moveFile(index, index + 1)} disabled={index === pdfFiles.length - 1}>
          <FiArrowDown />
        </button>
      </div>
    </motion.div>
  );
};

const MergePDF = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voiceRecognitionActive, setVoiceRecognitionActive] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [lastKeypressTime, setLastKeypressTime] = useState(0);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognitionInstance = new window.webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setVoiceRecognitionActive(true);
        speak('Voice recognition started');
      };

      recognitionInstance.onend = () => {
        if (voiceRecognitionActive) {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          speak('Please allow microphone access');
        } else {
          speak('Voice recognition error, press Ctrl+M to try again');
          setVoiceRecognitionActive(false);
        }
      };

      setRecognition(recognitionInstance);

      // Cleanup
      return () => {
        if (recognitionInstance) {
          try {
            recognitionInstance.stop();
          } catch (error) {
            console.error('Error stopping recognition:', error);
          }
        }
      };
    } else {
      speak('Speech recognition is not supported in this browser');
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        
        // Prevent double triggers
        const currentTime = Date.now();
        if (currentTime - lastKeypressTime < 500) {
          return;
        }
        setLastKeypressTime(currentTime);

        if (recognition) {
          if (voiceRecognitionActive) {
            recognition.stop();
            setVoiceRecognitionActive(false);
            speak('Voice recognition stopped');
          } else {
            try {
              recognition.start();
              speak('Voice recognition started');
            } catch (error) {
              console.error('Error starting recognition:', error);
              speak('Error starting voice recognition, please try again');
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [recognition, voiceRecognitionActive, lastKeypressTime]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    await handleFiles(files);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf'
    );
    await handleFiles(files);
  };

  const handleFiles = async (files) => {
    const newFiles = [];
    setProgress(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pageCount = pdf.getPageCount();
        
        newFiles.push({
          file,
          name: file.name,
          pages: pageCount,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          lastModified: file.lastModified
        });
        
        setProgress((i + 1) / files.length * 100);
      } catch (error) {
        console.error("Error loading PDF:", error);
        speak(`Error loading ${file.name}`);
      }
    }
    
    if (newFiles.length > 0) {
      setPdfFiles(prev => [...prev, ...newFiles]);
      setProgress(0);
      speak(`Added ${newFiles.length} PDF files`);
    } else {
      speak('No valid PDF files were selected');
    }
  };

  const selectRecentPDFs = () => {
    try {
      speak('Please select PDF files');
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.pdf';
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
          speak('No files selected');
          return;
        }

        // Filter and sort PDF files
        const pdfFiles = files
          .filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
          .sort((a, b) => b.lastModified - a.lastModified)
          .slice(0, 2);

        if (pdfFiles.length > 0) {
          await handleFiles(pdfFiles);
          const fileNames = pdfFiles.map(f => f.name).join(' and ');
          speak(`Selected ${pdfFiles.length} files: ${fileNames}`);
        } else {
          speak('No PDF files found. Please select PDF files.');
        }
      };

      // Trigger file selection
      input.click();
    } catch (error) {
      console.error('Error selecting files:', error);
      speak('Error selecting files. Please try again');
    }
  };

  const handleRemoveFile = (index) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
    speak("File removed");
  };

  const moveFile = (fromIndex, toIndex) => {
    setPdfFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  };

  const mergePDFs = async () => {
    if (pdfFiles.length < 2) {
      speak("Please select at least two PDF files to merge");
      return;
    }
    
    setLoading(true);
    speak("Starting PDF merge process");
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        const pdfBytes = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
        setProgress((i + 1) / pdfFiles.length * 100);
      }
      
      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      speak("PDF files merged successfully. Download started.");
      
    } catch (error) {
      console.error("Error merging PDFs:", error);
      speak("Error occurred while merging PDF files");
    }
    setLoading(false);
    setProgress(0);
  };

  useEffect(() => {
    if (recognition) {
      recognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('Received command:', command);
        
        if (command.includes('select') || command.includes('upload') || command.includes('choose')) {
          selectRecentPDFs();
        } 
        else if (command.includes('merge') || command.includes('combine')) {
          if (pdfFiles.length >= 2) {
            mergePDFs();
          } else {
            speak('Please select at least two PDF files first');
          }
        }
        else if (command.includes('clear') || command.includes('remove')) {
          setPdfFiles([]);
          speak('All files cleared');
        }
        else if (command.includes('list') || command.includes('show')) {
          if (pdfFiles.length > 0) {
            speak(`You have ${pdfFiles.length} files: ${pdfFiles.map(f => f.name).join(', ')}`);
          } else {
            speak('No files selected');
          }
        }
        else if (command.includes('help')) {
          speak('Available commands are: select files, merge files, clear files, list files, and help');
        }
      };
    }
  }, [recognition, pdfFiles]);

  return (
    <>
      <NavBar />
      <AccessibilityManager />
      <div className="merge-pdf-container">
        {voiceRecognitionActive && (
          <div className="voice-active" role="status" aria-live="polite">
            Voice Recognition Active
          </div>
        )}
        <div className="merge-content">
          <div className="merge-header">
            <h2>Merge PDF Files</h2>
            <p>Combine multiple PDF files into one document</p>
            <p className="voice-instruction">Press Ctrl+M to toggle voice commands</p>
          </div>
          <DndProvider backend={HTML5Backend}>
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="region"
              aria-label="PDF drop zone"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-input"
                  aria-label="Select PDF files"
                />
                <label htmlFor="file-input" className="icon-container">
                  <FiUpload size={24} />
                </label>
                <p>Drag & Drop PDF files here or click to browse</p>
              </motion.div>
            </div>

            {progress > 0 && (
              <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}

            <AnimatePresence>
              {pdfFiles.length > 0 && (
                <motion.div
                  className="file-list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  role="list"
                  aria-label="Selected PDF files"
                >
                  {pdfFiles.map((pdf, index) => (
                    <DraggableFile
                      key={index}
                      file={pdf}
                      index={index}
                      moveFile={moveFile}
                      handleRemoveFile={handleRemoveFile}
                      pdfFiles={pdfFiles}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {pdfFiles.length >= 2 && (
              <motion.div
                style={{ display: 'flex', justifyContent: 'center' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  className="merge-button"
                  onClick={mergePDFs}
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner">
                        <FiUpload size={20} />
                      </div>
                      Merging...
                    </>
                  ) : (
                    <>
                      <FiCheck size={20} />
                      Merge PDFs
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </DndProvider>
        </div>
      </div>
    </>
  );
};

export default MergePDF;