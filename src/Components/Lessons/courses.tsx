import React, { useState } from "react";
import LessonsPage from "./LessonsPage";
import CourseDetail from "../Lessons/courseDetail";
import LessonView from "../Lessons/lessonView";
import { Lesson } from "../../Services/lessonService";
import { User } from "../../Contexts/AuthenticationContext";

// Define a local Course interface that matches the one in LessonsPage.tsx
interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  estimatedTime?: string;
  progress?: number;
  lessons?: Lesson[];
}

interface CoursesPageProps {
  user: User;
  onLogout: () => Promise<void>;
  onBack: () => void;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ user, onLogout }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Handle course selection from LessonsPage
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSelectedLesson(null); // Reset selected lesson when changing course
  };

  // Handle lesson selection from CourseDetail
  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  // Handle going back to course from lesson
  const handleBackToCourse = () => {
    setSelectedLesson(null);
  };

  // Handle going back to all courses
  const handleBackToAllCourses = () => {
    setSelectedCourse(null);
    setSelectedLesson(null);
  };

  // Handle lesson completion
  const handleLessonComplete = () => {
    // Return to course details after completing a lesson
    setSelectedLesson(null);
    // Could trigger a refresh of course progress here
  };

  // Determine which view to show
  if (selectedLesson && selectedCourse) {
    return (
      <LessonView
        lessonId={selectedLesson.id || ""} // Add fallback for undefined
        courseId={selectedCourse.id}
        onComplete={handleLessonComplete}
        onBackToCourse={handleBackToCourse}
      />
    );
  }

  if (selectedCourse) {
    return (
      <CourseDetail
        courseId={selectedCourse.id}
        onSelectLesson={handleLessonSelect}
        onBackToAllCourses={handleBackToAllCourses}
      />
    );
  }

  return (
    <LessonsPage
      onCourseSelect={handleCourseSelect}
      user={user}
      onLogout={onLogout}
    />
  );
};

export default CoursesPage;
