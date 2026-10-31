import { Check, Minus, Plus, Power, RotateCcw } from 'lucide-react'
import { PRESETS } from '../data/mock'
import { normalizeWeights } from '../lib/mixing'
import type { AgentControl } from '../types'
import { Panel, SectionTitle } from './ui'

interface MixConsoleProps {
  controls: AgentControl[]
  preset: string
  onPreset: (preset: string) => void
  onWeight: (id: AgentControl['id'], value: number) => void
  onToggle: (id: AgentControl['id']) => void
  onReset: () => void
}

export function MixConsole({ controls, preset, onPreset, onWeight, onToggle, onReset }: MixConsoleProps) {
  const normalized = normalizeWeights(controls)
  const activeCount = controls.filter((control) => control.enabled).length
  const updateWeight = (control: AgentControl, nextValue: number) => {
    onWeight(control.id, Math.max(0, Math.min(100, nextValue)))
  }

  return (
    <Panel className="overflow-hidden !p-0">
      <div className="border-b border-line p-4">
      <SectionTitle
        eyebrow="분석 신호 배분"
        title="Agent 믹싱 콘솔"
        action={
          <button className="btn-secondary" onClick={onReset}><RotateCcw size={13} /> 초기화</button>
        }
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(PRESETS).map(([id, item]) => (
          <button
            key={id}
            onClick={() => onPreset(id)}
            className={`relative rounded border px-3 py-2 text-left transition ${preset === id ? 'border-mint/45 bg-mint/[.07]' : 'border-line bg-surface hover:border-slate-500'}`}
          >
            {preset === id && <Check className="absolute right-2 top-2 text-mint" size={12} />}
            <span className={`block text-xs font-medium ${preset === id ? 'text-mint' : 'text-slate-200'}`}>{item.label}</span>
            <span className="mt-0.5 block text-[9px] text-muted">{item.description}</span>
          </button>
        ))}
      </div>
      </div>

      {!normalized && (
        <div role="alert" className="m-4 border border-negative/30 bg-negative/[.07] px-4 py-3 text-xs text-red-200">
          모든 활성 Agent의 가중치가 0입니다. 하나 이상의 Agent에 영향력을 부여해야 계산할 수 있습니다.
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 xl:grid-cols-6">
        {controls.map((control) => {
          const percent = (normalized?.[control.id] ?? 0) * 100
          return (
            <div key={control.id} className={`relative bg-panel px-2.5 py-3 text-center transition ${control.enabled ? '' : 'opacity-45'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="h-1 w-8" style={{ backgroundColor: control.color }} />
                <button
                  aria-label={`${control.name} ${control.enabled ? '비활성화' : '활성화'}`}
                  aria-pressed={control.enabled}
                  className={`grid h-6 w-6 place-items-center rounded border transition ${control.enabled ? 'border-positive/35 bg-positive/10 text-positive' : 'border-line bg-surface text-muted'}`}
                  onClick={() => onToggle(control.id)}
                >
                  <Power size={11} />
                </button>
              </div>
              <p className="text-xs font-semibold text-white">{control.shortName}</p>
              <p className="mx-auto mt-1 h-6 max-w-28 text-[8px] leading-3 text-muted">{control.description}</p>
              <div className="my-1 flex h-40 items-center justify-center">
                <input
                  aria-label={`${control.name} 영향력`}
                  className="vertical-fader"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  disabled={!control.enabled}
                  value={control.rawWeight}
                  onChange={(event) => onWeight(control.id, Number(event.target.value))}
                  style={{ '--agent-color': control.color, '--fader-progress': `${control.rawWeight}%` } as React.CSSProperties}
                />
              </div>
              <div className="border border-line bg-ink p-1.5">
                <p className="terminal-label">최종 반영률</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{percent.toFixed(1)}<span className="ml-0.5 text-[10px] text-muted">%</span></p>
              </div>
              <div className="mt-2 flex items-stretch overflow-hidden rounded border border-line bg-surface">
                <button aria-label={`${control.name} 1 감소`} className="grid w-7 place-items-center text-muted hover:bg-white/5 hover:text-white" disabled={!control.enabled} onClick={() => updateWeight(control, control.rawWeight - 1)}><Minus size={11} /></button>
                <input
                  aria-label={`${control.name} 원시 가중치`}
                  className="min-w-0 flex-1 border-x border-line bg-ink px-1 py-1.5 text-center font-mono text-xs text-white disabled:text-muted"
                  type="number"
                  min="0"
                  max="100"
                  disabled={!control.enabled}
                  value={control.rawWeight}
                  onChange={(event) => updateWeight(control, Number(event.target.value))}
                />
                <button aria-label={`${control.name} 1 증가`} className="grid w-7 place-items-center text-muted hover:bg-white/5 hover:text-white" disabled={!control.enabled} onClick={() => updateWeight(control, control.rawWeight + 1)}><Plus size={11} /></button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 text-[10px]">
        <div className="flex items-center gap-3 text-muted"><span><strong className="text-white">{activeCount}</strong>/6 활성</span><span className="hidden sm:inline">원시 가중치 → 자동 정규화</span></div>
        <span className={`font-mono font-semibold ${normalized ? 'text-positive' : 'text-negative'}`}>합계 {normalized ? '100.0%' : '0.0%'}</span>
      </div>
    </Panel>
  )
}
