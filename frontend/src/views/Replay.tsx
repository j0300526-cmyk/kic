import {
  AlertTriangle,
  CalendarClock,
  Database,
  History,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Metric, Panel } from '../components/ui'
import { ASSET_LABELS } from '../data/mock'
import { api } from '../lib/api'
import type { AssetId, MarketReplay, OptimizationResult, ReplayRange } from '../types'

interface ReplayViewProps {
  result: OptimizationResult
}

interface ReplayChartRow {
  date: string
  portfolio: number
  benchmark: number
  drawdown: number
  us_equity: number
  us_treasury: number
  gold: number
  cash: number
}

const ASSETS = Object.keys(ASSET_LABELS) as AssetId[]
const ASSET_COLORS: Record<AssetId, string> = {
  us_equity: '#F0B90B',
  us_treasury: '#2EBDFF',
  gold: '#A78BFA',
  cash: '#0ECB81',
}
const RANGE_OPTIONS: Array<{ id: ReplayRange; label: string }> = [
  { id: '6mo', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: '3y', label: '3년' },
]
const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

export function buildReplayRows(
  replay: MarketReplay,
  weights: Record<AssetId, number>,
): ReplayChartRow[] {
  let runningPeak = 100
  return replay.points.map((point) => {
    const portfolio = ASSETS.reduce((sum, asset) => sum + weights[asset] * point.normalized[asset], 0)
    const benchmark = ASSETS.reduce((sum, asset) => sum + point.normalized[asset] / ASSETS.length, 0)
    runningPeak = Math.max(runningPeak, portfolio)
    return {
      date: point.date,
      portfolio,
      benchmark,
      drawdown: (portfolio / runningPeak - 1) * 100,
      ...point.normalized,
    }
  })
}

function signedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function ReplayView({ result }: ReplayViewProps) {
  const [range, setRange] = useState<ReplayRange>('1y')
  const [replay, setReplay] = useState<MarketReplay | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<'portfolio' | 'assets'>('portfolio')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const weights = result.portfolio_weights
  const rows = useMemo(() => replay ? buildReplayRows(replay, weights) : [], [replay, weights])
  const lastIndex = Math.max(0, rows.length - 1)
  const selected = rows[Math.min(selectedIndex, lastIndex)]
  const visibleRows = rows.slice(0, Math.min(selectedIndex, lastIndex) + 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setPlaying(false)
    api.getMarketReplay(range)
      .then((data) => {
        if (!active) return
        setReplay(data)
        setSelectedIndex(data.points.length - 1)
      })
      .catch(() => { if (active) setError('역사 가격을 불러오지 못했습니다. FastAPI 연결을 확인해 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [range])

  useEffect(() => {
    if (!playing || rows.length === 0) return undefined
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= lastIndex) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 120)
    return () => window.clearInterval(timer)
  }, [lastIndex, playing, rows.length])

  const startReplay = () => {
    if (selectedIndex >= lastIndex) setSelectedIndex(0)
    setPlaying(true)
  }
  const maxDrawdown = visibleRows.length ? Math.min(...visibleRows.map((row) => row.drawdown)) : 0
  const portfolioReturn = selected ? selected.portfolio - 100 : 0
  const selectedPoint = replay?.points[Math.min(selectedIndex, replay.points.length - 1)]
  const contributions = selectedPoint
    ? ASSETS.map((asset) => ({
        asset,
        contribution: weights[asset] * (selectedPoint.normalized[asset] - 100),
        returnValue: selectedPoint.normalized[asset] - 100,
      })).sort((a, b) => b.contribution - a.contribution)
    : []
  const statusLabel = replay?.status === 'historical' ? 'HISTORICAL' : replay?.status === 'stale' ? 'STALE' : replay ? 'MOCK FALLBACK' : 'LOADING'
  const statusClass = replay?.status === 'historical' ? 'text-positive' : replay?.status === 'stale' ? 'text-amber' : 'text-negative'

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Point-in-time simulation</p>
          <h2 className="page-title">역사적 포트폴리오 리플레이</h2>
          <p className="page-description">과거 가격을 시간순으로 재생해 현재 TPA 비중의 성과, 낙폭, 자산별 기여도를 검토합니다.</p>
        </div>
        <div className="flex items-center gap-3 border border-line bg-panel px-3 py-2 text-[10px]">
          <History size={12} className={statusClass} /><span className={`font-mono ${statusClass}`}>{statusLabel}</span><span className="text-muted">{replay?.source_label ?? '데이터 연결 중'}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="누적 성과" value={signedPercent(portfolioReturn)} detail={selected ? DATE_FORMATTER.format(new Date(`${selected.date}T00:00:00Z`)) : '계산 대기'} tone={portfolioReturn >= 0 ? 'positive' : 'warning'} />
        <Metric label="최대 낙폭" value={`${maxDrawdown.toFixed(2)}%`} detail="선택 시점까지" tone={maxDrawdown < -8 ? 'warning' : 'neutral'} />
        <Metric label="관측치" value={`${visibleRows.length}/${rows.length}`} detail={`${range} · 일별 조정 종가`} />
        <Metric label="최대 기여 자산" value={contributions[0] ? ASSET_LABELS[contributions[0].asset] : '—'} detail={contributions[0] ? `${contributions[0].contribution >= 0 ? '+' : ''}${contributions[0].contribution.toFixed(2)}%p` : '계산 대기'} tone="positive" />
      </div>

      {(error || replay?.warnings[0]) && (
        <div role={error ? 'alert' : undefined} className={`flex items-start gap-2 border px-3 py-2 text-[10px] ${error || replay?.status === 'fallback' ? 'border-negative/25 bg-negative/[.05] text-red-200' : 'border-amber/20 bg-amber/[.04] text-amber/80'}`}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error ?? replay?.warnings[0]}
        </div>
      )}

      <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <Panel className="overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div><p className="terminal-label">Replay chart</p><h3 className="mt-0.5 text-sm font-semibold text-white">{mode === 'portfolio' ? 'TPA 포트폴리오 vs 동일비중' : '자산별 정규화 지수'}</h3></div>
            <div className="flex flex-wrap gap-1">
              <button type="button" aria-pressed={mode === 'portfolio'} className={`rounded border px-2.5 py-1.5 text-[9px] ${mode === 'portfolio' ? 'border-mint/40 bg-mint/10 text-mint' : 'border-line bg-surface text-muted'}`} onClick={() => setMode('portfolio')}>포트폴리오</button>
              <button type="button" aria-pressed={mode === 'assets'} className={`rounded border px-2.5 py-1.5 text-[9px] ${mode === 'assets' ? 'border-mint/40 bg-mint/10 text-mint' : 'border-line bg-surface text-muted'}`} onClick={() => setMode('assets')}>자산별</button>
              {RANGE_OPTIONS.map((option) => <button key={option.id} type="button" aria-pressed={range === option.id} className={`rounded border px-2.5 py-1.5 text-[9px] ${range === option.id ? 'border-amber/40 bg-amber/10 text-amber' : 'border-line bg-surface text-muted'}`} onClick={() => setRange(option.id)}>{option.label}</button>)}
            </div>
          </div>
          <div className="h-[430px] bg-ink p-3">
            {loading ? (
              <div className="grid h-full place-items-center text-xs text-muted"><div><RefreshCcw className="mx-auto mb-2 animate-spin text-cyan" size={24} />역사 가격 정렬 중…</div></div>
            ) : rows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleRows} margin={{ top: 18, right: 14, left: -5, bottom: 2 }}>
                  <CartesianGrid stroke="#20262E" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" minTickGap={48} tick={{ fill: '#697386', fontSize: 9 }} tickFormatter={(value) => String(value).slice(2, 7)} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#697386', fontSize: 9 }} tickFormatter={(value) => Number(value).toFixed(0)} />
                  <Tooltip contentStyle={{ background: '#181A20', border: '1px solid #2B3139', borderRadius: 4, fontSize: 10 }} labelStyle={{ color: '#EAECEF' }} formatter={(value) => [Number(value).toFixed(2), '']} />
                  {mode === 'portfolio' ? (
                    <>
                      <Line type="monotone" dataKey="portfolio" name="현재 TPA" stroke="#F0B90B" strokeWidth={2.4} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="benchmark" name="동일비중" stroke="#697386" strokeWidth={1.4} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    </>
                  ) : ASSETS.map((asset) => <Line key={asset} type="monotone" dataKey={asset} name={ASSET_LABELS[asset]} stroke={ASSET_COLORS[asset]} strokeWidth={1.7} dot={false} isAnimationActive={false} />)}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center text-xs text-muted">표시할 역사 가격이 없습니다.</div>}
          </div>
          <div className="border-t border-line bg-surface p-4">
            <input className="w-full accent-[#F0B90B]" type="range" min="0" max={lastIndex} value={Math.min(selectedIndex, lastIndex)} disabled={rows.length === 0} aria-label="역사적 리플레이 시점" onChange={(event) => { setPlaying(false); setSelectedIndex(Number(event.target.value)) }} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button type="button" className="btn-primary" disabled={!rows.length} onClick={playing ? () => setPlaying(false) : startReplay}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? '일시정지' : '처음부터 재생'}</button>
                <button type="button" className="btn-secondary" disabled={!rows.length} onClick={() => { setPlaying(false); setSelectedIndex(0) }}><RotateCcw size={13} /> 시작점</button>
              </div>
              <span className="font-mono text-[10px] text-slate-300">{selected?.date ?? '—'} · INDEX {Math.min(selectedIndex, lastIndex) + 1}/{rows.length || 0}</span>
            </div>
          </div>
        </Panel>

        <aside className="space-y-3 2xl:sticky 2xl:top-28" aria-label="리플레이 시점 상세">
          <Panel className="!p-0">
            <div className="border-b border-line p-4"><p className="terminal-label">Point-in-time snapshot</p><h3 className="mt-0.5 text-sm font-semibold text-white">시점별 자산 기여도</h3></div>
            <div className="space-y-4 p-4">
              {contributions.map((item) => (
                <div key={item.asset}>
                  <div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="text-slate-300">{ASSET_LABELS[item.asset]} <small className="ml-1 text-muted">{replay?.proxy_symbols[item.asset]}</small></span><span className={`font-mono ${item.contribution >= 0 ? 'text-positive' : 'text-negative'}`}>{item.contribution >= 0 ? '+' : ''}{item.contribution.toFixed(2)}%p</span></div>
                  <div className="flex items-center justify-between text-[9px] text-muted"><span>비중 {(weights[item.asset] * 100).toFixed(1)}%</span><span>자산수익 {signedPercent(item.returnValue)}</span></div>
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-surface px-4 py-3 text-[10px] leading-5 text-muted">{replay?.notice ?? '역사 가격을 불러오는 중입니다.'}</div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2"><Database size={14} className="text-cyan" /><h3 className="text-xs font-semibold text-white">리플레이 아키텍처</h3></div>
            <div className="mt-4 space-y-3 text-[10px]">
              {[
                ['01', '가격 스냅샷', 'Yahoo 조정 종가 수집·캐시'],
                ['02', '시점 정렬', '4개 자산 공통 거래일 정렬'],
                ['03', '리플레이 엔진', '현재 TPA 비중으로 가치 재계산'],
                ['04', '감사 화면', '성과·낙폭·기여도 동시 기록'],
              ].map(([step, title, detail]) => <div key={step} className="flex gap-3"><span className="font-mono text-amber">{step}</span><div><p className="text-slate-200">{title}</p><p className="mt-0.5 text-muted">{detail}</p></div></div>)}
            </div>
            <div className="mt-4 flex gap-2 border border-positive/20 bg-positive/[.04] p-3 text-[9px] leading-5 text-muted"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-positive" />미래 데이터 참조 없이 선택 시점까지의 값만 화면에 노출합니다.</div>
          </Panel>

          <div className="flex items-start gap-2 border border-line bg-panel p-3 text-[9px] leading-5 text-muted"><CalendarClock size={13} className="mt-0.5 shrink-0 text-amber" />현재 TPA 비중을 과거 전 구간에 고정 적용한 시뮬레이션입니다. 실제 과거 Agent 판단이나 운용 실적이 아닙니다.</div>
        </aside>
      </div>
    </div>
  )
}
