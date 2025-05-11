import React, { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../Contexts/new_firebase";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

import {
  createUserProfile,
  updateUserLastLogin,
  updateUserProfile as updateUserProfileInFirestore,
  getUser,
  UserRole,
} from "../Services/userService";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  uid: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  preferredLanguage?: string;
  notificationSettings?: {
    email: boolean;
    push: boolean;
  };
  completedLessonsCount?: number;
  completedCoursesCount?: number;
  enrolledCourses?: string[];
  lessonProgress?: Record<string, any>;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
  login: async () => ({} as User),
  signup: async () => ({} as User),
  resetPassword: async () => {},
  updateUserProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string): Promise<User | null> => {
    try {
      const userData = await getUser(uid);

      if (!userData) return null;

      // Fix the order: spread userData first, then override specific properties
      return {
        ...userData,
        id: uid,
        uid: uid,
        name: userData.name || "",
        email: userData.email || "",
        role: (userData.role as UserRole) || "student",
      } as User;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser?.uid) {
      const userData = await fetchUserData(auth.currentUser.uid);
      if (userData) {
        setCurrentUser(userData);
      }
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, { displayName: name });

    // Create a user profile with the proper structure
    const userRole: UserRole = "student"; // Default role
    await createUserProfile({
      uid: firebaseUser.uid,
      name,
      email,
      photoURL: firebaseUser.photoURL || undefined,
      role: userRole,
    });

    // Make sure we're getting the full user data
    const userData = await fetchUserData(firebaseUser.uid);

    if (!userData) {
      // Handle the case where user creation failed
      throw new Error("Failed to create user profile");
    }

    setCurrentUser(userData);
    return userData;
  };

  const login = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    await updateUserLastLogin(firebaseUser.uid);

    const userData = await fetchUserData(firebaseUser.uid);

    if (!userData) {
      throw new Error("Failed to retrieve user data after login");
    }

    setCurrentUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const resetPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (!auth.currentUser) return;

    await updateProfile(auth.currentUser, {
      displayName: displayName || auth.currentUser.displayName,
      photoURL: photoURL || auth.currentUser.photoURL,
    });

    const updates: Partial<User> = {};
    if (displayName) updates.name = displayName;
    if (photoURL) updates.photoURL = photoURL;

    // This is where the second error was happening, making sure role is properly typed
    await updateUserProfileInFirestore(auth.currentUser.uid, updates as any);
    await refreshUser();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid);
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    logout,
    refreshUser,
    login,
    signup,
    resetPassword,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
