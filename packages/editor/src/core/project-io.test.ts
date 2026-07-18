import { type LoadedManifest, normalizeScriptLibrary, type SceneDef } from '@type-pal/content'
import {
  assembleProject,
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  loadProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { DeleteMapAssetCommand } from './commands.js'
import { createPlacedEntity } from './entity-placement.js'
import {
  diffFiles,
  serializeProject,
  serializeProjectWithMapCopies,
  toEditorState,
} from './project-io.js'

/**
 * L3 round-trip 钉真值:toEditorState(读入)→ serializeProject(落盘)应还原各 content JSON。
 * fixture 形状对齐 loader.test.ts + demo manifest(C0:characters → actors)。
 */

const manifest: LoadedManifest = {
  id: 'demo',
  name: '鬼界·民居(验证 demo)',
  contentVersion: 3,
  entryScene: 'guijie-minju',
  content: {
    scenes: 'content/scenes/',
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    items: 'content/items.json',
    locale: 'content/locale.json',
    sprites: 'content/sprites.json',
    battleFields: 'content/battle-fields.json',
    maps: 'content/maps/index.json',
    tilesets: 'content/tilesets.json',
  },
  assets: {
    catalog: 'assets/index.json',
    roles: {},
    legacy: {
      families: ['tileset', 'sprite', 'color-table'],
      root: 'assets',
      tilesets: 'tilesets',
      sprites: 'sprites',
      palettes: 'palettes',
    },
  },
  startWorld: {
    party: ['li-xiaoyao'],
    money: 0,
    learnedSkills: { 'li-xiaoyao': ['296'] },
    inventory: [{ itemId: '267', count: 1 }],
    seedStats: { 'li-xiaoyao': { hp: 100, mp: 30 } },
  },
}

const actorsJson = [
  {
    id: 'li-xiaoyao',
    name: 'name.li-xiaoyao',
    spriteId: 'li-xiaoyao',
    battler: {
      baseStats: {
        level: 1,
        hp: 150,
        maxHP: 150,
        mp: 100,
        maxMP: 100,
        attack: 33,
        defense: 32,
        magicAttack: 20,
        speed: 28,
        luck: 32,
      },
      initialEquipment: { weapon: '166' },
      initialMagic: ['296'],
    },
  },
  { id: 'youhun', name: 'name.youhun', spriteId: 'ghost' },
]
const scenesJson = [
  {
    id: 'guijie-minju',
    mapId: 'map-056',
    paletteId: 0,
    entry: { pos: { col: 90, row: 14, height: 0 }, facing: 'down' },
    entries: {
      'entry-stairs': {
        label: '楼梯入口',
        pos: { col: 84, row: 18, height: 1 },
        facing: 'left',
      },
    },
    entities: [
      {
        id: 'wandering-ghost',
        pos: { col: 92, row: 12, height: 0 },
        actor: 'youhun',
        facing: 'down',
        collide: true,
        interact: 'ghost-hearsay',
      },
    ],
    dialogues: [{ id: 'ghost-hearsay', cues: [{ rows: [{ text: 'dlg.ghost.0' }] }] }],
  },
]
const skillsJson = {
  skills: [
    {
      id: '296',
      name: '气疗术',
      desc: 'x',
      cost: { mp: 6 },
      usableOutsideBattle: true,
      target: 'oneAlly',
      effects: [{ kind: 'healHp', amount: 75 }],
      animation: { effectSprite: 27 },
    },
  ],
  levelUp: { 'li-xiaoyao': [{ level: 7, skillId: '349' }] },
}
const itemsJson = [
  { id: '166', name: '木剑', desc: 'x', icon: 56, buyPrice: 50, sellPrice: 25, sellable: true },
]
const localeJson = { 'menu.status': '状态', 'name.li-xiaoyao': '李逍遥', 'dlg.ghost.0': '...' }
const spritesJson = [
  {
    id: 'ghost',
    spriteNum: 16,
    label: '游魂(占位)',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
  {
    id: 'li-xiaoyao',
    spriteNum: 2,
    label: '李逍遥(大世界)',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
]

const battleFieldsJson = [
  {
    id: 24,
    name: '客栈',
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  },
  { id: 22, screenWave: 5, magicEffect: { wind: 0, thunder: 0, water: 3, fire: -3, earth: 0 } },
]
const mapsJson = {
  version: 1 as const,
  maps: [{ id: 'map-056', name: '地图 56', path: 'content/maps/map-056.json' }],
}
const tilesetsJson = [
  {
    id: 'tileset-056',
    name: '瓦片集 56',
    category: 'builtin',
    path: 'tileset/56.rle',
  },
]
const assetCatalogJson = {
  version: 1 as const,
  assets: {
    'sound.pal.001': {
      kind: 'sound' as const,
      path: 'assets/migrated/sounds/001.wav',
      mediaType: 'audio/wav',
      bytes: 44,
      sha256: '0'.repeat(64),
      origin: { kind: 'legacy-migrated' as const, ref: 'SOUNDS.MKF#1' },
    },
  },
}
const JSONS = {
  actors: actorsJson,
  sceneIds: scenesJson.map((s) => s.id),
  entryScene: scenesJson[0],
  skills: skillsJson,
  items: itemsJson,
  locale: localeJson,
  sprites: spritesJson,
  battleFields: battleFieldsJson,
  maps: mapsJson,
  tilesets: tilesetsJson,
  assetCatalog: assetCatalogJson,
}
const SCENES = scenesJson as never[]

test('round-trip:toEditorState → serializeProject 还原各 content JSON', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const out = serializeProject(state)

  // M2a-2:scenes 走 per-scene 目录(index + 单场景文件)
  expect(out['content/scenes/index.json']).toEqual(['guijie-minju'])
  expect(out['content/scenes/guijie-minju.json']).toEqual(scenesJson[0])
  expect(out['content/actors.json']).toEqual(actorsJson)
  expect(out['content/items.json']).toEqual(itemsJson)
  expect(out['content/locale.json']).toEqual(localeJson)
  expect(out['content/sprites.json']).toEqual(spritesJson)
  // skills.json 是 { skills, levelUp } 包一层
  expect(out['content/skills.json']).toEqual({
    skills: skillsJson.skills,
    levelUp: skillsJson.levelUp,
  })
  // D24:战场表 round-trip(数组直传保序)
  expect(out['content/battle-fields.json']).toEqual(battleFieldsJson)

  // manifest.json 整体还原(startWorld 含 seedStats)
  expect(out['manifest.json']).toEqual(manifest)
})

test('X7 缺省入口契约:未编辑即保存不物化 entryPoints，也不添加 startWorld 可选字段', () => {
  const state = toEditorState(assembleProject(manifest, JSONS), SCENES)
  const saved = serializeProject(state)['manifest.json'] as LoadedManifest

  expect(Object.hasOwn(manifest, 'entryPoints')).toBe(false)
  expect(Object.hasOwn(saved, 'entryPoints')).toBe(false)
  expect(Object.hasOwn(saved.startWorld, 'seedStats')).toBe(true)

  const withoutSeedStats: LoadedManifest = {
    ...manifest,
    startWorld: { party: ['li-xiaoyao'], money: 0, learnedSkills: {}, inventory: [] },
  }
  const savedWithoutSeedStats = serializeProject(
    toEditorState(assembleProject(withoutSeedStats, JSONS), SCENES),
  )['manifest.json'] as LoadedManifest
  expect(Object.hasOwn(savedWithoutSeedStats.startWorld, 'seedStats')).toBe(false)
})

test('X7 manifest 未知字段与入口继承字段缺席可逐层 round-trip', () => {
  const futureManifest = {
    ...manifest,
    futureTopLevel: { enabled: true },
    assets: { ...manifest.assets, futureAssetMeta: { format: 4 } },
    entryPoints: [{ id: 'new-game', label: '新的故事', scene: 'guijie-minju' }],
  } as LoadedManifest & {
    futureTopLevel: { enabled: boolean }
    assets: LoadedManifest['assets'] & { futureAssetMeta: { format: number } }
  }
  const saved = serializeProject(toEditorState(assembleProject(futureManifest, JSONS), SCENES))[
    'manifest.json'
  ] as typeof futureManifest

  expect(saved.futureTopLevel).toEqual({ enabled: true })
  expect(saved.assets.futureAssetMeta).toEqual({ format: 4 })
  expect(Object.hasOwn(saved.entryPoints![0]!, 'startWorld')).toBe(false)
  expect(Object.hasOwn(saved.entryPoints![0]!, 'introVideo')).toBe(false)
})

test('X7 serializeProject 对损坏的显式入口 fail-loud', () => {
  const state = toEditorState(assembleProject(manifest, JSONS), SCENES)
  const broken: LoadedManifest = {
    ...state.manifest,
    entryPoints: [{ id: 'missing-scene', label: '坏入口', scene: 'does-not-exist' }],
  }
  expect(() => serializeProject({ ...state, manifest: broken })).toThrow(/入口点.*指向不存在的场景/)
})

test('W4-1 命名落点保存重开保持稳定 id、label、完整 GridPos 与朝向', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const saved = serializeProject(state)
  const savedScene = saved['content/scenes/guijie-minju.json'] as SceneDef
  const reopened = toEditorState(assembleProject(manifest, { ...JSONS, entryScene: savedScene }), [
    savedScene,
  ])

  expect(reopened.scenes[0]!.entries).toEqual({
    'entry-stairs': {
      label: '楼梯入口',
      pos: { col: 84, row: 18, height: 1 },
      facing: 'left',
    },
  })
})

test('ED-4A actor/sprite/touch zone/interact zone 保存重开保持引用与空脚本源', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const placements = [
    createPlacedEntity(
      'actor-placed',
      { col: 1, row: 2, height: 0 },
      {
        mode: 'actor',
        actorId: 'li-xiaoyao',
      },
    ),
    createPlacedEntity(
      'sprite-placed',
      { col: 3, row: 4, height: 0 },
      {
        mode: 'sprite',
        spriteId: 'ghost',
      },
    ),
    createPlacedEntity(
      'touch-placed',
      { col: 5, row: 6, height: 0 },
      {
        mode: 'touch-zone',
        range: 0,
      },
    ),
    createPlacedEntity(
      'interact-placed',
      { col: 7, row: 8, height: 0 },
      {
        mode: 'interact-zone',
        range: 2,
      },
    ),
  ]
  const edited = {
    ...state,
    scenes: state.scenes.map((scene) =>
      scene.id === 'guijie-minju' ? { ...scene, entities: placements } : scene,
    ),
  }
  const saved = serializeProject(edited)
  const savedScene = saved['content/scenes/guijie-minju.json'] as SceneDef
  const reopened = toEditorState(assembleProject(manifest, { ...JSONS, entryScene: savedScene }), [
    savedScene,
  ])

  expect(reopened.scenes[0]!.entities).toEqual(placements)
  expect(reopened.scenes[0]!.entities[2]!.pages?.[0]?.trigger).toEqual({
    on: 'touch',
    range: 0,
    stages: [{ body: [] }],
  })
  expect(reopened.scenes[0]!.entities[3]!.pages?.[0]?.trigger).toEqual({
    on: 'interact',
    range: 2,
    stages: [{ body: [] }],
  })
})

