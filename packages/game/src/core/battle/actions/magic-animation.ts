/** Frame-chain composition owns animation state only; action scripts/costs stay in magic.ts. */
import type { Magic, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import {
  BATTLE_FRAME_TIME,
  buildEnemyMagicCastIntro,
  buildEnemyMagicTimeline,
  buildPlayerDefMagicTimeline,
  buildPlayerMagicHitReaction,
  buildPlayerOffMagicTimeline,
  buildPostMagicTimeline,
  buildPreMagicTimeline,
  buildSummonBrightenTimeline,
  buildSummonGodSequence,
  SUMMON_FADE_STEP_MS,
  SUMMON_FADE_STEPS,
} from '../anim-timeline.js'
import { playerRestFrame, startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import {
  asMagicShort as asShort,
  isOffensiveMagicType,
  type PendingDamageNums,
} from './magic-action-contract.js'

/** Only the animation resources and mutable battle projection are available here. */
interface MagicAnimationInput {
  state: BattleState
  casterIsEnemy: boolean
  casterIdx: number
  targetIdx: number | 'all'
  playerRoles: PlayerRoles
  magics: Magic[]
  bus: CommandBus
  magicSpriteFrameCounts?: Map<number, number>
  battleEffectIndex?: number[]
  summonSpriteFrameCounts?: Map<number, number>
}

interface MagicAnimationEffects {
  dmgResults: ReadonlyArray<{ enemyIdx: number; hpBefore: number; hpAfter: number }>
  pendingNums: PendingDamageNums
  pendingScreenShake: { time: number; level: number }
  hitPlayerIdxs: number[]
  autoDefendIdxs: number[]
  scriptSuccess: boolean
  tranceSpriteBefore: number | undefined
  tranceSpriteAfter: number | undefined
}

/** Start the selected frame chain, returning false when its existing resource prerequisites fail. */
export function startMagicAnimation(
  input: MagicAnimationInput,
  magic: Magic,
  effects: MagicAnimationEffects,
): boolean {
  const {
    dmgResults,
    pendingNums,
    pendingScreenShake,
    hitPlayerIdxs,
    autoDefendIdxs,
    scriptSuccess,
    tranceSpriteBefore,
    tranceSpriteAfter,
  } = effects
  let built = false
  if (!input.casterIsEnemy) {
    if (isOffensiveMagicType(magic.type)) {
      built = buildAndStartMagicAnim(input, magic, dmgResults, pendingNums, pendingScreenShake)
    } else if (magic.type === 'applyToPlayer' || magic.type === 'applyToParty') {
      built = buildAndStartDefMagicAnim(input, magic, pendingNums)
    } else if (magic.type === 'trance') {
      built =
        scriptSuccess &&
        buildAndStartTranceAnim(input, pendingNums, {
          spriteBefore: tranceSpriteBefore,
          spriteAfter: tranceSpriteAfter,
        })
    } else if (magic.type === 'summon') {
      // 召唤魔法(火神/雷神/武神/剑神/酒神…):变亮→召唤神出场动画→二次法术效果。伤害已由动作协调层结算。
      built = buildAndStartSummonAnim(input, magic, dmgResults, pendingNums)
    }
  } else if (isOffensiveMagicType(magic.type)) {
    built = buildAndStartEnemyMagicAnim(
      input,
      magic,
      pendingNums,
      hitPlayerIdxs,
      pendingScreenShake,
      autoDefendIdxs,
    )
  }

  return built
}

/**
 * SDLPal 在 OffMagic / Summon 主特效结束后先 PAL_BattleDisplayStatChange,紧接着
 * PAL_BattleShowPostMagicAnim。因此攻击法术数字应挂在 PostMagic 第一帧,而不是整条
 * battleAnim 播完后。
 */
function attachDamageNumsToFirstFrame(
  frames: BattleAnimFrame[],
  pendingNums: PendingDamageNums,
): boolean {
  if (pendingNums.length === 0) return true
  const first = frames[0]
  if (!first) return false
  first.damageNums = [...(first.damageNums ?? []), ...pendingNums]
  return true
}

function addPendingEnemyDamageNumTargets(
  state: BattleState,
  hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }>,
  pendingNums: PendingDamageNums,
): void {
  const seen = new Set(hurtEnemies.map((he) => he.idx))
  for (const dn of pendingNums) {
    if (dn.target.kind !== 'enemy') continue
    if (seen.has(dn.target.idx)) continue
    const pos = state.enemies[dn.target.idx]?.posOriginal
    if (!pos) continue
    hurtEnemies.push({ idx: dn.target.idx, pos })
    seen.add(dn.target.idx)
  }
}

/**
 * D17:为 player 攻击魔法 build PreMagic → OffMagic → PostMagic 链并 startBattleAnim。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,保持现有无链反馈策略):
 *   - magic.type ∈ 4 攻击类型(治疗/防御/召唤已被上层 DEFENSIVE / 非攻击 type 排除)
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - caster fighter render-state(posOriginal)存在(无动画资源的调用 缺则不建链)
 */
function buildAndStartMagicAnim(
  input: MagicAnimationInput,
  magic: Magic,
  results: ReadonlyArray<{ enemyIdx: number; hpBefore: number; hpAfter: number }>,
  pendingNums: PendingDamageNums,
  pendingScreenShake: { time: number; level: number },
): boolean {
  if (!isOffensiveMagicType(magic.type)) return false
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return false

  const caster = input.state.players[input.casterIdx]
  if (!caster?.posOriginal) return false

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
    castSound: role?.magicSound ?? 0, // M6 施法音帧同步到"施法姿"帧(修"略快")
  })

  // —— OffMagic:单体取 target enemy idle pos;全体类型 target=-1 走落点表(fight.c:2742-2825)——
  const offType = magic.type
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
      special: magic.special, // DM9:sLayerOffset(z 排序)
      type: offType,
      speed: magic.speed,
      fireDelay: magic.fireDelay,
      effectTimes: magic.effectTimes,
      shake: magic.shake,
      scriptShake: pendingScreenShake.time > 0 ? { ...pendingScreenShake } : undefined,
      xOffset: magic.xOffset,
      yOffset: magic.yOffset,
      wave: magic.wave, // W4 屏波(present applyScreenWave)
      keepEffect: magic.keepEffect, // W4 烙背景(末帧 0xFFFF)
      sound: magic.sound, // M6 效果音帧同步((i-fireDelay)%n==0 帧播,fight.c:2713)
    },
    n,
    targetIdx: offTargetIdx,
    targetEnemyPos: offTargetPos,
    baseScreenWave: input.state.field.screenWave, // L17:战场基础屏波 + magic.wWave 决定 keepEffect<9(battle.c:1563)
    iBlow: input.state.iBlow,
    // W4 iBlow:吹飞全体活敌(wObjectID!=0,fight.c:2685);仅 iBlow!=0 时 builder 真摇 rng。posOriginal 底锚。
    blowTargets: input.state.iBlow
      ? input.state.enemies
          .map((e, idx) => ({ e, idx }))
          .filter(({ e }) => !e.defeated && e.e.health > 0 && e.posOriginal)
          .map(({ e, idx }) => ({ side: 'enemy' as const, idx, pos: e.posOriginal! }))
      : undefined,
    rng: input.state.rng,
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
  addPendingEnemyDamageNumTargets(input.state, hurtEnemies, pendingNums)
  const postFrames = buildPostMagicTimeline({ hurtEnemies })
  const numsAttached = attachDamageNumsToFirstFrame(postFrames, pendingNums)

  // DM12:攻击法术收尾停顿 PAL_BattleDelay(5,0,TRUE)(fight.c:4322-4324,PostMagic 后)——
  //   数字弹出后停 ~200ms 再进下一动作。
  const chain: BattleAnimFrame[] = [
    ...preFrames,
    ...offFrames,
    ...postFrames,
    { durationMs: 5 * BATTLE_FRAME_TIME },
  ]
  startBattleAnim(input.state, chain, input.bus, numsAttached ? undefined : pendingNums)
  return true
}

