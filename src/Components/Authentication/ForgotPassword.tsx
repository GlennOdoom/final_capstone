import React, { useState } from 'react';
import '../../Styles/Authentication.css';
import { auth } from '../../Contexts/new_firebase'; // Make sure this path is correct
import { sendPasswordResetEmail } from 'firebase/auth';

interface ForgotPasswordProps {
  setCurrentPage: React.Dispatch<React.SetStateAction<string>>;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    setCurrentPage('login');
  };

  return (
    <div className="auth-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Reset Your Password</h2>
        </div>
        
        {message && (
          <div className="success-message">
            <p>{message}</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={error ? 'error' : ''}
            />
            <p className="help-text">We'll send you an email with instructions to reset your password.</p>
          </div>

          <button 
            type="submit"
            className="form-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="switch-form-container">
          <button 
            onClick={goToLogin}
            className="switch-form-btn"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;