test('ProjectMapV2 round-trip 使用共享确定性格式化器', () => {
  const map = buildBlankProjectMap(2, 2, 'tileset-056')
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES, { 'map-056': map })
  const out = serializeProject(state)

  expect(out['content/maps/index.json']).toEqual(mapsJson)
  expect(typeof out['content/maps/map-056.json']).toBe('string')
  expect(JSON.parse(out['content/maps/map-056.json'] as string)).toEqual(map)
})

test('未加载 v3 地图保存时按原文本 copy-through，authoring 不解析也不改写', async () => {
  const raw =
    '{"version":3,"width":1,"height":1,"tilesetId":"tileset-056","layers":[],"collision":[],"authoring":{"version":1,"stampPlacements":[{"id":"raw-placement"}]}}'
  const reads: string[] = []
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const files = await serializeProjectWithMapCopies(state, {
    readText: async (path: string) => {
      reads.push(path)
      return raw
    },
    readJson: async () => {
      throw new Error('copy-through 不应 parse JSON')
    },
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (path: string) => path,
  })

  expect(reads).toEqual(['content/maps/map-056.json'])
  expect(files['content/maps/map-056.json']).toBe(raw)
})

test('M3 scripts 目录 round-trip:index + chunk 路径与内容原样保留', () => {
  const withScripts: LoadedManifest = {
    ...manifest,
    content: { ...manifest.content, scripts: 'content/scripts/' },
  }
  const scriptId = 'scene/guijie-minju/on-enter/0'
  const libraryId = 'shared/user/demo-a1b2c3d4'
  const rawIndex = {
    version: 1 as const,
    shards: { shared: 1, global: {} },
    chunks: {
      'scene/guijie-minju': { path: 'chunks/scene/guijie-minju.json', bytes: 0 },
      'shared/c00': { path: 'chunks/shared/c00.json', bytes: 0 },
    },
    library: { [libraryId]: { name: '演示', self: 'none' as const } },
  }
  const rawChunk = {
    version: 1 as const,
    id: 'scene/guijie-minju',
    scripts: { [scriptId]: [{ kind: 'playSound' as const, asset: 'sound.pal.001' }] },
  }
  const rawLibraryChunk = {
    version: 1 as const,
    id: 'shared/c00',
    scripts: { [libraryId]: [{ kind: 'wait' as const, ms: 10 }] },
  }
  const { index: scriptIndex, chunks } = normalizeScriptLibrary(rawIndex, {
    'scene/guijie-minju': rawChunk,
    'shared/c00': rawLibraryChunk,
  })
  const chunk = chunks['scene/guijie-minju']!
  const project = assembleProject(withScripts, { ...JSONS, scripts: scriptIndex })
  const state = toEditorState(project, SCENES, {}, chunks)
  const out = serializeProject(state)
  expect(out['content/scripts/index.json']).toEqual(scriptIndex)
  expect((out['content/scripts/index.json'] as typeof scriptIndex).library).toEqual(
    scriptIndex.library,
  )
  expect(out['content/scripts/chunks/scene/guijie-minju.json']).toEqual(chunk)
  expect(out['content/scripts/chunks/shared/c00.json']).toEqual(chunks['shared/c00'])
})

