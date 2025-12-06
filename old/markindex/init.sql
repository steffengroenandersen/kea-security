-- Markindex Database Schema
-- PostgreSQL 15+

-- Enable UUID extension (for potential future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
-- Stores user accounts with hashed passwords
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  profile_picture VARCHAR(500),  -- Path to uploaded image
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Sessions table
-- Stores active user sessions with CSRF tokens
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,  -- Random token stored in httpOnly cookie
  csrf_token VARCHAR(255) NOT NULL,  -- CSRF protection token
  expires_at TIMESTAMP NOT NULL,  -- Session expiration
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on session_token for fast lookups
CREATE INDEX idx_sessions_token ON sessions(session_token);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Items table
-- User-generated content with visibility control
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for user's items
CREATE INDEX idx_items_user_id ON items(user_id);

-- Create index for visibility queries
CREATE INDEX idx_items_visibility ON items(visibility);

-- Comments table
-- Comments on items
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for item's comments
CREATE INDEX idx_comments_item_id ON comments(item_id);

-- Create index for user's comments
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Create default admin user (password: Admin123!)
-- In production, this should be created manually with a strong password
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@markindex.io', '$2b$10$iq6H9v7ZL3nMJMGKqJtZ1uYLQbKKJ7BZqZr5LiZGq5BxQKq4mX.vG', 'admin');

-- Note: The above password hash is for 'Admin123!' - CHANGE THIS IN PRODUCTION

-- Function to cleanup expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to application user
-- Run this manually after creating appuser:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser;