/**
 * D17:player 召唤魔法(kMagicTypeSummon)build 召唤动画链 + startBattleAnim
 * (port fight.c:3072-3187 PAL_BattleShowPlayerSummonMagicAnim + fight.c:2380 PreMagic fSummon 分支)。
 *
 * 链:PreMagic(发起者上移 + 施法姿,跳过施法特效)→ 全员变亮 10 帧 → 召唤神序列(fadeIn crossfade →
 *   逐帧 loop → 二次法术效果 OffMagic → PostMagic 敌受击 → fadeOut crossfade)。伤害(召唤
 *   magic.baseDamage + 施法者 magicStrength)已由动作协调层结算,数字挂 PostMagic 第一帧。
 *
 * 前置:summonSpriteFrameCounts 有召唤神精灵帧数(F.MKF chunk = special+10)+ 发起者底锚。
 *   缺 → 返回 false 走即时路径(保持现有无链反馈策略)。二次效果 magic(magic.effect 指向的 magic)缺则只演召唤神不放二次效果。
 */
function buildAndStartSummonAnim(
  input: MagicAnimationInput,
  magic: Magic,
  dmgResults: ReadonlyArray<{ enemyIdx: number; hpBefore: number; hpAfter: number }>,
  pendingNums: PendingDamageNums,
): boolean {
  if (magic.type !== 'summon') return false
  const summonChunk = magic.special + 10 // F.MKF chunk = wSummonEffect + 10(fight.c:3135)
  const totalFrames = input.summonSpriteFrameCounts?.get(summonChunk)
  if (totalFrames === undefined || totalFrames <= 0) return false
  const caster = input.state.players[input.casterIdx]
  if (!caster?.posOriginal) return false

  // PreMagic(fSummon=TRUE):上移 4 帧 + 施法姿,跳过 10 帧施法特效(fight.c:2380)。
  const preFrames = buildPreMagicTimeline({
    casterPos: caster.posOriginal,
    casterIdx: input.casterIdx,
    castEffectFrameBase: 0,
    isSummon: true,
    castSound: input.playerRoles.roles[caster.roleId]?.magicSound ?? 0, // M6 施法音帧同步(修"略快")
  })
  // 全员变亮 iColorShift 1..10(fight.c:3120-3128)。
  const brightenFrames = buildSummonBrightenTimeline(input.state.players.length)
  // 召唤自身 magic.sound(如天剑 304):WIN95 在召唤函数**起手**(PreMagic 之后、变亮之前)播一次
  //   (fight.c:3110-3115 "Sound should be played before magic begins")→ 挂首个变亮帧;不再 dispatch 即时 push
  //   (此前在 PreMagic 之前就 push → user 2026-06-05 报"天剑音效又提前了")。
  if (magic.sound > 0 && brightenFrames.length > 0) brightenFrames[0]!.sound = magic.sound

  // 二次法术效果:secondary = magics[summonMagic.effect](wEffect 是 magic 编号,fight.c:3098-3105),
  //   PAL_BattleShowPlayerOffMagicAnim(-1, ..., -1, TRUE) → 全敌 + secondary 落点(fight.c:3186)。
  let offMagicFrames: BattleAnimFrame[] = []
  const secondary = input.magics.find((m) => m.id === magic.effect)
  if (secondary && isOffensiveMagicType(secondary.type)) {
    const sn = input.magicSpriteFrameCounts?.get(secondary.effect)
    if (sn !== undefined && sn > 0) {
      offMagicFrames = buildPlayerOffMagicTimeline({
        casterIdx: -1,
        magic: {
          effect: secondary.effect,
          type: secondary.type,
          speed: secondary.speed,
          special: secondary.special, // DM9:sLayerOffset(z 排序)—— 漏传致召唤二次法术 layerOffset 落 0
          fireDelay: secondary.fireDelay,
          effectTimes: secondary.effectTimes,
          shake: secondary.shake,
          xOffset: secondary.xOffset,
          yOffset: secondary.yOffset,
          wave: secondary.wave,
          keepEffect: secondary.keepEffect,
        },
        n: sn,
        targetIdx: -1,
        iBlow: input.state.iBlow,
        baseScreenWave: input.state.field.screenWave, // L17:普通召唤 secondary 也需按战场基础屏波判定 keepEffect<9。
      })
    }
  }

  // PostMagic:命中后敌人受击抖动(sdlpal PAL_BattleShowPostMagicAnim,fight.c:4323)。
  //   ts 此前召唤分支漏建 → 天剑等召唤法术敌人不抖(user 2026-06-04 报);又把 fadeOut bundle 在 PostMagic 前
  //   → 神先淡出敌再抖,受击太晚(user 2026-06-05 报)。修:postMagicFrames 传入 god sequence,裹神留场排 fadeOut 前。
  const hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }> = []
  for (const r of dmgResults) {
    if (r.hpAfter !== r.hpBefore) {
      const pos = input.state.enemies[r.enemyIdx]?.posOriginal
      if (pos) hurtEnemies.push({ idx: r.enemyIdx, pos })
    }
  }
  addPendingEnemyDamageNumTargets(input.state, hurtEnemies, pendingNums)
  const postMagicFrames = buildPostMagicTimeline({ hurtEnemies })
  const numsAttached = attachDamageNumsToFirstFrame(postMagicFrames, pendingNums)

  // 召唤神序列(fadeIn 72 步 crossfade → 逐帧 loop → 二次效果 → **PostMagic 敌抖(神留场)** → fadeOut 72 步 crossfade)。
  //   PostMagic 排在 fadeOut 前(fight.c:4323 神在场 → 899 后淡出);present summonGodMode 下仍画敌(present-battle.ts drawBattleSprites
  //   drawBattleSprites 只隐队员)→ 受击抖动可见。
  // 召唤淡出**前**复位全体队员(sdlpal fight.c:901 `PAL_BattleUpdateFighters()` 在 :911 fadeOut 前调):
  //   pos=posOriginal / iColorShift=0 / currentFrame=站立帧(playerRestFrame:活 0 / 死 2 / 濒死睡 1 / 防御 3,
  //   与 resetFightersAfterAction 同源)。挂 fadeOut 首帧 → crossfade 目标 = 复位后的正常主角,而非残留的
  //   PreMagic 施法帧(currentFrame=5)+ brighten 高亮(iColorShift=10)+ 上移 pos(user 2026-06-17 报)。
  //   防御者 sdlpal 不复位 pos(fight.c:944)。
  const resetFighters: NonNullable<BattleAnimFrame['fighters']> = input.state.players.map(
    (p, idx) => {
      const d: NonNullable<BattleAnimFrame['fighters']>[number] = {
        side: 'player',
        idx,
        iColorShift: 0,
        currentFrame: playerRestFrame(p, input.playerRoles.roles[p.roleId]),
      }
      if (!p.defending && p.posOriginal) d.pos = { x: p.posOriginal.x, y: p.posOriginal.y }
      return d
    },
  )

  const godFrames = buildSummonGodSequence({
    spriteKey: `player-${summonChunk}`,
    pos: { x: 240 + asShort(magic.xOffset), y: 165 + asShort(magic.yOffset) },
    bgColorShift: asShort(magic.effectTimes),
    totalFrames,
    frameTimeMs: (magic.speed + 5) * 10,
    offMagicFrames,
    postMagicFrames,
    resetFighters,
  })

  startBattleAnim(
    input.state,
    [...preFrames, ...brightenFrames, ...godFrames],
    input.bus,
    numsAttached ? undefined : pendingNums,
  )
  if (input.state.battleAnim) input.state.battleAnim.hasSummonFade = true // present 据此在非 fade 帧快照场景
  return true
}

