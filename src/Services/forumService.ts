import { db } from "../Contexts/new_firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
  increment
} from "firebase/firestore";

export interface ForumPost {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  courseId?: string;
  lessonId?: string;
  createdAt: Timestamp | Date; // Allow Date for UI display before server timestamp resolves
  updatedAt: Timestamp | Date; // Allow Date for UI display before server timestamp resolves
  replyCount: number;
}

export interface PostReply {
  id?: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp | Date; // Allow Date for UI display before server timestamp resolves
}

// Error handling wrapper
const handleFirestoreError = (operation: string) => (error: any) => {
  console.error(`Error in ${operation}:`, error);
  
  // Add special handling for missing indices
  if (error.code === 'failed-precondition' && error.message.includes('index')) {
    console.warn('Missing Firestore index. Please create the required index.');
    // Extract the URL from the error message to simplify creating the index
    const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/);
    if (urlMatch) {
      console.warn(`Create the index here: ${urlMatch[0]}`);
    }
  }
  
  throw error;
};

// Create a new forum post
export const createForumPost = async (postData: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt' | 'replyCount'>): Promise<ForumPost> => {
  try {
    const postRef = collection(db, 'forumPosts');
    
    const postWithTimestamps = {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      replyCount: 0
    };
    
    const docRef = await addDoc(postRef, postWithTimestamps);
    
    return {
      id: docRef.id,
      ...postWithTimestamps,
      // Return current time for immediate UI display until server timestamp resolves
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    return handleFirestoreError('createForumPost')(error);
  }
};

// Create a reply to a forum post
export const createPostReply = async (replyData: Omit<PostReply, 'id' | 'createdAt'>): Promise<PostReply> => {
  try {
    // First, create the reply document
    const replyWithTimestamp = {
      ...replyData,
      createdAt: serverTimestamp()
    };
    
    // Add the reply to collection
    const docRef = await addDoc(collection(db, 'postReplies'), replyWithTimestamp);
    
    // Now update the post's reply count separately
    const postRef = doc(db, 'forumPosts', replyData.postId);
    await updateDoc(postRef, {
      replyCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // For UI display, return the reply with a temp Date object
    const createdReply: PostReply = {
      ...replyData,
      id: docRef.id,
      createdAt: new Date()
    };
    
    return createdReply;
  } catch (error) {
    return handleFirestoreError('createPostReply')(error);
  }
};

// Get all forum posts
export const getAllForumPosts = async (): Promise<ForumPost[]> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const posts: ForumPost[] = [];
    
    querySnapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data()
      } as ForumPost);
    });
    
    return posts;
  } catch (error) {
    return handleFirestoreError('getAllForumPosts')(error);
  }
};

// Get forum posts for a specific course
export const getCourseForumPosts = async (courseId: string): Promise<ForumPost[]> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    
    // Try with the compound index first
    try {
      const q = query(
        postsRef,
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      return posts;
    } catch (indexError) {
      // If index error, fall back to simple query without ordering
      console.warn('Falling back to unordered query due to missing index.');
      
      const q = query(
        postsRef,
        where('courseId', '==', courseId)
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      // Sort client-side as a fallback
      return posts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
        const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
        return dateB.getTime() - dateA.getTime(); // descending order
      });
    }
  } catch (error) {
    return handleFirestoreError('getCourseForumPosts')(error);
  }
};

// Get forum posts for a specific lesson
export const getLessonForumPosts = async (lessonId: string): Promise<ForumPost[]> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    
    // Try with the compound index first
    try {
      const q = query(
        postsRef,
        where('lessonId', '==', lessonId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      return posts;
    } catch (indexError) {
      // If index error, fall back to simple query without ordering
      console.warn('Falling back to unordered query due to missing index.');
      
      const q = query(
        postsRef,
        where('lessonId', '==', lessonId)
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      // Sort client-side as a fallback
      return posts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
        const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
        return dateB.getTime() - dateA.getTime(); // descending order
      });
    }
  } catch (error) {
    return handleFirestoreError('getLessonForumPosts')(error);
  }
};

