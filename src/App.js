import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import RefrshHandler from './RefrshHandler';
import Login from './components/Login';
import Signup from './components/Signup';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import PDFToJPG from './components/PDFToJPG';
import JpgToPdfConverter from './components/JpgToPdfConverter';
import MergePDF from './components/MergePDF';
import JSONToPDF from './components/JSONToPDF';
import Sentiment from './components/Sentiment';
import Translate from './components/texttranslation';
import SplitPDF from './components/splitPDF';
import Sp2txt from './components/sp2txt';
import AiAnalysis from './components/AiAnalysis';
import LandingPage from './components/LandingPage';
import Payment from './components/Payment'; 
import Categorization from './components/Categorization'; 
import DocToPdf from './components/DocToPdf';
import PdfToDocs from './components/PdfToDocs';
import XMLToJSON from './components/XMLToJSON';
import JSONToXML from './components/JSONToXML';
import JSONToCSV from './components/JSONToCSV';
import PDFToJSON from './components/PDFToJSON';
import OCR from './components/OCR';
import MaskDocument from './components/MaskDocument';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // PrivateRoute for authentication
  const PrivateRoute = ({ element }) => {
    return isAuthenticated ? element : <Navigate to="/login" replace />;
  };
  return (
    <div className="App">
      <RefrshHandler setIsAuthenticated={setIsAuthenticated} />
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />

        {/* Private Routes */}
        <Route path="/home" element={<PrivateRoute element={<Home />} />} />

        {/* Public Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pdf-to-jpg" element={<PDFToJPG />} />
        <Route path="/jpg-to-pdf" element={<JpgToPdfConverter />} />
        <Route path="/merge-pdf" element={<MergePDF />} />
        <Route path="/json-to-pdf" element={<JSONToPDF />} />
        <Route path="/split-pdf" element={<SplitPDF />} />
        <Route path="/sp2txt" element={<Sp2txt />} />
        <Route path="/sentiment" element={<Sentiment />} />
        <Route path="/ai-analysis" element={<AiAnalysis />} />
        <Route path="/translate" element={<Translate />} />
        <Route path="/csv-to-json" element={<PdfToDocs />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/categorization" element={<Categorization />} /> 
        <Route path="/word-to-pdf" element={<DocToPdf />} />
        <Route path="/xml-to-json" element={<XMLToJSON />} />
        <Route path="/ocr" element={<OCR />} />
        <Route path="/json-to-xml" element={<JSONToXML />} />
        <Route path="/json-to-csv" element={<JSONToCSV />} />
        <Route path="/pdf-to-json" element={<PDFToJSON />} />
        <Route path="/mask-document" element={<MaskDocument />} />

        {/* Landing Page Route */}
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    </div>
  );
}

export default App;
