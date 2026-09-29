/**
 * TEST-GLM-NEW-F-1 F06a：battle-sprite-commands 输入保真与最小 undo/redo。
 * 去重：residual（重复 id/路径占用/enemy profile/换型无索引）、glm-boundaries C03
 * （缺席 no-op、label 补丁、ABI 证明门、Replace 守卫族、Remove/DeleteUnused 三向）、
 * commands-wave2（barrel 同证）已大量钉死；本文件只补其间空隙：
 * apply 期克隆保证调用方输入事后篡改不污染会话与 redo、apply 不改写传入 state（深快照互证）、
 * 真实 EditSession 两命令序列 undo/redo 逐值还原（稳定 ID）、
 * SetEnemyBattleSprite 的 previous 只在首次 apply 捕获。
 */
import type { BattleSpriteDef, EnemyDef } from '@type-pal/content'
import { decodeBattleSpriteAssetBytes } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddBattleSpriteCommand, SetEnemyBattleSpriteCommand } from './battle-sprite-commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { AddEnemyCommand } from './enemy-commands.js'

function loneEnemy(id: string, battleSprite: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite,
    yPosOffset: 0,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 5,
      magicStrength: 0,
      defense: 0,
      dexterity: 5,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}

function enemySpriteDefinition(id: string, asset: string, label: string): BattleSpriteDef {
  return {
    id,
    label,
    asset,
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  }
}

describe('F06 battle-sprite-commands 输入保真与最小 undo/redo', () => {
  test('apply 后篡改调用方输入不污染会话与 redo；apply 不改写传入 state；undo/redo 逐值还原', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-next-fidelity')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const record = structuredClone(state.assetCatalog.assets[starter.asset]!)
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeBattleSpriteAssetBytes(record, bytes)
    const definition = enemySpriteDefinition('ghost-fighter', starter.asset, '幽灵敌人形象')
    const session = new EditSession(state)
    const beforeState = structuredClone(session.getState())
    expect(
      session.dispatch(
        new AddBattleSpriteCommand(definition, record, bytes, decoded.frames.length),
      ),
    ).toBe(true)
    // apply 不改写传入 state：深快照逐值相等。
    expect(structuredClone(state)).toEqual(beforeState)
    // apply 期已克隆入 state：事后篡改调用方 definition/record 不影响会话与 redo。
    definition.label = '篡改标签'
    record.sha256 = 'tampered'
    expect(
      session.getState().battleSprites.find((entry) => entry.id === 'ghost-fighter')?.label,
    ).toBe('幽灵敌人形象')
    expect(session.isDirty()).toBe(true)
    const afterAdd = structuredClone(session.getState())
    expect(session.dispatch(new AddEnemyCommand(loneEnemy('ghost', 'starter-fighter')))).toBe(true)
    const afterAddEnemy = structuredClone(session.getState())
    expect(session.dispatch(new SetEnemyBattleSpriteCommand('ghost', 'ghost-fighter'))).toBe(true)
    expect(session.getState().enemies?.find((entry) => entry.id === 'ghost')?.battleSprite).toBe(
      'ghost-fighter',
    )
    const afterBoth = structuredClone(session.getState())
    // undo ×2：切换与入库各退一步——先回「已入库+敌人未切换」，再回「仅入库」；
    // 共享 starter 资产保留在 catalog（createdAsset=false 语义）。
    expect(session.undo()).toBe(true)
    expect(structuredClone(session.getState())).toEqual(afterAddEnemy)
    expect(session.getState().enemies?.find((entry) => entry.id === 'ghost')?.battleSprite).toBe(
      'starter-fighter',
    )
    expect(session.undo()).toBe(true)
    expect(structuredClone(session.getState())).toEqual(afterAdd)
    expect(session.getState().enemies?.some((entry) => entry.id === 'ghost')).toBe(false)
    expect(session.getState().battleSprites.some((entry) => entry.id === 'ghost-fighter')).toBe(
      true,
    )
    expect(session.getState().assetCatalog.assets[starter.asset]).toBeDefined()
    // redo ×2：稳定 ID 逐值还原到两命令之后的状态，label 仍是 apply 期克隆值。
    expect(session.redo()).toBe(true)
    expect(session.redo()).toBe(true)
    expect(structuredClone(session.getState())).toEqual(afterBoth)
    expect(
      session.getState().battleSprites.find((entry) => entry.id === 'ghost-fighter')?.label,
    ).toBe('幽灵敌人形象')
  })

  test('SetEnemyBattleSprite 的 previous 只在首次 apply 捕获，外部改引用后 invert 仍回最初值', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-next-previous-capture')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const record = structuredClone(state.assetCatalog.assets[starter.asset]!)
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeBattleSpriteAssetBytes(record, bytes)
    let current: EditorState = state
    for (const id of ['ghost-a', 'ghost-b']) {
      current = new AddBattleSpriteCommand(
        enemySpriteDefinition(id, starter.asset, id),
        structuredClone(record),
        bytes,
        decoded.frames.length,
      ).apply(current)
    }
    current = new AddEnemyCommand(loneEnemy('ghost', 'starter-fighter')).apply(current)
    const first = new SetEnemyBattleSpriteCommand('ghost', 'ghost-a')
    const afterFirst = first.apply(current)
    expect(afterFirst.enemies?.[0]?.battleSprite).toBe('ghost-a')
    // 外部把同一敌人又切到另一个引用。
    const external = new SetEnemyBattleSpriteCommand('ghost', 'ghost-b')
    const afterExternal = external.apply(afterFirst)
    expect(afterExternal.enemies?.[0]?.battleSprite).toBe('ghost-b')
    // 首命令的 invert 仍回它捕获的最初值，不是 invert 时刻的当前值。
    const rolled = first.invert(afterExternal)
    expect(rolled.enemies?.[0]?.battleSprite).toBe('starter-fighter')
    // 未 apply 的命令 invert 是 no-op，不臆造 previous。
    const neverApplied = new SetEnemyBattleSpriteCommand('ghost', 'ghost-c')
    expect(neverApplied.invert(afterExternal)).toBe(afterExternal)
  })
})
