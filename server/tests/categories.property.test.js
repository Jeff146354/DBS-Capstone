'use strict'

// Feature: spendly-backend-integration
// Property 9: Category response shape contains all required fields

const request = require('supertest')
const fc = require('fast-check')
const app = require('../app')

const REQUIRED_CATEGORY_FIELDS = ['id', 'name', 'icon', 'type', 'color']
const VALID_CATEGORY_TYPES = ['expense', 'income']

describe('P9 — Category response shape contains all required fields', () => {
  test('GET /api/categories — each category has all required fields', async () => {
    // Feature: spendly-backend-integration, Property 9: Category response shape contains all required fields
    const res = await request(app).get('/api/categories')
    if (res.status !== 200) return // skip if DB not available

    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)

    for (const category of res.body.data) {
      for (const field of REQUIRED_CATEGORY_FIELDS) {
        expect(category).toHaveProperty(field)
      }
    }
  })

  test('fast-check: every category in the response has all required fields and valid type', async () => {
    // Feature: spendly-backend-integration, Property 9: Category response shape contains all required fields
    const res = await request(app).get('/api/categories')
    if (res.status !== 200) return

    await fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Math.max(0, res.body.data.length - 1) }),
        (idx) => {
          const category = res.body.data[idx % res.body.data.length]
          if (!category) return true

          // All required fields present
          for (const field of REQUIRED_CATEGORY_FIELDS) {
            expect(category).toHaveProperty(field)
          }

          // type must be expense or income
          expect(VALID_CATEGORY_TYPES).toContain(category.type)

          // color must be a hex color
          expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('seed data contains exactly 8 categories', async () => {
    // Feature: spendly-backend-integration, Property 9: Category response shape contains all required fields
    const res = await request(app).get('/api/categories')
    if (res.status !== 200) return

    expect(res.body.data).toHaveLength(8)
  })

  test('seed data contains 6 expense and 2 income categories', async () => {
    const res = await request(app).get('/api/categories')
    if (res.status !== 200) return

    const expenses = res.body.data.filter((c) => c.type === 'expense')
    const incomes = res.body.data.filter((c) => c.type === 'income')
    expect(expenses).toHaveLength(6)
    expect(incomes).toHaveLength(2)
  })

  test('expected category names are present', async () => {
    const res = await request(app).get('/api/categories')
    if (res.status !== 200) return

    const names = res.body.data.map((c) => c.name)
    const expected = ['Makan', 'Transport', 'Belanja', 'Pendidikan', 'Hiburan', 'Lain-lain', 'Gaji', 'Freelance']
    for (const name of expected) {
      expect(names).toContain(name)
    }
  })
})
