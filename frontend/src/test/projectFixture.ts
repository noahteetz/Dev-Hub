import type { Project } from '../types'

export function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Dev Hub',
    description: 'A place for project context',
    status: 'ACTIVE',
    priority: 1,
    favorite: false,
    statusBeforeArchive: null,
    repositoryUrl: '',
    deploymentUrl: '',
    progressSummary: '',
    nextStep: 'Write the next test',
    blockers: '',
    startCommand: '',
    buildCommand: '',
    technicalDecisions: '',
    contextUpdatedAt: null,
    archivedAt: null,
    archiveReason: '',
    links: [],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-02T08:00:00Z',
    effectiveActivityAt: '2026-09-02T08:00:00Z',
    stale: false,
    ...overrides,
  }
}
