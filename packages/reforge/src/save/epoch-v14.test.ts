import {
  buildEntityLifecycleReferenceIndexV13,
  type ProjectManifest,
  type WorldStateV14,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { normalizePayloadV14, preflightSaveMigrationV14 } from './migration-v14.js'
import type { SavePayloadV8Content14 } from './types.js'

function manifest(over: Partial<ProjectManifest<14>> = {}): ProjectManifest<14> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 14,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function world(): WorldStateV14 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    skillUseCounts: {},
    script: { flags: {}, vars: {}, entityState: {}, behaviors: {} },
    entityLifecycles: { s001: { e001: { phase: 'awaitingExit' } } },
  }
}

function payload(contentVersion: 10 | 11 | 12 | 13 | 14): SavePayloadV8Content14 {
  return {
    version: 8,
    projectId: 'demo',
    contentVersion: contentVersion as 14,
    world: world(),
    position: {
      sceneId: 's001',
      pos: { col: 2, row: 3, height: 0 },
      facing: 'left',
    },
  }
}

const references = buildEntityLifecycleReferenceIndexV13([
  { id: 's001', entities: [{ id: 'e001' }] },
])

describe('SAVE8/content14 dialogue identity resolver', () => {
  test.each([10, 11, 12, 13, 14] as const)('is identity-only for content%s', async (version) => {
    const raw = payload(version)
    const before = structuredClone(raw)
    const resolver = await preflightSaveMigrationV14({ manifest: manifest(), payload: raw })
    const normalized = normalizePayloadV14(raw, resolver, references)
    expect(normalized.contentVersion).toBe(14)
    expect(normalized.world).toEqual(raw.world)
    expect(normalized.position).toEqual(raw.position)
    expect(normalized.world).not.toBe(raw.world)
    expect(raw).toEqual(before)
  })

  test('rejects unsupported envelope and resolver mismatch', async () => {
    const raw = payload(14)
    await expect(
      preflightSaveMigrationV14({ manifest: manifest(), payload: { ...raw, contentVersion: 9 } }),
    ).rejects.toThrow(/不支持的 C1-2/)
    const resolver = await preflightSaveMigrationV14({ manifest: manifest(), payload: raw })
    expect(() => normalizePayloadV14({ ...raw, contentVersion: 13 }, resolver, references)).toThrow(
      /resolver 与 payload/,
    )
  })
})
