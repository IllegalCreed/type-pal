/**
 * dev-panel.test.ts —— applyFixture 战斗 fixture 数据级验证(user 无法在正常游戏里遇到带对话/能升级的战斗,
 * 故 dev fixture 是测试入口)。验证两个新 fixture 真的把功能接上了:
 *   - fixture-dialog(vs 林月如一):敌人 scriptOnTurnStart 设上(战斗内 boss 嘲讽对话能触发)。
 *   - fixture-levelup(lv1 + 1000 经验 vs 灯笼):gs.Exp 设上 + runtime hydrate(打赢触发升级演出)。
 */

import type { Enemy, EnemyObject, EnemyTeam, BattleField, InputSnapshot, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import fixturesData from './fixtures/battle-fixtures.json' with { type: 'json' }
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, projectRuntimeToBattleRoles } from '../core/game-state.js'
import { tickBattle } from '../core/battle/battle-system.js'
import { confirmCaster, createInGameMagicMenu } from '../core/menu/in-game-magic-menu.js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyBossBattle, applyCustomBattle, applyFixture, BOSS_ROSTER, buildCustomEnemyTeam, computeMagicGrantsByRole, CUSTOM_BATTLE_TEAM_ID, roleMagicsAtLevel, togglePartyMembership, type BattleFixture, type DevPanelDeps } from './dev-panel.js'

// REPO_ROOT:src/dev/ → 上 4 级到仓库根(同 baseline.test.ts pattern,运行时 fs 读 extracted 真值,
//   避免跨 rootDir import json)。data/extracted 缺(没跑 pnpm extract)→ 该 describe skip。
const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(HERE, '../../../../data/extracted/data')
import type { Command, LevelUpMagicEntry, PlayerRoles } from '@type-pal/shared'

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

/** 推进战斗到 explore:D11b 胜利结算演出 active 时按 Confirm 快速翻屏,其余阶段空输入。 */
function driveToExplore(gs: ReturnType<typeof createInitialGameState>, bus: ReturnType<typeof createCommandBus>, max = 400): void {
  const empty: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
  const advance: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }
  let safety = max
  while (gs.mode === 'battle' && safety-- > 0)
    tickBattle(gs, gs.battleState?.settlement ? advance : empty, bus)
}

describe('togglePartyMembership(队伍在队开关:role0 队首常驻)', () => {
  it('role0 队首常驻:toggle 无效(返回原队伍)', () => {
    expect(togglePartyMembership([0, 1], 0)).toEqual([0, 1])
    expect(togglePartyMembership([0], 0)).toEqual([0])
  })
  it('不在队的角色 → 入队(push 末尾站位)', () => {
    expect(togglePartyMembership([0], 2)).toEqual([0, 2])
    expect(togglePartyMembership([0, 1], 4)).toEqual([0, 1, 4])
  })
  it('在队的角色 → 离队(保序移除)', () => {
    expect(togglePartyMembership([0, 1, 2], 1)).toEqual([0, 2])
    expect(togglePartyMembership([0, 3], 3)).toEqual([0])
  })
  it('不 mutate 入参(返回新数组)', () => {
    const orig = [0, 1]
    togglePartyMembership(orig, 2)
    expect(orig).toEqual([0, 1])
  })
})

describe('buildCustomEnemyTeam(自定义战斗:选中敌人 id → 临时 EnemyTeam)', () => {
  it('≤5 敌:pad 到 5 槽(空位 0xFFFF),id = CUSTOM_BATTLE_TEAM_ID', () => {
    const team = buildCustomEnemyTeam([82, 99])
    expect(team.id).toBe(CUSTOM_BATTLE_TEAM_ID)
    expect(team.enemies).toEqual([82, 99, 0xffff, 0xffff, 0xffff])
  })
  it('恰好 5 敌:全填满', () => {
    expect(buildCustomEnemyTeam([1, 2, 3, 4, 5]).enemies).toEqual([1, 2, 3, 4, 5])
  })
  it('超 5 敌:截断到 5(战斗最多 5 敌)', () => {
    expect(buildCustomEnemyTeam([1, 2, 3, 4, 5, 6, 7]).enemies).toEqual([1, 2, 3, 4, 5])
  })
  it('空选:全 0xFFFF', () => {
    expect(buildCustomEnemyTeam([]).enemies).toEqual([0xffff, 0xffff, 0xffff, 0xffff, 0xffff])
  })
  it('重复敌人(5 个同种怪):不去重,原样填槽(user 2026-06-05 要按空位填充, 允许重复)', () => {
    expect(buildCustomEnemyTeam([15, 15, 15]).enemies).toEqual([15, 15, 15, 0xffff, 0xffff])
    expect(buildCustomEnemyTeam([2, 2, 2, 2, 2]).enemies).toEqual([2, 2, 2, 2, 2])
  })
})

