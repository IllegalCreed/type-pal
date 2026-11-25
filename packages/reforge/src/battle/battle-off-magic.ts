import {
  type ResolvedSkillExecution,
  type SkillAnimation,
  type SkillData,
  skillAnimationFrameDurationMs,
} from '@type-pal/content'

const MAX_FIRE_FRAMES = 1024
const MAX_FIRE_DURATION_MS = 30_000

export function checkedFireFrameDurationMs(
  frameCount: number,
  speed: number | undefined,
  subject = '法术特效',
): number {
  if (frameCount > MAX_FIRE_FRAMES)
    throw new Error(`${subject}: ${frameCount} 帧超过 ${MAX_FIRE_FRAMES} 帧`)
  const frameDurationMs = skillAnimationFrameDurationMs(speed)
  const durationMs = frameCount * frameDurationMs
  if (durationMs > MAX_FIRE_DURATION_MS)
    throw new Error(`${subject}: ${durationMs} 毫秒超过 ${MAX_FIRE_DURATION_MS} 毫秒`)
  return frameDurationMs
}

/** Only normal, friendly player spells without a summoned figure use one pass through FIRE. */
export function playsDefensiveFire(
  target: SkillData['target'],
  execution: ResolvedSkillExecution,
): boolean {
  return (
    (target === 'self' || target === 'oneAlly' || target === 'allAllies') &&
    (execution.animation.placement ?? 'normal') === 'normal' &&
    !execution.effects.some((effect) => effect.kind === 'summon')
  )
}

/** FIRE 的帧数同时决定特效时长和 0x6B 的抽样次数（fight.c:2661–2681）。 */
export function getOffMagicTiming(
  fireFrames: number,
  animation: Pick<SkillAnimation, 'fireDelay' | 'effectTimes' | 'shake' | 'speed'>,
  subject?: string,
) {
  // Both renderers repeat at least the last available image when the authored delay exceeds the sheet.
  const fireDelay = Math.min(animation.fireDelay ?? 0, fireFrames - 1)
  const activeFrames = fireFrames + (fireFrames - fireDelay) * (animation.effectTimes ?? 0)
  const totalFrames = activeFrames + (animation.shake ?? 0)
  return {
    fireFrames,
    fireDelay,
    activeFrames,
    totalFrames,
    frameDurationMs: checkedFireFrameDurationMs(totalFrames, animation.speed, subject),
  }
}

/** Resolve the repeated or held image without creating a second copy of the timeline. */
export function getOffMagicFrame(timing: ReturnType<typeof getOffMagicTiming>, index: number) {
  const { activeFrames, fireFrames, fireDelay } = timing
  const inShake = index >= activeFrames
  const frameIdx = inShake
    ? (activeFrames - 1) % fireFrames
    : index < fireFrames
      ? index
      : ((index - fireDelay) % (fireFrames - fireDelay)) + fireDelay
  return { inShake, frameIdx }
}
