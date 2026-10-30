import type { AgentControl, AgentId } from '../types'

export function normalizeWeights(controls: AgentControl[]): Record<AgentId, number> | null {
  const enabledTotal = controls.reduce(
    (sum, control) => sum + (control.enabled ? Math.max(0, control.rawWeight) : 0),
    0,
  )
  if (enabledTotal <= 0) return null

  return Object.fromEntries(
    controls.map((control) => [
      control.id,
      control.enabled ? Math.max(0, control.rawWeight) / enabledTotal : 0,
    ]),
  ) as Record<AgentId, number>
}

export function normalizedPercent(controls: AgentControl[], id: AgentId): number {
  return (normalizeWeights(controls)?.[id] ?? 0) * 100
}

export function sumNormalized(weights: Record<AgentId, number> | null): number {
  if (!weights) return 0
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0)
}
