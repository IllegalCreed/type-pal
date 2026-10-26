/**
 * Phase1 magic action coordinator: resolve resources, pay MP, run use/success scripts,
 * collect actual damage and deferred feedback, then start the matching frame chain.
 * Script progress and persistent state stay with their owners; magic-animation receives
 * only battle projection/resources and the resolved effects, with no script runner or GameState.
 */

import type { Command, Item, Magic, ObjectMagicView, PlayerRoles, Spell } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { GameState } from '../../game-state.js'
import { getMagicScriptEntry, setMagicScriptEntry } from '../../object-script-state.js'
import type { RunScriptFn } from '../battle-runtime-context.js'
import type { BattleState } from '../battle-state.js'
import {
  applyEnemyMagicDamage,
  applyMagicDamage,
  magicForcesAllTarget,
  rollAutoDefend,
} from '../magic-damage.js'
import { explainMagicObjectResolution, resolveMagicObject } from '../magic-object.js'
import {
  asMagicShort as asShort,
  isOffensiveMagicType,
  type PendingDamageNums,
} from './magic-action-contract.js'
import { startMagicAnimation } from './magic-animation.js'

export type { RunScriptFn } from '../battle-runtime-context.js'

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
  /** magics 表(magic.json),Spell.magicNumber 对应 Magic.id。 */
  magics: Magic[]
  /** items 表 —— scriptOnSuccess 的 0x6A 偷取成功"获得 物品名"提示需按 id 取名;省略 → 偷物提示退化为通用文案。 */
  items?: Item[]
  /** PlayerRoles(扣 MP 用)。 */
  playerRoles: PlayerRoles
  /** 实际数字/音效反馈通道，动画由帧链持有。 */
  bus: CommandBus
  /** 全局脚本 commands(scriptOnUse 是全局 ip)。 */
  commands: Command[]
  /** EventSystem.runScript 注入(T17 free function)。 */
  runScript: RunScriptFn
  /**
   * object-magics.json —— scriptOnUse 里的 0x57/0x88(set magic damage)需经此解析
   * op0(magic object id)→ magicNumber → magics[]。省略 → 空表(0x57/0x88 no-op)。
   */
  objectMagics?: ObjectMagicView[]
  /**
   * 生产传当前运行态：脚本成败、OBJECT入口、金币及待播音效均由它持有。
   * 缺省只支持不依赖这些持久态的独立运算；入口不写回，脚本成败按成功路径处理。
   */
  gs?: GameState
  /**
   * D17:FIRE.MKF magic sprite 帧数 Map(chunk index = magic.effect → frameCount)——
   * build OffMagic 时间线取 `n`(总帧数公式 fight.c:2652/2661)。
   * 省略 / 缺 chunk → 不建攻击魔法时间线(走原即时路径,保持现有无链反馈策略)。
   */
  magicSpriteFrameCounts?: Map<number, number>
  /**
   * D17:rgwBattleEffectIndex[10][2] flat —— PreMagic cast 特效帧基号
   * `[battleSpriteId][0] * 10 + 15`(fight.c:2387-2389)。省略 → base=15(只缺 list 系数)。
   */
  battleEffectIndex?: number[]
  /**
   * 召唤神精灵帧数 Map(F.MKF chunk index = magic.special+10 → frameCount)——
   * build 召唤动画取召唤神逐帧 loop 帧数(fight.c:3160 PAL_SpriteGetNumFrames)。
   * 省略 / 缺 chunk → 不建召唤动画(走即时路径,保持现有无链反馈策略)。
   */
  summonSpriteFrameCounts?: Map<number, number>
  /** enemyId → ABC.MKF frame0 height(PAL_RLEGetHeight),供脚本变身/召唤后保持命中特效落点。 */
  enemySpriteFrameHeights?: Map<number, number>
}

