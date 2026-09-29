import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProjectSidebar } from './ProjectSidebar'
import { projectFixture } from '../test/projectFixture'

describe('ProjectSidebar', () => {
  it('lists every project in the navigation', () => {
    render(<MemoryRouter>
      <ProjectSidebar
        apiState="ready"
        archivedProjectCount={0}
        dashboardView="active"
        projects={[
          projectFixture({ id: 2, name: 'Regular project' }),
          projectFixture({ id: 1, name: 'Ideas' }),
          projectFixture({ id: 3, name: 'Notes' }),
        ]}
        selectedProjectId={null}
        onArchiveProject={vi.fn()}
        onCreateProject={vi.fn()}
        onEditProject={vi.fn()}
        onRetry={vi.fn()}
        onSelectProject={vi.fn()}
        onShowDashboard={vi.fn()}
      />
    </MemoryRouter>,
    )

    expect(screen.getByText('Projects').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Ideas')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Regular project')).toBeInTheDocument()
  })

  it('lists projects shared with the user under their own heading without edit actions', () => {
    render(<MemoryRouter>
      <ProjectSidebar
        apiState="ready"
        archivedProjectCount={0}
        dashboardView="active"
        projects={[
          projectFixture({ id: 1, name: 'Shared one', role: 'EDITOR', ownerName: 'Alice', shared: true }),
          projectFixture({ id: 2, name: 'Own project' }),
        ]}
        selectedProjectId={null}
        onArchiveProject={vi.fn()}
        onCreateProject={vi.fn()}
        onEditProject={vi.fn()}
        onRetry={vi.fn()}
        onSelectProject={vi.fn()}
        onShowDashboard={vi.fn()}
      />
    </MemoryRouter>,
    )

    expect(screen.getByText('Shared with me')).toBeInTheDocument()
    expect(screen.getByText('Shared by Alice - Editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Own project' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Shared one' })).not.toBeInTheDocument()
  })
})
