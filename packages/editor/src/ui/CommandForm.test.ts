import { describe, expect, test } from 'vitest'
import { makeLoadScene, retargetLoadScene } from './CommandForm.js'

describe('W4-1 loadScene 编辑器三态', () => {
  test('默认、命名与临时坐标只生成互斥字段', () => {
    expect(makeLoadScene('s001', { mode: 'default' }, 'left')).toEqual({
      kind: 'loadScene',
      scene: 's001',
      facing: 'left',
    })
    expect(makeLoadScene('s001', { mode: 'entry', entryId: 'entry-stairs' })).toEqual({
      kind: 'loadScene',
      scene: 's001',
      entryId: 'entry-stairs',
    })
    expect(makeLoadScene('s001', { mode: 'pos', pos: { col: 3, row: 4, height: 2 } })).toEqual({
      kind: 'loadScene',
      scene: 's001',
      pos: { col: 3, row: 4, height: 2 },
    })
  })

  test.each([
    { kind: 'loadScene' as const, scene: 's001', entryId: 'entry-stairs', facing: 'up' as const },
    {
      kind: 'loadScene' as const,
      scene: 's001',
      pos: { col: 3, row: 4, height: 2 },
      facing: 'up' as const,
    },
  ])('切换目标场景重置为默认落点并保留显式朝向', (command) => {
    expect(retargetLoadScene(command, 's002')).toEqual({
      kind: 'loadScene',
      scene: 's002',
      facing: 'up',
    })
  })
})
