import { validateActors, validateItems, validateSkills, validateSprites } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { assemble, sources, usable } from './__tests__/migration-assembly-fixtures.js'
import { item, magic, raw, role, spell } from './__tests__/pure-migration-fixtures.js'

describe('current migration assembly records', () => {
  it('implicit addresses and matching explicit labels generate the same complete output', () => {
    const input = sources({
      roles: [role()],
      levelUpExp: [0, 10],
      spells: [spell({ scriptDesc: 1 })],
      magic: [magic()],
      items: [item({ scriptDesc: 1 })],
      commands: [
        { op: 'end' },
        raw(167),
        { op: 'showDialog', text: '第一行' },
        { op: 'showDialog', text: '第二行' },
        { op: 'end' },
      ],
    })
    const implicit = assemble(input)
    const explicit = structuredClone(input)
    explicit.commands.forEach((command, index) => {
      command.label = `L_${index}`
    })
    expect(assemble(explicit)).toEqual(implicit)
    expect(implicit.items[0]?.desc).toEqual(['第一行', '第二行'])
    expect(implicit.skills.skills[0]?.desc).toBe('第一行\n第二行')
    expect(implicit.localeNames).toEqual({ 'name.li-xiaoyao': '测试角色' })
    expect(implicit.report.blockedDescs).toEqual([])
    validateActors(implicit.actors)
    validateSprites(implicit.sprites)
    validateItems(implicit.items)
    validateSkills(implicit.skills)
  })

  it('mismatched source label is rejected before any sound resolution or source mutation', () => {
    let calls = 0
    const input = sources({
      roles: [role({ attackSound: 1 })],
      commands: [{ op: 'end' }, raw(0x47, [1], 'L_9')],
      soundAssetForNum: () => {
        calls++
        return 'sound.test'
      },
    })
    expect(() => assemble(input)).toThrow('index=1, label=L_9')
    expect(calls).toBe(0)
    input.commands[1]!.label = 'L_1'
    expect(assemble(input).actors[0]?.battler?.sounds?.attack).toBe('sound.test')
    expect(calls).toBeGreaterThan(0)
  })

  it('blocked descriptions retain text prefix and separately identify spell and item callers', () => {
    const output = assemble(
      sources({
        spells: [spell({ scriptDesc: 1 })],
        magic: [magic()],
        items: [item({ scriptDesc: 1 })],
        commands: [
          { op: 'end' },
          { op: 'showDialog', text: 'prefix' },
          raw(0x99),
          { op: 'showDialog', text: 'unreachable' },
        ],
      }),
    )
    expect(output.report.blockedDescs).toEqual([
      { kind: 'spell', id: 1, at: { op: 'raw', opcode: 0x99 } },
      { kind: 'item', id: 1, at: { op: 'raw', opcode: 0x99 } },
    ])
    expect(output.skills.skills[0]?.desc).toBe('prefix')
    expect(output.items[0]?.desc).toEqual(['prefix'])
  })

  it('independent calls and returned nested data cannot contaminate source or the next result', () => {
    const input = sources({
      roles: [role({ equipment: [20], magic: [400] })],
      levelUpExp: [0, 5],
      levelUpMagic: [[{ level: 2, magic: 400 }]],
      spells: [spell()],
      magic: [magic()],
      items: [usable()],
      commands: [{ op: 'end' }, raw(0x1b, [0, 7]), { op: 'end' }],
    })
    const before = structuredClone(input)
    const first = assemble(input)
    const expected = structuredClone(first)
    first.actors[0]!.battler!.leveling!.expTable.push(999)
    first.items[0]!.use!.effects.length = 0
    first.skills.skills[0]!.effects.length = 0
    first.skills.levelUp['li-xiaoyao']!.push({ level: 99, skillId: '999' })
    first.localeNames['name.li-xiaoyao'] = 'changed'
    expect(input).toEqual(before)
    expect(assemble(input)).toEqual(expected)
  })

  it('zero and unavailable description addresses remain empty without creating blocked diagnostics', () => {
    const output = assemble(
      sources({ items: [item({ scriptDesc: 0 }), item({ id: 21, scriptDesc: 90 })] }),
    )
    expect(output.items.map((entry) => entry.desc)).toEqual([[], []])
    expect(output.report.blockedDescs).toEqual([])
    expect(output.enemies).toEqual([])
    expect(output.enemyTeams).toEqual([])
    expect(output.enemyReport).toBeUndefined()
    expect(output.enemyTeamReport).toBeUndefined()
  })
})
