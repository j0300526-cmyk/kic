import { AlertTriangle, Clock3, ExternalLink, Globe2, MapPin, Radio, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { WorldRiskMap } from '../components/WorldRiskMap'
import { Metric, Panel } from '../components/ui'
import { AGENT_META, ASSET_LABELS } from '../data/mock'
import type { AgentId, AssetId, RiskEvent, RiskEventFeed, RiskEventType } from '../types'

interface RiskMapViewProps {
  feed: RiskEventFeed | null
  onApplyEvent: (event: RiskEvent) => void
}

const EVENT_META: Record<RiskEventType, { label: string; color: string }> = {
  conflict: { label: '분쟁', color: '#F6465D' },
  policy: { label: '정책', color: '#F0B90B' },
  trade: { label: '무역', color: '#F97316' },
  macro: { label: '거시경제', color: '#2EBDFF' },
}

const FILTERS: Array<{ id: 'all' | RiskEventType; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'conflict', label: '분쟁' },
  { id: 'policy', label: '정책' },
  { id: 'trade', label: '무역' },
  { id: 'macro', label: '거시경제' },
]

const AGENT_LABELS = Object.fromEntries(AGENT_META.map((agent) => [agent.id, agent.shortName])) as Record<AgentId, string>
const ASSETS = Object.keys(ASSET_LABELS) as AssetId[]
const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Seoul',
})

function eventTime(value: string) {
  return DATE_FORMATTER.format(new Date(value))
}

