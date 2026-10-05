/**
 * TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1：battle-session 敌逃残余合同（BCS-6）。
 * 排重边界：
 * - choreography fleeBattle → requestTerminal('enemyFled') = terminal-flows 既有
 *   「enemyFled：敌经 turnStart hook fleeBattle 真实逃跑」（不同 caller：脚本终局登记）；
 * - 本文件证的是 AI 规则 fleeAll → core enemyFled + 会话 observeCorePhase 映射的
 *   公开 done 回执链（battle-session.ts:1108-1109），既有零覆盖；
 * - 玩家逃跑终局分配 = battle-host.finalization BF-10；不重复。
 * 会话构造镜像 flow-residual（同一批生产 guard：validateEnemies/validateBattleSprites）。
 */
import { type EnemyDef, validateBattleSprites, validateEnemies } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  enemyProfile,
  PLAYER_PROFILE,
  realFrame,
  wfEnemy,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import { stubGlyphs, stubPalette } from '../__tests__/battle-workflows/controlled-io.js'
import type { LoadedBattleSpriteDefinition } from '../assets.js'
import type { CreatePlayerInput } from './battle-core.js'
import { BattleSession, type BattleSessionAssets } from './battle-session.js'

/** 与 flow-residual 同构：真实帧数组的合法 LoadedBattleSpriteDefinition。 */
function loadedSprite(
  id: string,
  profile: ReturnType<typeof enemyProfile> | typeof PLAYER_PROFILE,
): LoadedBattleSpriteDefinition {
  return {
    definition: { id, label: id, asset: `asset.${id}`, profile },
    sprite: {
      frames: Array.from({ length: 11 }, () => realFrame()),
      anchorX: 0,
      anchorY: 0,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  }
}

function makeSession(players: CreatePlayerInput[], enemies: Array<EnemyDef | null>) {
  validateEnemies(enemies.filter((enemy): enemy is EnemyDef => enemy !== null))
  const playerSpriteId = 'battle-sprite.player'
  const sprites = new Map<string, LoadedBattleSpriteDefinition>([
    [playerSpriteId, loadedSprite(playerSpriteId, PLAYER_PROFILE)],
  ])
  for (const enemy of enemies)
    if (enemy)
      sprites.set(
        enemy.battleSprite,
        loadedSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
      )
  validateBattleSprites([...sprites.values()].map((entry) => entry.definition))
  const assets: BattleSessionAssets = {
    palette: stubPalette,
    glyphs: stubGlyphs,
    battleSprites: sprites,
    playerBaseDefinitionIds: Array.from({ length: players.length }, () => playerSpriteId),
  }
  const settlementCalls: number[] = []
  const session = new BattleSession(
    players,
    enemies,
    assets,
    (id) => id,
    () => 0.99,
    {
      buildSettlement: () => {
        settlementCalls.push(1)
        return []
      },
    },
  )
  return {
    session,
    settlementCalls,
    press: (keys: readonly string[], dtMs = 16) => session.tick(dtMs, new Set(keys)),
    idle: (dtMs = 16) => session.tick(dtMs, new Set()),
  }
}

/** 微任务冲刷（flow-residual 判例：同步 tick 循环不跑 done 的 then 回调，须逐轮 flush）。 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

/** 'd' 直提防御收轮（零活敌 target 相位死区是 U-1 已登记产品发现，绕开不重证）。 */
async function driveToDone(
  h: ReturnType<typeof makeSession>,
  settled: () => string | undefined,
  maxTicks = 1200,
) {
  for (let i = 0; i < maxTicks && settled() === undefined; i += 1) {
    if (h.session.debugReadiness().phase === 'menu') h.press(['d'], 200)
    else h.idle(200)
    await flush()
  }
}

test('BCS-6 AI 规则敌逃终局：会话 done 精确兑现 enemyFled，零结算零战果', async () => {
  // exp/cash 置 0：本合同的判别轴是 done 回执映射与零结算，「逃跑不计战果」由 BCS-5
  // 在 core 级专证，这里不共用同一判别面（避免反控针 N5 双红）。
  const deserter = wfEnemy('bcs-session-deserter', {
    health: 200,
    attackStrength: 0,
    exp: 0,
    cash: 0,
  })
  deserter.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] }
  const h = makeSession([wfPlayer('bcs-hero')], [deserter])
  let settled: string | undefined
  h.session.done.then(
    (result) => {
      settled = result
    },
    () => {
      settled = 'rejected'
    },
  )
  await driveToDone(h, () => settled)
  expect(settled).toBe('enemyFled')
  expect(h.session.rewards()).toEqual({ exp: 0, cash: 0 }) // 逃跑之敌战果不计（B7a）
  expect(h.settlementCalls).toHaveLength(0) // 敌逃无胜利结算（辅助：回调从未被调）
  expect(h.session.debugLog()).toContain('bcs-session-deserter 逃走了')
})
