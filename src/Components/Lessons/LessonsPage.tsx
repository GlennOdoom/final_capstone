import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourses,
  getLessonsByCourse,
  calculateCourseProgress,
  Lesson,
} from "../../Services/lessonService";
import { BookOpen, Clock, Search } from "lucide-react";
import { User } from "../../Contexts/AuthenticationContext"; // Import User type

// Update the Course interface to make id non-optional to match the expected type
interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  estimatedTime?: string; // Make estimatedTime optional to match what's coming from the service
  progress?: number;
  lessons?: Lesson[];
}

interface LessonsPageProps {
  onCourseSelect: (course: Course) => void;
  user: User;
  onLogout: () => Promise<void>;
}

const LessonsPage: React.FC<LessonsPageProps> = ({ onCourseSelect }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const fetchedCourses = await getCourses();

        // Fetch progress for each course
        const coursesWithProgress: Course[] = await Promise.all(
          fetchedCourses.map(async (course) => {
            // Handle potential undefined id by providing a default string
            const courseId = course.id || "";

            const lessons = await getLessonsByCourse(courseId);
            const progress = calculateCourseProgress(lessons, currentUser.uid);

            // Ensure id is always a string, even if empty
            return {
              ...course,
              id: courseId,
              progress,
              lessons,
            } as Course; // Type assertion here is valid since we're ensuring id is a string
          })
        );

        setCourses(coursesWithProgress);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [currentUser]);

  const handleCourseSelect = (course: Course) => {
    onCourseSelect(course);
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Available Courses</h1>

      {/* Search bar */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search courses..."
          className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No courses found matching your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCourseSelect(course)}
            >
              {course.imageUrl && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <h2 className="font-bold text-xl mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-500">
                    <BookOpen size={18} className="mr-1" />
                    <span>
                      {(course.lessons && course.lessons.length) || 0} lessons
                    </span>
                  </div>

                  <div className="flex items-center text-gray-500">
                    <Clock size={18} className="mr-1" />
                    <span>{course.estimatedTime || "0"} min</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {course.progress || 0}% complete
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonsPage;
