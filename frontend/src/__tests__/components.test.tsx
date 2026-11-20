import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IncidentRow } from '@/components/IncidentRow'
import { AssignmentBadge, PriorityBadge, StatusBadge } from '@/components/ui/badges'
import type { IncidentSummary } from '@/lib/types'

const incident: IncidentSummary = {
  id: 7, incidentNumber: 'RL-1007', category: 'ACCIDENT', priority: 'CRITICAL', status: 'AWAITING_VERIFICATION',
  description: 'Bus overturned near the flyover', latitude: 17.4, longitude: 78.4, createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(), priorityIsAiSuggestion: true, responders: [], hasChannel: false,
}

describe('badges', () => {
  it('shows AI-suggested priority marker', () => {
    render(<PriorityBadge priority="HIGH" suggested />)
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText(/AI/)).toBeInTheDocument()
  })
  it('handles missing priority', () => {
    render(<PriorityBadge />)
    expect(screen.getByText('Unprioritised')).toBeInTheDocument()
  })
  it('renders human labels for status', () => {
    render(<><StatusBadge status="RESPONDER_ACCEPTED" /><AssignmentBadge status="ARRIVED" /></>)
    expect(screen.getByText('Responder accepted')).toBeInTheDocument()
    expect(screen.getByText('Arrived')).toBeInTheDocument()
  })
})

describe('IncidentRow', () => {
  it('links to the incident and shows key facts', () => {
    render(<MemoryRouter><IncidentRow i={incident} /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/incidents/7')
    expect(screen.getByText(/RL-1007/)).toBeInTheDocument()
    expect(screen.getByText('Bus overturned near the flyover')).toBeInTheDocument()
    expect(screen.getByText('Awaiting verification')).toBeInTheDocument()
  })
})
