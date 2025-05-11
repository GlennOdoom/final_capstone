import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  getLessonsByCourse,
  calculateCourseProgress,
  CourseWithLessons,
} from "../../Services/lessonService";
import { ArrowRight, BookOpen, CheckCircle, Award, Clock } from "lucide-react";
import "../../Styles/Progress.css";

const ProgressPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithLessons[]>(
    []
  );
  const [stats, setStats] = useState({
    coursesInProgress: 0,
    coursesCompleted: 0,
    totalLessonsCompleted: 0,
    averageProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserProgress();
    }
  }, [currentUser]);

  const fetchUserProgress = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Fetch all courses
      const allCourses = await getCourses();

      // For a real app, you'd filter courses based on user enrollment
      // For now, we'll just use all courses

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

      // Sort courses by progress (highest first)
      const sortedCourses = coursesWithDetails.sort(
        (a, b) => (b.progress || 0) - (a.progress || 0)
      );

      setEnrolledCourses(sortedCourses);

      // Calculate stats
      const inProgress = sortedCourses.filter(
        (course) => (course.progress || 0) > 0 && (course.progress || 0) < 100
      ).length;

      const completed = sortedCourses.filter(
        (course) => (course.progress || 0) === 100
      ).length;

      let totalLessonsCompleted = 0;
      let totalProgress = 0;

      sortedCourses.forEach((course) => {
        course.lessons?.forEach((lesson) => {
          if (lesson.completedBy?.includes(currentUser.uid)) {
            totalLessonsCompleted++;
          }
        });

        totalProgress += course.progress || 0;
      });

      const averageProgress =
        sortedCourses.length > 0 ? totalProgress / sortedCourses.length : 0;

      setStats({
        coursesInProgress: inProgress,
        coursesCompleted: completed,
        totalLessonsCompleted,
        averageProgress: Math.round(averageProgress),
      });
    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId === selectedCourseId ? null : courseId);
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Please log in to view your progress</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <div className="progress-header">
        <h1>Learning Progress</h1>
      </div>

      {/* Overall progress stats */}
      <div className="stats-container">
        <div className="stats-card">
          <div className="stats-icon-container">
            <Clock size={24} className="stats-icon" />
          </div>
          <div className="stats-content">
            <h3>In Progress</h3>
            <p className="stats-value">{stats.coursesInProgress}</p>
            <p className="stats-label">Courses</p>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-container">
            <CheckCircle size={24} className="stats-icon" />
          </div>
          <div className="stats-content">
            <h3>Completed</h3>
            <p className="stats-value">{stats.coursesCompleted}</p>
            <p className="stats-label">Courses</p>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-container">
            <BookOpen size={24} className="stats-icon" />
          </div>
          <div className="stats-content">
            <h3>Lessons Completed</h3>
            <p className="stats-value">{stats.totalLessonsCompleted}</p>
            <p className="stats-label">Total</p>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-container">
            <Award size={24} className="stats-icon" />
          </div>
          <div className="stats-content">
            <h3>Average Progress</h3>
            <p className="stats-value">{stats.averageProgress}%</p>
            <p className="stats-label">Across All Courses</p>
          </div>
        </div>
      </div>

      {/* Course progress list */}
      <div className="course-progress-container">
        <h2>Course Progress</h2>

        {enrolledCourses.length === 0 ? (
          <div className="no-courses">
            <p>You haven't started any courses yet.</p>
          </div>
        ) : (
          <div className="course-progress-list">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="course-progress-item">
                <div
                  className="course-progress-header"
                  onClick={() => course.id && handleSelectCourse(course.id)}
                >
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <div className="progress-bar-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="progress-percentage">
                        {course.progress || 0}%
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className={`arrow-icon ${
                      selectedCourseId === course.id ? "rotated" : ""
                    }`}
                  />
                </div>

                {selectedCourseId === course.id && course.lessons && (
                  <div className="lesson-progress-list">
                    {course.lessons.map((lesson) => {
                      const isCompleted = lesson.completedBy?.includes(
                        currentUser.uid
                      );

                      return (
                        <div
                          key={lesson.id}
                          className={`lesson-progress-item ${
                            isCompleted ? "completed" : ""
                          }`}
                        >
                          <div className="lesson-status-icon">
                            {isCompleted ? (
                              <CheckCircle
                                size={18}
                                className="completed-icon"
                              />
                            ) : (
                              <Clock size={18} className="pending-icon" />
                            )}
                          </div>
                          <div className="lesson-info">
                            <h4>{lesson.title}</h4>
                            <p>{isCompleted ? "Completed" : "Not started"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
