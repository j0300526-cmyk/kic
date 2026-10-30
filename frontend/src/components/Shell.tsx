import {
  BarChart3,
  Bot,
  CircleGauge,
  FileText,
  GitCompareArrows,
  Menu,
  SlidersVertical,
  Sparkles,
  X,
} from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import type { ViewId } from '../types'
import { DataBadge } from './ui'

const navigation: Array<{ id: ViewId; label: string; sub: string; icon: typeof CircleGauge }> = [
  { id: 'overview', label: '종합 현황', sub: '시장·포트폴리오', icon: CircleGauge },
  { id: 'agents', label: 'Agent 분석', sub: '전문가별 근거', icon: Bot },
  { id: 'mixing', label: '믹싱 콘솔', sub: '영향력 조정', icon: SlidersVertical },
  { id: 'optimization', label: '포트폴리오 최적화', sub: 'TPA 최적화', icon: BarChart3 },
  { id: 'scenarios', label: '시나리오 비교', sub: '설정 비교', icon: GitCompareArrows },
  { id: 'report', label: '의사결정 보고서', sub: '근거와 한계', icon: FileText },
]

interface ShellProps extends PropsWithChildren {
  view: ViewId
  onViewChange: (view: ViewId) => void
  serverOnline: boolean
  busy: boolean
}

export function Shell({ view, onViewChange, serverOnline, busy, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = navigation.find((item) => item.id === view) ?? navigation[0]

  const nav = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-line px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-mint to-cyan text-ink shadow-[0_0_30px_rgba(100,245,194,.15)]">
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-[-.03em] text-white">AlphaMix</p>
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-slate-500">TPA 의사결정 운영체계</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="주요 화면">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                active ? 'bg-mint/[.08] text-white' : 'text-slate-500 hover:bg-white/[.03] hover:text-slate-300'
              }`}
              onClick={() => { onViewChange(item.id); setMobileOpen(false) }}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-lg border ${active ? 'border-mint/20 bg-mint/10 text-mint' : 'border-transparent bg-white/[.025]'}`}>
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[10px] text-slate-600">{item.sub}</span>
              </span>
            </button>
          )
        })}
      </nav>
      <div className="m-4 rounded-xl border border-line bg-ink/60 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">시스템</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-400">FastAPI</span>
          <span className={serverOnline ? 'text-mint' : 'text-amber'}>{serverOnline ? '연결됨' : '미리보기'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">최적화 엔진</span>
          <span className="text-slate-300">TPA v1</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-ink text-slate-300">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-[#091421] lg:flex">{nav}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="flex h-full w-72 flex-col border-r border-line bg-[#091421]" onClick={(event) => event.stopPropagation()}>
            <button aria-label="메뉴 닫기" className="absolute right-4 top-4 text-slate-400" onClick={() => setMobileOpen(false)}><X size={20} /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button aria-label="메뉴 열기" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">포트폴리오 작업공간</p>
              <h1 className="text-lg font-semibold text-white">{current.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {busy && <span className="hidden items-center gap-2 text-xs text-cyan sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />재최적화 중</span>}
            <DataBadge mode="mock" online={serverOnline} />
            <div className="hidden border-l border-line pl-4 text-right sm:block">
              <p className="text-xs font-medium text-white">KIC AI Agent 공모전</p>
              <p className="text-[10px] text-slate-600">기준일 2026.10.31</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-7">{children}</main>
      </div>
    </div>
  )
}