test('N6 保存门禁:作者脚本孤儿 ref fail-loud', () => {
  const withScripts: LoadedManifest = {
    ...manifest,
    content: { ...manifest.content, scripts: 'content/scripts/' },
  }
  const id = 'shared/user/demo-a1b2c3d4'
  const rawIndex = {
    version: 1 as const,
    shards: { shared: 1, global: {} },
    chunks: { 'shared/c00': { path: 'chunks/shared/c00.json', bytes: 0 } },
    library: { [id]: { name: '演示', self: 'none' as const } },
  }
  const rawChunk = {
    version: 1 as const,
    id: 'shared/c00',
    scripts: {
      [id]: [
        { kind: 'callScript' as const, ref: { chunk: 'shared/c00', id: 'shared/user/missing' } },
      ],
    },
  }
  const { index, chunks } = normalizeScriptLibrary(rawIndex, { 'shared/c00': rawChunk })
  const state = toEditorState(
    assembleProject(withScripts, { ...JSONS, scripts: index }),
    SCENES,
    {},
    chunks,
  )
  expect(() => serializeProject(state)).toThrow(/孤儿 ref/)
})

test('ProjectMapV2 serialize → loadProjectMap 重开闭环', async () => {
  const ownManifest: LoadedManifest = {
    ...manifest,
    contentVersion: 3,
    content: { ...manifest.content, maps: 'content/maps/index.json' },
  }
  const rel = 'content/maps/guijie-minju.json'
  const ownScene = { ...(scenesJson[0] as SceneDef), mapId: 'guijie-minju' }
  const mapIndex = {
    version: 1 as const,
    maps: [{ id: 'guijie-minju', name: '鬼界民居', path: rel }],
  }
  const project = assembleProject(ownManifest, {
    ...JSONS,
    entryScene: ownScene,
    maps: mapIndex,
  })
  let projectMap = buildBlankProjectMap(2, 2, 'tileset-056')
  projectMap = insertProjectMapLayer(
    projectMap,
    buildProjectMapLayer(projectMap, 'objects', '物件', 'height'),
  )
  projectMap = paintProjectMapTiles(projectMap, [
    { layerId: 'floor', row: 0, col: 0, tileId: 2, height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 7, height: 3 },
  ])
  projectMap = paintProjectMapCollision(projectMap, [{ row: 1, col: 0, value: 5 }])
  const files = serializeProject(toEditorState(project, [ownScene], { 'guijie-minju': projectMap }))
  const source = {
    readText: async (path: string) =>
      typeof files[path] === 'string' ? (files[path] as string) : JSON.stringify(files[path]),
    readJson: async <T>(path: string) =>
      (typeof files[path] === 'string' ? JSON.parse(files[path] as string) : files[path]) as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (path: string) => path,
  }
  expect(await loadProjectMap({ ...project.assetBase, io: source }, rel)).toEqual(projectMap)
})

