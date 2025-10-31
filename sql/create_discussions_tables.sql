-- Discussion threads table
CREATE TABLE discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'general', -- general | mock | practice | question
  target text, -- e.g. 'mock', 'questions', 'questions1' or a question id
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Replies to threads
CREATE TABLE discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for faster lookup
CREATE INDEX ON discussion_threads (created_at DESC);
CREATE INDEX ON discussion_replies (thread_id, created_at ASC);