/**
 * 执行一次法术:
 *  1. 查 spell + magic(Spell.magicNumber 对应 Magic.id)
 *  2. 队员 cast → 检查 + 扣 MP(敌人不 track mp,跳过)
 *  3. 敌方先预掷 autoDefend,再运行 scriptOnUse;失败则保留已扣 MP 并早退。
 *  4. 成功后运行 scriptOnSuccess，再构建实际动画时间线。
 *     脚本经 runScript(runtimeMode='battle' + battleCtx);全体目标不指定单个 target。
 *
 * spell / magic 找不到 → console.warn + 早退;MP 不足 → console.warn + 早退(不扣 + 不 emit + 不 runScript)。
 */
export function performMagic(input: PerformMagicInput): void {
  const resolved = resolveMagicObject(input.spellId, input.spells, input.magics, input.objectMagics)
  if (!resolved) {
    const miss = explainMagicObjectResolution(
      input.spellId,
      input.spells,
      input.magics,
      input.objectMagics,
    )
    if (miss?.reason === 'magicNotFound')
      console.warn(
        `[magic] magic ${miss.magicNumber} (spell ${input.spellId}) not found in Magic table`,
      )
    else console.warn(`[magic] spell id ${input.spellId} not found`)
    return
  }
  const { spell, magic } = resolved

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

  // M6 法术起手音(先于效果音 magic.sound):
  //   - 队员:sdlpal `PAL_BattleShowPlayerPreMagicAnim` CLASSIC 分支(fight.c:2375-2377,!fIsWIN95)起手播
  //     **AUDIO_PlaySound(rgwMagicSound[role])** —— 每角色自己的施法音(李逍遥9/赵灵儿10/林月如11),
  //     所有玩家魔法都播一次。**修正(2026-06-03,user 实听 9/10/11 纠错)**:此前误用固定 28 = 物品演出音
  //     PAL_BattleShowPlayerUseItemAnim(fight.c:2300)—— 读串了函数边界,28 根本不是魔法音。
  //   - 敌方:sdlpal fight.c:4695 AUDIO_PlaySound(enemy.wMagicSound)(敌人自身 cast 音,先于效果)。
  //   均入 gs.pendingSounds(同 0x47 通道,shell 播)。
  //   **玩家施法音延后,不在此立即播**:sdlpal 在前摇动画"施法姿"帧(约 6 帧后)才播(fight.c:2375-2377),
  //   立即播比动画早 ~6 帧(user 报"略快")。捕获到 pendingCastSound,成功 OffMagic/Summon → 帧同步到前摇帧;
  //   fizzle / DefMagic / 未建链 → 即时播(见下)。敌方施法音无前摇动画,仍即时播。
  let pendingCastSound = 0
  if (input.gs) {
    if (!input.casterIsEnemy) {
      const casterRoleId = input.state.players[input.casterIdx]?.roleId
      pendingCastSound =
        casterRoleId !== undefined ? (input.playerRoles.roles[casterRoleId]?.magicSound ?? 0) : 0
    } else {
      // DL10:敌施法音在前移两步滑步(各 Delay(1))**之后**播(fight.c:4680-4695)——建链路径
      //   挂 intro 帧同步(见 buildAndStartEnemyMagicAnim);此处仅记下,未建链(无动画资源的调用)回落即时播。
      pendingCastSound = input.state.enemies[input.casterIdx]?.e.magicSound ?? 0
    }
  }

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
  // 顺序修(user 2026-06-05 报"灵葫咒掉血在动画前";2026-06-06 报"武神数字太晚"):
  //   scriptOnSuccess 的 HP-mutate opcode(0x60 秒杀/0x1B 治疗/0x22 复活/0x5A-5F 等)此前会即时
  //   emit 数字。修:注入 pendingDamageNums 缓冲;攻击/召唤类建链后挂 PostMagic 第一帧,防御/治疗类挂
  //   DefMagic 链末,无时间线则即时 emit。对照 sdlpal DisplayStatChange 在 Off/DefMagic 之后、
  //   PostMagic 之前/开始(fight.c:4322-4323)。
  const pendingNums: PendingDamageNums = []
  const pendingScreenShake: { time: number; level: number } = { time: 0, level: 0 }
  const runMagicScript = (slot: 'scriptOnUse' | 'scriptOnSuccess'): void => {
    const scriptId = getMagicScriptEntry(input.gs, spell, slot)
    if (scriptId === 0) return // scriptOnUse / scriptOnSuccess = 0 → 无脚本,skip(sdlpal RunTriggerScript(0) 即返回)
    const nextEntry = input.runScript({
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
        items: input.items, // 0x6A 偷取成功"获得 物品名"提示需 item 名
        pendingDamageNums: pendingNums, // scriptOnSuccess opcode 数字延迟到动画后(见上注)
        pendingScreenShake, // scriptOnUse 0x35 延迟挂到 OffMagic,避免 PreMagic 阶段先抖。
        enemySpriteFrameHeights: input.enemySpriteFrameHeights,
      },
    })
    setMagicScriptEntry(input.gs, spell, slot, nextEntry)
  }
  // sdlpal PAL_RunTriggerScript 入口设 g_fScriptSuccess=TRUE(script.c:3187)。runScript(battle)
  // 不重置,故此处显式置真,再按 scriptOnUse 结果 gate scriptOnSuccess(fight.c:4217)。
  // DM6:所有敌方法术（含非伤害法术）的 autoDefend 资格在 scriptOnUse **之前**预掷(fight.c:4723-4757 在 :4761
  //   scriptOnUse/:4768 scriptOnSuccess 之前;伤害除数 :4801/:4836 用该预判)——"施状态+伤害"
  //   复合法术先把玩家催眠再结算时,不剥夺 1/3 概率减伤资格,RNG 抽取序也对齐 C。
  let preRolledAutoDefend: Map<number, boolean> | undefined
  if (input.casterIsEnemy) {
    const adTarget: number | 'all' =
      magic.type === 'normal' ? (typeof input.targetIdx === 'number' ? input.targetIdx : 0) : 'all'
    const adIdxs: number[] = adTarget === 'all' ? input.state.players.map((_, i) => i) : [adTarget]
    preRolledAutoDefend = rollAutoDefend(input.state, input.playerRoles, adTarget, adIdxs)
  }
  if (input.gs) input.gs.fScriptSuccess = true
  runMagicScript('scriptOnUse')
  const scriptUseSuccess = input.gs ? input.gs.fScriptSuccess : true

  // **scriptOnUse 失败 → 早退**(sdlpal fight.c:4196/4231 `if (g_fScriptSuccess)` gate):没钱(乾坤一掷 0x1E
  //   跳"钱不够")/ 没道具(酒神 0x20 跳"酒不足")/ 0x41 mark-failed → **不放效果动画、不结算伤害、不跑
  //   scriptOnSuccess**(失败提示已由 scriptOnUse 跳失败分支入 battleDialogQueue)。MP 仍已扣(sdlpal 总扣,
  //   fight.c:4190 在 scriptOnUse 前)。修 user 报"物品不够还有技能动画"。
  if (!scriptUseSuccess) {
    // fizzle(道具/钱不足):sdlpal 前摇动画+施法音已在 scriptOnUse 之前播(fight.c:4184 vs 4215),故仍播施法音
    //   (保持忠实 sdlpal;user 选"只改略快、fizzle 仍播")。ts 此时无前摇动画可挂 → 即时播。
    if (pendingCastSound > 0 && input.gs) {
      input.gs.pendingSounds ??= []
      input.gs.pendingSounds.push(pendingCastSound)
    }
    // scriptOnUse 阶段若已 collect 数字(罕见)→ 无后续动画可挂,即时 emit(不丢)。
    for (const dn of pendingNums)
      input.bus.emit({ op: 'showDamageNum', target: dn.target, value: dn.value, color: dn.color })
    return
  }

  // scriptOnUse 成功后运行 scriptOnSuccess，再结算与拼装帧链。
  // M6 法术效果音 magic.sound:**player 攻击魔法(OffMagic)已挪到动画时间线帧同步**(见下方动画派发后),
  //   此处不再 cast 起手立即 push(那样比效果动画提前,user 2026-06-03 报"音效没对齐")。其余类型在派发后即时 push。
  // 每次 PAL_RunTriggerScript 入口重置 g_fScriptSuccess=TRUE(script.c:3187)——
  // scriptOnSuccess 的成功旗子独立于 scriptOnUse 结果。
  const tranceSpriteBefore =
    !input.casterIsEnemy && magic.type === 'trance'
      ? input.state.players[input.casterIdx]?.spriteNumOverride
      : undefined
  if (input.gs) input.gs.fScriptSuccess = true
  runMagicScript('scriptOnSuccess')
  const scriptSuccess = input.gs ? input.gs.fScriptSuccess : true
  const tranceSpriteAfter =
    !input.casterIsEnemy && magic.type === 'trance'
      ? input.state.players[input.casterIdx]?.spriteNumOverride
      : undefined

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
  // 注:`str = PAL_GetPlayerMagicStrength` 含装备 magicStrength 加成;role.magicStrength 已由
  // projectRuntimeToBattleRoles 投影为 runtime base + rgEquipmentEffect 有效值。
  // 法术伤害数字**延迟到特效播完后**才 emit(对照 sdlpal PAL_BattleDisplayStatChange 在 magic anim
  //   之后,fight.c:4322/4369/4405)。inline 伤害先 collect 进 pendingNums(上方已声明,含 scriptOnSuccess
  //   opcode 数字);下方据是否建动画链决定:攻击/召唤 → 挂 PostMagic 第一帧,防御/治疗 → 链末,
  //   未建链(无 sprite)→ 立即 emit。
  // 敌方法术受伤的队员 idx(受击动画 fight.c:4861-4899 用;E2 填)。
  const hitPlayerIdxs: number[] = []
  // 防御姿来自脚本前预掷，独立于是否结算伤害；不能从 enemyDmg 反推。
  const autoDefendIdxs = preRolledAutoDefend
    ? [...preRolledAutoDefend].filter(([, defended]) => defended).map(([idx]) => idx)
    : []
  let dmgResults: ReadonlyArray<{
    enemyIdx: number
    hpBefore: number
    hpAfter: number
    damage: number
  }> = []
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
    // L18/L20:rngFactor(RandomFloat(10,11)/10)由 applyMagicDamage **循环内逐敌掷**(sdlpal fight.c:215
    //   在 PAL_CalcMagicDamage 内,群攻逐敌调用),不再 caller 预掷一次全目标共用。
    dmgResults = applyMagicDamage({
      state: input.state,
      target,
      magStr,
      magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
      minDamage: 1, // sdlpal inline:if (sDamage <= 0) sDamage = 1
    })
    // D17b:每个被命中敌人 collect showDamageNum(掉血 → blue,sdlpal `fight.c:648-651`)。
    // 玩家法术打敌人:wHealth WORD 下溢不钳(fight.c:638),超杀显示**完整算出伤害**,非剩余血 delta
    //   —— 用 r.damage(钳 minDamage 后的完整伤害),非 hpBefore-hpAfter。(敌法术打玩家才钳 hp,
    //   fight.c:4805,见下方 enemy 分支。)延迟到魔法特效播完才 emit(见 pendingNums 注释)。
    for (const r of dmgResults) {
      if (r.hpAfter < r.hpBefore) {
        pendingNums.push({
          target: { kind: 'enemy', idx: r.enemyIdx },
          value: r.damage,
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
  if (input.casterIsEnemy && asShort(magic.baseDamage) > 0) {
    const target: number | 'all' = magic.type === 'normal' ? input.targetIdx : 'all'
    // L20:rngFactor 由 applyEnemyMagicDamage **循环内逐队员掷**(sdlpal fight.c:4793 逐队员调),不再共用。
    const enemyDmg = applyEnemyMagicDamage({
      state: input.state,
      casterEnemyIdx: input.casterIdx,
      target,
      magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
      playerRoles: input.playerRoles,
      preRolledAutoDefend, // DM6:脚本前的预掷结果
    })
    // 掉血 → blue(sdlpal PAL_BattleDisplayStatChange);用钳后真实 delta。延迟到特效播完、受击反应开始时 emit。
    for (const r of enemyDmg) {
      if (r.hpAfter < r.hpBefore) {
        pendingNums.push({
          target: { kind: 'player', idx: r.playerIdx },
          value: r.hpBefore - r.hpAfter,
          color: 'blue',
        })
        hitPlayerIdxs.push(r.playerIdx) // 受伤队员 → 受击动画(fight.c:4861-4899)
      }
    }
  }

  // Resolve effects before handing frame composition its narrow battle/resource view.
  const built = startMagicAnimation(input, magic, {
    dmgResults,
    pendingNums,
    pendingScreenShake,
    hitPlayerIdxs,
    autoDefendIdxs,
    scriptSuccess,
    tranceSpriteBefore,
    tranceSpriteAfter,
  })

  // M6 玩家施法音 pendingCastSound:OffMagic/Summon/Trance 成功建链 → 已在前摇"施法姿"帧帧同步
  //   (buildPreMagicTimeline,对齐 sdlpal fight.c:2377),**不在此 push**;其余(DefMagic / 未建链)→ 即时播。
  //   放在效果音之前 push(施法音先于效果音,顺序对齐 sdlpal)。
  // DM14 起 DefMagic 两路径也带 PreMagic 前摇(castSound 已帧同步),并入名单防双响。
  // DL10:敌方 OffMagic 建链时施法音挂 intro 滑步第 2 步帧 —— 同样并入防双响。
  const castFrameSynced =
    built &&
    ((!input.casterIsEnemy &&
      (isOffensiveMagicType(magic.type) ||
        magic.type === 'summon' ||
        magic.type === 'trance' ||
        magic.type === 'applyToPlayer' ||
        magic.type === 'applyToParty')) ||
      (input.casterIsEnemy && isOffensiveMagicType(magic.type)))
  if (pendingCastSound > 0 && input.gs && !castFrameSynced) {
    input.gs.pendingSounds ??= []
    input.gs.pendingSounds.push(pendingCastSound)
  }

  // M6 法术效果音 magic.sound:建链成功的全部路径均已挂帧同步(WIN95 式声画同步,特效首帧 i==0),
  //   **不在此 push**;仅未建链(无 sprite 资源)回落即时 push 到 gs.pendingSounds(同 0x47 通道)。
  //   - player OffMagic:buildPlayerOffMagicTimeline 起手帧(fight.c:2669;user 2026-06-05 选)
  //   - player summon:PreMagic 后首个变亮帧(buildAndStartSummonAnim,WIN95 fight.c:3112)
  //   - player DefMagic(applyToPlayer/applyToParty):特效首帧(fight.c:2497-2502)
  //   - enemy OffMagic:特效首帧(fight.c:2925-2930;e.wMagicSound<0 → builder 收 0 → 整段静音,WIN95 gate)
  //   旧版 DefMagic/敌方在 dispatch 即播 → 先闻其声后见前摇(user 2026-06-13 报草妖风咒/气疗术)。
  const soundFrameSynced =
    built &&
    ((!input.casterIsEnemy &&
      (isOffensiveMagicType(magic.type) ||
        magic.type === 'summon' ||
        magic.type === 'applyToPlayer' ||
        magic.type === 'applyToParty')) ||
      (input.casterIsEnemy && isOffensiveMagicType(magic.type)))
  // trance(变身,梦蛇 magic47 effect=0xFFFF):原版走 DefMagicAnim,但 effect 无 FIRE 资源 → l<=0 早退
  //   (fight.c:2480-2484),AUDIO_PlaySound(2501)执行不到 → magic.sound 根本不播。我们跳过 DefMagicAnim
  //   直接 colorShift 变身,故须显式不 push,否则变身时多一声 335。
  const defMagicEarlyOut = magic.type === 'trance'
  if (magic.sound > 0 && input.gs && !soundFrameSynced && !defMagicEarlyOut) {
    input.gs.pendingSounds ??= []
    input.gs.pendingSounds.push(magic.sound)
  }

  // 未建动画链(无 sprite 资源 / 非 OFF 类型)→ 立即 emit 伤害数字(保持现有无链反馈策略;
  //   无动画可挂,只能即时显示)。建了链 → 由各动画分支挂到正确帧或链末。
  if (!built) {
    for (const dn of pendingNums) {
      input.bus.emit({ op: 'showDamageNum', target: dn.target, value: dn.value, color: dn.color })
    }
  }
}
