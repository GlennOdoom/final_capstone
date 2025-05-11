import { db } from "../Contexts/new_firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "firebase/firestore";


export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  preferredLanguage?: string;
  notificationSettings?: {
    email: boolean;
    push: boolean;
  };
  role?: UserRole; // Add this field
  completedLessonsCount: number;
  completedCoursesCount: number;
  enrolledCourses?: string[];
  lessonProgress?: Record<string, any>;
  createdAt: any;
  lastLogin: any;
}
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(usersQuery);
    
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Get user (maintaining your original function name)
export const getUser = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { uid: userSnap.id, ...userSnap.data() } as UserProfile;
  }
  
  return null;
};

// Update user profile (maintaining your original function name)
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const userRef = doc(db, "users", userId);
  
  // Remove uid from updates to prevent overwriting
  const { uid, ...updateData } = updates;
  
  await updateDoc(userRef, updateData);
  
  // Get the updated profile
  return getUser(userId);
};

// Additional functions from the second code block
export const createUserProfile = async (userData: Partial<UserProfile>) => {
  if (!userData.uid) throw new Error("User ID is required");
  
  const userRef = doc(db, "users", userData.uid);
  
  // Check if user already exists
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    throw new Error("User profile already exists");
  }
  
  const timestamp = new Date();
  
  const newUserData = {
    ...userData,
    completedLessonsCount: 0,
    completedCoursesCount: 0,
    enrolledCourses: [],
    lessonProgress: {},
    createdAt: timestamp,
    lastLogin: timestamp,
    notificationSettings: {
      email: true,
      push: true
    }
  };
  
  await setDoc(userRef, newUserData);
  return { uid: userData.uid, ...newUserData } as UserProfile;
};

export const updateUserLastLogin = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    lastLogin: new Date()
  });
};

export const enrollUserInCourse = async (userId: string, courseId: string) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  
  const userData = userSnap.data();
  const enrolledCourses = userData.enrolledCourses || [];
  
  // Check if user is already enrolled
  if (enrolledCourses.includes(courseId)) {
    return;
  }
  
  // Add course to enrolled courses
  await updateDoc(userRef, {
    enrolledCourses: [...enrolledCourses, courseId]
  });
  
  // Create enrollment record
  const enrollmentRef = doc(db, "enrollments", `${userId}_${courseId}`);
  await setDoc(enrollmentRef, {
    userId,
    courseId,
    enrolledAt: new Date(),
    progress: 0, // Overall progress percentage
    isCompleted: false,
    lastAccessedAt: new Date()
  });
};

export const getUserEnrolledCourses = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  
  const userData = userSnap.data();
  const enrolledCourses = userData.enrolledCourses || [];
  
  if (enrolledCourses.length === 0) {
    return [];
  }
  
  // Get course details for enrolled courses
  const coursesRef = collection(db, "courses");
  const coursesSnapshot = await getDocs(query(coursesRef, where("__name__", "in", enrolledCourses)));
  
  return coursesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const trackUserProgress = async (userId: string, courseId: string, progress: number) => {
  const enrollmentRef = doc(db, "enrollments", `${userId}_${courseId}`);
  
  await updateDoc(enrollmentRef, {
    progress,
    lastAccessedAt: new Date(),
    isCompleted: progress === 100
  });
  
  // If course is completed, update user stats
  if (progress === 100) {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        completedCoursesCount: (userData.completedCoursesCount || 0) + 1
      });
    }
  }
};