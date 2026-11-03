import { describe, expect, it } from 'vitest'
import type { MarketReplay } from '../types'
import { buildReplayRows } from './Replay'

const replay: MarketReplay = {
  provider: 'yahoo_finance',
  status: 'historical',
  source_label: 'Yahoo Finance',
  source_url: 'https://finance.yahoo.com/',
  as_of: '2026-10-31',
  fetched_at: '2026-11-03T00:00:00Z',
  cached: false,
  cache_ttl_seconds: 1800,
  range: '1y',
  interval: '1d',
  proxy_symbols: { us_equity: 'SPY', us_treasury: 'IEF', gold: 'GLD', cash: 'BIL' },
  warnings: [],
  notice: '테스트',
  points: [
    { date: '2026-10-30', prices: { us_equity: 100, us_treasury: 100, gold: 100, cash: 100 }, normalized: { us_equity: 100, us_treasury: 100, gold: 100, cash: 100 } },
    { date: '2026-10-31', prices: { us_equity: 110, us_treasury: 98, gold: 104, cash: 100.1 }, normalized: { us_equity: 110, us_treasury: 98, gold: 104, cash: 100.1 } },
  ],
}

describe('historical replay calculations', () => {
  it('applies fixed TPA weights without future look-ahead', () => {
    const rows = buildReplayRows(replay, { us_equity: 0.5, us_treasury: 0.2, gold: 0.2, cash: 0.1 })

    expect(rows).toHaveLength(2)
    expect(rows[0].portfolio).toBe(100)
    expect(rows[1].portfolio).toBeCloseTo(105.41, 10)
    expect(rows[1].benchmark).toBeCloseTo(103.025, 10)
  })
})
