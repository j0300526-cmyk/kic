import {
  BarChart3,
  Bot,
  CircleGauge,
  FileText,
  GitCompareArrows,
  Globe2,
  Menu,
  SlidersVertical,
  Sparkles,
  X,
} from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import type { MarketSnapshot, ViewId } from '../types'
import { DataBadge } from './ui'

const navigation: Array<{ id: ViewId; label: string; sub: string; icon: typeof CircleGauge }> = [
  { id: 'overview', label: '종합 현황', sub: '시장·포트폴리오', icon: CircleGauge },
  { id: 'agents', label: 'Agent 분석', sub: '전문가별 근거', icon: Bot },
  { id: 'riskmap', label: '글로벌 리스크', sub: '분쟁·경제 뉴스', icon: Globe2 },
  { id: 'mixing', label: '믹싱 콘솔', sub: '영향력 조정', icon: SlidersVertical },
  { id: 'optimization', label: '포트폴리오 최적화', sub: 'TPA 최적화', icon: BarChart3 },
  { id: 'scenarios', label: '시나리오 비교', sub: '설정 비교', icon: GitCompareArrows },
  { id: 'report', label: '의사결정 보고서', sub: '근거와 한계', icon: FileText },
]

const fallbackMarketTape = [
  { id: 'sp500', symbol: '^GSPC', label: 'S&P 500', formatted_value: '—', formatted_change: '—', direction: 'flat' as const, market_time: '' },
  { id: 'us10y', symbol: '^TNX', label: '미국 10년물', formatted_value: '—', formatted_change: '—', direction: 'flat' as const, market_time: '' },
  { id: 'gold', symbol: 'GC=F', label: '금', formatted_value: '—', formatted_change: '—', direction: 'flat' as const, market_time: '' },
  { id: 'dxy', symbol: 'DX-Y.NYB', label: '달러 지수', formatted_value: '—', formatted_change: '—', direction: 'flat' as const, market_time: '' },
]

const MARKET_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Seoul',
})

interface ShellProps extends PropsWithChildren {
  view: ViewId
  onViewChange: (view: ViewId) => void
  serverOnline: boolean
  busy: boolean
  marketSnapshot: MarketSnapshot | null
}

export function Shell({ view, onViewChange, serverOnline, busy, marketSnapshot, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = navigation.find((item) => item.id === view) ?? navigation[0]
  const marketTape = marketSnapshot?.items ?? fallbackMarketTape
  const marketTime = marketSnapshot
    ? MARKET_TIME_FORMATTER.format(new Date(marketSnapshot.as_of))
    : null
  const marketStatus = marketSnapshot?.status === 'delayed'
    ? `${marketSnapshot.source_label} · 지연 시세 · ${marketTime}`
    : marketSnapshot?.status === 'stale'
      ? `${marketSnapshot.source_label} · 마지막 정상 시세 · ${marketTime}`
      : marketSnapshot?.status === 'fallback'
        ? `${marketSnapshot.source_label} · Yahoo 연결 실패`
        : '시장 데이터 불러오는 중'

  const nav = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <div className="grid h-9 w-9 place-items-center rounded bg-mint text-ink">
          <Sparkles size={19} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-base font-semibold tracking-[-.03em] text-white">AlphaMix</p>
          <p className="text-[8px] font-bold uppercase tracking-[.18em] text-muted">Institutional TPA</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 py-3" aria-label="주요 화면">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              className={`group flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition ${
                active ? 'border-mint bg-mint/[.07] text-white' : 'border-transparent text-muted hover:bg-white/[.025] hover:text-slate-200'
              }`}
              onClick={() => { onViewChange(item.id); setMobileOpen(false) }}
            >
              <span className={`grid h-8 w-8 place-items-center rounded ${active ? 'bg-mint/10 text-mint' : 'bg-white/[.025]'}`}>
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium">{item.label}</span>
                <span className="block text-[9px] text-slate-600">{item.sub}</span>
              </span>
            </button>
          )
        })}
      </nav>
      <div className="m-3 border border-line bg-ink/70 p-3">
        <p className="terminal-label">시스템 상태</p>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-muted">FastAPI</span>
          <span className={`inline-flex items-center gap-1.5 ${serverOnline ? 'text-positive' : 'text-amber'}`}>
            <span className={`status-dot ${serverOnline ? 'bg-positive' : 'bg-amber'}`} />{serverOnline ? '연결됨' : '미리보기'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-muted">최적화 엔진</span>
          <span className="font-mono text-slate-300">TPA v1</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-ink text-slate-300">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-panel lg:flex">{nav}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="flex h-full w-72 flex-col border-r border-line bg-panel" onClick={(event) => event.stopPropagation()}>
            <button aria-label="메뉴 닫기" className="absolute right-4 top-4 text-slate-400" onClick={() => setMobileOpen(false)}><X size={20} /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-panel px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <button aria-label="메뉴 열기" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-muted">포트폴리오 작업공간</p>
              <h1 className="text-base font-semibold text-white">{current.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {busy && <span className="hidden items-center gap-2 text-xs text-mint sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />재최적화 중</span>}
            <DataBadge mode="mock" online={serverOnline} />
            <div className="hidden border-l border-line pl-4 text-right sm:block">
              <p className="text-[11px] font-medium text-white">KIC AI Agent 공모전</p>
              <p className="text-[9px] text-muted">기준일 2026.10.31</p>
            </div>
          </div>
        </header>
        <div className="flex h-9 items-center gap-5 overflow-x-auto border-b border-line bg-ink px-4 sm:px-5" aria-label="시장 현황">
          {marketTape.map((item) => (
            <div key={item.id} className="flex shrink-0 items-center gap-2 text-[10px]" title={`${item.symbol} · ${item.market_time || '연결 대기'}`}>
              <span className="text-muted">{item.label}</span>
              <span className="font-mono font-semibold text-slate-200">{item.formatted_value}</span>
              <span className={`font-mono ${item.direction === 'positive' ? 'text-positive' : item.direction === 'negative' ? 'text-negative' : 'text-muted'}`}>{item.formatted_change}</span>
            </div>
          ))}
          <span className={`ml-auto hidden shrink-0 text-[9px] xl:block ${marketSnapshot?.status === 'delayed' ? 'text-cyan' : marketSnapshot?.status === 'stale' || marketSnapshot?.status === 'fallback' ? 'text-amber' : 'text-muted'}`} title={marketSnapshot?.notice}>{marketStatus}</span>
        </div>
        <main className="mx-auto max-w-[1720px] p-3 sm:p-4">{children}</main>
      </div>
    </div>
  )
}
