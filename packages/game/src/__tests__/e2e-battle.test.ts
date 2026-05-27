/**
 * E2E battle test —— M3 T30 收尾。
 *
 * 跑通的链路:
 *   load real `data/extracted/` 资源
 *   → createInitialGameState
 *   → startBattle(模拟 dev panel applyFixture,enemyTeamId=1 = 1 只灯笼 / battleFieldId=0)
 *   → tickN 推 phase preBattle → selectAction → 每回合填 pendingActions = attack(target=0)
 *   → 战斗 won
 *   → 验证 gs.mode='explore' + battleState=undefined + exp 累积 + cash 累积
 *
 * 注:
 *  - 用 M2 `tickN` headless 主循环(无 RAF),frame 数靠 maxTicks 上限保护。
 *  - rngSeed 固定 → 确定性;但 b1-easy baseline 已证明纯物理攻击在 deterministic
 *    seed 下能秒杀弱怪,本测试沿用同思路。
 *  - 若 data/extracted/ 缺(dev 没跑 `pnpm extract`)→ skip,不阻塞 pnpm check。
 *
 * **Bug 1 / Bug 2 修复后** 的验证(M3.30 implementation discovery):
 *  - enemy-teams.json 槽位现为 enemies.json id,运行时 enemies.find 命中
 *    → enemy 真出现在 BattleState.enemies(本测试 expect 长度 > 0)。
 *  - battle-sprite-player-0(李逍遥)产物存在(本测试不直接渲染,只验数据链路)。
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  PlayerRoles,
  Spell,
  Tilemap,
} from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleAction } from '../core/battle/battle-state.js'
import { startBattle, tickBattle } from '../core/battle/battle-system.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, type GameState } from '../core/game-state.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// .../packages/game/src/__tests__ → repo root(上 4 层)
const REPO_ROOT = resolve(HERE, '../../../..')
const DATA_DIR = resolve(REPO_ROOT, 'data/extracted/data')
const EVENTS_DIR = resolve(REPO_ROOT, 'data/extracted/events')

interface E2EResourceLoad {
  enemies: Enemy[]
  enemyTeams: EnemyTeam[]
  battleFields: BattleField[]
  playerRoles: PlayerRoles
  items: Item[]
  spells: Spell[]
  magics: Magic[]
  commands: Command[]
}

function tryLoadResources(): E2EResourceLoad | undefined {
  const needed = [
    'enemies.json',
    'enemy-teams.json',
    'battle-fields.json',
    'player-roles.json',
    'items.json',
    'spells.json',
    'magic.json',
  ]
  for (const f of needed) {
    if (!existsSync(resolve(DATA_DIR, f))) return undefined
  }
  // commands(objects.json)可能为空数组也无所谓,attack 不需要 scriptOnUse
  let commands: Command[] = []
  const objPath = resolve(EVENTS_DIR, 'objects.json')
  if (existsSync(objPath)) {
    try {
      const j = JSON.parse(readFileSync(objPath, 'utf-8'))
      if (Array.isArray(j.segments) && j.segments[0]?.commands) {
        commands = j.segments[0].commands
      }
    } catch {
      // 解析失败也无所谓 attack-only 路径
    }
  }
  return {
    enemies: JSON.parse(readFileSync(resolve(DATA_DIR, 'enemies.json'), 'utf-8')),
    enemyTeams: JSON.parse(readFileSync(resolve(DATA_DIR, 'enemy-teams.json'), 'utf-8')),
    battleFields: JSON.parse(readFileSync(resolve(DATA_DIR, 'battle-fields.json'), 'utf-8')),
    playerRoles: JSON.parse(readFileSync(resolve(DATA_DIR, 'player-roles.json'), 'utf-8')),
    items: JSON.parse(readFileSync(resolve(DATA_DIR, 'items.json'), 'utf-8')),
    spells: JSON.parse(readFileSync(resolve(DATA_DIR, 'spells.json'), 'utf-8')),
    magics: JSON.parse(readFileSync(resolve(DATA_DIR, 'magic.json'), 'utf-8')),
    commands,
  }
}

/** dev panel applyFixture 等价物 —— mutate playerRoles + 设 partyMembers + startBattle。 */
function applyDevFixture(
  gs: GameState,
  res: E2EResourceLoad,
  fixture: {
    partyMembers: number[]
    enemyTeamId: number
    battleFieldId: number
    playerOverrides?: Record<number, Partial<Record<string, number>>>
    inventory?: { itemId: number; count: number }[]
    rngSeed?: number
  },
): void {
  for (const [idStr, override] of Object.entries(fixture.playerOverrides ?? {})) {
    const id = Number(idStr)
    const role = res.playerRoles.roles[id]
    if (role) Object.assign(role, override)
  }
  gs.partyMembers = [...fixture.partyMembers]
  gs.inventory = (fixture.inventory ?? []).map((i) => ({ ...i }))
  startBattle({
    gs,
    enemyTeamId: fixture.enemyTeamId,
    battleFieldId: fixture.battleFieldId,
    isBoss: false,
    enemies: res.enemies,
    enemyTeams: res.enemyTeams,
    battleFields: res.battleFields,
    playerRoles: res.playerRoles,
    items: res.items,
    spells: res.spells,
    magics: res.magics,
    commands: res.commands,
    rngSeed: fixture.rngSeed ?? 42,
  })
}

const EMPTY_INPUT: InputSnapshot = {
  held: new Set(),
  pressed: new Set(),
  frameNum: 0,
}