// Get replies for a specific post
export const getPostReplies = async (postId: string): Promise<PostReply[]> => {
  try {
    const repliesRef = collection(db, 'postReplies');
    
    // IMPORTANT: To fix the missing index error, try a simpler query first without orderBy
    try {
      const orderedQuery = query(
        repliesRef,
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(orderedQuery);
      const replies: PostReply[] = [];
      
      querySnapshot.forEach(doc => {
        replies.push({
          id: doc.id,
          ...doc.data()
        } as PostReply);
      });
      
      return replies;
    } catch (indexError) {
      // If there's an index error, try without the orderBy clause as a fallback
      console.warn('Falling back to unordered query due to missing index. Replies may not be in chronological order.');
      
      const simpleQuery = query(
        repliesRef,
        where('postId', '==', postId)
      );
      
      const querySnapshot = await getDocs(simpleQuery);
      const replies: PostReply[] = [];
      
      querySnapshot.forEach(doc => {
        replies.push({
          id: doc.id,
          ...doc.data()
        } as PostReply);
      });
      
      // Sort client-side as a fallback
      return replies.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
        const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
        return dateA.getTime() - dateB.getTime(); // ascending order
      });
    }
  } catch (error) {
    return handleFirestoreError('getPostReplies')(error);
  }
};

// Get posts from courses the user is enrolled in
export const getEnrolledCoursesForumPosts = async (
  _userId: string,
  enrolledCourseIds: string[]
): Promise<ForumPost[]> => {
  try {
    if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
      return [];
    }
    
    // Firestore limits 'in' queries to 10 values, so we may need to split
    const posts: ForumPost[] = [];
    
    // Process in batches of 10
    for (let i = 0; i < enrolledCourseIds.length; i += 10) {
      const batchCourseIds = enrolledCourseIds.slice(i, i + 10);
      
      // Try with compound index first
      try {
        const postsRef = collection(db, 'forumPosts');
        const q = query(
          postsRef,
          where('courseId', 'in', batchCourseIds),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
          posts.push({
            id: doc.id,
            ...doc.data()
          } as ForumPost);
        });
      } catch (indexError) {
        // Fall back to simple query without ordering if index is missing
        console.warn('Falling back to unordered query due to missing index.');
        
        const postsRef = collection(db, 'forumPosts');
        const q = query(
          postsRef,
          where('courseId', 'in', batchCourseIds)
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
          posts.push({
            id: doc.id,
            ...doc.data()
          } as ForumPost);
        });
      }
    }
    
    // Sort by createdAt since we're combining multiple queries
    return posts.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
      const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    return handleFirestoreError('getEnrolledCoursesForumPosts')(error);
  }
};

// Get most active discussions (by reply count)
export const getMostActiveDiscussions = async (limitCount: number = 10): Promise<ForumPost[]> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    
    // Try with compound index first
    try {
      const q = query(
        postsRef,
        orderBy('replyCount', 'desc'),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      return posts;
    } catch (indexError) {
      // Fallback to just replyCount if compound index is missing
      console.warn('Falling back to simpler query due to missing index.');
      
      const q = query(
        postsRef,
        orderBy('replyCount', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      return posts;
    }
  } catch (error) {
    return handleFirestoreError('getMostActiveDiscussions')(error);
  }
};

// Get posts and replies created by a specific user
export const getUserPosts = async (userId: string): Promise<ForumPost[]> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    
    // Try with compound index first
    try {
      const q = query(
        postsRef,
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      return posts;
    } catch (indexError) {
      // If index error, fall back to simple query without ordering
      console.warn('Falling back to unordered query due to missing index.');
      
      const q = query(
        postsRef,
        where('authorId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const posts: ForumPost[] = [];
      
      querySnapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data()
        } as ForumPost);
      });
      
      // Sort client-side as a fallback
      return posts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
        const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
        return dateB.getTime() - dateA.getTime(); // descending order
      });
    }
  } catch (error) {
    return handleFirestoreError('getUserPosts')(error);
  }
};

