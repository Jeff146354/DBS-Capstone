'use strict'

const pool = require('../config/db')

/**
 * GET /api/summary/:user_id
 * Returns aggregated monthly totals for the current calendar month:
 * { total_income, total_expenses, balance }
 */
async function getMonthlySummary(req, res, next) {
  try {
    const { user_id } = req.params
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-based

    const [rows] = await pool.query(
      `SELECT type, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = ?
         AND YEAR(date) = ?
         AND MONTH(date) = ?
         AND type IN ('income', 'expense')
       GROUP BY type`,
      [user_id, year, month]
    )

    let total_income = 0
    let total_expenses = 0

    for (const row of rows) {
      if (row.type === 'income') total_income = Number(row.total)
      if (row.type === 'expense') total_expenses = Number(row.total)
    }

    const balance = total_income - total_expenses

    res.json({ success: true, data: { total_income, total_expenses, balance } })
  } catch (err) {
    next(err)
  }
}

module.exports = { getMonthlySummary }
