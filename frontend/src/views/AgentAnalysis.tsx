import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { ASSET_LABELS, AGENT_META } from '../data/mock'
import type { AnalysisRun, AssetId } from '../types'
import { DataBadge, Panel, SectionTitle } from '../components/ui'

export function AgentAnalysisView({ analysis }: { analysis: AnalysisRun }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">분석 근거 검토</p><h2 className="page-title">Agent별 분석과 근거</h2><p className="page-description">점수만이 아니라 출처, 신뢰도, 불확실성을 함께 검토합니다.</p></div>
        <DataBadge mode={analysis.mode} />
      </div>
      <Panel className={analysis.critic.approved ? 'border-positive/20' : 'border-amber/30'}>
        <div className="flex items-start gap-4">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded ${analysis.critic.approved ? 'bg-positive/10 text-positive' : 'bg-amber/10 text-amber'}`}>{analysis.critic.approved ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</div>
          <div className="min-w-0"><p className="text-sm font-medium text-white">Critic Agent · {analysis.critic.approved ? '근거 검증 통과' : '추가 검토 필요'}</p><p className="mt-1 text-xs leading-5 text-muted">6개 분석의 출처, 기준 시점, 점수 범위와 한계 공개 여부를 확인했습니다. Critic은 믹싱 가중치에 포함되지 않습니다.</p></div>
          <span className="ml-auto hidden rounded border border-line px-3 py-1 text-[9px] font-bold text-slate-400 sm:block">믹싱 제외</span>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        {analysis.analyses.map((item) => {
          const meta = AGENT_META.find((agent) => agent.id === item.agent_id)!
          return (
            <Panel key={item.agent_id} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />
              <SectionTitle eyebrow={meta.description} title={item.agent_name} action={<span className="font-mono text-xs text-mint">신뢰도 {Math.round(item.confidence * 100)}%</span>} />
              <div className="mb-5 grid grid-cols-4 gap-2">
                {(Object.keys(item.scores) as AssetId[]).map((asset) => (
                  <div key={asset} className="rounded border border-line bg-surface p-2 text-center"><p className="truncate text-[9px] text-muted">{ASSET_LABELS[asset]}</p><p className={`mt-1 font-mono text-sm font-semibold ${item.scores[asset] >= 0 ? 'text-positive' : 'text-negative'}`}>{item.scores[asset] >= 0 ? '+' : ''}{item.scores[asset].toFixed(2)}</p></div>
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-300">{item.rationale}</p>
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">분석 근거</p>
                {item.sources.length > 0 ? item.sources.map((source) => (
                  <div key={`${source.title}-${source.as_of}`} className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-400">{source.publisher} · {source.title}</span>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.title} 출처 열기`}><ExternalLink size={13} /></a> : <span className="shrink-0 text-slate-600">{source.as_of}</span>}</div>
                )) : <p className="mt-2 text-xs text-amber">출처 없음 — Critic 경고 대상</p>}
              </div>
              <div className="mt-4 rounded-lg bg-amber/[.05] px-3 py-2 text-[11px] leading-5 text-amber/80">한계 · {item.uncertainties.join(' ')}</div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
