import React, { useState, useEffect } from "react";
import { useAuth } from "../../Contexts/AuthenticationContext";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getAllForumPosts,
  getCourseForumPosts,
  getLessonForumPosts,
  getPostReplies,
  createForumPost,
  createPostReply,
  ForumPost,
  PostReply,
  getEnrolledCoursesForumPosts,
  getMostActiveDiscussions,
  getUserPosts,
  canUserReply,
} from "../../Services/forumService";
import {
  MessageCircle,
  User,
  Clock,
  Send,
  Filter,
  BarChart2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import "../../Styles/Forums.css";

enum ForumFilterType {
  ALL = "all",
  MY_COURSES = "my-courses",
  MY_POSTS = "my-posts",
  MOST_ACTIVE = "most-active",
}

const ForumPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{
    courseId?: string;
    lessonId?: string;
  }>();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [currentFilter, setCurrentFilter] = useState<ForumFilterType>(
    ForumFilterType.ALL
  );
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [canReply, setCanReply] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [userCheckPending, setUserCheckPending] = useState(true);

  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>(
    {}
  );
  const [postReplies, setPostReplies] = useState<Record<string, PostReply[]>>(
    {}
  );
  const [replyContents, setReplyContents] = useState<Record<string, string>>(
    {}
  );
  const [replySubmitting, setReplySubmitting] = useState<
    Record<string, boolean>
  >({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>(
    {}
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [courseId, lessonId, currentFilter, currentUser]);

  useEffect(() => {
    const checkPermissions = async () => {
      setUserCheckPending(true);
      try {
        if (currentUser) {
          console.log("Checking permissions for user:", currentUser.uid);
          const hasReplyPermission = await canUserReply(currentUser.uid);
          console.log("Permission check result:", hasReplyPermission);
          setCanReply(hasReplyPermission);
          setUserRole(currentUser.role || null);
        } else {
          console.log("No current user, setting canReply to false");
          setCanReply(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error checking user permissions:", error);
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "DEV MODE: Enabling reply functionality despite permission check error"
          );
          setCanReply(true);
        } else {
          setCanReply(false);
        }
      } finally {
        setUserCheckPending(false);
      }
    };

    checkPermissions();
  }, [currentUser]);

  const fetchPosts = async () => {
    if (!currentUser) return;

    setLoading(true);
    setFetchError(null);
    try {
      let fetchedPosts: ForumPost[] = [];

      if (courseId) {
        fetchedPosts = await getCourseForumPosts(courseId);
      } else if (lessonId) {
        fetchedPosts = await getLessonForumPosts(lessonId);
      } else {
        switch (currentFilter) {
          case ForumFilterType.MY_COURSES:
            if (
              currentUser.enrolledCourses &&
              currentUser.enrolledCourses.length > 0
            ) {
              fetchedPosts = await getEnrolledCoursesForumPosts(
                currentUser.uid,
                currentUser.enrolledCourses
              );
            }
            break;
          case ForumFilterType.MY_POSTS:
            fetchedPosts = await getUserPosts(currentUser.uid);
            break;
          case ForumFilterType.MOST_ACTIVE:
            fetchedPosts = await getMostActiveDiscussions(10);
            break;
          case ForumFilterType.ALL:
          default:
            fetchedPosts = await getAllForumPosts();
            break;
        }
      }

      setPosts(fetchedPosts);
      setExpandedPosts({});
      setPostReplies({});
      setReplyContents({});
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      setFetchError("Failed to load discussions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePostExpansion = async (post: ForumPost) => {
    const postId = post.id!;
    const isCurrentlyExpanded = expandedPosts[postId] || false;

    setExpandedPosts((prev) => ({ ...prev, [postId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded) {
      if (currentUser && userRole === "student" && !canReply) {
        showPermissionAlert();
      }

      if (!postReplies[postId] || postReplies[postId].length === 0) {
        await fetchRepliesForPost(post);
      }
    }
  };

  const fetchRepliesForPost = async (post: ForumPost) => {
    const postId = post.id!;

    if (loadingReplies[postId]) return;

    setLoadingReplies((prev) => ({ ...prev, [postId]: true }));

    try {
      console.log(`Fetching replies for post: ${postId}`);
      const replies = await getPostReplies(postId);
      console.log(`Received ${replies.length} replies for post ${postId}`);

      setPostReplies((prev) => ({ ...prev, [postId]: replies }));

      if (!replyContents[postId]) {
        setReplyContents((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (error) {
      console.error(`Error fetching replies for post ${postId}:`, error);
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const showPermissionAlert = () => {
    Swal.fire({
      title: "Students Cannot Reply",
      html: "Only teachers and instructors can reply to forum posts. If you have a question, you can create a new discussion thread.",
      icon: "info",
      confirmButtonText: "I Understand",
      confirmButtonColor: "#3085d6",
      showClass: { popup: "animate__animated animate__fadeInDown" },
      hideClass: { popup: "animate__animated animate__fadeOutUp" },
    });
  };

  const handleReplyAttempt = (e: React.MouseEvent) => {
    e.preventDefault();
    showPermissionAlert();
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (postSubmitting) return;
    setPostSubmitting(true);

    try {
      const postData = {
        title: newPostTitle,
        content: newPostContent,
        authorId: currentUser.uid,
        authorName: currentUser.name || "Anonymous",
      };

      if (courseId) {
        Object.assign(postData, { courseId });
      }
      if (lessonId) {
        Object.assign(postData, { lessonId });
      }

      const newPost = await createForumPost(postData);

      setNewPostTitle("");
      setNewPostContent("");
      setShowNewPostForm(false);

      setPosts((prevPosts) => {
        const postWithTimestamp = {
          ...(newPost as ForumPost),
          createdAt: newPost.createdAt || new Date(),
          updatedAt: newPost.updatedAt || new Date(),
        };
        return [postWithTimestamp, ...prevPosts];
      });

      Swal.fire({
        title: "Posted!",
        text: "Your discussion has been posted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to create post. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();

    if (!currentUser || !replyContents[postId]) return;
    if (replySubmitting[postId]) return;

    if (!canReply) {
      showPermissionAlert();
      return;
    }

    setReplySubmitting((prev) => ({ ...prev, [postId]: true }));

    try {
      const replyData = {
        postId: postId,
        content: replyContents[postId],
        authorId: currentUser.uid,
        authorName: currentUser.name || "Anonymous",
      };

      const newReply = await createPostReply(replyData);

      setReplyContents((prev) => ({ ...prev, [postId]: "" }));

      setPostReplies((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newReply as PostReply],
      }));

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, replyCount: (post.replyCount || 0) + 1 }
            : post
        )
      );

      Swal.fire({
        position: "bottom-end",
        icon: "success",
        title: "Reply posted successfully",
        showConfirmButton: false,
        timer: 1500,
        toast: true,
      });
    } catch (error) {
      console.error("Error creating reply:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to submit reply. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";

    if (timestamp.toDate) {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } else if (timestamp instanceof Date) {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(timestamp);
    }

    return "Just now";
  };

  const handleFilterChange = (filter: ForumFilterType) => {
    setCurrentFilter(filter);
  };

  const handleReplyContentChange = (postId: string, content: string) => {
    setReplyContents((prev) => ({ ...prev, [postId]: content }));
  };

  const getPageTitle = () => {
    if (courseId) return "Course Discussion Forum";
    if (lessonId) return "Lesson Discussion Forum";
    return "Learning Community Forum";
  };

  const shouldShowNewPostButton = () => {
    return currentUser && !userCheckPending;
  };

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h1>{getPageTitle()}</h1>
        <button
          className="refresh-button"
          onClick={() => fetchPosts()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {!courseId && !lessonId && (
        <div className="forum-filters">
          <h3>
            <Filter size={16} /> Filter Discussions
          </h3>
          <div className="filter-buttons">
            <button
              className={currentFilter === ForumFilterType.ALL ? "active" : ""}
              onClick={() => handleFilterChange(ForumFilterType.ALL)}
            >
              All Discussions
            </button>
            <button
              className={
                currentFilter === ForumFilterType.MY_COURSES ? "active" : ""
              }
              onClick={() => handleFilterChange(ForumFilterType.MY_COURSES)}
            >
              My Courses
            </button>
            <button
              className={
                currentFilter === ForumFilterType.MY_POSTS ? "active" : ""
              }
              onClick={() => handleFilterChange(ForumFilterType.MY_POSTS)}
            >
              My Posts
            </button>
            <button
              className={
                currentFilter === ForumFilterType.MOST_ACTIVE ? "active" : ""
              }
              onClick={() => handleFilterChange(ForumFilterType.MOST_ACTIVE)}
            >
              <BarChart2 size={16} /> Most Active
            </button>
          </div>
        </div>
      )}

      {shouldShowNewPostButton() && (
        <div className="new-post-container">
          <button
            className="new-post-button"
            onClick={() => setShowNewPostForm(!showNewPostForm)}
          >
            {showNewPostForm ? "Cancel" : "Start New Discussion"}
          </button>
        </div>
      )}

      {currentUser && userRole === "student" && !canReply && (
        <div className="permission-notice">
          <AlertTriangle size={16} />
          <span>
            Students can create discussions but only teachers can reply to
            posts.
          </span>
        </div>
      )}

      {showNewPostForm && (
        <div className="new-post-form-container">
          <form onSubmit={handleSubmitPost} className="new-post-form">
            <div className="form-group">
              <label htmlFor="post-title">Title</label>
              <input
                id="post-title"
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Discussion title"
                required
                minLength={5}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="post-content">Content</label>
              <textarea
                id="post-content"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your question or thoughts..."
                required
                minLength={10}
                rows={5}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="submit-post-button"
                disabled={postSubmitting}
              >
                {postSubmitting ? "Posting..." : "Post Discussion"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!currentUser && (
        <div className="login-prompt">
          <p>
            Please <a onClick={() => navigate("/login")}>log in</a> to
            participate in discussions.
          </p>
        </div>
      )}

      {fetchError && (
        <div className="error-message">
          <p>{fetchError}</p>
          <button onClick={fetchPosts}>Try Again</button>
        </div>
      )}

      {loading && (
        <div className="loading-indicator">
          <p>Loading discussions...</p>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="no-posts-message">
          <p>No discussions found. Be the first to start a conversation!</p>
        </div>
      )}

      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-item">
            <div className="post-header">
              <h3 className="post-title">{post.title}</h3>
              <div className="post-meta">
                <span className="post-author">
                  <User size={14} /> {post.authorName}
                </span>
                <span className="post-date">
                  <Clock size={14} /> {formatDate(post.createdAt)}
                </span>
                <span className="post-replies">
                  <MessageCircle size={14} /> {post.replyCount || 0} replies
                </span>
              </div>
            </div>

            <div className="post-content">{post.content}</div>

            <div className="post-actions">
              <button
                className="toggle-replies-button"
                onClick={() => togglePostExpansion(post)}
              >
                {expandedPosts[post.id!] ? (
                  <>
                    <ChevronUp size={16} /> Hide Replies
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    {post.replyCount
                      ? `View ${post.replyCount} Replies`
                      : "Reply"}
                  </>
                )}
              </button>
            </div>

            {expandedPosts[post.id!] && (
              <div className="post-replies-section">
                {loadingReplies[post.id!] && (
                  <div className="loading-replies">Loading replies...</div>
                )}

                <div className="replies-list">
                  {postReplies[post.id!]?.length > 0
                    ? postReplies[post.id!].map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <div className="reply-header">
                            <span className="reply-author">
                              <User size={14} /> {reply.authorName}
                            </span>
                            <span className="reply-date">
                              <Clock size={14} /> {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <div className="reply-content">{reply.content}</div>
                        </div>
                      ))
                    : !loadingReplies[post.id!] && (
                        <div className="no-replies">
                          <p>
                            No replies yet.{" "}
                            {canReply
                              ? "Be the first to respond!"
                              : "Only teachers can respond to posts."}
                          </p>
                        </div>
                      )}
                </div>

                {canReply && !userCheckPending ? (
                  <form
                    className="reply-form"
                    onSubmit={(e) => handleSubmitReply(e, post.id!)}
                  >
                    <textarea
                      value={replyContents[post.id!] || ""}
                      onChange={(e) =>
                        handleReplyContentChange(post.id!, e.target.value)
                      }
                      placeholder="Write your reply..."
                      required
                      disabled={replySubmitting[post.id!]}
                    />
                    <button
                      type="submit"
                      className="submit-reply-button"
                      disabled={
                        !replyContents[post.id!] || replySubmitting[post.id!]
                      }
                    >
                      <Send size={16} />
                      {replySubmitting[post.id!] ? "Sending..." : "Reply"}
                    </button>
                  </form>
                ) : currentUser &&
                  !userCheckPending &&
                  userRole === "student" ? (
                  <div className="student-notice">
                    <button
                      className="disabled-reply-button"
                      onClick={handleReplyAttempt}
                    >
                      <AlertTriangle size={16} />
                      Only teachers can reply
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForumPage;
