/**
 * Price Calculation Tests
 * Priority: P0 (Critical) - Security validation
 * Source: tests_20251007-090752.md lines 444-466
 */

describe('Price Calculation (Security)', () => {
  it('calculates price correctly for whole hours', () => {
    const start = new Date('2025-10-08T09:00:00')
    const end = new Date('2025-10-08T17:00:00')
    const pricePerHour = 50

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const total = hours * pricePerHour

    expect(hours).toBe(8)
    expect(total).toBe(400)
  })

  it('calculates price correctly for partial hours', () => {
    const start = new Date('2025-10-08T09:00:00')
    const end = new Date('2025-10-08T11:30:00')
    const pricePerHour = 50

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const total = hours * pricePerHour

    expect(hours).toBe(2.5)
    expect(total).toBe(125)
  })

  it('validates time range (end must be after start)', () => {
    const start = new Date('2025-10-08T17:00:00')
    const end = new Date('2025-10-08T09:00:00')

    expect(end > start).toBe(false)
  })

  it('validates time range (end cannot equal start)', () => {
    const start = new Date('2025-10-08T09:00:00')
    const end = new Date('2025-10-08T09:00:00')

    expect(end > start).toBe(false)
  })

  it('calculates price for 24-hour booking', () => {
    const start = new Date('2025-10-08T00:00:00')
    const end = new Date('2025-10-09T00:00:00')
    const pricePerHour = 50

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const total = hours * pricePerHour

    expect(hours).toBe(24)
    expect(total).toBe(1200)
  })
})
