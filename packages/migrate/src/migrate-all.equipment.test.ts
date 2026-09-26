import { validateItems } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { assemble, chain, sources } from './__tests__/migration-assembly-fixtures.js'
import { item, raw } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly equipment', () => {
  it('equipable flag controls assembly even when an equipment script is present', () => {
    const disabled = item({ scriptDesc: 0, scriptOnEquip: 1 })
    const enabled = {
      ...disabled,
      id: 21,
      flags: {
        ...disabled.flags,
        equipable: true,
        equipableBy: [true, false, false, true, false, false],
      },
    }
    const output = assemble(
      sources({
        items: [disabled, enabled],
        commands: chain(raw(0x18, [14]), raw(0x17, [0, 17, 3])),
      }),
    )
    expect(output.items[0]).not.toHaveProperty('equip')
    expect(output.items[1]?.equip).toEqual({
      slot: 'weapon',
      equipableBy: ['li-xiaoyao', 'wu-hou'],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 3 }],
    })
    expect(output.report.pendingEquip).toEqual([])
    validateItems(output.items)
  })

  it('pending operations retain item identity while recognized slot and effects survive', () => {
    const gear = item({
      _name: '残缺武器',
      scriptDesc: 0,
      scriptOnEquip: 1,
      flags: { ...item().flags, equipable: true, equipableBy: [true] },
    })
    const output = assemble(
      sources({
        items: [gear],
        commands: chain(raw(0x18, [14]), raw(0x99, [7, 8, 9]), raw(0x17, [0, 19, 4])),
      }),
    )
    expect(output.report.pendingEquip).toEqual([
      {
        itemId: 20,
        name: '残缺武器',
        ops: [{ opcode: 0x99, operands: [7, 8, 9], reason: '封闭集外 opcode' }],
      },
    ])
    expect(output.items[0]?.equip).toEqual({
      slot: 'weapon',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 4 }],
    })
    validateItems(output.items)
  })

  it('missing slot never manufactures an equipment block even with recognized stat effects', () => {
    const gear = item({
      scriptDesc: 0,
      scriptOnEquip: 1,
      flags: { ...item().flags, equipable: true, equipableBy: [true] },
    })
    const output = assemble(sources({ items: [gear], commands: chain(raw(0x17, [0, 17, 5])) }))
    expect(output.items[0]).not.toHaveProperty('equip')
    expect(output.report.pendingEquip).toEqual([])
  })

  it('unknown battle form is diagnostic and is not attached to a valid slot', () => {
    const gear = item({
      scriptDesc: 0,
      scriptOnEquip: 1,
      flags: { ...item().flags, equipable: true, equipableBy: [true] },
    })
    const output = assemble(
      sources({ items: [gear], commands: chain(raw(0x18, [14]), raw(0x1a, [1, 10])) }),
    )
    expect(output.items[0]?.equip?.effects).toEqual([])
    expect(output.report.pendingEquip).toEqual([
      {
        itemId: 20,
        name: '测试物品',
        ops: [
          {
            opcode: 0x1a,
            operands: [1, 10, 0],
            reason: '装备战斗精灵号 10 不在 player fighter 0..9',
          },
        ],
      },
    ])
  })
})
