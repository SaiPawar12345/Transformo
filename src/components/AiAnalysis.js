import React, { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Loader, Send, Mic, FileText, Trash2, Volume2, VolumeX, ArrowLeft, Download } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import * as docx from 'docx';
import { saveAs } from 'file-saver';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  query,
  where,
  doc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from "../firebase-config";
import { onAuthStateChanged } from 'firebase/auth';
import "./AiAnalysis.css";
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";

const ChatWithPDF = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [fileReadabilityStatus, setFileReadabilityStatus] = useState({});
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [genAI, setGenAI] = useState(null);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState(null);
  const [showRecentChats, setShowRecentChats] = useState(true);
  const [recentChats, setRecentChats] = useState({});
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const speechSynthesisRef = useRef(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    
    try {
      const date = timestamp instanceof Timestamp 
        ? timestamp.toDate()
        : timestamp instanceof Date 
          ? timestamp
          : new Date(timestamp);
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp instanceof Timestamp 
        ? timestamp.toDate()
        : timestamp instanceof Date 
          ? timestamp
          : new Date(timestamp);
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const loadChatHistory = async (userId) => {
    if (!userId) {
      console.error('No user ID provided to loadChatHistory');
      return;
    }

    try {
      console.log('Fetching chat history for user:', userId);
      
      const chatsQuery = query(
        collection(db, 'chatHistory'),
        where('userId', '==', userId)
      );

      console.log('Executing Firestore query...');
      const querySnapshot = await getDocs(chatsQuery);
      console.log('Query completed, documents found:', querySnapshot.size);

      const chats = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document data:', data);
        return {
          id: doc.id,
          question: data.question || '',
          response: data.response || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.userId
        };
      });

      console.log('Processed chats:', chats);

      // Group chats by date
      const grouped = {};
      chats.forEach(chat => {
        const date = formatDate(chat.timestamp);
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(chat);
      });

      console.log('Grouped chats:', grouped);
      setRecentChats(grouped);

      if (chats.length > 0) {
        toast.success(`Loaded ${chats.length} chat messages`);
      } else {
        toast.info('No chat history found');
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(`Failed to fetch chat history: ${error.message}`);
    }
  };

  const saveChatToFirestore = async (userId, question, response) => {
    if (!userId) {
      console.error('No user ID provided to saveChatToFirestore');
      return;
    }

    try {
      console.log('Saving chat to Firestore:', { userId, question, response });
      
      const chatData = {
        userId,
        question,
        response,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'chatHistory'), chatData);
      console.log('Chat saved successfully with ID:', docRef.id);
      
      // Reload chat history after saving
      await loadChatHistory(userId);
      toast.success('Chat saved successfully');
    } catch (error) {
      console.error('Error saving chat:', error);
      toast.error(`Failed to save chat: ${error.message}`);
    }
  };

  const fetchChatHistory = async (userId) => {
    try {
      const chatsQuery = query(
        collection(db, 'chatHistory'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(chatsQuery);
      const formattedMessages = querySnapshot.docs.map((doc) => ({
        id: `history-${doc.id}`,
        role: 'user',
        content: `Q: ${doc.data().question}\nA: ${doc.data().response}`,
      }));
      return formattedMessages;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to fetch chat history');
      return [];
    }
  };

  const exportMessageToDocx = (content) => {
    const document = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "AI Conversation Output",
                bold: true,
                size: 28
              })
            ],
            alignment: 'center'
          }),
          ...content.split('\n').map(line => 
            new Paragraph({
              children: [
                new TextRun({
                  text: line
                })
              ]
            })
          )
        ]
      }]
    });
    
    Packer.toBlob(document).then(blob => {
      saveAs(blob, `ai_output_${new Date().toISOString().replace(/:/g, '-')}.docx`);
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadChatHistory(currentUser.uid);
        setShowRecentChats(true); // Automatically show recent chats when loaded
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const ai = new GoogleGenerativeAI(API_KEY);
    setGenAI(ai);
  }, []);

  useEffect(() => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuestion(transcript);
    };

    window.speechRecognitionInstance = recognition;
  }, []);

  useEffect(() => {
    localStorage.setItem('showRecentChats', JSON.stringify(showRecentChats));
  }, [showRecentChats]);

  // Load initial state from localStorage
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoadingChats(true);
      try {
        const stored = localStorage.getItem('chatHistory');
        console.log('Loading initial state from localStorage');
        
        if (stored) {
          const { userId, chats } = JSON.parse(stored);
          console.log(`Found ${chats.length} chats in localStorage`);
          
          if (chats && chats.length > 0) {
            const processedChats = processChats(chats);
            setRecentChats(processedChats);
          }
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadInitialState();
  }, []);

  // Set up Firebase listener
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const setupFirebaseListener = async (currentUser) => {
      if (!currentUser) {
        console.log('No user logged in');
        setRecentChats({});
        setIsLoadingChats(false);
        return;
      }

      console.log('Setting up Firebase listener for:', currentUser.email);
      setIsLoadingChats(true);

      try {
        const chatsRef = collection(db, 'users', currentUser.uid, 'chats');
        unsubscribeSnapshot = onSnapshot(chatsRef, (snapshot) => {
          console.log(`Received ${snapshot.size} chats from Firebase`);
          const allChats = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.timestamp && data.question && data.response) {
              allChats.push({
                id: doc.id,
                ...data,
              });
            }
          });

          if (allChats.length > 0) {
            console.log('Processing chats from Firebase');
            const processedChats = processChats(allChats);
            setRecentChats(processedChats);
            
            // Update localStorage
            localStorage.setItem('chatHistory', JSON.stringify({
              userId: currentUser.uid,
              chats: allChats
            }));
          }
          setIsLoadingChats(false);
        });
      } catch (error) {
        console.error('Error setting up Firebase listener:', error);
        setIsLoadingChats(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, setupFirebaseListener);

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const processChats = (chats) => {
    if (!Array.isArray(chats) || chats.length === 0) {
      console.log('No chats to process');
      return {};
    }

    console.log('Processing chats:', chats.length);
    
    // Sort all chats by timestamp in descending order (newest first)
    const sortedChats = [...chats].sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp?._seconds * 1000) || new Date(0);
      const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp?._seconds * 1000) || new Date(0);
      return timeB - timeA; // Descending order
    });

    // Group by date
    const grouped = {};
    sortedChats.forEach(chat => {
      const timestamp = chat.timestamp?.toDate?.() || new Date(chat.timestamp?._seconds * 1000) || new Date(0);
      const date = formatDate(timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        ...chat,
        timestamp: timestamp
      });
    });

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b) - new Date(a);
    });

    // Create a new object with sorted dates
    const sortedGrouped = {};
    sortedDates.forEach(date => {
      // Sort chats within each date by timestamp in descending order
      sortedGrouped[date] = grouped[date].sort((a, b) => b.timestamp - a.timestamp);
    });

    console.log('Grouped chats by date:', Object.keys(sortedGrouped).length, 'dates');
    return sortedGrouped;
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    const newFiles = [...files];
    const readabilityStatus = { ...fileReadabilityStatus };
    const newSelectedFiles = [...selectedFiles];

    for (const file of uploadedFiles) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large. Maximum file size is 10MB.`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];

      // Also check file extension for CSV files
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      
      if (!allowedTypes.includes(file.type) && !isCSV) {
        toast.error(`Unsupported file type for ${file.name}. Supported types: PDF, TXT, XLSX, XLS, CSV, JPEG, PNG, GIF`);
        continue;
      }

      if (!newFiles.some(f => f.name === file.name)) {
        // Check file readability
        const status = await checkFileReadability(file);
        
        // Add file and its readability status
        newFiles.push(file);
        readabilityStatus[file.name] = status;

        // Show toast notification with readability status
        const statusMessage = status.isReadable 
          ? `${file.name} is machine-readable: ${status.reason}`
          : `${file.name} may not be machine-readable: ${status.reason}`;
        
        toast(statusMessage, {
          icon: status.isReadable ? '✅' : '⚠️',
          duration: 4000
        });
        newSelectedFiles.push({
          file: file,
          status: status
        });
      }
    }

    setFiles(newFiles);
    setFileReadabilityStatus(readabilityStatus);
    setSelectedFiles(newSelectedFiles);
    
    if (newFiles.length > 0) {
      processUploadedFiles(newFiles);
    }
  };

  const checkFileReadability = async (file) => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    let isReadable = false;
    let reason = '';

    try {
      if (fileType.includes('pdf')) {
        // Check if PDF is searchable
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        
        isReadable = textContent.items.length > 0;
        reason = isReadable ? 'Searchable PDF' : 'Non-searchable PDF (possibly scanned)';
      } 
      else if (fileType.includes('image')) {
        // Use Tesseract to check if image contains machine-printed text
        const result = await Tesseract.recognize(file, 'eng', {
          logger: () => {} // Disable logging
        });
        
        // If confidence is high and text is found, likely machine-printed
        isReadable = result.data.confidence > 70 && result.data.text.length > 20;
        reason = isReadable ? 'Machine-printed text detected' : 'Likely handwritten or image without text';
      }
      else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('xls') || fileType.includes('csv')) {
        // Excel and CSV files are machine-readable
        isReadable = true;
        reason = fileName.endsWith('.csv') ? 'CSV file (machine-readable)' : 'Excel file (machine-readable)';
      }
      else if (fileType.includes('word') || fileType.includes('document')) {
        // Word documents are typically machine-readable
        isReadable = true;
        reason = 'Word document (machine-readable)';
      }
      else if (fileType.includes('text') || fileType.includes('plain')) {
        // Text files are machine-readable
        isReadable = true;
        reason = 'Text-based file (machine-readable)';
      }
      else {
        reason = 'Unsupported file type';
      }

      return { isReadable, reason };
    } catch (error) {
      console.error('Error checking file readability:', error);
      return { isReadable: false, reason: 'Error analyzing file' };
    }
  };

  const handleDeleteFile = (indexToDelete) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
    setSelectedFiles(prevSelectedFiles => prevSelectedFiles.filter((_, index) => index !== indexToDelete));
  };

  const processUploadedFiles = async (filesToProcess) => {
    if (!genAI) return;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    setLoading(true);

    const processedDocuments = [];
    try {
      for (const file of filesToProcess) {
        const summary = await retryRequest(() => analyzeDocument(file, model));
        processedDocuments.push({
          name: file.name,
          summary,
        });
      }
      setProcessedDocs(processedDocuments);
      toast.success("Files processed successfully!");
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Error processing files. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeDocument = async (file, model) => {
    try {
      let textContent = '';
      const reader = new FileReader();
      const base64Data = await new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
  
      const base64Content = base64Data.split(',')[1];
      const fileType = file.type;
  
      if (fileType.includes('image')) {
        // Use Tesseract to extract text from image
        const result = await Tesseract.recognize(file, 'eng', {
          logger: () => {} // Disable logging
        });
        textContent = result.data.text;
      } else if (fileType.includes('pdf')) {
        // Use pdfjs to extract text from PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)));
        textContent = await Promise.all(pages.map(page => page.getTextContent()));
        textContent = textContent.map(page => page.items.map(item => item.str).join(' ')).join(' ');
      } else if (fileType.includes('text') || fileType.includes('plain')) {
        // Read text from file
        const text = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        textContent = text;
      } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('xls') || fileType.includes('csv')) {
        // Read Excel or CSV file
        const arrayBuffer = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let excelText = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          json.forEach(row => {
            excelText += row.join(' ') + '\n';
          });
        });
        textContent = excelText;
      } else {
        throw new Error('Unsupported file type');
      }
  
      if (!textContent || textContent.trim() === "" || textContent.includes("lorem ipsum") || textContent.length < 100) {
        toast.error(`The document ${file.name} appears to be invalid or fake.`);
        return 'This document appears to be invalid or fake.';
      }
  
      return textContent;
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast.error("Error analyzing document. Please try again.");
      return 'Error analyzing document content';
    }
  };

  const retryRequest = async (func, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await func();
      } catch (error) {
        if (i < retries - 1) {
          console.warn(`Retrying... Attempt ${i + 1} of ${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
  
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question
    };
  
    setChatMessages(prev => [...prev, userMessage]);
  
    try {
      setLoading(true);
      const context = processedDocs.map(doc =>
        `Document: ${doc.name}\nSummary: ${doc.summary}`
      ).join('\n\n==========\n\n');
  
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are an AI assistant with detailed knowledge of the following documents:\n\n${context}\n\nUser Query: "${question}"\n\nInstructions for response:\n1. Be specific and provide relevant details from the documents.\n2. Include document summaries when answering.\n3. Clearly state if no information is available.\n\nPlease respond with detailed information:`;
  
      const chatResult = await retryRequest(() => model.generateContent(prompt));
      const cleanedResponse = chatResult.response.text()
        .replace(/\*\*/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
  
      const aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: cleanedResponse
      };
  
      setChatMessages(prev => [...prev, aiMessage]);
      setResponse(cleanedResponse);
      setQuestion('');
      speakResponse(cleanedResponse);
  
      if (user) {
        await saveChatToFirestore(user.uid, question, cleanedResponse);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVoiceInput = () => {
    if (isListening) {
      window.speechRecognitionInstance.stop();
    } else {
      window.speechRecognitionInstance.start();
    }
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        speechSynthesisRef.current = utterance;
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
        toast.error("Speech synthesis error occurred.");
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Speech synthesis is not supported in your browser.");
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'txt':
        return '📝';
      case 'xlsx':
      case 'xls':
      case 'csv':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (window.speechRecognitionInstance) {
        window.speechRecognitionInstance.stop();
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#2D2D2D] border-r border-[#404040] flex flex-col">
        {/* Back to Dashboard Button */}
        <button 
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:bg-[#404040] transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        {/* Upload Section */}
        <div className="p-4 space-y-3">
          <label 
            htmlFor="file-upload" 
            className="flex items-center gap-2 px-4 py-2 bg-[#404040] hover:bg-[#505050] rounded text-gray-300 cursor-pointer transition-colors"
          >
            <FileText size={20} />
            <span>Upload Documents</span>
          </label>
          <input 
            type="file" 
            id="file-upload"
            multiple 
            onChange={handleFileUpload}
            onClick={(e) => e.target.value = null}
            className="hidden" 
            accept=".pdf,.txt,.xlsx,.xls,.csv,image/*"
          />

          {/* Recent Chats Button */}
          <button
            onClick={() => setShowRecentChats(!showRecentChats)}
            className="w-full flex items-center gap-2 px-4 py-2 bg-[#404040] hover:bg-[#505050] rounded text-gray-300 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 transition-transform ${showRecentChats ? 'rotate-180' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Recent Chats {Object.keys(recentChats).length > 0 ? `(${Object.keys(recentChats).length})` : ''}</span>
          </button>
        </div>

        {/* Recent Chats Section */}
        {showRecentChats && (
          <div className="overflow-y-auto flex-grow">
            {isLoadingChats ? (
              <div className="text-gray-400 p-4">Loading chats...</div>
            ) : Object.keys(recentChats).length > 0 ? (
              Object.entries(recentChats).map(([date, chats]) => (
                <div key={date} className="mb-4 px-2">
                  <div className="text-sm text-gray-400 mb-2 font-semibold">{date}</div>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="text-sm p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer mb-2 transition-colors"
                      onClick={() => {
                        setQuestion(chat.question);
                        setResponse(chat.response);
                        setChatMessages([
                          { id: `user-${chat.id}`, role: 'user', content: chat.question },
                          { id: `ai-${chat.id}`, role: 'ai', content: chat.response }
                        ]);
                      }}
                    >
                      <div className="text-white">{chat.question.substring(0, 50)}{chat.question.length > 50 ? '...' : ''}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(chat.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="text-gray-400 p-4">No chat history available</div>
            )}
          </div>
        )}

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Uploaded Files</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-[#404040] rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-gray-300">{file.name}</p>
                    {fileReadabilityStatus[file.name] && (
                      <p className={`text-xs ${fileReadabilityStatus[file.name].isReadable ? 'text-green-400' : 'text-yellow-400'}`}>
                        {fileReadabilityStatus[file.name].reason}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteFile(index)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#1E1E1E]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="max-w-3xl mx-auto py-6 space-y-6">
            {chatMessages.length === 0 ? (
              <div className="text-center space-y-6 mt-24">
                <h1 className="text-4xl font-bold text-gray-200">Document Analysis</h1>
                <p className="text-gray-400">Upload documents and start asking questions</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === 'user' ? 'bg-[#2D2D2D]' : 'bg-[#404040]'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                      }`}>
                        {message.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
                        {message.role === 'ai' && (
                          <div className="flex gap-2 mt-4">
                            <button 
                              onClick={() => speakResponse(message.content)}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title={isSpeaking ? "Stop Speaking" : "Speak Response"}
                            >
                              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <button 
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="Copy to Clipboard"
                            >
                              <FileText size={16} />
                            </button>
                            <button 
                              onClick={() => exportMessageToDocx(message.content)}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="Download as Word Document"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-center">
                <Loader className="animate-spin text-gray-400" size={24} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[#404040] bg-[#1E1E1E] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col gap-2">
              {selectedFiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedFiles.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-[#2D2D2D] rounded-lg p-2 mb-2 last:mb-0">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded bg-pink-500/20 flex items-center justify-center">
                          <span className="text-lg">{getFileIcon(item.file.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300 text-sm truncate block">{item.file.name}</span>
                          <div className="flex items-center mt-1">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              item.status.isReadable ? 'bg-green-400' : 'bg-yellow-400'
                            }`} />
                            <p className="text-xs text-gray-400 truncate">
                              {item.status.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteFile(index)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 bg-[#2D2D2D] rounded-lg p-2">
                <button 
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title={isListening ? "Stop Recording" : "Start Recording"}
                >
                  <Mic size={20} />
                </button>
                <input 
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 bg-transparent text-gray-200 px-4 py-2 focus:outline-none placeholder-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <label 
                  className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors"
                  title="Upload Document"
                >
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    onClick={(e) => e.target.value = null}
                    className="hidden"
                    accept=".pdf,.txt,.xlsx,.xls,.csv,image/*"
                    multiple
                  />
                  <FileText size={20} />
                </label>
                <button 
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || loading}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send Message"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#2D2D2D',
            color: '#fff',
          }
        }}
      />
    </div>
  );
}

export default ChatWithPDF;
