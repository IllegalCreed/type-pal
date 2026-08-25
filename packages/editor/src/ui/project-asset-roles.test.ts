import { ASSET_ROLES, AUDIO_ASSET_ROLES } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  PROJECT_ASSET_ROLE_GROUPS,
  PROJECT_ASSET_ROLE_PREFIXES,
  PROJECT_ASSET_ROLE_REGISTRY,
  projectAssetRoleStatuses,
} from './project-asset-roles.js'

describe('项目资源角色注册表', () => {
  test('ASSET_ROLES 全量且只进入一个可见分组，并显式锁住结构前缀', () => {
    const grouped = PROJECT_ASSET_ROLE_GROUPS.flatMap((group) => group.roles)
    expect(PROJECT_ASSET_ROLE_REGISTRY.map((definition) => definition.role)).toEqual(ASSET_ROLES)
    expect(grouped.map((definition) => definition.role).sort()).toEqual([...ASSET_ROLES].sort())
    expect(new Set(grouped.map((definition) => definition.role)).size).toBe(ASSET_ROLES.length)
    expect([...new Set(grouped.map((definition) => definition.prefix))].sort()).toEqual(
      [...PROJECT_ASSET_ROLE_PREFIXES].sort(),
    )
    expect(PROJECT_ASSET_ROLE_GROUPS.every((group) => group.roles.length > 0)).toBe(true)
    expect(
      PROJECT_ASSET_ROLE_REGISTRY.filter(
        (definition) => definition.requirement === 'audio-catalog',
      ).map((definition) => definition.role),
    ).toEqual(Object.keys(AUDIO_ASSET_ROLES))
  })

  test('可选未配置保持中性，必选缺失与类型错误才进入需要处理', () => {
    const catalog = {
      version: 1 as const,
      assets: {
        'music.menu': {
          kind: 'music' as const,
          path: 'assets/authored/menu.mid',
          mediaType: 'audio/midi',
          bytes: 1,
          sha256: '1'.repeat(64),
          origin: { kind: 'authored' as const },
        },
        'video.wrong': {
          kind: 'video' as const,
          path: 'assets/authored/wrong.mp4',
          mediaType: 'video/mp4',
          bytes: 1,
          sha256: '2'.repeat(64),
          origin: { kind: 'authored' as const },
        },
      },
    }
    const statuses = projectAssetRoleStatuses(
      {
        catalog: 'assets/index.json',
        roles: {
          'audio.openingMenuMusic': 'music.menu',
          'audio.defaultBattleMusic': 'video.wrong',
        },
      },
      catalog,
    )

    expect(
      statuses.find((status) => status.definition.role === 'audio.openingMenuMusic'),
    ).toMatchObject({ state: 'configured', required: true })
    expect(
      statuses.find((status) => status.definition.role === 'audio.defaultBattleMusic'),
    ).toMatchObject({ state: 'error', required: true })
    expect(
      statuses.find((status) => status.definition.role === 'audio.battleEscapeSound'),
    ).toMatchObject({ state: 'unconfigured', required: false })
    expect(
      statuses.find((status) => status.definition.role === 'audio.normalVictoryMusic'),
    ).toMatchObject({ state: 'error', required: true })
  })
})
