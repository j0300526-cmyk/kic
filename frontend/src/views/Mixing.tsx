import { Activity, ArrowRight } from 'lucide-react'
import { MixConsole } from '../components/MixConsole'
import { ASSET_LABELS } from '../data/mock'
import type { AgentControl, AssetId, OptimizationResult } from '../types'
import { Metric, Panel, SectionTitle } from '../components/ui'

interface MixingViewProps {
  controls: AgentControl[]
  preset: string
  result: OptimizationResult | null
  baseline: OptimizationResult | null
  error: string | null
  onPreset: (preset: string) => void
  onWeight: (id: AgentControl['id'], value: number) => void
  onToggle: (id: AgentControl['id']) => void
  onReset: () => void
  onOpenOptimization: () => void
}

export function MixingView(props: MixingViewProps) {
  const { result, baseline, error } = props
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Human-in-the-loop control</p><h2 className="page-title">Agent Mixing Console</h2><p className="page-description">원시 영향력을 조절하면 활성 Agent 안에서 100%로 정규화되어 TPA 엔진에 즉시 반영됩니다.</p></div>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.65fr)]">
        <MixConsole {...props} />
        <div className="space-y-5">
          {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/[.06] p-4 text-sm text-red-200">{error}</div>}
          {result && <>
            <div className="grid grid-cols-2 gap-3"><Metric label="Expected" value={`${(result.expected_return * 100).toFixed(2)}%`} tone="positive" /><Metric label="Volatility" value={`${(result.volatility * 100).toFixed(2)}%`} /></div>
            <Panel>
              <SectionTitle eyebrow="Live allocation" title="비중 변화" action={<Activity size={16} className="text-mint" />} />
              <div className="space-y-4">{(Object.keys(ASSET_LABELS) as AssetId[]).map((asset) => { const value = result.portfolio_weights[asset] * 100; const before = (baseline?.portfolio_weights[asset] ?? 0) * 100; return <div key={asset}><div className="mb-1.5 flex items-center justify-between text-xs"><span>{ASSET_LABELS[asset]}</span><span className="font-mono text-white">{value.toFixed(1)}% <small className={value >= before ? 'text-mint' : 'text-red-300'}>{value >= before ? '+' : ''}{(value - before).toFixed(1)}</small></span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#17273a]"><div className="h-full rounded-full bg-gradient-to-r from-cyan to-mint transition-all duration-500" style={{ width: `${value}%` }} /></div></div> })}</div>
              <button className="btn-secondary mt-6 w-full justify-center" onClick={props.onOpenOptimization}>최적화 상세 보기 <ArrowRight size={14} /></button>
            </Panel>
          </>}
        </div>
      </div>
    </div>
  )
}
