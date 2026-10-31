import type { PropsWithChildren, ReactNode } from 'react'

export function Panel({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail?: string; tone?: 'neutral' | 'positive' | 'warning' }) {
  const toneClass = tone === 'positive' ? 'text-positive' : tone === 'warning' ? 'text-amber' : 'text-white'
  return (
    <Panel className="min-w-0 !p-3.5">
      <p className="terminal-label">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold tracking-tight tabular-nums ${toneClass}`}>{value}</p>
      {detail && <p className="mt-1.5 truncate text-[10px] text-muted">{detail}</p>}
    </Panel>
  )
}

export function DataBadge({ mode, online = true }: { mode: 'mock' | 'llm'; online?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${
      mode === 'mock' ? 'border-amber/25 bg-amber/10 text-amber' : 'border-positive/25 bg-positive/10 text-positive'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-current' : 'bg-slate-500'}`} />
      {mode === 'mock' ? '모의 데이터' : '실시간 LLM'}
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
