import { validateItems } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { assemble, chain, sources, usable } from './__tests__/migration-assembly-fixtures.js'
import { raw } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly use', () => {
  it('complete placement takes priority over the special self-poison id and generic pending use', () => {
    const input = sources({
      items: [usable({ id: 122 })],
      legacyEntityAddresses: new Map([[798, { scene: 's048', entity: 'e797' }]]),
      commands: [
        { op: 'end' },
        raw(0x84, [798, 2, 3]),
        { op: 'end' },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', text: ' 此处无法放置 ' },
        raw(0x41),
        { op: 'end' },
      ],
    })
    const output = assemble(input)
    expect(output.items[0]?.use).toEqual({
      target: 'scene',
      consuming: true,
      menuAfterUse: 'close',
      effects: [
        {
          kind: 'placeEntityInFront',
          target: { scene: 's048', entity: 'e797' },
          state: 2,
          unavailableMessage: '此处无法放置',
        },
      ],
    })
    expect(output.report.pendingUse).toEqual([])
    validateItems(output.items)
  })

  it('six poison items use their own poison rather than the generic source branch', () => {
    const output = assemble(
      sources({
        items: [122, 123, 124, 125, 138, 139].map((id) => usable({ id })),
        commands: chain(raw(0x5d)),
      }),
    )
    expect(output.items.map((entry) => entry.use)).toEqual(
      [556, 557, 558, 559, 555, 560].map((poisonId) => ({
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'applyPoison', poisonId: String(poisonId) }],
      })),
    )
    expect(output.report.pendingUse).toEqual([])
    validateItems(output.items)
  })

  it('complete recipe routes to scene with ordered material and product amounts', () => {
    const output = assemble(
      sources({
        items: [usable()],
        commands: [
          { op: 'end' },
          raw(0x20, [23, 2, 4]),
          { op: 'giveItem', itemId: 24, count: 3 },
          { op: 'end' },
          { op: 'setDialogStyleNarration' },
          { op: 'showDialog', text: ' 材料不足 ' },
          { op: 'end' },
        ],
      }),
    )
    expect(output.items[0]?.use).toEqual({
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'craftRecipe',
          unavailableMessage: '材料不足',
          recipes: [
            {
              ingredients: [{ itemId: '23', count: 2 }],
              products: [{ itemId: '24', count: 3 }],
            },
          ],
        },
      ],
    })
    expect(output.report.pendingUse).toEqual([])
    validateItems(output.items)
  })

  it('resource pool uses Store zero rather than the first store and owns its reward records', () => {
    const input = sources({
      items: [usable()],
      stores: [
        { id: 5, items: [999] },
        { id: 0, items: [23, 24] },
      ],
      commands: [
        { op: 'end' },
        raw(0x34, [3]),
        { op: 'end' },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', text: ' 无资源 ' },
        { op: 'end' },
      ],
    })
    const output = assemble(input)
    const use = output.items[0]!.use!
    expect(use).toEqual({
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 2,
          rewards: [
            { itemId: '23', count: 1 },
            { itemId: '24', count: 1 },
          ],
          unavailableMessage: '无资源',
        },
      ],
    })
    expect(output.report.pendingUse).toEqual([])
    validateItems(output.items)
    const effect = use.effects[0]!
    if (effect.kind !== 'drawFromResourcePool') throw new Error('fixture contract')
    effect.rewards[0]!.itemId = '999'
    expect(input.stores![1]!.items).toEqual([23, 24])
  })

  it('shared dialogue use produces a stable author reference without a partial data effect', () => {
    const output = assemble(
      sources({
        items: [usable({ id: 23 })],
        commands: chain({ op: 'showDialog', text: 'story' }, raw(0x1b, [0, 900])),
      }),
    )
    expect(output.items[0]?.use).toEqual({
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'runScript',
          script: { chunk: 'shared/c12', id: 'shared/user/pal-item-use/23' },
        },
      ],
    })
    expect(output.report.pendingUse).toEqual([])
    validateItems(output.items)
  })

  it.each([
    false,
    true,
  ])('ordinary data use selects allies using applyToAll=%s without scene menu flags', (all) => {
    const entry = usable()
    entry.flags.applyToAll = all
    const output = assemble(
      sources({ items: [entry], commands: chain(raw(0x1b, [0, 7]), raw(0x47, [2])) }),
    )
    expect(output.items[0]?.use).toEqual({
      target: all ? 'allAllies' : 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 7 }],
      sound: 'sound.pal.002',
    })
    validateItems(output.items)
  })

  it('puppet is battle-only whereas ordinary status is not', () => {
    const input = sources({ items: [usable()], commands: chain(raw(0x2d, [4, 3])) })
    const output = assemble(input)
    expect(output.items[0]?.use).toEqual({
      target: 'oneAlly',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'applyStatus', status: 'puppet', turns: 3 }],
    })
    validateItems(output.items)
    input.commands[1] = raw(0x2d, [5, 3])
    expect(assemble(input).items[0]?.use).not.toHaveProperty('battleOnly')
  })

  it('scene hook and awareness effects override all-allies selection and close the menu', () => {
    for (const opcode of [0x38, 0x62]) {
      const entry = usable()
      entry.flags.applyToAll = true
      const output = assemble(sources({ items: [entry], commands: chain(raw(opcode, [2])) }))
      expect(output.items[0]?.use).toEqual({
        target: 'scene',
        consuming: true,
        menuAfterUse: 'close',
        effects: [
          opcode === 0x38
            ? { kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '无任何效果' }
            : { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 200 },
        ],
      })
      validateItems(output.items)
    }
  })

  it('nonusable items do not execute use or attach its diagnostics', () => {
    const entry = usable()
    entry.flags.usable = false
    const output = assemble(sources({ items: [entry], commands: chain(raw(0x99)) }))
    expect(output.items[0]).not.toHaveProperty('use')
    expect(output.report.pendingUse).toEqual([])
  })
})
