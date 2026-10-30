export type AgentId =
  | 'macro'
  | 'valuation'
  | 'flow'
  | 'risk'
  | 'liquidity'
  | 'geopolitical'

export type AssetId = 'us_equity' | 'us_treasury' | 'gold' | 'cash'
export type ViewId = 'overview' | 'agents' | 'mixing' | 'optimization' | 'scenarios' | 'report'

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
