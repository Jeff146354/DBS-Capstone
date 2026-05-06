'use strict'

const express = require('express')
const router = express.Router()
const summaryController = require('../controllers/summaryController')

// GET /api/summary/:user_id — monthly totals for a user
router.get('/:user_id', summaryController.getMonthlySummary)

module.exports = router