test('W7G ProjectMapV3 保存重开保留 authoring，删除最后一组同图降回 v2', async () => {
  let base = buildBlankProjectMap(2, 1, 'tileset-056')
  base = paintProjectMapTiles(base, [{ layerId: 'floor', row: 0, col: 0, tileId: 9, height: 0 }])
  const v3 = withProjectMapStampPlacements(base, [
    {
      id: 'placement-1',
      sourceStampId: 'tree',
      sourceStampName: '树',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    },
  ])
  const project = assembleProject(manifest, JSONS)
  const saved = serializeProject(toEditorState(project, SCENES, { 'map-056': v3 }))
  const text = saved['content/maps/map-056.json'] as string
  expect(JSON.parse(text)).toMatchObject({ version: 3, authoring: { version: 1 } })
  const source = {
    readText: async () => text,
    readJson: async <T>() => JSON.parse(text) as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (path: string) => path,
  }
  await expect(
    loadProjectMap({ ...project.assetBase, io: source }, 'content/maps/map-056.json'),
  ).resolves.toEqual(v3)

  const v2 = withProjectMapStampPlacements(v3, [])
  const downgraded = serializeProject(toEditorState(project, SCENES, { 'map-056': v2 }))
  expect(JSON.parse(downgraded['content/maps/map-056.json'] as string)).toEqual(v2)
  expect('authoring' in v2).toBe(false)
})

