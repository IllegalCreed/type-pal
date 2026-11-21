import type { SkillAnimation } from '@type-pal/content'

/** FIRE 的帧数同时决定特效时长和 0x6B 的抽样次数（fight.c:2661–2681）。 */
export function getOffMagicTiming(
  fireFrames: number,
  animation: Pick<SkillAnimation, 'fireDelay' | 'effectTimes' | 'shake'>,
): { fireDelay: number; totalFrames: number } {
  const fireDelay = Math.min(animation.fireDelay ?? 0, fireFrames - 1)
  const totalFrames =
    fireFrames + (fireFrames - fireDelay) * (animation.effectTimes ?? 0) + (animation.shake ?? 0)
  return { fireDelay, totalFrames }
}
