/**
 * 法术 perform —— M3 T20。
 *
 * Magic action = 扣 MP + emit 动画 + 跑 `Spell.scriptOnUse`(经 runScript / EventSystem 处理伤害 / 治疗 / status)。
 *
 * **效果不写死在 enum** — D17 富模型:不同 magic 走不同事件脚本,各种 dealDamage /
 * healHp / status 等 opcode 由 EventSystem(T17 runScript)调度。
 *
 * **撞到未具名 opcode** 时,runScript D26 兜底:console.debug + ip++ skip。
 * M3 phase 1 测试 fixture 通过(用 `end` 单 op 脚本),T20/T21 implementer 跑真
 * spell.scriptOnUse 时按 console.debug 输出号补具名 opcode handler(可选,延期)。
 *
 * **API 解释**(与 T19 plan 草稿差异):T17 真实现把 `runScript` 做成 free function
 * 不挂在 class 上,且需要 `commands` 数组(scriptOnUse 是全局 ip)。本文件遵 T17 真实现:
 * 通过 input.runScript + input.commands 注入(便于 unit test mock)。
 */

import type { Command, Magic, ObjectMagicView, PlayerRoles, Spell } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { RunScriptOptions } from '../../event-system.js'
import type { GameState } from '../../game-state.js'
import {
  buildPlayerOffMagicTimeline,
  buildPostMagicTimeline,
  buildPreMagicTimeline,
} from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import { applyMagicDamage, magicForcesAllTarget } from '../magic-damage.js'

/** 注入的 runScript 函数(T17 free function `runScript`,测试可 mock)。 */
export type RunScriptFn = (opts: RunScriptOptions) => void

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 防御 / 辅助类 magic type(对照 sdlpal `kMagicTypeApplyToPlayer/Party/Trance`)——
 * 这几类不走 inline 敌人伤害结算分支(fight.c:4196-4244 是 defensive 分支)。
 */
const DEFENSIVE_MAGIC_TYPES: ReadonlySet<Magic['type']> = new Set([
  'applyToPlayer',
  'applyToParty',
  'trance',
])

export interface PerformMagicInput {
  state: BattleState
  /** caster 是敌人(true)还是队员(false)。 */
  casterIsEnemy: boolean
  /** caster 在 state.enemies / state.players 里的索引。 */
  casterIdx: number
  /** 释放的法术 id(对应 Spell.id)。 */
  spellId: number
  /** target 是敌人(true)还是队员(false)。target='all' 时此字段无意义但保持显式。 */
  targetIsEnemy: boolean
  /** target 索引或全体('all')。 */
  targetIdx: number | 'all'
  /** spells 表(spells.json)。 */
  spells: Spell[]
  /** magics 表(magic.json),Spell.magicNumber 指向其索引/id。 */
  magics: Magic[]
  /** PlayerRoles(扣 MP 用)。 */
  playerRoles: PlayerRoles
  /** Present 命令通道(emit playMagicAnim)。 */
  bus: CommandBus
  /** events.bin 全局 commands(scriptOnUse 是其 ip)。 */
  commands: Command[]
  /** EventSystem.runScript 注入(T17 free function)。 */
  runScript: RunScriptFn
  /**
   * object-magics.json —— scriptOnUse 里的 0x57/0x88(set magic damage)需经此解析
   * op0(magic object id)→ magicNumber → magics[]。省略 → 空表(0x57/0x88 no-op)。
   */
  objectMagics?: ObjectMagicView[]
  /** GameState —— scriptOnUse 里的 0x88(set magic damage by money)需 gs.dwCash。 */
  gs?: GameState
  /**
   * D17:FIRE.MKF magic sprite 帧数 Map(chunk index = magic.effect → frameCount)——
   * build OffMagic 时间线取 `n`(总帧数公式 fight.c:2652/2661)。
   * 省略 / 缺 chunk → 不建攻击魔法时间线(走原即时路径,向后兼容)。
   */
  magicSpriteFrameCounts?: Map<number, number>
  /**
   * D17:rgwBattleEffectIndex[10][2] flat —— PreMagic cast 特效帧基号
   * `[battleSpriteId][0] * 10 + 15`(fight.c:2387-2389)。省略 → base=15(只缺 list 系数)。
   */
  battleEffectIndex?: number[]
}

