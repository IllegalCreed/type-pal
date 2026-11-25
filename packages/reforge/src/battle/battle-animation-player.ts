import type { AssetId } from '@type-pal/content'
import type { AnimFrame, EnemySummonFade, FighterDelta, OverlayDraw } from './battle-anim.js'

export interface AnimSideEffects {
  onSound?(asset: AssetId): void
  onDamage?(
    target: { side: 'player' | 'enemy'; idx: number },
    value: number,
    tone?: 'blue' | 'yellow' | 'cyan',
    anchor?: { x: number; y: number },
  ): void
  onFighter?(d: FighterDelta): void
  onOverlay?(o: OverlayDraw[] | null): void
  /** 震屏帧进入(参数 = 本帧时长;session 累计 shakeUntil,fight.c:2718)。 */
  onScreenShake?(durationMs: number, level?: number): void
  /** 屏幕波幅叠加设值(OffMagic 首帧;收尾还原由 session 管,fight.c:2666/2835)。 */
  onWaveAdd?(wave: number): void
  onAppearanceTransition?(transition: NonNullable<AnimFrame['appearanceTransition']>): void
  /** 召唤相切换(每帧派发当前相;null = 本帧无相 → session 清态)。 */
  onSummonPhase?(phase: 'in' | 'hold' | 'out' | null): void
  onEnemySummonFade?(fade: EnemySummonFade | null): void
  /** keepEffect 烙背景(末帧一次;session 屏波 ≥9 时丢弃,fight.c:2757 wScreenWave<9 门)。 */
  onBurnBg?(marks: OverlayDraw[]): void
  /** 战斗消息条(物品名等;进入带 banner 的帧时派发一次)。 */
  onBanner?(text: string, durationMs: number, x?: number, y?: number): void
  onActionFeedback?(): void
  onHidingFade?(): void
  onRevealEnemyConfusion?(): void
  onEnemyDeathFade?(): void
}

/** 逐帧推进器:进入新帧时应用 deltas + 派发副作用(每帧恰一次;wall-clock dt 驱动)。 */
export class AnimPlayer {
  private idx = -1
  private elapsed = 0

  constructor(
    private readonly frames: AnimFrame[],
    private readonly fx: AnimSideEffects,
  ) {}

  get frameShakeOffsetY(): number | undefined {
    return this.frames[this.idx]?.frameShakeOffsetY
  }

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
      if (next.waitForActionFeedback || next.waitForEnemyDeathFade || next.waitForHidingFade) {
        // Discard overrun at a presentation hold so recovery starts after it.
        this.elapsed = 0
        if (next.waitForActionFeedback) this.fx.onActionFeedback?.()
        if (next.waitForEnemyDeathFade) this.fx.onEnemyDeathFade?.()
        if (next.waitForHidingFade) this.fx.onHidingFade?.()
        return false
      }
    }
  }

  /** Frame time beyond the last frame of a finished timeline. */
  get overrunMs(): number {
    return this.idx >= this.frames.length ? this.elapsed : 0
  }

  private enter(f: AnimFrame): void {
    if (f.fighters) for (const d of f.fighters) this.fx.onFighter?.(d)
    this.fx.onOverlay?.(f.overlays ?? null)
    if (f.revealEnemyConfusion) this.fx.onRevealEnemyConfusion?.()
    if (f.sound) this.fx.onSound?.(f.sound)
    if (f.damageNum)
      this.fx.onDamage?.(f.damageNum.target, f.damageNum.value, undefined, f.damageNum.anchor)
    if (f.damageNums) for (const d of f.damageNums) this.fx.onDamage?.(d.target, d.value, d.tone)
    if (f.screenShake) this.fx.onScreenShake?.(f.durationMs, f.screenShakeLevel)
    if (f.waveAdd !== undefined) this.fx.onWaveAdd?.(f.waveAdd)
    if (f.appearanceTransition) this.fx.onAppearanceTransition?.(f.appearanceTransition)
    if (f.burnBg?.length) this.fx.onBurnBg?.(f.burnBg)
    if (f.banner) this.fx.onBanner?.(f.banner.text, f.banner.durationMs, f.banner.x, f.banner.y)
    this.fx.onSummonPhase?.(f.summonPhase ?? null)
    this.fx.onEnemySummonFade?.(f.enemySummonFade ?? null)
  }
}