// Check if a user can reply (based on their role)
export const canUserReply = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn(`User document not found for userId: ${userId}`);
      return false;
    }
    
    const userData = userDoc.data();
    
    // Allow teachers, admins, or any other role you want to be able to reply
    // Adding student role for testing purposes
    return userData?.role === 'teacher' || userData?.role === 'admin' || userData?.role === 'student';
  } catch (error) {
    console.error('Error checking user reply permissions:', error);
    // For debugging purposes in development, allow replies
    if (process.env.NODE_ENV === 'development') {
      console.warn('DEV MODE: Allowing replies despite permission check error');
      return true;
    }
    return false; // Default to false for safety in production
  }
};

// Update a forum post
export const updateForumPost = async (
  postId: string,
  updates: Partial<Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const postRef = doc(db, 'forumPosts', postId);
    
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    return handleFirestoreError('updateForumPost')(error);
  }
};

// Update a post reply
export const updatePostReply = async (
  replyId: string,
  updates: Partial<Omit<PostReply, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const replyRef = doc(db, 'postReplies', replyId);
    
    await updateDoc(replyRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    return handleFirestoreError('updatePostReply')(error);
  }
};

// Get posts with pagination
export const getPaginatedPosts = async (
  lastVisible: any = null,
  pageSize: number = 20
): Promise<{ posts: ForumPost[], lastVisible: any }> => {
  try {
    const postsRef = collection(db, 'forumPosts');
    let q;
    
    if (lastVisible) {
      q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );
    } else {
      q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const posts: ForumPost[] = [];
    
    querySnapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data()
      } as ForumPost);
    });
    
    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    return {
      posts,
      lastVisible: newLastVisible
    };
  } catch (error) {
    return handleFirestoreError('getPaginatedPosts')(error);
  }
};

// Search forum posts
export const searchForumPosts = async (searchTerm: string): Promise<ForumPost[]> => {
  try {
    // Note: Basic Firestore doesn't support full-text search
    // This is a simple implementation that searches titles
    // For production, consider using Algolia, Elasticsearch, or Firebase Extensions
    
    const postsRef = collection(db, 'forumPosts');
    const querySnapshot = await getDocs(postsRef);
    
    const posts: ForumPost[] = [];
    const searchTermLower = searchTerm.toLowerCase();
    
    querySnapshot.forEach(doc => {
      const postData = doc.data() as ForumPost;
      if (
        postData.title.toLowerCase().includes(searchTermLower) ||
        postData.content.toLowerCase().includes(searchTermLower)
      ) {
        posts.push({
          id: doc.id,
          ...postData
        });
      }
    });
    
    // Sort by date
    return posts.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
      const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    return handleFirestoreError('searchForumPosts')(error);
  }
};

// Get post by ID
export const getPostById = async (postId: string): Promise<ForumPost | null> => {
  try {
    const postRef = doc(db, 'forumPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return null;
    }
    
    return {
      id: postDoc.id,
      ...postDoc.data()
    } as ForumPost;
  } catch (error) {
    handleFirestoreError('getPostById')(error);
    return null;
  }
};

// Flag a post or reply for moderation
export const flagContent = async (
  contentType: 'post' | 'reply',
  contentId: string,
  userId: string,
  reason: string
): Promise<void> => {
  try {
    const flagData = {
      contentType,
      contentId,
      reportedBy: userId,
      reason,
      createdAt: serverTimestamp(),
      status: 'pending'
    };
    
    await addDoc(collection(db, 'contentFlags'), flagData);
  } catch (error) {
    return handleFirestoreError('flagContent')(error);
  }
};