test('W7G stamps 表使用共享 formatter；旧 manifest 零表不物化，非空未登记 fail-loud', () => {
  const template = {
    id: 'tree',
    name: '树',
    tilesetId: 'tileset-056',
    origin: 'authored' as const,
    layerSlots: [{ id: 'ground', name: '地面', depthMode: 'flat' as const }],
    visual: [{ layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 9, height: 0 }],
    collision: [{ offset: { dRow: 0, du: 0 }, value: 0 }],
  }
  const project = assembleProject(manifest, JSONS)
  const oldState = toEditorState(project, SCENES)
  expect(serializeProject(oldState)['content/stamps.json']).toBeUndefined()
  expect(() => serializeProject({ ...oldState, stamps: [template] })).toThrow(
    'manifest.content.stamps',
  )

  const withStamps: LoadedManifest = {
    ...manifest,
    content: { ...manifest.content, stamps: 'content/stamps.json' },
  }
  expect(() => toEditorState(assembleProject(withStamps, JSONS), SCENES)).toThrow(
    '调用方未加载图章模板表',
  )
  const state = toEditorState(assembleProject(withStamps, JSONS), SCENES, {}, {}, [template])
  const first = serializeProject(state)['content/stamps.json'] as string
  expect(JSON.parse(first)).toEqual([template])
  expect(serializeProject(state)['content/stamps.json']).toBe(first)
})

