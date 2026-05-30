/**
 * dev-panel.test.ts —— applyFixture 战斗 fixture 数据级验证(user 无法在正常游戏里遇到带对话/能升级的战斗,
 * 故 dev fixture 是测试入口)。验证两个新 fixture 真的把功能接上了:
 *   - fixture-dialog(vs 林月如一):敌人 scriptOnTurnStart 设上(战斗内 boss 嘲讽对话能触发)。
 *   - fixture-levelup(lv1 + 1000 经验 vs 灯笼):gs.Exp 设上 + runtime hydrate(打赢触发升级演出)。
 */

import type { Enemy, EnemyObject, EnemyTeam, BattleField, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import fixturesData from '../data/battle-fixtures.json' with { type: 'json' }
import { createInitialGameState } from '../core/game-state.js'
import { applyFixture, type BattleFixture, type DevPanelDeps } from './dev-panel.js'

function minimalEnemy(id: number, over: Partial<Enemy> = {}): Enemy {
  // biome-ignore lint/suspicious/noExplicitAny: 测试只填 startBattle/createBattleState 用到的字段
  return { id, _name: `e${id}`, health: 30, exp: 1, level: 1, attackStrength: 0, defense: 0, dexterity: 10, physicalResistance: 1, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }, yPosOffset: 0, ...over } as any as Enemy
}
function minimalRole(id: number): PlayerRole {
  // biome-ignore lint/suspicious/noExplicitAny: 测试 role 占位
  return { id, _name: `r${id}`, level: 1, hp: 100, maxHP: 100, mp: 30, maxMP: 30, attackStrength: 5, magicStrength: 5, defense: 5, dexterity: 5, fleeRate: 5, poisonResistance: 0, name: 0, avatar: 0, spriteNumInBattle: id, spriteNum: 0, attackAll: 0, walkFrames: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } } as any as PlayerRole
}

function makeDeps(): DevPanelDeps {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const enemyObjects: EnemyObject[] = [
    // 林月如一(enemyId 82):scriptOnTurnStart=41368(真值,decode 出"让开！！"等嘲讽)
    // biome-ignore lint/suspicious/noExplicitAny: 只填 enemyId + scripts
    { objectIndex: 480, enemyId: 82, scriptOnTurnStart: 41368, scriptOnReady: 0, scriptOnBattleEnd: 0, resistanceToSorcery: 0 } as any,
  ]
  const enemyTeams: EnemyTeam[] = [
    { id: 1, enemies: [2, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF] }, // 灯笼
    { id: 21, enemies: [82, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF] }, // 林月如一
  ]
  const field: BattleField = { id: 7, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } }
  return {
    gs,
    // biome-ignore lint/suspicious/noExplicitAny: 非 applyFixture 用到的 dev-panel 字段占位
    fixtures: { fixtures: [] } as any,
    // biome-ignore lint/suspicious/noExplicitAny: 占位
    sceneJumps: { jumps: [] } as any,
    // biome-ignore lint/suspicious/noExplicitAny: 占位
    sceneAssetsCache: {} as any,
    resources: {
      enemies: [minimalEnemy(2, { _name: '灯笼', health: 30, exp: 1 }), minimalEnemy(82, { _name: '林月如一', health: 600, exp: 200, level: 5 })],
      enemyObjects,
      enemyTeams,
      battleFields: [field],
      playerRoles: { roles: [minimalRole(0)] },
      levelUpExp: [0, 15, 40, 90, 165, 265, 390, 540, 715, 915],
      levelUpMagic: [],
      items: [], spells: [], magics: [], objectMagics: [], objectPoisons: [],
      commands: [{ op: 'end' }],
      // enemyPos undefined → createBattleState 走 fallback 位置表(测试不验位置)
      // biome-ignore lint/suspicious/noExplicitAny: 占位
      enemyPos: undefined as any,
      battleEffectIndex: [],
      magicSpriteFrameCounts: new Map(),
    },
  }
}

const dialogFixture = fixturesData.fixtures.find(f => f.id === 'fixture-dialog')! as unknown as BattleFixture
const levelupFixture = fixturesData.fixtures.find(f => f.id === 'fixture-levelup')! as unknown as BattleFixture

describe('applyFixture —— 对话 / 升级 fixture 数据级验证', () => {
  it('fixture-dialog:敌人 scriptOnTurnStart 设上(林月如一嘲讽能触发,team 21 → enemyId 82 → 41368)', () => {
    const deps = makeDeps()
    applyFixture(deps, dialogFixture)
    expect(deps.gs.mode).toBe('battle')
    expect(deps.gs.battleState?.enemies[0]?.scriptOnTurnStart).toBe(41368) // ← 战斗内对话触发器接上
  })

  it('fixture-levelup:gs.Exp 设 1000 + runtime hydrate(lv1/30HP override)→ 打赢能升级', () => {
    const deps = makeDeps()
    applyFixture(deps, levelupFixture)
    expect(deps.gs.mode).toBe('battle')
    // expOverrides → gs.Exp(接近多级阈值)
    expect(deps.gs.Exp.rgPrimaryExp[0]!.wExp).toBe(1000)
    expect(deps.gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(1)
    // playerOverrides hydrate 进 runtime(升级 loop 读 runtime)
    expect(deps.gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1)
    expect(deps.gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // override hp 30
    expect(deps.gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(999) // override 一击秒
    // 战斗 roles 经 projection 也吃 override(level 1 / attack 999)
    const battleRole = deps.gs.battleState?.players[0]
    expect(battleRole?.roleId).toBe(0)
  })

  it('fixture-levelup 配置自检:exp 1000 跨多级阈值(lv1→~7)', () => {
    // 健全性:1000 经验 + levelUpExp[1..6]=15/40/90/165/265/390 累计 965 < 1000 < +540 → 连升到 7 级附近
    const exp = (levelupFixture.expOverrides!['0'] as { wExp: number }).wExp
    expect(exp).toBeGreaterThan(965) // 至少跨到 lv7
  })
})
