import React, { useState } from "react";
import SidebarItem from "../Dashboard/SideItem";
import {
  Home,
  BookOpen,
  Trophy,
  MessageCircle,
  User,
  Settings,
  Globe, // Import the Globe icon for the translator
} from "lucide-react";
import "../../Styles/Sidebar.css";
import LessonsPage from "../Lessons/LessonsPage";
import CourseDetail from "../Lessons/courseDetail";
import LessonView from "../Lessons/lessonView";
import CourseManagement from "../Lessons/courseManagement";
import { Lesson, Course } from "../../Services/lessonService";
import { User as AuthUser } from "../../Contexts/AuthenticationContext";
import StudentDashboard from "../Dashboard/studentDashboard";
import TeacherDashboard from "../Dashboard/teacherDashboard";
import AdminDashboard from "../Dashboard/adminDashboard";
import ForumPage from "../Lessons/Forums";
import ProfilePage from "../User/Profile";
import ProgressPage from "../User/Progress";
import TranslatorComponent from "../Lessons/translator"; // Import the TranslatorComponent

// Define the props interface for the Sidebar component
interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
  user: AuthUser;
  userRole: string;
  onLogout: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  user,
  userRole,
  onLogout,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Handle course selection from LessonsPage
  const handleCourseSelect = (course: any) => {
    // Add the missing createdBy property if it doesn't exist
    const formattedCourse: Course = {
      ...course,
      createdBy: course.createdBy || "unknown",
    };

    console.log("Course selected:", formattedCourse);
    setSelectedCourse(formattedCourse);
    setSelectedLesson(null); // Reset selected lesson when changing course
    onSectionChange("courseDetail"); // Navigate to course detail view
  };

  // Handle lesson selection from CourseDetail
  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    onSectionChange("lessonView"); // Navigate to lesson view
  };

  // Handle going back to course from lesson
  const handleBackToCourse = () => {
    setSelectedLesson(null);
    onSectionChange("courseDetail"); // Back to course detail
  };

  // Handle going back to all courses
  const handleBackToAllCourses = () => {
    setSelectedCourse(null);
    setSelectedLesson(null);
    onSectionChange("lessons"); // Back to all courses
  };

  // Handle lesson completion
  const handleLessonComplete = () => {
    // Return to course details after completing a lesson
    setSelectedLesson(null);
    onSectionChange("courseDetail"); // Back to course detail
    // Could trigger a refresh of course progress here
  };

  // Render dashboard based on user role
  const renderDashboard = () => {
    if (activeSection === "home") {
      switch (userRole.toLowerCase()) {
        case "teacher":
          return (
            <TeacherDashboard
              user={user}
              onLogout={onLogout}
              setCurrentPage={(page: string) => {
                if (page === "lessons" || page === "manage") {
                  onSectionChange(page);
                }
              }}
            />
          );
        case "admin":
          return (
            <AdminDashboard
              user={user}
              onLogout={onLogout}
              setCurrentPage={(page: string) => {
                if (
                  ["lessons", "manage", "users", "permissions"].includes(page)
                ) {
                  onSectionChange(page);
                }
              }}
            />
          );
        case "student":
        default:
          return (
            <StudentDashboard
              user={user}
              onLogout={onLogout}
              setCurrentPage={(page: string) => {
                if (page === "lessons") {
                  onSectionChange(page);
                }
              }}
            />
          );
      }
    }
    return null;
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return renderDashboard();
      case "lessons":
        return (
          <LessonsPage
            onCourseSelect={handleCourseSelect}
            user={user}
            onLogout={onLogout}
          />
        );
      case "courseDetail":
        // This case handles viewing a specific course's details
        if (selectedCourse) {
          return (
            <CourseDetail
              courseId={selectedCourse.id || ""}
              onSelectLesson={handleLessonSelect}
              onBackToAllCourses={handleBackToAllCourses}
            />
          );
        } else {
          // If no course is selected, redirect to lessons page
          onSectionChange("lessons");
          return null;
        }
      case "lessonView":
        // This case handles viewing a specific lesson
        if (selectedLesson?.id && selectedCourse?.id) {
          return (
            <LessonView
              lessonId={selectedLesson.id}
              courseId={selectedCourse.id}
              onComplete={handleLessonComplete}
              onBackToCourse={handleBackToCourse}
            />
          );
        } else {
          // If no lesson is selected, redirect to course detail or lessons page
          if (selectedCourse) {
            onSectionChange("courseDetail");
          } else {
            onSectionChange("lessons");
          }
          return null;
        }
      case "progress":
        return <ProgressPage />;
      case "forums":
        return <ForumPage />;
      case "profile":
        return <ProfilePage />;
      case "manage":
        return <CourseManagement onBack={() => onSectionChange("home")} />;
      case "translator":
        return <TranslatorComponent />; // Add the TranslatorComponent here
      default:
        return (
          <div>Content for {activeSection} section is under development</div>
        );
    }
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Twi Science</h1>
        </div>

        <div className="sidebar-menu">
          <SidebarItem
            icon={<Home size={20} />}
            text="Home"
            section="home"
            active={activeSection === "home"}
            onClick={() => {
              onSectionChange("home");
              setSelectedCourse(null);
              setSelectedLesson(null);
            }}
          />
          <SidebarItem
            icon={<BookOpen size={20} />}
            text="Lessons"
            section="lessons"
            active={
              activeSection === "lessons" ||
              activeSection === "courseDetail" ||
              activeSection === "lessonView"
            }
            onClick={() => {
              if (selectedLesson && selectedCourse) {
                // Stay on current lesson
                onSectionChange("lessonView");
              } else if (selectedCourse) {
                // Go to course detail
                onSectionChange("courseDetail");
              } else {
                // Go to lessons overview
                onSectionChange("lessons");
              }
            }}
          />
          <SidebarItem
            icon={<Trophy size={20} />}
            text="Progress"
            section="progress"
            active={activeSection === "progress"}
            onClick={() => {
              onSectionChange("progress");
            }}
          />
          <SidebarItem
            icon={<MessageCircle size={20} />}
            text="Forums"
            section="forums"
            active={activeSection === "forums"}
            onClick={() => {
              onSectionChange("forums");
            }}
          />
          <SidebarItem
            icon={<User size={20} />}
            text="Profile"
            section="profile"
            active={activeSection === "profile"}
            onClick={() => {
              onSectionChange("profile");
            }}
          />

          {/* Add Translator Component */}
          <SidebarItem
            icon={<Globe size={20} />}
            text="Translator"
            section="translator"
            active={activeSection === "translator"}
            onClick={() => {
              onSectionChange("translator");
            }}
          />

          {/* Admin and teacher access only - Manage Courses */}
          {user && (user.role === "teacher" || user.role === "admin") && (
            <SidebarItem
              icon={<Settings size={20} />}
              text="Manage Courses"
              section="manage"
              active={activeSection === "manage"}
              onClick={() => {
                onSectionChange("manage");
                setSelectedCourse(null);
                setSelectedLesson(null);
              }}
            />
          )}
        </div>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
      <div className="content-area">{renderContent()}</div>
    </div>
  );
};

export default Sidebar;