test('toEditorState:by-id Record → 数组(Object.values 保序)', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)

  // actors/skills/items/sprites 都是 by-id Record,还原成数组;顺序 = 原数组序
  expect(state.actors.map((a) => a.id)).toEqual(['li-xiaoyao', 'youhun'])
  expect(state.skills.map((s) => s.id)).toEqual(['296'])
  expect(state.items.map((i) => i.id)).toEqual(['166'])
  expect(state.sprites.map((s) => s.id)).toEqual(['ghost', 'li-xiaoyao'])
  // scenes(编辑器全量注入)/locale 直传
  expect(state.scenes).toBe(SCENES)
  expect(state.locale).toBe(project.locale)
  // manifest 透传(含 startWorld)
  expect(state.manifest).toBe(project.manifest)
})

test('toEditorState:丢弃运行期派生物(entryScene/assetBase)', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  // EditorState 是 ContentBundle + manifest;不含 entryScene/assetBase 字段
  expect((state as unknown as Record<string, unknown>).entryScene).toBeUndefined()
  expect((state as unknown as Record<string, unknown>).assetBase).toBeUndefined()
})

test('serializeProject:manifest.content 缺 sprites → 不产出 sprites 文件', () => {
  const noSprites = { ...manifest, content: { ...manifest.content } }
  delete noSprites.content.sprites
  const project = assembleProject(manifest, { ...JSONS, sprites: undefined })
  // 用「无 sprites 的 manifest」替换 state.manifest(模拟工程本身没 sprites 键)
  const state = { ...toEditorState(project, SCENES), manifest: noSprites }
  const out = serializeProject(state)

  expect(out['content/sprites.json']).toBeUndefined()
  // 其余文件照常产出
  expect(out['content/scenes/guijie-minju.json']).toEqual(scenesJson[0])
  expect(out['manifest.json']).toEqual(noSprites)
})

test('serializeProject:返回值为纯 JSON 值(可 JSON.stringify,无 undefined/函数)', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const out = serializeProject(state)
  // 整体可 stringify(落盘前提)
  expect(() => JSON.stringify(out)).not.toThrow()
  // 路径键 = 表域文件 + per-scene(index + 每场景) + manifest.json
  expect(Object.keys(out).sort()).toEqual(
    [
      'content/actors.json',
      'content/battle-fields.json',
      'content/items.json',
      'content/locale.json',
      'content/maps/index.json',
      'content/scenes/index.json',
      'content/scenes/guijie-minju.json',
      'content/skills.json',
      'content/sprites.json',
      'content/tilesets.json',
      'assets/index.json',
      'manifest.json',
    ].sort(),
  )
})

