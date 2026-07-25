import { describe, expect, test } from 'vitest'
import {
  SCRIPT_V4_V5_SIDECAR_PATH,
  validateProjectMigrationDescriptorV1,
  validateProjectMigrationSidecarV1,
} from './script-transition-v5.js'

describe('script v4 -> v5 manifest descriptor', () => {
  const valid = {
    version: 1,
    fromContentVersion: 4,
    toContentVersion: 5,
    path: SCRIPT_V4_V5_SIDECAR_PATH,
    sha256: 'a'.repeat(64),
  }

  test('accepts the one frozen transition descriptor', () => {
    expect(validateProjectMigrationDescriptorV1(valid)).toEqual(valid)
  })

  test.each([
    [{ ...valid, version: 2 }, /version: 期望 1/],
    [{ ...valid, path: 'content/migrations/other.json' }, /path: 期望/],
    [{ ...valid, sha256: 'A'.repeat(64) }, /小写 SHA-256/],
    [{ ...valid, extra: true }, /未知字段/],
  ])('rejects malformed descriptor %#', (descriptor, message) => {
    expect(() => validateProjectMigrationDescriptorV1(descriptor)).toThrow(message)
  })
})

describe('script v4 -> v5 compatibility sidecar', () => {
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
    legacyCursors: [
      {
        legacyKey: 'e1',
        mode: 'single',
        target: {
          legacyStageCount: 1,
          target: {
            kind: 'entity-behavior',
            sceneId: 's001',
            entityId: 'e1',
            channel: 'trigger',
            behaviorId: 'default',
          },
          indices: [{ index: 0, cursor: { kind: 'stage', stage: 'initial' } }],
        },
      },
    ],
    legacyEntities: [
      {
        legacyId: 'e1',
        mode: 'single',
        target: { scene: 's001', entity: 'e1' },
      },
    ],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
    digest,
  }

  test('accepts a project-local alias closure', () => {
    expect(validateProjectMigrationSidecarV1(sidecar, 'demo')).toEqual(sidecar)
  })

  test('rejects wrong project, incomplete cursor maps and unsorted broadcasts', () => {
    expect(() => validateProjectMigrationSidecarV1(sidecar, 'other')).toThrow(/projectId/)
    expect(() =>
      validateProjectMigrationSidecarV1({
        ...sidecar,
        legacyCursors: [
          {
            ...sidecar.legacyCursors[0],
            target: {
              ...sidecar.legacyCursors[0]!.target,
              legacyStageCount: 2,
            },
          },
        ],
      }),
    ).toThrow(/逐项覆盖/)
    expect(() =>
      validateProjectMigrationSidecarV1({
        ...sidecar,
        legacyEntities: [
          {
            legacyId: 'e1',
            mode: 'broadcast-v4',
            targets: [
              { scene: 's002', entity: 'e1' },
              { scene: 's001', entity: 'e1' },
            ],
          },
        ],
      }),
    ).toThrow(/严格排序/)
  })
})
