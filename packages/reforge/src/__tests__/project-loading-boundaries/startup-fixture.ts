import type { ActorDef, AuthorSceneDef, CurrentManifest } from '@type-pal/content'

const scene = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
} satisfies AuthorSceneDef

const actors: ActorDef[] = [
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

export const baseJsons = {
  actors,
  sceneIndex: {
    version: 1 as const,
    scenes: [{ id: 's001', name: '起始场景', path: 'content/scenes/s001.json' }],
  },
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

const contentPaths = {
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
}

export function manifest(over: Partial<CurrentManifest> = {}): CurrentManifest {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 23,
    minimumSaveVersion: 12,
    defaultEntryId: 'new-game',
    entryPoints: [
      {
        id: 'new-game',
        label: '开始游戏',
        scene: 's001',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    content: { ...contentPaths },
    assets: { catalog: 'assets/index.json', roles: {} },
    ...over,
  }
}

export function files(projectManifest = manifest()): Record<string, unknown> {
  const content = contentPaths
  const projectFiles: Record<string, unknown> = {
    'manifest.json': projectManifest,
    [content.actors]: baseJsons.actors,
    [`${content.scenes}index.json`]: {
      version: 1,
      scenes: [...new Set(projectManifest.entryPoints.map((entry) => entry.scene))].map((id) => ({
        id,
        name: `场景 ${id}`,
        path: `${content.scenes}${id}.json`,
      })),
    },
    [content.skills]: baseJsons.skills,
    [content.items]: baseJsons.items,
    [content.locale]: baseJsons.locale,
    [content.sprites]: baseJsons.sprites,
    [content.battleSprites]: baseJsons.battleSprites,
    [content.tilesets]: baseJsons.tilesets,
    [content.maps]: baseJsons.maps,
    [content.sharedScripts]: baseJsons.sharedScripts,
    [content.worldVariables]: baseJsons.worldVariables,
    [projectManifest.assets.catalog]: baseJsons.assetCatalog,
  }
  for (const entry of projectManifest.entryPoints)
    projectFiles[`${content.scenes}${entry.scene}.json`] = { ...scene, id: entry.scene }
  return projectFiles
}
