CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT,
  raw_text TEXT NOT NULL,
  parsed_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  description TEXT NOT NULL,
  parsed_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_results (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  resume_id INT REFERENCES resumes(id) ON DELETE CASCADE,
  job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  breakdown JSONB NOT NULL,
  matched_skills JSONB NOT NULL,
  missing_skills JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS embeddings (
  id SERIAL PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('resume','job')),
  owner_id INT NOT NULL,
  chunk_text TEXT NOT NULL,
  vector vector(1024) NOT NULL
);
CREATE INDEX IF NOT EXISTS embeddings_owner_idx ON embeddings(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS embeddings_vec_idx ON embeddings USING hnsw (vector vector_cosine_ops);