/**
 * 执行一次法术:
 *  1. 查 spell + magic(Spell.magicNumber 指向 Magic 表 index)
 *  2. 队员 cast → 检查 + 扣 MP(敌人不 track mp,跳过)
 *  3. emit playMagicAnim(Present 层消费;M3 phase 1 简版可能不实播,只表示发生过)
 *  4. 若 spell.scriptOnUse !== 0 → 走 runScript(runtimeMode='battle' + battleCtx)
 *     target='all' → battleCtx.target = undefined(handler 自己判 magic.type=attackAll)
 *
 * spell / magic 找不到 → console.warn + 早退;MP 不足 → console.warn + 早退(不扣 + 不 emit + 不 runScript)。
 */
export function performMagic(input: PerformMagicInput): void {
  const spell = input.spells.find((s) => s.id === input.spellId)
  if (!spell) {
    console.warn(`[magic] spell id ${input.spellId} not found`)
    return
  }
  const magic = input.magics.find((m) => m.id === spell.magicNumber)
  if (!magic) {
    console.warn(`[magic] magic ${spell.magicNumber} (spell ${spell.id}) not found in Magic table`)
    return
  }

  // —— 扣 MP(队员 only;敌人不 track mp) ——
  if (!input.casterIsEnemy) {
    const playerSlot = input.state.players[input.casterIdx]
    if (!playerSlot) {
      console.warn(`[magic] caster player idx ${input.casterIdx} 越界`)
      return
    }
    const role = input.playerRoles.roles[playerSlot.roleId]
    if (!role) {
      console.warn(`[magic] caster role ${playerSlot.roleId} 不在 playerRoles`)
      return
    }
    if (role.mp < magic.costMP) {
      console.warn(`[magic] role ${role.id} not enough MP (have ${role.mp}, need ${magic.costMP})`)
      return
    }
    role.mp -= magic.costMP
  }

  // —— emit 法术动画命令 ——
  input.bus.emit({
    op: 'playMagicAnim',
    magicId: magic.id,
    casterType: input.casterIsEnemy ? 'enemy' : 'player',
    casterIdx: input.casterIdx,
    targetType: input.targetIsEnemy ? 'enemy' : 'player',
    targetIdx: input.targetIdx,
  })

  // —— 跑 scriptOnUse(经 runScript,battleCtx 注入 caster / target) ——
  // scriptOnUse=0 表示没有 use 时机的脚本(纯动画 / 由 scriptOnSuccess 处理),不调
  if (spell.scriptOnUse !== 0) {
    const targetCtx =
      input.targetIdx === 'all'
        ? undefined // 全体目标:由 handler 自行循环 state.enemies / players(M3 phase 1 raw skip)
        : {
            type: input.targetIsEnemy ? ('enemy' as const) : ('player' as const),
            idx: input.targetIdx,
          }

    input.runScript({
      commands: input.commands,
      ip: spell.scriptOnUse,
      bus: input.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: {
          type: input.casterIsEnemy ? 'enemy' : 'player',
          idx: input.casterIdx,
        },
        target: targetCtx,
        // scriptOnUse 里 0x57/0x88(set magic damage by MP/money)需 magicTables(解析 op0
        // → magicNumber → 改 baseDamage)+ playerRoles(caster MP)+ gs(cash)。
        // 改后的 baseDamage 被下方 E1 inline 伤害读到(magicTables.magics === input.magics)。
        magicTables: { magics: input.magics, objectMagics: input.objectMagics ?? [] },
        playerRoles: input.playerRoles,
        gs: input.gs,
      },
    })
  }

  // —— E1:inline 攻击法术伤害结算(player→enemy) ——
  // sdlpal `fight.c:4245-4318`(PAL_BattleCommitAction kBattleActionMagic offensive 分支):
  // 跑完 scriptOnUse 后,若 `(SHORT)magic.wBaseDamage > 0` → 用
  // `str = PAL_GetPlayerMagicStrength(role)` 对单体 / 全体敌人内联结算伤害。
  //
  // 范围(忠实 sdlpal):
  //   - **仅队员施法**(`!casterIsEnemy`)—— inline 路径是 player→enemy,敌人施法是另一函数。
  //   - **非防御类**(applyToPlayer/Party/Trance 走 defensive 分支,不打敌人)。
  //   - guard 用 `(SHORT)baseDamage > 0`(magic96=−999 等 sentinel 不触发,与 SimulateMagic
  //     的无符号 guard 不同 —— 见 magic-damage.ts)。
  //
  // 注:`str = PAL_GetPlayerMagicStrength` 含装备 magicStrength 加成;ts 战斗暂不建模
  //     rgEquipmentEffect(同 attack.ts 省略装备),用 role.magicStrength。
  let dmgResults: ReadonlyArray<{ enemyIdx: number; hpBefore: number; hpAfter: number }> = []
  if (
    !input.casterIsEnemy &&
    !DEFENSIVE_MAGIC_TYPES.has(magic.type) &&
    asShort(magic.baseDamage) > 0
  ) {
    // AoE 判定按 magic.type(对齐 sdlpal FIGHT_DetectMagicTargetChange),不是 flags.applyToAll
    // —— 修 血魔神功(attackWhole 但 applyToAll=False)以前只打单体的 bug。
    const target: number | 'all' = magicForcesAllTarget(magic.type) ? 'all' : input.targetIdx
    const role = input.playerRoles.roles[input.state.players[input.casterIdx]?.roleId ?? -1]
    const magStr = role ? asShort(role.magicStrength) : 0
    // sdlpal RandomFloat(10,11)/10 → rngFactor ∈ [1.0, 1.1)
    const rngFactor = 1 + input.state.rng.next() * 0.1
    dmgResults = applyMagicDamage({
      state: input.state,
      target,
      magStr,
      magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
      rngFactor,
      minDamage: 1, // sdlpal inline:if (sDamage <= 0) sDamage = 1
    })
    // D17b:每个被命中敌人 emit showDamageNum(掉血 → blue,sdlpal `fight.c:648-651`)。
    // 用钳后真实 delta(hpBefore-hpAfter)对齐 PAL_BattleDisplayStatChange(钳到 0 时显示真实损失)。
    for (const r of dmgResults) {
      if (r.hpAfter < r.hpBefore) {
        input.bus.emit({
          op: 'showDamageNum',
          target: { kind: 'enemy', idx: r.enemyIdx },
          value: r.hpBefore - r.hpAfter,
          color: 'blue',
        })
      }
    }
  }

  // —— D17:攻击魔法动画链(PreMagic → OffMagic → PostMagic)→ startBattleAnim ——
  //   对**所有** player 攻击类型(normal/attackAll/attackWhole/attackField)播放,**不 gate baseDamage**:
  //   sdlpal PAL_BattleShowPlayerOffMagicAnim 对一切攻击魔法都放 FIRE 特效,baseDamage 只决定**内联**
  //   伤害(sentinel −999 的特殊法术伤害靠 scriptOnSuccess opcode,但 FIRE 动画照放)。
  //   伤害已在上方 E1 即时结算;dmgResults 为空(sentinel)→ PostMagic 无受伤敌抖动(script 伤害的
  //   抖动待 scriptOnSuccess 接入,标 residual),但 PreMagic/OffMagic sprite 仍播。
  //   仅 player 施法(敌方施法的镜像动画 EnemyMagic 是另一个 deferred builder)。
  if (!input.casterIsEnemy) buildAndStartMagicAnim(input, magic, dmgResults)
}

