import { describe, expect, it } from 'vitest'
import type { Words } from '../io/word.js'
import { annotate, type Symbols } from './annotate.js'

const words: Words = {
  items: ['', '止血草', '灵葫芦'],
  spells: ['', '御剑'],
  persons: ['李逍遥'],
  enemies: ['', '蝙蝠'],
  scenes: ['垃圾名 0', '垃圾名 1'], // misleading in real data; rule skips it
  flat: [],
  system: [],
  battleUi: [],
}

describe('annotate', () => {
  it('giveItem 加 _item 注释', () => {
    const out = annotate([{ op: 'giveItem', itemId: 2, count: 1 }], words, {})
    expect(out[0]).toEqual({ op: 'giveItem', itemId: 2, count: 1, _item: '灵葫芦' })
  })

  it('symbols.json 优先于 WORD.DAT', () => {
    const symbols: Symbols = { item: { '1': '神奇止血草' } }
    const out = annotate([{ op: 'giveItem', itemId: 1, count: 1 }], words, symbols)
    expect(out[0]).toEqual({ op: 'giveItem', itemId: 1, count: 1, _item: '神奇止血草' })
  })

  it('raw 命令不注释', () => {
    const out = annotate([{ op: 'raw', opcode: 0x50, operands: [1, 2, 3] }], words, {})
    expect(out[0]).toEqual({ op: 'raw', opcode: 0x50, operands: [1, 2, 3] })
  })

  it('sceneId 仅在 symbols.json 中存在时才注释(WORD.DAT 不作为来源)', () => {
    // raw stays raw
    const out1 = annotate([{ op: 'raw', opcode: 0x59, operands: [0, 0, 0] }], words, {})
    expect(out1[0]).toEqual({ op: 'raw', opcode: 0x59, operands: [0, 0, 0] })

    // 真 LoadSceneCommand(M3.5 起具名),annotation 仅来自 symbols:
    const loadSceneCmd: import('@type-pal/shared').LoadSceneCommand = { op: 'loadScene', sceneId: 0 }
    const out2 = annotate([loadSceneCmd], words, { scene: { '0': '客栈' } })
    expect((out2[0] as { _scene?: string })._scene).toBe('客栈')

    const out3 = annotate([loadSceneCmd], words, {})
    expect((out3[0] as { _scene?: string })._scene).toBeUndefined()
  })

  it('结构化命令 sequence 递归', () => {
    const out = annotate(
      [{ op: 'sequence', steps: [{ op: 'giveItem', itemId: 2, count: 1 }] }],
      words,
      {},
    )
    const seq = out[0] as { op: 'sequence'; steps: Array<{ _item?: string }> }
    expect(seq.steps[0]!._item).toBe('灵葫芦')
  })

  it('if 命令递归 then/else', () => {
    const out = annotate(
      [
        {
          op: 'if',
          cond: { op: 'raw', opcode: 0x01, operands: [0, 0, 0] },
          then: [{ op: 'giveItem', itemId: 1, count: 1 }],
          else: [{ op: 'giveItem', itemId: 2, count: 1 }],
        },
      ],
      words,
      {},
    )
    const ifCmd = out[0] as { op: 'if'; then: Array<{ _item?: string }>; else?: Array<{ _item?: string }> }
    expect(ifCmd.then[0]!._item).toBe('止血草')
    expect(ifCmd.else![0]!._item).toBe('灵葫芦')
  })

  it('startBattle 加 _enemyTeam 注释', () => {
    const out = annotate([{ op: 'startBattle', enemyTeamId: 1 }], words, {})
    expect(out[0]).toEqual({ op: 'startBattle', enemyTeamId: 1, _enemyTeam: '蝙蝠' })
  })

  it('未找到名称时不添加注释键', () => {
    // itemId 99 超出 words.items 范围 → 不加 _item
    const out = annotate([{ op: 'giveItem', itemId: 99, count: 1 }], words, {})
    expect((out[0] as { _item?: string })._item).toBeUndefined()
  })
})