const _ignoreTilemap: Tilemap = {
  width: 1,
  height: 1,
  cells: [[{ lower: 0, upper: 0 }]],
  tilesetImage: '',
}
void _ignoreTilemap // 防 lint:测试不 setSceneContext,直接调 tickBattle

describe('M3 E2E:战斗 won 链路(attack-only,deterministic seed)', () => {
  const resources = tryLoadResources()

  if (!resources) {
    it.skip('data/extracted/ 缺 —— 先跑 pnpm extract', () => {})
    return
  }

  it('startBattle(enemyTeamId=1, 1 只灯笼) → 多回合 attack → won + exp/cash 入账 + mode=explore', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })

    // fixture 类似 battle-fixtures.json 中的 fixture-zh1(队长 lv10 vs 弱怪)
    applyDevFixture(gs, resources, {
      partyMembers: [0],
      enemyTeamId: 1, // [灯笼](b1-easy 用 enemyTeamId=1,1 只灯笼)
      battleFieldId: 0,
      playerOverrides: {
        0: {
          level: 10,
          hp: 200,
          maxHP: 200,
          mp: 30,
          maxMP: 30,
          attackStrength: 100,
          defense: 50,
          dexterity: 50,
        },
      },
      rngSeed: 42,
    })

    expect(gs.mode).toBe('battle')
    expect(gs.battleState).toBeDefined()
    // Bug 1 修复后 enemy-teams.json 槽位是 enemies.json id,enemies 真展开
    expect(gs.battleState!.enemies.length).toBeGreaterThan(0)
    expect(gs.battleState!.players).toHaveLength(1)

    const bus = createCommandBus()
    const MAX_TICKS = 600 // ≈ 24s @ 25fps,足够秒杀单只弱怪
    const ATTACK_TARGET_0: BattleAction = { type: 'attack', target: 0 }

    for (let i = 0; i < MAX_TICKS; i++) {
      // 战斗结束 → 跳出
      if (gs.mode !== 'battle') break

      const state = gs.battleState
      if (state && state.phase === 'selectAction') {
        // 程序化填 pendingActions:每个活队员都打 enemy 0(若 enemy 0 死,顺位打下一个)
        const targetIdx = state.enemies.findIndex((e) => e.e.health > 0)
        if (targetIdx < 0) {
          // 全死了:不填 action,等 phase 转;以防万一
        }
        else {
          state.players.forEach((p, i) => {
            const role = resources.playerRoles.roles[p.roleId]
            if (role && role.hp > 0 && !state.pendingActions.has(i)) {
              state.pendingActions.set(i, { type: 'attack', target: targetIdx })
            }
          })
        }
      }

      tickBattle(gs, EMPTY_INPUT, bus)
      bus.drain()
    }

    // 战斗结束验证
    expect(gs.mode, '应回到 explore 模式').toBe('explore')
    expect(gs.battleState, 'battleState 应清空').toBeUndefined()

    // M5.B-w1.c:exp/cash 入账走 gs.Exp.rgPrimaryExp + gs.dwCash 真 schema
    expect(gs.Exp.rgPrimaryExp[0]?.wExp ?? 0, 'won 应给 leader exp').toBeGreaterThan(0)
    expect(gs.dwCash, 'won 应累 cash').toBeGreaterThan(0)
    // 防御性 — 队长不应在 lost 路径(M3 lost 时 hp=1 兜底)
    const leader = resources.playerRoles.roles[0] as unknown as Record<string, number>
    expect(leader.hp).toBeGreaterThan(0)

    // 兜底 — ATTACK_TARGET_0 引用避免 lint unused
    void ATTACK_TARGET_0
  }, 30_000) // 30s 测试超时充足

  it('flee 路径:fixture-fast-flee + 强 fleeRate → 数回合后 fleed + mode=explore + 无 exp 奖励', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })

    // 重置 exp/cash(前一个测试 mutate 了 gs.Exp / gs.dwCash 但 createInitialGameState
    // 已新建,无需 reset。leader 引用保留供后续断言。)
    const leader = resources.playerRoles.roles[0] as unknown as Record<string, number>
    void leader

    applyDevFixture(gs, resources, {
      partyMembers: [0],
      enemyTeamId: 1, // 1 只灯笼
      battleFieldId: 0,
      playerOverrides: {
        0: {
          level: 10,
          hp: 200,
          maxHP: 200,
          mp: 30,
          maxMP: 30,
          // fleeRate 远高于敌方 dex 期望值 → 大概率第一次 flee 就成
          fleeRate: 9999,
          dexterity: 100,
        },
      },
      rngSeed: 7,
    })

    expect(gs.mode).toBe('battle')

    const bus = createCommandBus()

    for (let i = 0; i < 200; i++) {
      if (gs.mode !== 'battle') break
      const state = gs.battleState
      if (state && state.phase === 'selectAction') {
        state.players.forEach((p, idx) => {
          const role = resources.playerRoles.roles[p.roleId]
          if (role && role.hp > 0 && !state.pendingActions.has(idx)) {
            state.pendingActions.set(idx, { type: 'flee', target: -1 })
          }
        })
      }
      tickBattle(gs, EMPTY_INPUT, bus)
      bus.drain()
    }

    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    // fleed:无 exp / cash 奖励(finalize 走 fleed 分支)
    expect(gs.Exp.rgPrimaryExp[0]?.wExp ?? 0).toBe(0)
    expect(gs.dwCash).toBe(0)
  }, 30_000)
})