/** sdlpal 攻击魔法 4 落点类型(OffMagic 时间线支持)。 */
type OffMagicType = 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
const OFF_MAGIC_TYPES: ReadonlySet<Magic['type']> = new Set<Magic['type']>([
  'normal',
  'attackAll',
  'attackWhole',
  'attackField',
])

/**
 * D17:为 player 攻击魔法 build PreMagic → OffMagic → PostMagic 链并 startBattleAnim。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,向后兼容):
 *   - magic.type ∈ 4 攻击类型(治疗/防御/召唤已被上层 DEFENSIVE / 非攻击 type 排除)
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - caster fighter render-state(posOriginal)存在(旧 fixture 缺则不建链)
 */
function buildAndStartMagicAnim(
  input: PerformMagicInput,
  magic: Magic,
  results: ReadonlyArray<{ enemyIdx: number; hpBefore: number; hpAfter: number }>,
): void {
  if (!OFF_MAGIC_TYPES.has(magic.type)) return
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return

  const caster = input.state.players[input.casterIdx]
  if (!caster?.posOriginal) return

  // —— PreMagic:cast 特效帧基号 = rgwBattleEffectIndex[battleSpriteId][0] * 10 + 15(fight.c:2387-2389)——
  const role = input.playerRoles.roles[caster.roleId]
  const battleSpriteId = role?.spriteNumInBattle ?? 0
  const castListVal = input.battleEffectIndex?.[battleSpriteId * 2 + 0] ?? 0
  const castEffectFrameBase = castListVal * 10 + 15
  const preFrames = buildPreMagicTimeline({
    casterPos: caster.posOriginal,
    casterIdx: input.casterIdx,
    castEffectFrameBase,
    isSummon: false,
  })

  // —— OffMagic:单体取 target enemy idle pos;全体类型 target=-1 走落点表(fight.c:2742-2825)——
  const offType = magic.type as OffMagicType
  let offTargetIdx = -1
  let offTargetPos: { x: number; y: number } | undefined
  if (offType === 'normal') {
    // 单体目标:resolved idx(targetIdx 必为 number;'all' 不会落到 normal 类型)。
    const tIdx = typeof input.targetIdx === 'number' ? input.targetIdx : -1
    offTargetIdx = tIdx
    offTargetPos = input.state.enemies[tIdx]?.posOriginal
  }
  const offFrames = buildPlayerOffMagicTimeline({
    casterIdx: input.casterIdx,
    magic: {
      effect: magic.effect,
      type: offType,
      speed: magic.speed,
      fireDelay: magic.fireDelay,
      effectTimes: magic.effectTimes,
      shake: magic.shake,
      xOffset: magic.xOffset,
      yOffset: magic.yOffset,
    },
    n,
    targetIdx: offTargetIdx,
    targetEnemyPos: offTargetPos,
    iBlow: input.state.iBlow,
  })

  // —— PostMagic:HP **有变化**的敌人抖动(sdlpal fight.c:3220 `if (wHealth == wPrevHP) continue`,
  //   即掉血/回血都抖。攻击魔法只掉血,二者等价;用 != 严格忠实,兼容未来对敌回血法术)——
  const hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }> = []
  for (const r of results) {
    if (r.hpAfter !== r.hpBefore) {
      const pos = input.state.enemies[r.enemyIdx]?.posOriginal
      if (pos) hurtEnemies.push({ idx: r.enemyIdx, pos })
    }
  }
  const postFrames = buildPostMagicTimeline({ hurtEnemies })

  const chain: BattleAnimFrame[] = [...preFrames, ...offFrames, ...postFrames]
  startBattleAnim(input.state, chain, input.bus)
}
