-- Users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects (
  subject_id SERIAL PRIMARY KEY,
  subject_name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Courses table
CREATE TABLE courses (
  course_id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(subject_id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
  lesson_id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(course_id),
  title VARCHAR(100) NOT NULL,
  content TEXT,
  order_number INTEGER NOT NULL,
  estimated_duration INTEGER -- in minutes
);

-- User_Course_Progress table
CREATE TABLE user_course_progress (
  progress_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  course_id INTEGER REFERENCES courses(course_id),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  last_accessed TIMESTAMP,
  UNIQUE (user_id, course_id)
);

-- User_Lesson_Progress table
CREATE TABLE user_lesson_progress (
  user_lesson_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  lesson_id INTEGER REFERENCES lessons(lesson_id),
  completion_status BOOLEAN DEFAULT FALSE,
  last_accessed TIMESTAMP,
  UNIQUE (user_id, lesson_id)
);

-- Forums/Discussion topics
CREATE TABLE discussion_topics (
  topic_id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(user_id),
  course_id INTEGER REFERENCES courses(course_id) NULL -- Optional - can be general discussion
);

-- Discussion replies
CREATE TABLE discussion_replies (
  reply_id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES discussion_topics(topic_id),
  user_id INTEGER REFERENCES users(user_id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);