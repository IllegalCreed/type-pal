import type { BattleSpriteDef, BattleSpriteProfile, PlayerFighterFrames } from '@type-pal/content'
import type { BattleSpriteReplacementProof } from './battle-sprite-commands.js'

export interface BattleSpriteFrameDeletionPlan {
  repairs: NonNullable<BattleSpriteReplacementProof['repairs']>
  consumerSnapshots: NonNullable<BattleSpriteReplacementProof['consumerSnapshots']>
  changes: string[]
}

function remapDeletedFrame(index: number, deletedIndex: number, nextFrameCount: number): number {
  if (index < deletedIndex) return index
  if (index > deletedIndex) return index - 1
  return Math.min(deletedIndex, nextFrameCount - 1)
}

export function planBattleSpriteFrameDeletion(
  consumers: readonly BattleSpriteDef[],
  deletedIndex: number,
  previousFrameCount: number,
): BattleSpriteFrameDeletionPlan {
  if (!Number.isInteger(deletedIndex) || deletedIndex < 0 || deletedIndex >= previousFrameCount)
    throw new Error('待删除的战斗精灵帧不存在')
  if (previousFrameCount <= 1) throw new Error('战斗精灵至少必须保留 1 帧')
  const nextFrameCount = previousFrameCount - 1
  const repairs: NonNullable<BattleSpriteReplacementProof['repairs']> = {}
  const consumerSnapshots: NonNullable<BattleSpriteReplacementProof['consumerSnapshots']> = {}
  const changes: string[] = []
  for (const consumer of consumers) {
    consumerSnapshots[consumer.id] = { profile: structuredClone(consumer.profile) }
    const profile = consumer.profile
    if (profile.kind === 'player-fighter') {
      const map = (index: number): number => remapDeletedFrame(index, deletedIndex, nextFrameCount)
      const frames: PlayerFighterFrames = {
        idle: map(profile.frames.idle),
        dying: map(profile.frames.dying),
        dead: map(profile.frames.dead),
        defend: map(profile.frames.defend),
        hurt: map(profile.frames.hurt),
        preMagic: map(profile.frames.preMagic),
        magic: map(profile.frames.magic),
        attackWindup: map(profile.frames.attackWindup),
        attackRush: map(profile.frames.attackRush),
        attackStrike: map(profile.frames.attackStrike),
        ...(profile.frames.steal === undefined ? {} : { steal: map(profile.frames.steal) }),
      }
      repairs[consumer.id] = { profile: { ...profile, frames } }
      const affected = Object.entries(profile.frames)
        .filter(([, frame]) => frame === deletedIndex || frame > deletedIndex)
        .map(([key]) => key)
      if (affected.length) changes.push(`${consumer.label}：重排 ${affected.length} 个动作槽位`)
    } else if (profile.kind === 'enemy') {
      let idleCount = profile.idle.count
      let magicCount = profile.magic.count
      let attackCount = profile.attack.count
      const magicEnd = idleCount + magicCount
      const attackEnd = magicEnd + attackCount
      if (deletedIndex < idleCount) {
        if (idleCount > 1) idleCount--
        else if (magicCount > 0) magicCount--
        else if (attackCount > 0) attackCount--
      } else if (deletedIndex < magicEnd) magicCount--
      else if (deletedIndex < attackEnd) attackCount--
      const nextProfile: BattleSpriteProfile = {
        ...profile,
        idle: { start: 0, count: idleCount },
        magic: { start: idleCount, count: magicCount },
        attack: { start: idleCount + magicCount, count: attackCount },
      }
      repairs[consumer.id] = { profile: nextProfile }
      if (
        idleCount !== profile.idle.count ||
        magicCount !== profile.magic.count ||
        attackCount !== profile.attack.count
      )
        changes.push(
          `${consumer.label}：动作分段 ${profile.idle.count}/${profile.magic.count}/${profile.attack.count} → ${idleCount}/${magicCount}/${attackCount}`,
        )
    } else repairs[consumer.id] = { profile: structuredClone(profile) }
  }
  return { repairs, consumerSnapshots, changes }
}
