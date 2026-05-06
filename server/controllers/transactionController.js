'use strict'

const { v4: uuidv4 } = require('uuid')
const pool = require('../config/db')

// SQL fragment to SELECT a transaction with its category name and icon
const SELECT_TRANSACTION = `
  SELECT
    t.id,
    t.user_id,
    t.type,
    t.amount,
    c.name        AS category,
    c.icon        AS category_icon,
    t.account,
    t.payment_method,
    t.note,
    DATE_FORMAT(t.date, '%Y-%m-%d') AS date,
    t.created_at
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
`

/**
 * GET /api/transactions
 * Optional query param: ?month=YYYY-MM
 */
async function getAll(req, res, next) {
  try {
    let sql = SELECT_TRANSACTION
    const params = []

    if (req.query.month) {
      const [year, month] = req.query.month.split('-').map(Number)
      sql += ' WHERE YEAR(t.date) = ? AND MONTH(t.date) = ?'
      params.push(year, month)
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC'

    const [rows] = await pool.query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/transactions/:id
 */
async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(
      SELECT_TRANSACTION + ' WHERE t.id = ?',
      [req.params.id]
    )
    if (rows.length === 0) {
      const err = new Error('Transaction not found')
      err.status = 404
      return next(err)
    }
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/transactions
 */
async function create(req, res, next) {
  try {
    const { user_id, type, amount, category, account, payment_method, note, date } = req.body

    // Resolve category_id from category name
    const [catRows] = await pool.query(
      'SELECT id FROM categories WHERE name = ?',
      [category]
    )
    if (catRows.length === 0) {
      const err = new Error(`Category not found: ${category}`)
      err.status = 400
      return next(err)
    }
    const category_id = catRows[0].id

    const id = uuidv4()

    await pool.query(
      `INSERT INTO transactions (id, user_id, category_id, type, amount, account, payment_method, note, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, category_id, type, Number(amount), account, payment_method, note || null, date]
    )

    const [rows] = await pool.query(
      SELECT_TRANSACTION + ' WHERE t.id = ?',
      [id]
    )

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/transactions/:id
 */
async function update(req, res, next) {
  try {
    const { id } = req.params
    const { type, amount, category, account, payment_method, note, date } = req.body

    // Check exists
    const [existing] = await pool.query('SELECT id FROM transactions WHERE id = ?', [id])
    if (existing.length === 0) {
      const err = new Error('Transaction not found')
      err.status = 404
      return next(err)
    }

    // Resolve category_id if category name provided
    let category_id
    if (category) {
      const [catRows] = await pool.query('SELECT id FROM categories WHERE name = ?', [category])
      if (catRows.length === 0) {
        const err = new Error(`Category not found: ${category}`)
        err.status = 400
        return next(err)
      }
      category_id = catRows[0].id
    }

    await pool.query(
      `UPDATE transactions SET
        type           = COALESCE(?, type),
        amount         = COALESCE(?, amount),
        category_id    = COALESCE(?, category_id),
        account        = COALESCE(?, account),
        payment_method = COALESCE(?, payment_method),
        note           = COALESCE(?, note),
        date           = COALESCE(?, date)
       WHERE id = ?`,
      [type || null, amount ? Number(amount) : null, category_id || null, account || null, payment_method || null, note || null, date || null, id]
    )

    const [rows] = await pool.query(SELECT_TRANSACTION + ' WHERE t.id = ?', [id])
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/transactions/:id
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params
    const [existing] = await pool.query('SELECT id FROM transactions WHERE id = ?', [id])
    if (existing.length === 0) {
      const err = new Error('Transaction not found')
      err.status = 404
      return next(err)
    }
    await pool.query('DELETE FROM transactions WHERE id = ?', [id])
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getById, create, update, remove }
