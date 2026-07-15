import type { Command, GridPos, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  MIGRATED_SCENE_ENTRY_PREFIX,
  migratedSceneEntryId,
  normalizeSceneEntryReferences,
} from './scene-entry-normalize.js'

function scene(id: string, pos: GridPos): SceneDef {
  return {
    id,
    mapId: 'map-001',
    entry: { pos, facing: 'down' },
    entities: [],
  }
}

describe('W4-1 命名落点归一化', () => {
  test('默认坐标收敛；相同目标坐标跨分支复用一个稳定命名落点', () => {
    const scenes = [scene('s001', { col: 1, row: 2, height: 0 })]
    const namedPos = { col: 9, row: -3, height: 1 }
    const roots: Command[][] = [
      [
        { kind: 'loadScene', scene: 's001', pos: { col: 1, row: 2, height: 0 } },
        { kind: 'loadScene', scene: 's001', pos: namedPos },
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'x', is: true },
          then: [{ kind: 'loadScene', scene: 's001', pos: { ...namedPos } }],
        },
      ],
    ]

    const report = normalizeSceneEntryReferences(scenes, roots, { strictMissingScene: true })
    expect(report).toEqual({
      staticCommands: 3,
      uniqueTargets: 2,
      defaultTargets: 1,
      namedTargets: 1,
      unresolvedCommands: 0,
    })
    const entryId = migratedSceneEntryId('s001', namedPos)
    expect(scenes[0]?.entries).toEqual({
      [entryId]: {
        label: '原版落点 (9, -3, 1)',
        pos: namedPos,
      },
    })
    expect(roots[0]?.[0]).toEqual({ kind: 'loadScene', scene: 's001' })
    expect(roots[0]?.[1]).toEqual({ kind: 'loadScene', scene: 's001', entryId })
    const branch = roots[0]?.[2]
    expect(branch?.kind).toBe('branch')
    if (branch?.kind === 'branch')
      expect(branch.then[0]).toEqual({ kind: 'loadScene', scene: 's001', entryId })
  })

  test('id 域只由目标场景与完整坐标决定', () => {
    const pos = { col: 8, row: 6, height: 0 }
    expect(migratedSceneEntryId('s001', pos)).toBe(migratedSceneEntryId('s001', { ...pos }))
    expect(migratedSceneEntryId('s001', pos)).not.toBe(
      migratedSceneEntryId('s001', { ...pos, height: 1 }),
    )
    expect(migratedSceneEntryId('s001', pos)).not.toBe(migratedSceneEntryId('s002', pos))
  })

  test('保留前缀散列碰撞 fail-loud', () => {
    const scenes = [scene('s001', { col: 0, row: 0, height: 0 })]
    const roots: Command[][] = [
      [
        { kind: 'loadScene', scene: 's001', pos: { col: 1, row: 0, height: 0 } },
        { kind: 'loadScene', scene: 's001', pos: { col: 2, row: 0, height: 0 } },
      ],
    ]
    expect(() =>
      normalizeSceneEntryReferences(scenes, roots, {
        strictMissingScene: true,
        idFor: () => `${MIGRATED_SCENE_ENTRY_PREFIX}collision`,
      }),
    ).toThrow(/散列碰撞/)
  })

  test('正式迁移遇到缺失目标场景立即失败，窄切片可保留坐标并报告', () => {
    const roots: Command[][] = [
      [{ kind: 'loadScene', scene: 's404', pos: { col: 1, row: 2, height: 0 } }],
    ]
    expect(() => normalizeSceneEntryReferences([], roots, { strictMissingScene: true })).toThrow(
      /目标场景不在迁移结果/,
    )
    expect(normalizeSceneEntryReferences([], roots)).toMatchObject({ unresolvedCommands: 1 })
    expect(roots[0]?.[0]).toHaveProperty('pos')
  })
})
