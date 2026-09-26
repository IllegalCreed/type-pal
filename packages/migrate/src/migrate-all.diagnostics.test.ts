import { describe, expect, it } from 'vitest'
import { assemble, chain, sources, usable } from './__tests__/migration-assembly-fixtures.js'
import { magic, raw, spell } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly diagnostics', () => {
  it('missing resource-pool store overrides generic opcode reason with source identity', () => {
    const input = sources({
      items: [usable({ id: 21, _name: '资源容器' })],
      commands: [
        { op: 'end' },
        raw(0x34, [3]),
        { op: 'end' },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', text: '耗尽' },
        { op: 'end' },
      ],
      stores: [{ id: 1, items: [20] }],
    })
    const output = assemble(input)
    expect(output.items[0]).not.toHaveProperty('use')
    expect(output.report.pendingUse).toEqual([
      {
        itemId: 21,
        name: '资源容器',
        reason: '资源池用途缺 Store[0] 奖励表',
        category: 'missing-source-data',
        sourceLabel: 'L_1',
        sourceAddress: 1,
      },
    ])
    input.stores!.push({ id: 0, items: [20] })
    expect(assemble(input).report.pendingUse).toEqual([])
    expect(assemble(input).items[0]?.use?.effects[0]?.kind).toBe('drawFromResourcePool')
  })

  it.each([
    0x81, 0x84,
  ])('unsupported story opcode %i is not misclassified as generic unsupported-command', (opcode) => {
    const output = assemble(sources({ items: [usable()], commands: chain(raw(opcode)) }))
    expect(output.items[0]).not.toHaveProperty('use')
    expect(output.report.pendingUse).toHaveLength(1)
    expect(output.report.pendingUse[0]).toMatchObject({
      itemId: 20,
      name: '测试物品',
      category: 'story-script',
      sourceLabel: 'L_1',
      sourceAddress: 1,
    })
    expect(output.report.pendingUse[0]?.reason).toContain(`op 0x${opcode.toString(16)}`)
  })

  it('late story instruction rejects all partial healing and keeps story classification', () => {
    const output = assemble(
      sources({
        items: [usable()],
        commands: chain(raw(0x1b, [0, 99]), { op: 'showDialog', text: 'story' }),
      }),
    )
    expect(output.items[0]).not.toHaveProperty('use')
    expect(output.report.pendingUse).toEqual([
      {
        itemId: 20,
        name: '测试物品',
        reason: '剧情类(showDialog)→ B2 脚本',
        category: 'story-script',
        sourceLabel: 'L_1',
        sourceAddress: 1,
      },
    ])
  })

  it('unsupported command rejects the entire use instead of publishing the successful prefix', () => {
    const output = assemble(
      sources({ items: [usable()], commands: chain(raw(0x1b, [0, 99]), raw(0x99)) }),
    )
    expect(output.items[0]).not.toHaveProperty('use')
    expect(output.report.pendingUse).toEqual([
      {
        itemId: 20,
        name: '测试物品',
        reason: 'op 0x99 尚未转换为结构化物品用途',
        category: 'unsupported-command',
        sourceLabel: 'L_1',
        sourceAddress: 1,
      },
    ])
  })

  it('empty existing root differs from absent root manual review', () => {
    const output = assemble(
      sources({ items: [usable(), usable({ id: 21, scriptOnUse: 9 })], commands: chain() }),
    )
    expect(output.items.map((entry) => entry.use)).toEqual([undefined, undefined])
    expect(output.report.pendingUse).toEqual([
      {
        itemId: 20,
        name: '测试物品',
        reason: 'scriptOnUse 空链',
        category: 'empty-script',
        sourceLabel: 'L_1',
        sourceAddress: 1,
      },
      {
        itemId: 21,
        name: '测试物品',
        reason: 'L_9 不存在',
        category: 'manual-review',
        sourceLabel: 'L_9',
        sourceAddress: 9,
      },
    ])
  })

  it('recognized use effects keep lossy notes attached to their item and do not become pending', () => {
    const output = assemble(
      sources({
        items: [usable({ _name: '分支药' })],
        commands: chain(raw(0x68, [7]), raw(0x1b, [0, 8])),
      }),
    )
    expect(output.items[0]?.use?.effects).toEqual([{ kind: 'healHp', amount: 8 }])
    expect(output.report.lossyUse).toEqual([
      { itemId: 20, name: '分支药', notes: ['0x68 战斗分支(L_7)未表达 —— 战斗期'] },
    ])
    expect(output.report.pendingUse).toEqual([])
  })

  it('current profile propagates the current summon note without enabling a historical authority', () => {
    const output = assemble(
      sources({
        spells: [spell({ _name: '酒神' })],
        magic: [magic({ type: 'summon', special: 0, baseDamage: 3 })],
      }),
    )
    expect(output.report.lossySkills).toEqual([
      {
        id: 400,
        name: '酒神',
        notes: ['summon 伤害=按剩余真气×8 动态(原版 0x57 清空真气);暂按 baseDamage=3 直译'],
      },
    ])
    expect(output.skills.skills).toHaveLength(1)
  })
})
