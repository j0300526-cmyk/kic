import { describe, expect, it } from 'vitest'
import { initialControls } from '../data/mock'
import { normalizeWeights, sumNormalized } from './mixing'

describe('normalizeWeights', () => {
  it('normalizes enabled controls to exactly 100%', () => {
    const normalized = normalizeWeights(initialControls())
    expect(normalized).not.toBeNull()
    expect(sumNormalized(normalized)).toBeCloseTo(1, 10)
    expect(normalized?.macro).toBeCloseTo(0.2)
  })

  it('excludes muted agents', () => {
    const controls = initialControls().map((control) => control.id === 'risk' ? { ...control, enabled: false } : control)
    const normalized = normalizeWeights(controls)
    expect(normalized?.risk).toBe(0)
    expect(sumNormalized(normalized)).toBeCloseTo(1, 10)
  })

  it('returns null when all enabled weights are zero', () => {
    const controls = initialControls().map((control) => ({ ...control, rawWeight: 0 }))
    expect(normalizeWeights(controls)).toBeNull()
  })
})
