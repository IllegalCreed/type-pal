import { ASSET_ROLES } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { PROJECT_ASSET_ROLE_GROUPS } from './ProjectWorkbenchTab.js'

describe('X7 全局资源角色分组', () => {
  test('四组恰好覆盖八项 manifest.assets.roles，且没有重复', () => {
    const groupedRoles = PROJECT_ASSET_ROLE_GROUPS.flatMap((group) => group.roles)
    expect(PROJECT_ASSET_ROLE_GROUPS.map((group) => group.id)).toEqual([
      'startup',
      'battle',
      'audio-base',
      'visual-base',
    ])
    expect(new Set(groupedRoles).size).toBe(groupedRoles.length)
    expect([...groupedRoles].sort()).toEqual([...ASSET_ROLES].sort())
  })
})
