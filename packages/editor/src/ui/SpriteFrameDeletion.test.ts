import type { BattleSpriteDef, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { planBattleSpriteFrameDeletion } from './BattleSpriteLibrary.js'
import { planWorldSpriteFrameDeletion, worldSpriteSemanticGroups } from './SpriteResourceViewer.js'

describe('原始帧任意删除规划', () => {
  test('四向行走前缀内的单帧删除必须阻断', () => {
    const directional: SpriteDef = {
      id: 'hero',
      label: '主角',
      asset: 'sprite.shared',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    expect(() => planWorldSpriteFrameDeletion([directional], 5, 16)).toThrow(/四向行走/)
  })

  test('删动作尾帧会丢弃命中帧、前移后续帧号并修正循环长度', () => {
    const directional: SpriteDef = {
      id: 'hero',
      label: '主角',
      asset: 'sprite.shared',
      layout: { kind: 'directional', framesPerDir: 2 },
      poses: {
        vanish: { label: '消失', steps: [{ frame: 9, durationMs: 250 }] },
        later: {
          label: '后续',
          steps: [
            { frame: 8, durationMs: 100 },
            { frame: 10, durationMs: 200, cues: [{ kind: 'sound', asset: 'sound.test' }] },
            { frame: 11, durationMs: 300 },
          ],
          loopFrom: 0,
        },
      },
    }
    const loop: SpriteDef = {
      id: 'effect',
      label: '循环效果',
      asset: 'sprite.shared',
      layout: { kind: 'loop', frameCount: 10 },
    }
    const plan = planWorldSpriteFrameDeletion([directional, loop], 9, 12)
    expect(plan.repairs.hero?.poses).toEqual({
      later: {
        label: '后续',
        steps: [
          { frame: 8, durationMs: 100 },
          { frame: 9, durationMs: 200, cues: [{ kind: 'sound', asset: 'sound.test' }] },
          { frame: 10, durationMs: 300 },
        ],
        loopFrom: 0,
      },
    })
    expect(plan.repairs.effect?.layout).toEqual({ kind: 'loop', frameCount: 9 })
    expect(plan.consumerSnapshots.hero?.poses).toEqual(directional.poses)
  })

  test('未配置资源缩帧产生空全集修复证明', () => {
    expect(planWorldSpriteFrameDeletion([], 1, 3)).toEqual({
      repairs: {},
      consumerSnapshots: {},
      changes: [],
    })
    expect(planBattleSpriteFrameDeletion([], 1, 3)).toEqual({
      repairs: {},
      consumerSnapshots: {},
      changes: [],
    })
  })

  test('战斗玩家槽位与敌人连续分段随中间帧原子修复', () => {
    const player: BattleSpriteDef = {
      id: 'fighter',
      label: '战士',
      asset: 'battle.shared',
      profile: {
        kind: 'player-fighter',
        frames: {
          idle: 0,
          dying: 1,
          dead: 2,
          defend: 3,
          hurt: 4,
          preMagic: 5,
          magic: 6,
          attackWindup: 7,
          attackRush: 8,
          attackStrike: 9,
          steal: 10,
        },
        castEffectBase: 0,
        attackEffectBase: 0,
      },
    }
    const enemy: BattleSpriteDef = {
      id: 'enemy',
      label: '敌人',
      asset: 'battle.shared',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 2 },
        magic: { start: 2, count: 2 },
        attack: { start: 4, count: 3 },
        idleTicksPerFrame: 5,
        actTicksPerFrame: 1,
      },
    }
    const plan = planBattleSpriteFrameDeletion([player, enemy], 3, 11)
    const playerRepair = plan.repairs.fighter?.profile
    expect(playerRepair?.kind).toBe('player-fighter')
    if (playerRepair?.kind === 'player-fighter') {
      expect(playerRepair.frames.defend).toBe(3)
      expect(playerRepair.frames.hurt).toBe(3)
      expect(playerRepair.frames.attackStrike).toBe(8)
      expect(playerRepair.frames.steal).toBe(9)
    }
    expect(plan.repairs.enemy?.profile).toEqual({
      kind: 'enemy',
      idle: { start: 0, count: 2 },
      magic: { start: 2, count: 1 },
      attack: { start: 3, count: 3 },
      idleTicksPerFrame: 5,
      actTicksPerFrame: 1,
    })
  })
})

describe('大世界语义动作行', () => {
  test('多帧行走保留引擎步序，预制动作显示完整逐帧时间线', () => {
    const groups = worldSpriteSemanticGroups(
      [
        {
          id: 'hero',
          label: '主角',
          asset: 'sprite.hero',
          layout: { kind: 'directional', framesPerDir: 3 },
          poses: {
            sit: {
              label: '坐下',
              steps: [
                { frame: 12, durationMs: 180 },
                { frame: 13, durationMs: 320 },
              ],
            },
          },
        },
      ],
      'hero',
    )
    expect(groups[0]?.active).toBe(true)
    expect(groups[0]?.rows[0]).toMatchObject({
      label: '下 · 行走',
      frames: [0, 1, 2],
      playbackFrames: [0, 1, 0, 2],
    })
    expect(groups[0]?.rows.at(-1)).toMatchObject({
      label: '坐下',
      frames: [12, 13],
      playbackSteps: [
        { frame: 12, holdMs: 180 },
        { frame: 13, holdMs: 320 },
      ],
    })
  })
})
