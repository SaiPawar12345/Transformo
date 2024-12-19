import React, { useState } from 'react';
import './Newsletter.css';

export const Newsletter = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription for:', email);
    setEmail('');
  };

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      <div className="newsletter-content">
        <span className="newsletter-title">Get more updates...</span>
        <p className="newsletter-description">
          Sign up for our newsletter and you'll be the first to find out about new features
        </p>
      </div>
      <div className="newsletter-input-group">
        <div className="newsletter-input-wrapper">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="newsletter-input"
            placeholder="Mail..."
            required
          />
        </div>
        <button type="submit" className="newsletter-button">
          Subscribe
        </button>
      </div>
    </form>
  );
};
