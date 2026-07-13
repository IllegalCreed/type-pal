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
})
