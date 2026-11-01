import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MarketSnapshot } from '../types'
import { Shell } from './Shell'

const snapshot: MarketSnapshot = {
  provider: 'yahoo_finance',
  status: 'delayed',
  source_label: 'Yahoo Finance',
  source_url: 'https://finance.yahoo.com/',
  as_of: '2026-10-31T20:00:00Z',
  fetched_at: '2026-10-31T20:00:01Z',
  cached: false,
  cache_ttl_seconds: 60,
  notice: '지연 시세',
  items: [{
    id: 'sp500',
    symbol: '^GSPC',
    label: 'S&P 500',
    value: 7580.07,
    formatted_value: '7,580.07',
    change: -140.32,
    change_percent: -1.82,
    formatted_change: '-1.82%',
    direction: 'negative',
    currency: 'USD',
    market_time: '2026-10-31T20:00:00Z',
    source_url: 'https://finance.yahoo.com/quote/%5EGSPC/',
  }],
}

describe('Shell market tape', () => {
  it('renders Yahoo delayed quote data instead of the static sample notice', () => {
    render(
      <Shell view="overview" onViewChange={vi.fn()} serverOnline busy={false} marketSnapshot={snapshot}>
        <div>대시보드</div>
      </Shell>,
    )

    expect(screen.getByText('7,580.07')).toBeInTheDocument()
    expect(screen.getByText('-1.82%')).toBeInTheDocument()
    expect(screen.getByText(/Yahoo Finance · 지연 시세/)).toBeInTheDocument()
    expect(screen.queryByText('샘플 시장 데이터 · 실시간 시세 아님')).not.toBeInTheDocument()
  })
})
