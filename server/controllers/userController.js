'use strict'

const { v4: uuidv4 } = require('uuid')
const pool = require('../config/db')

/** GET /api/users?name=... — find user by name (case-insensitive) */
async function getByName(req, res, next) {
  try {
    const { name } = req.query
    if (!name) {
      return res.status(400).json({ success: false, error: 'name query param required' })
    }
    const [rows] = await pool.query(
      'SELECT id, name, email, monthly_income, created_at FROM users WHERE LOWER(name) = LOWER(?)',
      [name]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    next(err)
  }
}

/** POST /api/users — register a new user */
async function create(req, res, next) {
  try {
    const { name, email, monthly_income } = req.body
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'name and email are required' })
    }
    const id = uuidv4()
    await pool.query(
      'INSERT INTO users (id, name, email, monthly_income) VALUES (?, ?, ?, ?)',
      [id, name, email, Number(monthly_income) || 0]
    )
    const [rows] = await pool.query(
      'SELECT id, name, email, monthly_income, created_at FROM users WHERE id = ?',
      [id]
    )
    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    // Duplicate email
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email sudah terdaftar.' })
    }
    next(err)
  }
}

module.exports = { getByName, create }
