'use strict'

const express = require('express')
const router = express.Router()
const categoryController = require('../controllers/categoryController')

// GET /api/categories — list all categories
router.get('/', categoryController.getAll)

module.exports = router