describe('computeMagicGrantsByRole(全局脚本 0x55 addMagic 剧情/法宝授予)', () => {
  // OP_ADD_MAGIC=0x55=85。operands=[magicId, roleArg];roleArg!=0 → role=roleArg-1 fixed(script.c:1816)。
  const cmds: Command[] = [
    { op: 'raw', opcode: 0x55, operands: [201, 1, 0] }, // role0 授 magic 201
    { op: 'raw', opcode: 0x55, operands: [202, 1, 0] }, // role0 授 magic 202
    { op: 'raw', opcode: 0x55, operands: [203, 3, 0] }, // role2 授 magic 203(roleArg 3 → role2)
    { op: 'raw', opcode: 0x55, operands: [999, 0, 0] }, // roleArg=0 dynamic → 跳过
    { op: 'end' },
  ] as unknown as Command[]
  it('按 role 聚合授予法术(roleArg-1),roleArg=0 跳过', () => {
    const grants = computeMagicGrantsByRole(cmds)
    expect([...(grants.get(0) ?? [])].sort((a, b) => a - b)).toEqual([201, 202])
    expect([...(grants.get(2) ?? [])]).toEqual([203])
    expect(grants.has(-1)).toBe(false) // roleArg=0 不产生 role -1
  })
})

describe('roleMagicsAtLevel(仙术按等级:起手 + 升级习得 entry.level<=level + 授予)', () => {
  const playerRoles = { roles: [{ id: 0, magic: [296, 0, 0] }] } as unknown as PlayerRoles
  // levelUpMagic[row][roleId]:role0 列 — lv7 学 349、lv10 学 298
  const levelUpMagic = [
    [{ level: 7, magic: 349 }],
    [{ level: 10, magic: 298 }],
  ] as unknown as LevelUpMagicEntry[][]
  const grantsByRole = new Map<number, Set<number>>([[0, new Set([500])]])

  it('level=5:只起手 296 + 授予 500(7/10 级法术未到等级)', () => {
    const m = roleMagicsAtLevel({ playerRoles, levelUpMagic, grantsByRole, roleId: 0, level: 5 })
    expect(m.sort((a, b) => a - b)).toEqual([296, 500])
  })
  it('level=7:起手 296 + lv7 学的 349 + 授予 500(lv10 的 298 未到)', () => {
    const m = roleMagicsAtLevel({ playerRoles, levelUpMagic, grantsByRole, roleId: 0, level: 7 })
    expect(m.sort((a, b) => a - b)).toEqual([296, 349, 500])
  })
  it('level=99:全学(296/349/298 + 授予 500)', () => {
    const m = roleMagicsAtLevel({ playerRoles, levelUpMagic, grantsByRole, roleId: 0, level: 99 })
    expect(m.sort((a, b) => a - b)).toEqual([296, 298, 349, 500])
  })
  it('去重:起手与授予同 id 不重复', () => {
    const g = new Map<number, Set<number>>([[0, new Set([296])]]) // 授予 296 = 起手已有
    const m = roleMagicsAtLevel({ playerRoles, levelUpMagic: [], grantsByRole: g, roleId: 0, level: 1 })
    expect(m).toEqual([296])
  })
})

