'use strict'

// Feature: spendly-backend-integration
// Unit tests for transaction controller (mock pool)

// Mock the pool before requiring the controller
jest.mock('../config/db', () => ({
  query: jest.fn(),
}))

const pool = require('../config/db')
const { getAll, getById } = require('../controllers/transactionController')

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const SAMPLE_TRANSACTION = {
  id: 'test-uuid-1',
  user_id: 'user-demo-001',
  type: 'expense',
  amount: 25000,
  category: 'Makan',
  category_icon: '🍽️',
  account: 'GoPay',
  payment_method: 'e-wallet',
  note: 'Test',
  date: '2025-07-15',
  created_at: '2025-07-15T10:00:00.000Z',
}

describe('transactionController.getAll', () => {
  afterEach(() => jest.clearAllMocks())

  test('returns all transactions ordered by date DESC', async () => {
    pool.query.mockResolvedValueOnce([[SAMPLE_TRANSACTION]])
    const req = { query: {} }
    const res = mockRes()
    await getAll(req, res, jest.fn())
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [SAMPLE_TRANSACTION] })
  })

  test('filters by month when ?month=YYYY-MM is provided', async () => {
    pool.query.mockResolvedValueOnce([[SAMPLE_TRANSACTION]])
    const req = { query: { month: '2025-07' } }
    const res = mockRes()
    const next = jest.fn()
    await getAll(req, res, next)
    // Verify query was called with year and month params
    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toMatch(/YEAR.*MONTH/i)
    expect(params).toContain(2025)
    expect(params).toContain(7)
  })

  test('calls next(err) on DB error', async () => {
    const dbError = new Error('DB connection failed')
    pool.query.mockRejectedValueOnce(dbError)
    const req = { query: {} }
    const res = mockRes()
    const next = jest.fn()
    await getAll(req, res, next)
    expect(next).toHaveBeenCalledWith(dbError)
  })
})

describe('transactionController.getById', () => {
  afterEach(() => jest.clearAllMocks())

  test('returns 404 when transaction not found', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const req = { params: { id: 'non-existent' } }
    const res = mockRes()
    const next = jest.fn()
    await getById(req, res, next)
    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.status).toBe(404)
    expect(err.message).toBe('Transaction not found')
  })

  test('returns transaction when found', async () => {
    pool.query.mockResolvedValueOnce([[SAMPLE_TRANSACTION]])
    const req = { params: { id: 'test-uuid-1' } }
    const res = mockRes()
    await getById(req, res, jest.fn())
    expect(res.json).toHaveBeenCalledWith({ success: true, data: SAMPLE_TRANSACTION })
  })
})
