import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaFileUpload, FaTrash, FaLock, FaUnlock } from 'react-icons/fa';
import { MdUpgrade } from 'react-icons/md';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '../firebase';

const FileItem = ({ file, index, moveFile, removeFile }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'FILE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'FILE',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveFile(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div 
      ref={(node) => drag(drop(node))}
      className={`file-item ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <span>{file.name}</span>
      <div className="file-actions">
        <button onClick={() => removeFile(index)} className="delete-btn">
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

const DraggableFileList = () => {
  const [files, setFiles] = useState([]);
  const [isProVersion, setIsProVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const auth = getAuth();
  const storage = getStorage();
  const user = auth.currentUser;

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    
    // Pro version check
    if (!isProVersion && files.length >= 3) {
      setError('Upgrade to Pro to upload more files');
      return;
    }

    // File type and size validation
    const validFiles = uploadedFiles.filter(file => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/docx'];
      const maxSize = isProVersion ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for Pro, 10MB for Free
      
      if (!allowedTypes.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}`);
        return false;
      }
      
      return true;
    });

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const moveFile = (fromIndex, toIndex) => {
    const updatedFiles = [...files];
    const [movedFile] = updatedFiles.splice(fromIndex, 1);
    updatedFiles.splice(toIndex, 0, movedFile);
    setFiles(updatedFiles);
  };

  const removeFile = (indexToRemove) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const uploadFilesToFirebase = async () => {
    if (!user) {
      setError('Please log in to upload files');
      return;
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `documents/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      });

      const uploadedFileURLs = await Promise.all(uploadPromises);

      // Update Firestore with file URLs
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        uploadedFiles: arrayUnion(...uploadedFileURLs)
      });

      setFiles([]);
      setUploadProgress(100);
      setError(null);
    } catch (err) {
      setError('File upload failed');
      console.error('Upload error:', err);
    }
  };

  const handleUpgradeToProVersion = () => {
    // Implement Pro version upgrade logic
    // This could open a payment modal or redirect to a payment page
    setIsProVersion(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="draggable-file-list-container">
        <div className="file-upload-section">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple 
            style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png,.docx"
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="upload-btn"
          >
            <FaFileUpload /> Upload Files
          </button>

          {!isProVersion && (
            <div className="pro-upgrade-banner">
              <FaLock />
              <span>Upgrade to Pro for more features</span>
              <button 
                onClick={handleUpgradeToProVersion}
                className="upgrade-btn"
              >
                <MdUpgrade /> Upgrade
              </button>
            </div>
          )}

          {isProVersion && <FaUnlock className="pro-badge" />}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="file-list">
          {files.map((file, index) => (
            <FileItem 
              key={`${file.name}-${index}`}
              file={file}
              index={index}
              moveFile={moveFile}
              removeFile={removeFile}
            />
          ))}
        </div>

        {files.length > 0 && (
          <button 
            onClick={uploadFilesToFirebase}
            className="upload-files-btn"
            disabled={uploadProgress > 0 && uploadProgress < 100}
          >
            Upload Files
          </button>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default DraggableFileList;
