import React, { useEffect } from 'react';
import { Banner } from './Banner';
import { Skills } from './Skills';
import { Projects } from './Projects';
import { Contact } from './Contact';
import AccessibilityManager from './AccessibilityManager';
import './AccessibilityManager.css';
const LandingPage = () => {
  useEffect(() => {
    // Announce page load to screen readers
    const pageLoadAnnouncement = new SpeechSynthesisUtterance(
      'Welcome to the document management system. Press Space Bar to start voice commands'
    );
    window.speechSynthesis.speak(pageLoadAnnouncement);
  }, []);

  return (
    <div className="landing-page">
            <AccessibilityManager />
            <Banner />
      <Projects />
      <Skills />
      <Contact />
    </div>
  );
};

export default LandingPage;