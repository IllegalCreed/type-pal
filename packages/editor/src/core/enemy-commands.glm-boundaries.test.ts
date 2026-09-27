/**
 * TEST-GLM-STATE-COMMANDS-1 B04：enemy-commands 残差。
 * 去重：enemy-commands.test.ts（barrel 身份 + yPosOffset patch/invert + 末尾增）、
 * commands.test.ts「UpdateEnemy:patch ai.rules」「Add/Delete:末尾增,原位删还原」、
 * battle-data-delete-commands.test.ts 六例（引用拒删/原索引/跳过/redo 重验）、
 * battle-sprite-commands.residual.test.ts / command-contract.test.ts 已证引用与合同——
 * 本文件只补冻结池内：缺席表/缺席 id 三向 no-op、apply 显式 undefined 与 invert 删键的
 * 非对称合同、AddEnemy 缺席表追加与构造期快照、DeleteEnemy 二次 apply 首轮快照与缺席表插回。
 */
import { describe, expect, test } from 'vitest'
import {
  baseCommandState,
  deepSnapshot,
  expectInputsUnchanged,
  mkEnemy,
  realRefs,
} from './__tests__/glm-state-commands-b.js'
import type { EnemyPatch } from './enemy-commands.js'
import { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'

const noEnemies: ReturnType<typeof baseCommandState> = (() => {
  const state = baseCommandState()
  delete (state as { enemies?: unknown }).enemies
  return state
})()

describe('B04 enemy-commands 残差', () => {
  test('UpdateEnemy：enemies 缺席与缺席 id apply 原引用', () => {
    const s0 = baseCommandState({ enemies: [mkEnemy('e1')] })
    const missing = new UpdateEnemyCommand('gone', { yPosOffset: 5 })
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.apply(noEnemies)).toBe(noEnemies)
    expectInputsUnchanged(() => missing.apply(noEnemies), [noEnemies])
  })

  test('UpdateEnemy：未 apply invert 原引用；apply 后缺席表/目标消失 invert 原引用', () => {
    const s0 = baseCommandState({ enemies: [mkEnemy('e1')] })
    const cmd = new UpdateEnemyCommand('e1', { yPosOffset: 5 })
    expect(cmd.invert(s0)).toBe(s0)
    const applied = cmd.apply(s0)
    expect(cmd.invert(noEnemies)).toBe(noEnemies)
    const vanished: typeof s0 = { ...applied, enemies: [] }
    expect(cmd.invert(vanished)).toBe(vanished)
  })

  test('UpdateEnemy：原缺席可选键（steal）新增后 undo 整键删除，不残留 phantom', () => {
    const s0 = baseCommandState({ enemies: [mkEnemy('e1')] })
    const patch: EnemyPatch = { steal: { itemId: 'i1', count: 1 } }
    const cmd = new UpdateEnemyCommand('e1', patch)
    const s1 = cmd.apply(s0)
    expect(s1.enemies![0]!.steal).toEqual({ itemId: 'i1', count: 1 })
    const restored = cmd.invert(s1)
    expect('steal' in restored.enemies![0]!).toBe(false)
    expectInputsUnchanged(() => cmd.apply(s0), [s0, patch])
  })

  test('AddEnemy：enemies 缺席追加 + invert 清空；构造期快照——构造后改源敌不泄漏', () => {
    const source = mkEnemy('e9')
    const cmd = new AddEnemyCommand(source)
    source.stats.health = 999
    const s1 = cmd.apply(noEnemies)
    expect(s1.enemies).toHaveLength(1)
    expect(s1.enemies![0]!.stats.health).toBe(10)
    expect(cmd.invert(s1).enemies).toEqual([])
    expectInputsUnchanged(() => cmd.apply(noEnemies), [noEnemies])
  })

  test('DeleteEnemy：enemies 缺席 apply 原引用；未 apply invert 原引用', () => {
    const cmd = new DeleteEnemyCommand('e1', realRefs)
    expect(cmd.apply(noEnemies)).toBe(noEnemies)
    expect(cmd.invert(noEnemies)).toBe(noEnemies)
  })

  test('DeleteEnemy：删除中位敌人按原索引恢复；二次 apply 首轮快照；缺席表 invert 插回', () => {
    const s0 = baseCommandState({ enemies: [mkEnemy('e1'), mkEnemy('e2'), mkEnemy('e3')] })
    const cmd = new DeleteEnemyCommand('e2', realRefs)
    const snap = deepSnapshot(s0)
    const s1 = cmd.apply(s0)
    expect(s1.enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e3'])
    expect(cmd.invert(s1).enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e2', 'e3'])
    const s2 = cmd.apply(s0)
    expect(s2.enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e3'])
    expect(cmd.invert(s2).enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e2', 'e3'])
    const bare: typeof s1 = { ...s1, enemies: undefined }
    expect(cmd.invert(bare).enemies!.map((enemy) => enemy.id)).toEqual(['e2'])
    expect(s0).toEqual(snap)
  })
})
