import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateActors, type ManifestV14 } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  loadPalBaseline,
  serializeMigrationJson,
  sha256,
  type MigrationSnapshot,
} from './migration-baseline.js'
import {
  buildPalC1NpcCurationMigration,
  C1_NPC_CURATION_SEAL_PATH,
  C1_NPC_CURATION_TRANSITION_ID,
  rewindPublishedC1NpcCurationIfPresent,
  rewindPublishedC1NpcProjectAgainstPublishedBaseline,
  type C1NpcCurationBuildResult,
} from './pal-c1-npc-curation-transition.js'
import type { MigrationJson } from './pal-migration.js'
import type { SourceCmd } from './source-facts.js'

const repo = fileURLToPath(new URL('../../..', import.meta.url))

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function snapshotView(source: MigrationSnapshot): unknown {
  return {
    files: [...source.files].sort(([left], [right]) => stableStringCompare(left, right)),
    managedFiles: [...source.managedFiles].sort(stableStringCompare),
    hashes: [...(source.hashes ?? new Map())].sort(([left], [right]) =>
      stableStringCompare(left, right),
    ),
    baselineMetadata: source.baselineMetadata,
  }
}

function setFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  snapshot.files.set(path, value)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
}

function projectFromPublished(source: MigrationSnapshot): MigrationSnapshot {
  const project = cloneSnapshot(source)
  delete project.baselineMetadata
  return project
}

function setTupleMask(snapshot: MigrationSnapshot, source: MigrationSnapshot, mask: number): void {
  const seal = source.files.get(C1_NPC_CURATION_SEAL_PATH)
  const hash = source.hashes?.get(C1_NPC_CURATION_SEAL_PATH)
  const digest = source.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID]
  if (!seal || !hash || !digest) throw new Error('C1-3 PAL test 缺完整 transition tuple')
  if (mask & 1) {
    if (!snapshot.baselineMetadata) throw new Error('C1-3 PAL test 缺 metadata')
    snapshot.baselineMetadata.transitions[C1_NPC_CURATION_TRANSITION_ID] = digest
  } else if (snapshot.baselineMetadata)
    delete snapshot.baselineMetadata.transitions[C1_NPC_CURATION_TRANSITION_ID]
  if (mask & 2) snapshot.files.set(C1_NPC_CURATION_SEAL_PATH, structuredClone(seal))
  else snapshot.files.delete(C1_NPC_CURATION_SEAL_PATH)
  if (mask & 4) snapshot.managedFiles.add(C1_NPC_CURATION_SEAL_PATH)
  else snapshot.managedFiles.delete(C1_NPC_CURATION_SEAL_PATH)
  if (mask & 8) snapshot.hashes?.set(C1_NPC_CURATION_SEAL_PATH, hash)
  else snapshot.hashes?.delete(C1_NPC_CURATION_SEAL_PATH)
}

let manifest: ManifestV14
let manifestRawText: string
let sourceCommands: SourceCmd[]
let sourceFileSha256: string
let build: C1NpcCurationBuildResult

beforeAll(() => {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('C1-3 PAL test 缺 published baseline')
  manifestRawText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
  manifest = JSON.parse(manifestRawText) as ManifestV14
  const sourceText = readFileSync(resolve(repo, 'data/extracted/events/all.json'), 'utf8')
  const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
  sourceCommands = sourceJson.segments.flatMap((segment) => segment.commands)
  sourceFileSha256 = sha256(sourceText)
  build = buildPalC1NpcCurationMigration({
    baseline,
    manifest,
    manifestRawText,
    sourceCommands,
    sourceFileSha256,
  })
})

