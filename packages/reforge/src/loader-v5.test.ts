import { canonicalScriptTransitionJson, type ProjectManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { assembleProjectV5, loadProjectV5From } from './loader-v5.js'
import { sha256Bytes } from './save/migration.js'

const encoder = new TextEncoder()

const scene = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const jsons = {
  actors: [],
  sceneIds: ['s001'],
  entryScene: scene,
  skills: { skills: [], levelUp: {} },
  items: [],
  locale: {},
  sprites: [],
  battleSprites: [],
  tilesets: [],
  maps: {
    version: 1,
    maps: [{ id: 'map-001', name: '地图', path: 'content/maps/map-001.json' }],
  },
  assetCatalog: { version: 1, assets: {} },
}

function manifest(over: Partial<ProjectManifest<5>> = {}): ProjectManifest<5> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 5,
    entryScene: 's001',
    content: {
      actors: 'content/actors.json',
      scenes: 'content/scenes/',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      sprites: 'content/sprites.json',
      battleSprites: 'content/battle-sprites.json',
      tilesets: 'content/tilesets.json',
      maps: 'content/maps/index.json',
      sharedScripts: 'content/shared-scripts.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
    ...over,
  }
}

async function migrationFixture() {
  const digest = 'a'.repeat(64)
  const withoutDigest = {
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
  }
  const sidecar = {
    ...withoutDigest,
    digest: await sha256Bytes(encoder.encode(canonicalScriptTransitionJson(withoutDigest))),
  }
  const bytes = encoder.encode(`${JSON.stringify(sidecar)}\n`)
  const descriptor = {
    version: 1 as const,
    fromContentVersion: 4 as const,
    toContentVersion: 5 as const,
    path: 'content/migrations/script-v4-v5-save.json' as const,
    sha256: await sha256Bytes(bytes),
  }
  return { sidecar, bytes, descriptor }
}

function memorySource(
  files: Record<string, unknown>,
  binary: Record<string, Uint8Array>,
): FileSource {
  return {
    async readText(path) {
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return `${JSON.stringify(value)}\n`
    },
    async readJson<T>(path: string) {
      const value = files[path]
      if (value === undefined) throw new Error(`missing ${path}`)
      return structuredClone(value) as T
    },
    async readBytes(path) {
      const value = binary[path]
      if (!value) throw new Error(`missing ${path}`)
      return value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength,
      ) as ArrayBuffer
    },
    async urlFor(path) {
      return path
    },
  }
}

describe('canonical contentVersion 5 loader', () => {
  test('pure assembler accepts v5 scene/item schema and rejects legacy positional hooks', () => {
    expect(assembleProjectV5(manifest(), jsons).entryScene.id).toBe('s001')
    expect(() =>
      assembleProjectV5(manifest(), {
        ...jsons,
        entryScene: { ...scene, onEnter: [] },
      }),
    ).toThrow(/onEnter.*v5/)
    expect(() =>
      assembleProjectV5(
        manifest({
          content: {
            ...manifest().content,
            scripts: 'content/scripts/',
          },
        }),
        jsons,
      ),
    ).toThrow(/legacy content\.scripts/)
  })

  test('IO loader verifies and retains every registered migration blob byte-for-byte', async () => {
    const fixture = await migrationFixture()
    const projectManifest = manifest({
      migrations: { 'script-v4-v5': fixture.descriptor },
    })
    const files = {
      'manifest.json': projectManifest,
      'content/actors.json': jsons.actors,
      'content/scenes/index.json': jsons.sceneIds,
      'content/scenes/s001.json': jsons.entryScene,
      'content/skills.json': jsons.skills,
      'content/items.json': jsons.items,
      'content/locale.json': jsons.locale,
      'content/sprites.json': jsons.sprites,
      'content/battle-sprites.json': jsons.battleSprites,
      'content/tilesets.json': jsons.tilesets,
      'content/maps/index.json': jsons.maps,
      'content/shared-scripts.json': {},
      'assets/index.json': jsons.assetCatalog,
    }
    const project = await loadProjectV5From(
      memorySource(files, { [fixture.descriptor.path]: fixture.bytes }),
    )
    const blob = project.migrationRegistry['script-v4-v5']
    expect(blob?.sidecar).toEqual(fixture.sidecar)
    expect([...blob!.bytes]).toEqual([...fixture.bytes])

    const tampered = Uint8Array.from(fixture.bytes)
    const tamperedIndex = tampered.length - 2
    tampered[tamperedIndex] = tampered[tamperedIndex]! ^ 1
    await expect(
      loadProjectV5From(memorySource(files, { [fixture.descriptor.path]: tampered })),
    ).rejects.toThrow(/SHA-256/)
  })

  test('pure assembler requires a verified blob for every manifest registry entry', async () => {
    const fixture = await migrationFixture()
    expect(() =>
      assembleProjectV5(manifest({ migrations: { 'script-v4-v5': fixture.descriptor } }), jsons),
    ).toThrow(/registry/)
  })
})