describe('applyCustomBattle(自定义战斗:临时 team + 按 level 仙术 + 全道具)', () => {
  it('选敌 + 队员 + level=7 + 全道具 → 临时 team 90000 启战 / 仙术按等级 / 道具×99', () => {
    const deps = makeDeps()
    // biome-ignore lint/suspicious/noExplicitAny: 测全道具用最小 item 占位
    deps.resources.items = [{ id: 10 } as any, { id: 11 } as any]
    applyCustomBattle(deps, { enemyIds: [82, 2], partyMembers: [0], level: 7, allItems: true }, 42)
    // 临时 team(id 90000)推入 enemyTeams,pad 0xFFFF
    const team = deps.resources.enemyTeams.find((t) => t.id === CUSTOM_BATTLE_TEAM_ID)
    expect(team?.enemies).toEqual([82, 2, 0xffff, 0xffff, 0xffff])
    // 启战,敌人 = 选中两只
    expect(deps.gs.mode).toBe('battle')
    expect(deps.gs.battleState?.enemies.map((e) => e.e.id).sort((a, b) => a - b)).toEqual([2, 82])
    // role0 level=7 override + 仙术按等级(起手 296 + lv7 学 349;lv10 的 298 未到)
    expect(deps.resources.playerRoles.roles[0]!.level).toBe(7)
    expect((deps.resources.playerRoles.roles[0] as unknown as { magic: number[] }).magic.sort((a, b) => a - b)).toEqual([296, 349])
    // 全道具 ×99
    expect(deps.gs.inventory.map((e) => ({ itemId: e.itemId, count: e.count }))).toEqual([
      { itemId: 10, count: 99 },
      { itemId: 11, count: 99 },
    ])
  })

  it('再开一次:旧临时 team 被替换不堆积(filter id===90000 + push)', () => {
    const deps = makeDeps()
    applyCustomBattle(deps, { enemyIds: [82], partyMembers: [0], level: 1, allItems: false }, 42)
    applyCustomBattle(deps, { enemyIds: [2], partyMembers: [0], level: 1, allItems: false }, 42)
    const temps = deps.resources.enemyTeams.filter((t) => t.id === CUSTOM_BATTLE_TEAM_ID)
    expect(temps).toHaveLength(1) // 不堆积
    expect(temps[0]!.enemies[0]).toBe(2) // 后一次的敌人
    expect(deps.gs.battleState?.enemies.map((e) => e.e.id)).toEqual([2])
  })

  it('allItems=false → inventory 空', () => {
    const deps = makeDeps()
    // biome-ignore lint/suspicious/noExplicitAny: 占位
    deps.resources.items = [{ id: 10 } as any]
    applyCustomBattle(deps, { enemyIds: [82], partyMembers: [0], level: 1, allItems: false }, 42)
    expect(deps.gs.inventory).toEqual([])
  })

  it('重复敌人 → 战斗含多个同种怪实例(user 2026-06-05:5 个同种怪)', () => {
    const deps = makeDeps()
    applyCustomBattle(deps, { enemyIds: [82, 82, 82], partyMembers: [0], level: 1, allItems: false }, 42)
    expect(deps.gs.mode).toBe('battle')
    expect(deps.gs.battleState?.enemies.map((e) => e.e.id)).toEqual([82, 82, 82]) // 3 个独立同种实例
  })

  // 自动战斗(sdlpal 0x8A fAutoBattle,全游戏唯一 t37 石长老·单挑):AI 整场控我方 force-pick 法术/物理。
  //   user 2026-06-05 求 devpanel 用例试自动战斗。createBattleState 从 gs.fAutoBattle seed(battle-state.ts:685)。
  it('autoBattle=true → gs.fAutoBattle 置位 + 战斗 fAutoBattle 生效(AI 控我方)', () => {
    const deps = makeDeps()
    applyCustomBattle(deps, { enemyIds: [82], partyMembers: [0], level: 99, allItems: false, autoBattle: true }, 42)
    expect(deps.gs.fAutoBattle).toBe(true)
    expect(deps.gs.battleState?.fAutoBattle).toBe(true)
  })
  it('autoBattle 缺省/false → fAutoBattle 关(正常手动战斗)', () => {
    const deps = makeDeps()
    applyCustomBattle(deps, { enemyIds: [82], partyMembers: [0], level: 99, allItems: false }, 42)
    expect(deps.gs.battleState?.fAutoBattle).toBe(false)
  })
})

