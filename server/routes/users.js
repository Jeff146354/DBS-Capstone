'use strict'

const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')

// GET /api/users?name=... — find by name (login)
router.get('/', userController.getByName)

// POST /api/users — register
router.post('/', userController.create)

module.exports = router