export function RiskMapView({ feed, onApplyEvent }: RiskMapViewProps) {
  const [filter, setFilter] = useState<'all' | RiskEventType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const events = feed?.events ?? []
  const filteredEvents = filter === 'all' ? events : events.filter((event) => event.event_type === filter)
  const selected = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null
  const mappedCount = events.filter((event) => event.latitude !== null && event.longitude !== null).length
  const severeCount = events.filter((event) => event.severity >= 4).length
  const statusClass = feed?.status === 'live' ? 'text-positive' : feed?.status === 'stale' ? 'text-amber' : 'text-negative'
  const statusLabel = feed?.status === 'live' ? 'LIVE' : feed?.status === 'stale' ? 'STALE' : feed ? 'MOCK FALLBACK' : 'LOADING'

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">글로벌 이벤트 인텔리전스</p>
          <h2 className="page-title">글로벌 리스크 지도</h2>
          <p className="page-description">분쟁·정책·경제 뉴스를 지도에 연결하고 Agent 및 자산별 잠재 영향을 함께 검토합니다.</p>
        </div>
        <div className="flex items-center gap-3 border border-line bg-panel px-3 py-2 text-[10px]">
          <span className={`inline-flex items-center gap-1.5 font-mono ${statusClass}`}><Radio size={11} /> {statusLabel}</span>
          <span className="text-muted">{feed?.source_label ?? '이벤트 불러오는 중'}</span>
          {feed && <span className="text-slate-600">{eventTime(feed.as_of)}</span>}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="수집 이벤트" value={`${events.length}`} detail="최근 24시간" />
        <Metric label="고위험 이벤트" value={`${severeCount}`} detail="심각도 4 이상" tone={severeCount > 0 ? 'warning' : 'neutral'} />
        <Metric label="지도 식별" value={`${mappedCount}`} detail="제목 기반 보수적 위치 추정" tone="positive" />
        <Metric label="데이터 상태" value={feed?.status === 'live' ? '실데이터' : feed ? '모의' : '대기'} detail={feed?.provider ?? '연결 중'} tone={feed?.status === 'live' ? 'positive' : 'warning'} />
      </div>

      {feed?.warnings.map((warning) => (
        <div key={warning} className={`flex items-start gap-2 border px-3 py-2 text-[10px] ${feed.status === 'fallback' ? 'border-negative/25 bg-negative/[.05] text-red-200' : 'border-amber/20 bg-amber/[.04] text-amber/80'}`}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {warning}
        </div>
      ))}

      <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1.55fr)_390px]">
        <Panel className="overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="terminal-label">지리적 노출</p>
              <h3 className="mt-0.5 text-sm font-semibold text-white">글로벌 이벤트 위치</h3>
            </div>
            <div className="flex flex-wrap gap-1" aria-label="이벤트 종류 필터">
              {FILTERS.map((item) => (
                <button key={item.id} type="button" aria-pressed={filter === item.id} className={`rounded border px-2.5 py-1.5 text-[9px] transition ${filter === item.id ? 'border-mint/40 bg-mint/10 text-mint' : 'border-line bg-surface text-muted hover:text-white'}`} onClick={() => setFilter(item.id)}>{item.label}</button>
              ))}
            </div>
          </div>
          {feed ? (
            <WorldRiskMap events={filteredEvents} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          ) : (
            <div className="grid aspect-[2.08/1] place-items-center bg-ink text-xs text-muted"><Globe2 className="mb-2 animate-pulse text-cyan" size={28} />글로벌 이벤트를 불러오는 중…</div>
          )}
        </Panel>

        <Panel className="!p-0">
          {selected ? (
            <>
              <div className="border-b border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded px-2 py-1 text-[9px] font-semibold" style={{ color: EVENT_META[selected.event_type].color, backgroundColor: `${EVENT_META[selected.event_type].color}18` }}>{EVENT_META[selected.event_type].label}</span>
                  <span className="font-mono text-[10px] text-muted">위험도 {selected.severity}/5</span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-6 text-white">{selected.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[9px] text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin size={10} /> {selected.location_name ?? '위치 미상'}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 size={10} /> {eventTime(selected.published_at)}</span>
                  <span>{selected.publisher}</span>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <p className="text-[11px] leading-5 text-slate-300">{selected.summary}</p>
                <div>
                  <p className="terminal-label">Agent 영향 민감도</p>
                  <div className="mt-2 space-y-2">
                    {(Object.entries(selected.agent_impacts) as Array<[AgentId, number]>).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([agent, impact]) => (
                      <div key={agent}>
                        <div className="mb-1 flex justify-between text-[9px]"><span className="text-muted">{AGENT_LABELS[agent]}</span><span className="font-mono text-white">{Math.round(impact * 100)}%</span></div>
                        <div className="h-1 bg-ink"><div className="h-full bg-cyan" style={{ width: `${impact * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="terminal-label">잠재 자산 영향</p>
                  <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line">
                    {ASSETS.map((asset) => {
                      const impact = selected.asset_impacts[asset]
                      return <div key={asset} className="flex items-center justify-between bg-surface px-2.5 py-2 text-[9px]"><span className="text-muted">{ASSET_LABELS[asset]}</span><span className={`font-mono ${impact > 0 ? 'text-positive' : impact < 0 ? 'text-negative' : 'text-muted'}`}>{impact > 0 ? '+' : ''}{impact.toFixed(2)}</span></div>
                    })}
                  </div>
                </div>
                <div className="flex gap-2 border border-mint/20 bg-mint/[.04] p-3 text-[10px] leading-5 text-muted"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-mint" />{selected.rationale}</div>
                <button type="button" className="btn-primary w-full justify-center" onClick={() => onApplyEvent(selected)}><SlidersHorizontal size={13} /> 이 이벤트로 믹스 조정</button>
                {selected.url && <a className="btn-secondary w-full justify-center" href={selected.url} target="_blank" rel="noreferrer">원문 확인 <ExternalLink size={12} /></a>}
              </div>
            </>
          ) : (
            <div className="grid min-h-80 place-items-center p-6 text-center"><div><Globe2 className="mx-auto text-muted" size={24} /><p className="mt-3 text-sm text-white">표시할 이벤트가 없습니다</p><p className="mt-1 text-xs text-muted">필터를 변경하거나 데이터 갱신을 기다려 주세요.</p></div></div>
          )}
        </Panel>
      </div>

      <Panel className="!p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div><p className="terminal-label">이벤트 스트림</p><h3 className="mt-0.5 text-sm font-semibold text-white">최신 분쟁·경제 뉴스</h3></div>
          <span className="text-[9px] text-muted">원문 제목·링크만 제공 · 자동 분류</span>
        </div>
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.slice(0, 9).map((event) => (
            <button key={event.id} type="button" aria-pressed={selected?.id === event.id} className={`bg-panel p-4 text-left transition hover:bg-surface ${selected?.id === event.id ? 'shadow-[inset_2px_0_0_#F0B90B]' : ''}`} onClick={() => setSelectedId(event.id)}>
              <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-semibold" style={{ color: EVENT_META[event.event_type].color }}>{EVENT_META[event.event_type].label}</span><span className="font-mono text-[9px] text-muted">RISK {event.severity}/5</span></div>
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-200">{event.title}</p>
              <div className="mt-3 flex items-center justify-between text-[9px] text-slate-600"><span className="truncate">{event.location_name ?? event.source_country ?? '위치 미상'}</span><span className={event.data_mode === 'live' ? 'text-positive' : 'text-amber'}>{event.data_mode === 'live' ? 'LIVE' : 'MOCK'}</span></div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}
