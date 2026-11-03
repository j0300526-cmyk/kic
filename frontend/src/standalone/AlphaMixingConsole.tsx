import { useId, useState, type CSSProperties } from 'react'

export type AlphaAgentId =
  | 'macro'
  | 'valuation'
  | 'flow'
  | 'risk'
  | 'liquidity'
  | 'geopolitical'

export interface AlphaAgentControl {
  id: AlphaAgentId
  name: string
  shortName: string
  description: string
  color: string
  rawWeight: number
  enabled: boolean
}

export interface AlphaMixingChange {
  controls: AlphaAgentControl[]
  normalizedWeights: Record<AlphaAgentId, number> | null
  normalizedPercents: Record<AlphaAgentId, number>
  valid: boolean
}

export interface AlphaMixingConsoleProps {
  /** 전달하면 controlled component로 동작합니다. */
  value?: AlphaAgentControl[]
  /** value가 없을 때 사용하는 초기값입니다. */
  defaultValue?: AlphaAgentControl[]
  /** 원시 페이더와 100% 정규화 결과를 함께 반환합니다. */
  onChange?: (change: AlphaMixingChange) => void
  className?: string
  title?: string
}

const AGENTS: Array<Omit<AlphaAgentControl, 'rawWeight' | 'enabled'>> = [
  { id: 'macro', name: '거시경제 Agent', shortName: '거시경제', description: '금리 · 물가 · 경기 · 환율', color: '#2ebdff' },
  { id: 'valuation', name: '가치평가 Agent', shortName: '가치평가', description: '자산별 내재가치와 밸류에이션', color: '#0ecb81' },
  { id: 'flow', name: '수급 Agent', shortName: '수급', description: '수급 · 거래량 · 시장 심리', color: '#a78bfa' },
  { id: 'risk', name: '위험관리 Agent', shortName: '위험관리', description: '변동성 · 상관 · 손실 위험', color: '#f6465d' },
  { id: 'liquidity', name: '유동성 Agent', shortName: '유동성', description: '현금화 가능성 · 유동성 제약', color: '#f0b90b' },
  { id: 'geopolitical', name: '지정학 Agent', shortName: '지정학', description: '분쟁 · 무역 · 정책 위험', color: '#f97316' },
]

export const ALPHA_MIXING_PRESETS = {
  balanced: {
    label: '기본 균형',
    description: '여섯 관점을 고르게 반영',
    weights: { macro: 20, valuation: 20, flow: 15, risk: 20, liquidity: 15, geopolitical: 10 },
  },
  defensive: {
    label: '위험 방어',
    description: '위험·유동성·지정학 우선',
    weights: { macro: 15, valuation: 10, flow: 5, risk: 35, liquidity: 20, geopolitical: 15 },
  },
  value: {
    label: '가치 투자',
    description: '밸류에이션과 거시 환경 중심',
    weights: { macro: 20, valuation: 40, flow: 10, risk: 10, liquidity: 10, geopolitical: 10 },
  },
} satisfies Record<string, {
  label: string
  description: string
  weights: Record<AlphaAgentId, number>
}>

type PresetId = keyof typeof ALPHA_MIXING_PRESETS

const AGENT_IDS = AGENTS.map((agent) => agent.id)

