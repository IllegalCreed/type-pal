/**
 * TEST-GLM-STATE-COMMANDS-1 B04：enemy-commands 残差。
 * 去重：enemy-commands.test.ts（barrel 身份 + yPosOffset patch/invert + 末尾增）、
 * commands.test.ts「UpdateEnemy:patch ai.rules」「Add/Delete:末尾增,原位删还原」、
 * battle-data-delete-commands.test.ts 六例（引用拒删/原索引/跳过/redo 重验）、
 * battle-sprite-commands.residual.test.ts / command-contract.test.ts 已证引用与合同——
 * 本文件只补冻结池内：缺席 id no-op、apply 与 invert 的可选键删键非对称合同、
 * AddEnemy 构造期快照、DeleteEnemy 二次 apply 首轮快照与缺席表插回。业务正例基座为
 * 正式空白项目（保存门自证）；enemies 缺席表的 `?? []` 回退轴属有意缺表防御输入，
 * 单列于文末防御 describe。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  defensiveCommandStateWithout,
  expectInputsUnchanged,
  legalCommandState,
  mkEnemy,
  realRefs,
} from './__tests__/glm-state-commands-b.js'
import type { EnemyPatch } from './enemy-commands.js'
import { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'

describe('B04 enemy-commands 残差', () => {
  test('UpdateEnemy：缺席 id apply 原引用', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const missing = new UpdateEnemyCommand('gone', { yPosOffset: 5 })
    expect(missing.apply(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('UpdateEnemy：未 apply invert 原引用；undo 时目标消失原引用', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const cmd = new UpdateEnemyCommand('e1', { yPosOffset: 5 })
    expect(cmd.invert(s0)).toBe(s0)
    const applied = cmd.apply(s0)
    const vanished: typeof s0 = { ...applied, enemies: [] }
    expect(cmd.invert(vanished)).toBe(vanished)
  })

  test('UpdateEnemy：原缺席可选键（steal）新增后 undo 整键删除，不残留 phantom', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const patch: EnemyPatch = { steal: { itemId: 'i1', count: 1 } }
    const cmd = new UpdateEnemyCommand('e1', patch)
    const s1 = cmd.apply(s0)
    expect(s1.enemies![0]!.steal).toEqual({ itemId: 'i1', count: 1 })
    const restored = cmd.invert(s1)
    expect('steal' in restored.enemies![0]!).toBe(false)
    expectInputsUnchanged(() => cmd.apply(s0), [s0, patch])
  })

  test('AddEnemy：构造期快照——构造后改源敌不泄漏；invert 移除', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const source = mkEnemy('e9')
    const cmd = new AddEnemyCommand(source)
    source.stats.health = 999
    const s1 = cmd.apply(s0)
    expect(s1.enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e9'])
    expect(s1.enemies![1]!.stats.health).toBe(10)
    expect(cmd.invert(s1).enemies!.map((enemy) => enemy.id)).toEqual(['e1'])
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('DeleteEnemy：缺席 id apply 原引用；未 apply invert 原引用（真实引用索引）', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const cmd = new DeleteEnemyCommand('gone', realRefs)
    expect(cmd.apply(s0)).toBe(s0)
    expect(new DeleteEnemyCommand('gone', realRefs).invert(s0)).toBe(s0)
  })

  test('DeleteEnemy：删除中位敌人按原索引恢复；二次 apply 首轮快照', async () => {
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1'), mkEnemy('e2'), mkEnemy('e3')] })
    const cmd = new DeleteEnemyCommand('e2', realRefs)
    const snap = deepSnapshot(s0)
    const s1 = cmd.apply(s0)
    expect(s1.enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e3'])
    expect(cmd.invert(s1).enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e2', 'e3'])
    const s2 = cmd.apply(s0)
    expect(s2.enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e3'])
    expect(cmd.invert(s2).enemies!.map((enemy) => enemy.id)).toEqual(['e1', 'e2', 'e3'])
    expect(s0).toEqual(snap)
  })
})

describe('B04 enemy-commands 防御轴（有意缺表）', () => {
  test('UpdateEnemy：enemies 表缺席 apply/invert 原引用', async () => {
    const bare = await defensiveCommandStateWithout(['enemies'])
    const missing = new UpdateEnemyCommand('gone', { yPosOffset: 5 })
    expect(missing.apply(bare)).toBe(bare)
    expect(new UpdateEnemyCommand('e1', { yPosOffset: 5 }).invert(bare)).toBe(bare)
  })

  test('AddEnemy 与 DeleteEnemy：缺席表追加/插回语义', async () => {
    const bare = await defensiveCommandStateWithout(['enemies'])
    const cmd = new AddEnemyCommand(mkEnemy('e9'))
    const s1 = cmd.apply(bare)
    expect(s1.enemies).toHaveLength(1)
    expect(cmd.invert(s1).enemies).toEqual([])
    const del = new DeleteEnemyCommand('e1', realRefs)
    expect(del.apply(bare)).toBe(bare)
    const s0 = await legalCommandState({ enemies: [mkEnemy('e1')] })
    const removed = del.apply(s0)
    const tableless: typeof s0 = { ...removed, enemies: undefined }
    expect(del.invert(tableless).enemies!.map((enemy) => enemy.id)).toEqual(['e1'])
  })
})
