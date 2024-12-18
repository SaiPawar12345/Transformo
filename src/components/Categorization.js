import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiFileText, FiFolder, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import '../styles/Categorization.css';

const CATEGORIES = {
  'all documents': {
    bg: 'bg-blue-500',
    text: 'text-blue-500'
  },
  'personal identity': {
    bg: 'bg-purple-500',
    text: 'text-purple-500'
  },
  'legal': {
    bg: 'bg-emerald-500',
    text: 'text-emerald-500'
  },
  'education': {
    bg: 'bg-blue-500',
    text: 'text-blue-500'
  },
  'financial': {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500'
  },
  'medical': {
    bg: 'bg-red-500',
    text: 'text-red-500'
  },
  'work': {
    bg: 'bg-orange-500',
    text: 'text-orange-500'
  }
};

const Categorization = () => {
  const [files, setFiles] = useState([]);
  const [categorizedFiles, setCategorizedFiles] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

  // Theme persistence
  useEffect(() => {
    // Set initial theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme);

    // Listen for theme changes in localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue || 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        setTheme(newTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserFiles(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserFiles = async (userId) => {
    try {
      setLoading(true);
      const filesRef = collection(db, 'files');
      const q = query(filesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const userFiles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'pending',
        category: doc.data().category || 'other'
      }));

      // First, create the 'all documents' category with all files
      const groupedFiles = {
        'all documents': userFiles
      };

      // Then group files by their specific categories
      userFiles.forEach(file => {
        const category = file.category || 'other';
        if (!groupedFiles[category]) {
          groupedFiles[category] = [];
        }
        if (category !== 'all documents') {
          groupedFiles[category].push(file);
        }
      });

      // Move files not in predefined categories to 'other'
      const otherFiles = userFiles.filter(file => 
        !Object.keys(CATEGORIES).includes(file.category) && file.category !== 'all documents'
      );

      if (otherFiles.length > 0) {
        groupedFiles['other'] = otherFiles;
      }

      setFiles(userFiles);
      setCategorizedFiles(groupedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      fetchUserFiles(user.uid);
      toast.success('Refreshing documents...');
    }
  };

  const renderCategories = () => {
    // First render 'all documents'
    const allDocs = categorizedFiles['all documents'] || [];
    const filteredAllDocs = allDocs.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = ['all documents', ...Object.keys(CATEGORIES).filter(cat => cat !== 'all documents')];
    if (categorizedFiles['other']) {
      categories.push('other');
    }

    return categories.map(category => {
      const files = categorizedFiles[category] || [];
      const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filteredFiles.length === 0) return null;

      const style = CATEGORIES[category] || { bg: 'bg-gray-500', text: 'text-gray-500' };

      return (
        <div key={category} className="category-section">
          <div className="category-header">
            <h2>
              <FiFolder /> {category.charAt(0).toUpperCase() + category.slice(1)}
              <span className="category-count">({filteredFiles.length})</span>
            </h2>
          </div>
          
          <div className="documents-grid">
            {filteredFiles.map((file) => (
              <div key={file.id} className="document-card">
                <div className="document-icon">
                  <FiFileText />
                </div>
                <div className="document-name">{file.name}</div>
                <div className="document-date">
                  {new Date(file.uploadedAt?.toDate()).toLocaleDateString()}
                </div>
                <div className={`status-bar ${file.status}`}></div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="categorization">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button onClick={handleRefresh} className="refresh-button">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {renderCategories()}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default Categorization;