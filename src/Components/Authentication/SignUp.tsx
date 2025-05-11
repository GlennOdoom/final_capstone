import React, { useState } from 'react';
import { auth } from '../../Contexts/new_firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import '../../Styles/Authentication.css';
import { User } from '../../Contexts/AuthenticationContext';
// Import your user service
import { createUserProfile } from '../../Services/userService';

interface SignupProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<string>>;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'student' | 'teacher';
}

const Signup: React.FC<SignupProps> = ({ setUser, setCurrentPage }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: formData.username
      });
      
      // Use user service to create profile
      await createUserProfile({
        uid: userCredential.user.uid,
        name: formData.username,
        email: formData.email,
        role: formData.role,
        preferredLanguage: 'en',
        notificationSettings: {
          email: true,
          push: true
        }
      });
      
      // Update user state
      setUser({
        id: userCredential.user.uid,
        name: formData.username,
        email: formData.email,
        role: formData.role,
        uid: userCredential.user.uid
      });
      
      // Redirect to dashboard
      setCurrentPage('dashboard');
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="signup-card">
        <div className="signup-header">
          <h2>Create Account</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Your username"
              className={error && !formData.username ? "error" : ""}
            />
            {error && !formData.username && <div className="field-error">Username is required</div>}
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your email"
              className={error && !formData.email ? "error" : ""}
            />
            {error && !formData.email && <div className="field-error">Email is required</div>}
          </div>
          
          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  className={error && !formData.password ? "error" : ""}
                />
                {error && !formData.password && <div className="field-error">Password is required</div>}
              </div>
            </div>
            
            <div className="form-col">
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••"
                  className={error && formData.password !== formData.confirmPassword ? "error" : ""}
                />
                {error && formData.password !== formData.confirmPassword && 
                  <div className="field-error">Passwords do not match</div>}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Account Type</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="form-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="switch-form-container">
          <p>Already have an account?</p>
          <button 
            onClick={() => setCurrentPage('login')} 
            className="switch-form-btn"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;