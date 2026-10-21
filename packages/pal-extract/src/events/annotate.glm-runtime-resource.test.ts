/**
 * Annotation：选项/无else递归、缺名宽容、真实调用输入守恒与symbols JSON边界。
 * WORD正向查名与symbols优先级由annotate.test承接；只核当前已定义的注释字段，
 * 不为早已移除的_spell/_person/_enemy规则留下“以后再补”的待测信用。
 */
import type { Command } from '@type-pal/shared'
import { beforeEach, describe, expect, test } from 'vitest'
import type { Words } from '../io/word.js'
import { annotate, ITEM_OBJ_START, parseSymbols, type Symbols } from './annotate.js'

let words: Words
beforeEach(() => {
  words = {
    items: ['', '止血草', '灵葫芦'],
    spells: [],
    persons: [],
    enemies: [],
    scenes: [],
    flat: [],
    system: [],
    battleUi: [],
  }
})

describe('R06 annotate choice 递归与 if 无 else', () => {
  test('choice：每个 option.then 内命令被递归注释，raw 选项原样', () => {
    const out = annotate(
      [
        {
          op: 'choice',
          label: 'choice-entry',
          prompt: '买什么？',
          options: [
            { text: '买', then: [{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 1 }] },
            { text: '走', then: [{ op: 'raw', opcode: 0x50, operands: [0, 0, 0] }] },
          ],
        },
      ],
      words,
      {},
    )
    expect(out).toEqual([
      {
        op: 'choice',
        label: 'choice-entry',
        prompt: '买什么？',
        options: [
          {
            text: '买',
            then: [{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 1, _item: '止血草' }],
          },
          { text: '走', then: [{ op: 'raw', opcode: 0x50, operands: [0, 0, 0] }] },
        ],
      },
    ])
  })

  test('if 无 else：保留条件并递归注释 then', () => {
    const out = annotate(
      [
        {
          op: 'if',
          cond: { op: 'raw', opcode: 1, operands: [0, 0, 0] },
          then: [{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 2 }],
        },
      ],
      words,
      {},
    )
    // 可选else缺失或undefined的JSON含义相同，不把对象上的undefined键当业务合同。
    expect(out).toEqual([
      {
        op: 'if',
        cond: { op: 'raw', opcode: 1, operands: [0, 0, 0] },
        then: [{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 2, _item: '止血草' }],
      },
    ])
  })
})

describe('R06 annotate 词表缺名边界', () => {
  test('id=ITEM_OBJ_START 落空词表首 → 不注释（空串 || undefined）', () => {
    expect(annotate([{ op: 'giveItem', itemId: ITEM_OBJ_START, count: 1 }], words, {})).toEqual([
      { op: 'giveItem', itemId: ITEM_OBJ_START, count: 1 },
    ])
  })

  test('id=ITEM_OBJ_START-1 → idx=-1 拒绝；id 恰出表尾 → idx=length 拒绝', () => {
    // 包含原主测试的2/9999。它们是未知/缺名ID的宽容输入，不称作合法物品ID。
    for (const itemId of [ITEM_OBJ_START - 1, ITEM_OBJ_START + words.items.length, 2, 9999]) {
      expect(annotate([{ op: 'giveItem', itemId, count: 1 }], words, {})).toEqual([
        { op: 'giveItem', itemId, count: 1 },
      ])
    }
  })
})

describe('R06 annotate 输入零突变', () => {
  test('输入命令、词表与 symbols 保持逐字段不变', () => {
    const commands: Command[] = [
      { op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 2 },
      { op: 'raw', opcode: 0x50, operands: [1, 2, 3] },
    ]
    const symbols: Symbols = {}
    const beforeCommands = structuredClone(commands)
    const beforeWords = structuredClone(words)
    const beforeSymbols = structuredClone(symbols)
    const out = annotate(commands, words, symbols)
    expect(commands).toEqual(beforeCommands)
    expect(words).toEqual(beforeWords)
    expect(symbols).toEqual(beforeSymbols)
    expect(out).toEqual([
      { op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 2, _item: '止血草' },
      { op: 'raw', opcode: 0x50, operands: [1, 2, 3] },
    ])
  })
})

describe('symbols sidecar 输入合同', () => {
  test('合法映射保留；空对象合法', () => {
    const input: Symbols = {
      item: { '62': '止血草' },
      spell: { '296': '御剑' },
      person: { '36': '李逍遥' },
      enemy: { '398': '蝙蝠' },
      scene: { '17': '客栈' },
    }
    expect(parseSymbols(input)).toEqual({
      item: { '62': '止血草' },
      spell: { '296': '御剑' },
      person: { '36': '李逍遥' },
      enemy: { '398': '蝙蝠' },
      scene: { '17': '客栈' },
    })
    expect(parseSymbols({})).toEqual({})
  })

  test('symbols 顶层必须是对象', () => {
    for (const value of [null, [], 7, true, 'text']) {
      expect(() => parseSymbols(value)).toThrow('symbols: 期望对象')
    }
  })

  test('拒绝未知 symbols 表名并给出路径', () => {
    expect(() => parseSymbols({ nope: {} })).toThrow('symbols.nope: 未知字段')
  })

  test('各 symbols 表必须是对象映射', () => {
    for (const value of [null, [], 7, true, 'text']) {
      expect(() => parseSymbols({ item: value })).toThrow('symbols.item: 期望对象')
    }
  })

  test('symbols 表值必须是字符串并给出键路径', () => {
    for (const value of [null, [], 7, true, {}]) {
      expect(() => parseSymbols({ item: { '62': value } })).toThrow('symbols.item.62: 期望字符串')
    }
  })
})
