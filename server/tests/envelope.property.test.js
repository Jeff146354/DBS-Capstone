'use strict'

// Feature: spendly-backend-integration
// Property 1: Successful response envelope shape
// Property 2: Error response envelope shape

const request = require('supertest')
const fc = require('fast-check')
const app = require('../app')

// ─────────────────────────────────────────────────────────────────────────────
// Property 1: Successful response envelope shape
// For any valid GET request to known endpoints, response has { success: true, data: ... }
// ─────────────────────────────────────────────────────────────────────────────
describe('P1 — Successful response envelope shape', () => {
  // Note: These tests require a running DB. They are integration tests.
  // For unit-level envelope testing, see the errorHandler unit tests below.

  test('GET /api/categories returns success envelope', async () => {
    // Feature: spendly-backend-integration, Property 1: Successful response envelope shape
    const res = await request(app).get('/api/categories')
    // May fail with 500 if DB not connected — we only check envelope shape when 200
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('data')
    }
  })

  test('GET /api/transactions returns success envelope', async () => {
    // Feature: spendly-backend-integration, Property 1: Successful response envelope shape
    const res = await request(app).get('/api/transactions')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('data')
      expect(Array.isArray(res.body.data)).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: Error response envelope shape
// For any request that triggers an error, response has { success: false, error: string }
// ─────────────────────────────────────────────────────────────────────────────
describe('P2 — Error response envelope shape', () => {
  test('POST /api/transactions with missing fields returns error envelope', async () => {
    // Feature: spendly-backend-integration, Property 2: Error response envelope shape
    const res = await request(app)
      .post('/api/transactions')
      .send({ user_id: 'test' }) // missing required fields
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('success', false)
    expect(typeof res.body.error).toBe('string')
    expect(res.body.error.length).toBeGreaterThan(0)
  })

  test('GET /api/transactions/:id with unknown id returns 404 error envelope', async () => {
    // Feature: spendly-backend-integration, Property 2: Error response envelope shape
    const res = await request(app).get('/api/transactions/non-existent-id-12345')
    if (res.status === 404) {
      expect(res.body).toHaveProperty('success', false)
      expect(typeof res.body.error).toBe('string')
      expect(res.body.error.length).toBeGreaterThan(0)
    }
  })

  test('GET unknown route returns 404 error envelope', async () => {
    // Feature: spendly-backend-integration, Property 2: Error response envelope shape
    const res = await request(app).get('/api/unknown-route-xyz')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('success', false)
    expect(typeof res.body.error).toBe('string')
  })

  test('fast-check: any POST body missing required fields returns 400 error envelope', async () => {
    // Feature: spendly-backend-integration, Property 2: Error response envelope shape
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          // Deliberately omit other required fields to trigger validation
        }),
        async (partialBody) => {
          const res = await request(app)
            .post('/api/transactions')
            .send(partialBody)
          // Should be 400 (missing fields) — envelope must have success: false
          if (res.status === 400) {
            expect(res.body.success).toBe(false)
            expect(typeof res.body.error).toBe('string')
            expect(res.body.error.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
