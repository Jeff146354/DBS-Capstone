/**
 * Feature: spendly-backend-integration
 * Unit tests for remaining API service functions
 */

import {
  getTransactions,
  getCategories,
  getPrediction,
} from '../api'

const mockFetch = jest.fn()
global.fetch = mockFetch

const SUCCESS_RESPONSE = (data: unknown) => ({
  ok: true,
  json: async () => ({ success: true, data }),
})

const ERROR_RESPONSE = (error: string) => ({
  ok: false,
  json: async () => ({ success: false, error }),
})

beforeEach(() => {
  mockFetch.mockReset()
})

// ─────────────────────────────────────────────────────────────────────────────
// getTransactions
// ─────────────────────────────────────────────────────────────────────────────
describe('getTransactions', () => {
  test('calls GET /api/transactions without month param', async () => {
    mockFetch.mockResolvedValueOnce(SUCCESS_RESPONSE([]))
    await getTransactions()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3001/api/transactions')
  })

  test('appends ?month=YYYY-MM when month is provided', async () => {
    mockFetch.mockResolvedValueOnce(SUCCESS_RESPONSE([]))
    await getTransactions('2025-07')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3001/api/transactions?month=2025-07')
  })

  test('throws when success is false', async () => {
    mockFetch.mockResolvedValueOnce(ERROR_RESPONSE('DB error'))
    await expect(getTransactions()).rejects.toThrow('DB error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCategories
// ─────────────────────────────────────────────────────────────────────────────
describe('getCategories', () => {
  test('calls GET /api/categories', async () => {
    mockFetch.mockResolvedValueOnce(SUCCESS_RESPONSE([]))
    await getCategories()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3001/api/categories')
  })

  test('throws when success is false', async () => {
    mockFetch.mockResolvedValueOnce(ERROR_RESPONSE('Not found'))
    await expect(getCategories()).rejects.toThrow('Not found')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getPrediction
// ─────────────────────────────────────────────────────────────────────────────
describe('getPrediction', () => {
  test('calls POST /predict/status on the ML API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'AMAN', confidence: 0.9, reason: 'test' }),
    })
    await getPrediction('user-demo-001', 1000000, 5000000)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/predict/status')
    expect(options.method).toBe('POST')
  })

  test('sends correct body to ML API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'HATI-HATI', confidence: 0.75, reason: 'test' }),
    })
    await getPrediction('user-demo-001', 3500000, 5000000)
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body).toEqual({
      user_id: 'user-demo-001',
      current_spending: 3500000,
      monthly_income: 5000000,
    })
  })
})
