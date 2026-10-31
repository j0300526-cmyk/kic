import { Activity, ArrowRight, CircleCheck, LockKeyhole, Radio } from 'lucide-react'
import { MixConsole } from '../components/MixConsole'
import { ASSET_LABELS } from '../data/mock'
import type { AgentControl, AssetId, OptimizationResult } from '../types'
import { Metric, Panel } from '../components/ui'

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

const ASSETS = Object.keys(ASSET_LABELS) as AssetId[]
const ASSET_COLORS: Record<AssetId, string> = {
  us_equity: '#F0B90B',
  us_treasury: '#2EBDFF',
  gold: '#B794F4',
  cash: '#0ECB81',
}

export function MixingView(props: MixingViewProps) {
  const { result, baseline, error } = props
  const largestMove = result
    ? ASSETS.map((asset) => ({
        asset,
        delta: result.portfolio_weights[asset] - (baseline?.portfolio_weights[asset] ?? result.portfolio_weights[asset]),
      })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">사용자 참여형 제어</p>
          <h2 className="page-title">Agent 믹싱 콘솔</h2>
          <p className="page-description">Agent 영향력을 조절하면 신호가 100%로 정규화되고, TPA 최적화 결과가 실시간 갱신됩니다.</p>
        </div>
        <div className="flex items-center gap-4 border border-line bg-panel px-3 py-2 text-[10px]">
          <span className="inline-flex items-center gap-1.5 text-positive"><Radio size={11} /> 실시간 재계산</span>
          <span className="text-muted">Agent 신호와 필수 위험 제약 분리</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="border border-negative/25 bg-negative/[.07] p-3 text-xs text-red-200">{error}</div>
      )}

      <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <MixConsole
          controls={props.controls}
          preset={props.preset}
          onPreset={props.onPreset}
          onWeight={props.onWeight}
          onToggle={props.onToggle}
          onReset={props.onReset}
        />

        <aside className="space-y-3 2xl:sticky 2xl:top-28" aria-label="실시간 최적화 결과">
          {result ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="기대수익" value={`${(result.expected_return * 100).toFixed(2)}%`} tone="positive" />
                <Metric label="변동성" value={`${(result.volatility * 100).toFixed(2)}%`} />
                <Metric label="Sharpe" value={result.sharpe_ratio.toFixed(2)} tone="positive" />
              </div>

              <Panel className="!p-0">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div>
                    <p className="terminal-label">실시간 자산배분</p>
                    <h3 className="mt-0.5 text-sm font-semibold text-white">TPA 목표 비중</h3>
                  </div>
                  <Activity size={15} className="text-mint" />
                </div>
                <div className="space-y-4 p-4">
                  {ASSETS.map((asset) => {
                    const value = result.portfolio_weights[asset] * 100
                    const before = (baseline?.portfolio_weights[asset] ?? result.portfolio_weights[asset]) * 100
                    const delta = value - before
                    return (
                      <div key={asset}>
                        <div className="mb-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-300">{ASSET_LABELS[asset]}</span>
                          <span className="font-mono tabular-nums text-white">
                            {value.toFixed(1)}%
                            <small className={`ml-2 font-mono ${delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-muted'}`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}%p
                            </small>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden bg-surface">
                          <div className="h-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: ASSET_COLORS[asset] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {largestMove && (
                  <div className="border-t border-line bg-surface px-4 py-3 text-[10px] text-muted">
                    최대 변화 <strong className="ml-1 text-white">{ASSET_LABELS[largestMove.asset]}</strong>
                    <span className={`ml-2 font-mono ${largestMove.delta >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {largestMove.delta >= 0 ? '+' : ''}{(largestMove.delta * 100).toFixed(1)}%p
                    </span>
                  </div>
                )}
              </Panel>

              <Panel className="!p-0">
                <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs font-medium text-white">
                  <LockKeyhole size={14} className="text-positive" /> 필수 위험 제약
                </div>
                <div className="space-y-2 p-4 text-[10px]">
                  <div className="flex items-center justify-between"><span className="text-muted">비중 합계</span><span className="inline-flex items-center gap-1 text-positive"><CircleCheck size={11} /> 100.0%</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">자산별 상한·유동성</span><span className="inline-flex items-center gap-1 text-positive"><CircleCheck size={11} /> 준수</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted">Agent 설정과 독립 적용</span><span className="font-mono text-slate-300">LOCKED</span></div>
                </div>
                <button className="flex w-full items-center justify-center gap-2 border-t border-line bg-surface px-4 py-3 text-[11px] font-medium text-slate-200 transition hover:bg-white/[.04]" onClick={props.onOpenOptimization}>
                  최적화 상세 보기 <ArrowRight size={13} />
                </button>
              </Panel>
            </>
          ) : (
            <Panel className="text-center">
              <p className="text-sm font-medium text-white">계산 대기 중</p>
              <p className="mt-2 text-xs text-muted">하나 이상의 Agent에 영향력을 부여하세요.</p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}
