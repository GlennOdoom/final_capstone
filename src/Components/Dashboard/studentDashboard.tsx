import React, { useState, useEffect } from "react";
import "../../Styles/Dashboard.css";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  getLessonsByCourse,
  Lesson,
  getCourse,
  calculateCourseProgress,
  CourseWithLessons,
} from "../../Services/lessonService";
import { PlusCircle, BookOpen, UserCheck, ArrowRight } from "lucide-react";
import { User } from "../../Contexts/AuthenticationContext";
import CourseManagement from "../Lessons/courseManagement";
import LessonManagement from "../Lessons/lessonManagement";

interface StudentDashboardProps {
  user: User;
  onLogout: () => Promise<void>;
  setCurrentPage: (page: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onLogout,
}) => {
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithLessons[]>(
    []
  );
  const [recommendedCourses, setRecommendedCourses] = useState<
    CourseWithLessons[]
  >([]);
  const [stats, setStats] = useState({
    coursesInProgress: 0,
    coursesCompleted: 0,
    totalLessonsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Fetch all courses
      const allCourses = await getCourses();

      // For now, we'll just use all courses as both enrolled and recommended
      // In a real app, you would filter based on enrollment data

      // Get lessons for each course and calculate progress
      const coursesWithDetails = await Promise.all(
        allCourses.map(async (course) => {
          if (course.id) {
            const lessons = await getLessonsByCourse(course.id);
            const progress = calculateCourseProgress(lessons, currentUser.uid);
            return {
              ...course,
              lessons,
              progress,
            } as CourseWithLessons;
          }
          return course as CourseWithLessons;
        })
      );

      // Split into enrolled and recommended (for demo purposes)
      // In a real app, this would use actual enrollment data
      const enrolled = coursesWithDetails.slice(
        0,
        Math.min(4, coursesWithDetails.length)
      );
      const recommended = coursesWithDetails.slice(
        Math.min(4, coursesWithDetails.length)
      );

      setEnrolledCourses(enrolled);
      setRecommendedCourses(recommended);

      // Calculate stats
      const inProgress = enrolled.filter(
        (course) => (course.progress || 0) > 0 && (course.progress || 0) < 100
      ).length;

      const completed = enrolled.filter(
        (course) => (course.progress || 0) === 100
      ).length;

      let totalLessonsCompleted = 0;
      enrolled.forEach((course) => {
        course.lessons?.forEach((lesson) => {
          if (lesson.completedBy?.includes(currentUser.uid)) {
            totalLessonsCompleted++;
          }
        });
      });

      setStats({
        coursesInProgress: inProgress,
        coursesCompleted: completed,
        totalLessonsCompleted,
      });
    } catch (error) {
      console.error("Error fetching student dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourse = async (courseId: string) => {
    try {
      const courseData = await getCourse(courseId);
      if (courseData) {
        setSelectedCourseName(courseData.title);
        setSelectedCourseId(courseId);
        setActiveView("lessons");
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
    }
  };

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
    setSelectedCourseId(null);
    setSelectedCourseName("");
    fetchDashboardData(); // Refresh data when returning to dashboard
  };

  if (loading && activeView === "dashboard") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Render different views based on activeView state
  if (activeView === "courses") {
    return <CourseManagement onBack={handleBackToDashboard} />;
  }

  if (activeView === "lessons" && selectedCourseId) {
    return (
      <LessonManagement
        courseId={selectedCourseId}
        courseName={selectedCourseName}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 dashboard-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="dashboard-title">Student Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {user.name || user.email}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveView("courses")}
            className="btn-primary flex items-center"
          >
            <PlusCircle size={16} className="mr-2" />
            Browse Courses
          </button>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stats-card bg-gradient-indigo">
          <div className="flex items-center mb-2">
            <BookOpen className="stats-icon" size={20} />
            <h2 className="stats-title">In Progress</h2>
          </div>
          <p className="stats-value">{stats.coursesInProgress}</p>
          <p className="stats-subtitle">Courses in progress</p>
        </div>

        <div className="stats-card bg-gradient-purple">
          <div className="flex items-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stats-icon"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 className="stats-title">Completed</h2>
          </div>
          <p className="stats-value">{stats.coursesCompleted}</p>
          <p className="stats-subtitle">Courses completed</p>
        </div>

        <div className="stats-card bg-gradient-blue">
          <div className="flex items-center mb-2">
            <UserCheck className="stats-icon" size={20} />
            <h2 className="stats-title">Lessons</h2>
          </div>
          <p className="stats-value">{stats.totalLessonsCompleted}</p>
          <p className="stats-subtitle">Lessons completed</p>
        </div>
      </div>

      {/* Your enrolled courses */}
      <div className="panel mb-8">
        <div className="panel-header">
          <h2 className="panel-title">Your Enrolled Courses</h2>
          <button onClick={() => setActiveView("courses")} className="btn-link">
            Browse all courses
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="empty-state">
            <p>You are not enrolled in any courses yet.</p>
            <button
              onClick={() => setActiveView("courses")}
              className="btn-primary flex items-center justify-center mx-auto mt-4"
            >
              <PlusCircle size={16} className="mr-2" />
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="course-card">
                {course.imageUrl ? (
                  <div className="course-image">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="course-image-placeholder">
                    <BookOpen size={24} />
                  </div>
                )}
                <div className="course-content">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-description">{course.description}</p>

                  {/* Progress bar */}
                  <div className="mt-2 mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{course.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${course.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="course-meta">
                    <div className="course-meta-item">
                      <BookOpen size={14} className="mr-1" />
                      <span>
                        {course.lessons ? course.lessons.length : 0} lessons
                      </span>
                    </div>

                    <div className="course-meta-item">
                      <UserCheck size={14} className="mr-1" />
                      <span>
                        {(course.lessons || []).reduce(
                          (count: number, lesson: Lesson) =>
                            lesson.completedBy?.includes(currentUser?.uid || "")
                              ? count + 1
                              : count,
                          0
                        )}{" "}
                        completed
                      </span>
                    </div>
                  </div>

                  <div className="course-actions">
                    <button
                      onClick={() => course.id && handleViewCourse(course.id)}
                      className="w-full btn-primary"
                    >
                      {course.progress === 0
                        ? "Start Course"
                        : "Continue Learning"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended courses */}
      {recommendedCourses.length > 0 && (
        <div className="panel">
          <h2 className="panel-title mb-4">Recommended For You</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {recommendedCourses.slice(0, 4).map((course) => (
              <div key={course.id} className="recommended-card">
                {course.imageUrl ? (
                  <div className="recommended-image">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="recommended-image-placeholder">
                    <BookOpen size={20} />
                  </div>
                )}
                <h3 className="recommended-title">{course.title}</h3>
                <p className="recommended-meta">
                  {course.lessons ? course.lessons.length : 0} lessons
                </p>
                <button
                  onClick={() => course.id && handleViewCourse(course.id)}
                  className="recommended-btn"
                >
                  View Course
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
