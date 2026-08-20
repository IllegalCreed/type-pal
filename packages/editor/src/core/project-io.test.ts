import type { CurrentManifest } from '@type-pal/content'
import { assembleCurrentProject } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { serializeProject, toEditorState } from './project-io.js'

const scene = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
}

const manifest: CurrentManifest = {
  id: 'demo',
  name: 'Demo',
  contentVersion: 16,
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
    worldVariables: 'content/world-variables.json',
  },
  assets: { catalog: 'assets/index.json', roles: {} },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
  sharedScripts: {},
  worldVariables: {},
  assetCatalog: { version: 1, assets: {} },
}

describe('current editor project IO', () => {
  test('projects a current loaded project into one current editor state', () => {
    const loaded = assembleCurrentProject(manifest, jsons)
    const state = toEditorState(loaded, [loaded.authorContent.entryScene])

    expect(state.manifest.contentVersion).toBe(16)
    expect(state.scenes).toEqual([scene])
    expect(state.scriptIndex).toBeUndefined()
    expect(state.scriptChunks).toEqual({})
    expect(state.worldVariables).toEqual({})
  })

  test('serializes only the current manifest and current author content paths', () => {
    const loaded = assembleCurrentProject(manifest, jsons)
    const state = toEditorState(loaded, [loaded.authorContent.entryScene])
    const files = serializeProject(state, {
      mapCopies: { 'content/maps/map-001.json': '{"version":4}' },
    })

    expect(files['manifest.json']).toBe(manifest)
    expect(files['content/scenes/index.json']).toEqual(['s001'])
    expect(files['content/shared-scripts.json']).toEqual({})
    expect(files['content/world-variables.json']).toEqual({})
    expect(Object.keys(files).some((path) => path.includes('migration'))).toBe(false)
    expect(Object.keys(files).some((path) => path.includes('scripts/index'))).toBe(false)
  })
})
