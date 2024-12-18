import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AccessibilityManager = () => {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  // Initialize speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  // Initialize speech synthesis
  const speechSynthesis = window.speechSynthesis;

  recognition.continuous = false;
  recognition.lang = 'en-US';

  const speak = (text) => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; // Normal speaking rate
    speechSynthesis.speak(utterance);
  };

  const announceHotkeys = () => {
    const hotkeyMessage = `
      Welcome to the document management system. 
      Press and hold the spacebar to activate voice commands.
      Release the spacebar to stop listening.
      
      When voice commands are active, you can say:
      'merge my files' to merge PDFs,
      'split my file' to split PDFs,
      'convert PDF to JPG' to convert PDF files to JPG,
      'convert JPG to PDF' to convert JPG files to PDF,
      'speech to text' to convert speech to text,
      'go back home' to return to the landing page,
      'help me' to hear commands again.
    `;
    speak(hotkeyMessage);
  };

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Keyword-based command mapping
    if (lowerCommand.includes('merge')) {
      speak('Navigating to the PDF merge tool');
      navigate('/merge-pdf');
    } else if (lowerCommand.includes('split')) {
      speak('Navigating to the PDF split tool');
      navigate('/split-pdf');
    } else if (lowerCommand.includes('pdf to jpg')) {
      speak('Navigating to PDF to JPG converter');
      navigate('/pdf-to-jpg');
    } else if (lowerCommand.includes('jpg to pdf')) {
      speak('Navigating to JPG to PDF converter');
      navigate('/jpg-to-pdf');
    } else if (lowerCommand.includes('speech')) {
      speak('Navigating to Speech to Text tool');
      navigate('/speech-to-text');
    } else if (lowerCommand.includes('home')) {
      speak('Returning to the landing page');
      navigate('/');
    } else if (lowerCommand.includes('help')) {
      announceHotkeys();
    } else if (lowerCommand.includes('upload files')) {
      speak('Initiating file upload');
      // Trigger file upload logic
    } else if (lowerCommand.includes('search files')) {
      speak('Searching your files');
      // Trigger file search logic
    } else if (lowerCommand.includes('merge files')) {
      speak('Merging your files');
      // Trigger file merge logic
    } else if (lowerCommand.includes('list files')) {
      speak('Listing your files');
      // Trigger logic to list current files
    } else {
      speak('Command not recognized. Say help me for available commands');
    }
  };

  const startListening = () => {
    if (!listening) {
      setListening(true);
      recognition.start();
      speak('Voice commands activated. Say help me for available commands');
    }
  };

  const stopListening = () => {
    if (listening) {
      setListening(false);
      recognition.stop();
    }
  };

  useEffect(() => {
    // Set up speech recognition handlers
    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript;
      setFeedback(`Command received: ${command}`);
      handleVoiceCommand(command);
      // Keep listening as long as spacebar is pressed
      if (listening) {
        recognition.start();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setFeedback('Error understanding command. Please try again.');
      if (event.error === 'no-speech') {
        speak('No speech detected. Please try again.');
      }
    };

    // Handle spacebar press and release
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault(); // Prevent scrolling
        speechSynthesis.cancel(); // Interrupt ongoing speech
        startListening();
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopListening();
      speechSynthesis.cancel();
    };
  }, [listening]);

  return (
    <div className="accessibility-controls" role="region" aria-label="Accessibility Controls">
      <button 
        onClick={announceHotkeys}
        aria-label="Hear available commands"
        className="help-btn"
      >
        Help (Press Spacebar for Voice Commands)
      </button>
      {feedback && (
        <div className="feedback" role="status" aria-live="polite">
          {feedback}
        </div>
      )}
    </div>
  );
};

export default AccessibilityManager;