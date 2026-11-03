import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  AlphaMixingConsole,
  alphaMixingDisplayPercents,
  createAlphaMixingControls,
  normalizeAlphaMixingWeights,
} from './AlphaMixingConsole'

describe('독립형 AlphaMixingConsole', () => {
  it('정규화된 비율과 표시 비율 합계가 각각 1과 100이다', () => {
    const normalized = normalizeAlphaMixingWeights(createAlphaMixingControls('defensive'))
    const percents = alphaMixingDisplayPercents(normalized)

    expect(Object.values(normalized ?? {}).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12)
    expect(Object.values(percents).reduce((sum, value) => sum + value, 0)).toBe(100)
  })

  it('페이더 변경 결과를 onChange로 전달한다', () => {
    const onChange = vi.fn()
    render(<AlphaMixingConsole onChange={onChange} />)

    fireEvent.change(screen.getByRole('slider', { name: '거시경제 Agent 영향력' }), { target: { value: '50' } })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][0].valid).toBe(true)
    expect(Object.values(onChange.mock.calls[0][0].normalizedPercents).reduce((sum: number, value) => sum + Number(value), 0)).toBeCloseTo(100, 10)
  })

  it('모든 활성 가중치가 0이면 오류를 표시한다', () => {
    const zeroControls = createAlphaMixingControls().map((control) => ({ ...control, rawWeight: 0 }))
    render(<AlphaMixingConsole value={zeroControls} />)

    expect(screen.getByRole('alert')).toHaveTextContent('모든 활성 Agent의 가중치가 0입니다')
    expect(screen.getByText('합계 0.0%')).toBeInTheDocument()
  })
})