test('A7 资源注册表与待写二进制 round-trip，不再产出 content/music.json', () => {
  const project = assembleProject(manifest, JSONS)
  const state = toEditorState(project, SCENES)
  const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer
  const assetCatalog = {
    version: 1 as const,
    assets: {
      'music.demo.theme': {
        kind: 'music' as const,
        path: 'assets/authored/theme.mid',
        mediaType: 'audio/midi',
        bytes: 4,
        sha256: 'a'.repeat(64),
        label: '主题曲',
        origin: { kind: 'authored' as const },
      },
      'soundfont.demo': {
        kind: 'soundfont' as const,
        path: 'assets/authored/demo.sf2',
        mediaType: 'audio/x-soundfont',
        bytes: 0,
        sha256: 'b'.repeat(64),
        label: '测试音色库',
        origin: { kind: 'authored' as const },
      },
    },
  }
  const out = serializeProject({
    ...state,
    manifest: {
      ...state.manifest,
      assets: {
        ...state.manifest.assets,
        roles: {
          'audio.midiSoundfont': 'soundfont.demo',
          'audio.defaultBattleMusic': 'music.demo.theme',
          'audio.bossVictoryMusic': 'music.demo.theme',
          'audio.normalVictoryMusic': 'music.demo.theme',
          'audio.openingMenuMusic': 'music.demo.theme',
        },
      },
    },
    assetCatalog,
    assetBlobs: { 'assets/authored/theme.mid': bytes },
  })
  expect(out['assets/index.json']).toEqual(assetCatalog)
  expect(out['assets/authored/theme.mid']).toBe(bytes)
  expect(out['content/music.json']).toBeUndefined()
})

test('B10 毒表:manifest 声明 poisons → round-trip 保原文件序(非升序);未声明不产出', () => {
  const withPoisons = {
    ...manifest,
    content: { ...manifest.content, poisons: 'content/poisons.json' },
  }
  // ⚠ 保序是命脉:pal 的 poisons.json 原序 551..560,137,561(非升序)。
  // 经 poisonsById(Record<number,…>)转数组会被 JS 数值键升序重排(137 跳最前)→ 首存无谓 diff。
  // loader 暴露原序数组 project.poisons,toEditorState 必须用它。
  const poisonsJson = [
    { id: 551, name: '赤毒', curability: 'common', color: 16, playerTicks: [{ hpDelta: -7 }] },
    {
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: 0,
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    },
    { id: 556, name: '鹤顶红', curability: 'severe', color: 160, lethalWith: 557, counters: 558 },
  ]
  const project = assembleProject(withPoisons, { ...JSONS, poisons: poisonsJson })
  const state = toEditorState(project, SCENES)
  expect(state.poisons?.map((p) => p.id)).toEqual([551, 137, 556]) // 原序,非 [137,551,556]
  const out = serializeProject(state)
  expect(out['content/poisons.json']).toEqual(poisonsJson)

  // 未声明(原 manifest):不产出 poisons 文件;toEditorState 缺省空数组
  const plain = toEditorState(assembleProject(manifest, JSONS), SCENES)
  expect(plain.poisons).toEqual([])
  expect(serializeProject(plain)['content/poisons.json']).toBeUndefined()
})

test('W6 氛围表:manifest 声明 ambiences → round-trip;未声明不产出', () => {
  const withAmb = {
    ...manifest,
    content: { ...manifest.content, ambiences: 'content/ambiences.json' },
  }
  const ambJson = [
    { id: 'day', name: '白天', tint: [255, 255, 255] },
    { id: 'night', name: '夜晚', tint: [117, 229, 255] },
  ]
  const project = assembleProject(withAmb, { ...JSONS, ambiences: ambJson })
  const state = toEditorState(project, SCENES)
  expect(state.ambiences?.map((a) => a.id)).toEqual(['day', 'night'])
  expect(serializeProject(state)['content/ambiences.json']).toEqual(ambJson)

  const plain = toEditorState(assembleProject(manifest, JSONS), SCENES)
  expect(plain.ambiences).toEqual([])
  expect(serializeProject(plain)['content/ambiences.json']).toBeUndefined()
})

