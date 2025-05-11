import { db } from "../Contexts/new_firebase";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  where,
  limit,
  orderBy, 
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";

export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  estimatedTime?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Lesson {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  order: number;
  durationMinutes: number;
  videoUrl?: string;
  createdAt: any;
  updatedAt: any;
}

// Get all courses (basic version)
export const getCourses = async () => {
  const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get a specific course by ID
export const getCourse = async (courseId: string) => {
  const courseRef = doc(db, "courses", courseId);
  const courseSnap = await getDoc(courseRef);
  return courseSnap.exists() ? { id: courseSnap.id, ...courseSnap.data() } as Course : null;
};

// Get lessons for a specific course (basic version)
export const getCourseLessons = async (courseId: string) => {
  const q = query(
    collection(db, "lessons"),
    where("courseId", "==", courseId),
    orderBy("order")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
};

// Get featured courses
export const getFeaturedCourses = async (limitCount = 5) => {
  const q = query(
    collection(db, "courses"),
    where("featured", "==", true),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get courses by category
export const getCoursesByCategory = async (category: string) => {
  const q = query(
    collection(db, "courses"),
    where("category", "==", category),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get courses by difficulty
export const getCoursesByDifficulty = async (difficulty: string) => {
  const q = query(
    collection(db, "courses"),
    where("difficulty", "==", difficulty),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get courses by language
export const getCoursesByLanguage = async (language: string) => {
  const q = query(
    collection(db, "courses"),
    where("language", "==", language),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get paginated courses
export const getPaginatedCourses = async (
  pageSize = 10,
  lastVisible: DocumentSnapshot | null = null
) => {
  let q;
  
  if (lastVisible) {
    q = query(
      collection(db, "courses"),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(pageSize)
    );
  } else {
    q = query(
      collection(db, "courses"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
  }
  
  const querySnapshot = await getDocs(q);
  const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  
  return {
    courses: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)),
    lastVisible: lastVisibleDoc
  };
};

// Search courses by title
export const searchCourses = async (searchTerm: string) => {
  const q = query(
    collection(db, "courses"),
    orderBy("title"),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const searchTermLower = searchTerm.toLowerCase();
  
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Course))
    .filter(course => 
      course.title.toLowerCase().includes(searchTermLower) ||
      course.description.toLowerCase().includes(searchTermLower)
    );
};

// Get a specific lesson by ID
export const getLesson = async (lessonId: string) => {
  const lessonRef = doc(db, "lessons", lessonId);
  const lessonSnap = await getDoc(lessonRef);
  return lessonSnap.exists() ? { id: lessonSnap.id, ...lessonSnap.data() } as Lesson : null;
};