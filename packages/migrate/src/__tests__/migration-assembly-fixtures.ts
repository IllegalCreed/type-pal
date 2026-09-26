import { expect } from 'vitest'
import { type MigrateSources, migrateAll, type SourceItem } from '../migrate-content.js'
import { item, type SourceInstruction } from './pure-migration-fixtures.js'

export function sources(overrides: Partial<MigrateSources> = {}): MigrateSources {
  return {
    roles: [],
    levelUpExp: [],
    levelUpMagic: [],
    spells: [],
    magic: [],
    items: [],
    commands: [{ op: 'end' }],
    ...overrides,
  }
}

/** all.json address zero is a real sentinel, not a shifted label fixture. */
export function chain(
  ...body: Array<SourceInstruction & { messageIndex?: number }>
): SourceInstruction[] {
  return [{ op: 'end' }, ...body, { op: 'end' }]
}

export function usable(overrides: Partial<SourceItem> = {}): SourceItem {
  return item({
    scriptDesc: 0,
    scriptOnUse: 1,
    flags: { ...item().flags, usable: true, consuming: true },
    ...overrides,
  })
}

export function thrown(overrides: Partial<SourceItem> = {}): SourceItem {
  return item({
    scriptDesc: 0,
    scriptOnThrow: 1,
    flags: { ...item().flags, throwable: true },
    ...overrides,
  })
}

/** Clone the exact consumed source, retaining callback identity separately (functions cannot clone). */
export function assemble(input: MigrateSources) {
  const { soundAssetForNum, ...data } = input
  const before = structuredClone(data)
  try {
    return migrateAll(input, undefined, {
      skillItemCosts: true,
      palSemanticProfile: 'current-r13-6b',
      palReferenceSchema: 'stable-id',
    })
  } finally {
    const { soundAssetForNum: afterSound, ...afterData } = input
    expect(afterSound).toBe(soundAssetForNum)
    expect(afterData).toEqual(before)
  }
}
