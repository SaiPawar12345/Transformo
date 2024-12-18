import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/components.css';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later');
          break;
        default:
          setError('Failed to login. Please try again');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled by user');
      } else {
        setError('Failed to login with Google. Please try again');
      }
    }
  };

  return (
    <div className="login-container-853">
      <div className="login-card-957">
        <div className="login-header-246">
          <h1 className="login-title-478">Welcome Back</h1>
          <p className="login-subtitle-359">Sign in to access your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-624">
          {error && (
            <div className="error-message-735">
              {error}
            </div>
          )}

          <div className="signup-input-group-735">
            <label htmlFor="email" className="signup-label-846">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="signup-input-field-957"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="signup-input-group-735">
            <label htmlFor="password" className="signup-label-846">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="signup-input-field-957"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button-468 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Sign In
          </button>

          <div className="divider-846">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="google-button-579 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <FcGoogle className="w-5 h-5" />
            <span>Google</span>
          </button>

          <div className="signup-link-957">
            Don't have an account?{' '}
            <Link to="/signup" className="hover:text-purple-500">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;