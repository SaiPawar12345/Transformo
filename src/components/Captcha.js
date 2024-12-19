import React, { useState, useEffect } from 'react';
import './Captcha.css';

const Captcha = ({ onValidate }) => {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isValid, setIsValid] = useState(false);

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; 
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(captcha);
    setUserInput('');
    setIsValid(false);
    onValidate(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);
    const valid = input === captchaText;
    setIsValid(valid);
    onValidate(valid);
  };

  return (
    <div className="captcha-container">
      <div className="captcha-box">
        <div className="captcha-text">
          {captchaText.split('').map((char, index) => (
            <span 
              key={index} 
              style={{ 
                transform: `rotate(${Math.random() * 10 - 5}deg)`,
                color: `hsl(${Math.random() * 360}, 30%, 30%)`
              }}
            >
              {char}
            </span>
          ))}
        </div>
        <button 
          type="button" 
          className="refresh-button" 
          onClick={generateCaptcha}
          aria-label="Refresh Captcha"
        >
          ↻
        </button>
      </div>
      <input
        type="text"
        className="input-field"
        placeholder="Enter CAPTCHA"
        value={userInput}
        onChange={handleInputChange}
        required
      />
      <div className="captcha-status">
        {userInput && (isValid ? 
          <span className="valid">✓ Correct</span> : 
          <span className="invalid">✗ Incorrect</span>
        )}
      </div>
    </div>
  );
};

export default Captcha;
