import { ArrowUpRight, CircleCheck, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { AGENT_META, ASSET_LABELS } from '../data/mock'
import type { AnalysisRun, AssetId, OptimizationResult } from '../types'
import { PortfolioChart } from '../components/PortfolioChart'
import { DataBadge, Metric, Panel, SectionTitle } from '../components/ui'

const ASSETS = Object.keys(ASSET_LABELS) as AssetId[]

export function Overview({ result, analysis, baseline, onOpenMixing }: { result: OptimizationResult; analysis: AnalysisRun; baseline: OptimizationResult | null; onOpenMixing: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <DataBadge mode={analysis.mode} />
            <span className="text-[10px] text-muted">기준 시점 {analysis.data_as_of.slice(0, 10)}</span>
            <span className="text-[10px] text-muted">Run {analysis.analysis_run_id}</span>
          </div>
          <p className="eyebrow">통합 포트폴리오 인텔리전스</p>
          <h2 className="page-title">운용 의사결정 현황</h2>
          <p className="page-description">6개 Agent의 합의와 독립된 필수 위험 제약을 하나의 TPA 화면에서 검토합니다.</p>
        </div>
        <button onClick={onOpenMixing} className="btn-primary self-start sm:self-auto"><SlidersHorizontal size={14} /> 믹싱 조정 <ArrowUpRight size={14} /></button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="기대 수익률" value={`${(result.expected_return * 100).toFixed(2)}%`} detail="연율 · Agent 조정 반영" tone="positive" />
        <Metric label="예상 변동성" value={`${(result.volatility * 100).toFixed(2)}%`} detail="필수 위험 한도 적용" />
        <Metric label="샤프 지수" value={result.sharpe_ratio.toFixed(2)} detail="현금 수익률 기준" tone="positive" />
        <Metric label="Critic 검증" value={analysis.critic.approved ? '통과' : '검토 필요'} detail={`${analysis.critic.checked_agent_ids.length}개 Agent 근거 검토`} tone={analysis.critic.approved ? 'positive' : 'warning'} />
      </div>

      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.7fr)]">
        <Panel>
          <SectionTitle eyebrow="현재 자산배분" title="TPA 포트폴리오" action={<span className="text-[10px] text-muted">회색: 기준 · 컬러: 현재</span>} />
          <PortfolioChart current={result} baseline={baseline} compact />
        </Panel>

        <Panel className="!p-0">
          <div className="border-b border-line px-4 py-3">
            <p className="terminal-label">현재 Agent 믹스</p>
            <h3 className="mt-0.5 text-sm font-semibold text-white">정규화 반영률</h3>
          </div>
          <div className="divide-y divide-line">
            {AGENT_META.map((agent) => {
              const value = (result.normalized_agent_weights[agent.id] ?? 0) * 100
              return (
                <div key={agent.id} className="px-4 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-2 text-slate-300"><span className="h-1.5 w-1.5" style={{ backgroundColor: agent.color }} />{agent.shortName}</span>
                    <span className="font-mono text-white">{value.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 overflow-hidden bg-surface"><div className="h-full" style={{ width: `${value}%`, backgroundColor: agent.color }} /></div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3 text-[10px]">
            <span className="text-muted">활성 신호 합계</span>
            <span className="inline-flex items-center gap-1 font-mono text-positive"><CircleCheck size={11} /> 100.0%</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.55fr]">
        <Panel>
          <SectionTitle eyebrow="합의 신호" title="자산별 통합 점수" />
          <div className="space-y-3">
            {ASSETS.map((asset) => {
              const score = result.mixed_scores[asset]
              return (
                <div key={asset}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="text-slate-300">{ASSET_LABELS[asset]}</span><span className={`font-mono ${score >= 0 ? 'text-positive' : 'text-negative'}`}>{score >= 0 ? '+' : ''}{score.toFixed(2)}</span></div>
                  <div className="relative h-1.5 overflow-hidden bg-surface"><div className={`absolute top-0 h-full ${score >= 0 ? 'left-1/2 bg-positive' : 'right-1/2 bg-negative'}`} style={{ width: `${Math.abs(score) * 50}%` }} /><div className="absolute left-1/2 top-0 h-full w-px bg-muted" /></div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="통제 상태" title="필수 제약 및 검증" action={<span className="inline-flex items-center gap-1 text-[10px] text-positive"><ShieldCheck size={12} /> 정상</span>} />
          <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
            {[
              ['위험 한도', 'Agent 영향력과 독립', 'LOCKED'],
              ['비중 합계', '완전 투자 조건', '100.0%'],
              ['재현 가능성', result.model_version, 'VERIFIED'],
            ].map(([title, detail, status]) => (
              <div key={title} className="bg-surface p-3">
                <p className="text-[10px] font-medium text-slate-200">{title}</p>
                <p className="mt-1 text-[9px] text-muted">{detail}</p>
                <p className="mt-3 font-mono text-[10px] text-positive">{status}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 border border-mint/20 bg-mint/[.04] p-3 text-[10px] leading-5 text-muted">
            <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={15} />
            <p>Risk Agent 영향력을 0으로 낮춰도 자산 상한, 최소 현금, 유동성 제약은 해제되지 않습니다.</p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
