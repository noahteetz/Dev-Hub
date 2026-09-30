import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectDashboard } from './ProjectDashboard'
import { projectFixture } from '../test/projectFixture'

describe('ProjectDashboard', () => {
  it('renders a smoke view with active project metrics and cards', () => {
    render(
      <ProjectDashboard
        activeProjects={[
          projectFixture({ id: 1, name: 'Active work', status: 'ACTIVE', favorite: true }),
          projectFixture({ id: 2, name: 'Second project' }),
        ]}
        archivedProjects={[]}
        view="active"
        onArchiveProject={vi.fn()}
        onCreateProject={vi.fn()}
        onRestoreProject={vi.fn()}
        onSelectProject={vi.fn()}
        onUpdateOrganization={vi.fn()}
        onToggleFavorite={vi.fn()}
        onViewChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Keep the work findable' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Active projects 2' })).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('Active work')).toBeInTheDocument()
    expect(screen.getByText('Second project')).toBeInTheDocument()
  })

  it('marks a shared project and keeps its master data read-only for a viewer', () => {
    const toggleFavorite = vi.fn()
    render(
      <ProjectDashboard
        activeProjects={[projectFixture({ id: 7, name: 'Their project', role: 'VIEWER', ownerName: 'Alice', shared: true })]}
        archivedProjects={[]}
        view="active"
        onArchiveProject={vi.fn()}
        onCreateProject={vi.fn()}
        onRestoreProject={vi.fn()}
        onSelectProject={vi.fn()}
        onUpdateOrganization={vi.fn()}
        onToggleFavorite={toggleFavorite}
        onViewChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Shared by Alice')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive Their project' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark active' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Favorite Their project' }))
    expect(toggleFavorite).toHaveBeenCalledWith(7, true)
  })
})
