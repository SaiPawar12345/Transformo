import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, GithubAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-heading">Welcome Back</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          className="input-field"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          className="input-field"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="forgot-password">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
        
        <button type="submit" className="submit-btn">
          Login
        </button>
      </form>

      <div className="signup-link">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </div>

      <div className="social-login">
        <span className="title">Or continue with</span>
        <div className="social-icons">
          <button onClick={handleGoogleSignIn} className="social-btn google-btn">
            <svg viewBox="0 0 24 24">
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
          <button onClick={handleGithubSignIn} className="social-btn github-btn">
            <svg viewBox="0 0 24 24">
              <path fill="white" d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.24.73-.53v-1.85c-3.03.66-3.67-1.45-3.67-1.45-.5-1.26-1.21-1.6-1.21-1.6-.98-.67.08-.66.08-.66 1.09.08 1.66 1.11 1.66 1.11.96 1.65 2.52 1.17 3.14.9.1-.7.38-1.17.69-1.44-2.42-.28-4.96-1.21-4.96-5.4 0-1.19.42-2.17 1.11-2.93-.11-.27-.48-1.36.11-2.84 0 0 .91-.29 2.98 1.1.86-.24 1.79-.36 2.71-.37.92 0 1.85.13 2.71.37 2.07-1.39 2.98-1.1 2.98-1.1.59 1.48.22 2.57.11 2.84.69.76 1.11 1.74 1.11 2.93 0 4.2-2.55 5.12-4.98 5.39.39.34.73 1 .73 2.02v3c0 .29.18.63.74.52A11 11 0 0012 1.27"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="terms">
        <Link to="/terms">Terms and Conditions</Link>
      </div>
    </div>
  );
};

export default Login;