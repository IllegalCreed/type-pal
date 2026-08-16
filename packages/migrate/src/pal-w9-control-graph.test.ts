import { isDeepStrictEqual } from 'node:util'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ManifestV14 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
} from './experimental/script-v5/r13-source-semantics-mg2.js'
import {
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
} from './experimental/script-v5/r13-z-transition-mg2.js'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import {
  loadPalBaseline,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import {
  B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
  B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
  b10PublishTimeSurfaceDigest,
} from './pal-b10-enemy-team-slots.js'
import { rewindCurrentC1PublicationToW9 } from './pal-current-c1-rewind.js'
import { assertB10PublishedAuthorityGraph } from './pal-w9-control-graph.js'
import { rewindPublishedW9PublicationIfPresent } from './pal-w9-entity-lifecycle.js'
import {
  R13_SIX_C_SEAL_PATH,
  R13_SIX_C_TRANSITION_ID,
} from './pal-r13-six-c.js'
import type { MigrationJson } from './pal-migration.js'

const repo = fileURLToPath(new URL('../../..', import.meta.url))

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function loadParentBaseline(): MigrationSnapshot {
  const loaded = loadPalBaseline(repo)
  if (!loaded) throw new Error('test 缺 PAL baseline')
  const manifestRawText = readFileSync(`${repo}/projects/pal/manifest.json`, 'utf8')
  return rewindPublishedW9PublicationIfPresent(rewindCurrentC1PublicationToW9({
    source: loaded,
    manifest: JSON.parse(manifestRawText) as ManifestV14,
    manifestRawText,
  }))
}

// All negative cases mutate only their returned clone. Reuse one fully verified real baseline
// instead of parsing the same 548-file publication seven times under the release-unit timeout.
const parentFixture = loadParentBaseline()

function parentBaseline(): MigrationSnapshot {
  return cloneSnapshot(parentFixture)
}

function resign(
  snapshot: MigrationSnapshot,
  transitionId: string,
  path: string,
  mutate: (value: Record<string, unknown>) => void,
): string {
  const current = snapshot.files.get(path)
  if (!current || typeof current !== 'object' || Array.isArray(current))
    throw new Error(`test 缺 ${path}`)
  const next = structuredClone(current) as Record<string, unknown>
  mutate(next)
  delete next.digest
  next.digest = stableJsonSha256(next)
  const json = next as MigrationJson
  snapshot.files.set(path, json)
  snapshot.managedFiles.add(path)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(json, path)))
  if (!snapshot.baselineMetadata) throw new Error('test baseline 缺 metadata')
  snapshot.baselineMetadata.transitions[transitionId] = String(next.digest)
  return String(next.digest)
}

function resignB10ForCurrentSurface(
  snapshot: MigrationSnapshot,
  mutate: (value: Record<string, unknown>) => void,
): void {
  resign(snapshot, B10_ENEMY_TEAM_SLOTS_TRANSITION_ID, B10_ENEMY_TEAM_SLOTS_SEAL_PATH, (raw) => {
    mutate(raw)
    const content = raw.content as Record<string, unknown>
    content.publishTimeSurfaceDigest = b10PublishTimeSurfaceDigest(snapshot)
  })
}

describe('W9 historical B10 control graph', () => {
  test('recursively verifies B10 → Z → 6C → shared source-semantics deterministically', () => {
    const parent = parentBaseline()
    const first = assertB10PublishedAuthorityGraph(parent)

    // The projection digest is built from sorted, immutable inputs; a second full historical
    // closure replay is intentionally covered by the production current-replay command rather
    // than making this unit route re-read all 871 scenes twice.
    const { digest, ...projectionBody } = first.projection
    expect(digest).toBe(stableJsonSha256(projectionBody))
    expect(first.projection.rewindOrder).toEqual([
      B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
      R13_Z_TRANSITION_ID,
      R13_SIX_C_TRANSITION_ID,
      R13_SOURCE_SEMANTICS_TRANSITION_ID,
    ])
    expect(first.projection.r13Z.parentDigest).toBe(first.projection.sourceSemantics.sealDigest)
    expect(first.projection.r13SixC.parentDigest).toBe(
      first.projection.sourceSemantics.sealDigest,
    )
    expect(first.projection.r13Z.finalContentDigest).toBe(
      first.projection.sourceSemantics.finalContentDigest,
    )
    expect(first.projection.r13SixC.finalContentDigest).toBe(
      first.projection.sourceSemantics.finalContentDigest,
    )
  }, 30_000)

  test.each([
    ['R13-Z', R13_Z_SEAL_PATH],
    ['R13-6C', R13_SIX_C_SEAL_PATH],
    ['source-semantics', R13_SOURCE_SEMANTICS_SEAL_PATH],
  ])('rejects %s quartet missing managed before producing a graph', (_label, path) => {
    const parent = parentBaseline()
    parent.managedFiles.delete(path)
    let output: unknown
    expect(() => {
      output = assertB10PublishedAuthorityGraph(parent)
    }).toThrow()
    expect(output).toBeUndefined()
  })

  test('rejects a fully re-signed R13-6C envelope with an unknown field', () => {
    const parent = parentBaseline()
    const sixCDigest = resign(
      parent,
      R13_SIX_C_TRANSITION_ID,
      R13_SIX_C_SEAL_PATH,
      (raw) => {
        raw.forged = true
      },
    )
    resignB10ForCurrentSurface(parent, (raw) => {
      const control = raw.parent as Record<string, unknown>
      control.metadataDigest = sixCDigest
      control.sealDigest = sixCDigest
    })

    expect(() => assertB10PublishedAuthorityGraph(parent)).toThrow(/R13-6C.*字段集合漂移/)
  })

  test('rejects a fully re-signed Z parent fork even when B10 references are updated', () => {
    const parent = parentBaseline()
    const fork = 'f'.repeat(64)
    const zDigest = resign(parent, R13_Z_TRANSITION_ID, R13_Z_SEAL_PATH, (raw) => {
      ;(raw.parent as Record<string, unknown>).digest = fork
    })
    resignB10ForCurrentSurface(parent, (raw) => {
      const [control] = raw.requiredControls as Array<Record<string, unknown>>
      if (!control) throw new Error('test B10 缺 required control')
      control.metadataDigest = zDigest
      control.sealDigest = zDigest
    })

    expect(() => assertB10PublishedAuthorityGraph(parent)).toThrow(/未绑定同一 source-semantics/)
  })

  test('is read-only on failure', () => {
    const parent = parentBaseline()
    const before = cloneSnapshot(parent)
    parent.hashes?.set(R13_Z_SEAL_PATH, '0'.repeat(64))
    expect(() => assertB10PublishedAuthorityGraph(parent)).toThrow()
    before.hashes?.set(R13_Z_SEAL_PATH, '0'.repeat(64))
    expect(isDeepStrictEqual(parent, before)).toBe(true)
  })
})