describe('C1-3 approved PAL NPC curation transition', () => {
  test('projects only the approved two Actors and rewinds byte-exact to C1-2', () => {
    expect(build.seal.authority.decisionContentDigest).toBe(
      '3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f',
    )
    expect(build.seal.authority.approval).toEqual({
      approver: 'user',
      approvedAt: '2026-08-14T07:45:56.000Z',
      ledgerDigest: '3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f',
    })
    expect(build.seal.source.summary).toEqual({
      actors: 2,
      entitySites: 6,
      dialogueSites: 163,
      accepted: 169,
      deferred: 7842,
      rejected: 0,
    })
    const actors = validateActors(build.successor.files.get('content/actors.json'))
    expect(actors.slice(-2).map((actor) => actor.id)).toEqual(['jiu-jianxian', 'li-daniang'])
    const rewound = rewindPublishedC1NpcCurationIfPresent({
      source: build.successor,
      manifest,
      manifestRawText,
    })
    expect(snapshotView(rewound)).toEqual(snapshotView(build.parentC1))
  }, 120_000)

  test('replays the same approved authority without changing the successor', () => {
    const replay = buildPalC1NpcCurationMigration({
      baseline: build.successor,
      manifest,
      manifestRawText,
      sourceCommands,
      sourceFileSha256,
    })
    expect(snapshotView(replay.successor)).toEqual(snapshotView(build.successor))
  }, 120_000)

  test('rejects every baseline tuple half-state and orphan payload', () => {
    for (let mask = 0; mask < 15; mask += 1) {
      const candidate = cloneSnapshot(build.successor)
      setTupleMask(candidate, build.successor, mask)
      expect(() =>
        rewindPublishedC1NpcCurationIfPresent({
          source: candidate,
          manifest,
          manifestRawText,
        }),
      ).toThrow()
    }
  })

  test('preserves unrelated project edits while folding exact C1-3 leaves', () => {
    const project = projectFromPublished(build.successor)
    const path = 'content/scenes/s000.json'
    const scene = structuredClone(project.files.get(path)) as Record<string, unknown>
    const entry = scene.entry as Record<string, unknown>
    entry.facing = 'left'
    setFile(project, path, scene as MigrationJson)
    const parent = rewindPublishedC1NpcProjectAgainstPublishedBaseline({
      project,
      publishedBaseline: build.successor,
      manifest,
      manifestRawText,
    })
    const parentScene = parent.files.get(path) as Record<string, unknown>
    expect((parentScene.entry as Record<string, unknown>).facing).toBe('left')
    expect(parent.files.has(C1_NPC_CURATION_SEAL_PATH)).toBe(false)
    expect(validateActors(parent.files.get('content/actors.json')).some(
      (actor) => actor.id === 'li-daniang' || actor.id === 'jiu-jianxian',
    )).toBe(false)
  }, 120_000)

  test('requires the complete copied project seal tuple', () => {
    for (let mask = 0; mask < 7; mask += 1) {
      const project = projectFromPublished(build.successor)
      if (mask & 1) project.files.set(
        C1_NPC_CURATION_SEAL_PATH,
        structuredClone(build.successor.files.get(C1_NPC_CURATION_SEAL_PATH)!),
      )
      else project.files.delete(C1_NPC_CURATION_SEAL_PATH)
      if (mask & 2) project.managedFiles.add(C1_NPC_CURATION_SEAL_PATH)
      else project.managedFiles.delete(C1_NPC_CURATION_SEAL_PATH)
      if (mask & 4)
        project.hashes?.set(
          C1_NPC_CURATION_SEAL_PATH,
          build.successor.hashes!.get(C1_NPC_CURATION_SEAL_PATH)!,
        )
      else project.hashes?.delete(C1_NPC_CURATION_SEAL_PATH)
      expect(() =>
        rewindPublishedC1NpcProjectAgainstPublishedBaseline({
          project,
          publishedBaseline: build.successor,
          manifest,
          manifestRawText,
        }),
      ).toThrow()
    }
  }, 120_000)

  test('rejects stale owned project leaves and manifest raw-byte drift', () => {
    const project = projectFromPublished(build.successor)
    const actors = structuredClone(project.files.get('content/actors.json')) as Array<
      Record<string, unknown>
    >
    const actor = actors.find((entry) => entry.id === 'li-daniang')
    if (!actor) throw new Error('C1-3 PAL test 缺 li-daniang')
    actor.name = 'name.tampered'
    setFile(project, 'content/actors.json', actors as MigrationJson)
    expect(() =>
      rewindPublishedC1NpcProjectAgainstPublishedBaseline({
        project,
        publishedBaseline: build.successor,
        manifest,
        manifestRawText,
      }),
    ).toThrow(/Actor 漂移/)
    expect(() =>
      rewindPublishedC1NpcCurationIfPresent({
        source: build.successor,
        manifest,
        manifestRawText: `${manifestRawText}\n`,
      }),
    ).toThrow(/manifest authority/)
  }, 120_000)
})
