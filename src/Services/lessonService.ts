// lessonService.ts implementation
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../Contexts/new_firebase';

// Types
export interface Course {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  estimatedTime?: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CourseWithLessons extends Course {
  lessons?: Lesson[];
  progress?: number;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface LessonContent {
  type: 'text' | 'video' | 'quiz';
  content: string;
  quiz?: Quiz;
}

export interface Lesson {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  content: LessonContent[];
  order: number;
  durationMinutes: number;
  videoUrl?: string;
  completedBy?: string[];
  createdAt?: any;
  updatedAt?: any;
}

// Course CRUD operations
export const getCourses = async (): Promise<Course[]> => {
  try {
    const coursesCollection = collection(db, 'courses');
    const querySnapshot = await getDocs(coursesCollection);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Course));
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (courseSnap.exists()) {
      return { id: courseSnap.id, ...courseSnap.data() } as Course;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting course:', error);
    throw error;
  }
};

export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<string> => {
  try {
    const coursesCollection = collection(db, 'courses');
    const docRef = await addDoc(coursesCollection, {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const updateCourse = async (courseId: string, courseData: Partial<Course>): Promise<void> => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
      ...courseData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    // First, delete all associated lessons
    const lessons = await getCourseLessons(courseId);
    
    const deletePromises = lessons.map(lesson => {
      if (lesson.id) {
        return deleteDoc(doc(db, 'lessons', lesson.id));
      }
      return Promise.resolve();
    });
    
    await Promise.all(deletePromises);
    
    // Then delete the course
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

// Lesson CRUD operations
export const getCourseLessons = async (courseId: string): Promise<Lesson[]> => {
  try {
    const lessonsCollection = collection(db, 'lessons');
    const q = query(lessonsCollection, where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lesson));
  } catch (error) {
    console.error('Error getting lessons:', error);
    throw error;
  }
};

export const getLessonsByCourse = async (courseId: string): Promise<Lesson[]> => {
  return getCourseLessons(courseId);
};

export const getLessonById = async (lessonId: string): Promise<Lesson | null> => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonSnap = await getDoc(lessonRef);
    
    if (lessonSnap.exists()) {
      return { id: lessonSnap.id, ...lessonSnap.data() } as Lesson;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting lesson:', error);
    throw error;
  }
};

export const createLesson = async (lessonData: Omit<Lesson, 'id'>): Promise<string> => {
  try {
    // Validate quiz content if present
    for (const content of lessonData.content) {
      if (content.type === 'quiz' && content.quiz) {
        if (!content.quiz.id) {
          // Generate a unique ID for the quiz if not provided
          content.quiz.id = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
      }
    }
    
    const lessonsCollection = collection(db, 'lessons');
    const docRef = await addDoc(lessonsCollection, {
      ...lessonData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

export const updateLesson = async (lessonId: string, lessonData: Partial<Lesson>): Promise<void> => {
  try {
    // If updating content with quizzes, ensure each quiz has an ID
    if (lessonData.content) {
      for (const content of lessonData.content) {
        if (content.type === 'quiz' && content.quiz) {
          if (!content.quiz.id) {
            // Generate a unique ID for the quiz if not provided
            content.quiz.id = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
        }
      }
    }
    
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      ...lessonData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
};

// In lessonService.ts
export const updateLessonProgress = async (lessonId: string, userId: string, completed: boolean): Promise<void> => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef); // Add this line to check if lesson exists
    
    if (!lessonDoc.exists()) { // Add this validation
      throw new Error('Lesson not found');
    }
    
    if (completed) {
      // Add user to completedBy array if they completed the lesson
      const completedBy = lessonDoc.data().completedBy || [];
      // Only add the user if they're not already in the array to avoid duplicates
      if (!completedBy.includes(userId)) {
        await updateDoc(lessonRef, {
          completedBy: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
      }
    } else {
      // Remove user from completedBy array if they uncompleted the lesson
      await updateDoc(lessonRef, {
        completedBy: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    throw error;
  }
};

export const submitQuizAnswer = async (
  lessonId: string,
  quizId: string,
  answer: string,
  userId: string
): Promise<boolean> => {
  try {
    // Get the lesson to find the quiz and check the answer
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    
    // Find the quiz in the lesson content
    const quizContent = lesson.content.find(
      content => content.type === 'quiz' && content.quiz?.id === quizId
    );
    
    if (!quizContent || !quizContent.quiz) {
      throw new Error('Quiz not found in lesson');
    }
    
    // Check if the answer is correct
    const isCorrect = answer === quizContent.quiz.correctAnswer;
    
    // If this is the last content item and the answer is correct,
    // we could automatically mark the lesson as completed
    if (isCorrect) {
      const isLastContent = lesson.content[lesson.content.length - 1] === quizContent;
      if (isLastContent) {
        await updateLessonProgress(lessonId, userId, true);
      }
    }
    
    return isCorrect;
  } catch (error) {
    console.error('Error submitting quiz answer:', error);
    throw error;
  }
};

export const calculateCourseProgress = (lessons: Lesson[], userId: string): number => {
  if (!lessons || lessons.length === 0) return 0;
  
  const completedLessons = lessons.filter(lesson => 
    lesson.completedBy && lesson.completedBy.includes(userId)
  );
  
  return Math.round((completedLessons.length / lessons.length) * 100);
};