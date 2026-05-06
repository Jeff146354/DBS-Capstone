-- Spendly Seed Data
-- Run: mysql -u <user> -p <database> < server/db/seed.sql
-- Uses INSERT IGNORE throughout for idempotency

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────
INSERT IGNORE INTO users (id, name, email, monthly_income) VALUES
  ('user-demo-001', 'Raihanah', 'raihanah@spendly.dev', 5000000);

-- ─────────────────────────────────────────────
-- Categories  (6 expense, 2 income)
-- ─────────────────────────────────────────────
INSERT IGNORE INTO categories (id, name, icon, type, color) VALUES
  ('cat-001', 'Makan',      '🍽️',  'expense', '#FF6B6B'),
  ('cat-002', 'Transport',  '🚗',  'expense', '#4ECDC4'),
  ('cat-003', 'Belanja',    '🛍️',  'expense', '#95E1D3'),
  ('cat-004', 'Pendidikan', '📚',  'expense', '#FFB3BA'),
  ('cat-005', 'Hiburan',    '🎮',  'expense', '#A0E7E5'),
  ('cat-006', 'Lain-lain',  '📦',  'expense', '#7FD8BE'),
  ('cat-007', 'Gaji',       '💼',  'income',  '#6BCB77'),
  ('cat-008', 'Freelance',  '💻',  'income',  '#4D96FF');

-- ─────────────────────────────────────────────
-- Transactions  (July 2025 — 25 rows)
-- 2 income + 23 expense
-- ─────────────────────────────────────────────
INSERT IGNORE INTO transactions
  (id, user_id, category_id, type, amount, account, payment_method, note, date)
VALUES
  -- Income
  ('txn-001', 'user-demo-001', 'cat-007', 'income',  3500000, 'BCA',   'transfer', 'Gaji bulan Juli',                  '2025-07-01'),
  ('txn-002', 'user-demo-001', 'cat-008', 'income',   500000, 'GoPay', 'transfer', 'Bayaran proyek desain logo',       '2025-07-15'),

  -- Makan (cat-001)
  ('txn-003', 'user-demo-001', 'cat-001', 'expense',   15000, 'Tunai', 'cash',     'Makan siang di warteg',            '2025-07-01'),
  ('txn-004', 'user-demo-001', 'cat-001', 'expense',   25000, 'GoPay', 'e-wallet', 'Beli nasi padang',                 '2025-07-03'),
  ('txn-005', 'user-demo-001', 'cat-001', 'expense',   12000, 'Tunai', 'cash',     'Sarapan bubur ayam',               '2025-07-05'),
  ('txn-006', 'user-demo-001', 'cat-001', 'expense',   35000, 'OVO',   'e-wallet', 'Makan malam bersama teman',        '2025-07-08'),
  ('txn-007', 'user-demo-001', 'cat-001', 'expense',   18000, 'Tunai', 'cash',     'Beli gorengan dan es teh',         '2025-07-11'),
  ('txn-008', 'user-demo-001', 'cat-001', 'expense',   45000, 'Dana',  'e-wallet', 'Makan siang di kantin kampus',     '2025-07-14'),
  ('txn-009', 'user-demo-001', 'cat-001', 'expense',   22000, 'Tunai', 'cash',     'Beli mie ayam',                    '2025-07-18'),
  ('txn-010', 'user-demo-001', 'cat-001', 'expense',   30000, 'GoPay', 'e-wallet', 'Pesan GoFood nasi goreng',         '2025-07-22'),
  ('txn-011', 'user-demo-001', 'cat-001', 'expense',   20000, 'Tunai', 'cash',     'Beli soto ayam',                   '2025-07-26'),

  -- Transport (cat-002)
  ('txn-012', 'user-demo-001', 'cat-002', 'expense',   15000, 'GoPay', 'e-wallet', 'Naik Gojek ke kampus',             '2025-07-02'),
  ('txn-013', 'user-demo-001', 'cat-002', 'expense',   12000, 'OVO',   'e-wallet', 'Grab ke stasiun',                  '2025-07-07'),
  ('txn-014', 'user-demo-001', 'cat-002', 'expense',    5000, 'Tunai', 'cash',     'Naik angkot ke pasar',             '2025-07-12'),
  ('txn-015', 'user-demo-001', 'cat-002', 'expense',   20000, 'GoPay', 'e-wallet', 'Gojek pulang dari mall',           '2025-07-19'),

  -- Belanja (cat-003)
  ('txn-016', 'user-demo-001', 'cat-003', 'expense',  150000, 'BCA',   'transfer', 'Beli baju di Uniqlo',              '2025-07-06'),
  ('txn-017', 'user-demo-001', 'cat-003', 'expense',   75000, 'Dana',  'e-wallet', 'Beli skincare di Indomaret',       '2025-07-13'),
  ('txn-018', 'user-demo-001', 'cat-003', 'expense',   50000, 'OVO',   'e-wallet', 'Beli alat tulis',                  '2025-07-20'),

  -- Pendidikan (cat-004)
  ('txn-019', 'user-demo-001', 'cat-004', 'expense',  120000, 'BCA',   'transfer', 'Beli buku kuliah semester baru',   '2025-07-04'),
  ('txn-020', 'user-demo-001', 'cat-004', 'expense',   50000, 'GoPay', 'e-wallet', 'Langganan Coursera satu bulan',    '2025-07-10'),

  -- Hiburan (cat-005)
  ('txn-021', 'user-demo-001', 'cat-005', 'expense',   55000, 'BCA',   'credit',   'Nonton bioskop CGV',               '2025-07-09'),
  ('txn-022', 'user-demo-001', 'cat-005', 'expense',   15000, 'GoPay', 'e-wallet', 'Beli top-up game Mobile Legends',  '2025-07-16'),
  ('txn-023', 'user-demo-001', 'cat-005', 'expense',   49000, 'BCA',   'transfer', 'Langganan Spotify Premium',        '2025-07-23'),

  -- Lain-lain (cat-006)
  ('txn-024', 'user-demo-001', 'cat-006', 'expense',   50000, 'Tunai', 'cash',     'Bayar iuran kos bulan Juli',       '2025-07-01'),
  ('txn-025', 'user-demo-001', 'cat-006', 'expense',   25000, 'Dana',  'e-wallet', 'Beli obat di apotek',              '2025-07-17');

-- ─────────────────────────────────────────────
-- Budgets  (July 2025 — 1 row per category)
-- ─────────────────────────────────────────────
INSERT IGNORE INTO budgets (user_id, category_id, monthly_limit, month) VALUES
  ('user-demo-001', 'cat-001', 800000,  '2025-07'),
  ('user-demo-001', 'cat-002', 300000,  '2025-07'),
  ('user-demo-001', 'cat-003', 500000,  '2025-07'),
  ('user-demo-001', 'cat-004', 200000,  '2025-07'),
  ('user-demo-001', 'cat-005', 300000,  '2025-07'),
  ('user-demo-001', 'cat-006', 200000,  '2025-07'),
  ('user-demo-001', 'cat-007', 5000000, '2025-07'),
  ('user-demo-001', 'cat-008', 1000000, '2025-07');
