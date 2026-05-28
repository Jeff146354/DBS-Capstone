'use strict'

const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')

// POST /api/users/login — authenticate
router.post('/login', userController.login)

// POST /api/users — register
router.post('/', userController.create)

module.exports = router
