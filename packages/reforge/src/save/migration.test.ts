import { canonicalScriptTransitionJson, type ProjectManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  legacyBindingDigest,
  normalizePayloadV5,
  preflightLegacySaveMigrationV5 as preflightSaveMigration,
  type SavePayloadV5,
  SCRIPT_V5_SAVE_VERSION,
  sha256Bytes,
} from './migration.js'

const encoder = new TextEncoder()
const digest = 'b'.repeat(64)
const sidecar = {
  version: 1,
  projectId: 'demo',
  transitionId: 'script-v4-v5',
  fromContentVersion: 4,
  toContentVersion: 5,
  sourceAuditDigest: digest,
  provenance: { kind: 'project-local', transformDigest: digest },
  legacyBindings: [],
  legacyCursors: [],
  legacyEntities: [],
  lineagePlans: { pages: [], stages: [] },
  localAllocations: [],
  targetClosures: [],
  digest,
}

async function fixture(
  minimumSaveVersion?: number,
  sidecarValue: typeof sidecar | Record<string, unknown> = sidecar,
  signSidecar = true,
) {
  const { digest: _digest, ...withoutDigest } = sidecarValue
  const signedSidecar = signSidecar
    ? {
        ...sidecarValue,
        digest: await sha256Bytes(encoder.encode(canonicalScriptTransitionJson(withoutDigest))),
      }
    : sidecarValue
  const bytes = encoder.encode(`${JSON.stringify(signedSidecar)}\n`)
  const descriptorSha256 = await sha256Bytes(bytes)
  const manifest = {
    id: 'demo',
    name: 'Demo',
    contentVersion: 5,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
    migrations: {
      'script-v4-v5': {
        version: 1,
        fromContentVersion: 4,
        toContentVersion: 5,
        path: 'content/migrations/script-v4-v5-save.json',
        sha256: descriptorSha256,
      },
    },
    ...(minimumSaveVersion === undefined ? {} : { minimumSaveVersion }),
  } satisfies ProjectManifest<5>
  let reads = 0
  const source = {
    async readBytes() {
      reads++
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
  }
  return { manifest, source, reads: () => reads }
}

describe('save v4 -> v5 preflight matrix', () => {
  test('5/5 is an empty chain and does not require historical sidecar', async () => {
    const { manifest, source, reads } = await fixture()
    delete (manifest as ProjectManifest<5>).migrations
    await expect(
      preflightSaveMigration({
        manifest,
        source,
        payload: { version: 5, contentVersion: 5, projectId: 'demo' },
      }),
    ).resolves.toMatchObject({ kind: 'current-v5' })
    expect(reads()).toBe(0)
  })

  test.each([
    1, 2, 3, 4,
  ])('SAVE v%i/content 4 reads and verifies the v4-v5 sidecar', async (version) => {
    const { manifest, source, reads } = await fixture()
    await expect(
      preflightSaveMigration({
        manifest,
        source,
        payload: { version, contentVersion: 4, projectId: 'demo' },
      }),
    ).resolves.toMatchObject({ kind: 'v4-v5', targetSaveVersion: SCRIPT_V5_SAVE_VERSION })
    expect(reads()).toBe(1)
  })

  test('minimumSaveVersion rejects before any sidecar IO', async () => {
    const { manifest, source, reads } = await fixture(4)
    await expect(
      preflightSaveMigration({
        manifest,
        source,
        payload: { version: 3, contentVersion: 4, projectId: 'demo' },
      }),
    ).rejects.toThrow(/minimumSaveVersion/)
    expect(reads()).toBe(0)
  })

  test.each([
    [{ version: 5, contentVersion: 4, projectId: 'demo' }, /SAVE v5/],
    [{ version: 4, contentVersion: 5, projectId: 'demo' }, /旧 SAVE envelope/],
    [{ version: 4, contentVersion: 3, projectId: 'demo' }, /不受支持/],
  ])('rejects invalid version combination %# without guessing', async (payload, message) => {
    const { manifest, source } = await fixture()
    await expect(preflightSaveMigration({ manifest, source, payload })).rejects.toThrow(message)
  })

  test('descriptor digest mismatch fails before parsing sidecar', async () => {
    const { manifest, source } = await fixture()
    manifest.migrations!['script-v4-v5']!.sha256 = '0'.repeat(64)
    await expect(
      preflightSaveMigration({
        manifest,
        source,
        payload: { version: 4, contentVersion: 4, projectId: 'demo' },
      }),
    ).rejects.toThrow(/实际/)
  })

  test('valid descriptor cannot mask a stale sidecar self digest', async () => {
    const { manifest, source } = await fixture(undefined, sidecar, false)
    await expect(
      preflightSaveMigration({
        manifest,
        source,
        payload: { version: 4, contentVersion: 4, projectId: 'demo' },
      }),
    ).rejects.toThrow(/sidecar 自摘要/)
  })
})

describe('save v4 -> v5 pure normalizer', () => {
  test('current 5/5 validates canonical script state without reading a historical sidecar', async () => {
    const { manifest, source } = await fixture()
    delete (manifest as ProjectManifest<5>).migrations
    const payload: SavePayloadV5 = {
      version: 5,
      projectId: 'demo',
      contentVersion: 5,
      world: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
        script: {
          flags: {},
          vars: {},
          entityState: {},
          behaviors: {
            entities: {
              s001: {
                e1: {
                  trigger: {
                    selection: { kind: 'use', value: 'talk' },
                    cursor: {
                      behavior: 'talk',
                      at: { kind: 'stage', stage: 'done' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      position: {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down' as const,
      },
    }
    const resolver = await preflightSaveMigration({ manifest, source, payload })
    expect(() => normalizePayloadV5(payload, resolver)).not.toThrow()

    const malformed = structuredClone(payload)
    const script = malformed.world.script
    const trigger = script?.behaviors.entities?.s001?.e1?.trigger
    if (!trigger) throw new Error('test fixture trigger missing')
    ;(trigger.selection as unknown) = { kind: 'inherit' }
    expect(() => normalizePayloadV5(malformed, resolver)).toThrow(/持久覆写只允许 disabled\|use/)
  })

  test('current 5/5 defaults a missing script container on the isolated result', async () => {
    const { manifest, source } = await fixture()
    delete (manifest as ProjectManifest<5>).migrations
    const payload: SavePayloadV5 = {
      version: 5,
      projectId: 'demo',
      contentVersion: 5,
      world: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
      },
      position: {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down' as const,
      },
    }
    const resolver = await preflightSaveMigration({ manifest, source, payload })
    const normalized = normalizePayloadV5(payload, resolver)
    expect(payload.world).not.toHaveProperty('script')
    expect(normalized.world.script).toEqual({
      flags: {},
      vars: {},
      entityState: {},
      behaviors: {},
    })
  })

  test('current 5/5 isolates and validates the temporary hostile-awareness timer', async () => {
    const { manifest, source } = await fixture()
    delete (manifest as ProjectManifest<5>).migrations
    const payload: SavePayloadV5 = {
      version: 5,
      projectId: 'demo',
      contentVersion: 5,
      world: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
        hostileAwareness: { rangeMultiplier: 3, remainingMs: 59_999.5 },
      },
      position: {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
      },
    }
    const resolver = await preflightSaveMigration({ manifest, source, payload })
    const normalized = normalizePayloadV5(payload, resolver)
    expect(normalized.world.hostileAwareness).toEqual({
      rangeMultiplier: 3,
      remainingMs: 59_999.5,
    })
    expect(normalized.world.hostileAwareness).not.toBe(payload.world.hostileAwareness)

    for (const invalid of [
      { rangeMultiplier: 1, remainingMs: 1 },
      { rangeMultiplier: 0, remainingMs: 0 },
      { rangeMultiplier: 3, remainingMs: -1 },
      { rangeMultiplier: 3, remainingMs: Number.NaN },
      { rangeMultiplier: 3, remainingMs: 1, extra: true },
      [],
    ]) {
      const malformed = structuredClone(payload) as SavePayloadV5
      ;(malformed.world as unknown as Record<string, unknown>).hostileAwareness = invalid
      expect(() => normalizePayloadV5(malformed, resolver)).toThrow(/hostileAwareness/)
    }
  })

  test('broadcasts flat entity state, clamps each cursor target independently and restores hook selection', async () => {
    const binding = { chunk: 'old/c00', id: 'shared/teleport' }
    const bindingSha256 = await legacyBindingDigest(binding)
    const migration = {
      ...sidecar,
      legacyBindings: [
        {
          from: {
            kind: 'scene-hook-binding',
            sceneId: 's001',
            hook: 'onTeleport',
            digest: bindingSha256,
          },
          target: {
            kind: 'scene-hook',
            sceneId: 's001',
            hook: 'onTeleport',
            hookId: 'exit',
          },
        },
      ],
      legacyEntities: [
        {
          legacyId: 'e1',
          mode: 'broadcast-v4',
          targets: [
            { scene: 's001', entity: 'e1' },
            { scene: 's002', entity: 'e1' },
          ],
        },
      ],
      legacyCursors: [
        {
          legacyKey: 'e1',
          mode: 'broadcast-v4',
          targets: [
            {
              legacyStageCount: 1,
              target: {
                kind: 'entity-behavior',
                sceneId: 's001',
                entityId: 'e1',
                channel: 'trigger',
                behaviorId: 'default',
              },
              indices: [{ index: 0, cursor: { kind: 'stage', stage: 'only' } }],
            },
            {
              legacyStageCount: 2,
              target: {
                kind: 'entity-behavior',
                sceneId: 's002',
                entityId: 'e1',
                channel: 'trigger',
                behaviorId: 'default',
              },
              indices: [
                { index: 0, cursor: { kind: 'stage', stage: 'first' } },
                { index: 1, cursor: { kind: 'stage', stage: 'second' } },
              ],
            },
          ],
        },
        {
          legacyKey: 'teleport:s001',
          mode: 'broadcast-v4',
          targets: [
            {
              legacyStageCount: 1,
              target: {
                kind: 'scene-hook',
                sceneId: 's001',
                hook: 'onTeleport',
                hookId: 'default',
              },
              indices: [{ index: 0, cursor: { kind: 'stage', stage: 'default-only' } }],
            },
            {
              legacyStageCount: 2,
              target: {
                kind: 'scene-hook',
                sceneId: 's001',
                hook: 'onTeleport',
                hookId: 'exit',
              },
              indices: [
                { index: 0, cursor: { kind: 'stage', stage: 'exit-first' } },
                { index: 1, cursor: { kind: 'stage', stage: 'exit-second' } },
              ],
            },
          ],
        },
      ],
    }
    const { manifest, source } = await fixture(undefined, migration)
    const payload = {
      version: 4,
      projectId: 'demo',
      contentVersion: 4,
      world: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
        hostileAwareness: { rangeMultiplier: 0 as const, remainingMs: 12_345.5 },
        script: {
          flags: {},
          vars: {},
          entityState: { e1: 2 },
          entityPos: { e1: { col: 3, row: 4, height: 0 } },
          entityLayer: { e1: 7 },
          entityStage: { e1: 99, 'teleport:s001': 99 },
          sceneScriptOverrides: {
            s001: {
              onTeleport: { ...binding, chunk: 'rechunked/c99' },
            },
          },
        },
      },
      position: {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down' as const,
      },
    }
    const before = structuredClone(payload)
    const resolver = await preflightSaveMigration({ manifest, source, payload })
    const normalized = normalizePayloadV5(payload, resolver)
    expect(payload).toEqual(before)
    expect(normalized).toMatchObject({ version: 5, contentVersion: 5 })
    expect(normalized.world.hostileAwareness).toEqual({
      rangeMultiplier: 0,
      remainingMs: 12_345.5,
    })
    expect(normalized.world.script).toMatchObject({
      entityState: { s001: { e1: 2 }, s002: { e1: 2 } },
      entityPos: {
        s001: { e1: { col: 3, row: 4, height: 0 } },
        s002: { e1: { col: 3, row: 4, height: 0 } },
      },
      entityLayer: { s001: { e1: 7 }, s002: { e1: 7 } },
      behaviors: {
        entities: {
          s001: {
            e1: {
              trigger: {
                cursor: {
                  behavior: 'default',
                  at: { kind: 'stage', stage: 'only' },
                },
              },
            },
          },
          s002: {
            e1: {
              trigger: {
                cursor: {
                  behavior: 'default',
                  at: { kind: 'stage', stage: 'second' },
                },
              },
            },
          },
        },
        scenes: {
          s001: {
            onTeleport: {
              selection: { kind: 'use', value: 'exit' },
              cursor: {
                hook: 'exit',
                at: { kind: 'stage', stage: 'exit-second' },
              },
            },
          },
        },
      },
    })
    expect(normalized.world.script).not.toHaveProperty('entityStage')
    expect(normalized.world.script).not.toHaveProperty('sceneScriptOverrides')
  })

  test('missing aliases fail without mutating input', async () => {
    const { manifest, source } = await fixture()
    const payload = {
      version: 4,
      projectId: 'demo',
      contentVersion: 4,
      world: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [],
        script: { flags: {}, vars: {}, entityState: { missing: 1 }, entityStage: {} },
      },
      position: {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down' as const,
      },
    }
    const before = structuredClone(payload)
    const resolver = await preflightSaveMigration({ manifest, source, payload })
    expect(() => normalizePayloadV5(payload, resolver)).toThrow(/缺 LegacyEntityAlias/)
    expect(payload).toEqual(before)
  })
})
