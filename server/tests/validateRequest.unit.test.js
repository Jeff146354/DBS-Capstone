'use strict'

// Feature: spendly-backend-integration
// Unit tests for validateTransaction middleware

const { validateTransaction } = require('../middleware/validateRequest')

const VALID_BODY = {
  user_id: 'user-demo-001',
  type: 'expense',
  amount: 25000,
  category: 'Makan',
  account: 'GoPay',
  payment_method: 'e-wallet',
  date: '2025-07-30',
}

function makeReq(body) {
  return { body }
}

describe('validateTransaction middleware', () => {
  const REQUIRED_FIELDS = ['user_id', 'type', 'amount', 'category', 'account', 'payment_method', 'date']

  REQUIRED_FIELDS.forEach((field) => {
    test(`calls next(400) when ${field} is missing`, () => {
      const body = { ...VALID_BODY }
      delete body[field]
      const next = jest.fn()
      validateTransaction(makeReq(body), {}, next)
      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err.status).toBe(400)
      expect(err.message).toMatch(field)
    })
  })

  test('calls next() with no error for a valid body', () => {
    const next = jest.fn()
    validateTransaction(makeReq(VALID_BODY), {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  test('calls next(400) for invalid type', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, type: 'invalid' }), {}, next)
    const err = next.mock.calls[0][0]
    expect(err.status).toBe(400)
  })

  test('calls next(400) for invalid payment_method', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, payment_method: 'crypto' }), {}, next)
    const err = next.mock.calls[0][0]
    expect(err.status).toBe(400)
  })

  test('calls next(400) for zero amount', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, amount: 0 }), {}, next)
    const err = next.mock.calls[0][0]
    expect(err.status).toBe(400)
  })

  test('calls next(400) for negative amount', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, amount: -500 }), {}, next)
    const err = next.mock.calls[0][0]
    expect(err.status).toBe(400)
  })

  test('accepts income type', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, type: 'income' }), {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  test('accepts transfer type', () => {
    const next = jest.fn()
    validateTransaction(makeReq({ ...VALID_BODY, type: 'transfer' }), {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  test('accepts all valid payment methods', () => {
    const methods = ['cash', 'transfer', 'e-wallet', 'credit']
    methods.forEach((method) => {
      const next = jest.fn()
      validateTransaction(makeReq({ ...VALID_BODY, payment_method: method }), {}, next)
      expect(next).toHaveBeenCalledWith()
    })
  })
})
