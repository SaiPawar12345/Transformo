import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftCircle } from 'react-feather';
import pptxgen from 'pptxgenjs';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './PdfToPpt.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Configure Gemini AI with the same API key as AiAnalysis
const API_KEY = "AIzaSyD6olpfeXKuZiACMF5awOE_HxOI4ifOlZM";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function PdfToPpt() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText;
    } catch (error) {
      throw new Error('Failed to extract text from PDF');
    }
  };

  const generateSummaryPoints = async (text, numPoints) => {
    try {
      const prompt = `Create ${numPoints} key bullet points from this text. Each point should be clear and concise (max 15 words).
      Format the response as bullet points using • symbol.
      
      Text to analyze: ${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      return content
        .split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(point => point.trim().substring(1).trim());
    } catch (error) {
      console.error('Summary Generation Error:', error);
      throw new Error('Failed to generate summary points');
    }
  };

  const generatePresentationContent = async (text) => {
    try {
      const prompt = `Analyze this text and create a professional presentation outline. Be specific and insightful.

      Requirements:
      1. Create a compelling title (3-5 words)
      2. Write an engaging subtitle that explains the key focus
      3. Extract 3-4 main themes/sections
      4. For each theme, provide 3-4 specific, actionable bullet points
      5. End with a strong conclusion

      Format your response exactly like this:
      TITLE: [Your Title]
      SUBTITLE: [Your Subtitle]

      SECTION 1: [Theme Name]
      • [Clear, specific point]
      • [Clear, specific point]
      • [Clear, specific point]

      SECTION 2: [Theme Name]
      • [Clear, specific point]
      • [Clear, specific point]
      • [Clear, specific point]

      CONCLUSION: [Impactful closing statement]

      Make all points clear, specific, and actionable.
      Text to analyze: ${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      // Parse the content into structured format
      const lines = content.split('\n').filter(line => line.trim());
      
      let title = 'Document Summary';
      let subtitle = 'Key Insights and Analysis';
      let conclusion = 'Thank you for your attention';
      const keyPoints = [];
      
      let currentSection = null;
      let currentPoints = [];
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('TITLE:')) {
          title = trimmedLine.replace('TITLE:', '').trim();
        } 
        else if (trimmedLine.startsWith('SUBTITLE:')) {
          subtitle = trimmedLine.replace('SUBTITLE:', '').trim();
        }
        else if (trimmedLine.startsWith('CONCLUSION:')) {
          conclusion = trimmedLine.replace('CONCLUSION:', '').trim();
        }
        else if (trimmedLine.startsWith('SECTION')) {
          // Save previous section if exists
          if (currentSection && currentPoints.length > 0) {
            keyPoints.push({
              theme: currentSection,
              points: [...currentPoints]
            });
          }
          currentSection = trimmedLine.split(':')[1]?.trim() || 'Key Points';
          currentPoints = [];
        }
        else if (trimmedLine.startsWith('•')) {
          const point = trimmedLine.substring(1).trim();
          if (point && currentSection) {
            currentPoints.push(point);
          }
        }
      });
      
      // Add the last section if exists
      if (currentSection && currentPoints.length > 0) {
        keyPoints.push({
          theme: currentSection,
          points: [...currentPoints]
        });
      }

      return {
        title,
        subtitle,
        keyPoints,
        conclusion
      };
    } catch (error) {
      console.error('Content Generation Error:', error);
      throw new Error('Failed to generate presentation content');
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const calculateFontSize = (text, baseSize) => {
    const length = text.length;
    if (length > 200) return Math.max(baseSize - 6, 14);
    if (length > 150) return Math.max(baseSize - 4, 16);
    if (length > 100) return Math.max(baseSize - 2, 18);
    return baseSize;
  };

  const createPresentation = async (text) => {
    try {
      // Generate content using Gemini
      const content = await generatePresentationContent(text);
      
      // Create new presentation
      const pres = new pptxgen();

      // Set master slide
      pres.layout = 'LAYOUT_16x9';
      pres.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });

      // Add title slide
      const titleSlide = pres.addSlide();
      
      // Add background
      titleSlide.addShape(pres.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: 'F5F5F5' }
      });
      
      // Title with dynamic font size
      const truncatedTitle = truncateText(content.title, 50);
      titleSlide.addText(truncatedTitle, {
        x: 0,
        y: 1.2,
        w: 10,
        h: 1,
        fontSize: calculateFontSize(truncatedTitle, 40),
        bold: true,
        align: 'center',
        color: '4A2FBD',
        fontFace: 'Arial',
        valign: 'middle'
      });

      // Subtitle with dynamic font size
      const truncatedSubtitle = truncateText(content.subtitle, 80);
      titleSlide.addText(truncatedSubtitle, {
        x: 0,
        y: 3,
        w: 10,
        h: 0.7,
        fontSize: calculateFontSize(truncatedSubtitle, 24),
        align: 'center',
        color: '666666',
        fontFace: 'Arial',
        valign: 'middle'
      });

      // Calculate optimal content distribution
      const MAX_POINTS_PER_SLIDE = 4;
      const MIN_FONT_SIZE = 16;
      const slidesContent = [];
      let currentSlidePoints = [];
      let currentTheme = '';

      content.keyPoints.forEach(section => {
        section.points.forEach(point => {
          // Check if point is too long and needs its own slide
          const pointLength = point.length;
          if (pointLength > 200 || currentSlidePoints.length >= MAX_POINTS_PER_SLIDE || currentTheme !== section.theme) {
            if (currentSlidePoints.length > 0) {
              slidesContent.push({
                theme: currentTheme,
                points: [...currentSlidePoints]
              });
            }
            currentSlidePoints = [];
            currentTheme = section.theme;
          }
          currentSlidePoints.push(truncateText(point, 150));
        });
      });

      // Add remaining points
      if (currentSlidePoints.length > 0) {
        slidesContent.push({
          theme: currentTheme,
          points: [...currentSlidePoints]
        });
      }

      // Add content slides
      slidesContent.forEach((section) => {
        const slide = pres.addSlide();
        
        // Add background
        slide.addShape(pres.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          fill: { color: 'FFFFFF' }
        });
        
        // Add section header bar
        slide.addShape(pres.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.7,
          fill: { color: '4A2FBD' }
        });

        // Section title with truncation
        const truncatedTheme = truncateText(section.theme, 60);
        slide.addText(truncatedTheme, {
          x: 0.5,
          y: 0.1,
          w: 9,
          h: 0.5,
          fontSize: calculateFontSize(truncatedTheme, 24),
          bold: true,
          color: 'FFFFFF',
          fontFace: 'Arial',
          align: 'left',
          valign: 'middle'
        });

        // Calculate spacing based on number of points and their lengths
        const maxPointLength = Math.max(...section.points.map(p => p.length));
        const pointSpacing = Math.min(1.1, (4.5 / section.points.length));
        const baseFontSize = maxPointLength > 100 ? 18 : 20;

        // Add points with dynamic spacing and font size
        section.points.forEach((point, index) => {
          const fontSize = calculateFontSize(point, baseFontSize);
          slide.addText(point, {
            x: 0.8,
            y: 1 + (index * pointSpacing),
            w: 8.4,
            h: pointSpacing * 0.8,  // Adjust height based on spacing
            fontSize: fontSize,
            bullet: true,
            color: '333333',
            fontFace: 'Arial',
            align: 'left',
            valign: 'top',  // Changed to top alignment for better text flow
            margin: [0, 0, 0, 20],
            breakLine: true,  // Enable text wrapping
            autoFit: true    // Automatically fit text
          });
        });
      });

      // Add Thank You slide
      const conclusionSlide = pres.addSlide();
      
      conclusionSlide.addShape(pres.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: '4A2FBD' }
      });

      conclusionSlide.addText('Thank You', {
        x: 0,
        y: 2,
        w: 10,
        h: 1,
        fontSize: 42,
        bold: true,
        align: 'center',
        color: 'FFFFFF',
        fontFace: 'Arial',
        valign: 'middle'
      });

      // Save the presentation
      const fileName = `${selectedFile.name.replace('.pdf', '')}_presentation.pptx`;
      await pres.writeFile({ fileName });
      return true;
    } catch (error) {
      console.error('Presentation Creation Error:', error);
      throw new Error('Failed to create presentation');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleConversion = async () => {
    if (!selectedFile) return;

    setConverting(true);
    setProgress(0);
    setError('');

    try {
      // Extract text from PDF
      setProgress(20);
      const text = await extractTextFromPDF(selectedFile);
      
      // Create presentation
      setProgress(50);
      const success = await createPresentation(text);
      
      if (success) {
        setProgress(100);
      } else {
        throw new Error('Conversion failed');
      }
    } catch (err) {
      console.error('Conversion Error:', err);
      setError('Failed to convert PDF to PPT. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <section className="pdf-to-ppt" id="pdf-to-ppt">
      <div className="back-button" onClick={() => navigate('/')}>
        <ArrowLeftCircle size={25} /> Back to Home
      </div>
      <div className="content-wrapper">
        <div className="pdf-to-ppt-box">
          <h2>Convert PDF to PPT</h2>
          <p>Transform your PDF documents into engaging PowerPoint presentations with AI</p>
          
          <div className="upload-section">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf"
              id="file-upload"
              className="file-input"
            />
            <label htmlFor="file-upload" className="upload-label">
              {selectedFile 
                ? selectedFile.name.length > 25 
                  ? selectedFile.name.substring(0, 22) + '...' 
                  : selectedFile.name 
                : 'Choose PDF File'}
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          {progress > 0 && (
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}

          <button
            className="convert-button"
            onClick={handleConversion}
            disabled={!selectedFile || converting}
          >
            {converting ? 'Converting...' : 'Convert to PPT'}
          </button>

          <div className="features-list">
            <h3>Features:</h3>
            <ul>
              <li>✓ AI-powered summarization</li>
              <li>✓ Smart content organization</li>
              <li>✓ Bullet-point generation</li>
              <li>✓ Professional formatting</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PdfToPpt;
