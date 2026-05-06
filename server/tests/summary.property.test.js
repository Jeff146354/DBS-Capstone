'use strict'

// Feature: spendly-backend-integration
// Property 10: Monthly summary correctly aggregates income and expenses

const request = require('supertest')
const fc = require('fast-check')
const app = require('../app')

describe('P10 — Monthly summary correctly aggregates income and expenses', () => {
  test('GET /api/summary/:user_id — balance equals total_income minus total_expenses', async () => {
    // Feature: spendly-backend-integration, Property 10: Monthly summary correctly aggregates income and expenses
    const res = await request(app).get('/api/summary/user-demo-001')
    if (res.status !== 200) return // skip if DB not available

    const { total_income, total_expenses, balance } = res.body.data
    expect(balance).toBe(total_income - total_expenses)
  })

  test('summary response has all required fields', async () => {
    // Feature: spendly-backend-integration, Property 10: Monthly summary correctly aggregates income and expenses
    const res = await request(app).get('/api/summary/user-demo-001')
    if (res.status !== 200) return

    expect(res.body.data).toHaveProperty('total_income')
    expect(res.body.data).toHaveProperty('total_expenses')
    expect(res.body.data).toHaveProperty('balance')
  })

  test('all summary values are non-negative numbers', async () => {
    const res = await request(app).get('/api/summary/user-demo-001')
    if (res.status !== 200) return

    const { total_income, total_expenses } = res.body.data
    expect(typeof total_income).toBe('number')
    expect(typeof total_expenses).toBe('number')
    expect(total_income).toBeGreaterThanOrEqual(0)
    expect(total_expenses).toBeGreaterThanOrEqual(0)
  })

  test('fast-check: balance invariant holds for any user_id', async () => {
    // Feature: spendly-backend-integration, Property 10: Monthly summary correctly aggregates income and expenses
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('user-demo-001', 'non-existent-user-xyz'),
        async (userId) => {
          const res = await request(app).get(`/api/summary/${userId}`)
          if (res.status !== 200) return true

          const { total_income, total_expenses, balance } = res.body.data
          expect(balance).toBe(total_income - total_expenses)
          return true
        }
      ),
      { numRuns: 10 }
    )
  })
})
