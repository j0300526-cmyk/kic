import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { initialControls, mockAnalysis } from '../data/mock'
import { buildCommitteeSnapshot, CommitteeView } from './Committee'

describe('CommitteeView', () => {
  it('현재 믹스로 위원회 합의와 100% 제안을 계산한다', () => {
    const snapshot = buildCommitteeSnapshot(mockAnalysis, initialControls(), 'us_equity')

    expect(snapshot.opinions).toHaveLength(6)
    expect(Object.values(snapshot.suggestedPercents).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12)
    expect(snapshot.label).toBeTruthy()
  })

  it('자산을 변경하고 제안 믹스를 적용한다', () => {
    const onApplyProposal = vi.fn()
    render(<CommitteeView analysis={mockAnalysis} controls={initialControls()} onApplyProposal={onApplyProposal} />)

    fireEvent.click(screen.getByRole('button', { name: '금' }))
    expect(screen.getByText('금 가중 합의')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /제안 믹스 적용/ }))

    expect(onApplyProposal).toHaveBeenCalledOnce()
    expect(Object.keys(onApplyProposal.mock.calls[0][0])).toHaveLength(6)
  })
})
