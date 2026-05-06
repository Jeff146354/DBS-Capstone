'use strict'

// Feature: spendly-backend-integration
// Unit tests for errorHandler middleware

const errorHandler = require('../middleware/errorHandler')

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('errorHandler middleware', () => {
  test('uses err.status when provided', () => {
    const err = new Error('Not found')
    err.status = 404
    const res = mockRes()
    errorHandler(err, {}, res, () => {})
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Not found' })
  })

  test('falls back to 500 when no status on error', () => {
    const err = new Error('Something broke')
    const res = mockRes()
    errorHandler(err, {}, res, () => {})
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Something broke' })
  })

  test('uses statusCode as fallback when status is absent', () => {
    const err = new Error('Conflict')
    err.statusCode = 409
    const res = mockRes()
    errorHandler(err, {}, res, () => {})
    expect(res.status).toHaveBeenCalledWith(409)
  })

  test('uses default message when err.message is empty', () => {
    const err = new Error('')
    const res = mockRes()
    errorHandler(err, {}, res, () => {})
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' })
  })

  test('response always has success: false', () => {
    const err = new Error('Any error')
    err.status = 422
    const res = mockRes()
    errorHandler(err, {}, res, () => {})
    const call = res.json.mock.calls[0][0]
    expect(call.success).toBe(false)
    expect(typeof call.error).toBe('string')
  })
})
