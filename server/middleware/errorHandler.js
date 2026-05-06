'use strict'

/**
 * Centralised Express error handler.
 * All controllers forward errors here via next(err).
 * Responds with: { success: false, error: <message> }
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ success: false, error: message })
}
