import type { CurrentManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { assembleCurrentProject, loadCurrentProjectFrom } from './project-loader.js'

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
  entryScenes: { s001: scene },
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
  worldVariables: {},
}

function manifest(over: Partial<CurrentManifest> = {}): CurrentManifest {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 17,
    minimumSaveVersion: 8,
    defaultEntryId: 'new-game',
    entryPoints: [
      {
        id: 'new-game',
        label: '开始游戏',
        scene: 's001',
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      },
    ],
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
      worldVariables: 'content/world-variables.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
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
      throw new Error(`current loader must not read migration sidecar: ${path}`)
    },
    async urlFor(path) {
      return path
    },
  }
}

function files(projectManifest = manifest()): Record<string, unknown> {
  const content = projectManifest.content
  const projectFiles: Record<string, unknown> = {
    'manifest.json': projectManifest,
    [content.actors!]: baseJsons.actors,
    [content.scenes! + 'index.json']: [
      ...new Set(projectManifest.entryPoints.map((entry) => entry.scene)),
    ],
    [content.skills!]: baseJsons.skills,
    [content.items!]: baseJsons.items,
    [content.locale!]: baseJsons.locale,
    [content.sprites!]: baseJsons.sprites,
    [content.battleSprites!]: baseJsons.battleSprites,
    [content.tilesets!]: baseJsons.tilesets,
    [content.maps!]: baseJsons.maps,
    [content.sharedScripts!]: baseJsons.sharedScripts,
    [content.worldVariables!]: baseJsons.worldVariables,
    [projectManifest.assets.catalog]: baseJsons.assetCatalog,
  }
  for (const entry of projectManifest.entryPoints)
    projectFiles[content.scenes! + `${entry.scene}.json`] = { ...scene, id: entry.scene }
  return projectFiles
}

describe('current project loader', () => {
  test('retains author identity and creates the runtime dialogue projection directly', () => {
    const project = assembleCurrentProject(manifest(), baseJsons)
    expect(project.manifest.contentVersion).toBe(17)
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

  test('fails invalid author identity before runtime projection', () => {
    const invalid = structuredClone(baseJsons)
    invalid.sharedScripts.hello.body[0]!.cue.identity.portrait.expression = 'missing'
    expect(() => assembleCurrentProject(manifest(), invalid)).toThrow(/缺表情 "missing"/)
  })

  test('loads only current content without reading a migration sidecar', async () => {
    const loaded = await loadCurrentProjectFrom(memorySource(files()))
    expect(loaded.manifest.contentVersion).toBe(17)
    expect(loaded.sharedScripts.hello?.body[0]).toHaveProperty('cue.speaker', 'name.li')
  })

  test('loads and validates every real entry while deriving runtime cache from defaultEntryId', () => {
    const second = { ...scene, id: 's002' }
    const projectManifest = manifest({
      defaultEntryId: 'default-entry',
      entryPoints: [
        {
          id: 'other-entry',
          label: '其他入口',
          scene: 's001',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
        {
          id: 'default-entry',
          label: '默认入口',
          scene: 's002',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    })
    const project = assembleCurrentProject(projectManifest, {
      ...baseJsons,
      sceneIds: ['s001', 's002'],
      entryScenes: { s001: scene, s002: second },
    })
    expect(project.entryScene.id).toBe('s002')
    expect(Object.keys(project.authorContent.entryScenes)).toEqual(['s001', 's002'])
  })

  test('rejects a broken non-default entry world reference', () => {
    const projectManifest = manifest({
      entryPoints: [
        manifest().entryPoints[0],
        {
          id: 'broken',
          label: '损坏入口',
          scene: 's002',
          startWorld: { party: ['missing-actor'], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    })
    expect(() =>
      assembleCurrentProject(projectManifest, {
        ...baseJsons,
        sceneIds: ['s001', 's002'],
        entryScenes: { s001: scene, s002: { ...scene, id: 's002' } },
      }),
    ).toThrow(/entryPoints\[broken\].*missing-actor/)
  })

  test('reports a missing non-default entry scene with the stable entry id', async () => {
    const projectManifest = manifest({
      entryPoints: [
        manifest().entryPoints[0],
        {
          id: 'missing-scene-entry',
          label: '缺失场景',
          scene: 's002',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    })
    const projectFiles = files(projectManifest)
    delete projectFiles['content/scenes/s002.json']
    await expect(loadCurrentProjectFrom(memorySource(projectFiles))).rejects.toThrow(
      /entryPoints\[missing-scene-entry\].*s002\.json/,
    )
  })

  test('rejects pre-current content at the only product boundary', async () => {
    const oldManifest = { ...manifest(), contentVersion: 16 }
    await expect(
      loadCurrentProjectFrom(memorySource(files(oldManifest as CurrentManifest))),
    ).rejects.toThrow(/contentVersion: 期望 17/)
  })
})
