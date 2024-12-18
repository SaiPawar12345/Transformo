import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/components.css';
import '../styles/Dashboard.css';
import '../styles/theme.css';
import { FiSearch, FiSettings, FiDownload, FiEdit, FiTrash2, FiUser, FiFolder, 
  FiFileText, FiUsers, FiPieChart, FiHelpCircle, FiFolderPlus, FiUpload, FiCopy, FiEye } from 'react-icons/fi';
import { BsSun, BsMoon } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { FileText, Folder, User, Users, ScanLine, BrainCircuit, Shield } from 'lucide-react';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [billing, setBilling] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState(null);
  const [activeNav, setActiveNav] = useState('Document Detail');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sharingFile, setSharingFile] = useState(null);
  const [shareUserId, setShareUserId] = useState('');
  const [userDetails, setUserDetails] = useState({});
  const [theme, setTheme] = useState('light');
  const [viewingFile, setViewingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserFiles(currentUser.uid);
        fetchBillingAndReceipts(currentUser.uid);
        fetchUserDetails(currentUser.uid);
      } else {
        navigate('/');
      }
    });

    // Get initial theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.body.className = savedTheme;
    // Apply initial theme class
    document.documentElement.setAttribute('data-theme', savedTheme);

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserFiles = async (userId) => {
    try {
      const filesRef = collection(db, 'files');
      
      // Fetch files owned by the user
      const ownedFilesQuery = query(filesRef, where('userId', '==', userId));
      const ownedFilesSnapshot = await getDocs(ownedFilesQuery);
      const ownedFiles = ownedFilesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: 'Complete',
        fileType: 'owned'
      }));

      // Fetch files shared with the user
      const sharedFilesQuery = query(filesRef, where('sharedWith', 'array-contains', userId));
      const sharedFilesSnapshot = await getDocs(sharedFilesQuery);
      const sharedFiles = sharedFilesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: 'Complete',
        fileType: 'shared'
      }));

      // Combine and set all files
      setFiles([...ownedFiles, ...sharedFiles]);
    } catch (error) {
      console.error('Error fetching user files:', error);
      setError('Failed to fetch files. Please try again.');
    }
  };

  const fetchBillingAndReceipts = async (userId) => {
    try {
      const billingRef = collection(db, 'billing');
      const receiptsRef = collection(db, 'receipts');
      const billingSnapshot = await getDocs(query(billingRef, where('userId', '==', userId)));
      const receiptsSnapshot = await getDocs(query(receiptsRef, where('userId', '==', userId)));

      const userBilling = billingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userReceipts = receiptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setBilling(userBilling);
      setReceipts(userReceipts);
    } catch (error) {
      setError('Error fetching billing and receipts');
    }
  };

  const fetchUserDetails = async (currentUserId) => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = {};
      usersSnapshot.docs.forEach(doc => {
        usersData[doc.id] = doc.data().name || doc.data().email?.split('@')[0] || 'Unknown User';
      });
      setUserDetails(usersData);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const selectedFile of selectedFiles) {
        try {
          const base64String = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              } catch (error) {
                reject(new Error(`Failed to process file ${selectedFile.name}: ${error.message}`));
              }
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${selectedFile.name}`));
            reader.readAsDataURL(selectedFile);
          });

          await addDoc(collection(db, 'files'), {
            name: selectedFile.name,
            base64: base64String,
            uploadedAt: new Date(),
            userId: user.uid,
            size: selectedFile.size,
            type: selectedFile.type,
            sharedWith: [],  // Array to store userIDs of users the document is shared with
            signedBy: []     // Array to store userIDs of users who have signed the document
          });

          console.log(`Successfully uploaded ${selectedFile.name}`);
        } catch (error) {
          console.error(`Error uploading ${selectedFile.name}:`, error);
          if (error.message.includes("base64") || error.message.includes("longer than")) {
            setError('⭐ Upgrade to Pro version to upload large files');
          } else {
            setError(`Failed to upload ${selectedFile.name}. Please try again.`);
          }
        }
      }

      await fetchUserFiles(user.uid);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      setError('An error occurred during the upload process. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await deleteDoc(doc(db, 'files', fileId));
      await fetchUserFiles(user.uid);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file. Please try again.');
    }
  };

  const handleDownload = (file) => {
    try {
      const linkSource = `data:application/octet-stream;base64,${file.base64}`;
      const downloadLink = document.createElement('a');
      downloadLink.href = linkSource;
      downloadLink.download = file.name;
      downloadLink.click();
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    // Get filename without extension
    const lastDotIndex = file.name.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex !== -1 ? file.name.slice(0, lastDotIndex) : file.name;
    setNewFileName(nameWithoutExtension);
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !newFileName.trim()) return;

    try {
      // Get the original file extension
      const lastDotIndex = editingFile.name.lastIndexOf('.');
      const extension = lastDotIndex !== -1 ? editingFile.name.slice(lastDotIndex) : '';
      
      // Combine new name with original extension
      const newFullName = newFileName + extension;

      await updateDoc(doc(db, 'files', editingFile.id), {
        name: newFullName
      });
      await fetchUserFiles(user.uid);
      setEditingFile(null);
      setNewFileName('');
    } catch (error) {
      console.error('Error updating file name:', error);
      setError('Failed to update file name. Please try again.');
    }
  };

  const handleShare = async (file) => {
    setSharingFile(file);
  }

  const handleShareSubmit = async () => {
    if (!sharingFile || !shareUserId.trim()) return;

    try {
      const fileRef = doc(db, 'files', sharingFile.id);
      const updatedSharedWith = [...(sharingFile.sharedWith || []), shareUserId.trim()];
      
      await updateDoc(fileRef, {
        sharedWith: updatedSharedWith
      });

      // Refresh the files list
      await fetchUserFiles(user.uid);
      
      // Reset sharing state
      setSharingFile(null);
      setShareUserId('');
    } catch (error) {
      console.error('Error sharing file:', error);
      setError('Failed to share file. Please try again.');
    }
  };

  const handleCancelShare = () => {
    setSharingFile(null);
    setShareUserId('');
  };

  const handleLogout = () => {
    signOut(auth);
    navigate('/');
  };

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setError('UserID copied to clipboard!');
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      setError('Failed to copy UserID');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.className = newTheme;
    // Apply theme class to root element
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const showTooltip = (message) => {
    toast(message, {
      duration: 1000,
      position: 'top-center',
      style: {
        background: 'var(--tooltip-bg)',
        color: 'var(--tooltip-text)',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px'
      },
    });
  };

  const navItems = [
    {
      title: "Document Detail",
      icon: <FileText size={20} />,
      path: "/document-detail"
    },
    {
      title: "Talk-2-Docs",
      icon: <Folder size={20} />,
      path: "/ai-analysis"
    },
    {
      title: "Categorization",
      icon: <FileText size={20} />,
      path: "/categorization"
    },
    {
      title: "Text Translation",
      icon: <User size={20} />,
      path: "/translate"
    },
    {
      title: "Sentiment",
      icon: <Users size={20} />,
      path: "/sentiment"
    },
    {
      title: "OCR",
      icon: <ScanLine size={20} />,
      path: "/ocr"
    },
    {
      title: "Document Masking",
      icon: <Shield size={20} />,
      path: "/mask-document"
    },
    {
      title: "Billing and Receipts",
      icon: <FileText size={20} />,
      path: "/payment"
    }
  ];

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uniqueFiles = files.reduce((acc, file) => {
    if (!acc.some(f => f.name === file.name)) {
      acc.push(file);
    }
    return acc;
  }, []);

  const filteredFiles = uniqueFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (file) => {
    setViewingFile(file);
  };

  const handleCloseView = () => {
    setViewingFile(null);
  };

  return (
    <div className={`dashboard-container ${theme}`}>
      {viewingFile && (
        <div className="file-viewer-overlay">
          <div className="file-viewer-popup">
            <div className="popup-header">
              <h3>{viewingFile.name}</h3>
              <button className="close-button" onClick={handleCloseView}>&times;</button>
            </div>
            <div className="popup-content">
              {viewingFile.type?.startsWith('image/') ? (
                <img 
                  src={`data:${viewingFile.type};base64,${viewingFile.base64}`} 
                  alt={viewingFile.name}
                  className="preview-image"
                />
              ) : viewingFile.type === 'application/pdf' ? (
                <iframe
                  src={`data:application/pdf;base64,${viewingFile.base64}`}
                  className="preview-pdf"
                  title="PDF viewer"
                />
              ) : (
                <div className="unsupported-format">
                  <p>This file format cannot be previewed directly.</p>
                  <button 
                    className="action-button"
                    onClick={() => handleDownload(viewingFile)}
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {sharingFile && (
        <div className="file-viewer-overlay">
          <div className="file-viewer-popup">
            <div className="popup-header">
              <h3>Share Document</h3>
              <button className="close-button" onClick={() => {
                setSharingFile(null);
                setShareUserId('');
              }}>&times;</button>
            </div>
            <div className="popup-content">
              <p>Share "{sharingFile.name}" with another user</p>
              <div className="share-input-container">
                <input
                  type="text"
                  placeholder="Enter user ID to share with"
                  value={shareUserId}
                  onChange={(e) => setShareUserId(e.target.value)}
                  className="share-input"
                />
                {shareUserId && userDetails[shareUserId] && (
                  <div className="user-preview">
                    Sharing with: {userDetails[shareUserId]}
                  </div>
                )}
              </div>
              <div className="popup-actions">
                <button 
                  className="action-button primary-button"
                  onClick={async () => {
                    if (shareUserId.trim()) {
                      try {
                        const fileRef = doc(db, 'files', sharingFile.id);
                        await updateDoc(fileRef, {
                          sharedWith: [...sharingFile.sharedWith, shareUserId.trim()]
                        });
                        await fetchUserFiles(user.uid);
                        setSharingFile(null);
                        setShareUserId('');
                        toast.success('File shared successfully');
                      } catch (error) {
                        console.error('Error sharing file:', error);
                        toast.error('Failed to share file');
                      }
                    }
                  }}
                >
                  Share
                </button>
                <button 
                  className="action-button secondary-button"
                  onClick={() => {
                    setSharingFile(null);
                    setShareUserId('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deletingFile && (
        <div className="file-viewer-overlay">
          <div className="file-viewer-popup">
            <div className="popup-header">
              <h3>Delete Document</h3>
              <button className="close-button" onClick={() => setDeletingFile(null)}>&times;</button>
            </div>
            <div className="popup-content">
              <div className="delete-confirmation">
                <p>Are you sure you want to delete "{deletingFile.name}"?</p>
                <p className="file-details">
                  Size: {Math.round(deletingFile.size / 1024)} KB<br/>
                  Type: {deletingFile.type}<br/>
                  Uploaded: {new Date(deletingFile.uploadedAt.toDate()).toLocaleString()}
                </p>
                <div className="warning-message">
                  <p>⚠️ This action cannot be undone.</p>
                </div>
              </div>
              <div className="popup-actions">
                <button 
                  className="action-button danger-button"
                  onClick={() => handleDelete(deletingFile.id)}
                >
                  Delete
                </button>
                <button 
                  className="action-button secondary-button"
                  onClick={() => setDeletingFile(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="user-avatar">
            <FiUser size={24} />
          </div>
          <div className="user-info">
            <div className="user-name">{user?.email?.split('@')[0]}</div>
            <div className="user-role">Team Manager</div>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <div
              key={item.title}
              className={`nav-item ${activeNav === item.title ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(item.title);
                navigate(item.path);
              }}
            >
              {item.icon}
              <span>{item.title}</span>
            </div>
          ))}
        </nav>

        <div className="nav-bottom">
          <div className="nav-item">
            <FiHelpCircle />
            <span>Support / Help</span>
          </div>
          <div className="nav-item">
            <FiFolderPlus />
            <span>Add New Folder</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <FiUser />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-header">
          <h1 className="content-title">Document Details</h1>
          <div className="header-actions">
            <div className="user-id-container">
              <span>Your UserID: </span>
              <span className="user-id">{user?.uid.replace(/.(?=.{4})/g, '*')}</span>
              <button className="copy-button" onClick={copyUserId}>
                <FiCopy /> Copy
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="search-filters">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search for documents by name..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="upload-area" onClick={handleUploadClick}>
          <input
            type="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <div className="upload-content">
            <FiUpload className="upload-icon" />
            <p>{uploading ? 'Uploading...' : 'Drop your documents here, or'}</p>
            <button className="action-button primary-button" disabled={uploading}>
              {uploading ? 'Uploading...' : 'click to browse'}
            </button>
            <p className="upload-hint">
              {uploading 
                ? 'Please wait while your files are being uploaded...' 
                : 'You can select multiple files (PDF, Images, Word documents)'}
            </p>
            {error && <p className="upload-error">{error}</p>}
          </div>
        </div>

        <table className="documents-table">
          <thead className="table-header">
            <tr>
              <th>Document Name</th>
              <th>Document Date</th>
              <th>File Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((doc) => (
              <tr key={doc.id} className="table-row">
                <td className="table-cell">
                  {editingFile?.id === doc.id ? (
                    <div className="edit-name-container">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                      />
                      <span className="file-extension">
                        {doc.name.slice(doc.name.lastIndexOf('.'))}
                      </span>
                      <button
                        className="action-button primary-button"
                        onClick={handleSaveEdit}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="document-name">
                      {doc.name}
                    </div>
                  )}
                </td>
                <td className="table-cell">
                  {new Date(doc.uploadedAt?.toDate()).toLocaleDateString('en-GB')}
                </td>
                <td className="table-cell">
                  <span className={`file-type-badge ${doc.fileType}`}>
                    {doc.fileType === 'owned' ? 'Owner' : 'Shared with me'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="document-actions">
                    {doc.fileType === 'owned' && (
                      <>
                        <FiEdit
                          className="action-icon"
                          onClick={() => handleEdit(doc)}
                          onMouseEnter={() => showTooltip('Rename')}
                        />
                        <FiUsers
                          className="action-icon"
                          onClick={() => handleShare(doc)}
                          onMouseEnter={() => showTooltip('Share')}
                        />
                        <FiTrash2
                          className="action-icon"
                          onClick={() => setDeletingFile(doc)}
                          onMouseEnter={() => showTooltip('Delete')}
                        />
                      </>
                    )}
                    <FiEye
                      className="action-icon"
                      onClick={() => handleView(doc)}
                      onMouseEnter={() => showTooltip('View')}
                    />
                    <FiDownload
                      className="action-icon"
                      onClick={() => handleDownload(doc)}
                      onMouseEnter={() => showTooltip('Download')}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <div className="theme-toggle" onClick={toggleTheme}>
        {theme === 'light' ? 
          <BsMoon size={20} /> : 
          <BsSun size={20} />
        }
      </div>
    </div>
  );
};

export default Dashboard;
