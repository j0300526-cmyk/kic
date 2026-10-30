import type { PropsWithChildren, ReactNode } from 'react'

export function Panel({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail?: string; tone?: 'neutral' | 'positive' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'text-mint' : tone === 'warning' ? 'text-amber' : 'text-white'
  return (
    <Panel className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[.15em] text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {detail && <p className="mt-2 truncate text-xs text-slate-500">{detail}</p>}
    </Panel>
  )
}

export function DataBadge({ mode, online = true }: { mode: 'mock' | 'llm'; online?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.15em] ${
      mode === 'mock' ? 'border-amber/25 bg-amber/10 text-amber' : 'border-mint/25 bg-mint/10 text-mint'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-current' : 'bg-slate-500'}`} />
      {mode === 'mock' ? 'Mock data' : 'Live LLM'}
    </span>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink/30 px-6 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  )
}
