import React, { useState, useEffect } from "react";
import { auth, db } from "../../Contexts/new_firebase";
import {
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../../Styles/Authentication.css";
import { User } from "../../Contexts/AuthenticationContext";

interface PhoneLoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<string>>;
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ setUser, setCurrentPage }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize reCAPTCHA
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
        callback: (_response: any) => {
          // reCAPTCHA solved, allow verification
        },
      }
    );

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber) {
      setError("Please enter a phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+${phoneNumber}`;

      // Create a PhoneAuthProvider instance
      const provider = new PhoneAuthProvider(auth);

      // Use the instance method verifyPhoneNumber
      const verificationId = await provider.verifyPhoneNumber(
        formattedPhone,
        window.recaptchaVerifier
      );

      setVerificationId(verificationId);
      setShowCodeInput(true);
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      setError(
        error.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      const userCredential = await signInWithCredential(auth, credential);

      // Create user document if new user
      if (
        userCredential.user.metadata.creationTime ===
        userCredential.user.metadata.lastSignInTime
      ) {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, {
          name: `User-${userCredential.user.uid.slice(0, 5)}`,
          phoneNumber: userCredential.user.phoneNumber,
          role: "student",
          createdAt: new Date(),
          enrolledCourses: {},
        });

        // Update profile with generated name
        await updateProfile(userCredential.user, {
          displayName: `User-${userCredential.user.uid.slice(0, 5)}`,
        });
      }

      // Update user state
      setUser({
        id: userCredential.user.uid,
        name:
          userCredential.user.displayName ||
          `User-${userCredential.user.uid.slice(0, 5)}`,
        email: userCredential.user.email || "",
        role: "student",
        uid: userCredential.user.uid,
      });

      // Redirect to dashboard
      setCurrentPage("dashboard");
    } catch (error: any) {
      console.error("Error verifying code:", error);
      setError(error.message || "Invalid verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Phone Sign In</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!showCodeInput ? (
          <form onSubmit={handleSendCode}>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
              <small>Include country code (e.g., +1 for US)</small>
            </div>

            <div id="recaptcha-container" className="recaptcha-container"></div>

            <button type="submit" className="form-btn" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
              />
            </div>

            <button type="submit" className="form-btn" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        )}

        <div className="switch-form-container">
          <p>Want to use email instead?</p>
          <button
            onClick={() => setCurrentPage("login")}
            className="switch-form-btn"
          >
            Back to Email Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneLogin;
