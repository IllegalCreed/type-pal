import {
  type ItemDataMap,
  resolveSkillExecution,
  type SkillAnimation,
  type SkillData,
} from '@type-pal/content'
import type { LoadedSprite } from '../assets.js'
import {
  checkedFireFrameDurationMs,
  getOffMagicTiming,
  playsDefensiveFire,
} from './battle-off-magic.js'

interface BattleFireUse {
  subject: string
  animation: SkillAnimation
  sequence: 'repeat' | 'once'
}

export function collectBattleSkillFireUses(input: {
  playerSkillIds: readonly (readonly string[])[]
  cooperativeSkillIds: readonly string[]
  reachableEnemySkillIds: readonly string[]
  skillsById: Readonly<Record<string, SkillData>>
}): BattleFireUse[] {
  const uses: BattleFireUse[] = []
  const include = (skillId: string, side: 'player' | 'enemy'): void => {
    const skill = input.skillsById[skillId]
    if (!skill) throw new Error(`FIRE readiness 缺 SkillData "${skillId}"`)
    const execution = resolveSkillExecution(skill, side)
    const { animation } = execution
    // The original no-effect marker has no FIRE asset. Chunk zero is a real resource.
    if (animation.effectSprite < 0 || animation.effectSprite === 0xffff) return
    uses.push({
      subject: `技能 "${skillId}" 的${side === 'player' ? '玩家' : '敌方'}特效`,
      animation,
      sequence:
        side === 'player' && playsDefensiveFire(skill.target, execution) ? 'once' : 'repeat',
    })
  }
  const playerSkills = new Set<string>()
  for (const skills of input.playerSkillIds) for (const skill of skills) playerSkills.add(skill)
  for (const skill of input.cooperativeSkillIds) playerSkills.add(skill)
  for (const skill of playerSkills) include(skill, 'player')
  for (const skill of new Set(input.reachableEnemySkillIds)) include(skill, 'enemy')
  return uses
}

export function collectBattleThrowFireUses(
  items: ItemDataMap,
  ids: Iterable<string>,
): BattleFireUse[] {
  const uses: BattleFireUse[] = []
  for (const id of new Set(ids)) {
    const presentation = items[id]?.throw?.presentation
    if (presentation?.kind === 'magic' && presentation.animation.effectSprite >= 0)
      uses.push({
        subject: `物品 "${id}" 的投掷特效`,
        animation: presentation.animation,
        sequence: 'repeat',
      })
  }
  return uses
}

export function battleFireChunks(uses: readonly BattleFireUse[]): Set<number> {
  return new Set(uses.map(({ animation }) => animation.effectSprite))
}

export function assertLoadedFireUses(
  uses: readonly BattleFireUse[],
  sprites: Readonly<Record<number, LoadedSprite>>,
): void {
  for (const { animation, subject, sequence } of uses) {
    const frames = sprites[animation.effectSprite]?.frames.length ?? 0
    if (frames === 0) continue
    if (sequence === 'once') checkedFireFrameDurationMs(frames, animation.speed, subject)
    else getOffMagicTiming(frames, animation, subject)
  }
}

/** Validate each use after decoding. One sheet can play at several speeds or loop counts. */
export async function prepareBattleFireSprites(
  uses: readonly BattleFireUse[],
  load: (chunk: number) => Promise<LoadedSprite | undefined>,
): Promise<Record<number, LoadedSprite>> {
  const decoded = await Promise.all(
    [...battleFireChunks(uses)].map(async (chunk) => [chunk, await load(chunk)] as const),
  )
  const sprites: Record<number, LoadedSprite> = {}
  for (const [chunk, sprite] of decoded) if (sprite) sprites[chunk] = sprite
  assertLoadedFireUses(uses, sprites)
  return sprites
}
