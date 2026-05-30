/**
 * dev-panel.test.ts —— applyFixture 战斗 fixture 数据级验证(user 无法在正常游戏里遇到带对话/能升级的战斗,
 * 故 dev fixture 是测试入口)。验证两个新 fixture 真的把功能接上了:
 *   - fixture-dialog(vs 林月如一):敌人 scriptOnTurnStart 设上(战斗内 boss 嘲讽对话能触发)。
 *   - fixture-levelup(lv1 + 1000 经验 vs 灯笼):gs.Exp 设上 + runtime hydrate(打赢触发升级演出)。
 */

import type { Enemy, EnemyObject, EnemyTeam, BattleField, InputSnapshot, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import fixturesData from '../data/battle-fixtures.json' with { type: 'json' }
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, projectRuntimeToBattleRoles } from '../core/game-state.js'
import { tickBattle } from '../core/battle/battle-system.js'
import { confirmCaster, createInGameMagicMenu } from '../core/menu/in-game-magic-menu.js'
import { applyFixture, type BattleFixture, type DevPanelDeps } from './dev-panel.js'

// 真值(level-up-magic.json / spells.json / player-roles.json):
//   role0 李逍遥 base 法术 = 气疗术(296, usableOutsideBattle);lv7 学天师符法(349, 仅战斗),
//   lv10 学凝神归元(298, usableOutsideBattle)。用于验「升级学的大世界法术经 runtime 投影后菜单可见」。
const R0_BASE_MAGIC = [296]
const SPELLS_FIX = [
  { id: 296, _name: '气疗术', magicNumber: 50, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0, flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false } },
  { id: 298, _name: '凝神归元', magicNumber: 52, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0, flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false } },
  { id: 349, _name: '天师符法', magicNumber: 54, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } },
]
const MAGICS_FIX = [
  { id: 50, costMP: 5 }, { id: 52, costMP: 10 }, { id: 54, costMP: 8 },
]
// levelUpMagic[j][roleId] = {level, magic};只填 role0(inner idx 0)列
const LEVELUP_MAGIC_FIX = [
  [{ level: 7, magic: 349 }],
  [{ level: 10, magic: 298 }],
]
// 真 DATA.MKF chunk 14 rgLevelUpExp 前 14 项(够升到 lv12)
const LEVELUP_EXP_FIX = [0, 15, 40, 90, 165, 265, 390, 540, 715, 915, 1140, 1390, 1665, 1965]

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
      // biome-ignore lint/suspicious/noExplicitAny: role0 加 base 法术(气疗术)用于菜单可见性验证
      playerRoles: { roles: [{ ...minimalRole(0), magic: R0_BASE_MAGIC } as any] },
      levelUpExp: LEVELUP_EXP_FIX,
      // biome-ignore lint/suspicious/noExplicitAny: 测试 levelUpMagic / spells / magics 占位真值
      levelUpMagic: LEVELUP_MAGIC_FIX as any,
      // biome-ignore lint/suspicious/noExplicitAny: 占位
      items: [], spells: SPELLS_FIX as any, magics: MAGICS_FIX as any, objectMagics: [], objectPoisons: [],
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

  it('fixture-levelup:gs.Exp 设 6000 + runtime hydrate(lv1/30HP override)→ 打赢能升级', () => {
    const deps = makeDeps()
    applyFixture(deps, levelupFixture)
    expect(deps.gs.mode).toBe('battle')
    // expOverrides → gs.Exp(跨多级阈值,可升到 lv12)
    expect(deps.gs.Exp.rgPrimaryExp[0]!.wExp).toBe(6000)
    expect(deps.gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(1)
    // playerOverrides hydrate 进 runtime(升级 loop 读 runtime)
    expect(deps.gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1)
    expect(deps.gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // override hp 30
    expect(deps.gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(999) // override 一击秒
    // 战斗 roles 经 projection 也吃 override(level 1 / attack 999)
    const battleRole = deps.gs.battleState?.players[0]
    expect(battleRole?.roleId).toBe(0)
  })

  it('fixture-levelup 端到端:applyFixture → 打赢 → 真升级 + 学法术(我之前没测的全流程)', () => {
    const deps = makeDeps()
    applyFixture(deps, levelupFixture)
    const gs = deps.gs
    const bus = createCommandBus()
    const emptyInput: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
    const levelBefore = gs.PlayerRolesRuntime.rgwLevel[0]
    expect(levelBefore).toBe(1)
    // 推进战斗到 selectAction → 队长攻击(atk999 一击秒灯笼)→ won → finalizeBattle → 升级
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    let safety = 80
    while (gs.mode === 'battle' && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('explore') // 战斗结束
    // 真升级(1000 经验跨多级 → ~lv7)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBeGreaterThan(1)
    expect(gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(gs.PlayerRolesRuntime.rgwLevel[0]) // wLevel 同步
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(gs.PlayerRolesRuntime.rgwMaxHP[0]) // 升级满血
  })

  it('fixture-levelup 配置自检:exp 6000 跨多级阈值(lv1→lv12,过 lv10 学大世界法术)', () => {
    // 健全性:6000 经验 + 累计到 lv12=5665 < 6000 < lv13=7330 → 连升到 12 级,过 lv10(凝神归元)
    const exp = (levelupFixture.expOverrides!['0'] as { wExp: number }).wExp
    expect(exp).toBeGreaterThan(3135) // 至少跨过 lv10(学凝神归元 298,大世界可用)
  })

  it('★菜单可见性回归:打赢升到 lv10+ → 大世界仙术菜单出现升级新学的「凝神归元」(298),不再只剩气疗术', () => {
    // user 2026-05-31 实测:dev 升级 fixture 打赢后开仙术菜单只见「气疗术」,看不到学的法术。
    // 根因:菜单读静态 catalog.playerRoles(1 级基线),不读 runtime。修复:投影 gs.PlayerRolesRuntime → roles。
    const deps = makeDeps()
    applyFixture(deps, levelupFixture)
    const gs = deps.gs
    const bus = createCommandBus()
    const emptyInput: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
    // 推进战斗到打赢(atk999 一击秒灯笼)→ finalizeBattle → battleWonLevelUp 升级 + 学法术
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    let safety = 80
    while (gs.mode === 'battle' && safety-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('explore')

    // 1) 升到 ≥ lv10 + battleWonLevelUp 把学的法术写进 runtime.rgwMagic(数据层)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBeGreaterThanOrEqual(10)
    const learnedRt = gs.PlayerRolesRuntime.rgwMagic.map((slot) => slot[0]).filter((x) => x)
    expect(learnedRt).toContain(349) // 天师符法(lv7,仅战斗)
    expect(learnedRt).toContain(298) // 凝神归元(lv10,大世界可用)

    // 2) ★关键回归:大世界仙术菜单经 runtime 投影构造 → 新学的凝神归元(298)可见,
    //    基线气疗术(296)仍在,战斗专用的天师符法(349)被 usableOutsideBattle 过滤掉(忠实 sdlpal)
    const projected = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, deps.resources.playerRoles)
    const magicMenu = createInGameMagicMenu(projected, gs.partyMembers, deps.resources.spells)
    expect(magicMenu.casterMenu.items[0]?.disabled).toBe(false) // 有大世界法术 → caster 可选
    confirmCaster(magicMenu, projected, deps.resources.spells, deps.resources.magics)
    const ids = magicMenu.spellMenu!.items.map((i) => i.id)
    expect(ids).toContain(296) // 气疗术(基线)
    expect(ids).toContain(298) // ★ 凝神归元 — 升级新学,投影后可见(修复前读静态看不到)
    expect(ids).not.toContain(349) // 天师符法 大世界菜单正确过滤
  })
})
