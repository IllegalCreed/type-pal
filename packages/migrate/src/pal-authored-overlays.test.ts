import type { ItemData, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyPalItemOverlays, applyPalSkillOverlays } from './pal-authored-overlays.js'

describe('PAL 已审计内容 overlay', () => {
  test('隐蛊使用效果在上游纯函数中回补且幂等', () => {
    const source = [{ id: '141', name: '隐蛊' }] as ItemData[]
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use).toEqual({
      target: 'allAllies',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'hideParty', turns: 3 }],
    })
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source[0]?.use).toBeUndefined()
  })

  test('四个动态技能稳定追加，已有时以审计定义覆盖', () => {
    const source = [
      { id: '296', name: '气疗术' },
      { id: '314', name: 'stale' },
    ] as SkillData[]
    const once = applyPalSkillOverlays(source)
    expect(once.map((skill) => skill.id)).toEqual(['296', '314', '344', '392', '394'])
    expect(once.find((skill) => skill.id === '314')?.name).toBe('风卷残云')
    expect(once.find((skill) => skill.id === '344')?.cost.money).toBe(500)
    expect(once.find((skill) => skill.id === '392')?.effects).toEqual([{ kind: 'fleeBattle' }])
    expect(once.find((skill) => skill.id === '394')?.effects[0]?.kind).toBe('moneyDamage')
    expect(applyPalSkillOverlays(once)).toEqual(once)
    expect(source[1]?.name).toBe('stale')
  })

  test('R13-6B 分支、前震屏和酒神资源公式在上游回补', () => {
    const source = [
      {
        id: '303',
        name: '回梦',
        effects: [{ kind: 'gate', chance: 60 }],
        animation: { effectSprite: 40 },
      },
      {
        id: '304',
        name: '夺魂',
        effects: [
          { kind: 'gate', magicResist: true },
          { kind: 'gate', chance: 33 },
          { kind: 'instantKill' },
        ],
        animation: { effectSprite: 39 },
      },
      {
        id: '305',
        name: '鬼降',
        effects: [{ kind: 'gate', chance: 44 }],
        animation: { effectSprite: 41 },
      },
      {
        id: '330',
        name: '天罡战气',
        effects: [{ kind: 'damage', power: 320, elemental: 4 }],
        animation: { effectSprite: 12 },
      },
      ...['334', '342', '357', '378', '380', '385'].map((id) => ({
        id,
        name: `震屏技能 ${id}`,
        effects: [{ kind: 'damage' as const, power: 1, elemental: 0 }],
        animation: { effectSprite: 1 },
      })),
      {
        id: '370',
        name: '酒神',
        effects: [
          { kind: 'summon', battleSprite: 'player-summon-15', speed: 1, sound: 'sound.pal.301' },
          { kind: 'damage', power: 3, elemental: 0 },
        ],
        animation: { effectSprite: 34 },
        cost: { mp: 1 },
      },
    ] as SkillData[]
    const frozen = applyPalSkillOverlays(source)
    expect(frozen.find((skill) => skill.id === '303')?.execution).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '330')?.animation.preShake).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '370')?.cost.items).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '370')?.lifetimeLimit).toBeUndefined()

    const out = applyPalSkillOverlays(source, { r13SixBExecution: true })
    const byId = new Map(out.map((skill) => [skill.id, skill]))
    expect(
      Object.fromEntries(
        ['330', '334', '342', '357', '378', '380', '385'].map((id) => [
          id,
          byId.get(id)?.animation.preShake,
        ]),
      ),
    ).toEqual({
      '330': { frames: 20, level: 4 },
      '334': { frames: 20, level: 4 },
      '342': { frames: 14, level: 4 },
      '357': { frames: 24, level: 4 },
      '378': { frames: 14, level: 4 },
      '380': { frames: 14, level: 4 },
      '385': { frames: 14, level: 4 },
    })
    expect(byId.get('303')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 70 },
      { kind: 'applyStatus', status: 'sleep', turns: 3 },
      { kind: 'resourceDelta', resource: 'hp', delta: -1 },
    ])
    expect(byId.get('304')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 30 },
      { kind: 'instantKill' },
    ])
    expect(byId.get('305')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 50 },
      { kind: 'applyStatus', status: 'confused', turns: 3 },
      { kind: 'resourceDelta', resource: 'hp', delta: -1 },
    ])
    expect(byId.get('370')?.cost.items).toEqual([{ itemId: '86', amount: 1 }])
    expect(byId.get('370')?.lifetimeLimit).toBe(9)
    expect(byId.get('370')?.execution?.player?.prepare).toEqual([
      { kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' },
    ])
    expect(byId.get('370')?.execution?.player?.effects).toEqual([
      { kind: 'summon', battleSprite: 'player-summon-15', speed: 1, sound: 'sound.pal.301' },
    ])
  })
})
