'use strict'

// Feature: spendly-backend-integration
// Property 7: Missing required fields returns HTTP 400

const request = require('supertest')
const fc = require('fast-check')
const app = require('../app')

const REQUIRED_FIELDS = ['user_id', 'type', 'amount', 'category', 'account', 'payment_method', 'date']

const VALID_TRANSACTION = {
  user_id: 'user-demo-001',
  type: 'expense',
  amount: 25000,
  category: 'Makan',
  account: 'GoPay',
  payment_method: 'e-wallet',
  date: '2025-07-30',
}

describe('P7 — Missing required fields returns HTTP 400', () => {
  test('fast-check: omitting any single required field returns 400 error envelope', async () => {
    // Feature: spendly-backend-integration, Property 7: Missing required fields returns HTTP 400
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...REQUIRED_FIELDS),
        async (fieldToOmit) => {
          const body = { ...VALID_TRANSACTION }
          delete body[fieldToOmit]

          const res = await request(app)
            .post('/api/transactions')
            .send(body)

          expect(res.status).toBe(400)
          expect(res.body.success).toBe(false)
          expect(typeof res.body.error).toBe('string')
          expect(res.body.error.length).toBeGreaterThan(0)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('fast-check: omitting multiple required fields returns 400 error envelope', async () => {
    // Feature: spendly-backend-integration, Property 7: Missing required fields returns HTTP 400
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        async (fieldsToOmit) => {
          const body = { ...VALID_TRANSACTION }
          for (const field of fieldsToOmit) {
            delete body[field]
          }

          const res = await request(app)
            .post('/api/transactions')
            .send(body)

          expect(res.status).toBe(400)
          expect(res.body.success).toBe(false)
          expect(typeof res.body.error).toBe('string')
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('empty body returns 400', async () => {
    // Feature: spendly-backend-integration, Property 7: Missing required fields returns HTTP 400
    const res = await request(app)
      .post('/api/transactions')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/Missing required fields/)
  })

  test('invalid type enum returns 400', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ ...VALID_TRANSACTION, type: 'invalid-type' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('invalid payment_method enum returns 400', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ ...VALID_TRANSACTION, payment_method: 'bitcoin' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('non-positive amount returns 400', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ ...VALID_TRANSACTION, amount: -100 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('zero amount returns 400', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ ...VALID_TRANSACTION, amount: 0 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
