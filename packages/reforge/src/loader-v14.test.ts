import type { ManifestV14 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { assembleProjectV14, loadProjectV14From } from './loader-v14.js'
import { loadRunnableProjectFrom } from './runnable-project-loader.js'

const scene = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const actors = [
  {
    id: 'actor.li',
    name: 'name.li',
    spriteId: 'sprite.li',
    portraits: {
      default: 'portrait.li.default',
      expressions: { angry: 'portrait.li.angry' },
    },
  },
]

const sharedScripts = {
  hello: {
    name: 'Hello',
    self: 'none',
    body: [
      {
        kind: 'dialog',
        cue: {
          identity: {
            kind: 'actor',
            actor: 'actor.li',
            portrait: { kind: 'expression', expression: 'angry', side: 'left' },
          },
          rows: [{ text: 'line.hello' }],
        },
      },
    ],
  },
}

const baseJsons = {
  actors,
  sceneIds: ['s001'],
  entryScene: scene,
  skills: { skills: [], levelUp: {} },
  items: [],
  locale: { 'name.li': '李逍遥', 'line.hello': '你好' },
  sprites: [],
  battleSprites: [],
  tilesets: [],
  maps: {
    version: 1,
    maps: [{ id: 'map-001', name: '地图', path: 'content/maps/map-001.json' }],
  },
  assetCatalog: {
    version: 1,
    assets: {
      'portrait.li.default': {
        kind: 'portrait',
        path: 'assets/authored/portrait-default.png',
        mediaType: 'image/png',
        bytes: 1,
        sha256: 'a'.repeat(64),
        origin: { kind: 'authored' },
      },
      'portrait.li.angry': {
        kind: 'portrait',
        path: 'assets/authored/portrait-angry.png',
        mediaType: 'image/png',
        bytes: 1,
        sha256: 'b'.repeat(64),
        origin: { kind: 'authored' },
      },
    },
  },
  sharedScripts,
}

function manifest(over: Partial<ManifestV14> = {}): ManifestV14 {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 14,
    minimumSaveVersion: 8,
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    ...over,
  }
}

function memorySource(files: Record<string, unknown>): FileSource {
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
      throw new Error(`unexpected migration read ${path}`)
    },
    async urlFor(path) {
      return path
    },
  }
}

function files(projectManifest = manifest()): Record<string, unknown> {
  const content = projectManifest.content
  return {
    'manifest.json': projectManifest,
    [content.actors!]: baseJsons.actors,
    [content.scenes! + 'index.json']: baseJsons.sceneIds,
    [content.scenes! + 's001.json']: baseJsons.entryScene,
    [content.skills!]: baseJsons.skills,
    [content.items!]: baseJsons.items,
    [content.locale!]: baseJsons.locale,
    [content.sprites!]: baseJsons.sprites,
    [content.battleSprites!]: baseJsons.battleSprites,
    [content.tilesets!]: baseJsons.tilesets,
    [content.maps!]: baseJsons.maps,
    [content.sharedScripts!]: baseJsons.sharedScripts,
    [projectManifest.assets.catalog]: baseJsons.assetCatalog,
  }
}

describe('canonical contentVersion 14 loader boundary', () => {
  test('retains author identity while runtime fields receive the single resolved view', () => {
    const project = assembleProjectV14(manifest(), baseJsons)
    expect(project.manifest.contentVersion).toBe(14)
    expect(project.authorContent.sharedScripts.hello?.body[0]).toHaveProperty(
      'cue.identity.actor',
      'actor.li',
    )
    expect(project.sharedScripts.hello?.body[0]).toEqual({
      kind: 'dialog',
      cue: {
        speaker: 'name.li',
        portrait: { asset: 'portrait.li.angry', side: 'left' },
        rows: [{ text: 'line.hello' }],
      },
    })
  })

  test('missing expression fails before runtime projection', () => {
    const invalid = structuredClone(baseJsons)
    invalid.sharedScripts.hello.body[0]!.cue.identity.portrait.expression = 'missing'
    expect(() => assembleProjectV14(manifest(), invalid)).toThrow(/缺表情 "missing"/)
  })

  test('public and runnable loaders select content14', async () => {
    const source = memorySource(files())
    const loaded = await loadProjectV14From(source)
    expect(loaded.manifest.contentVersion).toBe(14)
    expect(loaded.sharedScripts.hello?.body[0]).toHaveProperty('cue.speaker', 'name.li')
    const runnable = await loadRunnableProjectFrom(memorySource(files()))
    expect(runnable.manifest.contentVersion).toBe(14)
  })
})
