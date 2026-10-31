/** Command annotation, WORD/symbol precedence, recursion and caller input ownership. */

import type { Command } from '@type-pal/shared'
import { beforeEach, describe, expect, it, test } from 'vitest'
import type { Words } from '../io/word.js'
import { annotate, ITEM_OBJ_START, type Symbols } from './annotate.js'

describe('word lookup and recursive command annotations', () => {
  let words: Words

  beforeEach(() => {
    // 人工小词表，只约束查名/命名空间合同；不冒充原始 WORD.DAT 内容。
    words = {
      items: ['', '止血草', '灵葫芦'],
      spells: ['', '御剑'],
      persons: ['李逍遥'],
      enemies: ['', '蝙蝠'],
      scenes: ['测试毒素0', '测试毒素1'], // WORD 的此段是特殊条目，不是场景名。
      flat: [],
      system: [],
      battleUi: [],
    }
  })

  it('giveItem 加 _item 注释(wObjectID 63 → index 2)', () => {
    const out = annotate(
      [
        { op: 'giveItem', itemId: 63, count: 1, label: 'gift' },
        { op: 'giveItem', itemId: 62, count: 2 },
      ],
      words,
      {},
    )
    expect(out).toEqual([
      { op: 'giveItem', itemId: 63, count: 1, label: 'gift', _item: '灵葫芦' },
      { op: 'giveItem', itemId: 62, count: 2, _item: '止血草' },
    ])
  })

  it('symbols.json 优先于 WORD.DAT', () => {
    const symbols: Symbols = { item: { '62': '神奇止血草' } }
    const out = annotate([{ op: 'giveItem', itemId: 62, count: 1 }], words, symbols)
    expect(out).toEqual([{ op: 'giveItem', itemId: 62, count: 1, _item: '神奇止血草' }])
  })

  it('sceneId 仅在 symbols.json 中存在时才注释(WORD.DAT 不作为来源)', () => {
    const loadSceneCmd: import('@type-pal/shared').LoadSceneCommand = {
      op: 'loadScene',
      sceneId: 1,
      label: 'scene-entry',
    }
    expect(annotate([loadSceneCmd], words, { scene: { '1': '客栈' } })).toEqual([
      { op: 'loadScene', sceneId: 1, label: 'scene-entry', _scene: '客栈' },
    ])
    expect(annotate([loadSceneCmd], words, {})).toEqual([
      { op: 'loadScene', sceneId: 1, label: 'scene-entry' },
    ])
  })

  it('结构化命令 sequence 递归', () => {
    const out = annotate(
      [
        {
          op: 'sequence',
          label: 'sequence-entry',
          steps: [
            { op: 'giveItem', itemId: 63, count: 2, label: 'gift' },
            { op: 'raw', opcode: 0x50, operands: [0, 0, 0] },
          ],
        },
      ],
      words,
      {},
    )
    expect(out).toEqual([
      {
        op: 'sequence',
        label: 'sequence-entry',
        steps: [
          { op: 'giveItem', itemId: 63, count: 2, label: 'gift', _item: '灵葫芦' },
          { op: 'raw', opcode: 0x50, operands: [0, 0, 0] },
        ],
      },
    ])
  })

  it('if 命令递归 then/else', () => {
    const out = annotate(
      [
        {
          op: 'if',
          label: 'conditional-entry',
          cond: { op: 'raw', opcode: 0x01, operands: [0, 0, 0] },
          then: [{ op: 'giveItem', itemId: 62, count: 1 }],
          else: [{ op: 'giveItem', itemId: 63, count: 2 }],
        },
      ],
      words,
      {},
    )
    expect(out).toEqual([
      {
        op: 'if',
        label: 'conditional-entry',
        cond: { op: 'raw', opcode: 0x01, operands: [0, 0, 0] },
        then: [{ op: 'giveItem', itemId: 62, count: 1, _item: '止血草' }],
        else: [{ op: 'giveItem', itemId: 63, count: 2, _item: '灵葫芦' }],
      },
    ])
  })

  it('startBattle _enemyTeam 仅来自 symbols(enemyTeamId 非 wObjectID,无 WORD 映射)', () => {
    expect(annotate([{ op: 'startBattle', enemyTeamId: 1 }], words, {})).toEqual([
      { op: 'startBattle', enemyTeamId: 1 },
    ])
    expect(
      annotate([{ op: 'startBattle', enemyTeamId: 1 }], words, {
        enemy: { '1': '蝙蝠群' },
      }),
    ).toEqual([{ op: 'startBattle', enemyTeamId: 1, _enemyTeam: '蝙蝠群' }])
  })
})

describe('missing words and caller ownership', () => {
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
