import type { Command, ScriptStage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { unchanged } from './__tests__/pure-migration-fixtures.js'
import { raw, translation } from './__tests__/translation-fixtures.js'
import {
  bakeAndStripBattleCfg,
  bindScriptStageInstructionOutcomeBody,
  foldDoorPattern,
  foldStages,
  scriptStageSourceAddresses,
  structuredCloneWithScriptStageSourceAddressAudit,
} from './translate-events.js'

describe('current translation fold boundaries', () => {
  test('real loadScene source evidence becomes a bounded transition and never leaks the private address', () => {
    const f = translation([
      { op: 'loadScene', sceneId: 2 },
      raw(0x46, [1, 2, 1]),
      raw(0x8c, [0, 2, 0]),
      raw(0x09, [3]),
    ])
    const stages = f.run('e3')
    const folded = unchanged(stages, foldStages)
    expect(folded).toEqual([
      {
        body: [
          {
            kind: 'loadScene',
            scene: 's001',
            pos: { col: 4, row: 1, height: 0 },
            transition: {
              kind: 'source',
              outMs: 1280,
              inMs: 600,
              color: 'black',
              evidenceId: 'pal-load-scene-100',
            },
          },
          { kind: 'wait', ms: 120 },
        ],
      },
    ])
    expect(JSON.stringify(folded)).not.toContain('__palSourceAddress')
    expect(scriptStageSourceAddresses(folded[0]!)).toEqual([100, 101, 102, 103, 104])
  })

  test('canonical load without source evidence does not manufacture a source transition', () => {
    const commands: Command[] = [
      { kind: 'loadScene', scene: 's001' },
      { kind: 'fade', dir: 'out', ms: 400 },
    ]
    expect(unchanged(commands, foldDoorPattern)).toEqual([{ kind: 'loadScene', scene: 's001' }])
  })

  test('reverse position is absorbed across a fade but not across a wait', () => {
    const position = { col: 4, row: 1, height: 0 }
    const commands: Command[] = [
      { kind: 'teleportParty', pos: position, facing: 'left' },
      { kind: 'fade', dir: 'in', ms: 300 },
      { kind: 'loadScene', scene: 's001' },
    ]
    expect(unchanged(commands, foldDoorPattern)).toEqual([
      { kind: 'fade', dir: 'in', ms: 300 },
      { kind: 'loadScene', scene: 's001', pos: position, facing: 'left' },
    ])
    const blocked: Command[] = [commands[0]!, { kind: 'wait', ms: 40 }, commands[2]!]
    expect(unchanged(blocked, foldDoorPattern)).toEqual(blocked)
  })

  test('existing position and facing are not overwritten and third-offset teleport stays separate', () => {
    const a = { col: 4, row: 1, height: 0 },
      b = { col: 2, row: 0, height: 0 }
    const fixed: Command[] = [
      { kind: 'loadScene', scene: 's001', pos: a, facing: 'up' },
      { kind: 'teleportParty', pos: b, facing: 'left' },
    ]
    expect(unchanged(fixed, foldDoorPattern)).toEqual(fixed)
    const authoredFacing: Command[] = [
      { kind: 'loadScene', scene: 's001', facing: 'up' },
      { kind: 'teleportParty', pos: b, facing: 'left' },
    ]
    expect(unchanged(authoredFacing, foldDoorPattern)).toEqual([
      { kind: 'loadScene', scene: 's001', pos: b, facing: 'up' },
    ])
    const window: Command[] = [
      { kind: 'loadScene', scene: 's001' },
      { kind: 'fade', dir: 'out' },
      { kind: 'fade', dir: 'out' },
      { kind: 'teleportParty', pos: b },
    ]
    expect(unchanged(window, foldDoorPattern)).toEqual([
      { kind: 'loadScene', scene: 's001' },
      { kind: 'teleportParty', pos: b },
    ])
  })

  test('folding does not cross stage boundaries and audit reads are defensive copies', () => {
    const f = translation([
      { op: 'loadScene', sceneId: 2 },
      { op: 'end', advance: true },
      raw(0x46, [1, 2, 1]),
    ])
    const stages = f.run('e3')
    const folded = unchanged(stages, foldStages)
    expect(folded).toEqual([
      { body: [{ kind: 'loadScene', scene: 's001' }], next: 'advance' },
      { body: [{ kind: 'teleportParty', pos: { col: 4, row: 1, height: 0 } }] },
    ])
    const addresses = scriptStageSourceAddresses(folded[0]!)
    addresses.push(999)
    expect(scriptStageSourceAddresses(folded[0]!)).toEqual([100, 101])
    expect(scriptStageSourceAddresses({})).toEqual([])
  })

  test('baking and nested clone preserve nonserialized audit identity and reject rebinding to a different body', () => {
    const f = translation([raw(0x4a, [2]), raw(0x45, [0]), raw(0x09, [2])])
    const stages = f.run('e3')
    const acc: { battleFieldId?: number; battleMusic?: string | null } = {}
    const baked = unchanged(stages, (input) => bakeAndStripBattleCfg(input, acc))
    expect(acc).toEqual({ battleFieldId: 2, battleMusic: null })
    expect(baked).toEqual([{ body: [{ kind: 'wait', ms: 80 }] }])
    const tree = { scenes: [{ stages: baked }], empty: null, label: 'root' }
    const copy = unchanged(tree, structuredCloneWithScriptStageSourceAddressAudit)
    const clone: ScriptStage = copy.scenes[0]!.stages[0]!
    expect(clone).not.toBe(baked[0])
    expect(scriptStageSourceAddresses(clone)).toEqual([100, 101, 102, 103])
    bindScriptStageInstructionOutcomeBody(clone, 'scene/s001/root')
    expect(
      f.ctx.report.instructionOutcomes.every((outcome) => outcome.bodyId === 'scene/s001/root'),
    ).toBe(true)
    expect(f.ctx.report.instructionOutcomes).toHaveLength(4)
    expect(() => bindScriptStageInstructionOutcomeBody(baked[0]!, 'scene/s001/root')).not.toThrow()
    expect(() => bindScriptStageInstructionOutcomeBody(clone, 'scene/s001/other')).toThrow(
      'instruction outcome body 冲突',
    )
    clone.body.push({ kind: 'wait', ms: 9 })
    expect(tree.scenes[0]!.stages[0]!.body).toEqual([{ kind: 'wait', ms: 80 }])
    expect(JSON.stringify(tree)).not.toContain('sourceAddress')
  })
})
