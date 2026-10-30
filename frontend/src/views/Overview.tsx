import { ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { ASSET_LABELS } from '../data/mock'
import type { AnalysisRun, AssetId, OptimizationResult } from '../types'
import { PortfolioChart } from '../components/PortfolioChart'
import { DataBadge, Metric, Panel, SectionTitle } from '../components/ui'

export function Overview({ result, analysis, baseline, onOpenMixing }: { result: OptimizationResult; analysis: AnalysisRun; baseline: OptimizationResult | null; onOpenMixing: () => void }) {
  const scoreRows = (Object.keys(ASSET_LABELS) as AssetId[]).map((asset) => ({ asset, score: result.mixed_scores[asset] }))
  return (
    <div className="space-y-5">
      <section className="hero-panel overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3"><DataBadge mode={analysis.mode} /><span className="text-xs text-slate-500">AS OF {analysis.data_as_of.slice(0, 10)}</span></div>
          <p className="eyebrow">Total Portfolio Intelligence</p>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-.04em] text-white sm:text-4xl">
            여섯 관점을 하나의<br /><span className="text-gradient">투자 판단으로 믹싱합니다.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">전문 Agent의 신호와 필수 위험 제약을 분리해, 투명하고 재현 가능한 TPA 포트폴리오를 설계합니다.</p>
          <button onClick={onOpenMixing} className="btn-primary mt-6">Mixing Console 열기 <ArrowUpRight size={15} /></button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="기대 수익률" value={`${(result.expected_return * 100).toFixed(2)}%`} detail="연율 · Agent 조정 반영" tone="positive" />
        <Metric label="예상 변동성" value={`${(result.volatility * 100).toFixed(2)}%`} detail="필수 위험 한도 적용" />
        <Metric label="Sharpe Ratio" value={result.sharpe_ratio.toFixed(2)} detail="현금 수익률 기준" tone="positive" />
        <Metric label="Critic 검증" value={analysis.critic.approved ? 'PASS' : 'REVIEW'} detail={`${analysis.critic.checked_agent_ids.length}개 Agent 근거 검토`} tone={analysis.critic.approved ? 'positive' : 'warning'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <SectionTitle eyebrow="Current allocation" title="통합 포트폴리오" action={<span className="text-[10px] text-slate-600">기준 대비</span>} />
          <PortfolioChart current={result} baseline={baseline} compact />
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Consensus signal" title="자산별 통합 신호" />
          <div className="space-y-4">
            {scoreRows.map(({ asset, score }) => (
              <div key={asset}>
                <div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-300">{ASSET_LABELS[asset]}</span><span className={score >= 0 ? 'text-mint' : 'text-red-300'}>{score >= 0 ? '+' : ''}{score.toFixed(2)}</span></div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-[#162538]"><div className={`absolute top-0 h-full rounded-full ${score >= 0 ? 'left-1/2 bg-mint' : 'right-1/2 bg-red-400'}`} style={{ width: `${Math.abs(score) * 50}%` }} /><div className="absolute left-1/2 top-0 h-full w-px bg-slate-500" /></div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3 rounded-xl border border-mint/15 bg-mint/[.04] p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 shrink-0 text-mint" size={16} /><p>Risk Agent 영향력과 관계없이 자산 상한, 최소 현금 및 유동성 제약은 항상 적용됩니다.</p></div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle eyebrow="Market pulse" title="샘플 시장 스냅샷" />
        <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {[
            ['S&P 500', '5,812.42', '+0.63%', true],
            ['US 10Y', '4.18%', '-3.2bp', true],
            ['Gold', '$2,741', '+0.41%', true],
            ['DXY', '103.87', '-0.18%', false],
          ].map(([name, value, change, positive]) => (
            <div key={String(name)} className="p-4 first:pl-0 last:pr-0"><p className="text-xs text-slate-600">{name}</p><div className="mt-2 flex items-end justify-between"><span className="text-xl font-semibold text-white">{value}</span><span className={`flex items-center gap-1 text-xs ${positive ? 'text-mint' : 'text-red-300'}`}>{positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}</span></div></div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
