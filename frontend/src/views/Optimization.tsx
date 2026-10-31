import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { ASSET_LABELS } from '../data/mock'
import type { AssetId, OptimizationResult } from '../types'
import { PortfolioChart } from '../components/PortfolioChart'
import { Metric, Panel, SectionTitle } from '../components/ui'

export function OptimizationView({ result, baseline }: { result: OptimizationResult; baseline: OptimizationResult | null }) {
  const assets = Object.keys(ASSET_LABELS) as AssetId[]
  return (
    <div className="space-y-3">
      <div className="border-b border-line pb-3"><p className="eyebrow">TPA 최적화 엔진</p><h2 className="page-title">포트폴리오 최적화</h2><p className="page-description">Agent 합의로 기대수익률을 조정하고, 독립된 필수 제약 안에서 최적 비중을 산출합니다.</p></div>
      <div className="grid gap-2 sm:grid-cols-3"><Metric label="기대 수익률" value={`${(result.expected_return * 100).toFixed(2)}%`} tone="positive" detail="Agent 신호 반영" /><Metric label="예상 변동성" value={`${(result.volatility * 100).toFixed(2)}%`} detail="연율 기준" /><Metric label="샤프 지수" value={result.sharpe_ratio.toFixed(2)} tone="positive" detail={result.model_version} /></div>
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Panel><SectionTitle eyebrow="변경 전후" title="자산배분 변화" /><PortfolioChart current={result} baseline={baseline} /></Panel>
        <Panel>
          <SectionTitle eyebrow="기대수익률 조정" title="Agent 신호 반영" />
          <div className="space-y-3">
            {assets.map((asset) => {
              const base = result.base_expected_returns[asset]
              const adjusted = result.adjusted_expected_returns[asset]
              return <div key={asset} className="border border-line bg-surface p-3"><div className="flex items-center justify-between text-xs"><span className="text-slate-300">{ASSET_LABELS[asset]}</span><span className={`font-mono ${adjusted >= base ? 'text-positive' : 'text-negative'}`}>{adjusted >= base ? '+' : ''}{((adjusted - base) * 100).toFixed(2)}%p</span></div><div className="mt-2 flex items-center gap-3 text-[10px] text-muted"><span>기준 {(base * 100).toFixed(2)}%</span><span>→</span><span className="text-slate-300">조정 {(adjusted * 100).toFixed(2)}%</span></div></div>
            })}
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionTitle eyebrow="필수 안전장치" title="믹싱과 분리된 필수 제약" action={<span className="inline-flex items-center gap-1 text-[10px] text-mint"><LockKeyhole size={12} /> 항상 적용</span>} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[['자산별 상한', '주식 65% · 국채 70% · 금 30%'], ['최소 현금', '3% 이상 상시 유지'], ['유동성 예산', '비유동성 노출 85% 이하'], ['완전 투자', '비중 합계 100%']].map(([title, detail]) => <div key={title} className="flex gap-3 border border-line bg-surface p-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-positive" /><div><p className="text-xs font-medium text-white">{title}</p><p className="mt-1 text-[10px] text-muted">{detail}</p></div></div>)}
        </div>
      </Panel>
    </div>
  )
}