/**
 * Trance(梦蛇)成功后的变身段 —— sdlpal fight.c:4226-4240:
 *   i=0..5:caster iColorShift=i*2,每步 Delay(1);随后 reload battle sprites + iColorShift=0 + FadeScene。
 * 0x31 已在 scriptOnSuccess 写出新 sprite,这里先恢复旧 sprite 做闪色,末帧再切到新 sprite。
 */
function buildAndStartTranceAnim(
  input: MagicAnimationInput,
  pendingNums: PendingDamageNums,
  opts: { spriteBefore: number | undefined; spriteAfter: number | undefined },
): boolean {
  const player = input.state.players[input.casterIdx]
  if (!player) return false
  if (!player.posOriginal) return false
  if (opts.spriteBefore === undefined) delete player.spriteNumOverride
  else player.spriteNumOverride = opts.spriteBefore

  const role = input.playerRoles.roles[player.roleId]
  const battleSpriteId = role?.spriteNumInBattle ?? 0
  const castListVal = input.battleEffectIndex?.[battleSpriteId * 2 + 0] ?? 0
  const preFrames = buildPreMagicTimeline({
    casterPos: player.posOriginal,
    casterIdx: input.casterIdx,
    castEffectFrameBase: castListVal * 10 + 15,
    isSummon: false,
    castSound: role?.magicSound ?? 0,
  })

  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < 6; i++) {
    frames.push({
      durationMs: BATTLE_FRAME_TIME,
      fighters: [{ side: 'player', idx: input.casterIdx, iColorShift: i * 2 }],
    })
  }
  // L19:闪色后**不硬切**,而是接 72 步 dither crossfade(fight.c:4234-4240:VIDEO_BackupScreen 旧精灵 →
  //   PAL_LoadBattleSprites 载新精灵 → iColorShift=0 → PAL_BattleMakeScene → PAL_BattleFadeScene)。
  //   复用 summon crossfade 引擎(present applySummonFade):fadeDir='out' → summonGodMode=false → 不画召唤神/
  //   不隐队员/bg 不染色,仅做 from(闪色末帧旧精灵,hasSummonFade 时快照)→ to(新精灵)的低 nibble dither。
  //   每帧已把 caster 切到新精灵 + iColorShift=0,故 current 即"新精灵画面"。
  const newSprite = opts.spriteAfter === undefined ? (opts.spriteBefore ?? null) : opts.spriteAfter
  const casterPos = player.posOriginal
  for (let s = 0; s < SUMMON_FADE_STEPS; s++) {
    frames.push({
      durationMs: SUMMON_FADE_STEP_MS,
      fighters: [
        { side: 'player', idx: input.casterIdx, iColorShift: 0, spriteNumOverride: newSprite },
      ],
      summon: {
        spriteKey: '',
        frame: 0,
        pos: casterPos,
        bgColorShift: 0,
        fadeStep: s,
        fadeDir: 'out',
      },
    })
  }
  startBattleAnim(input.state, [...preFrames, ...frames], input.bus, pendingNums)
  if (input.state.battleAnim) input.state.battleAnim.hasSummonFade = true // present 据此在非 fade 帧(闪色)快照 from
  return true
}

/**
 * D17:为 player 防御/治疗魔法(applyToPlayer / applyToParty)build DefMagic 链并 startBattleAnim
 * (port fight.c:2447-2606 PAL_BattleShowPlayerDefMagicAnim)。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,保持现有无链反馈策略):
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - caster fighter render-state(posOriginal)存在
 *   - applyToPlayer:resolved target 队员 posOriginal 存在;applyToParty:至少一个队员有 posOriginal
 *
 * 治疗值本身靠 scriptOnUse/scriptOnSuccess 的治疗 opcode(动画独立 — 同 OffMagic 模式)。
 *
 * @returns 是否成功建链(供 caller 判定:建链 → scriptOnSuccess 治疗/复活数字 pendingNums 交时间线播完后 emit;
 *   未建链 → caller 即时 emit,保持现有无链反馈策略)。pendingNums 透传给 startBattleAnim(顺序修,2026-06-05)。
 */
function buildAndStartDefMagicAnim(
  input: MagicAnimationInput,
  magic: Magic,
  pendingNums: PendingDamageNums,
): boolean {
  if (magic.type !== 'applyToPlayer' && magic.type !== 'applyToParty') return false
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return false

  const caster = input.state.players[input.casterIdx]
  if (!caster?.posOriginal) return false

  // DM14:PreMagic 起手前摇对**所有**玩家法术无条件先放(fight.c:4184 → 2363-2444:4 步前移
  //   各 Delay(1) + Delay(2) + frame5 施法姿 + 10 帧 cast 特效,~0.7s)。offensive/summon/trance
  //   均有,唯 DefMagic 两路径缺 → 放治疗/辅助时施法者无起手段直接目标辉光。
  const dmRole = input.playerRoles.roles[caster.roleId]
  const dmSpriteId = dmRole?.spriteNumInBattle ?? 0
  const dmCastListVal = input.battleEffectIndex?.[dmSpriteId * 2 + 0] ?? 0
  const preFrames = buildPreMagicTimeline({
    casterPos: caster.posOriginal,
    casterIdx: input.casterIdx,
    castEffectFrameBase: dmCastListVal * 10 + 15,
    isSummon: false,
    castSound: dmRole?.magicSound ?? 0,
  })

  if (magic.type === 'applyToPlayer') {
    // 单体目标队员:resolved idx(targetIdx 必为 number;'all' 不会落到 applyToPlayer)。
    const tIdx = typeof input.targetIdx === 'number' ? input.targetIdx : -1
    const targetPos = input.state.players[tIdx]?.posOriginal
    if (!targetPos) return false
    const frames = buildPlayerDefMagicTimeline({
      casterIdx: input.casterIdx,
      magic: {
        effect: magic.effect,
        special: magic.special, // DM9:sLayerOffset(z 排序)
        type: 'applyToPlayer',
        speed: magic.speed,
        xOffset: magic.xOffset,
        yOffset: magic.yOffset,
        sound: magic.sound, // 效果音挂特效首帧(fight.c:2497-2502 WIN95 i==0;之前即时 push 早于动画)
      },
      n,
      targetPlayerIdx: tIdx,
      targetPlayerPos: targetPos,
    })
    startBattleAnim(input.state, [...preFrames, ...frames], input.bus, pendingNums) // 治疗/复活数字延迟到 DefMagic 播完后(顺序修)
    return true
  }

  // applyToParty:全队员落点(有 posOriginal 的都收)。
  const partyPlayerPositions: Array<{ idx: number; pos: { x: number; y: number } }> = []
  input.state.players.forEach((p, idx) => {
    if (p.posOriginal) partyPlayerPositions.push({ idx, pos: p.posOriginal })
  })
  if (partyPlayerPositions.length === 0) return false
  const frames = buildPlayerDefMagicTimeline({
    casterIdx: input.casterIdx,
    magic: {
      effect: magic.effect,
      special: magic.special, // DM9:sLayerOffset(z 排序)
      type: 'applyToParty',
      speed: magic.speed,
      xOffset: magic.xOffset,
      yOffset: magic.yOffset,
      wave: magic.wave, // W4 屏波(present applyScreenWave)
      keepEffect: magic.keepEffect, // W4 烙背景(末帧 0xFFFF)
      sound: magic.sound, // 效果音挂特效首帧(fight.c:2497-2502 WIN95 i==0;之前即时 push 早于动画)
    },
    n,
    targetPlayerIdx: -1,
    partyPlayerPositions,
  })
  startBattleAnim(input.state, [...preFrames, ...frames], input.bus, pendingNums) // 群疗数字延迟到 DefMagic 播完后(顺序修)
  return true
}

