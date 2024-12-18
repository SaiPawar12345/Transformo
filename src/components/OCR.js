import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FiUpload, FiDownload } from 'react-icons/fi';
import { GoogleGenerativeAI } from "@google/generative-ai";
import toast, { Toaster } from "react-hot-toast";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";

// Available export formats
const EXPORT_FORMATS = [
  { value: 'docx', label: 'Word Document', icon: '📝' },
  { value: 'xlsx', label: 'Excel Spreadsheet', icon: '📊' },
  { value: 'csv', label: 'CSV File', icon: '📑' },
  { value: 'txt', label: 'Text File', icon: '📋' },
  { value: 'json', label: 'JSON File', icon: '🔧' }
];

// Function to convert PDF page to image
const pdfPageToImage = async (page) => {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  return canvas;
};

// Function to extract text from PDF
const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
};

// Function to clean and structure OCR text using AI
const cleanAndStructureText = async (text, genAI) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Clean and structure the following OCR text. Remove any gibberish or noise. Preserve the document structure (headings, paragraphs, lists). Format it as JSON with the following structure:
    {
      "sections": [
        {
          "type": "heading|paragraph|list",
          "content": "cleaned text",
          "format": {
            "bold": boolean,
            "size": "large|medium|small"
          }
        }
      ]
    }
    
    OCR Text:
    ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanedData = JSON.parse(response.text());
    
    return cleanedData;
  } catch (error) {
    console.error('Error cleaning text:', error);
    // Return basic structure if AI processing fails
    return {
      sections: [{
        type: 'paragraph',
        content: text.replace(/[^\w\s.,!?;:'"()\-]/g, ' ').replace(/\s+/g, ' ').trim(),
        format: { bold: false, size: 'medium' }
      }]
    };
  }
};

// Function to process PDF with OCR
const processPDFWithOCR = async (file, genAI) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Process all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const canvas = await pdfPageToImage(page);
      
      const result = await Tesseract.recognize(
        canvas,
        'eng',
        {
          logger: m => console.log(m)
        }
      );
      
      fullText += result.data.text + '\n\n';
    }
    
    // Clean and structure the text
    const cleanedData = await cleanAndStructureText(fullText, genAI);
    return cleanedData;
  } catch (error) {
    console.error('Error processing PDF with OCR:', error);
    throw error;
  }
};

// Function to create Excel/CSV from text content
const createSpreadsheet = (content, type) => {
  // Convert document structure to rows
  const rows = content.sections.map(section => [
    section.type,
    section.content,
    section.format ? JSON.stringify(section.format) : ''
  ]);

  // Add header row
  rows.unshift(['Type', 'Content', 'Formatting']);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  if (type === 'xlsx') {
    // Generate Excel file
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Text');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else {
    // Generate CSV file
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    return new Blob([csvContent], { type: 'text/csv' });
  }
};

