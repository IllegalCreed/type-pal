import { describe, expect, test } from 'vitest'
import { raw, translation } from './__tests__/translation-fixtures.js'

describe('current translation binding boundaries', () => {
  test('explicit call owner differs from inherited owner and target bodies use the selected owner', () => {
    const f = translation([
      raw(0x04, [900, 0]),
      raw(0x04, [900, 2]),
      { op: 'end' },
      raw(0x87, [], 'L_900'),
    ])
    const result = f.run('e3')[0]!.body
    expect(result).toHaveLength(2)
    for (const [index, owner] of ['e3', 'e1'].entries()) {
      const cmd = result[index]!
      expect(cmd.kind).toBe('callScript')
      if (cmd.kind !== 'callScript') throw new Error('unreachable after assertion')
      expect(cmd.self).toBe(owner)
      expect(cmd.ref.id).toContain(`/${owner}/`)
      expect(f.ctx.registry!.bodyFor(cmd.ref.id)).toEqual([{ kind: 'animEntity', entity: owner }])
    }
    expect(f.ctx.report.gaps).toEqual([])
  })

  test('ownerless call preserves scene ownership without adding self', () => {
    const f = translation([raw(0x04, [900, 0]), { op: 'end' }, raw(0x09, [3], 'L_900')])
    const result = f.run(undefined)[0]!.body
    const audit = f.ctx.registry!.auditRecords()[0]!
    expect(result).toEqual([{ kind: 'callScript', ref: { chunk: audit.chunk, id: audit.id } }])
    expect(audit.source).toEqual({ label: 'L_900', address: 900, addresses: [900, 901] })
    expect(f.ctx.registry!.bodyFor(audit.id)).toEqual([{ kind: 'wait', ms: 120 }])
  })

  test.each([
    0x24, 0x25,
  ])('install opcode %i clears explicitly, ignores zero selector and registers nonempty target', (opcode) => {
    const kind = opcode === 0x24 ? 'setEntityAuto' : 'setEntityTrigger'
    const f = translation([
      raw(opcode, [2, 0]),
      raw(opcode, [0, 900]),
      raw(opcode, [65535, 900]),
      { op: 'end' },
      raw(0x87, [], 'L_900'),
    ])
    const result = f.run('e3')[0]!.body
    const audit = f.ctx.registry!.auditRecords()
    expect(audit).toHaveLength(1)
    expect(result).toEqual([
      { kind, entity: 'e1', stages: [] },
      { kind, entity: 'e3', script: { chunk: audit[0]!.chunk, id: audit[0]!.id } },
    ])
    expect(f.ctx.registry!.bodyFor(audit[0]!.id)).toEqual([{ kind: 'animEntity', entity: 'e3' }])
    expect(f.ctx.report.gaps).toEqual([])
  })

  test('ownerless install and trigger-mode self selectors remain non-emitting and noted', () => {
    const f = translation([raw(0x24, [65535, 900]), raw(0x40, [65535, 1]), raw(0x40, [0, 1])])
    expect(f.run(undefined)).toEqual([{ body: [] }])
    expect(f.ctx.registry!.auditRecords()).toEqual([])
    expect(f.ctx.report.notes.页切换无属主).toBe(1)
  })

  test('advance and reset target stages remain ordered with explicit numeric reset edge', () => {
    const f = translation([
      raw(0x09, [2]),
      { op: 'end', advance: true },
      raw(0x09, [3], 'L_200'),
      { op: 'end', reset: true, resetTo: 400 },
      raw(0x09, [4], 'L_400'),
    ])
    expect(f.run('e3')).toEqual([
      { body: [{ kind: 'wait', ms: 80 }], next: 'advance' },
      { body: [{ kind: 'wait', ms: 120 }], next: 2 },
      { body: [{ kind: 'wait', ms: 160 }] },
    ])
    expect(f.ctx.translating?.size).toBe(0)
    expect(f.ctx.pathStack).toEqual([])
    expect(f.ctx.sourceAddressAuditStack).toEqual([])
  })

  test('missing reset target records the current fallback and does not fabricate another stage', () => {
    const f = translation([raw(0x09, [2]), { op: 'end', reset: true, resetTo: 900 }])
    expect(f.run('e3')).toEqual([{ body: [{ kind: 'wait', ms: 80 }], next: 0 }])
    expect(f.ctx.report.notes['reset 目标不可达 L_900']).toBe(1)
  })

  test('pending auto-battle is consumed once while failure targets retain their own bodies', () => {
    const f = translation([
      raw(0x8a),
      raw(0x07, [2, 900, 900]),
      raw(0x07, [3, 0, 0]),
      { op: 'end' },
      raw(0x09, [5], 'L_900'),
    ])
    const result = f.run('e3')[0]!.body
    const audit = f.ctx.registry!.auditRecords()[0]!
    const arm = [{ kind: 'jumpScript', ref: { chunk: audit.chunk, id: audit.id }, self: 'e3' }]
    expect(result).toEqual([
      { kind: 'startBattle', enemyTeamId: 'team-2', onLose: arm, onFlee: arm, auto: true },
      { kind: 'startBattle', enemyTeamId: 'team-3', boss: true },
    ])
    expect(f.ctx.registry!.bodyFor(audit.id)).toEqual([{ kind: 'wait', ms: 200 }])
    expect(f.ctx.pendingAuto).toBe(false)
  })
})
