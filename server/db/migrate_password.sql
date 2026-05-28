-- Add password_hash column if it doesn't already exist
-- Uses a stored procedure trick since MySQL doesn't support ADD COLUMN IF NOT EXISTS
DROP PROCEDURE IF EXISTS add_password_hash_column;

CREATE PROCEDURE add_password_hash_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email;
  END IF;
END;

CALL add_password_hash_column();
DROP PROCEDURE IF EXISTS add_password_hash_column;
