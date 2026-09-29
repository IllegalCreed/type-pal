/**
 * TEST-GLM-LARGE-WAVE-4 A01（world 对）：makeLoadScene/retargetLoadScene 纯函数合同。
 * 只在现行合法输入上断言字段保全：模式（默认/命名落点/临时坐标）决定携带字段，
 * facing/transition 仅在有值时展开为键；retarget 一律重置为默认落点并保留朝向与过渡时序。
 * 去重：CommandForm.current-scene 已证 loadScene 弹窗交互（16 例）；这里钉住两个导出函数
 * 本身的字段形状，供弹窗之外的回归对照。
 */
import type { LoadSceneCommand, SceneTransitionProfile } from '@type-pal/content'
import { checkCommands } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeLoadScene, retargetLoadScene } from './command-form-world.js'

const sourceTiming: SceneTransitionProfile = {
  kind: 'source',
  outMs: 180,
  inMs: 240,
  color: 'black',
  evidenceId: 'glw:load-scene-timing',
}

describe('makeLoadScene field preservation', () => {
  test('default mode carries only the scene and optional patches', () => {
    const bare = makeLoadScene('other', { mode: 'default' })
    expect(bare).toEqual({ kind: 'loadScene', scene: 'other' })
    const full = makeLoadScene('other', { mode: 'default' }, 'left', sourceTiming)
    expect(full).toEqual({
      kind: 'loadScene',
      scene: 'other',
      facing: 'left',
      transition: sourceTiming,
    })
    checkCommands([full], 'glw.makeLoadScene')
  })

  test('entry mode keeps the named entry and drops position fields', () => {
    const command = makeLoadScene('other', { mode: 'entry', entryId: 'door' }, 'up', sourceTiming)
    expect(command).toEqual({
      kind: 'loadScene',
      scene: 'other',
      entryId: 'door',
      facing: 'up',
      transition: sourceTiming,
    })
    expect('pos' in command).toBe(false)
    checkCommands([command], 'glw.makeLoadScene')
  })

  test('pos mode deep-copies the temporary position so later mutation cannot leak in', () => {
    const pos = { col: 3, row: 5, height: 2 }
    const command = makeLoadScene('other', { mode: 'pos', pos })
    pos.col = 99
    expect(command).toEqual({
      kind: 'loadScene',
      scene: 'other',
      pos: { col: 3, row: 5, height: 2 },
    })
    expect('entryId' in command).toBe(false)
    checkCommands([command], 'glw.makeLoadScene')
  })
})

describe('retargetLoadScene field preservation', () => {
  const expectations: readonly {
    name: string
    input: LoadSceneCommand
    expected: LoadSceneCommand
  }[] = [
    {
      name: 'default target keeps facing and source timing',
      input: {
        kind: 'loadScene',
        scene: 'start',
        facing: 'right',
        transition: sourceTiming,
      },
      expected: { kind: 'loadScene', scene: 'other', facing: 'right', transition: sourceTiming },
    },
    {
      name: 'named entry resets to the default landing without carrying the old entry',
      input: {
        kind: 'loadScene',
        scene: 'start',
        entryId: 'door',
        facing: 'up',
        transition: sourceTiming,
      },
      expected: { kind: 'loadScene', scene: 'other', facing: 'up', transition: sourceTiming },
    },
    {
      name: 'temporary coordinates reset to the default landing without carrying the old pos',
      input: {
        kind: 'loadScene',
        scene: 'start',
        pos: { col: 7, row: 8, height: 1 },
        transition: sourceTiming,
      },
      expected: { kind: 'loadScene', scene: 'other', transition: sourceTiming },
    },
  ]

  test.each(expectations)('$name', ({ input, expected }) => {
    const before = structuredClone(input)
    const next = retargetLoadScene(input, 'other')
    expect(next).toEqual(expected)
    expect('pos' in next && next.pos === input.pos).toBe(false)
    expect(input, 'input was mutated').toEqual(before)
    checkCommands([next], 'glw.retargetLoadScene')
  })
})
