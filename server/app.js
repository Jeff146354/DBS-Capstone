'use strict'

const express = require('express')
const cors = require('cors')

const transactionRoutes = require('./routes/transactions')
const categoryRoutes = require('./routes/categories')
const summaryRoutes = require('./routes/summary')
const userRoutes = require('./routes/users')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/transactions', transactionRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/summary', summaryRoutes)
app.use('/api/users', userRoutes)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler)

module.exports = app
