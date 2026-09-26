import { describe, expect, it } from 'vitest'
import {
  planSceneMigrationSources,
  type SourceScene,
  sourceAddressFromLabel,
} from './scene-migration-source-plan.js'
import type { SourceCmd } from './source-facts.js'

const command = (value: SourceCmd & { sceneId?: number }): SourceCmd => value
const sourceScene = (
  sceneId: number,
  fields: Omit<SourceScene, 'sceneId' | 'mapNum'>,
): SourceScene => ({ sceneId, mapNum: sceneId, ...fields })

describe('scene migration source planning owner', () => {
  it('normalizes first-seen inputs and owns arrivals, labels, addresses, owners, and roots', () => {
    const sceneZeroCommands = [
      command({ label: 'L_5', op: 'raw', opcode: 70, operands: [1, 2, 1] }),
      command({ op: 'end' }),
      command({ op: 'raw', opcode: 80 }),
      command({ op: 'end' }),
      command({ op: 'loadScene', sceneId: 3 }),
    ]
    const sceneTwoCommands = [
      command({ op: 'raw', opcode: 70, operands: [9, 9, 0] }),
      command({ op: 'end' }),
      command({ op: 'end' }),
      command({ op: 'end' }),
      command({ op: 'end' }),
      command({ op: 'loadScene', sceneId: 2 }),
      command({ op: 'loadScene', sceneId: 3 }),
    ]
    const sharedCommands = [
      command({ label: 'L_5', op: 'raw', opcode: 70, operands: [2, 1, 0] }),
      command({ op: 'loadScene', sceneId: 1 }),
      command({ op: 'loadScene', sceneId: 2 }),
    ]
    const allCommands = [
      command({ op: 'raw', opcode: 70, operands: [0, 0, 0] }),
      command({ label: 'L_1', op: 'loadScene', sceneId: 4 }),
      command({ op: 'end' }),
    ]
    const events = new Map<number, readonly SourceCmd[]>([
      [-4, []],
      [-2, allCommands],
      [-1, sharedCommands],
      [2, sceneTwoCommands],
      [-3, []],
      [0, sceneZeroCommands],
    ])
    const scenes = [
      sourceScene(2, {
        onEnterLabel: 'L_20',
        onTeleportLabel: 'not-an-address',
        eventObjects: [{ id: 7, x: 0, y: 0, spriteNum: 1, autoLabel: 'L_22' }],
      }),
      sourceScene(0, {
        onTeleportLabel: 'L_3',
        eventObjects: [{ id: 3, x: 0, y: 0, spriteNum: 1, triggerLabel: 'L_4' }],
      }),
    ]

    const plan = planSceneMigrationSources(scenes, events)

    expect(plan.orderedScenes.map(({ sceneId }) => sceneId)).toEqual([0, 2])
    expect(plan.orderedEventSources.map(([sceneId]) => sceneId)).toEqual([0, 2, -1, -2, -3, -4])
    expect(plan.arrivals).toEqual(
      new Map([
        [2, [{ src: 0, pos: { col: 4, row: 1, height: 0 } }]],
        [0, [{ src: -1, pos: { col: 3, row: -1, height: 0 } }]],
      ]),
    )
    expect(plan.indexedArrivals).toEqual(new Map([[3, [{ col: 0, row: 0, height: 0 }]]]))
    expect(plan.entriesFound).toBe(2)

    expect(plan.labelAt.get('L_5')).toEqual({ cmds: sceneZeroCommands, idx: 0 })
    expect(plan.labelScene.get('L_5')).toBe('s000')
    expect(plan.labelAt.get('L_0')).toEqual({ cmds: allCommands, idx: 0 })
    expect(plan.labelAt.get('L_2')).toEqual({ cmds: allCommands, idx: 2 })
    expect(plan.explicitLabels).toEqual(new Set(['L_1']))
    expect(plan.addressesByCommands.get(sceneZeroCommands)).toEqual([5, 6, 7, 8, 9])
    expect(plan.addressesByCommands.get(allCommands)).toEqual([0, 1, 2])

    expect(plan.ownerScene).toEqual(
      new Map([
        ['e3', 's000'],
        ['e7', 's002'],
      ]),
    )
    expect(plan.graphRoots).toEqual([
      { entry: 3, owner: 's000', kind: 'scene' },
      { entry: 4, owner: 's000', kind: 'scene' },
      { entry: 20, owner: 's002', kind: 'scene' },
      { entry: 22, owner: 's002', kind: 'scene' },
    ])
  })

  it('rejects an explicit all.json label that disagrees with its array address', () => {
    expect(() =>
      planSceneMigrationSources(
        [],
        new Map([[-2, [command({ op: 'end' }), command({ label: 'L_8', op: 'end' })]]]),
      ),
    ).toThrow('all.json 显式 label 与数组地址不一致: index=1, label=L_8')
  })

  it('parses only terminal numeric source labels', () => {
    expect(sourceAddressFromLabel('L_42')).toBe(42)
    expect(sourceAddressFromLabel('prefix-L_7')).toBe(7)
    expect(sourceAddressFromLabel('L_7-tail')).toBeUndefined()
    expect(sourceAddressFromLabel(undefined)).toBeUndefined()
  })
})
