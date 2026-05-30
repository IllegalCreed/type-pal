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
  buildEnemyMagicTimeline,
  buildPlayerDefMagicTimeline,
  buildPlayerOffMagicTimeline,
  buildPostMagicTimeline,
  buildPreMagicTimeline,
} from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import { applyEnemyMagicDamage, applyMagicDamage, magicForcesAllTarget } from '../magic-damage.js'

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

  // —— 跑 scriptOnUse → scriptOnSuccess(经 runScript,battleCtx 注入 caster / target) ——
  // sdlpal `fight.c:4214-4265`(PAL_BattleCommitAction kBattleActionMagic):
  //   wScriptOnUse    = RunTriggerScript(wScriptOnUse,    wPlayerRole = caster)
  //   if (g_fScriptSuccess):
  //     [DefMagic / OffMagic anim]
  //     wScriptOnSuccess = RunTriggerScript(wScriptOnSuccess, w)
  //       防御类(applyToPlayer/Party/Trance,4203-4222):w = action.sTarget 的 wPlayerRole = 目标队员
  //       攻击类(4264):w = sTarget = 目标敌人
  //   攻击类再走下方 E1 inline 伤害(baseDamage>0)。
  //
  // **关键**:治疗/复活/多数特殊效果真值在 **scriptOnSuccess**(气疗术 scriptOnUse=0 /
  //   scriptOnSuccess=0x1B 回血)。旧实现只跑 scriptOnUse → 战斗内治疗/复活/sentinel 攻击魔法
  //   特殊伤害**全部不生效**。战斗 heal opcode(0x1B/0x1C/0x1D/0x22)由 dispatchBattleOpcode
  //   写 ctx.playerRoles(= sdlpal gpGlobals->g.PlayerRoles,战内外同一份 HP 真源)。
  const targetCtx =
    input.targetIdx === 'all'
      ? undefined // 全体目标:由 handler 自行循环(applyAll operand 处理)
      : {
          type: input.targetIsEnemy ? ('enemy' as const) : ('player' as const),
          idx: input.targetIdx,
        }
  const runMagicScript = (scriptId: number): void => {
    if (scriptId === 0)
      return // scriptOnUse / scriptOnSuccess = 0 → 无脚本,skip(sdlpal RunTriggerScript(0) 即返回)
    input.runScript({
      commands: input.commands,
      ip: scriptId,
      bus: input.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: {
          type: input.casterIsEnemy ? 'enemy' : 'player',
          idx: input.casterIdx,
        },
        target: targetCtx,
        // 0x57/0x88(set magic damage by MP/money,scriptOnUse)需 magicTables + playerRoles + gs;
        // 0x1B/0x1C/0x1D/0x22(治疗/复活,scriptOnSuccess)需 playerRoles(写 battle 角色 HP)+ gs(毒/fScriptSuccess)。
        magicTables: { magics: input.magics, objectMagics: input.objectMagics ?? [] },
        playerRoles: input.playerRoles,
        gs: input.gs,
      },
    })
  }
  // sdlpal PAL_RunTriggerScript 入口设 g_fScriptSuccess=TRUE(script.c:3187)。runScript(battle)
  // 不重置,故此处显式置真,再按 scriptOnUse 结果 gate scriptOnSuccess(fight.c:4217)。
  if (input.gs)
    input.gs.fScriptSuccess = true
  runMagicScript(spell.scriptOnUse)
  const scriptUseSuccess = input.gs ? input.gs.fScriptSuccess : true
  if (scriptUseSuccess) {
    // 每次 PAL_RunTriggerScript 入口重置 g_fScriptSuccess=TRUE(script.c:3187)——
    // scriptOnSuccess 的成功旗子独立于 scriptOnUse 结果。
    if (input.gs)
      input.gs.fScriptSuccess = true
    runMagicScript(spell.scriptOnSuccess)
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

  // —— E2:inline 敌方攻击魔法伤害结算(enemy→player) ——
  // sdlpal `fight.c:4772-4853`(PAL_BattleEnemyPerformAction 魔法分支):敌人施法跑完 scriptOnUse/
  // scriptOnSuccess 后,若 `(SHORT)magic.wBaseDamage > 0` → 用 enemy.wMagicStrength 对目标 / 全体队员
  // 内联结算伤害(PAL_CalcMagicDamage resistMult=20 + defending/protect/autoDefend 除因子)。
  // 范围:**仅敌人施法**(casterIsEnemy)+ guard `(SHORT)baseDamage>0`(**type-agnostic**,
  //   忠实 sdlpal fight.c:4772 —— 只看 baseDamage,不限 magic.type;治疗类 baseDamage<=0 自然排除,
  //   summon 类 baseDamage>0 也结算)。target:`type==normal → 单体`,否则全体队员(fight.c:4719
  //   `if (type != kMagicTypeNormal) sTarget=-1`)。之前敌方攻击魔法只播动画不结算伤害 → 本块补齐。
  if (
    input.casterIsEnemy &&
    asShort(magic.baseDamage) > 0
  ) {
    const target: number | 'all' = magic.type === 'normal' ? input.targetIdx : 'all'
    const rngFactor = 1 + input.state.rng.next() * 0.1 // sdlpal RandomFloat(10,11)/10
    const enemyDmg = applyEnemyMagicDamage({
      state: input.state,
      casterEnemyIdx: input.casterIdx,
      target,
      magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
      playerRoles: input.playerRoles,
      rngFactor,
    })
    // 掉血 → blue(sdlpal PAL_BattleDisplayStatChange);用钳后真实 delta。
    for (const r of enemyDmg) {
      if (r.hpAfter < r.hpBefore) {
        input.bus.emit({
          op: 'showDamageNum',
          target: { kind: 'player', idx: r.playerIdx },
          value: r.hpBefore - r.hpAfter,
          color: 'blue',
        })
      }
    }
  }

  // —— D17:法术动画链 → startBattleAnim ——
  //   3 类分发(各自前置都满足才建链,否则 no-op 走原即时路径,向后兼容):
  //   (1) player 攻击魔法(!casterIsEnemy && OFF_MAGIC_TYPES):PreMagic → OffMagic → PostMagic 链(既有,不动)。
  //   (2) player 防御/治疗魔法(!casterIsEnemy && DEFENSIVE_MAGIC_TYPES 中 applyToPlayer/applyToParty):
  //       DefMagic(目标队员处放 FIRE 特效 + 14 帧辉光;fight.c:2447-2606)。
  //   (3) enemy 攻击魔法(casterIsEnemy && OFF_MAGIC_TYPES):EnemyMagic(FIRE 特效在队员处,OffMagic 镜像;
  //       fight.c:2846-3069)。当前敌方施法**无任何动画**,本切片补齐。
  //   trance / summon 留 defer(不在 OFF/DEF 集合)。
  if (!input.casterIsEnemy) {
    if (OFF_MAGIC_TYPES.has(magic.type)) {
      buildAndStartMagicAnim(input, magic, dmgResults)
    } else if (magic.type === 'applyToPlayer' || magic.type === 'applyToParty') {
      buildAndStartDefMagicAnim(input, magic)
    }
  } else if (OFF_MAGIC_TYPES.has(magic.type)) {
    buildAndStartEnemyMagicAnim(input, magic)
  }
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

/**
 * D17:为 player 防御/治疗魔法(applyToPlayer / applyToParty)build DefMagic 链并 startBattleAnim
 * (port fight.c:2447-2606 PAL_BattleShowPlayerDefMagicAnim)。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,向后兼容):
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - caster fighter render-state(posOriginal)存在
 *   - applyToPlayer:resolved target 队员 posOriginal 存在;applyToParty:至少一个队员有 posOriginal
 *
 * 治疗值本身靠 scriptOnUse/scriptOnSuccess 的治疗 opcode(动画独立 — 同 OffMagic 模式)。
 */
function buildAndStartDefMagicAnim(input: PerformMagicInput, magic: Magic): void {
  if (magic.type !== 'applyToPlayer' && magic.type !== 'applyToParty') return
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return

  const caster = input.state.players[input.casterIdx]
  if (!caster?.posOriginal) return

  if (magic.type === 'applyToPlayer') {
    // 单体目标队员:resolved idx(targetIdx 必为 number;'all' 不会落到 applyToPlayer)。
    const tIdx = typeof input.targetIdx === 'number' ? input.targetIdx : -1
    const targetPos = input.state.players[tIdx]?.posOriginal
    if (!targetPos) return
    const frames = buildPlayerDefMagicTimeline({
      casterIdx: input.casterIdx,
      magic: {
        effect: magic.effect,
        type: 'applyToPlayer',
        speed: magic.speed,
        xOffset: magic.xOffset,
        yOffset: magic.yOffset,
      },
      n,
      targetPlayerIdx: tIdx,
      targetPlayerPos: targetPos,
    })
    startBattleAnim(input.state, frames, input.bus)
    return
  }

  // applyToParty:全队员落点(有 posOriginal 的都收)。
  const partyPlayerPositions: Array<{ idx: number; pos: { x: number; y: number } }> = []
  input.state.players.forEach((p, idx) => {
    if (p.posOriginal) partyPlayerPositions.push({ idx, pos: p.posOriginal })
  })
  if (partyPlayerPositions.length === 0) return
  const frames = buildPlayerDefMagicTimeline({
    casterIdx: input.casterIdx,
    magic: {
      effect: magic.effect,
      type: 'applyToParty',
      speed: magic.speed,
      xOffset: magic.xOffset,
      yOffset: magic.yOffset,
    },
    n,
    targetPlayerIdx: -1,
    partyPlayerPositions,
  })
  startBattleAnim(input.state, frames, input.bus)
}

/**
 * D17:为 enemy 攻击魔法(normal/attackAll/attackWhole/attackField)build EnemyMagic 链并
 * startBattleAnim(port fight.c:2846-3069 PAL_BattleShowEnemyMagicAnim,OffMagic 镜像)。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,向后兼容):
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - enemy caster fighter render-state(posOriginal — 仅作 fixture 是否完整的探针)存在
 *   - normal:resolved target 队员 posOriginal 存在
 *
 * 敌人 idleFrames/magicFrames/attackFrames 从 state.enemies[casterIdx].e 取(敌施法帧 currentFrame 用)。
 * 伤害值的实际结算靠敌方 AI / script(本切片只做动画 — 同 OffMagic / DefMagic 模式),标 residual。
 */
function buildAndStartEnemyMagicAnim(input: PerformMagicInput, magic: Magic): void {
  if (!OFF_MAGIC_TYPES.has(magic.type)) return
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return

  const caster = input.state.enemies[input.casterIdx]
  if (!caster?.posOriginal) return

  const offType = magic.type as OffMagicType
  let targetPlayerIdx = -1
  let targetPlayerPos: { x: number; y: number } | undefined
  if (offType === 'normal') {
    const tIdx = typeof input.targetIdx === 'number' ? input.targetIdx : -1
    targetPlayerIdx = tIdx
    targetPlayerPos = input.state.players[tIdx]?.posOriginal
    // 单体目标队员缺 posOriginal(旧 fixture)→ 不建链。
    if (!targetPlayerPos) return
  }

  const frames = buildEnemyMagicTimeline({
    enemyCasterIdx: input.casterIdx,
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
    enemy: {
      idleFrames: caster.e.idleFrames,
      magicFrames: caster.e.magicFrames,
      attackFrames: caster.e.attackFrames,
    },
    targetPlayerIdx,
    targetPlayerPos,
  })
  startBattleAnim(input.state, frames, input.bus)
}
