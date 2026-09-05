import { describe, expect, test } from 'vitest'
import {
  buildEntityLifecycleReferenceIndex,
  checkEntityLifecycleTable,
  normalizeEntityLifecycleTable,
} from './entity-lifecycle.js'

const references = buildEntityLifecycleReferenceIndex([
  { id: 's001', entities: [{ id: 'e001' }, { id: 'e002' }] },
])

describe('entity lifecycle table', () => {
  test('accepts all four exact variants and treats a missing table as normal', () => {
    const table = {
      s001: {
        e001: { phase: 'suspended', remainingTicks: 15 },
        e002: { phase: 'despawned', remainingTicks: 800 },
      },
    }
    expect(normalizeEntityLifecycleTable(undefined, references)).toEqual({})
    expect(normalizeEntityLifecycleTable(table, references)).toEqual(table)
    expect(() =>
      checkEntityLifecycleTable({
        s001: {
          e001: { phase: 'awaitingExit' },
          e002: { phase: 'removed' },
        },
      }),
    ).not.toThrow()
  })

  test.each([
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    '15',
  ])('rejects an invalid remaining tick value %s', (remainingTicks) => {
    expect(() =>
      checkEntityLifecycleTable({
        s001: { e001: { phase: 'suspended', remainingTicks } },
      }),
    ).toThrow(/remainingTicks: 期望正安全整数/)
  })

  test('rejects unknown phases, variant pollution, and malformed nesting', () => {
    expect(() => checkEntityLifecycleTable({ s001: { e001: { phase: 'normal' } } })).toThrow(
      /phase: 期望/,
    )
    expect(() =>
      checkEntityLifecycleTable({
        s001: { e001: { phase: 'removed', remainingTicks: 1 } },
      }),
    ).toThrow(/remainingTicks: 未知字段/)
    expect(() => checkEntityLifecycleTable({ s001: [] })).toThrow(/期望对象/)
    expect(() => checkEntityLifecycleTable({ '': {} })).toThrow(/期望非空 id/)
    expect(() => checkEntityLifecycleTable({ s001: { '': { phase: 'removed' } } })).toThrow(
      /期望非空 id/,
    )
  })

  test('rejects unknown scene and entity references without mutating the input', () => {
    const unknownScene = { s999: { e001: { phase: 'removed' as const } } }
    const unknownEntity = { s001: { e999: { phase: 'removed' as const } } }
    expect(() => normalizeEntityLifecycleTable(unknownScene, references)).toThrow(/未知 scene id/)
    expect(() => normalizeEntityLifecycleTable(unknownEntity, references)).toThrow(/未知 entity id/)

    const source = { s001: { e001: { phase: 'removed' as const } } }
    const normalized = normalizeEntityLifecycleTable(source, references)
    normalized.s001!.e001 = { phase: 'awaitingExit' }
    expect(source.s001.e001).toEqual({ phase: 'removed' })
  })

  test('reference index rejects duplicate scene and entity identities', () => {
    expect(() =>
      buildEntityLifecycleReferenceIndex([
        { id: 's001', entities: [] },
        { id: 's001', entities: [] },
      ]),
    ).toThrow(/重复 scene id/)
    expect(() =>
      buildEntityLifecycleReferenceIndex([
        { id: 's001', entities: [{ id: 'e001' }, { id: 'e001' }] },
      ]),
    ).toThrow(/重复 entity id/)
  })
})
