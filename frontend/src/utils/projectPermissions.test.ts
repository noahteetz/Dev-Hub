import { describe, expect, it } from 'vitest'
import { projectCan } from './projectPermissions'

describe('projectCan', () => {
  it('lets the owner do everything', () => {
    for (const action of ['writeContent', 'editContext', 'editMetadata', 'manageRepository', 'manageMembers', 'archive', 'detachContent'] as const) {
      expect(projectCan({ role: 'OWNER' }, action)).toBe(true)
    }
  })

  it('lets an editor change content and context only', () => {
    expect(projectCan({ role: 'EDITOR' }, 'writeContent')).toBe(true)
    expect(projectCan({ role: 'EDITOR' }, 'editContext')).toBe(true)
    for (const action of ['editMetadata', 'manageRepository', 'manageMembers', 'archive', 'detachContent'] as const) {
      expect(projectCan({ role: 'EDITOR' }, action)).toBe(false)
    }
  })

  it('lets a viewer change nothing', () => {
    for (const action of ['writeContent', 'editContext', 'editMetadata', 'manageRepository', 'manageMembers', 'archive', 'detachContent'] as const) {
      expect(projectCan({ role: 'VIEWER' }, action)).toBe(false)
    }
  })
})
