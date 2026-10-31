import type { AgentAnalysis, AgentControl, AgentId, AnalysisRun, AssetId, OptimizationResult } from '../types'
import { normalizeWeights } from '../lib/mixing'

export const ASSET_LABELS: Record<AssetId, string> = {
  us_equity: '미국 주식',
  us_treasury: '미국 국채',
  gold: '금',
  cash: '현금',
}

export const AGENT_META: Array<Omit<AgentControl, 'rawWeight' | 'enabled'>> = [
  { id: 'macro', name: '거시경제 Agent', shortName: '거시경제', description: '금리 · 물가 · 경기 · 환율', color: '#2EBDFF' },
  { id: 'valuation', name: '가치평가 Agent', shortName: '가치평가', description: '자산별 내재가치와 밸류에이션', color: '#0ECB81' },
  { id: 'flow', name: '수급 Agent', shortName: '수급', description: '수급 · 거래량 · 시장 심리', color: '#A78BFA' },
  { id: 'risk', name: '위험관리 Agent', shortName: '위험관리', description: '변동성 · 상관 · 손실 위험', color: '#F6465D' },
  { id: 'liquidity', name: '유동성 Agent', shortName: '유동성', description: '현금화 가능성 · 유동성 제약', color: '#F0B90B' },
  { id: 'geopolitical', name: '지정학 Agent', shortName: '지정학', description: '분쟁 · 무역 · 정책 위험', color: '#F97316' },
]

export const PRESETS: Record<string, { label: string; description: string; weights: Record<AgentId, number> }> = {
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
}

export const initialControls = (preset = 'balanced'): AgentControl[] =>
  AGENT_META.map((agent) => ({
    ...agent,
    rawWeight: PRESETS[preset].weights[agent.id],
    enabled: true,
  }))

const scores: Record<AgentId, Record<AssetId, number>> = {
  macro: { us_equity: 0.38, us_treasury: 0.22, gold: 0.35, cash: -0.15 },
  valuation: { us_equity: -0.18, us_treasury: 0.42, gold: 0.1, cash: 0.02 },
  flow: { us_equity: 0.58, us_treasury: -0.05, gold: 0.2, cash: -0.3 },
  risk: { us_equity: -0.5, us_treasury: 0.52, gold: 0.25, cash: 0.62 },
  liquidity: { us_equity: 0.18, us_treasury: 0.4, gold: -0.12, cash: 0.78 },
  geopolitical: { us_equity: -0.35, us_treasury: 0.2, gold: 0.75, cash: 0.18 },
}

const rationale: Record<AgentId, string> = {
  macro: '완만한 디스인플레이션과 금리 정상화 가능성이 주식·국채에 우호적이며, 달러 변동성은 금의 헤지 수요를 지지합니다.',
  valuation: '주식 위험 프리미엄은 장기 평균 대비 다소 낮고, 중기 국채의 실질 수익률은 상대적으로 매력적입니다.',
  flow: '위험자산으로의 추세 추종 자금 유입이 이어지는 반면 단기 현금 선호는 완화되고 있습니다.',
  risk: '주식 변동성과 집중 위험이 확대되어 국채·현금의 완충 역할이 필요한 구간입니다.',
  liquidity: '미국 국채와 현금은 스트레스 상황의 즉시 동원 가능성이 높으며 금은 거래 비용을 반영했습니다.',
  geopolitical: '무역 정책과 지역 분쟁 불확실성으로 금의 꼬리위험 헤지 가치가 높아졌습니다.',
}

export const mockAnalysis: AnalysisRun = {
  analysis_run_id: 'mock-2026-10-31-v1',
  mode: 'mock',
  data_as_of: '2026-10-31T00:00:00Z',
  analyses: AGENT_META.map((agent, index) => ({
    agent_id: agent.id,
    agent_name: agent.name,
    mode: 'mock',
    assets: ['us_equity', 'us_treasury', 'gold', 'cash'],
    scores: scores[agent.id],
    sources: [{
      title: `${agent.shortName} 샘플 데이터셋`,
      publisher: 'AlphaMix 샘플 데이터',
      url: null,
      as_of: '2026-10-31',
    }],
    rationale: rationale[agent.id],
    confidence: [0.78, 0.72, 0.66, 0.82, 0.8, 0.64][index],
    uncertainties: ['공모전용 고정 샘플 데이터이며 실시간 시장 데이터가 아닙니다.'],
    as_of: '2026-10-31T00:00:00Z',
  })) as AgentAnalysis[],
  critic: {
    approved: true,
    warnings: [],
    revision_requests: [],
    checked_agent_ids: AGENT_META.map((agent) => agent.id),
  },
  warnings: ['현재 분석은 재현 가능한 모의 데이터입니다. 투자 판단에 직접 사용하지 마세요.'],
}

const baseReturns: Record<AssetId, number> = { us_equity: 0.075, us_treasury: 0.042, gold: 0.038, cash: 0.032 }
const sensitivity: Record<AssetId, number> = { us_equity: 0.045, us_treasury: 0.025, gold: 0.035, cash: 0.008 }

/** Deterministic degraded-mode preview, never presented as a server optimization. */
export function localPreview(controls: AgentControl[], analysis = mockAnalysis): OptimizationResult | null {
  const weights = normalizeWeights(controls)
  if (!weights) return null
  const assets = Object.keys(ASSET_LABELS) as AssetId[]
  const mixed = Object.fromEntries(assets.map((asset) => [asset, analysis.analyses.reduce(
    (sum, item) => sum + weights[item.agent_id] * item.scores[asset],
    0,
  )])) as Record<AssetId, number>
  const adjusted = Object.fromEntries(assets.map((asset) => [asset, baseReturns[asset] + mixed[asset] * sensitivity[asset]])) as Record<AssetId, number>

  const appetite = {
    us_equity: Math.max(0.05, 0.32 + mixed.us_equity * 0.34),
    us_treasury: Math.max(0.05, 0.28 + mixed.us_treasury * 0.26),
    gold: Math.max(0.03, 0.13 + mixed.gold * 0.18),
    cash: Math.max(0.03, 0.10 + mixed.cash * 0.16),
  }
  const total = Object.values(appetite).reduce((sum, value) => sum + value, 0)
  const portfolio = Object.fromEntries(assets.map((asset) => [asset, appetite[asset] / total])) as Record<AssetId, number>
  const expectedReturn = assets.reduce((sum, asset) => sum + portfolio[asset] * adjusted[asset], 0)
  const volatility = 0.055 + portfolio.us_equity * 0.105 + portfolio.gold * 0.025
  return {
    optimization_id: `local-${controls.map((item) => item.rawWeight).join('-')}`,
    analysis_run_id: analysis.analysis_run_id,
    status: 'preview',
    normalized_agent_weights: weights,
    mixed_scores: mixed,
    base_expected_returns: baseReturns,
    adjusted_expected_returns: adjusted,
    portfolio_weights: portfolio,
    expected_return: expectedReturn,
    volatility,
    sharpe_ratio: (expectedReturn - baseReturns.cash) / volatility,
    binding_constraints: ['로컬 프리뷰 — 서버 제약 검증 전'],
    warnings: ['FastAPI 연결 전 로컬 결정론적 프리뷰입니다.'],
    model_version: 'local-preview-v1',
    data_as_of: analysis.data_as_of,
  }
}
