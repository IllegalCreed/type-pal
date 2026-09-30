import type { CurrentManifest, EntryPoint, ItemData, Locale } from '@type-pal/content'
import type { EditorState } from '../../core/edit-session.js'

/** Wave-L 专用最小合法 EditorState 夹具；只满足类型，不带任何业务默认值。 */
export function waveLManifest(): CurrentManifest {
  const entry: EntryPoint = {
    id: 'main',
    label: '主要入口',
    scene: 'scene-a',
    startWorld: { party: [], money: 0, inventory: [] },
  }
  return {
    id: 'wave-l',
    name: 'Wave-L 测试项目',
    contentVersion: 20,
    minimumSaveVersion: 8,
    defaultEntryId: 'main',
    entryPoints: [entry],
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
  }
}

export function waveLEditorState(
  overrides: Partial<EditorState> & Pick<EditorState, 'maps'>,
): EditorState {
  const base: Omit<EditorState, 'maps'> = {
    manifest: waveLManifest(),
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [] as ItemData[],
    locale: {} as Locale,
    sprites: [],
    battleSprites: [],
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
  }
  return { ...base, ...overrides }
}