// BOSS_ROSTER 数据接地回归:每个 boss 的 teamId/enemyId 必须对得上真 enemy-teams.json / enemies.json,
//   防未来手改 roster 引入 typo(2026-06-05 byte-level 核过当时全 18 条;此测固化)。extracted 缺 → skip。
const hasExtracted = existsSync(resolve(DATA_DIR, 'enemy-teams.json')) && existsSync(resolve(DATA_DIR, 'enemies.json'))
;(hasExtracted ? describe : describe.skip)('BOSS_ROSTER 数据接地(enemy-teams.json / enemies.json 真值核对)', () => {
  // biome-ignore lint/suspicious/noExplicitAny: 真 json 结构
  const teams: any[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'enemy-teams.json'), 'utf-8'))
  // biome-ignore lint/suspicious/noExplicitAny: 真 json 结构
  const enemies: any[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'enemies.json'), 'utf-8'))

  it('每条 boss:teamId 存在 / enemyId 有名字 / 代表敌人确在该 team 内', () => {
    for (const boss of BOSS_ROSTER) {
      const team = teams.find((t) => t.id === boss.teamId)
      expect(team, `teamId ${boss.teamId}(${boss.label})不存在于 enemy-teams.json`).toBeDefined()
      const enemy = enemies.find((e) => e.id === boss.enemyId)
      expect(enemy?._name, `enemyId ${boss.enemyId}(${boss.label})无名字`).toBeTruthy()
      // 代表敌人必须确在该 team 的 slot 里(防 teamId/enemyId 配错对)
      expect(team.enemies.includes(boss.enemyId), `${boss.label}:enemy ${boss.enemyId} 不在 team ${boss.teamId} 内`).toBe(true)
    }
  })

  it('teamId 不重复(同一战不列两次)', () => {
    const ids = BOSS_ROSTER.map((b) => b.teamId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('applyBossBattle(剧情 boss 战:真 boss team + god-mode 队伍)', () => {
  it('teamId=21 + members=[0] → 起真 team 21(林月如一)战 / 队伍 god-mode lv99 全仙术 / 全道具', () => {
    const deps = makeDeps()
    // biome-ignore lint/suspicious/noExplicitAny: 占位
    deps.resources.items = [{ id: 10 } as any]
    applyBossBattle(deps, 21, { members: [0] })
    expect(deps.gs.mode).toBe('battle')
    // 真 boss team 21(非临时 90000)→ 林月如一(82)
    expect(deps.gs.battleState?.enemies.map((e) => e.e.id)).toEqual([82])
    expect(deps.resources.enemyTeams.some((t) => t.id === CUSTOM_BATTLE_TEAM_ID)).toBe(false) // 不建临时 team
    // god-mode:level 99 + 全仙术(起手 296 + 升级 349/298 全学)+ 全道具
    expect(deps.resources.playerRoles.roles[0]!.level).toBe(99)
    expect((deps.resources.playerRoles.roles[0] as unknown as { magic: number[] }).magic.sort((a, b) => a - b)).toEqual([296, 298, 349])
    expect(deps.gs.inventory.map((e) => e.itemId)).toEqual([10])
  })
})

describe('applyFixture —— 对话 / 升级 fixture 数据级验证', () => {
  it('fixture-dialog:敌人 scriptOnTurnStart 设上(林月如一嘲讽能触发,team 21 → enemyId 82 → 41368)', () => {
    const deps = makeDeps()
    applyFixture(deps, dialogFixture, 42)
    expect(deps.gs.mode).toBe('battle')
    expect(deps.gs.battleState?.enemies[0]?.scriptOnTurnStart).toBe(41368) // ← 战斗内对话触发器接上
  })

  it('fixture-levelup:gs.Exp 设 6000 + runtime hydrate(lv1/30HP override)→ 打赢能升级', () => {
    const deps = makeDeps()
    applyFixture(deps, levelupFixture, 42)
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
    applyFixture(deps, levelupFixture, 42)
    const gs = deps.gs
    const bus = createCommandBus()
    const emptyInput: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
    const levelBefore = gs.PlayerRolesRuntime.rgwLevel[0]
    expect(levelBefore).toBe(1)
    // 推进战斗到 selectAction → 队长攻击(atk999 一击秒灯笼)→ won → finalizeBattle → 升级
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    driveToExplore(gs, bus)
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
    applyFixture(deps, levelupFixture, 42)
    const gs = deps.gs
    const bus = createCommandBus()
    const emptyInput: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
    // 推进战斗到打赢(atk999 一击秒灯笼)→ finalizeBattle → battleWonLevelUp 升级 + 学法术
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    driveToExplore(gs, bus)
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

  it('★结算演出序列:打赢建 settlement screens —— exp-cash → 升级 box(lv1→12 / 8 属性 old→cur)→ 练成屏', () => {
    const deps = makeDeps()
    applyFixture(deps, levelupFixture, 42)
    const gs = deps.gs
    const bus = createCommandBus()
    const emptyInput: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    // 推进到 won 首 tick(buildBattleWonSettlement 建 screens),capture 前不让 driveToExplore 消费掉
    let safety = 100
    while (gs.mode === 'battle' && !gs.battleState?.settlement && safety-- > 0)
      tickBattle(gs, emptyInput, bus)
    const settlement = gs.battleState?.settlement
    expect(settlement).toBeDefined()
    const screens = settlement!.screens

    // 1) 首屏 = Phase A exp/cash(expGained = 灯笼 exp 1,本场所得;6000 是既有累积,不计本屏)
    expect(screens[0]).toMatchObject({ kind: 'exp-cash', expGained: 1 })

    // 2) Phase B 升级 box(role0 lv1 → lv12,8 属性 old→cur)
    // biome-ignore lint/suspicious/noExplicitAny: union narrowing
    const lv = screens.find((s) => s.kind === 'level-up') as any
    expect(lv).toBeDefined()
    expect(lv.data.level).toEqual({ old: 1, cur: 12 })
    expect(lv.data.hp.old).toBe(30) // 入战满血 30(一击秒未受伤)→ old
    expect(lv.data.hp.oldMax).toBe(30)
    expect(lv.data.hp.cur).toBe(lv.data.hp.curMax) // 升级满血
    expect(lv.data.defense.cur).toBeGreaterThan(lv.data.defense.old) // 升 11 级 → 防御涨(base 5 起)

    // 3) Phase D 练成屏:天师符法(349)+ 凝神归元(298)各一屏
    const learned = screens
      .filter((s) => s.kind === 'learn-magic')
      // biome-ignore lint/suspicious/noExplicitAny: union narrowing
      .map((s) => (s as any).data.magicName)
    expect(learned).toContain('天师符法')
    expect(learned).toContain('凝神归元')
  })
})
