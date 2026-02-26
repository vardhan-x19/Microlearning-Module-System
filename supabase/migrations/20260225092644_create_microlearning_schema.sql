/*
  # Microlearning Module System Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - 'instructor' or 'learner'
      - `created_at` (timestamptz)
    
    - `modules`
      - `id` (uuid, primary key)
      - `instructor_id` (uuid, references profiles)
      - `title` (text)
      - `video_url` (text)
      - `pdf_url` (text)
      - `animated_content_url` (text)
      - `content_summary` (text)
      - `published` (boolean)
      - `created_at` (timestamptz)
    
    - `quizzes`
      - `id` (uuid, primary key)
      - `module_id` (uuid, references modules)
      - `ai_prompt` (text)
      - `created_at` (timestamptz)
    
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references quizzes)
      - `question_text` (text)
      - `option_a` (text)
      - `option_b` (text)
      - `option_c` (text)
      - `option_d` (text)
      - `correct_answer` (text) - 'A', 'B', 'C', or 'D'
      - `explanation` (text)
      - `order_number` (integer)
    
    - `enrollments`
      - `id` (uuid, primary key)
      - `learner_id` (uuid, references profiles)
      - `module_id` (uuid, references modules)
      - `enrolled_at` (timestamptz)
    
    - `quiz_attempts`
      - `id` (uuid, primary key)
      - `learner_id` (uuid, references profiles)
      - `quiz_id` (uuid, references quizzes)
      - `module_id` (uuid, references modules)
      - `score` (integer)
      - `total_questions` (integer)
      - `answers` (jsonb)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for instructors to manage their own modules
    - Add policies for learners to view published modules and submit attempts
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('instructor', 'learner')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  pdf_url text,
  animated_content_url text,
  content_summary text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules"
  ON modules FOR SELECT
  TO authenticated
  USING (published = true OR instructor_id = auth.uid());

CREATE POLICY "Instructors can create modules"
  ON modules FOR INSERT
  TO authenticated
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can update own modules"
  ON modules FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can delete own modules"
  ON modules FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  ai_prompt text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quizzes for accessible modules"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id
      AND (modules.published = true OR modules.instructor_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can create quizzes for own modules"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id
      AND modules.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update quizzes for own modules"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id
      AND modules.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id
      AND modules.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete quizzes for own modules"
  ON quizzes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id
      AND modules.instructor_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation text,
  order_number integer NOT NULL DEFAULT 0
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions for accessible quizzes"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN modules ON modules.id = quizzes.module_id
      WHERE quizzes.id = questions.quiz_id
      AND (modules.published = true OR modules.instructor_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can manage questions for own modules"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN modules ON modules.id = quizzes.module_id
      WHERE quizzes.id = questions.quiz_id
      AND modules.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN modules ON modules.id = quizzes.module_id
      WHERE quizzes.id = questions.quiz_id
      AND modules.instructor_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(learner_id, module_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Learners can enroll in published modules"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    learner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = enrollments.module_id
      AND modules.published = true
    )
  );

CREATE POLICY "Instructors can view enrollments for their modules"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = enrollments.module_id
      AND modules.instructor_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  answers jsonb NOT NULL,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (learner_id = auth.uid());

CREATE POLICY "Learners can create attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Instructors can view attempts for their modules"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quiz_attempts.module_id
      AND modules.instructor_id = auth.uid()
    )
  );
