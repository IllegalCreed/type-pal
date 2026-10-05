/**
 * TEST-GLM-REFORGE-BATTLE-FLOW-1：会话级状态效果/逃跑残差流程（BF-11/BF-12）。
 * 与既有测试的排重边界：毒 tick 数值与敌毒扣血 = battle-core.test/c85（core 级）；
 * 逃跑成功/终态 = W5、B9；本文件只证「敌毒回合末致死 → 会话 victory + 战果计奖」与
 * 「逃跑失败 → 会话续战 → 胜利」两条会话级组合流。
 * 会话构造镜像 session-driver（同一批生产 guard：validateEnemies/validateSkills/
 * validateItems/validatePoisons/validateBattleSprites），仅补可控 rng 注入位。
 */
import {
  type EnemyDef,
  type ItemData,
  type PoisonDef,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validatePoisons,
} from '@type-pal/content'
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

/** 与 session-driver.wfLoadedBattleSprite 同构：真实帧数组的合法 LoadedBattleSpriteDefinition。 */
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

interface RngSessionArgs {
  players: CreatePlayerInput[]
  enemies: Array<EnemyDef | null>
  rng: () => number
  items?: Record<string, ItemData>
  inventory?: Array<{ itemId: string; count: number }>
  poisonDefs?: Record<number, PoisonDef>
}

/** 可控 rng 会话构造器；入口即生产 guard（与 assertWfSessionInputsLegal 同一组校验器）。 */
function makeRngSession(args: RngSessionArgs) {
  validateEnemies(args.enemies.filter((enemy): enemy is EnemyDef => enemy !== null))
  if (args.items && Object.keys(args.items).length) validateItems(Object.values(args.items))
  if (args.poisonDefs && Object.keys(args.poisonDefs).length)
    validatePoisons(Object.values(args.poisonDefs))
  const playerSpriteId = 'battle-sprite.player'
  const sprites = new Map<string, LoadedBattleSpriteDefinition>([
    [playerSpriteId, loadedSprite(playerSpriteId, PLAYER_PROFILE)],
  ])
  for (const enemy of args.enemies)
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
    playerBaseDefinitionIds: Array.from({ length: args.players.length }, () => playerSpriteId),
  }
  const session = new BattleSession(args.players, args.enemies, assets, (id) => id, args.rng, {
    ...(args.items ? { items: args.items } : {}),
    ...(args.inventory ? { inventory: args.inventory.map((entry) => ({ ...entry })) } : {}),
    ...(args.poisonDefs ? { poisonDefs: args.poisonDefs } : {}),
  })
  const keys = (list: readonly string[]) => new Set(list)
  return {
    session,
    press: (list: readonly string[], dtMs = 16) => session.tick(dtMs, keys(list)),
    idle: (dtMs = 16) => session.tick(dtMs, keys([])),
  }
}

/** 微任务冲刷（W5 判例：同步 tick 循环不跑 done 的 then 回调，须逐轮 flush）。 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

/**
 * 菜单态自动补默认行动，公开 tick 驱动到 done 兑现（有界，不扩大超时）。
 * filler='attack'：空格×2 默认攻击（需要真实击杀时用）；filler='defend'：'d' 直提防御——
 * 零活敌时攻击确认会落入无目标 target 相位（battle-command-selection.ts:353 零活敌在
 * Escape 之前整体 no-op = 无退出键；U-1 登记，本卡不改产品），防御直提可绕开并收轮。
 */
async function driveToDone(
  h: ReturnType<typeof makeRngSession>,
  settled: () => string | undefined,
  filler: 'attack' | 'defend',
  maxTicks = 1200,
) {
  for (let i = 0; i < maxTicks && settled() === undefined; i += 1) {
    if (h.session.debugReadiness().phase === 'menu') {
      if (filler === 'attack') {
        h.press([' '], 200)
        h.press([' '], 200)
      } else {
        h.press(['d'], 200)
      }
    } else {
      h.idle(200)
    }
    await flush()
  }
}

test('BF-11 敌毒回合末致死：会话以 victory 收场且毒死计入战果', async () => {
  const poison: PoisonDef = {
    id: 601,
    name: 'BF赤毒',
    curability: 'common',
    color: 0,
    enemyTicks: [{ hpDelta: -10 }, { hpDelta: -20 }],
  }
  const venom: ItemData = {
    id: 'bf-venom',
    name: 'name.bf-venom',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 5 }] },
    throw: {
      target: 'oneEnemy',
      // 作者面毒引用是稳定字符串 id；运行时经 Number() 对齐数值毒表（battle-core performThrow）。
      effects: [{ kind: 'applyPoison', poisonId: '601' }],
      sound: 'sound.bf-throw',
    },
  }
  const h = makeRngSession({
    players: [wfPlayer('p1', { attackStrength: 1 })],
    enemies: [
      wfEnemy(
        'e1',
        { health: 30, attackStrength: 1, exp: 5, cash: 3 },
        { ai: { resistanceToSorcery: 0 } }, // 巫抗 0：rng 0 也过下毒门
      ),
    ],
    rng: () => 0,
    items: { 'bf-venom': venom },
    inventory: [{ itemId: 'bf-venom', count: 1 }],
    poisonDefs: { 601: poison },
  })
  let settled: string | undefined
  h.session.done.then(
    (result) => {
      settled = result
    },
    () => {
      settled = 'rejected'
    },
  )
  // W 投掷 → 确认投掷品 → 确认敌目标；tick0 即刻 −10，回合末 tick1 −20 致死。
  h.press(['w', 'W'])
  expect(h.session.debugReadiness().phase).toBe('throwItem')
  h.press([' '])
  h.press([' '])
  // 敌死于回合末毒 tick（非攻击致死）→ 次轮防御直提空步后 core 判胜 → hold → done。
  await driveToDone(h, () => settled, 'defend')
  expect(settled).toBe('victory')
  const log = h.session.debugLog()
  // 两次毒发作 = 投掷即刻 tick0 + 回合末 tick1（敌侧行首为毒 def.id）。
  expect(log.filter((line) => line === '601 BF赤毒 发作')).toHaveLength(2)
  // 毒死同样计奖（B7a：hp<=0 只记一次；非攻击致死路径的战果累计）。
  expect(h.session.rewards()).toEqual({ exp: 5, cash: 3 })
})

test('BF-12 逃跑失败后会话续战：同一会话以胜利收场且只有一次结算意图', async () => {
  const h = makeRngSession({
    players: [wfPlayer('p1', { fleeRate: 20, attackStrength: 200 })],
    // 敌 fleeRate 0 / level 1 → 逃跑判定 def = 0 + (1+6)*4 = 28；rng 0.999999 → roll 28 > 20 → 失败。
    enemies: [wfEnemy('e1', { health: 30, attackStrength: 1, exp: 5, cash: 3 })],
    rng: () => 0.999999,
  })
  let settled: string | undefined
  h.session.done.then(
    (result) => {
      settled = result
    },
    () => {
      settled = 'rejected'
    },
  )
  h.press(['q', 'Q']) // 提交逃跑 → 掷骰失败，该次行动作废，战斗继续
  await driveToDone(h, () => settled, 'attack') // 次轮起自动普攻收尾（200 攻 ≥ 30 血一击致死）
  expect(settled).toBe('victory')
  // 逃跑失败只作废该次行动：无 fled 终态残留，战果照常累计。
  expect(h.session.debugLog().some((line) => line.startsWith('p1 逃跑失败'))).toBe(true)
  expect(h.session.rewards()).toEqual({ exp: 5, cash: 3 })
})
