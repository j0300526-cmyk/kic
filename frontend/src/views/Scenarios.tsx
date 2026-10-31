import { Check, GitCompareArrows, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ASSET_LABELS } from '../data/mock'
import type { AssetId, Scenario } from '../types'
import { EmptyState, Panel, SectionTitle } from '../components/ui'

interface ScenariosProps {
  scenarios: Scenario[]
  onSave: (name: string) => void
  onLoad: (scenario: Scenario) => void
  onDelete: (id: string) => void
}

export function ScenariosView({ scenarios, onSave, onLoad, onDelete }: ScenariosProps) {
  const [name, setName] = useState('새 전략 시나리오')
  const [selected, setSelected] = useState<string[]>([])
  const compared = scenarios.filter((item) => selected.includes(item.id)).slice(0, 3)
  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < 3 ? [...items, id] : items)
  return (
    <div className="space-y-3">
      <div className="border-b border-line pb-3"><p className="eyebrow">의사결정 대안</p><h2 className="page-title">시나리오 비교</h2><p className="page-description">현재 믹스를 저장하고 최대 3개 전략의 수익·위험·배분을 나란히 검토합니다.</p></div>
      <Panel>
        <SectionTitle eyebrow="설정 스냅샷" title="현재 설정 저장" />
        <div className="flex flex-col gap-3 sm:flex-row"><input aria-label="시나리오 이름" className="input flex-1" value={name} onChange={(event) => setName(event.target.value)} /><button className="btn-primary justify-center" onClick={() => { if (name.trim()) { onSave(name.trim()); setName('새 전략 시나리오') } }}><Save size={14} /> 저장</button></div>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[.9fr_1.6fr]">
        <Panel>
          <SectionTitle eyebrow="저장된 전략" title={`저장된 시나리오 · ${scenarios.length}`} />
          {scenarios.length === 0 ? <EmptyState title="아직 저장된 시나리오가 없습니다" message="믹싱 콘솔에서 만든 현재 전략을 이름과 함께 저장해 보세요." /> : <div className="space-y-2">{scenarios.map((scenario) => <div key={scenario.id} className={`rounded border p-3 ${selected.includes(scenario.id) ? 'border-mint/30 bg-mint/[.04]' : 'border-line bg-surface'}`}><div className="flex items-start gap-3"><button aria-label={`${scenario.name} 비교 ${selected.includes(scenario.id) ? '해제' : '선택'}`} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${selected.includes(scenario.id) ? 'border-mint bg-mint text-ink' : 'border-slate-600'}`} onClick={() => toggle(scenario.id)}>{selected.includes(scenario.id) && <Check size={12} />}</button><button className="min-w-0 flex-1 text-left" onClick={() => onLoad(scenario)}><p className="truncate text-sm font-medium text-white">{scenario.name}</p><p className="mt-1 text-[10px] text-muted">{new Date(scenario.savedAt).toLocaleString('ko-KR')} · 수익 {(scenario.result.expected_return * 100).toFixed(1)}%</p></button><button aria-label={`${scenario.name} 삭제`} className="text-muted hover:text-negative" onClick={() => onDelete(scenario.id)}><Trash2 size={14} /></button></div></div>)}</div>}
        </Panel>
        <Panel>
          <SectionTitle eyebrow="나란히 보기" title="전략 비교" action={<GitCompareArrows size={17} className="text-slate-600" />} />
          {compared.length === 0 ? <EmptyState title="비교할 시나리오를 선택하세요" message="왼쪽 목록에서 최대 3개 시나리오를 체크하면 자산별 차이를 표시합니다." /> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="border-b border-line text-[10px] uppercase tracking-widest text-slate-600"><th className="pb-3 font-medium">지표</th>{compared.map((item) => <th key={item.id} className="pb-3 font-medium text-slate-300">{item.name}</th>)}</tr></thead><tbody className="divide-y divide-line">{[
            { label: '기대 수익률', value: (item: Scenario) => `${(item.result.expected_return * 100).toFixed(2)}%` },
            { label: '예상 변동성', value: (item: Scenario) => `${(item.result.volatility * 100).toFixed(2)}%` },
            { label: '샤프 지수', value: (item: Scenario) => item.result.sharpe_ratio.toFixed(2) },
            ...(Object.keys(ASSET_LABELS) as AssetId[]).map((asset) => ({ label: ASSET_LABELS[asset], value: (item: Scenario) => `${(item.result.portfolio_weights[asset] * 100).toFixed(1)}%` })),
          ].map((row) => <tr key={row.label}><td className="py-3 text-slate-500">{row.label}</td>{compared.map((item) => <td key={item.id} className="py-3 font-mono text-slate-200">{row.value(item)}</td>)}</tr>)}</tbody></table></div>}
        </Panel>
      </div>
    </div>
  )
}
