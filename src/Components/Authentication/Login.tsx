import React, { useState } from 'react';
import { auth } from '../../Contexts/new_firebase';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import '../../Styles/Authentication.css';
import { User } from '../../Contexts/AuthenticationContext';
// Import your user service
import { getUser, createUserProfile, updateUserLastLogin, UserRole } from '../../Services/userService';

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<string>>;
}

const Login: React.FC<LoginProps> = ({ setUser, setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First check if email exists
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        setError('No account found with this email');
        return;
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user profile using your service
      const userProfile = await getUser(userCredential.user.uid);
      
      // Update last login time
      await updateUserLastLogin(userCredential.user.uid);
      
      // Update user state using data from your service
      setUser({
        id: userCredential.user.uid,
        name: userProfile?.name || userCredential.user.displayName || 'User',
        email: userProfile?.email || userCredential.user.email || '',
        role: (userProfile?.role as UserRole) || 'student',
        uid: userCredential.user.uid
      });
      
      // Redirect to dashboard
      setCurrentPage('dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in our database
      let userProfile = await getUser(result.user.uid);
      
      // If user doesn't exist, create a profile
      if (!userProfile) {
        userProfile = await createUserProfile({
          uid: result.user.uid,
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          photoURL: result.user.photoURL || undefined,
          role: 'student',
          preferredLanguage: 'en',
          notificationSettings: {
            email: true,
            push: true
          }
        });
      } else {
        // Update last login time
        await updateUserLastLogin(result.user.uid);
      }
      
      // Update user state
      setUser({
        id: result.user.uid,
        name: userProfile.name,
        email: userProfile.email,
        role: (userProfile?.role as UserRole) || 'student'|| 'teacher',
        uid: result.user.uid
      });
      
      // Redirect to dashboard
      setCurrentPage('dashboard');
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(error.message || 'Failed to login with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome Back</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={error && !email ? "error" : ""}
            />
            {error && !email && <div className="field-error">Email is required</div>}
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className={error && !password ? "error" : ""}
            />
            {error && !password && <div className="field-error">Password is required</div>}
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember-me" />
              <label htmlFor="remember-me" className="checkbox-label">Remember me</label>
            </div>
            <button 
              type="button" 
              onClick={() => setCurrentPage('forgot-password')}
              className="forgot-password"
            >
              Forgot Password?
            </button>
          </div>
          
          <button 
            type="submit" 
            className="form-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <button 
          onClick={handleGoogleLogin}
          className="social-btn google-btn"
          disabled={isSubmitting}
        >
          Continue with Google
        </button>
        
        <button 
          onClick={() => setCurrentPage('phone-login')}
          className="social-btn phone-btn"
          disabled={isSubmitting}
        >
          Continue with Phone
        </button>
        
        <div className="switch-form-container">
          <p>Don't have an account?</p>
          <button 
            onClick={() => setCurrentPage('signup')}
            className="switch-form-btn"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;