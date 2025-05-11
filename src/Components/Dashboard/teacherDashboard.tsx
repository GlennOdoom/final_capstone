import React, { useState, useEffect } from "react";
import "../../Styles/Dashboard.css";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  getLessonsByCourse,
  getCourse,
  CourseWithLessons,
} from "../../Services/lessonService";
import {
  PlusCircle,
  BookOpen,
  UserCheck,
  Settings,
  Eye,
  Edit,
  ArrowRight,
} from "lucide-react";
import { User } from "../../Contexts/AuthenticationContext";
import CourseManagement from "../Lessons/courseManagement";
import LessonManagement from "../Lessons/lessonManagement";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => Promise<void>;
  setCurrentPage: (page: string) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  onLogout,
}) => {
  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLessons: 0,
    totalStudents: 0,
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

      // Filter courses created by this teacher
      const teacherCourses = allCourses.filter(
        (course) => course.createdBy === currentUser.uid
      );

      // Fetch lessons for each course
      const coursesWithLessons = await Promise.all(
        teacherCourses.map(async (course) => {
          const lessons = await getLessonsByCourse(course.id || "");
          return { ...course, lessons } as CourseWithLessons;
        })
      );

      setCourses(coursesWithLessons);

      // Calculate stats
      let totalLessons = 0;
      let allStudents = new Set();

      coursesWithLessons.forEach((course) => {
        // Count lessons
        totalLessons += course.lessons?.length || 0;

        // Count unique students who completed lessons
        course.lessons?.forEach((lesson) => {
          if (lesson.completedBy && Array.isArray(lesson.completedBy)) {
            lesson.completedBy.forEach((studentId) => {
              allStudents.add(studentId);
            });
          }
        });
      });

      setStats({
        totalCourses: teacherCourses.length,
        totalLessons: totalLessons,
        totalStudents: allStudents.size,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
          <h1 className="dashboard-title">Teacher Dashboard</h1>
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
            Manage Courses
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
            <h2 className="stats-title">Courses</h2>
          </div>
          <p className="stats-value">{stats.totalCourses}</p>
          <p className="stats-subtitle">Total courses created</p>
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
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <h2 className="stats-title">Lessons</h2>
          </div>
          <p className="stats-value">{stats.totalLessons}</p>
          <p className="stats-subtitle">Total lessons created</p>
        </div>

        <div className="stats-card bg-gradient-blue">
          <div className="flex items-center mb-2">
            <UserCheck className="stats-icon" size={20} />
            <h2 className="stats-title">Students</h2>
          </div>
          <p className="stats-value">{stats.totalStudents}</p>
          <p className="stats-subtitle">Students engaged</p>
        </div>
      </div>

      {/* Your courses */}
      <div className="panel mb-8">
        <div className="panel-header">
          <h2 className="panel-title">Your Courses</h2>
          <button onClick={() => setActiveView("courses")} className="btn-link">
            Manage all courses
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any courses yet.</p>
            <button
              onClick={() => setActiveView("courses")}
              className="btn-primary flex items-center justify-center mx-auto mt-4"
            >
              <PlusCircle size={16} className="mr-2" />
              Create Your First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
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

                  <div className="course-meta">
                    <div className="course-meta-item">
                      <BookOpen size={14} className="mr-1" />
                      <span>
                        {course.lessons ? course.lessons.length : 0} lessons
                      </span>
                    </div>

                    {/* Show total students who engaged with this course */}
                    <div className="course-meta-item">
                      <UserCheck size={14} className="mr-1" />
                      <span>
                        {
                          new Set(
                            (course.lessons || []).flatMap(
                              (lesson) => lesson.completedBy || []
                            )
                          ).size
                        }{" "}
                        students
                      </span>
                    </div>
                  </div>

                  <div className="course-actions">
                    <button
                      onClick={() => course.id && handleViewCourse(course.id)}
                      className="btn-outline-primary flex items-center justify-center"
                    >
                      <Eye size={14} className="mr-1" />
                      View Lessons
                    </button>
                    <button
                      onClick={() => {
                        if (course.id) {
                          setSelectedCourseId(course.id);
                          setActiveView("courses");
                        }
                      }}
                      className="btn-outline-secondary flex items-center justify-center"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="panel">
        <h2 className="panel-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveView("courses")}
            className="quick-action-card"
          >
            <PlusCircle size={24} className="quick-action-icon" />
            <h3 className="quick-action-title">Create Course</h3>
            <p className="quick-action-desc">
              Add a new course to your catalog
            </p>
          </button>

          <button
            onClick={() => setActiveView("courses")}
            className="quick-action-card"
          >
            <BookOpen size={24} className="quick-action-icon" />
            <h3 className="quick-action-title">Manage Lessons</h3>
            <p className="quick-action-desc">Edit or create course content</p>
          </button>

          <button
            onClick={() => {
              // This would ideally link to a student management page
              // Currently not implemented
              console.log("Student management not implemented yet");
            }}
            className="quick-action-card"
          >
            <UserCheck size={24} className="quick-action-icon" />
            <h3 className="quick-action-title">Student Progress</h3>
            <p className="quick-action-desc">View student engagement data</p>
          </button>

          <button
            onClick={() => {
              // This would ideally link to account settings
              // Currently not implemented
              console.log("Settings not implemented yet");
            }}
            className="quick-action-card"
          >
            <Settings size={24} className="quick-action-icon" />
            <h3 className="quick-action-title">Account Settings</h3>
            <p className="quick-action-desc">
              Manage your profile and preferences
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
