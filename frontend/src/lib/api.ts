import type { AgentControl, AnalysisRun, MarketSnapshot, OptimizationResult, RiskEventFeed } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

interface ApiErrorBody {
  error?: { code?: string; message?: string }
  detail?: string | Array<{ msg?: string }>
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail
    throw new ApiError(body.error?.code || 'API_ERROR', body.error?.message || detail || 'API 요청에 실패했습니다.', response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  baseUrl: API_BASE,
  getAnalysis: () => request<AnalysisRun>('/analysis/latest?mode=mock'),
  getMarketSnapshot: () => request<MarketSnapshot>('/market/snapshot'),
  getRiskEvents: (window: '24h' | '7d' = '24h') => request<RiskEventFeed>(`/risk/events?window=${window}`),
  optimize: (analysisRunId: string, controls: AgentControl[]) => request<OptimizationResult>('/portfolio/optimize', {
    method: 'POST',
    body: JSON.stringify({
      analysis_run_id: analysisRunId,
      agent_weights: Object.fromEntries(controls.map((control) => [control.id, control.rawWeight])),
      enabled_agents: controls.filter((control) => control.enabled).map((control) => control.id),
      risk_tolerance: 'balanced',
      constraints: {
        max_weights: { us_equity: 0.65, us_treasury: 0.7, gold: 0.3, cash: 0.4 },
        min_cash: 0.03,
        max_illiquid_weight: 0.85,
      },
    }),
  }),
  saveScenario: (
    name: string,
    analysisRunId: string,
    controls: AgentControl[],
    result: OptimizationResult,
  ) => request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({
      name,
      request: {
        analysis_run_id: analysisRunId,
        agent_weights: Object.fromEntries(controls.map((control) => [control.id, control.rawWeight])),
        enabled_agents: controls.filter((control) => control.enabled).map((control) => control.id),
        risk_tolerance: 'balanced',
        constraints: {
          max_weights: { us_equity: 0.65, us_treasury: 0.7, gold: 0.3, cash: 0.4 },
          min_cash: 0.03,
          max_illiquid_weight: 0.85,
        },
      },
      result,
    }),
  }),
}
