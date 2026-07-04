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

export interface AnimFrame {
  durationMs: number
  fighters?: FighterDelta[]
  /** 命中特效 overlay(effect.rle 帧;坐标 = 特效图左上落点参考,画法见 session)。 */
  overlay?: { frameIdx: number; x: number; y: number }
  damageNum?: { target: { side: 'player' | 'enemy'; idx: number }; value: number }
  sound?: number
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
        ? { overlay: { frameIdx: effectFrameBase + i, x: fxX - 16 * i, y: fxY + 16 * i } }
        : {}),
      ...(i === 0
        ? { damageNum: { target: { side: 'enemy', idx: targetIdx }, value: damage } }
        : {}),
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

export interface BuildEnemyPhysicalInput {
  enemyIdx: number
  enemyPos: { x: number; y: number }
  targetIdx: number
  targetPos: { x: number; y: number }
  anim: { idleFrames: number; magicFrames: number; attackFrames: number; actWaitFrames: number }
  sounds: { action: number; call: number }
  damage: number
  targetDied: boolean
}

/**
 * 敌人物攻时间线(fight.c:4910-5149 主干,无格挡/替挡):
 * magic 起手帧(each 2) → 前移 3−magicFrames 步(each 1) → action 音(1) → 冲至队员前(−44,−16)
 * attack 帧循环 → 命中:队员 frame4+染色+数字+call 音(1) → 击退(+8,+4)(1) → 后坐(+2,+1)(3)
 * → 敌回位 frame0(1) → 队员恢复(死2/站0)(1+4)。
 */
export function buildEnemyPhysical(input: BuildEnemyPhysicalInput): AnimFrame[] {
  const { enemyIdx, enemyPos, targetIdx, targetPos, anim, sounds, damage, targetDied } = input
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
  // 命中
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, frame: 4, colorShift: 6 }],
    damageNum: { target: { side: 'player', idx: targetIdx }, value: damage },
    ...(sounds.call > 0 ? { sound: sounds.call } : {}),
  })
  // 击退 + 后坐
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

export interface AnimSideEffects {
  onSound?(id: number): void
  onDamage?(target: { side: 'player' | 'enemy'; idx: number }, value: number): void
  onFighter?(d: FighterDelta): void
  onOverlay?(o: { frameIdx: number; x: number; y: number } | null): void
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
    this.fx.onOverlay?.(f.overlay ?? null)
    if (f.sound !== undefined && f.sound > 0) this.fx.onSound?.(f.sound)
    if (f.damageNum) this.fx.onDamage?.(f.damageNum.target, f.damageNum.value)
  }
}
