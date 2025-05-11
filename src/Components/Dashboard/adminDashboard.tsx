import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import { getCourses, getLessonsByCourse } from "../../Services/lessonService";
import { getAllUsers } from "../../Services/userService";
import "../../Styles/Dashboard.css";
import {
  Users,
  BookOpen,
  User,
  Settings,
  PlusCircle,
  ArrowRight,
  UserCheck,
  Shield,
  FileText,
  BarChart,
} from "lucide-react";
import { User as UserType } from "../../Contexts/AuthenticationContext";

// Define proper types for your data structures
interface UserData {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  photoURL?: string;
  createdAt?: {
    toDate: () => Date;
  };
}

interface CourseData {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdByName?: string;
  lessonsCount?: number;
  createdAt?: {
    toDate: () => Date;
  };
}

interface AdminDashboardProps {
  user: UserType;
  onLogout: () => Promise<void>;
  setCurrentPage: (page: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  setCurrentPage,
}) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalLessons: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserData[]>([]);
  const [recentCourses, setRecentCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Fetch users
        const users = (await getAllUsers()) as UserData[];
        const students = users.filter(
          (user) => user.role?.toLowerCase() === "student"
        );
        const teachers = users.filter(
          (user) => user.role?.toLowerCase() === "teacher"
        );

        // Sort users by creation date and take the most recent ones
        const sortedUsers = [...users]
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        setRecentUsers(sortedUsers);

        // Fetch courses
        const allCourses = (await getCourses()) as CourseData[];

        // Fetch lessons for each course to get accurate counts
        let totalLessonsCount = 0;

        for (const course of allCourses) {
          const lessons = await getLessonsByCourse(course.id);
          totalLessonsCount += lessons.length;
        }

        // Sort courses by creation date
        const sortedCourses = [...allCourses]
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        setRecentCourses(sortedCourses);

        // Update stats
        setStats({
          totalUsers: users.length,
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalCourses: allCourses.length,
          totalLessons: totalLessonsCount,
        });
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 dashboard-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Platform overview and management</p>
        </div>
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="stats-card bg-gradient-indigo">
          <div className="flex items-center mb-2">
            <Users className="stats-icon" size={18} />
            <h2 className="stats-title">Total Users</h2>
          </div>
          <p className="stats-value">{stats.totalUsers}</p>
        </div>

        <div className="stats-card bg-gradient-purple">
          <div className="flex items-center mb-2">
            <User className="stats-icon" size={18} />
            <h2 className="stats-title">Students</h2>
          </div>
          <p className="stats-value">{stats.totalStudents}</p>
        </div>

        <div className="stats-card bg-gradient-blue">
          <div className="flex items-center mb-2">
            <UserCheck className="stats-icon" size={18} />
            <h2 className="stats-title">Teachers</h2>
          </div>
          <p className="stats-value">{stats.totalTeachers}</p>
        </div>

        <div className="stats-card bg-gradient-violet">
          <div className="flex items-center mb-2">
            <BookOpen className="stats-icon" size={18} />
            <h2 className="stats-title">Courses</h2>
          </div>
          <p className="stats-value">{stats.totalCourses}</p>
        </div>

        <div className="stats-card bg-gradient-pink">
          <div className="flex items-center mb-2">
            <FileText className="stats-icon" size={18} />
            <h2 className="stats-title">Lessons</h2>
          </div>
          <p className="stats-value">{stats.totalLessons}</p>
        </div>
      </div>

      {/* Recent users */}
      <div className="panel mb-8">
        <div className="panel-header">
          <h2 className="panel-title">Recent Users</h2>
          <button onClick={() => setCurrentPage("users")} className="btn-link">
            View all users
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>

        {recentUsers.length === 0 ? (
          <div className="empty-state">
            <p>No users found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="flex items-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.name || ""}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          <User size={16} />
                        </div>
                      )}
                      {user.name || "N/A"}
                    </td>
                    <td>{user.email || "N/A"}</td>
                    <td>
                      <span
                        className={`role-badge ${
                          user.role === "admin"
                            ? "role-admin"
                            : user.role === "teacher"
                            ? "role-teacher"
                            : "role-student"
                        }`}
                      >
                        {user.role || "student"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt?.toDate().toLocaleDateString() || "N/A"}
                    </td>
                    <td>
                      <button
                        onClick={() => setCurrentPage("userEdit")}
                        className="action-button"
                      >
                        <Settings size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent courses */}
      <div className="panel mb-8">
        <div className="panel-header">
          <h2 className="panel-title">Recent Courses</h2>
          <button
            onClick={() => setCurrentPage("courses")}
            className="btn-link"
          >
            View all courses
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>

        {recentCourses.length === 0 ? (
          <div className="empty-state">
            <p>No courses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCourses.map((course) => (
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
                  <p className="course-description">
                    {course.description || "No description"}
                  </p>

                  <div className="course-meta">
                    <div className="course-meta-item">
                      <UserCheck size={14} className="mr-1" />
                      <span>
                        By: {course.createdByName || "Unknown Teacher"}
                      </span>
                    </div>

                    <div className="course-meta-item">
                      <BookOpen size={14} className="mr-1" />
                      <span>{course.lessonsCount || "0"} lessons</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => setCurrentPage("courseView")}
                      className="btn-secondary w-full"
                    >
                      View Details
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
        <h2 className="panel-title mb-4">Administrative Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentPage("users")}
            className="action-card"
          >
            <Users size={18} className="action-icon text-indigo-600" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => setCurrentPage("courses")}
            className="action-card"
          >
            <BookOpen size={18} className="action-icon text-purple-600" />
            <span>Manage Courses</span>
          </button>

          <button
            onClick={() => setCurrentPage("analytics")}
            className="action-card"
          >
            <BarChart size={18} className="action-icon text-blue-600" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setCurrentPage("userCreate")}
            className="action-card"
          >
            <PlusCircle size={18} className="action-icon text-violet-600" />
            <span>Create User</span>
          </button>

          <button
            onClick={() => setCurrentPage("settings")}
            className="action-card"
          >
            <Settings size={18} className="action-icon text-indigo-600" />
            <span>Platform Settings</span>
          </button>

          <button
            onClick={() => setCurrentPage("permissions")}
            className="action-card"
          >
            <Shield size={18} className="action-icon text-purple-600" />
            <span>Role Permissions</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
