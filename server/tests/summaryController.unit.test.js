'use strict'

// Feature: spendly-backend-integration
// Unit test: empty-month summary returns zeros

jest.mock('../config/db', () => ({
  query: jest.fn(),
}))

const pool = require('../config/db')
const { getMonthlySummary } = require('../controllers/summaryController')

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('summaryController.getMonthlySummary', () => {
  afterEach(() => jest.clearAllMocks())

  test('returns zeros when no transactions exist for the user in the current month', async () => {
    // Feature: spendly-backend-integration, Property 10: Monthly summary correctly aggregates income and expenses
    pool.query.mockResolvedValueOnce([[]])
    const req = { params: { user_id: 'user-no-transactions' } }
    const res = mockRes()
    await getMonthlySummary(req, res, jest.fn())
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { total_income: 0, total_expenses: 0, balance: 0 },
    })
  })

  test('correctly aggregates income and expense rows', async () => {
    pool.query.mockResolvedValueOnce([
      [
        { type: 'income', total: '3500000' },
        { type: 'expense', total: '1200000' },
      ],
    ])
    const req = { params: { user_id: 'user-demo-001' } }
    const res = mockRes()
    await getMonthlySummary(req, res, jest.fn())
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { total_income: 3500000, total_expenses: 1200000, balance: 2300000 },
    })
  })

  test('balance equals total_income minus total_expenses', async () => {
    pool.query.mockResolvedValueOnce([
      [
        { type: 'income', total: '5000000' },
        { type: 'expense', total: '4500000' },
      ],
    ])
    const req = { params: { user_id: 'user-demo-001' } }
    const res = mockRes()
    await getMonthlySummary(req, res, jest.fn())
    const { data } = res.json.mock.calls[0][0]
    expect(data.balance).toBe(data.total_income - data.total_expenses)
  })

  test('calls next(err) on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'))
    const req = { params: { user_id: 'user-demo-001' } }
    const res = mockRes()
    const next = jest.fn()
    await getMonthlySummary(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
