'use strict'

const REQUIRED_TRANSACTION_FIELDS = [
  'user_id',
  'type',
  'amount',
  'category',
  'account',
  'payment_method',
  'date',
]

/**
 * Validates that a transaction request body contains all required fields.
 * Used as middleware on POST /api/transactions and PUT /api/transactions/:id.
 */
function validateTransaction(req, res, next) {
  const missing = REQUIRED_TRANSACTION_FIELDS.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
  )

  if (missing.length > 0) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`)
    err.status = 400
    return next(err)
  }

  // Validate type enum
  const validTypes = ['expense', 'income', 'transfer']
  if (!validTypes.includes(req.body.type)) {
    const err = new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`)
    err.status = 400
    return next(err)
  }

  // Validate payment_method enum
  const validMethods = ['cash', 'transfer', 'e-wallet', 'credit']
  if (!validMethods.includes(req.body.payment_method)) {
    const err = new Error(`Invalid payment_method. Must be one of: ${validMethods.join(', ')}`)
    err.status = 400
    return next(err)
  }

  // Validate amount is a positive integer
  const amount = Number(req.body.amount)
  if (!Number.isInteger(amount) || amount <= 0) {
    const err = new Error('amount must be a positive integer')
    err.status = 400
    return next(err)
  }

  next()
}

module.exports = { validateTransaction }