describe('diffFiles(增量-diff)', () => {
  test('只挑内容变了的写;快照有、现无的删', () => {
    const prev = new Map<string, string>([
      ['a.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`],
      ['b.json', `${JSON.stringify({ v: 2 }, null, 2)}\n`],
      ['old.json', `${JSON.stringify({ v: 3 }, null, 2)}\n`],
    ])
    const next = { 'a.json': { v: 1 }, 'b.json': { v: 99 }, 'c.json': { v: 4 } }
    const { write, remove } = diffFiles(prev, next)
    expect(write.sort()).toEqual(['b.json', 'c.json']) // a 未变跳过;b 变;c 新
    expect(remove).toEqual(['old.json']) // old 消失 → 删
  })

  test('全未变 → 写空、删空(打开未改立即存 = 零写)', () => {
    const files = { 'a.json': { v: 1 } }
    const snap = new Map([['a.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`]])
    expect(diffFiles(snap, files)).toEqual({ write: [], remove: [] })
  })

  test('删除未引用地图会改写 index，并把地图 JSON 列入 remove', () => {
    const ownManifest: LoadedManifest = {
      ...manifest,
      contentVersion: 3,
      content: { ...manifest.content, maps: 'content/maps/index.json' },
    }
    const scene: SceneDef = { ...(scenesJson[0] as SceneDef), mapId: 'used' }
    const mapIndex = {
      version: 1 as const,
      maps: [
        { id: 'used', name: '使用中', path: 'content/maps/used.json' },
        { id: 'unused', name: '未引用', path: 'content/maps/unused.json' },
      ],
    }
    const project = assembleProject(ownManifest, {
      ...JSONS,
      entryScene: scene,
      maps: mapIndex,
    })
    const state = toEditorState(project, [scene], {
      used: buildBlankProjectMap(2, 2, 'used'),
      unused: buildBlankProjectMap(2, 2, 'unused'),
    })
    const before = serializeProject(state)
    const snapshot = new Map(
      Object.entries(before).map(([path, value]) => [
        path,
        typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
      ]),
    )
    const after = serializeProject(new DeleteMapAssetCommand('unused').apply(state))
    const diff = diffFiles(snapshot, after)
    expect(diff.write).toContain('content/maps/index.json')
    expect(diff.remove).toContain('content/maps/unused.json')
    expect(diff.remove).not.toContain('content/maps/used.json')
  })

  test('地图路径与其他工程输出碰撞时 fail-loud，不静默覆盖', () => {
    const ownManifest: LoadedManifest = {
      ...manifest,
      contentVersion: 3,
      content: { ...manifest.content, maps: 'content/maps/index.json' },
    }
    const scene: SceneDef = { ...(scenesJson[0] as SceneDef), mapId: 'bad' }
    const project = assembleProject(ownManifest, {
      ...JSONS,
      entryScene: scene,
      maps: {
        version: 1,
        maps: [
          {
            id: 'bad',
            name: '错误路径',
            path: 'content/scenes/guijie-minju.json',
          },
        ],
      },
    })
    const state = toEditorState(project, [scene], {
      bad: buildBlankProjectMap(2, 2, 'starter'),
    })
    expect(() => serializeProject(state)).toThrow('输出路径冲突')
  })
})

test('W7B tileset round-trip:注册表入 state,serializeProject 产出 tilesets.json + 上传字节文件', () => {
  const withTilesets = {
    ...manifest,
    content: { ...manifest.content, tilesets: 'content/tilesets.json' },
  } as typeof manifest
  const reg = [
    { id: 'grass', name: '草地', category: 'outdoor', path: 'assets/tilesets/grass.rle' },
  ]
  const project = { ...assembleProject(withTilesets, JSONS), tilesets: reg }
  const state = toEditorState(project, SCENES)
  expect(state.tilesets).toEqual(reg)
  const buf = new ArrayBuffer(8)
  const out = serializeProject({ ...state, tilesetBlobs: { 'assets/tilesets/grass.rle': buf } })
  expect(out['content/tilesets.json']).toEqual(reg)
  expect(out['assets/tilesets/grass.rle']).toBe(buf) // ArrayBuffer 原样入文件集(writeFile 走 Blob)
})
