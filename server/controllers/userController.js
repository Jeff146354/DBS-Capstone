'use strict'

const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const pool = require('../config/db')

const SALT_ROUNDS = 12

/** POST /api/users/login — authenticate with email + password */
async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email dan password wajib diisi.' })
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, monthly_income FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email atau password salah.' })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Email atau password salah.' })
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthly_income: user.monthly_income,
      },
    })
  } catch (err) {
    next(err)
  }
}

/** POST /api/users — register a new user */
async function create(req, res, next) {
  try {
    const { name, email, password, monthly_income } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nama, email, dan password wajib diisi.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' })
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
    const id = uuidv4()

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, monthly_income) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), email.trim().toLowerCase(), password_hash, Number(monthly_income) || 0]
    )

    const [rows] = await pool.query(
      'SELECT id, name, email, monthly_income FROM users WHERE id = ?',
      [id]
    )
    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email sudah terdaftar.' })
    }
    next(err)
  }
}

module.exports = { login, create }
