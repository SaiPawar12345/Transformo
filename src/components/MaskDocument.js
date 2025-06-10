import React, { useState, useEffect } from 'react';
import { FileUploader } from "react-drag-drop-files";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from 'react-hot-toast';

// Initialize Gemini with API key from AiAnalysis
const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";
const genAI = new GoogleGenerativeAI(API_KEY);

const MaskDocument = () => {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const fileTypes = ["PNG", "JPG", "JPEG"];

  const performOCR = async (imageUrl) => {
    try {
      const worker = await createWorker();
      const result = await worker.recognize(imageUrl);
      
      // Get word-level data
      const words = [];
      if (result && result.data && result.data.lines) {
        result.data.lines.forEach(line => {
          if (line.words) {
            line.words.forEach(word => {
              if (word.text && word.bbox) {
                words.push({
                  text: word.text,
                  bbox: {
                    x0: word.bbox.x0,
                    y0: word.bbox.y0,
                    x1: word.bbox.x1,
                    y1: word.bbox.y1
                  }
                });
              }
            });
          }
        });
      }

      await worker.terminate();
      return {
        text: result.data.text,
        words: words
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  };

  const findWordBoundingBoxes = (searchText, ocrResult) => {
    try {
      if (!ocrResult || !ocrResult.words || !Array.isArray(ocrResult.words)) {
        console.error('Invalid OCR result structure:', ocrResult);
        return [];
      }

      const boxes = [];
      const words = ocrResult.words;
      
      // Convert search text to lowercase and split into words
      const searchWords = searchText.toLowerCase().trim().split(/\s+/);
      if (searchWords.length === 0) return [];

      // Find sequences of matching words
      for (let i = 0; i < words.length; i++) {
        const currentWord = words[i];
        if (!currentWord?.text) continue;
        
        const currentWordText = currentWord.text.toLowerCase();
        
        // Check if this word starts a matching sequence
        if (currentWordText === searchWords[0]) {
          let isFullMatch = true;
          let matchedWords = [currentWord];
          
          // Check subsequent words
          for (let j = 1; j < searchWords.length && i + j < words.length; j++) {
            const nextWord = words[i + j];
            if (!nextWord?.text || nextWord.text.toLowerCase() !== searchWords[j]) {
              isFullMatch = false;
              break;
            }
            matchedWords.push(nextWord);
          }
          
          if (isFullMatch && matchedWords.length > 0) {
            try {
              // Calculate bounding box that encompasses all matched words
              const box = {
                x: Math.min(...matchedWords.map(w => w.bbox.x0)),
                y: Math.min(...matchedWords.map(w => w.bbox.y0)),
                width: Math.max(...matchedWords.map(w => w.bbox.x1)) - Math.min(...matchedWords.map(w => w.bbox.x0)),
                height: Math.max(...matchedWords.map(w => w.bbox.y1)) - Math.min(...matchedWords.map(w => w.bbox.y0))
              };
              
              boxes.push(box);
              i += matchedWords.length - 1; // Skip the matched words
            } catch (error) {
              console.error('Error calculating bounding box:', error);
              continue;
            }
          }
        }
      }
      
      return boxes;
    } catch (error) {
      console.error('Error in findWordBoundingBoxes:', error);
      return [];
    }
  };

  const identifySensitiveInfo = async (text) => {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      });

      const prompt = `You are a secure document analysis tool. Your task is to identify sensitive information in documents for security and privacy purposes. This is for data protection and privacy compliance.

Analyze the following text and identify sensitive information that needs to be redacted for privacy protection. Focus on:
1. Personal Identifiable Information (PII): names, addresses, birth dates
2. Financial Information: account numbers, amounts
3. Contact Information: phone numbers, email addresses
4. Other sensitive data: passwords, IDs, etc.

Return the results in this exact JSON format, with no additional text or markdown:
{
  "items": [
    {
      "text": "exact text to mask",
      "type": "PII/FINANCIAL/CONTACT/OTHER"
    }
  ]
}

Text to analyze: ${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonStr = response.text().trim();
      
      try {
        const parsed = JSON.parse(jsonStr);
        return parsed.items || [];
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        // Attempt to clean the response if it contains markdown
        const cleanJson = jsonStr.replace(/\`\`\`json|\`\`\`/g, '').trim();
        try {
          return JSON.parse(cleanJson).items || [];
        } catch (error) {
          console.error('Failed to parse cleaned JSON:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      if (error.message.includes('SAFETY')) {
        toast.error('Safety check failed. Please ensure the content is appropriate.');
      } else {
        toast.error('Error analyzing document. Please try again.');
      }
      return [];
    }
  };

  const handleChange = async (file) => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    try {
      const url = URL.createObjectURL(file);
      setFile(file);
      setFileUrl(url);
      setSelectedAreas([]);
      setError(null);
      setIsProcessing(true);
      toast.loading('Processing document...');

      // Get image dimensions first
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Perform OCR
      const ocrData = await performOCR(url);
      if (!ocrData || !ocrData.text) {
        throw new Error('OCR failed to extract text from the image');
      }

      // Identify sensitive information
      const sensitiveItems = await identifySensitiveInfo(ocrData.text);
      if (!sensitiveItems || sensitiveItems.length === 0) {
        toast.success('No sensitive information detected');
        setIsProcessing(false);
        return;
      }

      // Create masked areas based on sensitive information
      const newAreas = [];
      for (const item of sensitiveItems) {
        if (!item?.text || !item?.type) continue;
        
        // Find bounding boxes for the sensitive text
        const boxes = findWordBoundingBoxes(item.text, ocrData);
        
        // Add each box as a masked area with scaling
        boxes.forEach(box => {
          // Add padding to the box
          const padding = Math.min(10, Math.max(5, box.width * 0.1)); // Dynamic padding based on word size
          
          // Calculate scaled coordinates
          const scaledBox = {
            x: Math.max(0, box.x - padding),
            y: Math.max(0, box.y - padding),
            width: Math.min(img.width - box.x, box.width + (padding * 2)),
            height: Math.min(img.height - box.y, box.height + (padding * 2)),
            type: item.type
          };

          newAreas.push(scaledBox);
        });
      }

      setSelectedAreas(newAreas);
      setIsProcessing(false);
      toast.success(`Detected ${newAreas.length} sensitive areas`);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || 'Error processing file. Please try again.');
      setIsProcessing(false);
      toast.dismiss();
      toast.error(err.message || 'Error processing document');
    }
  };

  const handleMask = () => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = fileUrl;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Draw masks with padding
      selectedAreas.forEach(area => {
        ctx.fillStyle = 'black';
        ctx.fillRect(area.x, area.y, area.width, area.height);
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'masked_document.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    };
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white p-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Document Masking</h1>
        
        {!fileUrl ? (
          <div className="bg-[#2D2D2D] p-8 rounded-lg">
            <FileUploader 
              handleChange={handleChange} 
              name="file" 
              types={fileTypes}
            >
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
                <p className="text-gray-400">Drag and drop your document here, or click to select</p>
                <p className="text-sm text-gray-500 mt-2">Supported formats: PNG, JPG, JPEG</p>
              </div>
            </FileUploader>
          </div>
        ) : (
          <div className="bg-[#2D2D2D] p-8 rounded-lg">
            {error ? (
              <div className="text-red-500 text-center p-4">
                {error}
                <button
                  onClick={() => {
                    setFile(null);
                    setFileUrl(null);
                    setError(null);
                  }}
                  className="block mx-auto mt-4 px-4 py-2 bg-[#404040] rounded hover:bg-[#505050]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="relative bg-[#1E1E1E] rounded-lg overflow-hidden">
                  <img 
                    src={fileUrl} 
                    alt="Document preview" 
                    className="max-w-full mx-auto"
                    style={{ maxHeight: '70vh' }}
                  />

                  {selectedAreas.map((area, index) => (
                    <div
                      key={index}
                      className="absolute border border-white cursor-move"
                      style={{
                        left: area.x,
                        top: area.y,
                        width: area.width,
                        height: area.height,
                        backgroundColor: area.type === 'PII' ? 'rgba(255, 0, 0, 0.5)' :
                                       area.type === 'FINANCIAL' ? 'rgba(0, 0, 255, 0.5)' :
                                       area.type === 'CONTACT' ? 'rgba(0, 255, 0, 0.5)' :
                                       'rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <span className="absolute -top-5 left-0 text-xs bg-black/75 px-1 rounded">
                        {area.type}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => {
                      setFile(null);
                      setFileUrl(null);
                      setSelectedAreas([]);
                      setOcrText('');
                      setOcrResult(null);
                    }}
                    className="px-4 py-2 bg-[#404040] rounded hover:bg-[#505050]"
                  >
                    Choose Different File
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={handleMask}
                      className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                      disabled={selectedAreas.length === 0 || isProcessing}
                    >
                      Download Masked Document
                    </button>
                  </div>
                </div>

                {selectedAreas.length > 0 && (
                  <div className="mt-4 p-4 bg-[#1E1E1E] rounded">
                    <h3 className="text-lg font-semibold mb-2">Detected Sensitive Information:</h3>
                    <div className="flex gap-2 flex-wrap">
                      {['PII', 'FINANCIAL', 'CONTACT', 'OTHER'].map(type => (
                        <div 
                          key={type}
                          className="flex items-center gap-2"
                        >
                          <div 
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor: type === 'PII' ? 'rgba(255, 0, 0, 0.5)' :
                                             type === 'FINANCIAL' ? 'rgba(0, 0, 255, 0.5)' :
                                             type === 'CONTACT' ? 'rgba(0, 255, 0, 0.5)' :
                                             'rgba(0, 0, 0, 0.5)'
                            }}
                          />
                          <span className="text-sm">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaskDocument;
