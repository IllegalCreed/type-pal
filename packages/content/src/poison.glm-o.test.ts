/** TEST-GLM-WAVE-O-1 O08/O09：毒语义与富文本/locale 公开合同残余。
 *  旧证：poison 相关测试覆盖 resolve 主干；本卡按 gap-map 直击未覆盖臂：
 *  collectPoisonDefinitionReferences lethalWith/counters 收集、poisonCurableBy 秩、
 *  applyPoisonSelf 三段链（以毒攻毒/致死配对/纯加毒/缺表）、parseRichText 颜色标记、
 *  lookupText 缺键。
 */

import type { PoisonDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { lookupText } from './locale.js'
import { applyPoisonSelf, collectPoisonDefinitionReferences, poisonCurableBy } from './poison.js'
import { parseRichText } from './rich-text.js'

const poison = (id: number, over: Partial<PoisonDef> = {}): PoisonDef => ({
  id,
  name: `poison.${id}`,
  curability: 'common',
  color: 0,
  ...over,
})

describe('O08 collectPoisonDefinitionReferences：关系边收集', () => {
  test('lethalWith 与 counters 各产一条带精确 where 的引用', () => {
    const refs = collectPoisonDefinitionReferences([
      poison(551, { lethalWith: 552, counters: 553 }),
    ])
    expect(refs).toEqual([
      {
        ownerId: 551,
        poisonId: 552,
        kind: 'poison-lethal-pair',
        where: 'poisons[0](551).lethalWith',
      },
      { ownerId: 551, poisonId: 553, kind: 'poison-counter', where: 'poisons[0](551).counters' },
    ])
  })

  test('无关系毒不产引用', () => {
    expect(collectPoisonDefinitionReferences([poison(1), poison(2)])).toEqual([])
  })
})

describe('O08 poisonCurableBy：可解度秩', () => {
  test('common 可被任一档解；incurable 不可被 common/severe 解', () => {
    expect(poisonCurableBy({ curability: 'common' }, 'common')).toBe(true)
    expect(poisonCurableBy({ curability: 'severe' }, 'common')).toBe(false)
    expect(poisonCurableBy({ curability: 'severe' }, 'severe')).toBe(true)
    expect(poisonCurableBy({ curability: 'incurable' }, 'severe')).toBe(false)
    expect(poisonCurableBy({ curability: 'incurable' }, 'incurable')).toBe(true)
  })
})

describe('O08 applyPoisonSelf：三段链', () => {
  const defs: Record<number, PoisonDef> = {
    1: poison(1, { counters: 9 }),
    2: poison(2, { lethalWith: 8 }),
    3: poison(3),
  }

  test('身中 counters 毒 → 以毒攻毒解掉、不下本毒（cured）', () => {
    const host = { hp: 100, poisons: [{ poisonId: 9, tickIndex: 0 }] }
    expect(applyPoisonSelf(host, 1, defs)).toBe('cured')
    expect(host.poisons).toEqual([])
    expect(host.hp).toBe(100)
  })

  test('身中 lethalWith 毒 → hp 0 暴毙（lethal）', () => {
    const host = { hp: 100, poisons: [{ poisonId: 8, tickIndex: 0 }] }
    expect(applyPoisonSelf(host, 2, defs)).toBe('lethal')
    expect(host.hp).toBe(0)
  })

  test('无关系 → 纯加毒（applied）；缺表同路径', () => {
    const host: { hp: number; poisons?: { poisonId: number; tickIndex: number }[] } = { hp: 100 }
    expect(applyPoisonSelf(host, 3, defs)).toBe('applied')
    expect(host.poisons).toEqual([{ poisonId: 3, tickIndex: 0 }])
    const bare: { hp: number; poisons?: { poisonId: number; tickIndex: number }[] } = { hp: 50 }
    expect(applyPoisonSelf(bare, 3)).toBe('applied')
    expect(bare.poisons).toEqual([{ poisonId: 3, tickIndex: 0 }])
  })

  test('缺 defs 时 counters/lethalWith 关系不可判定 → 纯加毒', () => {
    const host = { hp: 10 }
    expect(applyPoisonSelf(host, 1)).toBe('applied')
    expect(applyPoisonSelf(host, 2)).toBe('applied')
  })
})

describe('O09 parseRichText：颜色标记解析', () => {
  test('无标记 / 空串 → 单 span 非空数组', () => {
    expect(parseRichText('纯文本')).toEqual([{ text: '纯文本' }])
    expect(parseRichText('')).toEqual([{ text: '' }])
  })

  test('成对颜色标记切分 span 并带 color；前后纯文本保留', () => {
    expect(parseRichText('前<red>中</red>后')).toEqual([
      { text: '前' },
      { text: '中', color: 'red' },
      { text: '后' },
    ])
    expect(parseRichText('<yellow>全黄</yellow>')).toEqual([{ text: '全黄', color: 'yellow' }])
  })

  test('未闭合标记按纯文本；未知颜色不识别', () => {
    expect(parseRichText('<cyan>未闭合')).toEqual([{ text: '<cyan>未闭合' }])
    expect(parseRichText('<green>未知色</green>')).toEqual([{ text: '<green>未知色</green>' }])
  })

  test('多段颜色标记顺序解析', () => {
    expect(parseRichText('<cyan>a</cyan><redAlt>b</redAlt>')).toEqual([
      { text: 'a', color: 'cyan' },
      { text: 'b', color: 'redAlt' },
    ])
  })
})

describe('O09 lookupText：locale 缺键合同', () => {
  test('命中返回文本；缺键原样返回 textId（调用方可见诊断）', () => {
    const locale = { 'name.hero': '主角' }
    expect(lookupText('name.hero', locale)).toBe('主角')
    expect(lookupText('name.ghost', locale)).toBe('name.ghost')
  })
})
