import { Power, RotateCcw } from 'lucide-react'
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
  return (
    <Panel className="overflow-hidden">
      <SectionTitle
        eyebrow="분석 신호 배분"
        title="Agent 믹싱 콘솔"
        action={
          <button className="btn-secondary" onClick={onReset}><RotateCcw size={14} /> 초기화</button>
        }
      />
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {Object.entries(PRESETS).map(([id, item]) => (
          <button
            key={id}
            onClick={() => onPreset(id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${preset === id ? 'border-mint/35 bg-mint/[.07]' : 'border-line bg-ink/30 hover:border-slate-600'}`}
          >
            <span className={`block text-sm font-medium ${preset === id ? 'text-mint' : 'text-slate-200'}`}>{item.label}</span>
            <span className="mt-0.5 block text-[10px] text-slate-600">{item.description}</span>
          </button>
        ))}
      </div>

      {!normalized && (
        <div role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-400/[.07] px-4 py-3 text-sm text-red-200">
          모든 활성 Agent의 가중치가 0입니다. 하나 이상의 Agent에 영향력을 부여해야 계산할 수 있습니다.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {controls.map((control) => {
          const percent = (normalized?.[control.id] ?? 0) * 100
          return (
            <div key={control.id} className={`relative rounded-xl border px-2 py-4 text-center transition ${control.enabled ? 'border-line bg-ink/40' : 'border-line/50 bg-ink/20 opacity-45'}`}>
              <div className="mx-auto mb-3 h-1 w-8 rounded-full" style={{ backgroundColor: control.color }} />
              <p className="text-sm font-semibold text-white">{control.shortName}</p>
              <p className="mx-auto mt-1 h-7 max-w-28 text-[9px] leading-3 text-slate-600">{control.description}</p>
              <div className="my-2 flex h-44 items-center justify-center">
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
              <div className="rounded-lg border border-line bg-[#07111f] px-2 py-2">
                <p className="font-mono text-base font-semibold text-white">{control.rawWeight.toFixed(0)}</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-600">원시값 · 반영 {percent.toFixed(1)}%</p>
              </div>
              <button
                aria-label={`${control.name} ${control.enabled ? '비활성화' : '활성화'}`}
                aria-pressed={control.enabled}
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${control.enabled ? 'bg-mint/10 text-mint' : 'bg-slate-800 text-slate-500'}`}
                onClick={() => onToggle(control.id)}
              >
                <Power size={10} /> {control.enabled ? '활성' : '비활성'}
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs">
        <span className="text-slate-500">활성 Agent 자동 정규화</span>
        <span className={`font-mono font-semibold ${normalized ? 'text-mint' : 'text-red-300'}`}>합계 {normalized ? '100.0%' : '0.0%'}</span>
      </div>
    </Panel>
  )
}
