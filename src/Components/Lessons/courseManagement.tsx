import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  Course,
  deleteCourse,
  createCourse,
  updateCourse,
} from "../../Services/lessonService";
import LessonManagement from "../Lessons/lessonManagement";
import { PlusCircle, Edit, Trash, List, ArrowLeft, Image } from "lucide-react";
import Swal from "sweetalert2";

interface CourseManagementProps {
  onBack: () => void;
}

const CourseManagement: React.FC<CourseManagementProps> = ({ onBack }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    estimatedTime: "",
  });
  const { currentUser } = useAuth();

  // Added state for lesson management view
  const [selectedCourseForLessons, setSelectedCourseForLessons] =
    useState<Course | null>(null);

  // Check if user has admin privileges (you'll need to implement this based on your auth system)
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Add state for image loading errors
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    fetchCourses();
    checkUserPermission();
  }, [currentUser]);

  // Function to check if current user has admin permissions
  const checkUserPermission = async () => {
    if (!currentUser) {
      setHasAdminAccess(false);
      return;
    }

    try {
      // This should be replaced with your actual permission check logic
      // For example, checking a 'role' field in user's profile
      // Here's a placeholder implementation
      const userRole =
        currentUser.role || currentUser.email === "admin@example.com";
      setHasAdminAccess(
        userRole === "admin" ||
          userRole === "teacher" ||
          currentUser.email === "admin@example.com"
      );
    } catch (error) {
      console.error("Error checking permissions:", error);
      setHasAdminAccess(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const coursesData = await getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load courses. Please try again later.",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormOpen = (course?: Course) => {
    // Reset image error state
    setImageLoadError(false);

    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl || "",
        estimatedTime: course.estimatedTime || "",
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        estimatedTime: "",
      });
    }
    setIsFormOpen(true);
  };

  // Less restrictive image URL validation
  const isValidImageUrl = (url: string) => {
    if (!url) return true; // Empty URLs are allowed

    // Accept any URL that starts with http/https or a relative path
    return url.startsWith("http") || url.startsWith("/");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Reset image error when URL changes
    if (name === "imageUrl") {
      setImageLoadError(false);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to manage courses",
        icon: "warning",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    if (!hasAdminAccess) {
      Swal.fire({
        title: "Access Denied",
        text: "You don't have permission to perform this action",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate image URL if provided
    if (formData.imageUrl && !isValidImageUrl(formData.imageUrl)) {
      Swal.fire({
        title: "Invalid Image URL",
        text: "Please enter a valid image URL or leave it blank",
        icon: "warning",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    try {
      if (editingCourse && editingCourse.id) {
        // Update existing course using the service function
        await updateCourse(editingCourse.id, {
          title: formData.title,
          description: formData.description,
          imageUrl: formData.imageUrl,
          estimatedTime: formData.estimatedTime,
        });

        Swal.fire({
          title: "Success!",
          text: "Course updated successfully!",
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      } else {
        // Create new course using the service function
        await createCourse({
          title: formData.title,
          description: formData.description,
          imageUrl: formData.imageUrl,
          estimatedTime: formData.estimatedTime,
          createdBy: currentUser.uid,
        });

        Swal.fire({
          title: "Success!",
          text: "Course created successfully!",
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      }

      setIsFormOpen(false);
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error("Error saving course:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to save course. Please try again.",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!hasAdminAccess) {
      Swal.fire({
        title: "Access Denied",
        text: "You don't have permission to delete courses",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Use SweetAlert2 confirmation dialog
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the course and all associated lessons. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        // Use the service function to delete the course and its lessons
        await deleteCourse(courseId);

        Swal.fire({
          title: "Deleted!",
          text: "Course and all its lessons have been deleted",
          icon: "success",
          confirmButtonColor: "#3085d6",
        });

        fetchCourses(); // Refresh the list
      } catch (error) {
        console.error("Error deleting course:", error);
        Swal.fire({
          title: "Error!",
          text: "Failed to delete course. Please try again.",
          icon: "error",
          confirmButtonColor: "#3085d6",
        });
      }
    }
  };

  const handleManageLessons = (course: Course) => {
    setSelectedCourseForLessons(course);
  };

  const handleBackFromLessons = () => {
    setSelectedCourseForLessons(null);
  };

  // Handle image error
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const target = e.currentTarget;
    console.error("Image failed to load:", target.src);
    target.src = "https://via.placeholder.com/400x200?text=Course+Image";
    target.onerror = null; // Prevents infinite loops
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show lesson management view if a course is selected for lesson management
  if (selectedCourseForLessons) {
    return (
      <LessonManagement
        courseId={selectedCourseForLessons.id || ""}
        courseName={selectedCourseForLessons.title}
        onBack={handleBackFromLessons}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Updated header section with back button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Course Management</h1>
        </div>

        {hasAdminAccess && (
          <button
            onClick={() => handleFormOpen()}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlusCircle size={16} className="mr-2" />
            Add New Course
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No courses available.{" "}
            {hasAdminAccess
              ? "Create your first course!"
              : "Check back later for available courses."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
            >
              {course.imageUrl ? (
                <div className="h-40 overflow-hidden relative bg-gray-100">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-40 overflow-hidden bg-gray-100 flex items-center justify-center">
                  <Image size={48} className="text-gray-300" />
                  <span className="text-gray-400 ml-2">No image available</span>
                </div>
              )}
              <div className="p-4">
                <h2 className="text-xl font-bold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>

                {course.estimatedTime && (
                  <p className="text-sm text-gray-500 mb-2">
                    Estimated Time: {course.estimatedTime} minutes
                  </p>
                )}

                <div className="flex justify-between mt-4">
                  <div className="space-x-2">
                    {hasAdminAccess && (
                      <button
                        onClick={() => handleFormOpen(course)}
                        className="flex items-center text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleManageLessons(course)}
                      className="flex items-center text-green-500 hover:text-green-700"
                    >
                      <List size={16} className="mr-1" />
                      {hasAdminAccess ? "Manage Lessons" : "View Lessons"}
                    </button>
                  </div>
                  {hasAdminAccess && (
                    <button
                      onClick={() => course.id && handleDeleteCourse(course.id)}
                      className="flex items-center text-red-500 hover:text-red-700"
                    >
                      <Trash size={16} className="mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form for adding/editing courses */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingCourse ? "Edit Course" : "Add New Course"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a full URL to an image (http:// or https://)
                </p>

                {formData.imageUrl && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Image Preview:</p>
                    <div className="border rounded overflow-hidden h-32 bg-gray-100">
                      <img
                        src={formData.imageUrl}
                        alt="Course preview"
                        className="h-full object-cover mx-auto"
                        onError={(e) => {
                          console.error("Preview image failed to load");
                          setImageLoadError(true);
                          e.currentTarget.style.display = "none";
                        }}
                        style={{ display: imageLoadError ? "none" : "block" }}
                      />
                      {imageLoadError && (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <Image
                              size={24}
                              className="mx-auto text-gray-300"
                            />
                            <p className="text-xs text-red-500 mt-1">
                              Image could not be loaded
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="text"
                  name="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingCourse ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
