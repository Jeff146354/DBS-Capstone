/**
 * Feature: spendly-backend-integration
 * Property 14: addTransaction sends the correct payload
 * Property 15: getMonthlySummary constructs the correct URL for any userId
 */

import fc from 'fast-check'
import { addTransaction, getMonthlySummary } from '../api'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

const SUCCESS_RESPONSE = (data: unknown) => ({
  ok: true,
  json: async () => ({ success: true, data }),
})

beforeEach(() => {
  mockFetch.mockReset()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property 14: addTransaction sends the correct payload
// ─────────────────────────────────────────────────────────────────────────────
describe('P14 — addTransaction sends the correct payload', () => {
  test('fast-check: addTransaction POSTs to the correct URL with JSON body', async () => {
    // Feature: spendly-backend-integration, Property 14: addTransaction sends the correct payload
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom('expense' as const, 'income' as const, 'transfer' as const),
          amount: fc.integer({ min: 5000, max: 3500000 }),
          category: fc.constantFrom('Makan', 'Transport', 'Belanja', 'Gaji', 'Freelance'),
          account: fc.constantFrom('BCA', 'GoPay', 'OVO'),
          payment_method: fc.constantFrom('cash' as const, 'transfer' as const, 'e-wallet' as const, 'credit' as const),
          date: fc.constant('2025-07-30'),
        }),
        async (payload) => {
          mockFetch.mockResolvedValueOnce(SUCCESS_RESPONSE(payload))

          await addTransaction(payload)

          expect(mockFetch).toHaveBeenCalledTimes(1)
          const [url, options] = mockFetch.mock.calls[0]

          // Must POST to the correct URL
          expect(url).toBe('http://localhost:3001/api/transactions')
          expect(options.method).toBe('POST')

          // Must have Content-Type: application/json
          expect(options.headers['Content-Type']).toBe('application/json')

          // Body must be the JSON serialisation of the payload
          expect(JSON.parse(options.body)).toEqual(payload)

          mockFetch.mockReset()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Property 15: getMonthlySummary constructs the correct URL for any userId
// ─────────────────────────────────────────────────────────────────────────────
describe('P15 — getMonthlySummary constructs the correct URL for any userId', () => {
  test('fast-check: getMonthlySummary GETs the correct URL for any non-empty userId', async () => {
    // Feature: spendly-backend-integration, Property 15: getMonthlySummary constructs the correct URL for any userId
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('/')),
        async (userId) => {
          mockFetch.mockResolvedValueOnce(
            SUCCESS_RESPONSE({ total_income: 0, total_expenses: 0, balance: 0 })
          )

          await getMonthlySummary(userId)

          expect(mockFetch).toHaveBeenCalledTimes(1)
          const [url] = mockFetch.mock.calls[0]

          // URL must be exactly http://localhost:3001/api/summary/${userId}
          expect(url).toBe(`http://localhost:3001/api/summary/${userId}`)

          mockFetch.mockReset()
        }
      ),
      { numRuns: 100 }
    )
  })
})
