import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import {
  Lesson,
  updateLessonProgress,
  Quiz,
  getLessonById,
  submitQuizAnswer,
} from "../../Services/lessonService";
import { Check, X, ArrowRight, ArrowLeft, ChevronLeft } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../Contexts/new_firebase";

interface LessonViewProps {
  lessonId: string;
  courseId: string;
  onComplete?: () => void;
  onBackToCourse: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const LessonView: React.FC<LessonViewProps> = ({
  lessonId,
  courseId,
  onComplete,
  onBackToCourse,
  onPrevious,
}) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [quizId: string]: string }>(
    {}
  );
  const [quizResults, setQuizResults] = useState<{ [quizId: string]: boolean }>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [hasCompletedLesson, setHasCompletedLesson] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        setError(null);
        const lessonData = await getLessonById(lessonId);

        if (lessonData) {
          setLesson(lessonData);

          // Check if the user has already completed this lesson
          if (
            currentUser &&
            lessonData.completedBy &&
            lessonData.completedBy.includes(currentUser.uid)
          ) {
            setHasCompletedLesson(true);
          }

          // Reset quiz state when loading a new lesson
          setQuizAnswers({});
          setQuizResults({});
          setCurrentStep(0); // Default to first step
        } else {
          setError("Lesson not found");
        }
      } catch (error) {
        console.error("Error fetching lesson:", error);
        setError("Failed to load lesson. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, currentUser]);

  const handleNextStep = () => {
    if (lesson && currentStep < lesson.content.length - 1) {
      // If current step is a quiz, check if it's been answered correctly before proceeding
      const currentContent = lesson.content[currentStep];
      if (
        currentContent.type === "quiz" &&
        currentContent.quiz &&
        quizResults[currentContent.quiz.id] !== true
      ) {
        alert(
          "Please complete the quiz correctly before moving to the next step."
        );
        return;
      }

      setCurrentStep(currentStep + 1);
    } else if (lesson && currentStep === lesson.content.length - 1) {
      // Reached the end of the lesson
      handleCompleteLesson();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (onPrevious) {
      onPrevious();
    }
  };

  const handleQuizAnswer = (quizId: string, answer: string) => {
    setQuizAnswers({
      ...quizAnswers,
      [quizId]: answer,
    });
  };

  // Store quiz attempt in the quizAttempts collection
  const storeQuizAttempt = async (
    quizId: string,
    answer: string,
    isCorrect: boolean
  ) => {
    if (!currentUser || !lesson?.id) return;

    try {
      // Create a new quiz attempt record
      await addDoc(collection(db, "quizAttempts"), {
        userId: currentUser.uid,
        lessonId: lesson.id,
        courseId: courseId,
        quizId: quizId,
        answer: answer,
        isCorrect: isCorrect,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error storing quiz attempt:", error);
      // We don't want to block the user from proceeding if this fails
    }
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!currentUser || !quiz || !quizAnswers[quiz.id] || !lesson?.id) return;

    try {
      // Use the service method to validate the answer
      const isCorrect = await submitQuizAnswer(
        lesson.id,
        quiz.id,
        quizAnswers[quiz.id],
        currentUser.uid
      );

      setQuizResults({
        ...quizResults,
        [quiz.id]: isCorrect,
      });

      // Store the quiz attempt
      await storeQuizAttempt(quiz.id, quizAnswers[quiz.id], isCorrect);

      // If this is the last step and the answer is correct, mark the lesson as completed
      if (isCorrect && lesson && currentStep === lesson.content.length - 1) {
        await markLessonComplete();
      }
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      setError("Failed to submit quiz answer. Please try again.");
    }
  };

  const markLessonComplete = async () => {
    if (!currentUser || !lesson?.id) {
      setError("You must be logged in to mark a lesson as complete.");
      return;
    }

    try {
      setProgressLoading(true);
      setError(null); // Clear any previous errors

      await updateLessonProgress(
        lesson.id,
        currentUser.uid,
        true // Mark as complete
      );

      setHasCompletedLesson(true);

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error("Error marking lesson as complete:", error);
      // Provide more specific error messages based on common scenarios
      if (error.code === "permission-denied") {
        setError(
          "Permission denied. Please make sure you have the correct permissions to update lesson progress."
        );
      } else if (error.code === "not-found") {
        setError("Lesson not found or you don't have access to it.");
      } else if (error.code === "aborted") {
        setError(
          "Operation was aborted. Your progress will be saved when you have internet connection."
        );
      } else if (error.message) {
        setError(`Failed to mark lesson as complete: ${error.message}`);
      } else {
        setError("Failed to mark lesson as complete. Please try again later.");
      }
    } finally {
      setProgressLoading(false);
    }
  };

  // Add a function to retry marking the lesson as complete
  const retryMarkLessonComplete = () => {
    setError(null);
    markLessonComplete();
  };

  const handleCompleteLesson = async () => {
    if (!currentUser || !lesson?.id) {
      setError("You must be logged in to complete this lesson.");
      return;
    }

    // Check if the current step is a quiz that needs to be completed first
    const currentContent = lesson.content[currentStep];
    if (
      currentContent &&
      currentContent.type === "quiz" &&
      currentContent.quiz &&
      quizResults[currentContent.quiz.id] !== true
    ) {
      // If it's a quiz and not yet answered correctly, let the user know
      alert("Please complete the quiz first");
      return;
    }

    await markLessonComplete();
  };

  // Helper function to format video URLs correctly
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

  const renderVideoContent = (videoUrl: string) => {
    // Format the URL properly first
    const formattedUrl = prepareVideoUrl(videoUrl);

    // Check if it's a YouTube embed URL
    const isYouTubeEmbed = formattedUrl.includes("youtube.com/embed/");

    if (isYouTubeEmbed) {
      return (
        <div className="aspect-w-16 aspect-h-9 mb-4">
          <iframe
            src={formattedUrl}
            className="w-full h-64 md:h-96 rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    } else {
      // If it's not a YouTube embed URL, try to use a video tag
      return (
        <div className="mb-4">
          <video
            src={formattedUrl}
            controls
            className="w-full h-64 md:h-96 rounded-lg"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
  };

  const renderQuizContent = (quiz: Quiz) => {
    const selectedAnswer = quizAnswers[quiz.id];
    const isSubmitted = quizResults[quiz.id] !== undefined;
    const isCorrect = quizResults[quiz.id] === true;

    // Function to reset quiz state
    const resetQuiz = () => {
      setQuizAnswers((prev) => ({
        ...prev,
        [quiz.id]: "",
      }));
      setQuizResults((prev) => {
        const newResults = { ...prev };
        delete newResults[quiz.id];
        return newResults;
      });
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
        <h3 className="font-bold text-lg mb-4">{quiz.question}</h3>

        <div className="space-y-3 mb-6">
          {quiz.options.map((option, index) => (
            <div
              key={index}
              className={`
                p-3 border rounded-lg cursor-pointer
                ${
                  selectedAnswer === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }
                ${
                  isSubmitted && option === quiz.correctAnswer
                    ? "border-green-500 bg-green-50"
                    : ""
                }
                ${
                  isSubmitted &&
                  selectedAnswer === option &&
                  option !== quiz.correctAnswer
                    ? "border-red-500 bg-red-50"
                    : ""
                }
              `}
              onClick={() => !isSubmitted && handleQuizAnswer(quiz.id, option)}
            >
              <div className="flex items-center">
                <div
                  className={`
                  w-5 h-5 flex items-center justify-center rounded-full mr-3
                  ${
                    selectedAnswer === option
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }
                  ${
                    isSubmitted && option === quiz.correctAnswer
                      ? "bg-green-500 text-white"
                      : ""
                  }
                  ${
                    isSubmitted &&
                    selectedAnswer === option &&
                    option !== quiz.correctAnswer
                      ? "bg-red-500 text-white"
                      : ""
                  }
                `}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span>{option}</span>

                {isSubmitted && option === quiz.correctAnswer && (
                  <span className="ml-auto text-green-500">
                    <Check size={18} />
                  </span>
                )}
                {isSubmitted &&
                  selectedAnswer === option &&
                  option !== quiz.correctAnswer && (
                    <span className="ml-auto text-red-500">
                      <X size={18} />
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>

        {!isSubmitted ? (
          <button
            onClick={() => handleSubmitQuiz(quiz)}
            disabled={!selectedAnswer}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${
                selectedAnswer
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            Submit Answer
          </button>
        ) : (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg ${
                isCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isCorrect ? (
                <p className="flex items-center">
                  <Check size={18} className="mr-2" />
                  Correct! Good job.
                </p>
              ) : (
                <div>
                  <p className="flex items-center mb-2">
                    <X size={18} className="mr-2" />
                    Incorrect. Try again.
                  </p>
                  <p>
                    The correct answer is: <strong>{quiz.correctAnswer}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Try Again button */}
            {!isCorrect && (
              <button
                onClick={resetQuiz}
                className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && !lesson) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || "Lesson not found."}</p>
        <button
          onClick={onBackToCourse}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Back to Course
        </button>
      </div>
    );
  }

  const currentContent = lesson.content[currentStep];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBackToCourse}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={18} className="mr-1" />
          Back to Course
        </button>

        {hasCompletedLesson && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
            <Check size={14} className="mr-1" />
            Completed
          </span>
        )}
      </div>

      {/* Lesson Title & Progress */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
        <p className="text-gray-600 mb-4">{lesson.description}</p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{
              width: `${((currentStep + 1) / lesson.content.length) * 100}%`,
            }}
          ></div>
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {lesson.content.length}
        </div>
      </div>

      {/* Display error message if present */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
          <p>{error}</p>
          <button
            onClick={retryMarkLessonComplete}
            className="bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Lesson Content */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        {currentContent.type === "text" && (
          <div className="prose max-w-none">
            {currentContent.content.split("\n").map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {currentContent.type === "video" &&
          renderVideoContent(currentContent.content)}

        {currentContent.type === "quiz" &&
          currentContent.quiz &&
          renderQuizContent(currentContent.quiz)}
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevStep}
          className={`flex items-center px-4 py-2 ${
            currentStep > 0
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          } rounded-lg`}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={16} className="mr-2" />
          Previous
        </button>

        <button
          onClick={handleNextStep}
          disabled={progressLoading}
          className={`flex items-center px-4 py-2 ${
            progressLoading
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : currentContent.type === "quiz" &&
                currentContent.quiz &&
                quizResults[currentContent.quiz.id] !== true
              ? "bg-gray-300 text-gray-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          } rounded-lg`}
        >
          {progressLoading ? (
            <span className="flex items-center">
              <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
              Saving...
            </span>
          ) : currentStep < lesson.content.length - 1 ? (
            <>
              Next
              <ArrowRight size={16} className="ml-2" />
            </>
          ) : (
            "Complete Lesson"
          )}
        </button>
      </div>
    </div>
  );
};

export default LessonView;
