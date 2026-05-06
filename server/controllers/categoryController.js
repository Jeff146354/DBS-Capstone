'use strict'

const pool = require('../config/db')

/**
 * GET /api/categories
 * Returns all categories from the database.
 */
async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, icon, type, color FROM categories ORDER BY name'
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll }
