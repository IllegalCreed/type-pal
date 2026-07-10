/**
 * 战斗动画时间线(M4d-2)—— 纯表现层回放:battle-core 结算保持即时(headless/单测不变),
 * session 按 lastAction + hp diff 构建帧序,AnimPlayer 逐帧推进并派发副作用(音效/伤害数字)。
 *
 * 帧序/时长/位移 = 一阶段考证真值(fight.c 经 anim-timeline.ts 移植;UX 照抄,结构重写:
 * reforge tick 是 rAF wall-clock 驱动,天然无一阶段 40ms 逻辑 tick 的拍频问题,不需要 renderIdx)。
 *
 * 玩家战斗精灵帧语义(F.MKF):0 站立 / 1 濒死 / 2 死 / 3 防御 / 4 受击 / 5 投掷 / 6,7 施法蓄力 / 8,9 攻击。
 * 敌人帧布局:idle(idleFrames 个)→ magic(magicFrames)→ attack(attackFrames)。
 */

/** PAL_BattleDelay 单位:N × 40ms。 */
const FRAME_MS = 40
const delayMs = (n: number): number => n * FRAME_MS

export interface FighterDelta {
  side: 'player' | 'enemy'
  idx: number
  /** 精灵帧号(缺 = 不变)。 */
  frame?: number
  /** 底锚位置(缺 = 不变)。 */
  pos?: { x: number; y: number }
  /** 受击/高亮染色(0 = 复位;一阶段 iColorShift=6 提亮)。 */
  colorShift?: number
}

export interface OverlayDraw {
  /** 用哪套特效精灵:'effect' = chunk10 命中/施法通用;'magic' = 本次法术 fire sprite。 */
  sheet: 'effect' | 'magic' | 'summon'
  frameIdx: number
  x: number
  y: number
}

export interface AnimFrame {
  durationMs: number
  fighters?: FighterDelta[]
  /** 特效 overlay(可多落点:attackAll 三点同帧)。坐标 = 一阶段 fight.c 落点真值。 */
  overlays?: OverlayDraw[]
  damageNum?: { target: { side: 'player' | 'enemy'; idx: number }; value: number }
  damageNums?: Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }>
  sound?: number
  /** 震屏帧(法术末 wShake 帧;session 累计 shakeUntil,合成级垂直位移,level 恒 3 fight.c:2718)。 */
  screenShake?: boolean
  /** 屏幕波幅叠加设值(OffMagic 首帧设 = fx.wave;演出期叠在战场常驻波上,动作收尾归 0)。 */
  waveAdd?: number
  /** 召唤演出相(fight.c:3130-3187 + 889-912):in = 队员溶出/神将溶入/背景染色溶入(72×16ms);
   *  hold = 队员隐、神在场;out = 反向溶回。无字段 = 非召唤态(session 清相)。 */
  summonPhase?: 'in' | 'hold' | 'out'
  /** keepEffect 烙背景(fight.c:2757 末帧 blit lpBackground):把这些特效帧永久画进
   *  战斗背景(整场留存,随屏波卷动;万剑诀插剑入地)。session 侧屏波 ≥9 时丢弃(原版门)。 */
  burnBg?: OverlayDraw[]
  /** 战斗消息条(物品名 @210,50 等;一阶段 battleMessage):从本帧起显示 durationMs。 */
  banner?: { text: string; durationMs: number }
}

export interface BuildPlayerAttackInput {
  attackerIdx: number
  attackerPos: { x: number; y: number }
  targetIdx: number
  targetPos: { x: number; y: number }
  targetHeight: number
  /** 命中特效帧基 = battle-effect-index[spriteNum*2+1]*3;<0 = 无特效资产(跳过 overlay)。 */
  effectFrameBase: number
  damage: number
  /** 首击前摇(一阶段 L12:仅回合首击 frame7 + Delay4)。 */
  windup?: boolean
  /** 出招/兵器音(rgwAttackSound 冲锋帧 fight.c:2061;rgwWeaponSound 挥击帧 fight.c:2124)。 */
  sounds?: { attack: number; weapon: number }
}

export interface BuildAttackAllInput {
  attackerIdx: number
  attackerPos: { x: number; y: number }
  /** 中心敌落点(挥击站位;取中心敌或首个活敌)。 */
  centerPos: { x: number; y: number }
  /** 各命中敌:idx + 屏位 + 伤害(逐敌染色/数字/击退)。 */
  hits: { idx: number; pos: { x: number; y: number }; value: number }[]
  weaponSound: number
  attackSound: number
}

/**
 * 长鞭攻全体时间线(fight.c:3683-3730):蓄力7(4)→冲刺至中心 frame8(2)→挥击9+出招音→
 * 全敌染色+逐敌伤害数字(damageNums)+全敌击退(hurtEnemies 式,3 帧衰减)→染色复位。
 * 一挥扫全场(异于单体逐个冲刺),伤害已在 core 逐敌减半算好。
 */
export function buildPlayerAttackAll(input: BuildAttackAllInput): AnimFrame[] {
  const { attackerIdx, attackerPos, centerPos, hits, weaponSound, attackSound } = input
  const frames: AnimFrame[] = []
  const rushX = centerPos.x + 64
  const rushY = centerPos.y + 20
  // 蓄力
  frames.push({
    durationMs: delayMs(4),
    fighters: [{ side: 'player', idx: attackerIdx, frame: 7, pos: { ...attackerPos } }],
  })
  // 冲刺至中心 + 出招音
  frames.push({
    durationMs: delayMs(2),
    fighters: [{ side: 'player', idx: attackerIdx, frame: 8, pos: { x: rushX, y: rushY } }],
    ...(attackSound > 0 ? { sound: attackSound } : {}),
  })
  // 挥击 9 + 全敌染色 + 逐敌伤害数字 + 兵器音
  frames.push({
    durationMs: delayMs(2),
    fighters: [
      { side: 'player', idx: attackerIdx, frame: 9 },
      ...hits.map((h) => ({ side: 'enemy' as const, idx: h.idx, colorShift: 6 })),
    ],
    damageNums: hits.map((h) => ({ target: { side: 'enemy' as const, idx: h.idx }, value: h.value })),
    ...(weaponSound > 0 ? { sound: weaponSound } : {}),
  })
  // 全敌击退 3 帧(x −8/−4/−6 衰减),末帧染色复位
  let dist = 8
  const off = { x: 0 }
  for (let i = 0; i < 3; i++) {
    off.x -= dist
    dist = Math.trunc(dist / -2)
    frames.push({
      durationMs: delayMs(1),
      fighters: hits.map((h) => ({
        side: 'enemy' as const,
        idx: h.idx,
        pos: { x: h.pos.x + off.x, y: h.pos.y },
        ...(i === 2 ? { colorShift: 0 } : {}),
      })),
    })
  }
  // 攻击者复位站立
  frames.push({
    durationMs: delayMs(4),
    fighters: [{ side: 'player', idx: attackerIdx, frame: 0, pos: { ...attackerPos } }],
  })
  return frames
}

/**
 * 玩家物攻时间线(fight.c:2008-2263 单体简化):
 * 蓄力7(4) → 冲刺8 至敌前(+64,+20)(2) → 前挪(1) → 挥击9 + 特效3帧(敌染色/伤害数字/位移微调)
 * → 敌抖动 3 帧(x −8/−4/−6)+ 染色复位。
 */
export function buildPlayerAttack(input: BuildPlayerAttackInput): AnimFrame[] {
  const { attackerIdx, attackerPos, targetIdx, targetPos, targetHeight, effectFrameBase, damage } =
    input
  const ex = targetPos.x
  const ey = targetPos.y
  const frames: AnimFrame[] = []
  if (input.windup) {
    frames.push({
      durationMs: delayMs(4),
      fighters: [{ side: 'player', idx: attackerIdx, frame: 7, pos: { ...attackerPos } }],
    })
  }
  const rushX = ex + 64
  const rushY = ey + 20
  frames.push({
    durationMs: delayMs(2),
    fighters: [{ side: 'player', idx: attackerIdx, frame: 8, pos: { x: rushX, y: rushY } }],
    // 出招音挂冲锋首帧(fight.c:2061-2071 在预备后、frame8 冲刺时播 rgwAttackSound)
    ...(input.sounds?.attack ? { sound: input.sounds.attack } : {}),
  })
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: attackerIdx, pos: { x: rushX - 10, y: rushY - 2 } }],
  })
  // 挥击 + 3 帧命中特效(落点 (ex, ey−h/3+10),每帧 x−16 / y+16)
  const fxX = ex
  const fxY = ey - Math.floor(targetHeight / 3) + 10
  for (let i = 0; i < 3; i++) {
    const fighters: FighterDelta[] = []
    if (i === 0) {
      fighters.push({ side: 'player', idx: attackerIdx, frame: 9 })
      fighters.push({ side: 'enemy', idx: targetIdx, colorShift: 6 })
    }
    if (i === 1)
      fighters.push({ side: 'player', idx: attackerIdx, pos: { x: rushX - 8, y: rushY - 1 } })
    frames.push({
      durationMs: delayMs(1),
      fighters,
      ...(effectFrameBase >= 0
        ? {
            overlays: [
              {
                sheet: 'effect' as const,
                frameIdx: effectFrameBase + i,
                x: fxX - 16 * i,
                y: fxY + 16 * i,
              },
            ],
          }
        : {}),
      ...(i === 0
        ? { damageNum: { target: { side: 'enemy', idx: targetIdx }, value: damage } }
        : {}),
      // 兵器命中音挂挥击帧(fight.c:2124 frame9 时播 rgwWeaponSound)
      ...(i === 0 && input.sounds?.weapon ? { sound: input.sounds.weapon } : {}),
    })
  }
  // 敌抖动 3 帧(dist 8→−4→2;x 序列 ex−8/ex−4/ex−6,y 微调)+ 染色复位
  let dist = 8
  let sx = ex
  let sy = ey
  for (let i = 0; i < 3; i++) {
    sx -= dist
    dist = Math.trunc(dist / -2)
    sy += dist
    frames.push({
      durationMs: delayMs(1),
      fighters: [
        {
          side: 'enemy',
          idx: targetIdx,
          pos: { x: sx, y: sy },
          ...(i === 0 ? { colorShift: 0 } : {}),
        },
      ],
    })
  }
  return frames
}

export interface BuildMateAttackInput {
  attackerIdx: number
  attackerPos: { x: number; y: number }
  mateIdx: number
  matePos: { x: number; y: number }
  /** 攻击者武器音(rgwWeaponSound,fight.c:3810)。 */
  weaponSound: number
  damage: number
  mateDied: boolean
}

/**
 * 疯魔打友时间线(fight.c:3790-3855):frame8↔0 抽搐 2 轮(each Delay1) → Delay2 →
 * 瞬移至队友旁(+30,+12) frame8 Delay5 → frame9 + 武器音 → 队友击退(−12,−6)(1) →
 * 红闪 colorShift6 + 伤害数字(1;数字挂帧策略同 buildEnemyPhysical) → 闪清(4) → 双方复位(4)。
 */
export function buildMateAttack(input: BuildMateAttackInput): AnimFrame[] {
  const { attackerIdx, attackerPos, mateIdx, matePos, weaponSound, damage, mateDied } = input
  const frames: AnimFrame[] = []
  for (let j = 0; j < 2; j++) {
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: attackerIdx, frame: 8 }],
    })
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: attackerIdx, frame: 0 }],
    })
  }
  frames.push({ durationMs: delayMs(2) })
  frames.push({
    durationMs: delayMs(5),
    fighters: [
      {
        side: 'player',
        idx: attackerIdx,
        frame: 8,
        pos: { x: matePos.x + 30, y: matePos.y + 12 },
      },
    ],
  })
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: attackerIdx, frame: 9 }],
    ...(weaponSound > 0 ? { sound: weaponSound } : {}),
  })
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: mateIdx, pos: { x: matePos.x - 12, y: matePos.y - 6 } }],
  })
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: mateIdx, colorShift: 6 }],
    damageNum: { target: { side: 'player', idx: mateIdx }, value: damage },
  })
  frames.push({
    durationMs: delayMs(4),
    fighters: [{ side: 'player', idx: mateIdx, colorShift: 0 }],
  })
  // 双方复位(PAL_BattleUpdateFighters 语义;被打死 → 倒地帧 2)
  frames.push({
    durationMs: delayMs(4),
    fighters: [
      { side: 'player', idx: attackerIdx, frame: 0, pos: attackerPos },
      { side: 'player', idx: mateIdx, frame: mateDied ? 2 : 0, pos: matePos },
    ],
  })
  return frames
}

export interface BuildUseItemInput {
  casterIdx: number
  casterPos: { x: number; y: number }
  /** 受益目标(v1 施己 = [casterIdx];将来 oneAlly/allAllies 直接传多目标)。 */
  targetIdxs: number[]
  /** 物品名:与举物/音效**同帧**起显示 13 帧(一阶段 battleMessage @210,50,fight.c:2316)。 */
  itemName?: string
}

/**
 * 战斗使用物品(fight.c:2266-2335 PAL_BattleShowPlayerUseItemAnim;一阶段 buildUseItemTimeline
 * 同源移植):Delay(4) → 施者**先快后慢走近**(−15,−7)→ frame5(举物姿)+sound 28+物品名同帧
 * → 目标 colorShift 0..6 再 5..0(每级 1 帧)→ **瞬移归位** + 收尾停顿 Delay(8)。
 * ⚠ 前移形态:sdlpal/一阶段是单帧直接赋值(瞬移),作者对照原版 pal.exe 裁决
 * (2026-07-11):走近 = 连续且**先快后慢**(ease-out),归位 = **瞬移** —— 跟原版。
 */
export function buildUseItem(input: BuildUseItemInput): AnimFrame[] {
  const { casterIdx, casterPos, targetIdxs, itemName } = input
  const frames: AnimFrame[] = [{ durationMs: delayMs(4) }]
  const shifted = { x: casterPos.x - 15, y: casterPos.y - 7 }
  const stepPos = (t: number): { x: number; y: number } => ({
    x: Math.round(casterPos.x + (shifted.x - casterPos.x) * t),
    y: Math.round(casterPos.y + (shifted.y - casterPos.y) * t),
  })
  // 走近 120ms 细分 12 段 ×10ms(rAF ~16.7ms 每帧都跨到新位置 = 平滑;40ms 大步长
  // 曾被作者报「不顺畅」—— 三大跳不是滑动)。二次 ease-out 先快后慢,前 40ms 走完
  // 过半路程;终点并入举物帧(到位即抬手)。
  const WALK_STEPS = 12
  for (let s = 1; s < WALK_STEPS; s++) {
    const ease = 1 - (1 - s / WALK_STEPS) ** 2
    frames.push({
      durationMs: 10,
      fighters: [{ side: 'player', idx: casterIdx, pos: stepPos(ease) }],
    })
  }
  const targets = (shift: number): FighterDelta[] =>
    targetIdxs.map((idx) => ({ side: 'player' as const, idx, colorShift: shift }))
  for (let i = 0; i <= 6; i++) {
    const fighters = targets(i)
    if (i === 0) fighters.unshift({ side: 'player', idx: casterIdx, pos: shifted, frame: 5 })
    frames.push({
      durationMs: delayMs(1),
      fighters,
      ...(i === 0 ? { sound: 28 } : {}),
      // 举物+音效+物品名同帧出现(作者对照原版确认的「三同步」;一阶段 L15 同款)
      ...(i === 0 && itemName ? { banner: { text: itemName, durationMs: delayMs(13) } } : {}),
    })
  }
  for (let i = 5; i >= 0; i--) frames.push({ durationMs: delayMs(1), fighters: targets(i) })
  // 归位 = 瞬移(作者对照原版;fight.c 同为 UpdateFighters 直接复位)+ DM12 收尾停顿
  frames.push({
    durationMs: delayMs(8),
    fighters: [{ side: 'player', idx: casterIdx, pos: casterPos, frame: 0 }],
  })
  return frames
}

export interface BuildEnemyPhysicalInput {
  enemyIdx: number
  enemyPos: { x: number; y: number }
  targetIdx: number
  targetPos: { x: number; y: number }
  anim: { idleFrames: number; magicFrames: number; attackFrames: number; actWaitFrames: number }
  sounds: { action: number; call: number }
  damage: number
  targetDied: boolean
  /** 被动格挡(7/17「闪避」):frame3 免伤免数字,音换 coverSound,仍击退(fight.c:5052-5105)。 */
  blocked?: boolean
  /** 目标玩家的格挡音(rgwCoverSound;blocked 时替代 call)。 */
  coverSound?: number
}

/**
 * 敌人物攻时间线(fight.c:4910-5149 主干,含被动格挡;替挡 cover 待多队员):
 * magic 起手帧(each 2) → 前移 3−magicFrames 步(each 1) → action 音(1) → 冲至队员前(−44,−16)
 * attack 帧循环 → 命中:队员 frame4+染色+数字+call 音(1) → 击退(+8,+4)(1) → 后坐(+2,+1)(3)
 * → 敌回位 frame0(1) → 队员恢复(死2/站0)(1+4)。
 */
export function buildEnemyPhysical(input: BuildEnemyPhysicalInput): AnimFrame[] {
  const { enemyIdx, enemyPos, targetIdx, targetPos, anim, sounds, damage, targetDied } = input
  const blocked = input.blocked ?? false
  const { idleFrames, magicFrames, attackFrames, actWaitFrames } = anim
  const frames: AnimFrame[] = []
  let ex = enemyPos.x
  let ey = enemyPos.y
  for (let i = 0; i < magicFrames; i++) {
    frames.push({
      durationMs: delayMs(2),
      fighters: [{ side: 'enemy', idx: enemyIdx, frame: idleFrames + i }],
    })
  }
  for (let i = 0; i < 3 - magicFrames; i++) {
    ex -= 2
    ey -= 1
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'enemy', idx: enemyIdx, pos: { x: ex, y: ey } }],
    })
  }
  frames.push({ durationMs: delayMs(1), ...(sounds.action > 0 ? { sound: sounds.action } : {}) })
  const chargeX = targetPos.x - 44
  const chargeY = targetPos.y - 16
  if (attackFrames === 0) {
    frames.push({
      durationMs: delayMs(2),
      fighters: [
        {
          side: 'enemy',
          idx: enemyIdx,
          frame: Math.max(0, idleFrames - 1),
          pos: { x: chargeX, y: chargeY },
        },
      ],
    })
  } else {
    for (let i = 0; i <= attackFrames; i++) {
      frames.push({
        durationMs: delayMs(actWaitFrames),
        fighters: [
          {
            side: 'enemy',
            idx: enemyIdx,
            frame: idleFrames + magicFrames + i - 1,
            pos: { x: chargeX, y: chargeY },
          },
        ],
      })
    }
  }
  // 命中 / 格挡(fight.c:5052-5085:格挡 = frame3 免伤免闪白免数字,音换玩家 coverSound;
  // 击退在 gate 外 —— 格挡也被推)
  frames.push({
    durationMs: delayMs(1),
    fighters: [
      blocked
        ? { side: 'player', idx: targetIdx, frame: 3 }
        : { side: 'player', idx: targetIdx, frame: 4, colorShift: 6 },
    ],
    ...(blocked
      ? {}
      : { damageNum: { target: { side: 'player', idx: targetIdx }, value: damage } }),
    ...(blocked
      ? (input.coverSound ?? 0) > 0
        ? { sound: input.coverSound }
        : {}
      : sounds.call > 0
        ? { sound: sounds.call }
        : {}),
  })
  // 击退 + 后坐(格挡也被推,fight.c:5100-5105 在免伤 gate 外)
  const knockX = targetPos.x + 8
  const knockY = targetPos.y + 4
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, colorShift: 0, pos: { x: knockX, y: knockY } }],
  })
  frames.push({
    durationMs: delayMs(3),
    fighters: [{ side: 'player', idx: targetIdx, pos: { x: knockX + 2, y: knockY + 1 } }],
  })
  // 敌回位 + 队员恢复姿势
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'enemy', idx: enemyIdx, frame: 0, pos: { ...enemyPos } }],
  })
  frames.push({
    durationMs: delayMs(5),
    fighters: [
      { side: 'player', idx: targetIdx, frame: targetDied ? 2 : 0, pos: { ...targetPos } },
    ],
  })
  return frames
}

/** 法术播放参数(SkillAnimation 的消费面;缺省按原版 0 语义)。 */
export interface CastFxParams {
  placement: 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
  xOffset: number
  yOffset: number
  speed: number
  fireDelay: number
  effectTimes: number
  shake: number
  /** 屏幕波幅叠加(原 wWave;fight.c:2666 演出期 += 、末尾还原)。 */
  wave: number
  sound: number
}

export interface BuildPlayerCastInput {
  casterIdx: number
  casterPos: { x: number; y: number }
  /** 施法吟唱音(rgwMagicSound;挂 PreMagic frame5 姿势帧 —— 一阶段真值,曾误在起手即播早 ~6 帧)。 */
  magicSound?: number
  /** 施法前摇特效帧基 = battle-effect-index[spriteNum*2]*10+15;<0 = 跳过前摇特效。 */
  castEffectBase: number
  /** 本法术 fire sprite 帧数;<=0 = 无特效资产(只播姿势)。 */
  fireFrames: number
  fx: CastFxParams
  /** normal 落点(目标底锚;全体型忽略)。 */
  targetPos?: { x: number; y: number }
  /** 结算数字(特效播完后一帧弹;掉血者列表)。 */
  damageNums: Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }>
  /** 召唤神段(B5/P1 召唤束,fight.c:3072-3187):全员变亮 1..10 → crossfade in(队员溶出/
   *  神将溶入/背景染色,72×16ms)→ 神将 loop 0..n-2 → 定格末帧贯穿二次法术 → PostMagic
   *  (神在场)→ crossfade out。sound = 召唤自身音(变亮首帧一次,fight.c:3112;
   *  二次法术段 fSummon 不重复播音 fight.c:2669 —— 作者报剑神二次段错响御剑声)。 */
  summon?: { frames: number; frameTimeMs: number; x: number; y: number; sound?: number }
  /** 全队下标(召唤变亮/隐显用;缺省只有施法者)。 */
  partyIdxs?: number[]
  /** PostMagic 受击目标(fight.c:3190:掉血敌三轮交替位移抖动+第 2 轮闪白;idx+底锚)。 */
  postTargets?: Array<{ idx: number; pos: { x: number; y: number } }>
  /** 特效末帧烙背景(SkillAnimation.keepEffect;fight.c:2757)。 */
  keepEffect?: boolean
}

/** attackAll 三落点(fight.c:2766-2776 真值)。 */
const ATTACK_ALL_POS = [
  { x: 70, y: 140 },
  { x: 100, y: 110 },
  { x: 160, y: 100 },
] as const

/**
 * 玩家施法时间线(fight.c:2363-2444 PreMagic + 2608-2844 OffMagic 主干):
 * 上移 4 帧(x−=4−i,y−=⌊(4−i)/2⌋) → Delay2 → frame5 施法手势 → 前摇特效 10 帧(chunk10)
 * → OffMagic:l=(n−fd)×times+n+shake 帧、每帧 (speed+5)×10ms、frame6@i==fd、
 *   法术音 (i−fd)%n==0 循环播、落点按 placement → 结算数字 → 回位。
 */
export function buildPlayerCast(input: BuildPlayerCastInput): AnimFrame[] {
  const { casterIdx, casterPos, castEffectBase, fireFrames, fx, targetPos, damageNums } = input
  const frames: AnimFrame[] = []
  // —— PreMagic:上移 4 帧 ——
  let cx = casterPos.x
  let cy = casterPos.y
  for (let i = 0; i < 4; i++) {
    cx -= 4 - i
    cy -= Math.trunc((4 - i) / 2)
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: casterIdx, pos: { x: cx, y: cy } }],
    })
  }
  frames.push({ durationMs: delayMs(2) })
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: casterIdx, frame: 5 }],
    // 吟唱音挂 frame5 姿势帧(rgwMagicSound;一阶段真值,起手即播会早 ~6 帧)
    ...(input.magicSound ? { sound: input.magicSound } : {}),
  })
  if (castEffectBase >= 0) {
    for (let j = 0; j < 10; j++) {
      frames.push({
        durationMs: delayMs(1),
        overlays: [{ sheet: 'effect', frameIdx: castEffectBase + j, x: cx, y: cy }],
      })
    }
  }
  frames.push({ durationMs: delayMs(1) })

  // —— 召唤神段(P1 召唤束,fight.c:3110-3187)——
  const summonHold: OverlayDraw[] = []
  const inSummon = !!(input.summon && input.summon.frames > 0)
  if (input.summon && inSummon) {
    const sm = input.summon
    const party = input.partyIdxs ?? [casterIdx]
    // ① 全员变亮 iColorShift 1..10(fight.c:3120-3128;每级 Delay1)。
    //    召唤自身音挂变亮首帧(WIN95 fight.c:3112;一阶段 9ab63b6d「Sound before magic begins」)
    for (let i = 1; i <= 10; i++) {
      frames.push({
        durationMs: delayMs(1),
        fighters: party.map((idx) => ({ side: 'player' as const, idx, colorShift: i })),
        ...(i === 1 && sm.sound ? { sound: sm.sound } : {}),
      })
    }
    // ② crossfade in(72×16ms):队员溶出、神将 frame0 溶入、背景染色溶入(session 按相驱动)
    frames.push({
      durationMs: 72 * 16,
      summonPhase: 'in',
      overlays: [{ sheet: 'summon', frameIdx: 0, x: sm.x, y: sm.y }],
    })
    // ③ 神将现身 loop 0..n-2(队员已隐)
    for (let i = 0; i < Math.max(1, sm.frames - 1); i++) {
      frames.push({
        durationMs: sm.frameTimeMs,
        summonPhase: 'hold',
        overlays: [{ sheet: 'summon', frameIdx: i, x: sm.x, y: sm.y }],
      })
    }
    summonHold.push({ sheet: 'summon', frameIdx: Math.max(0, sm.frames - 1), x: sm.x, y: sm.y })
  }

  // —— OffMagic:fire sprite 帧循环 ——
  if (fireFrames > 0) {
    const n = fireFrames
    const fd = Math.min(fx.fireDelay, n - 1)
    const l = (n - fd) * fx.effectTimes + n + fx.shake
    const frameDur = (fx.speed + 5) * 10
    const drop = (k: number): OverlayDraw[] => {
      if (fx.placement === 'attackAll') {
        return ATTACK_ALL_POS.map((p) => ({
          sheet: 'magic' as const,
          frameIdx: k,
          x: p.x + fx.xOffset,
          y: p.y + fx.yOffset,
        }))
      }
      const base =
        fx.placement === 'attackWhole'
          ? { x: 120, y: 100 }
          : fx.placement === 'attackField'
            ? { x: 160, y: 200 }
            : (targetPos ?? { x: 160, y: 100 })
      return [{ sheet: 'magic', frameIdx: k, x: base.x + fx.xOffset, y: base.y + fx.yOffset }]
    }
    for (let i = 0; i < l; i++) {
      const inShake = l - i <= fx.shake
      const k = inShake ? (l - fx.shake - 1) % n : i < n ? i : ((i - fd) % (n - fd)) + fd
      frames.push({
        durationMs: frameDur,
        overlays: [...drop(k), ...summonHold],
        // 召唤期二次法术:队员保持隐(神将定格在场,fight.c:3186 fSummon 语义)
        ...(inSummon ? { summonPhase: 'hold' as const } : {}),
        ...(!inSummon && i === fd
          ? { fighters: [{ side: 'player' as const, idx: casterIdx, frame: 6 }] }
          : {}),
        // 二次法术段不播二级自身音(fSummon 门,fight.c:2669 WIN95;作者报剑神段错响御剑声)
        ...(!inSummon && fx.sound > 0 && i >= fd && (i - fd) % n === 0
          ? { sound: fx.sound }
          : {}),
        // 屏波:OffMagic 首帧设叠加值(fight.c:2666 wScreenWave += wWave;收尾还原在 session)
        ...(i === 0 && fx.wave > 0 ? { waveAdd: fx.wave } : {}),
        // 震屏:末 wShake 帧逐帧触发(fight.c:2718 VIDEO_ShakeScreen(i,3))
        ...(inShake ? { screenShake: true } : {}),
        // keepEffect:末帧烙进背景(fight.c:2757 i==l−1;屏波门在 session 按活值判)
        ...(i === l - 1 && input.keepEffect ? { burnBg: drop(k) } : {}),
      })
    }
  }

  // —— PostMagic(fight.c:3190-3240):掉血敌三轮位移抖动 x−8→−4→−6(dist 8 交替减半累积),
  //    第 2 轮 colorShift=6 闪白;末帧复位。缺 = 无目标掉血(治疗系)。召唤期神将在场时抖
  //    (fight.c:4323 先 PostMagic、889 后才淡出 —— 一阶段 49fe8a63 血泪序)。——
  if (input.postTargets?.length) {
    const SHAKE_X = [-8, -4, -6]
    for (let r = 0; r < 3; r++) {
      frames.push({
        durationMs: delayMs(1),
        ...(inSummon ? { summonPhase: 'hold' as const, overlays: [...summonHold] } : {}),
        fighters: input.postTargets.map((t) => ({
          side: 'enemy' as const,
          idx: t.idx,
          pos: { x: t.pos.x + SHAKE_X[r]!, y: t.pos.y },
          colorShift: r === 1 ? 6 : 0,
        })),
      })
    }
    frames.push({
      durationMs: delayMs(1),
      ...(inSummon ? { summonPhase: 'hold' as const, overlays: [...summonHold] } : {}),
      fighters: input.postTargets.map((t) => ({
        side: 'enemy' as const,
        idx: t.idx,
        pos: { x: t.pos.x, y: t.pos.y },
        colorShift: 0,
      })),
    })
  }

  // —— 召唤 crossfade out(fight.c:897-912:复位队员先于淡出 —— 一阶段 7e49327b 血泪:
  //    否则溶回目标是施法帧+高亮残留;复位由 session 在 'out' 相起点执行)——
  if (inSummon) {
    frames.push({ durationMs: 72 * 16, summonPhase: 'out', overlays: [...summonHold] })
  }

  // —— 结算数字 + 回位 ——
  frames.push({
    durationMs: delayMs(2),
    ...(damageNums.length ? { damageNums } : {}),
    fighters: [{ side: 'player', idx: casterIdx, frame: 0, pos: { ...casterPos } }],
  })
  return frames
}

/** 合击聚拢队列落点(fight.c COOP_POS;320×200 屏坐标,与队员底锚同系)。 */
const COOP_POS: ReadonlyArray<readonly [number, number]> = [
  [208, 157],
  [234, 170],
  [260, 183],
]
/** 非召唤合击起手音(fight.c:3875 固定 29)。 */
const COOP_CAST_SOUND = 29

export interface BuildPlayerCoopInput {
  /** 发起者 slot 索引。 */
  casterIdx: number
  /** 贡献者 slot 索引集合(含发起者;= 结算时 healthy 队员,由 core 回填)。 */
  contributorIdxs: number[]
  /** 在场队员数(t 计数遍历全队 slot;非贡献者也占 t 槽,fight.c:3905)。 */
  partySize: number
  /** 各 slot 站立底锚(index = slot;越界/无 = undefined)。 */
  partyPositions: ReadonlyArray<{ x: number; y: number } | undefined>
  /** fire 精灵帧数 + 特效参数 + 目标落点(同 buildPlayerCast)。 */
  fireFrames: number
  fx: CastFxParams
  targetPos?: { x: number; y: number }
  /** 结算伤害数字(挂 PostMagic 首帧)。 */
  damageNums: Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }>
  /** PostMagic 抖动的掉血敌(idx + idle 底锚)。 */
  postTargets?: { idx: number; pos: { x: number; y: number } }[]
}

/**
 * 协力合击动画(port fight.c:3856-4107 PAL_CLASSIC 非召唤分支 / anim-timeline.ts buildCoopMagicTimeline):
 *  ① 聚拢:全贡献者 6 帧插值滑向 COOP_POS(发起者→[0],余者按 t 槽)。
 *  ② 蓄势:非发起贡献者 slot 倒序(后→前)逐个摆施法姿 frame5。
 *  ③ 发起者闪白(colorShift6+frame5,起手音29)→ ④ 出招(frame6)。
 *  ⑤ OffMagic:fire 精灵放法术特效(caster 已 frame6,不再注入)。
 *  ⑥ PostMagic:掉血敌三轮抖动 + 闪白,伤害数字挂首帧。
 *  ⑦ 滑回:全贡献者反向插值回原位 + frame0(t 计数仅非发起贡献者递增,fight.c:4091 非对称,如实复刻)。
 * 召唤类合击直接走 buildPlayerCast(summon 段),不经此(作者:召唤直接播召唤动画)。
 */
export function buildPlayerCoop(input: BuildPlayerCoopInput): AnimFrame[] {
  const { casterIdx, contributorIdxs, partySize, partyPositions, fireFrames, fx, targetPos, damageNums, postTargets } = input
  const isContrib = (j: number): boolean => contributorIdxs.includes(j)
  const lerp = (orig: number, coop: number, num: number): number => Math.trunc((orig * (6 - num) + coop * num) / 6)
  const frames: AnimFrame[] = []

  // ① 聚拢(i=1..6)
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = partyPositions[casterIdx]
    if (oc) fighters.push({ side: 'player', idx: casterIdx, pos: { x: lerp(oc.x, COOP_POS[0]![0], i), y: lerp(oc.y, COOP_POS[0]![1], i) } })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (j === casterIdx) continue
      t++ // fight.c:3905:非发起者都占 t 槽(贡献判定之前自增)
      if (!isContrib(j)) continue
      const oj = partyPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({ side: 'player', idx: j, pos: { x: lerp(oj.x, cp[0], i), y: lerp(oj.y, cp[1], i) } })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  // ② 非发起贡献者逐个 frame5(slot 倒序 = 后→前)
  for (let i = partySize - 1; i >= 0; i--) {
    if (i === casterIdx || !isContrib(i)) continue
    frames.push({ durationMs: delayMs(3), fighters: [{ side: 'player', idx: i, frame: 5 }] })
  }

  // ③ 发起者闪白 + 起手音 → ④ 出招
  frames.push({ durationMs: delayMs(5), sound: COOP_CAST_SOUND, fighters: [{ side: 'player', idx: casterIdx, colorShift: 6, frame: 5 }] })
  frames.push({ durationMs: delayMs(3), fighters: [{ side: 'player', idx: casterIdx, colorShift: 0, frame: 6 }] })

  // ⑤ OffMagic:fire 精灵帧循环(caster 已 frame6,不注入)
  if (fireFrames > 0) {
    const n = fireFrames
    const fd = Math.min(fx.fireDelay, n - 1)
    const l = (n - fd) * fx.effectTimes + n + fx.shake
    const frameDur = (fx.speed + 5) * 10
    const drop = (k: number): OverlayDraw[] => {
      if (fx.placement === 'attackAll') {
        return ATTACK_ALL_POS.map((p) => ({ sheet: 'magic' as const, frameIdx: k, x: p.x + fx.xOffset, y: p.y + fx.yOffset }))
      }
      const base =
        fx.placement === 'attackWhole'
          ? { x: 120, y: 100 }
          : fx.placement === 'attackField'
            ? { x: 160, y: 200 }
            : (targetPos ?? { x: 160, y: 100 })
      return [{ sheet: 'magic', frameIdx: k, x: base.x + fx.xOffset, y: base.y + fx.yOffset }]
    }
    for (let i = 0; i < l; i++) {
      const inShake = l - i <= fx.shake
      const k = inShake ? (l - fx.shake - 1) % n : i < n ? i : ((i - fd) % (n - fd)) + fd
      frames.push({
        durationMs: frameDur,
        overlays: drop(k),
        ...(fx.sound > 0 && i >= fd && (i - fd) % n === 0 ? { sound: fx.sound } : {}),
        ...(i === 0 && fx.wave > 0 ? { waveAdd: fx.wave } : {}),
        ...(inShake ? { screenShake: true } : {}),
      })
    }
  }

  // ⑥ PostMagic:掉血敌三轮抖动 + 第2轮闪白;伤害数字挂首帧
  if (postTargets?.length) {
    const SHAKE_X = [-8, -4, -6]
    for (let r = 0; r < 3; r++) {
      frames.push({
        durationMs: delayMs(1),
        ...(r === 0 && damageNums.length ? { damageNums } : {}),
        fighters: postTargets.map((t) => ({ side: 'enemy' as const, idx: t.idx, pos: { x: t.pos.x + SHAKE_X[r]!, y: t.pos.y }, colorShift: r === 1 ? 6 : 0 })),
      })
    }
    frames.push({ durationMs: delayMs(1), fighters: postTargets.map((t) => ({ side: 'enemy' as const, idx: t.idx, pos: { x: t.pos.x, y: t.pos.y }, colorShift: 0 })) })
  } else if (damageNums.length) {
    frames.push({ durationMs: delayMs(2), damageNums })
  }

  // ⑦ 滑回(i=1..6):反向插值回原位 + frame0(t 仅非发起贡献者递增,fight.c:4091)
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = partyPositions[casterIdx]
    if (oc) fighters.push({ side: 'player', idx: casterIdx, frame: 0, pos: { x: Math.trunc((oc.x * i + COOP_POS[0]![0] * (6 - i)) / 6), y: Math.trunc((oc.y * i + COOP_POS[0]![1] * (6 - i)) / 6) } })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (!isContrib(j)) continue
      if (j === casterIdx) continue
      t++
      const oj = partyPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({ side: 'player', idx: j, frame: 0, pos: { x: Math.trunc((oj.x * i + cp[0] * (6 - i)) / 6), y: Math.trunc((oj.y * i + cp[1] * (6 - i)) / 6) } })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  return frames
}

export interface BuildEnemyCastInput {
  enemyIdx: number
  anim: { idleFrames: number; magicFrames: number }
  /** 敌施法起手音(sounds.magic)。 */
  magicSound: number
  fireFrames: number
  fx: CastFxParams
  /** normal 落点(目标队员底锚)。 */
  targetPos?: { x: number; y: number }
  damageNums: Array<{ target: { side: 'player' | 'enemy'; idx: number }; value: number }>
  /** 受伤队员(idx+底锚;受击反应帧用 —— 一阶段 19f8d6a9 曾整段漏「我方受击纹丝不动」)。 */
  hurtPlayers?: Array<{ idx: number; pos: { x: number; y: number } }>
  /** 特效末帧烙背景(fight.c:2983 敌施法同款)。 */
  keepEffect?: boolean
  /** 被动格挡队员(1/3 掷中,伤害除因子 +1):摆防御姿 frame3(fight.c:4737-4738/4755-4756)。 */
  autoDefendPlayers?: number[]
}

/**
 * 敌施法时间线:magic 起手帧(idleFrames+i,each Delay2,同物攻起手)+ magic 音
 * → fire 特效帧循环(落点=目标队员/全场) → 结算数字 + 敌回 idle。
 */
export function buildEnemyCast(input: BuildEnemyCastInput): AnimFrame[] {
  const { enemyIdx, anim, magicSound, fireFrames, fx, targetPos, damageNums } = input
  const frames: AnimFrame[] = []
  for (let i = 0; i < Math.max(1, anim.magicFrames); i++) {
    frames.push({
      durationMs: delayMs(2),
      fighters: [
        { side: 'enemy', idx: enemyIdx, frame: anim.magicFrames > 0 ? anim.idleFrames + i : 0 },
      ],
      ...(i === 0 && magicSound > 0 ? { sound: magicSound } : {}),
    })
  }
  // 被动格挡摆防御姿 frame3:注入起手**末帧**、特效前(fight.c:4737-4738/4755-4756;一阶段
  // DL10b 修过「早数帧」的坑)。姿势由 session 收尾 resetVisual 归位。
  if (input.autoDefendPlayers?.length) {
    const tail = frames[frames.length - 1]!
    tail.fighters = [
      ...(tail.fighters ?? []),
      ...input.autoDefendPlayers.map((idx) => ({ side: 'player' as const, idx, frame: 3 })),
    ]
  }
  if (fireFrames > 0) {
    const n = fireFrames
    const fd = Math.min(fx.fireDelay, n - 1)
    const l = (n - fd) * fx.effectTimes + n + fx.shake
    const frameDur = (fx.speed + 5) * 10
    for (let i = 0; i < l; i++) {
      const inShake = l - i <= fx.shake
      const k = inShake ? (l - fx.shake - 1) % n : i < n ? i : ((i - fd) % (n - fd)) + fd
      const base =
        fx.placement === 'attackWhole' ||
        fx.placement === 'attackField' ||
        fx.placement === 'attackAll'
          ? { x: 160, y: 100 } // 敌方全体术打全队:屏中(简化;原版逐队员落点后续)
          : (targetPos ?? { x: 160, y: 130 })
      const ov: OverlayDraw[] = [
        { sheet: 'magic', frameIdx: k, x: base.x + fx.xOffset, y: base.y + fx.yOffset },
      ]
      frames.push({
        durationMs: frameDur,
        overlays: ov,
        ...(fx.sound > 0 && i >= fd && (i - fd) % n === 0 ? { sound: fx.sound } : {}),
        // 屏波/震屏同玩家侧(fight.c:2942 敌施法同款孪生)
        ...(i === 0 && fx.wave > 0 ? { waveAdd: fx.wave } : {}),
        ...(inShake ? { screenShake: true } : {}),
        // keepEffect:末帧烙背景(fight.c:2983 敌施法同款)
        ...(i === l - 1 && input.keepEffect ? { burnBg: ov } : {}),
      })
    }
  }
  // 受伤队员受击反应(一阶段 buildPlayerMagicHitReaction;fight.c:4802+ 命中循环):
  // 5 帧 frame4 受击姿 + 前 3 帧红闪(colorShift 6)+ 递减击退 pos += (8>>i, 4>>i)。
  // 位置由收尾 resetVisual 归位(原版 UpdateFighters 语义)。
  if (input.hurtPlayers?.length) {
    const off = { x: 0, y: 0 }
    for (let i = 0; i < 5; i++) {
      off.x += 8 >> i
      off.y += 4 >> i
      frames.push({
        durationMs: delayMs(1),
        fighters: input.hurtPlayers.map((hp) => ({
          side: 'player' as const,
          idx: hp.idx,
          frame: 4,
          pos: { x: hp.pos.x + off.x, y: hp.pos.y + off.y },
          colorShift: i < 3 ? 6 : 0,
        })),
      })
    }
  }
  frames.push({
    durationMs: delayMs(2),
    ...(damageNums.length ? { damageNums } : {}),
    fighters: [{ side: 'enemy', idx: enemyIdx, frame: 0 }],
  })
  return frames
}

export interface AnimSideEffects {
  onSound?(id: number): void
  onDamage?(target: { side: 'player' | 'enemy'; idx: number }, value: number): void
  onFighter?(d: FighterDelta): void
  onOverlay?(o: OverlayDraw[] | null): void
  /** 震屏帧进入(参数 = 本帧时长;session 累计 shakeUntil,fight.c:2718)。 */
  onScreenShake?(durationMs: number): void
  /** 屏幕波幅叠加设值(OffMagic 首帧;收尾还原由 session 管,fight.c:2666/2835)。 */
  onWaveAdd?(wave: number): void
  /** 召唤相切换(每帧派发当前相;null = 本帧无相 → session 清态)。 */
  onSummonPhase?(phase: 'in' | 'hold' | 'out' | null): void
  /** keepEffect 烙背景(末帧一次;session 屏波 ≥9 时丢弃,fight.c:2757 wScreenWave<9 门)。 */
  onBurnBg?(marks: OverlayDraw[]): void
  /** 战斗消息条(物品名等;进入带 banner 的帧时派发一次)。 */
  onBanner?(text: string, durationMs: number): void
}

/** 逐帧推进器:进入新帧时应用 deltas + 派发副作用(每帧恰一次;wall-clock dt 驱动)。 */
export class AnimPlayer {
  private idx = -1
  private elapsed = 0

  constructor(
    private readonly frames: AnimFrame[],
    private readonly fx: AnimSideEffects,
  ) {}

  /** 推进 dt;进入的每个新帧派发其副作用。返回是否播完。 */
  tick(dtMs: number): boolean {
    if (this.idx >= this.frames.length) return true
    this.elapsed += dtMs
    while (true) {
      const cur = this.frames[this.idx]
      const remain = cur ? cur.durationMs : 0
      if (this.idx >= 0 && this.elapsed < remain) return false
      if (this.idx >= 0) this.elapsed -= remain
      this.idx++
      const next = this.frames[this.idx]
      if (!next) {
        this.fx.onOverlay?.(null)
        return true
      }
      this.enter(next)
    }
  }

  private enter(f: AnimFrame): void {
    if (f.fighters) for (const d of f.fighters) this.fx.onFighter?.(d)
    this.fx.onOverlay?.(f.overlays ?? null)
    if (f.sound !== undefined && f.sound > 0) this.fx.onSound?.(f.sound)
    if (f.damageNum) this.fx.onDamage?.(f.damageNum.target, f.damageNum.value)
    if (f.damageNums) for (const d of f.damageNums) this.fx.onDamage?.(d.target, d.value)
    if (f.screenShake) this.fx.onScreenShake?.(f.durationMs)
    if (f.waveAdd !== undefined) this.fx.onWaveAdd?.(f.waveAdd)
    if (f.burnBg?.length) this.fx.onBurnBg?.(f.burnBg)
    if (f.banner) this.fx.onBanner?.(f.banner.text, f.banner.durationMs)
    this.fx.onSummonPhase?.(f.summonPhase ?? null)
  }
}
