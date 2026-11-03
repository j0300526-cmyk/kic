import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Gavel,
  MessageSquareReply,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { Metric, Panel } from '../components/ui'
import { AGENT_META, ASSET_LABELS } from '../data/mock'
import { normalizeWeights } from '../lib/mixing'
import type { AgentControl, AgentId, AnalysisRun, AssetId } from '../types'

interface CommitteeViewProps {
  analysis: AnalysisRun
  controls: AgentControl[]
  onApplyProposal: (weights: Record<AgentId, number>) => void
}

type Stance = 'overweight' | 'neutral' | 'underweight'

interface CommitteeOpinion {
  agentId: AgentId
  name: string
  shortName: string
  color: string
  score: number
  confidence: number
  mixWeight: number
  contribution: number
  stance: Stance
  rationale: string
  sourceCount: number
}

export interface CommitteeSnapshot {
  asset: AssetId
  consensus: number
  confidence: number
  disagreement: number
  label: string
  opinions: CommitteeOpinion[]
  suggestedRawWeights: Record<AgentId, number>
  suggestedPercents: Record<AgentId, number>
}

const ASSETS = Object.keys(ASSET_LABELS) as AssetId[]
const AGENT_BY_ID = Object.fromEntries(AGENT_META.map((agent) => [agent.id, agent])) as Record<AgentId, typeof AGENT_META[number]>

function stanceFor(score: number): Stance {
  if (score >= 0.15) return 'overweight'
  if (score <= -0.15) return 'underweight'
  return 'neutral'
}

function signalLabel(score: number) {
  if (score >= 0.2) return '비중 확대'
  if (score <= -0.2) return '비중 축소'
  return '중립 유지'
}

export function buildCommitteeSnapshot(
  analysis: AnalysisRun,
  controls: AgentControl[],
  asset: AssetId,
): CommitteeSnapshot {
  const normalized = normalizeWeights(controls) ?? Object.fromEntries(AGENT_META.map((agent) => [agent.id, 0])) as Record<AgentId, number>
  const opinions = analysis.analyses.map((item) => {
    const meta = AGENT_BY_ID[item.agent_id]
    const score = item.scores[asset]
    const mixWeight = normalized[item.agent_id] ?? 0
    return {
      agentId: item.agent_id,
      name: meta.name,
      shortName: meta.shortName,
      color: meta.color,
      score,
      confidence: item.confidence,
      mixWeight,
      contribution: score * mixWeight,
      stance: stanceFor(score),
      rationale: item.rationale,
      sourceCount: item.sources.length,
    }
  })
  const consensus = opinions.reduce((sum, opinion) => sum + opinion.contribution, 0)
  const confidence = opinions.reduce((sum, opinion) => sum + opinion.confidence * opinion.mixWeight, 0)
  const disagreement = Math.sqrt(opinions.reduce(
    (sum, opinion) => sum + opinion.mixWeight * (opinion.score - consensus) ** 2,
    0,
  ))
  const suggestedRawWeights = Object.fromEntries(opinions.map((opinion) => [
    opinion.agentId,
    Math.round(10 + Math.abs(opinion.score) * opinion.confidence * 90),
  ])) as Record<AgentId, number>
  const suggestedTotal = Object.values(suggestedRawWeights).reduce((sum, value) => sum + value, 0)
  const suggestedPercents = Object.fromEntries(AGENT_META.map((agent) => [
    agent.id,
    suggestedRawWeights[agent.id] / suggestedTotal,
  ])) as Record<AgentId, number>

  return {
    asset,
    consensus,
    confidence,
    disagreement,
    label: signalLabel(consensus),
    opinions,
    suggestedRawWeights,
    suggestedPercents,
  }
}

const STANCE_META = {
  overweight: { label: '확대', className: 'text-positive', icon: ArrowUpRight },
  neutral: { label: '중립', className: 'text-amber', icon: ArrowRight },
  underweight: { label: '축소', className: 'text-negative', icon: ArrowDownRight },
} satisfies Record<Stance, { label: string; className: string; icon: typeof ArrowRight }>

