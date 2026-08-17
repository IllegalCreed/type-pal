import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ManifestV14 } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { stableJsonSha256 } from './experimental/script-v5/stable-json.js'
import {
  loadPalBaseline,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from './migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'
import {
  C1_DIALOGUE_IDENTITY_SEAL_PATH,
  C1_DIALOGUE_IDENTITY_TRANSITION_ID,
  type C1DialogueIdentityTransitionSealV1,
  rewindPublishedC1ProjectAgainstPublishedBaseline,
} from './pal-c1-dialogue-identity.js'
import {
  rewindCurrentC1ProjectToDialogueParent,
  rewindCurrentC1PublicationToDialogueParent,
} from './pal-current-c1-rewind.js'
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

function firstDialogue(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstDialogue(child)
      if (found) return found
    }
    return undefined
  }
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (record.kind === 'dialog' && record.cue && typeof record.cue === 'object') return record
  for (const child of Object.values(record)) {
    const found = firstDialogue(child)
    if (found) return found
  }
  return undefined
}

function replaceFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  snapshot.files.set(path, value)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
}

let published: MigrationSnapshot
let project: MigrationSnapshot
let manifest: ManifestV14
let seal: C1DialogueIdentityTransitionSealV1

beforeAll(() => {
  const loaded = loadPalBaseline(repo)
  if (!loaded) throw new Error('C1 PAL test 缺 published baseline')
  const currentManifestRawText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
  const currentManifest = JSON.parse(currentManifestRawText) as ManifestV14
  published = rewindCurrentC1PublicationToDialogueParent({
    source: loaded,
    manifest: currentManifest,
    manifestRawText: currentManifestRawText,
  })
  manifest = { ...currentManifest, contentVersion: 14 }
  const manifestRawText = currentManifestRawText.replace(
    /(\"contentVersion\"\s*:\s*)15/,
    (_match, prefix: string) => `${prefix}14`,
  )
  const rawSeal = published.files.get(C1_DIALOGUE_IDENTITY_SEAL_PATH)
  if (!rawSeal) throw new Error('C1 PAL test 缺 transition seal')
  seal = rawSeal as unknown as C1DialogueIdentityTransitionSealV1
  const managed = discoverProjectManagedFiles(repo, loaded.managedFiles)
  project = rewindCurrentC1ProjectToDialogueParent({
    project: loadProjectMigrationSnapshot(repo, managed),
    publishedBaseline: loaded,
    manifest: currentManifest,
    manifestRawText: currentManifestRawText,
  })
})

describe('C1-2 published dialogue identity successor', () => {
  test('pins the PAL census and folds the copied project seal without losing authored edits', () => {
    expect(manifest.contentVersion).toBe(14)
    expect(manifest.minimumSaveVersion).toBe(8)
    expect(stableJsonSha256(manifest)).toBe(seal.successor.manifestDigest)
    expect(seal.source.summary).toEqual({
      scenes: 5995,
      items: 23,
      sharedScripts: 0,
      enemies: 217,
      total: 6235,
    })
    expect(published.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID]).toBe(
      seal.digest,
    )

    const edited = cloneSnapshot(project)
    const path = 'content/scenes/s000.json'
    const scene = structuredClone(edited.files.get(path)) as Record<string, unknown>
    const entry = scene.entry as Record<string, unknown>
    entry.facing = 'left'
    replaceFile(edited, path, scene as MigrationJson)

    const parent = rewindPublishedC1ProjectAgainstPublishedBaseline(edited, published)
    const parentScene = parent.files.get(path) as Record<string, unknown>
    expect((parentScene.entry as Record<string, unknown>).facing).toBe('left')
    expect(parent.files.has(C1_DIALOGUE_IDENTITY_SEAL_PATH)).toBe(false)
    const command = firstDialogue(parentScene)
    const cue = command?.cue as Record<string, unknown>
    expect(cue.identity).toBeUndefined()
    for (const sealed of seal.source.files) {
      if (sealed.path === path) continue
      expect(snapshotFileHash(parent, sealed.path), sealed.path).toBe(sealed.parentSha256)
    }
  }, 120_000)
})