/**
 * D17:为 enemy 攻击魔法(normal/attackAll/attackWhole/attackField)build EnemyMagic 链并
 * startBattleAnim(port fight.c:2846-3069 PAL_BattleShowEnemyMagicAnim,OffMagic 镜像)。
 *
 * 前置都满足才建链(否则 no-op,走原即时路径,保持现有无链反馈策略):
 *   - magicSpriteFrameCounts 有该 effect chunk(→ n)
 *   - enemy caster fighter render-state 的底锚 posOriginal 存在
 *   - normal:resolved target 队员 posOriginal 存在
 *
 * 敌人 idleFrames/magicFrames/attackFrames 从 state.enemies[casterIdx].e 取(敌施法帧 currentFrame 用)。
 * 伤害由上层 performMagic 的脚本和 E2 分支结算；本模块只负责动画时序。
 */
function buildAndStartEnemyMagicAnim(
  input: MagicAnimationInput,
  magic: Magic,
  pendingNums: PendingDamageNums,
  hitPlayerIdxs: number[],
  pendingScreenShake: { time: number; level: number },
  autoDefendIdxs: number[] = [],
): boolean {
  if (!isOffensiveMagicType(magic.type)) return false
  const n = input.magicSpriteFrameCounts?.get(magic.effect)
  if (n === undefined || n <= 0) return false

  const caster = input.state.enemies[input.casterIdx]
  if (!caster?.posOriginal) return false

  const offType = magic.type
  let targetPlayerIdx = -1
  let targetPlayerPos: { x: number; y: number } | undefined
  if (offType === 'normal') {
    const tIdx = typeof input.targetIdx === 'number' ? input.targetIdx : -1
    targetPlayerIdx = tIdx
    targetPlayerPos = input.state.players[tIdx]?.posOriginal
    // 单体目标队员缺 posOriginal(无动画资源的调用)→ 不建链。
    if (!targetPlayerPos) return false
  }

  // 施法起手:敌人前移 + 施法手势(fight.c:4680-4717)—— 落点特效之前的敌人本体表演。
  //   林月如(magic360→鞭击 fireDelay=0)即靠这段动:前移两步 + attackFrames 手势 frame 0..4。
  const introFrames = buildEnemyMagicCastIntro({
    enemyCasterIdx: input.casterIdx,
    enemyPos: caster.posOriginal,
    idleFrames: caster.e.idleFrames,
    magicFrames: caster.e.magicFrames,
    attackFrames: caster.e.attackFrames,
    actWaitFrames: caster.e.actWaitFrames,
    fireDelay: magic.fireDelay,
  })
  // DL10b/L16:被动格挡队员摆防御姿 frame3 在**施法手势演完后、特效前**(fight.c:4737-4738/
  //   4755-4756)—— 注入 intro **末帧**(原注入起始帧,早数帧)。
  const introTailIdx = introFrames.length - 1
  const introTail = introFrames[introTailIdx]
  if (autoDefendIdxs.length > 0 && introTail) {
    const guardPoses: NonNullable<BattleAnimFrame['fighters']> = autoDefendIdxs.map((idx) => ({
      side: 'player' as const,
      idx,
      currentFrame: 3,
    }))
    introFrames[introTailIdx] = {
      ...introTail,
      fighters: [...(introTail.fighters ?? []), ...guardPoses],
    }
  }
  // DL10a:敌施法音挂滑步第 2 步帧(fight.c:4680-4695 两步 Delay(1) 后 AUDIO_PlaySound(wMagicSound))。
  //   wMagicSound 是 SHORT,负值合法(enemies.json 实有 -503..-1)—— C 无条件调用且 AUDIO_PlaySound
  //   按 abs 播(audio.c:529),旧 `>0` gate 漏播负值敌的施法音 → 改 !==0 + abs。
  const castSnd = input.state.enemies[input.casterIdx]?.e.magicSound ?? 0
  if (castSnd !== 0 && introFrames.length >= 2 && !introFrames[1]!.sound) {
    introFrames[1] = { ...introFrames[1]!, sound: Math.abs(castSnd) }
  }
  // 特效前 snap 回原位(fight.c:2842 PAL_BattleShowEnemyMagicAnim 起手把全敌 pos 复位 posOriginal)。
  const posResetFrame: BattleAnimFrame = {
    durationMs: 0,
    fighters: [
      {
        side: 'enemy',
        idx: input.casterIdx,
        pos: { x: caster.posOriginal.x, y: caster.posOriginal.y },
      },
    ],
  }
  const effectFrames = buildEnemyMagicTimeline({
    enemyCasterIdx: input.casterIdx,
    magic: {
      effect: magic.effect,
      special: magic.special, // DM9:sLayerOffset(z 排序)
      type: offType,
      speed: magic.speed,
      fireDelay: magic.fireDelay,
      effectTimes: magic.effectTimes,
      shake: magic.shake,
      scriptShake: pendingScreenShake.time > 0 ? { ...pendingScreenShake } : undefined,
      xOffset: magic.xOffset,
      yOffset: magic.yOffset,
      wave: magic.wave, // W4 屏波(present applyScreenWave)
      keepEffect: magic.keepEffect, // W4 烙背景(末帧 0xFFFF)
      // 效果音挂特效首帧(fight.c:2925-2930 WIN95 i==0;之前即时 push 早于动画——草妖风咒根因)。
      // WIN95 gate(fight.c:2928-2929):e.wMagicSound(SHORT)< 0 的敌人效果音静音。
      sound: castSnd >= 0 ? magic.sound : 0,
    },
    n,
    enemy: {
      idleFrames: caster.e.idleFrames,
      magicFrames: caster.e.magicFrames,
      attackFrames: caster.e.attackFrames,
    },
    targetPlayerIdx,
    targetPlayerPos,
    baseScreenWave: input.state.field.screenWave, // L17:战场基础屏波 + magic.wWave 决定 keepEffect<9(battle.c:1563)
    iBlow: input.state.iBlow,
    // W4 iBlow 镜像:敌方魔法吹**全体队员**(fight.c:2903 k<=wMaxPartyMemberIndex,无活人 filter);posOriginal 底锚。
    blowTargets: input.state.iBlow
      ? input.state.players
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => p.posOriginal)
          .map(({ p, idx }) => ({ side: 'player' as const, idx, pos: p.posOriginal! }))
      : undefined,
    rng: input.state.rng,
  })
  // 队员受击动画(fight.c:4861-4899):受伤队员 frame4 + 红闪 + 递减击退,接在特效之后。
  //   单体('normal')→ 该 target;AoE → E2 结算出的受伤队员(hitPlayerIdxs)。各取 posOriginal 复位锚。
  const affectedIdxs =
    offType === 'normal' ? (targetPlayerIdx >= 0 ? [targetPlayerIdx] : []) : hitPlayerIdxs
  const affected = affectedIdxs
    .map((idx) => ({ idx, pos: input.state.players[idx]?.posOriginal }))
    .filter((a): a is { idx: number; pos: { x: number; y: number } } => a.pos != null)
  const hurtFrames = buildPlayerMagicHitReaction(affected)
  const numsAttached = attachDamageNumsToFirstFrame(hurtFrames, pendingNums)

  // DM12 收尾帧序修(fight.c:4897-4908 真值):受击 5 帧 → 敌复位 frame0+posOriginal + Delay(1)
  //   → **PAL_BattleUpdateFighters(受击队员复位:pos→posOriginal/站姿/红闪清零)** → Delay(8)。
  //   旧版把 9 帧停顿整段放复位前(复位靠链终 reset)→ 受击者保持后仰 frame4+击退位多 360ms,
  //   原版后仰仅 ~240ms(user 2026-06-13 报"风咒受击后仰停顿过长")。复位帧值与链终
  //   resetFightersAfterAction 同源(playerRestFrame),死亡/濒死帧不被错置成站立。
  const finaleFrames: BattleAnimFrame[] = [
    {
      durationMs: BATTLE_FRAME_TIME, // 敌复位 + Delay(1)(fight.c:4901-4903)
      fighters: [
        {
          side: 'enemy',
          idx: input.casterIdx,
          currentFrame: 0,
          pos: { x: caster.posOriginal.x, y: caster.posOriginal.y },
        },
      ],
    },
    {
      durationMs: 8 * BATTLE_FRAME_TIME, // UpdateFighters → Delay(8, 0, TRUE)(fight.c:4906-4908)
      updateGesture: true, // 停顿期敌人 idle 呼吸恢复推进(收尾不死冻)
      fighters: affected.map((a) => {
        const p = input.state.players[a.idx]!
        return {
          side: 'player' as const,
          idx: a.idx,
          pos: { x: a.pos.x, y: a.pos.y }, // a.pos = posOriginal
          currentFrame: playerRestFrame(p, input.playerRoles.roles[p.roleId]),
          iColorShift: 0,
        }
      }),
    },
  ]

  startBattleAnim(
    input.state,
    [...introFrames, posResetFrame, ...effectFrames, ...hurtFrames, ...finaleFrames],
    input.bus,
    numsAttached ? undefined : pendingNums,
  )
  return true
}