function scoreText(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

export function CommitteeView({ analysis, controls, onApplyProposal }: CommitteeViewProps) {
  const [asset, setAsset] = useState<AssetId>('us_equity')
  const snapshot = buildCommitteeSnapshot(analysis, controls, asset)
  const sortedByScore = [...snapshot.opinions].sort((a, b) => b.score - a.score)
  const advocate = sortedByScore[0]
  const challenger = sortedByScore[sortedByScore.length - 1]
  const criticApproved = analysis.critic.approved
  const evidenceCount = snapshot.opinions.reduce((sum, opinion) => sum + opinion.sourceCount, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Collective intelligence</p>
            <span className="rounded border border-cyan/20 bg-cyan/[.06] px-2 py-0.5 text-[8px] font-semibold text-cyan">AI-TRADER IDEA × TPA</span>
          </div>
          <h2 className="page-title">Agent 투자위원회</h2>
          <p className="page-description">여섯 전문 Agent가 투자 논거를 제시하고 반대 의견과 Critic 검증을 거쳐 합의 가능한 믹스를 만듭니다.</p>
        </div>
        <a className="btn-secondary" href="https://github.com/HKUDS/AI-Trader" target="_blank" rel="noreferrer">
          아이디어 출처 <ExternalLink size={12} />
        </a>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="위원회 신호" value={snapshot.label} detail={`${ASSET_LABELS[asset]} 가중 합의`} tone={snapshot.consensus >= 0.2 ? 'positive' : snapshot.consensus <= -0.2 ? 'warning' : 'neutral'} />
        <Metric label="합의 점수" value={scoreText(snapshot.consensus)} detail="현재 믹스 반영" tone={snapshot.consensus > 0 ? 'positive' : 'warning'} />
        <Metric label="가중 신뢰도" value={`${(snapshot.confidence * 100).toFixed(1)}%`} detail={`${evidenceCount}개 근거 출처`} tone="positive" />
        <Metric label="의견 분산" value={`${(snapshot.disagreement * 100).toFixed(1)}`} detail="높을수록 논쟁적" tone={snapshot.disagreement >= 0.4 ? 'warning' : 'neutral'} />
      </div>

      <div className="flex flex-wrap gap-1 border border-line bg-panel p-2" aria-label="위원회 분석 자산">
        {ASSETS.map((item) => (
          <button key={item} type="button" aria-pressed={asset === item} className={`min-w-24 rounded border px-3 py-2 text-[10px] transition ${asset === item ? 'border-mint/45 bg-mint/[.08] text-mint' : 'border-line bg-surface text-muted hover:text-white'}`} onClick={() => setAsset(item)}>
            {ASSET_LABELS[item]}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <div className="space-y-3">
          <Panel className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div><p className="terminal-label">Committee board</p><h3 className="mt-0.5 text-sm font-semibold text-white">Agent별 투자 의견</h3></div>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-muted"><UsersRound size={12} /> 6명 참여</span>
            </div>
            <div className="grid gap-px bg-line lg:grid-cols-2 xl:grid-cols-3">
              {snapshot.opinions.map((opinion) => {
                const stance = STANCE_META[opinion.stance]
                const StanceIcon = stance.icon
                return (
                  <article key={opinion.agentId} className="bg-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded border border-line bg-surface" style={{ color: opinion.color }}><Bot size={15} /></span>
                        <div><h4 className="text-xs font-semibold text-white">{opinion.shortName}</h4><p className="mt-0.5 text-[8px] text-muted">믹스 {(opinion.mixWeight * 100).toFixed(1)}%</p></div>
                      </div>
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold ${stance.className}`}><StanceIcon size={12} />{stance.label} {scoreText(opinion.score)}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 min-h-14 text-[10px] leading-[1.15rem] text-slate-300">{opinion.rationale}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[9px] text-muted">
                      <span>신뢰 {(opinion.confidence * 100).toFixed(0)}%</span>
                      <span>{opinion.sourceCount}개 출처</span>
                      <span className="font-mono">기여 {scoreText(opinion.contribution)}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </Panel>

          <Panel className="!p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div><p className="terminal-label">Structured debate</p><h3 className="mt-0.5 text-sm font-semibold text-white">토론 라운드</h3></div>
              <MessageSquareReply size={15} className="text-cyan" />
            </div>
            <div className="grid gap-px bg-line lg:grid-cols-3">
              <div className="bg-panel p-4">
                <div className="flex items-center gap-2 text-[9px] font-semibold text-positive"><span className="grid h-5 w-5 place-items-center rounded-full bg-positive/10">1</span> 제안</div>
                <p className="mt-3 text-xs font-semibold text-white">{advocate.shortName} · {scoreText(advocate.score)}</p>
                <p className="mt-2 line-clamp-4 text-[10px] leading-5 text-muted">{advocate.rationale}</p>
              </div>
              <div className="bg-panel p-4">
                <div className="flex items-center gap-2 text-[9px] font-semibold text-negative"><span className="grid h-5 w-5 place-items-center rounded-full bg-negative/10">2</span> 반대 심문</div>
                <p className="mt-3 text-xs font-semibold text-white">{challenger.shortName} · {scoreText(challenger.score)}</p>
                <p className="mt-2 line-clamp-4 text-[10px] leading-5 text-muted">{challenger.rationale}</p>
              </div>
              <div className="bg-panel p-4">
                <div className="flex items-center gap-2 text-[9px] font-semibold text-amber"><span className="grid h-5 w-5 place-items-center rounded-full bg-amber/10">3</span> Critic 판정</div>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-white"><Gavel size={13} className="text-amber" /> {criticApproved ? '근거 검증 통과' : '보완 후 재심 필요'}</p>
                <p className="mt-2 text-[10px] leading-5 text-muted">{analysis.critic.warnings[0] ?? `찬반 논거와 ${evidenceCount}개 출처를 확인했습니다. 의견 분산 ${(snapshot.disagreement * 100).toFixed(1)}를 의사결정 불확실성으로 기록합니다.`}</p>
              </div>
            </div>
          </Panel>
        </div>

        <aside className="space-y-3 2xl:sticky 2xl:top-28" aria-label="위원회 합의 제안">
          <Panel className="!p-0">
            <div className="border-b border-line p-4">
              <div className="flex items-center justify-between"><div><p className="terminal-label">Adopted proposal</p><h3 className="mt-0.5 text-sm font-semibold text-white">합의 믹스 제안</h3></div><Sparkles size={16} className="text-mint" /></div>
              <p className="mt-2 text-[10px] leading-5 text-muted">선택 자산에 대해 강하고 신뢰도 높은 의견의 영향력을 높입니다. 필수 위험 제약은 별도로 유지됩니다.</p>
            </div>
            <div className="space-y-3 p-4">
              {[...snapshot.opinions].sort((a, b) => snapshot.suggestedPercents[b.agentId] - snapshot.suggestedPercents[a.agentId]).map((opinion) => {
                const percent = snapshot.suggestedPercents[opinion.agentId] * 100
                return (
                  <div key={opinion.agentId}>
                    <div className="mb-1 flex items-center justify-between text-[9px]"><span className="text-muted">{opinion.shortName}</span><span className="font-mono text-white">{percent.toFixed(1)}%</span></div>
                    <div className="h-1.5 bg-ink"><div className="h-full" style={{ width: `${percent}%`, backgroundColor: opinion.color }} /></div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-line bg-surface p-4">
              <div className={`mb-3 flex items-center gap-2 text-[10px] ${criticApproved ? 'text-positive' : 'text-amber'}`}><ShieldCheck size={13} /> {criticApproved ? 'Critic 승인' : 'Critic 보완 의견'} · 비중 합계 100%</div>
              <button type="button" className="btn-primary w-full justify-center" disabled={!criticApproved} onClick={() => onApplyProposal(snapshot.suggestedRawWeights)}><CheckCircle2 size={13} /> {criticApproved ? '제안 믹스 적용' : '보완 후 적용 가능'}</button>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2"><Scale size={14} className="text-cyan" /><h3 className="text-xs font-semibold text-white">위원회 운영 원칙</h3></div>
            <ul className="mt-3 space-y-2 text-[10px] leading-5 text-muted">
              <li>• 강한 다수의견과 반대의견을 동시에 보존</li>
              <li>• 출처 없는 주장은 Critic 경고 대상으로 처리</li>
              <li>• Agent 합의와 필수 위험 제약을 분리 적용</li>
              <li>• 자동 주문 없이 TPA 제안으로만 전달</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