function clampWeight(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

function cloneControls(controls: AlphaAgentControl[]) {
  return controls.map((control) => ({ ...control }))
}

export function createAlphaMixingControls(preset: PresetId = 'balanced'): AlphaAgentControl[] {
  return AGENTS.map((agent) => ({
    ...agent,
    rawWeight: ALPHA_MIXING_PRESETS[preset].weights[agent.id],
    enabled: true,
  }))
}

/** 활성 Agent만 사용해 0~1 비율로 정규화합니다. 유효한 결과의 합은 1입니다. */
export function normalizeAlphaMixingWeights(
  controls: AlphaAgentControl[],
): Record<AlphaAgentId, number> | null {
  const total = controls.reduce(
    (sum, control) => sum + (control.enabled ? clampWeight(control.rawWeight) : 0),
    0,
  )
  if (total <= 0) return null

  return Object.fromEntries(AGENT_IDS.map((id) => {
    const control = controls.find((item) => item.id === id)
    const value = control?.enabled ? clampWeight(control.rawWeight) / total : 0
    return [id, value]
  })) as Record<AlphaAgentId, number>
}

/** 화면의 소수점 한 자리 값도 정확히 100.0%가 되도록 최대 나머지 방식으로 배분합니다. */
export function alphaMixingDisplayPercents(
  normalized: Record<AlphaAgentId, number> | null,
): Record<AlphaAgentId, number> {
  if (!normalized) {
    return Object.fromEntries(AGENT_IDS.map((id) => [id, 0])) as Record<AlphaAgentId, number>
  }

  const rows = AGENT_IDS.map((id, index) => {
    const exactTenths = normalized[id] * 1000
    const floorTenths = Math.floor(exactTenths)
    return { id, index, floorTenths, remainder: exactTenths - floorTenths }
  })
  const remaining = 1000 - rows.reduce((sum, row) => sum + row.floorTenths, 0)
  const priority = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (let index = 0; index < remaining; index += 1) {
    priority[index % priority.length].floorTenths += 1
  }
  return Object.fromEntries(rows.map((row) => [row.id, row.floorTenths / 10])) as Record<AlphaAgentId, number>
}

function buildChange(controls: AlphaAgentControl[]): AlphaMixingChange {
  const normalizedWeights = normalizeAlphaMixingWeights(controls)
  return {
    controls: cloneControls(controls),
    normalizedWeights,
    normalizedPercents: alphaMixingDisplayPercents(normalizedWeights),
    valid: normalizedWeights !== null,
  }
}

function matchingPreset(controls: AlphaAgentControl[]): PresetId | null {
  if (controls.some((control) => !control.enabled)) return null
  return (Object.keys(ALPHA_MIXING_PRESETS) as PresetId[]).find((presetId) => (
    controls.every((control) => control.rawWeight === ALPHA_MIXING_PRESETS[presetId].weights[control.id])
  )) ?? null
}

const STYLES = `
.amx-console{--amx-bg:#0b0e11;--amx-panel:#181a20;--amx-surface:#202229;--amx-line:#2b3139;--amx-text:#eaecef;--amx-muted:#848e9c;--amx-positive:#0ecb81;--amx-negative:#f6465d;--amx-accent:#f0b90b;background:var(--amx-panel);border:1px solid var(--amx-line);color:var(--amx-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
.amx-console *{box-sizing:border-box}.amx-head{padding:16px;border-bottom:1px solid var(--amx-line)}.amx-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.amx-eyebrow{margin:0 0 4px;color:var(--amx-accent);font:600 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.amx-title{margin:0;font-size:18px;line-height:1.35}.amx-subtitle{margin:5px 0 0;color:var(--amx-muted);font-size:11px}.amx-reset,.amx-preset,.amx-power,.amx-step{border:1px solid var(--amx-line);background:var(--amx-surface);color:var(--amx-muted);cursor:pointer}.amx-reset{padding:7px 10px;font-size:11px}.amx-reset:hover,.amx-step:hover{color:var(--amx-text)}.amx-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.amx-preset{padding:9px 10px;text-align:left}.amx-preset strong{display:block;color:var(--amx-text);font-size:12px}.amx-preset span{display:block;margin-top:3px;font-size:9px}.amx-preset[aria-pressed="true"]{border-color:rgba(240,185,11,.55);background:rgba(240,185,11,.08)}.amx-preset[aria-pressed="true"] strong{color:var(--amx-accent)}.amx-alert{margin:14px;border:1px solid rgba(246,70,93,.35);background:rgba(246,70,93,.08);padding:10px 12px;color:#fecdd3;font-size:11px}.amx-channels{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;background:var(--amx-line)}.amx-channel{min-width:0;background:var(--amx-panel);padding:12px 9px;text-align:center;transition:opacity .2s}.amx-channel[data-enabled="false"]{opacity:.42}.amx-channel-top{display:flex;align-items:center;justify-content:space-between}.amx-color{width:30px;height:4px}.amx-power{display:grid;width:26px;height:26px;place-items:center;border-radius:4px;font-size:13px}.amx-power[aria-pressed="true"]{border-color:rgba(14,203,129,.4);background:rgba(14,203,129,.1);color:var(--amx-positive)}.amx-agent{margin:10px 0 0;font-size:12px}.amx-description{height:28px;margin:4px 0 0;color:var(--amx-muted);font-size:9px;line-height:14px}.amx-fader-wrap{display:flex;height:170px;align-items:center;justify-content:center}.amx-fader{--agent-color:#f0b90b;--progress:50%;appearance:none;width:138px;height:5px;transform:rotate(-90deg);border-radius:3px;background:linear-gradient(90deg,var(--agent-color) 0,var(--agent-color) var(--progress),#343a42 var(--progress),#343a42 100%);cursor:ns-resize}.amx-fader::-webkit-slider-thumb{appearance:none;width:25px;height:17px;border:1px solid #eaecef;border-radius:2px;background:repeating-linear-gradient(0deg,#eaecef 0,#eaecef 3px,#848e9c 4px,#848e9c 5px);box-shadow:0 2px 8px rgba(0,0,0,.6)}.amx-fader::-moz-range-thumb{width:25px;height:17px;border:1px solid #eaecef;border-radius:2px;background:#c7ccd1;box-shadow:0 2px 8px rgba(0,0,0,.6)}.amx-fader:disabled{cursor:not-allowed}.amx-output{border:1px solid var(--amx-line);background:var(--amx-bg);padding:7px}.amx-output span{display:block;color:var(--amx-muted);font:600 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.amx-output strong{display:block;margin-top:4px;font:600 18px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.amx-input-row{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;margin-top:8px;border:1px solid var(--amx-line)}.amx-step{border:0}.amx-number{min-width:0;width:100%;border:0;border-right:1px solid var(--amx-line);border-left:1px solid var(--amx-line);background:var(--amx-bg);padding:6px 2px;color:var(--amx-text);text-align:center;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.amx-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--amx-line);background:var(--amx-surface);padding:11px 14px;color:var(--amx-muted);font-size:10px}.amx-total{color:var(--amx-positive);font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace}.amx-total[data-valid="false"]{color:var(--amx-negative)}
@media(max-width:1000px){.amx-channels{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.amx-presets{grid-template-columns:1fr}.amx-channels{grid-template-columns:repeat(2,minmax(0,1fr))}.amx-subtitle{display:none}}
`

export function AlphaMixingConsole({
  value,
  defaultValue,
  onChange,
  className = '',
  title = 'Agent 믹싱 콘솔',
}: AlphaMixingConsoleProps) {
  const instanceId = useId()
  const [internalControls, setInternalControls] = useState<AlphaAgentControl[]>(() => (
    cloneControls(defaultValue ?? createAlphaMixingControls())
  ))
  const controls = value ?? internalControls
  const normalized = normalizeAlphaMixingWeights(controls)
  const percents = alphaMixingDisplayPercents(normalized)
  const activeCount = controls.filter((control) => control.enabled).length
  const activePreset = matchingPreset(controls)

  const commit = (nextControls: AlphaAgentControl[]) => {
    if (value === undefined) setInternalControls(nextControls)
    onChange?.(buildChange(nextControls))
  }

  const updateWeight = (id: AlphaAgentId, nextValue: number) => {
    commit(controls.map((control) => (
      control.id === id ? { ...control, rawWeight: clampWeight(nextValue) } : control
    )))
  }

  const toggleAgent = (id: AlphaAgentId) => {
    commit(controls.map((control) => (
      control.id === id ? { ...control, enabled: !control.enabled } : control
    )))
  }

  const applyPreset = (presetId: PresetId) => commit(createAlphaMixingControls(presetId))

  return (
    <section className={`amx-console ${className}`.trim()} aria-labelledby={`${instanceId}-title`}>
      <style>{STYLES}</style>
      <header className="amx-head">
        <div className="amx-title-row">
          <div>
            <p className="amx-eyebrow">Analysis signal allocation</p>
            <h2 className="amx-title" id={`${instanceId}-title`}>{title}</h2>
            <p className="amx-subtitle">원시 영향력을 활성 Agent 안에서 자동으로 100% 정규화합니다.</p>
          </div>
          <button type="button" className="amx-reset" onClick={() => applyPreset('balanced')}>↻ 초기화</button>
        </div>
        <div className="amx-presets" aria-label="믹싱 프리셋">
          {(Object.entries(ALPHA_MIXING_PRESETS) as Array<[PresetId, typeof ALPHA_MIXING_PRESETS[PresetId]]>).map(([id, preset]) => (
            <button key={id} type="button" className="amx-preset" aria-pressed={activePreset === id} onClick={() => applyPreset(id)}>
              <strong>{preset.label}</strong><span>{preset.description}</span>
            </button>
          ))}
        </div>
      </header>

      {!normalized && <div className="amx-alert" role="alert">모든 활성 Agent의 가중치가 0입니다. 하나 이상의 Agent에 영향력을 부여하세요.</div>}

      <div className="amx-channels">
        {controls.map((control) => (
          <article key={control.id} className="amx-channel" data-enabled={control.enabled}>
            <div className="amx-channel-top">
              <span className="amx-color" style={{ backgroundColor: control.color }} />
              <button type="button" className="amx-power" aria-label={`${control.name} ${control.enabled ? '비활성화' : '활성화'}`} aria-pressed={control.enabled} onClick={() => toggleAgent(control.id)}>●</button>
            </div>
            <h3 className="amx-agent">{control.shortName}</h3>
            <p className="amx-description">{control.description}</p>
            <div className="amx-fader-wrap">
              <input
                className="amx-fader"
                type="range"
                min="0"
                max="100"
                step="1"
                disabled={!control.enabled}
                value={control.rawWeight}
                aria-label={`${control.name} 영향력`}
                onChange={(event) => updateWeight(control.id, Number(event.target.value))}
                style={{ '--agent-color': control.color, '--progress': `${control.rawWeight}%` } as CSSProperties}
              />
            </div>
            <div className="amx-output">
              <span>최종 반영률</span><strong>{percents[control.id].toFixed(1)}%</strong>
            </div>
            <div className="amx-input-row">
              <button type="button" className="amx-step" disabled={!control.enabled} aria-label={`${control.name} 1 감소`} onClick={() => updateWeight(control.id, control.rawWeight - 1)}>−</button>
              <input className="amx-number" type="number" min="0" max="100" disabled={!control.enabled} value={control.rawWeight} aria-label={`${control.name} 원시 가중치`} onChange={(event) => updateWeight(control.id, Number(event.target.value))} />
              <button type="button" className="amx-step" disabled={!control.enabled} aria-label={`${control.name} 1 증가`} onClick={() => updateWeight(control.id, control.rawWeight + 1)}>+</button>
            </div>
          </article>
        ))}
      </div>

      <footer className="amx-footer">
        <span><strong>{activeCount}</strong>/6 활성 · 원시 가중치 → 자동 정규화</span>
        <span className="amx-total" data-valid={normalized !== null} aria-live="polite">합계 {normalized ? '100.0%' : '0.0%'}</span>
      </footer>
    </section>
  )
}

export default AlphaMixingConsole
