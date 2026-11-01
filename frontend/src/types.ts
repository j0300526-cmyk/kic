export type AgentId =
  | 'macro'
  | 'valuation'
  | 'flow'
  | 'risk'
  | 'liquidity'
  | 'geopolitical'

export type AssetId = 'us_equity' | 'us_treasury' | 'gold' | 'cash'
export type ViewId = 'overview' | 'agents' | 'riskmap' | 'mixing' | 'optimization' | 'scenarios' | 'report'

export interface AgentControl {
  id: AgentId
  name: string
  shortName: string
  description: string
  color: string
  rawWeight: number
  enabled: boolean
}

export interface SourceReference {
  title: string
  publisher: string
  url: string | null
  as_of: string
}

export interface AgentAnalysis {
  agent_id: AgentId
  agent_name: string
  mode: 'mock' | 'llm'
  assets: AssetId[]
  scores: Record<AssetId, number>
  sources: SourceReference[]
  rationale: string
  confidence: number
  uncertainties: string[]
  as_of: string
}

export interface CriticResult {
  approved: boolean
  warnings: string[]
  revision_requests: string[]
  checked_agent_ids: AgentId[]
}

export interface AnalysisRun {
  analysis_run_id: string
  mode: 'mock' | 'llm'
  data_as_of: string
  analyses: AgentAnalysis[]
  critic: CriticResult
  warnings: string[]
}

export interface OptimizationResult {
  optimization_id: string
  analysis_run_id: string
  status: string
  normalized_agent_weights: Partial<Record<AgentId, number>>
  mixed_scores: Record<AssetId, number>
  base_expected_returns: Record<AssetId, number>
  adjusted_expected_returns: Record<AssetId, number>
  portfolio_weights: Record<AssetId, number>
  expected_return: number
  volatility: number
  sharpe_ratio: number
  binding_constraints: string[]
  warnings: string[]
  model_version: string
  data_as_of: string
}

export interface Scenario {
  id: string
  name: string
  preset: string
  savedAt: string
  controls: AgentControl[]
  result: OptimizationResult
}

export interface MarketTickerItem {
  id: 'sp500' | 'us10y' | 'gold' | 'dxy'
  symbol: string
  label: string
  value: number
  formatted_value: string
  change: number
  change_percent: number
  formatted_change: string
  direction: 'positive' | 'negative' | 'flat'
  currency: string | null
  market_time: string
  source_url: string | null
}

export interface MarketSnapshot {
  provider: 'yahoo_finance' | 'mock'
  status: 'delayed' | 'stale' | 'fallback'
  source_label: string
  source_url: string | null
  as_of: string
  fetched_at: string
  cached: boolean
  cache_ttl_seconds: number
  items: MarketTickerItem[]
  notice: string
}

export type RiskEventType = 'conflict' | 'policy' | 'trade' | 'macro'

export interface RiskEvent {
  id: string
  event_type: RiskEventType
  severity: number
  title: string
  summary: string
  url: string | null
  publisher: string
  published_at: string
  source_country: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  location_confidence: number
  keywords: string[]
  agent_impacts: Record<AgentId, number>
  asset_impacts: Record<AssetId, number>
  rationale: string
  data_mode: 'live' | 'mock'
}

export interface RiskEventFeed {
  provider: 'gdelt' | 'mock'
  status: 'live' | 'stale' | 'fallback'
  source_label: string
  source_url: string | null
  as_of: string
  fetched_at: string
  cached: boolean
  cache_ttl_seconds: number
  window: '24h' | '7d'
  events: RiskEvent[]
  warnings: string[]
}
