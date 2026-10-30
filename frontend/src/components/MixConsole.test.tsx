import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { initialControls } from '../data/mock'
import { MixConsole } from './MixConsole'

const baseProps = {
  controls: initialControls(),
  preset: 'balanced',
  onPreset: vi.fn(),
  onWeight: vi.fn(),
  onToggle: vi.fn(),
  onReset: vi.fn(),
}

describe('MixConsole', () => {
  it('renders six accessible faders and a normalized total', () => {
    render(<MixConsole {...baseProps} />)
    expect(screen.getAllByRole('slider')).toHaveLength(6)
    expect(screen.getByText('합계 100.0%')).toBeInTheDocument()
  })

  it('forwards a changed fader value', () => {
    const onWeight = vi.fn()
    render(<MixConsole {...baseProps} onWeight={onWeight} />)
    fireEvent.change(screen.getByLabelText('거시경제 Agent 영향력'), { target: { value: '72' } })
    expect(onWeight).toHaveBeenCalledWith('macro', 72)
  })

  it('shows a blocking error for an all-zero mix', () => {
    const controls = initialControls().map((control) => ({ ...control, rawWeight: 0 }))
    render(<MixConsole {...baseProps} controls={controls} />)
    expect(screen.getByRole('alert')).toHaveTextContent('가중치가 0')
    expect(screen.getByText('합계 0.0%')).toBeInTheDocument()
  })
})
