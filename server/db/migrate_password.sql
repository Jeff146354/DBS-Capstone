-- Add password_hash column to existing users table (safe to run multiple times)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email;
