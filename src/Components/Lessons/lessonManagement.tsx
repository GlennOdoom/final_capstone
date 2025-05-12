import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  getCourseLessons,
  Lesson,
  LessonContent,
  Quiz,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../../Services/lessonService";
import {
  PlusCircle,
  Edit,
  Trash,
  ArrowLeft,
  Plus,
  X,
  Play,
} from "lucide-react";

interface LessonManagementProps {
  courseId: string;
  courseName: string;
  onBack: () => void;
}

// Create default quiz structure to avoid undefined issues
const createDefaultQuiz = (): Quiz => ({
  id: `quiz_${Date.now()}`,
  question: "",
  options: ["", ""],
  correctAnswer: "",
});

// Create default content item based on type
const createDefaultContent = (
  type: "text" | "video" | "quiz"
): LessonContent => {
  if (type === "quiz") {
    return {
      type: "quiz",
      content: "",
      quiz: createDefaultQuiz(),
    };
  }
  return {
    type,
    content: "",
  };
};

const LessonManagement: React.FC<LessonManagementProps> = ({
  courseId,
  courseName,
  onBack,
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: [] as LessonContent[],
    order: 0,
    durationMinutes: 30,
    videoUrl: "",
  });
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === "student";

  useEffect(() => {
    fetchLessons();
  }, [courseId]);

  const fetchLessons = async () => {
    try {
      setIsLoading(true);
      const lessonsData = await getCourseLessons(courseId);
      // Sort lessons by order
      const sortedLessons = lessonsData.sort((a, b) => a.order - b.order);
      setLessons(sortedLessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormOpen = (lesson?: Lesson) => {
    if (lesson) {
      // Ensure the lesson content is properly structured with valid quiz objects
      const sanitizedContent = lesson.content.map((item) => {
        if (item.type === "quiz") {
          return {
            ...item,
            quiz: item.quiz || createDefaultQuiz(),
          };
        }
        return item;
      });

      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        description: lesson.description,
        content: sanitizedContent,
        order: lesson.order,
        durationMinutes: lesson.durationMinutes,
        videoUrl: lesson.videoUrl || "",
      });
    } else {
      // For a new lesson, set the order to be the next in sequence
      const nextOrder =
        lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

      setEditingLesson(null);
      setFormData({
        title: "",
        description: "",
        content: [],
        order: nextOrder,
        durationMinutes: 30,
        videoUrl: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "order" || name === "durationMinutes"
          ? parseInt(value, 10)
          : value,
    }));
  };

  // Function to handle content items
  const handleAddContentItem = () => {
    setFormData((prev) => ({
      ...prev,
      content: [...prev.content, createDefaultContent("text")],
    }));
  };

  // Function to update content items
  const handleContentItemChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => {
      const newContent = [...prev.content];

      if (field === "type") {
        // If changing type, reset with appropriate default structure
        newContent[index] = createDefaultContent(
          value as "text" | "video" | "quiz"
        );
      } else if (field === "content") {
        newContent[index] = {
          ...newContent[index],
          content: value,
        };
      } else if (field.startsWith("quiz.")) {
        // Handle quiz properties
        const quizField = field.split(".")[1];
        const currentContent = newContent[index];

        if (currentContent.type === "quiz") {
          // Ensure quiz object exists
          if (!currentContent.quiz) {
            currentContent.quiz = createDefaultQuiz();
          }

          const quizObject = { ...currentContent.quiz };

          if (quizField === "question") {
            quizObject.question = value;
          } else if (quizField === "correctAnswer") {
            quizObject.correctAnswer = value;
          } else if (quizField.startsWith("option_")) {
            const optionIndex = parseInt(quizField.split("_")[1], 10);
            const newOptions = [...quizObject.options];
            newOptions[optionIndex] = value;
            quizObject.options = newOptions;
          }

          currentContent.quiz = quizObject;
        }
      }

      return { ...prev, content: newContent };
    });
  };

  // Function to add a new option to a quiz
  const handleAddQuizOption = (contentIndex: number) => {
    setFormData((prev) => {
      const newContent = [...prev.content];
      const currentContent = newContent[contentIndex];

      if (currentContent.type === "quiz") {
        // Ensure quiz object exists
        if (!currentContent.quiz) {
          currentContent.quiz = createDefaultQuiz();
        } else {
          // Clone the quiz to avoid direct mutations
          currentContent.quiz = {
            ...currentContent.quiz,
            options: [...currentContent.quiz.options, ""],
          };
        }
      }

      return { ...prev, content: newContent };
    });
  };

  // Function to remove a quiz option
  const handleRemoveQuizOption = (
    contentIndex: number,
    optionIndex: number
  ) => {
    setFormData((prev) => {
      const newContent = [...prev.content];
      const currentContent = newContent[contentIndex];

      if (
        currentContent.type === "quiz" &&
        currentContent.quiz &&
        currentContent.quiz.options &&
        currentContent.quiz.options.length > 2
      ) {
        // Keep minimum 2 options
        const newOptions = [...currentContent.quiz.options];
        newOptions.splice(optionIndex, 1);

        // Clone the quiz to avoid direct mutations
        currentContent.quiz = {
          ...currentContent.quiz,
          options: newOptions,
          // If we removed the correct answer, reset it
          correctAnswer:
            currentContent.quiz.correctAnswer ===
            currentContent.quiz.options[optionIndex]
              ? ""
              : currentContent.quiz.correctAnswer,
        };
      }

      return { ...prev, content: newContent };
    });
  };

  // Function to remove content items
  const handleRemoveContentItem = (index: number) => {
    setFormData((prev) => {
      const newContent = [...prev.content];
      newContent.splice(index, 1);
      return { ...prev, content: newContent };
    });
  };

  // Function to set the correct answer for quizzes
  const handleSetCorrectAnswer = (contentIndex: number, option: string) => {
    setFormData((prev) => {
      const newContent = [...prev.content];
      const currentContent = newContent[contentIndex];

      if (currentContent.type === "quiz" && currentContent.quiz) {
        currentContent.quiz = {
          ...currentContent.quiz,
          correctAnswer: option,
        };
      }

      return { ...prev, content: newContent };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: "You must be logged in to manage lessons",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    try {
      // Validate quiz content if any
      for (const contentItem of formData.content) {
        if (contentItem.type === "quiz") {
          // Ensure quiz exists
          const quiz = contentItem.quiz || createDefaultQuiz();

          if (!quiz.question.trim()) {
            Swal.fire({
              icon: "warning",
              title: "Validation Error",
              text: "Quiz questions cannot be empty",
              confirmButtonColor: "#3085d6",
            });
            return;
          }

          if (!quiz.options.every((option) => option.trim())) {
            Swal.fire({
              icon: "warning",
              title: "Validation Error",
              text: "Quiz options cannot be empty",
              confirmButtonColor: "#3085d6",
            });
            return;
          }

          if (!quiz.correctAnswer) {
            Swal.fire({
              icon: "warning",
              title: "Validation Error",
              text: "Each quiz must have a correct answer selected",
              confirmButtonColor: "#3085d6",
            });
            return;
          }
        }
      }

      // Make sure all quiz content items have a quiz property
      const sanitizedContent = formData.content.map((item) => {
        if (item.type === "quiz" && !item.quiz) {
          return {
            ...item,
            quiz: createDefaultQuiz(),
          };
        }
        return item;
      });

      if (editingLesson && editingLesson.id) {
        // Update existing lesson using service function
        await updateLesson(editingLesson.id, {
          title: formData.title,
          description: formData.description,
          content: sanitizedContent,
          order: formData.order,
          durationMinutes: formData.durationMinutes,
          videoUrl: formData.videoUrl,
        });
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Lesson updated successfully!",
          confirmButtonColor: "#3085d6",
        });
      } else {
        // Create new lesson using service function
        await createLesson({
          courseId: courseId,
          title: formData.title,
          description: formData.description,
          content: sanitizedContent,
          order: formData.order,
          durationMinutes: formData.durationMinutes,
          videoUrl: formData.videoUrl,
          completedBy: [],
        });
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Lesson created successfully!",
          confirmButtonColor: "#3085d6",
        });
      }

      setIsFormOpen(false);
      fetchLessons(); // Refresh the list
    } catch (error) {
      console.error("Error saving lesson:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save lesson. Please try again.",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "Are you sure you want to delete this lesson? This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Use service function to delete the lesson
      await deleteLesson(lessonId);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Lesson has been deleted",
        confirmButtonColor: "#3085d6",
      });
      fetchLessons(); // Refresh the list
    } catch (error) {
      console.error("Error deleting lesson:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete lesson. Please try again.",
        confirmButtonColor: "#3085d6",
      });
    }
  };

  // Enhanced function to fix video URL formatting if needed
  const prepareVideoUrl = (url: string): string => {
    if (!url) return "";

    // Handle YouTube URLs
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // Convert youtu.be links
      if (url.includes("youtu.be")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Convert regular YouTube links to embed format
      if (url.includes("youtube.com/watch")) {
        const videoId = new URLSearchParams(url.split("?")[1]).get("v");
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // If it's already an embed link, return as is
      if (url.includes("youtube.com/embed/")) {
        return url;
      }
    }

    // Return the original URL for non-YouTube links
    return url;
  };

  const openVideoPreview = (videoUrl: string) => {
    const formattedUrl = prepareVideoUrl(videoUrl);
    setPreviewVideo(formattedUrl);
  };

  // Function to get content type label with icon
  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case "text":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            Text
          </span>
        );
      case "video":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Video
          </span>
        );
      case "quiz":
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            Quiz
          </span>
        );
      default:
        return null;
    }
  };

  // Enhanced video preview with better error handling
  const renderVideoPreview = () => {
    if (!previewVideo) return null;

    const isYouTubeEmbed = previewVideo.includes("youtube.com/embed/");

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-4 max-w-4xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Video Preview</h3>
            <button
              onClick={() => setPreviewVideo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="aspect-w-16 aspect-h-9">
            {isYouTubeEmbed ? (
              <iframe
                src={previewVideo}
                className="w-full h-96 rounded"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full">
                <video
                  src={previewVideo}
                  controls
                  className="w-full h-96 rounded"
                  onError={(e) => {
                    console.error("Video failed to load:", e);
                    Swal.fire({
                      icon: "error",
                      title: "Video Error",
                      text: "Video could not be loaded. Please check the URL and try again.",
                      confirmButtonColor: "#3085d6",
                    });
                  }}
                >
                  Your browser does not support the video tag.
                </video>
                <p className="text-sm text-gray-500 mt-2">
                  If the video doesn't play, try using a direct video file URL
                  (mp4) or a YouTube embed URL.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back to Courses
          </button>
          <h1 className="text-2xl font-bold">Lessons for: {courseName}</h1>
        </div>
        {!isStudent && (
          <button
            onClick={() => handleFormOpen()}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlusCircle size={16} className="mr-2" />
            Add New Lesson
          </button>
        )}
      </div>
      {lessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No lessons available. Create your first lesson!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-1">
                    {lesson.order}
                  </span>
                  <div>
                    <h3 className="font-medium text-lg">{lesson.title}</h3>
                    <p className="text-gray-600 mt-1">{lesson.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-gray-500">
                        Duration: {lesson.durationMinutes} minutes
                      </span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="flex items-center text-sm text-gray-500">
                        Content: {lesson.content.length} item(s)
                      </span>
                    </div>

                    {/* Show content types */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(
                        new Set(
                          lesson.content.map((contentItem) => contentItem.type)
                        )
                      ).map((type) => (
                        <div key={type}>{getContentTypeBadge(type)}</div>
                      ))}
                    </div>

                    {/* Video preview button */}
                    {(lesson.videoUrl ||
                      lesson.content.some(
                        (contentItem) => contentItem.type === "video"
                      )) && (
                      <button
                        onClick={() => {
                          const videoContent = lesson.content.find(
                            (contentItem) => contentItem.type === "video"
                          );
                          const videoUrl =
                            lesson.videoUrl ||
                            (videoContent ? videoContent.content : "");
                          if (videoUrl) {
                            openVideoPreview(videoUrl);
                          }
                        }}
                        className="flex items-center text-green-600 hover:text-green-800 mt-2"
                      >
                        <Play size={16} className="mr-1" />
                        Watch Video
                      </button>
                    )}
                  </div>
                </div>

                {!isStudent && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleFormOpen(lesson)}
                      className="flex items-center text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => lesson.id && handleDeleteLesson(lesson.id)}
                      className="flex items-center text-red-500 hover:text-red-700"
                    >
                      <Trash size={16} className="mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form for adding/editing lessons */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-screen overflow-y-auto my-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingLesson
                  ? `Edit Lesson: ${editingLesson.title}`
                  : "Add New Lesson"}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
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

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
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
                  rows={2}
                  required
                />
              </div>

              {/* Content Section */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 text-sm font-bold">
                    Lesson Content
                  </label>
                  <button
                    type="button"
                    onClick={handleAddContentItem}
                    className="flex items-center text-blue-500 hover:text-blue-700"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Content Block
                  </button>
                </div>

                {formData.content.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                      No content blocks added yet. Add your first content block!
                    </p>
                  </div>
                )}

                {formData.content.map((contentItem, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 mb-3 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                          {index + 1}
                        </span>
                        <select
                          value={contentItem.type}
                          onChange={(e) =>
                            handleContentItemChange(
                              index,
                              "type",
                              e.target.value
                            )
                          }
                          className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="video">Video</option>
                          <option value="quiz">Quiz</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContentItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {contentItem.type === "text" && (
                      <textarea
                        value={contentItem.content}
                        onChange={(e) =>
                          handleContentItemChange(
                            index,
                            "content",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        placeholder="Enter text content here..."
                      />
                    )}

                    {contentItem.type === "video" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={contentItem.content}
                          onChange={(e) =>
                            handleContentItemChange(
                              index,
                              "content",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter video URL (YouTube URL or embed URL)"
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500">
                            Accepts regular YouTube URLs, YouTube embed URLs, or
                            direct video file URLs
                          </p>
                          {contentItem.content && (
                            <button
                              type="button"
                              onClick={() =>
                                openVideoPreview(contentItem.content)
                              }
                              className="flex items-center text-green-600 hover:text-green-800 text-sm"
                            >
                              <Play size={14} className="mr-1" />
                              Preview
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {contentItem.type === "quiz" && (
                      <div className="space-y-4">
                        {/* Quiz Question */}
                        <div>
                          <label className="block text-gray-700 text-sm mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={contentItem.quiz?.question || ""}
                            onChange={(e) =>
                              handleContentItemChange(
                                index,
                                "quiz.question",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter quiz question here..."
                          />
                        </div>

                        {/* Quiz Options */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-gray-700 text-sm">
                              Options
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddQuizOption(index)}
                              className="text-sm text-blue-500 hover:text-blue-700"
                            >
                              + Add Option
                            </button>
                          </div>

                          {contentItem.quiz?.options.map(
                            (option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className="flex items-center mb-2 bg-white rounded-lg px-3 py-2 border"
                              >
                                <div className="flex items-center mr-2">
                                  <input
                                    type="radio"
                                    id={`correct_answer_${index}_${optionIndex}`}
                                    name={`correct_answer_${index}`}
                                    checked={
                                      contentItem.quiz &&
                                      contentItem.quiz.correctAnswer === option
                                    }
                                    onChange={() =>
                                      handleSetCorrectAnswer(index, option)
                                    }
                                    className="mr-2"
                                  />
                                  <label
                                    htmlFor={`correct_answer_${index}_${optionIndex}`}
                                    className="text-sm text-gray-700"
                                  >
                                    Correct
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    handleContentItemChange(
                                      index,
                                      `quiz.option_${optionIndex}`,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                {contentItem.quiz &&
                                  contentItem.quiz.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveQuizOption(
                                          index,
                                          optionIndex
                                        )
                                      }
                                      className="ml-2 text-red-500 hover:text-red-700"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="durationMinutes"
                    value={formData.durationMinutes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Main Video URL (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter main video URL (optional)"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        Optional main lesson video
                      </p>
                      {formData.videoUrl && (
                        <button
                          type="button"
                          onClick={() => openVideoPreview(formData.videoUrl)}
                          className="flex items-center text-green-600 hover:text-green-800 text-sm"
                        >
                          <Play size={14} className="mr-1" />
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 mr-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingLesson ? "Update Lesson" : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video preview modal */}
      {renderVideoPreview()}
    </div>
  );
};

export default LessonManagement;
