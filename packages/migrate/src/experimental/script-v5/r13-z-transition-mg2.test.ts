import { describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  assertR13ZPublishedSealMatchesAuthority,
  prepareR13ZAuthority,
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
  rewindPublishedR13ZPublicationIfPresent,
} from './r13-z-transition-mg2.js'
import type { R13SourceInstructionDispositionBuildArgs } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

function buildArgs(
  overrides: Partial<R13SourceInstructionDispositionBuildArgs> = {},
): R13SourceInstructionDispositionBuildArgs {
  return {
    sources: undefined as never,
    migration: undefined as never,
    audit: undefined as never,
    generated: undefined as never,
    final: undefined as never,
    bindIndirectEntityBodies: true,
    bindItemThrowSourceSites: false,
    bindItemUnusableUseSourceSites: true,
    bindDomainProjectionSourceSites: true,
    bindOwnerSourceSites: true,
    bindSpriteActionSourceSites: true,
    ...overrides,
  }
}

describe('R13-Z append-only publication authority', () => {
  test('requires the item-throw closure gate to be explicit', () => {
    expect(() => prepareR13ZAuthority({ sourceDispositionBuild: buildArgs() })).toThrow(
      'authority 必须显式开启 bindItemThrowSourceSites',
    )
  })

  test('requires indirect entity-body binding to be explicit', () => {
    expect(() =>
      prepareR13ZAuthority({
        sourceDispositionBuild: buildArgs({
          bindItemThrowSourceSites: true,
          bindIndirectEntityBodies: false,
        }),
      }),
    ).toThrow('authority 必须显式开启 bindIndirectEntityBodies')
  })

  test('requires folded sprite source binding to be explicit', () => {
    expect(() =>
      prepareR13ZAuthority({
        sourceDispositionBuild: buildArgs({
          bindItemThrowSourceSites: true,
          bindSpriteActionSourceSites: false,
        }),
      }),
    ).toThrow('authority 必须显式开启 bindSpriteActionSourceSites')
  })

  test('rejects a different published seal and only rewinds a valid complete quartet', () => {
    const seal = {
      kind: 'r13-z-source-closure-transition' as const,
      version: 1 as const,
      projectId: 'pal' as const,
      transitionId: R13_Z_TRANSITION_ID,
      parent: {
        transitionId: 'r13-source-semantics-v1' as const,
        digest: 'a'.repeat(64),
      },
      sourceControl: {
        version: 1 as const,
        methodVersion: 'n3-p7-r13-source-instruction-disposition-v3' as const,
        sourceDigest: 'b'.repeat(64),
        auditDigest: 'c'.repeat(64),
        reportDigest: 'd'.repeat(64),
        finalDigest: 'e'.repeat(64),
        options: {
          bindItemThrowSourceSites: true as const,
          bindItemUnusableUseSourceSites: true as const,
          bindDomainProjectionSourceSites: true as const,
          bindOwnerSourceSites: true as const,
          bindSpriteActionSourceSites: true as const,
        },
        summary: { executionSites: 1, openDebtSites: 0 as const, openObservations: 0 as const },
      },
      runtimeControl: {
        version: 1 as const,
        methodVersion: 'n3-p7-r13-runtime-capability-v3' as const,
        reportDigest: 'f'.repeat(64),
        corpusDigest: '0'.repeat(64),
        summary: {
          domains: 1,
          cells: 1,
          uses: 1,
          refusedUses: 0,
          openIssues: 0,
          enemySkillReferences: 0,
          enemyDistinctSkillIds: 0,
          enemyEffectUses: 0,
        },
      },
      digest: '1'.repeat(64),
    }
    expect(() => assertR13ZPublishedSealMatchesAuthority(seal, seal)).not.toThrow()
    expect(() =>
      assertR13ZPublishedSealMatchesAuthority({ ...seal, digest: '2'.repeat(64) }, seal),
    ).toThrow('published seal 与 authority 不符')

    const { digest: _digest, ...body } = seal
    const validSeal = { ...body, digest: stableJsonSha256(body) }
    const value = JSON.parse(JSON.stringify(validSeal)) as MigrationJson
    const snapshot: MigrationSnapshot = {
      files: new Map([
        [R13_Z_SEAL_PATH, value],
        ['content/example.json', { value: 1 }],
      ]),
      managedFiles: new Set([R13_Z_SEAL_PATH, 'content/example.json']),
      hashes: new Map([
        [R13_Z_SEAL_PATH, sha256(serializeMigrationJson(value, R13_Z_SEAL_PATH))],
        ['content/example.json', 'a'.repeat(64)],
      ]),
      baselineMetadata: {
        generatorEpoch: 'test',
        transitions: {
          'r13-source-semantics-v1': validSeal.parent.digest,
          [R13_Z_TRANSITION_ID]: validSeal.digest,
        },
      },
    }
    const rewound = rewindPublishedR13ZPublicationIfPresent(snapshot)
    expect(rewound.files.has(R13_Z_SEAL_PATH)).toBe(false)
    expect(rewound.managedFiles.has(R13_Z_SEAL_PATH)).toBe(false)
    expect(rewound.hashes?.has(R13_Z_SEAL_PATH)).toBe(false)
    expect(rewound.baselineMetadata?.transitions[R13_Z_TRANSITION_ID]).toBeUndefined()
    expect(rewound.files.get('content/example.json')).toEqual({ value: 1 })

    const half = { ...snapshot, hashes: new Map(snapshot.hashes) }
    half.hashes.delete(R13_Z_SEAL_PATH)
    expect(() => rewindPublishedR13ZPublicationIfPresent(half)).toThrow(/半状态/)
  })
})
