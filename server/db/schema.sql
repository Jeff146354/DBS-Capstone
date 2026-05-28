-- Spendly Database Schema
-- Run: mysql -u <user> -p <database> < server/db/schema.sql

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(36)   NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL DEFAULT '',
  monthly_income INT           NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id    VARCHAR(36)              NOT NULL,
  name  VARCHAR(50)              NOT NULL,
  icon  VARCHAR(10)              NOT NULL,
  type  ENUM('expense','income') NOT NULL,
  color VARCHAR(7)               NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id             VARCHAR(36)                                 NOT NULL,
  user_id        VARCHAR(36)                                 NOT NULL,
  category_id    VARCHAR(36)                                 NOT NULL,
  type           ENUM('expense','income','transfer')         NOT NULL,
  amount         INT                                         NOT NULL,
  account        VARCHAR(100)                                NOT NULL,
  payment_method ENUM('cash','transfer','e-wallet','credit') NOT NULL,
  note           TEXT,
  date           DATE                                        NOT NULL,
  created_at     TIMESTAMP                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_user_id (user_id),
  KEY idx_transactions_date (date),
  KEY idx_transactions_user_date (user_id, date),
  CONSTRAINT fk_transactions_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
  id            INT         NOT NULL AUTO_INCREMENT,
  user_id       VARCHAR(36) NOT NULL,
  category_id   VARCHAR(36) NOT NULL,
  monthly_limit INT         NOT NULL,
  month         VARCHAR(7)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget (user_id, category_id, month),
  CONSTRAINT fk_budgets_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
