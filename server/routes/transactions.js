'use strict'

const express = require('express')
const router = express.Router()
const transactionController = require('../controllers/transactionController')
const { validateTransaction } = require('../middleware/validateRequest')

// GET /api/transactions — list all (optional ?month=YYYY-MM)
router.get('/', transactionController.getAll)

// GET /api/transactions/:id — single transaction
router.get('/:id', transactionController.getById)

// POST /api/transactions — create new transaction
router.post('/', validateTransaction, transactionController.create)

// PUT /api/transactions/:id — update transaction
router.put('/:id', validateTransaction, transactionController.update)

// DELETE /api/transactions/:id — delete transaction
router.delete('/:id', transactionController.remove)

module.exports = router
