import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router } from "react-router-dom";
import { auth } from "./Contexts/new_firebase";
import Login from "./Components/Authentication/Login";
import Signup from "./Components/Authentication/SignUp";
import ForgotPassword from "./Components/Authentication/ForgotPassword";
import PhoneLogin from "./Components/Authentication/PhoneLogin";
import StudentDashboard from "./Components/Dashboard/studentDashboard";
import { User } from "./Contexts/AuthenticationContext";
import "./Styles/App.css";
import CoursesPage from "./Components/Lessons/courses";
import { getUser } from "./Services/userService";
import TeacherDashboard from "./Components/Dashboard/teacherDashboard";
import AdminDashboard from "./Components/Dashboard/adminDashboard";
import Sidebar from "./Components/Dashboard/Sidebar";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<string>("login");
  const [activeSection, setActiveSection] = useState<string>("home");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Fetch complete user data from Firestore including the role
          const userData = await getUser(firebaseUser.uid);

          if (userData) {
            setUser({
              name: userData.name || firebaseUser.displayName || "User",
              email: userData.email || firebaseUser.email || "",
              role: userData.role || "student", // Use actual role from Firestore
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              // Include other user data as needed
              photoURL: userData.photoURL,
              completedLessonsCount: userData.completedLessonsCount,
              completedCoursesCount: userData.completedCoursesCount,
              enrolledCourses: userData.enrolledCourses,
            });
          } else {
            // Fallback if user data not found in Firestore
            setUser({
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
              role: "student", // Default role
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
            });
          }
          // Always go to dashboard after successful login
          setCurrentPage("dashboard");
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to basic user object
          setUser({
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            role: "student", // Default role
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
          });
          setCurrentPage("dashboard");
        }
      } else {
        setUser(null);
        setCurrentPage("login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setCurrentPage("login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Add a handleBack function to go back to the dashboard
  const handleBack = () => {
    setCurrentPage("dashboard");
  };

  // Handle section change for the sidebar
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    // Auth pages if no user is logged in
    if (!user) {
      switch (currentPage) {
        case "login":
          return <Login setUser={setUser} setCurrentPage={setCurrentPage} />;
        case "signup":
          return <Signup setUser={setUser} setCurrentPage={setCurrentPage} />;
        case "forgot-password":
          return <ForgotPassword setCurrentPage={setCurrentPage} />;
        case "phone-login":
          return (
            <PhoneLogin setUser={setUser} setCurrentPage={setCurrentPage} />
          );
        default:
          return <Login setUser={setUser} setCurrentPage={setCurrentPage} />;
      }
    }

    // If we're showing the sidebar-based layout
    if (
      [
        "dashboard",
        "lessons",
        "progress",
        "forums",
        "profile",
        "manage",
      ].includes(currentPage)
    ) {
      return (
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          setActiveSection={setActiveSection}
          user={user}
          userRole={user.role || "student"}
          onLogout={handleLogout}
        />
      );
    }

    // For other specific pages like course management that don't use the sidebar
    switch (currentPage) {
      case "courses":
        return (
          <CoursesPage
            user={user}
            onLogout={handleLogout}
            onBack={handleBack}
          />
        );
      default:
        // Redirect to appropriate dashboard based on role if no specific page is selected
        if (user.role === "teacher") {
          return (
            <TeacherDashboard
              user={user}
              onLogout={handleLogout}
              setCurrentPage={setCurrentPage}
            />
          );
        } else if (user.role === "admin") {
          return (
            <AdminDashboard
              user={user}
              onLogout={handleLogout}
              setCurrentPage={setCurrentPage}
            />
          );
        } else {
          return (
            <StudentDashboard
              user={user}
              onLogout={handleLogout}
              setCurrentPage={setCurrentPage}
            />
          );
        }
    }
  };

  return (
    <Router>
      <div className="app-container">{renderPage()}</div>
    </Router>
  );
};

export default App;
