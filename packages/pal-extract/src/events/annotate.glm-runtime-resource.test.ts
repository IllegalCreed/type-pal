/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R06（events/annotate.ts）。
 * 去重账：annotate.test 覆盖 giveItem/_item、off-by-61（itemId=2）、symbols 优先、raw 跳过、
 * sceneId 仅 symbols、sequence/if（含 else）递归、startBattle 仅 symbols、itemId=9999 越界。
 * 本文件只做未占用合同：choice 递归、if 无 else、wordAt 邻位边界（id=objStart 空词、
 * id=objStart-1、id 恰出表）、输入零突变。
 * 注：_spell/_person/_enemy 三条 RULES 无具名命令携带（Command 联合只给 itemId/enemyTeamId/
 * sceneId），合法 typed 输入不可达，不写强转绿测——登记待具名命令出现后补。
 */
import { describe, expect, test } from 'vitest'
import type { Words } from '../io/word.js'
import { annotate, ITEM_OBJ_START, type Symbols } from './annotate.js'

const words: Words = {
  items: ['', '止血草'], // [0]=wObjectID 61（空词）、[1]=62
  spells: [],
  persons: [],
  enemies: [],
  scenes: [],
  flat: [],
  system: [],
  battleUi: [],
}

describe('R06 annotate choice 递归与 if 无 else', () => {
  test('choice：每个 option.then 内命令被递归注释，raw 选项原样', () => {
    const out = annotate(
      [
        {
          op: 'choice',
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
    const choice = out[0] as {
      op: 'choice'
      prompt: string
      options: { text: string; then: Array<{ _item?: string }> }[]
    }
    expect(choice.prompt).toBe('买什么？')
    expect(choice.options[0]!.then[0]!._item).toBe('止血草')
    expect(choice.options[1]!.then[0]).toEqual({ op: 'raw', opcode: 0x50, operands: [0, 0, 0] })
  })

  test('if 无 else：else 键存在且为 undefined（不抛错）', () => {
    const out = annotate(
      [{ op: 'if', cond: { op: 'raw', opcode: 1, operands: [0, 0, 0] }, then: [{ op: 'end' }] }],
      words,
      {},
    )
    const ifCmd = out[0] as { op: 'if'; else?: unknown }
    expect('else' in ifCmd).toBe(true)
    expect(ifCmd.else).toBeUndefined()
  })
})

describe('R06 annotate wordAt 邻位边界（经合法 itemId 路径）', () => {
  test('id=ITEM_OBJ_START 落空词表首 → 不注释（空串 || undefined）', () => {
    const out = annotate([{ op: 'giveItem', itemId: ITEM_OBJ_START, count: 1 }], words, {})
    expect((out[0] as { _item?: string })._item).toBeUndefined()
  })

  test('id=ITEM_OBJ_START-1 → idx=-1 拒绝；id 恰出表尾 → idx=length 拒绝', () => {
    const below = annotate([{ op: 'giveItem', itemId: ITEM_OBJ_START - 1, count: 1 }], words, {})
    expect((below[0] as { _item?: string })._item).toBeUndefined()
    const past = annotate(
      [{ op: 'giveItem', itemId: ITEM_OBJ_START + words.items.length, count: 1 }],
      words,
      {},
    )
    expect((past[0] as { _item?: string })._item).toBeUndefined()
  })

  test('id=ITEM_OBJ_START+1 命中表[1]；symbols 同 id 覆盖优先', () => {
    const hit = annotate([{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 1 }], words, {})
    expect((hit[0] as { _item?: string })._item).toBe('止血草')
    const symbols: Symbols = { item: { [String(ITEM_OBJ_START + 1)]: '符号止血草' } }
    const sym = annotate([{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 1 }], words, symbols)
    expect((sym[0] as { _item?: string })._item).toBe('符号止血草')
  })
})

describe('R06 annotate 输入零突变', () => {
  test('输入命令数组与对象注释前后逐字段相等（纯映射产出新对象）', () => {
    const commands = [{ op: 'giveItem', itemId: ITEM_OBJ_START + 1, count: 2 }] as const
    const before = structuredClone(commands)
    const out = annotate([...commands], words, {})
    expect([...commands]).toEqual([...before])
    expect(out[0]).not.toBe(commands[0])
    expect(out[0]).toEqual({
      op: 'giveItem',
      itemId: ITEM_OBJ_START + 1,
      count: 2,
      _item: '止血草',
    })
  })
})
