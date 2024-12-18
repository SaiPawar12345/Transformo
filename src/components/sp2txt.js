import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Mic, StopCircle, Check, Pause, Download, AlertTriangle } from 'lucide-react';
import './SpeechToTextGrammar.css';
import './sp2txt.css';
import { NavBar } from './NavBar';

const SpeechToTextGrammar = () => {
  // State variables
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [grammarSuggestions, setGrammarSuggestions] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState(0);

  // Refs and support state
  const recognitionRef = useRef(null);
  const [supportedRecognition, setSupportedRecognition] = useState(false);

  // Check browser speech recognition support
  useEffect(() => {
    setSupportedRecognition(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
  }, []);

  // Grammar check using LanguageTool API with rate limiting and retries
  const checkGrammar = async () => {
    if (!transcript.trim()) {
      setError('Please enter some text to check.');
      return;
    }

    // Rate limiting: Allow only one check every 2 seconds
    const now = Date.now();
    if (now - lastCheckTimestamp < 2000) {
      setError('Please wait a moment before checking again.');
      return;
    }
    setLastCheckTimestamp(now);

    setIsChecking(true);
    setError(null);
    setGrammarSuggestions([]);
    setCorrectedText('');

    const maxRetries = 3;
    let retryCount = 0;

    const performCheck = async () => {
      try {
        // Split text into smaller chunks if it's too long (max 20000 characters)
        const maxChunkSize = 20000;
        const textChunks = [];
        let remainingText = transcript;
        
        while (remainingText.length > 0) {
          // Find a good breaking point (end of sentence or space)
          let chunkSize = Math.min(maxChunkSize, remainingText.length);
          if (chunkSize < remainingText.length) {
            const lastPeriod = remainingText.lastIndexOf('.', chunkSize);
            const lastSpace = remainingText.lastIndexOf(' ', chunkSize);
            chunkSize = lastPeriod > 0 ? lastPeriod + 1 : 
                       lastSpace > 0 ? lastSpace + 1 : chunkSize;
          }
          
          textChunks.push(remainingText.slice(0, chunkSize));
          remainingText = remainingText.slice(chunkSize);
        }

        // Process each chunk
        const allSuggestions = [];
        let fullCorrectedText = transcript;

        for (const chunk of textChunks) {
          const response = await axios.post(
            'https://api.languagetool.org/v2/check',
            new URLSearchParams({
              text: chunk,
              language: 'en-US',
              enabledOnly: 'false'
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              timeout: 15000 // 15 seconds timeout
            }
          );

          const matches = response.data.matches || [];
          
          // Process matches for this chunk
          const chunkSuggestions = matches.map(match => ({
            message: match.message,
            shortMessage: match.shortMessage,
            context: {
              before: chunk.slice(Math.max(0, match.offset - 20), match.offset),
              error: chunk.slice(match.offset, match.offset + match.length),
              after: chunk.slice(match.offset + match.length, match.offset + match.length + 20)
            },
            replacements: match.replacements.slice(0, 3).map(r => r.value), // Limit to top 3 suggestions
            rule: match.rule.id,
            category: match.rule.category.name
          }));

          allSuggestions.push(...chunkSuggestions);

          // Apply corrections for this chunk
          let chunkText = chunk;
          matches
            .sort((a, b) => b.offset - a.offset)
            .forEach(match => {
              if (match.replacements.length > 0) {
                chunkText = chunkText.slice(0, match.offset) + 
                  match.replacements[0].value + 
                  chunkText.slice(match.offset + match.length);
              }
            });

          fullCorrectedText = fullCorrectedText.replace(chunk, chunkText);
        }

        if (allSuggestions.length === 0) {
          setCorrectedText(transcript);
          setGrammarSuggestions([]);
          setError('No grammar issues found.');
          return;
        }

        // Group suggestions by category
        const groupedSuggestions = allSuggestions.reduce((acc, suggestion) => {
          if (!acc[suggestion.category]) {
            acc[suggestion.category] = [];
          }
          acc[suggestion.category].push(suggestion);
          return acc;
        }, {});

        setGrammarSuggestions(Object.entries(groupedSuggestions));
        setCorrectedText(fullCorrectedText);

      } catch (error) {
        console.error('Grammar check error:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return performCheck();
        }

        if (error.response) {
          setError(`Grammar check failed: ${error.response.data.message || 'Server error'}`);
        } else if (error.request) {
          setError('No response from grammar check service. Please try again.');
        } else {
          setError('Error checking grammar. Please try again.');
        }
      }
    };

    try {
      await performCheck();
    } finally {
      setIsChecking(false);
    }
  };

  // Start speech recognition
  const startListening = () => {
    if (!supportedRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = transcript;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        }
      }
      setTranscript(finalTranscript.trim());
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Speech recognition error occurred.';
      
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
          break;
      }
      
      setError(errorMessage);
      stopListening();
    };

    recognitionRef.current.start();
  };

  // Stop speech recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript('');
    setCorrectedText('');
    setGrammarSuggestions([]);
    setError(null);
  };

  // Download transcript as .doc file
  const downloadTranscript = () => {
    if (!transcript.trim()) {
      setError('No text to download.');
      return;
    }

    const content = correctedText || transcript;
    const element = document.createElement("a");
    const file = new Blob([content], { type: "application/msword" });
    element.href = URL.createObjectURL(file);
    element.download = "transcript.doc";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return (
    <>
      <NavBar />
      <div className="speech-to-text-container">
        <div className="speech-content">
          <header className="speech-header">
            <h1>Speech to Text Converter</h1>
            <p>Convert your speech to text in real-time with grammar checking.</p>
          </header>

          <div className="controls">
            {!isListening ? (
              <button 
                onClick={startListening} 
                className="control-btn"
                title="Start recording"
              >
                <Mic /> Start Listening
              </button>
            ) : (
              <button 
                onClick={stopListening} 
                className="control-btn stop"
                title="Stop recording"
              >
                <StopCircle /> Stop Listening
              </button>
            )}
            <button 
              onClick={checkGrammar} 
              className="control-btn"
              disabled={!transcript || isChecking}
              title="Check grammar and spelling"
            >
              {isChecking ? 'Checking...' : <><Check /> Check Grammar</>}
            </button>
            <button 
              onClick={downloadTranscript} 
              className="control-btn"
              disabled={!transcript}
              title="Download as Word document"
            >
              <Download /> Download
            </button>
            <button 
              onClick={clearTranscript} 
              className="control-btn clear"
              disabled={!transcript}
              title="Clear all text"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle /> {error}
            </div>
          )}

          <div className="transcript-container">
            <div className="transcript">
              <h3>Transcript:</h3>
              <div className="text-content">{transcript}</div>
            </div>

            {correctedText && (
              <div className="corrected-text">
                <h3>Corrected Text:</h3>
                <div className="text-content">{correctedText}</div>
              </div>
            )}
          </div>

          {grammarSuggestions.length > 0 && (
            <div className="grammar-suggestions">
              <h3>Grammar Suggestions:</h3>
              <div className="suggestions-list">
                {grammarSuggestions.map(([category, suggestions], index) => (
                  <div key={index} className="suggestion-category">
                    <h4>{category}</h4>
                    <ul>
                      {suggestions.map((suggestion, subIndex) => (
                        <li key={`${index}-${subIndex}`} className="suggestion-item">
                          <div className="suggestion-message">
                            <strong>{suggestion.shortMessage || suggestion.message}</strong>
                          </div>
                          <div className="suggestion-context">
                            <span className="context-before">{suggestion.context.before}</span>
                            <span className="error-highlight">{suggestion.context.error}</span>
                            <span className="context-after">{suggestion.context.after}</span>
                          </div>
                          {suggestion.replacements.length > 0 && (
                            <div className="suggestion-replacements">
                              <strong>Suggestions: </strong>
                              {suggestion.replacements.map((replacement, i) => (
                                <span key={i} className="replacement">
                                  {replacement}
                                  {i < suggestion.replacements.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SpeechToTextGrammar;