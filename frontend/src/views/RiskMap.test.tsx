import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RiskEventFeed } from '../types'
import { RiskMapView } from './RiskMap'

const feed: RiskEventFeed = {
  provider: 'gdelt',
  status: 'live',
  source_label: 'GDELT DOC 2.0',
  source_url: 'https://www.gdeltproject.org/',
  as_of: '2026-11-01T12:00:00Z',
  fetched_at: '2026-11-01T12:01:00Z',
  cached: false,
  cache_ttl_seconds: 900,
  window: '24h',
  warnings: ['자동 분류 결과입니다.'],
  events: [{
    id: 'event-1',
    event_type: 'conflict',
    severity: 5,
    title: 'Missile attack raises risk in Ukraine',
    summary: '분쟁 관련 글로벌 보도입니다.',
    url: 'https://example.com/ukraine',
    publisher: 'example.com',
    published_at: '2026-11-01T12:00:00Z',
    source_country: 'United States',
    location_name: '우크라이나',
    latitude: 50.4501,
    longitude: 30.5234,
    location_confidence: 0.88,
    keywords: ['missile', 'attack'],
    agent_impacts: { macro: 0.35, valuation: 0.1, flow: 0.3, risk: 0.78, liquidity: 0.45, geopolitical: 0.95 },
    asset_impacts: { us_equity: -0.6, us_treasury: 0.32, gold: 0.78, cash: 0.4 },
    rationale: '위험회피 수요에 영향을 줄 수 있습니다.',
    data_mode: 'live',
  }],
}

describe('RiskMapView', () => {
  it('renders a mapped event and forwards it to the mixing action', () => {
    const onApplyEvent = vi.fn()
    render(<RiskMapView feed={feed} onApplyEvent={onApplyEvent} />)

    expect(screen.getAllByText('Missile attack raises risk in Ukraine')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /우크라이나: Missile attack/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /이 이벤트로 믹스 조정/ }))
    expect(onApplyEvent).toHaveBeenCalledWith(feed.events[0])
  })
})
