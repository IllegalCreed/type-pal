import { beforeEach, describe, expect, it } from 'vitest'
import type { Words } from '../io/word.js'
import { annotate, type Symbols } from './annotate.js'

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

// itemId 是全局 wObjectID：items[0] 对应 61，62/63 分别查视图的第1/2项。
describe('annotate', () => {
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