const OCR = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [genAI, setGenAI] = useState(null);
  const [documentStructure, setDocumentStructure] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('docx');

  useEffect(() => {
    const ai = new GoogleGenerativeAI(API_KEY);
    setGenAI(ai);
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check file size
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size should not exceed 10MB');
      }

      // Handle different file types
      if (file.type === 'application/pdf') {
        // Try to extract text from PDF
        const text = await extractTextFromPDF(file);
        
        // If PDF has no text content, it's likely non-searchable
        if (!text.trim()) {
          const toastId = toast.loading('Processing non-searchable PDF with OCR...', {
            duration: 0,
          });
          
          try {
            const processedData = await processPDFWithOCR(file, genAI);
            toast.success('OCR processing completed', {
              id: toastId,
            });
            
            setDocumentStructure(processedData);
          } catch (ocrError) {
            toast.error('Failed to process PDF with OCR', {
              id: toastId,
            });
            throw ocrError;
          }
        } else {
          // Clean and structure the extracted text
          const cleanedData = await cleanAndStructureText(text, genAI);
          setDocumentStructure(cleanedData);
        }
        
        // Create preview for the first page
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const canvas = await pdfPageToImage(page);
        setImagePreview(canvas.toDataURL());
        
      } else if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        throw new Error('Please select a valid PDF or image file');
      }

      setSelectedFile(file);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processImage = async () => {
    if (!selectedFile || !genAI) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
      Analyze this image and extract all text content. For each text element provide:
      1. The exact text content
      2. Whether it appears to be:
         - A heading (h1, h2, etc.)
         - A paragraph
         - A list item
         - A table cell
      3. Basic formatting:
         - Is it bold?
         - Is it italic?
         - Approximate font size (small, medium, large)
         - Text color (if not black)
      
      Return the response in this exact format (no markdown, no code blocks):
      {
        "sections": [
          {
            "type": "heading|paragraph|list|table",
            "content": "actual text content",
            "format": {
              "bold": true/false,
              "italic": true/false,
              "size": "small|medium|large",
              "color": "color name or hex"
            }
          }
        ]
      }`;

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }]
        }]
      });

      const response = result.response.text();
      let documentContent;
      
      try {
        // Try to find and parse JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          documentContent = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, create a simple text structure
          documentContent = {
            sections: [{
              type: "paragraph",
              content: response.replace(/[\s\S]*/g, '').trim(),
              format: { bold: false, italic: false, size: "medium", color: "black" }
            }]
          };
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        // Create a basic structure with the raw text
        documentContent = {
          sections: [{
            type: "paragraph",
            content: response.replace(/[\s\S]*/g, '').trim(),
            format: { bold: false, italic: false, size: "medium", color: "black" }
          }]
        };
      }

      setDocumentStructure(documentContent);

      // Save to Firestore if user is authenticated
      if (auth.currentUser) {
        await addDoc(collection(db, 'ocr-results'), {
          userId: auth.currentUser.uid,
          fileName: selectedFile.name,
          documentStructure: documentContent,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setError('Error processing image: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createDocxElement = (section) => {
    const elements = [];
    
    // Convert color names to hex codes
    const colorMap = {
      'black': '000000',
      'white': 'FFFFFF',
      'red': 'FF0000',
      'blue': '0000FF',
      'green': '00FF00',
      'yellow': 'FFFF00',
      'purple': '800080',
      'gray': '808080',
      'orange': 'FFA500'
    };

    const textStyle = {
      bold: section.format?.bold || false,
      italic: section.format?.italic || false,
      size: section.format?.size === 'large' ? 32 : section.format?.size === 'small' ? 20 : 24,
      color: section.format?.color ? 
        (colorMap[section.format.color.toLowerCase()] || 
         section.format.color.replace('#', '')) : '000000'
    };

    switch (section.type) {
      case 'heading':
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: section.content || '', ...textStyle, size: 32 })],
            spacing: { before: 400, after: 200 }
          })
        );
        break;
      case 'list':
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: '• ' + (section.content || ''), ...textStyle })],
            spacing: { before: 100, after: 100 }
          })
        );
        break;
      case 'table':
        // Handle table content
        const tableText = section.content || '';
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: tableText, ...textStyle })],
            spacing: { before: 100, after: 100 }
          })
        );
        break;
      default: // paragraph
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: section.content || '', ...textStyle })],
            spacing: { before: 200, after: 200 }
          })
        );
    }

    return elements;
  };

  const handleExport = async () => {
    if (!documentStructure) {
      toast.error('No content to export');
      return;
    }

    try {
      let outputBlob;
      let fileExtension;

      switch (selectedFormat) {
        case 'docx':
          const doc = new Document({
            sections: [{
              properties: {},
              children: documentStructure.sections.flatMap(section => 
                createDocxElement(section)
              )
            }]
          });
          outputBlob = await Packer.toBlob(doc);
          fileExtension = 'docx';
          break;

        case 'xlsx':
          outputBlob = createSpreadsheet(documentStructure, 'xlsx');
          fileExtension = 'xlsx';
          break;

        case 'csv':
          outputBlob = createSpreadsheet(documentStructure, 'csv');
          fileExtension = 'csv';
          break;

        case 'txt':
          // Create plain text version
          const textContent = documentStructure.sections
            .map(section => section.content)
            .join('\n\n');
          outputBlob = new Blob([textContent], { type: 'text/plain' });
          fileExtension = 'txt';
          break;

        case 'json':
          outputBlob = new Blob([JSON.stringify(documentStructure, null, 2)], 
            { type: 'application/json' });
          fileExtension = 'json';
          break;
      }

      saveAs(outputBlob, `OCR_Document_${new Date().toISOString().replace(/:/g, '-')}.${fileExtension}`);
      toast.success(`Document exported as ${fileExtension.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export document');
    }
  };

  return (
    <div className="min-h-screen bg-black py-8">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back to Dashboard Button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-purple-400 rounded-md shadow-sm text-sm font-medium text-white bg-transparent hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Smart OCR Converter
            </h1>
            <p className="mt-4 text-lg text-gray-300">
              Convert your images to editable documents with our advanced OCR technology
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-gray-900 shadow-xl sm:rounded-lg overflow-hidden border border-purple-500">
            {/* Upload Section */}
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-lg">
                  <label className="flex flex-col items-center w-full h-32 px-4 transition bg-gray-800 border-2 border-purple-400 border-dashed rounded-lg cursor-pointer hover:border-purple-300 hover:bg-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiUpload className="w-8 h-8 mb-3 text-purple-400" />
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        PDF, PNG, JPG up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="application/pdf,image/*"
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview Section */}
                {imagePreview && (
                  <div className="mt-8 w-full max-w-lg">
                    <div className="relative rounded-lg overflow-hidden shadow-lg border border-purple-500">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-4 w-full max-w-lg bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg">
                  <button
                    className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                      isLoading || !selectedFile
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                    }`}
                    onClick={processImage}
                    disabled={!selectedFile || isLoading}
                  >
                    <FiUpload className="mr-2 -ml-1 h-5 w-5" />
                    {isLoading ? 'Processing...' : 'Convert to Document'}
                  </button>

                  {documentStructure && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        className="block w-full sm:w-48 px-3 py-2 text-base border-purple-400 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {EXPORT_FORMATS.map(format => (
                          <option key={format.value} value={format.value}>
                            {format.icon} {format.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={handleExport}
                      >
                        <FiDownload className="mr-2 -ml-1 h-5 w-5" />
                        Export Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Status */}
            {isLoading && (
              <div className="px-4 py-5 sm:p-6 border-t border-purple-500">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
                <p className="mt-2 text-center text-sm text-gray-300">
                  Processing your image, please wait...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCR;