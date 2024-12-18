import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/components.css';
import { FcGoogle } from 'react-icons/fc';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
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
    if (!validatePassword(password)) {
      setError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setError('Please confirm your password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password accounts are not enabled. Please contact support');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        default:
          setError('Failed to create account. Please try again');
      }
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign up cancelled by user');
      } else {
        setError('Failed to sign up with Google. Please try again');
      }
    }
  };

  return (
    <div className="login-container-853">
      <div className="login-card-957">
        <div className="login-header-246">
          <h1 className="login-title-478">Create Account</h1>
          <p className="login-subtitle-359">Join our document management system</p>
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

          <div className="signup-input-group-735">
            <label htmlFor="confirmPassword" className="signup-label-846">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="signup-input-field-957"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button-468 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Sign Up
          </button>

          <div className="divider-846">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="google-button-579 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <FcGoogle className="w-5 h-5" />
            <span>Google</span>
          </button>

          <div className="signup-link-957">
            Already have an account?{' '}
            <Link to="/" className="hover:text-purple-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;