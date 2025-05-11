import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  getLessonsByCourse,
  Lesson,
  Course as CourseType,
} from "../../Services/lessonService";
import {
  BookOpen,
  Clock,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

interface CourseDetailProps {
  courseId: string;
  onSelectLesson: (lesson: Lesson) => void;
  onBackToAllCourses: () => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  onSelectLesson,
  onBackToAllCourses,
}) => {
  const [course, setCourse] = useState<CourseType | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Fetch specific course details
        const allCourses = await getCourses();
        const currentCourse = allCourses.find((c) => c.id === courseId);

        if (currentCourse) {
          setCourse(currentCourse);

          // Fetch lessons for this course
          const courseLessons = await getLessonsByCourse(courseId);
          setLessons(courseLessons);
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId, currentUser]);

  const handleLessonSelect = (lesson: Lesson) => {
    onSelectLesson(lesson);
  };

  const calculateProgress = () => {
    if (!lessons.length || !currentUser) return 0;

    const completedLessons = lessons.filter(
      (lesson) =>
        lesson.completedBy && lesson.completedBy.includes(currentUser.uid)
    ).length;

    return Math.round((completedLessons / lessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Course not found.</p>
        <button
          onClick={onBackToAllCourses}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={onBackToAllCourses}
        className="flex items-center text-blue-500 mb-6 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft size={18} className="mr-1" />
        Back to All Courses
      </button>

      <div className="mb-8">
        {course.imageUrl && (
          <div className="h-64 overflow-hidden rounded-lg mb-6">
            <img
              src={course.imageUrl}
              alt={course.title}
              className="w-full object-cover"
            />
          </div>
        )}

        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-gray-600 mb-4">{course.description}</p>

        <div className="flex items-center space-x-6 mb-6">
          <div className="flex items-center text-gray-500">
            <BookOpen size={18} className="mr-1" />
            <span>{lessons.length} lessons</span>
          </div>

          <div className="flex items-center text-gray-500">
            <Clock size={18} className="mr-1" />
            <span>{course.estimatedTime || "0"} min</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-1 items-center">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Course Content</h2>
      <div className="space-y-4">
        {lessons.map((lesson, index) => {
          const isCompleted =
            currentUser &&
            lesson.completedBy &&
            lesson.completedBy.includes(currentUser.uid);

          return (
            <div
              key={lesson.id}
              className="border rounded-lg overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleLessonSelect(lesson)}
            >
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    {isCompleted && (
                      <CheckCircle size={18} className="text-green-500 mr-2" />
                    )}
                    <span className="font-medium">
                      Lesson {index + 1}: {lesson.title}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    {lesson.description}
                  </p>
                </div>
                <ChevronRight size={24} className="text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseDetail;
