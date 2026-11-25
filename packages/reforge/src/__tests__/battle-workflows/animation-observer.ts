import type { EnemyBattleSpriteProfile } from '@type-pal/content'
import type { AnimFrame } from '../../battle/battle-anim.js'
import { AnimPlayer } from '../../battle/battle-animation-player.js'

export function enemyProfile(
  idleFrames = 4,
  magicFrames = 0,
  attackFrames = 2,
  actTicksPerFrame = 1,
): EnemyBattleSpriteProfile {
  return {
    kind: 'enemy',
    idle: { start: 0, count: idleFrames },
    magic: { start: idleFrames, count: magicFrames },
    attack: { start: idleFrames + magicFrames, count: attackFrames },
    idleTicksPerFrame: 1,
    actTicksPerFrame,
  }
}

/** Record the playback port in order, retaining positions, sprite frame numbers and sound IDs. */
export function recordBattleAnimation(frames: AnimFrame[]) {
  const events: string[] = []
  const player = new AnimPlayer(frames, {
    onSound: (id) => events.push(`snd:${id}`),
    onDamage: (target, value) => events.push(`dmg:${target.side}${target.idx}:${value}`),
    onFighter: (pose) => {
      const frame = pose.frame === undefined ? '' : `#${pose.frame}`
      const position = pose.pos ? `@${pose.pos.x},${pose.pos.y}` : ''
      const color = pose.colorShift === undefined ? '' : `c${pose.colorShift}`
      events.push(`f:${pose.side}${pose.idx}${frame}${position}${color}`)
    },
    onBanner: (text, durationMs) => events.push(`banner:${text}:${durationMs}`),
  })
  return { events, player }
}

export function finishRecordedAnimation(player: AnimPlayer, stepMs: number): void {
  for (let tick = 0; tick < 200; tick += 1) if (player.tick(stepMs)) return
  throw new Error('Battle animation did not finish within 200 playback steps')
}
