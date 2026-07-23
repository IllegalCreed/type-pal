import {
  type AssetRecordV1,
  type ItemData,
  type LoadedManifest,
  normalizeScriptLibrary,
  type SceneDef,
} from '@type-pal/content'
import {
  assembleProject,
  buildBlankProjectMap,
  buildProjectMapLayer,
  compressGzip,
  insertProjectMapLayer,
  loadProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { binarySnapshotSignature, sha256Hex } from './binary-signature.js'
import {
  AddItemCommand,
  CompositeCommand,
  DeleteItemCommand,
  DeleteMapAssetCommand,
  UpdateItemCommand,
  UpsertAssetCommand,
} from './commands.js'
import { EditSession } from './edit-session.js'
import { createPlacedEntity } from './entity-placement.js'
import { cloneItemForAuthoring, createBlankItem } from './item-authoring.js'
import {
  diffFiles,
  preflightProjectWriteSet,
  serializeProject,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { buildSeedAssets } from './seed-assets.js'

const seedAssets = await buildSeedAssets()
const canonicalTilesetBytes = seedAssets.tilesetRle
const canonicalSpriteBytes = seedAssets.spriteRle
const canonicalBattleSpriteBytes = seedAssets.battleSpriteRle

/**
 * L3 round-trip 钉真值:toEditorState(读入)→ serializeProject(落盘)应还原各 content JSON。
 * fixture 形状对齐 loader.test.ts + demo manifest(C0:characters → actors)。
 */

const manifest: LoadedManifest = {
  id: 'demo',
  name: '鬼界·民居(验证 demo)',
  contentVersion: 4,
  entryScene: 'guijie-minju',
  content: {
    scenes: 'content/scenes/',
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    items: 'content/items.json',
    locale: 'content/locale.json',
    sprites: 'content/sprites.json',
    battleSprites: 'content/battle-sprites.json',
    battleFields: 'content/battle-fields.json',
    maps: 'content/maps/index.json',
    tilesets: 'content/tilesets.json',
  },
  assets: {
    catalog: 'assets/index.json',
    roles: {},
    legacy: {
      families: ['color-table'],
      root: 'assets',
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
      battleSprite: 'battle-sprite.test.hero',
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
  { id: '166', name: '木剑', desc: 'x', buyPrice: 50, sellPrice: 25, sellable: true },
]
const localeJson = { 'menu.status': '状态', 'name.li-xiaoyao': '李逍遥', 'dlg.ghost.0': '...' }
const spritesJson = [
  {
    id: 'ghost',
    asset: 'sprite.test.world',
    label: '游魂(占位)',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
  {
    id: 'li-xiaoyao',
    asset: 'sprite.test.world',
    label: '李逍遥(大世界)',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
]
const battleSpritesJson = [
  {
    id: 'battle-sprite.test.hero',
    label: '测试主角',
    asset: 'battle-sprite.test.hero',
    profile: {
      kind: 'player-fighter' as const,
      frames: {
        idle: 0,
        dying: 1,
        dead: 2,
        defend: 3,
        hurt: 4,
        preMagic: 5,
        magic: 6,
        attackWindup: 7,
        attackRush: 8,
        attackStrike: 9,
      },
      castEffectBase: 0,
      attackEffectBase: 0,
    },
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
    asset: 'tileset.pal.056',
  },
]
const assetCatalogJson = {
  version: 1 as const,
  assets: {
    'tileset.pal.056': {
      kind: 'tileset' as const,
      path: 'assets/migrated/tilesets/056.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: '1'.repeat(64),
      origin: { kind: 'legacy-migrated' as const, ref: 'tileset/56.rle' },
    },
    'sprite.test.world': {
      kind: 'sprite' as const,
      path: 'assets/generated/sprites/world.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: '2'.repeat(64),
      origin: { kind: 'generated' as const },
    },
    'battle-sprite.test.hero': {
      kind: 'battle-sprite' as const,
      path: 'assets/generated/battle-sprites/hero.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: '3'.repeat(64),
      origin: { kind: 'generated' as const },
    },
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
  battleSprites: battleSpritesJson,
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
  expect(out['content/battle-sprites.json']).toEqual(battleSpritesJson)
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

test('C8 迁移诊断 sidecar 保存重开；能力补齐后自动消解旧诊断', () => {
  const withDiagnostics: LoadedManifest = {
    ...manifest,
    content: {
      ...manifest.content,
      migrationDiagnostics: 'content/migration-diagnostics.json',
    },
  }
  const diagnostic = {
    version: 1 as const,
    diagnostics: [
      {
        id: 'item-use:166',
        severity: 'warn' as const,
        target: {
          domain: 'item' as const,
          objectId: '166',
          capability: 'use' as const,
          label: '木剑',
        },
        category: 'manual-review' as const,
        reason: '待人工迁移',
        source: { kind: 'legacy-script' as const, label: 'L_100', address: 100 },
      },
    ],
  }
  const state = toEditorState(
    assembleProject(withDiagnostics, { ...JSONS, migrationDiagnostics: diagnostic }),
    SCENES,
  )
  const out = serializeProject(state)
  expect(out['content/migration-diagnostics.json']).toEqual(diagnostic)

  const completed = serializeProject({
    ...state,
    items: state.items.map((item) =>
      item.id === '166'
        ? {
            ...item,
            use: {
              target: 'oneAlly' as const,
              consuming: true,
              effects: [{ kind: 'healHp' as const, amount: 1 }],
            },
          }
        : item,
    ),
  })
  expect(completed['content/migration-diagnostics.json']).toEqual({ version: 1, diagnostics: [] })
})

test('ED-5I 物品 CRUD、图标与结构化用途保存关闭重开保持资产闭包', () => {
  const session = new EditSession(toEditorState(assembleProject(manifest, JSONS), SCENES))
  const authored: ItemData = {
    ...createBlankItem(session.getState().items),
    name: '作者物品',
    desc: ['用于保存重开验收'],
    equip: { slot: 'accessory', equipableBy: ['li-xiaoyao'], effects: [] },
    use: {
      target: 'scene',
      consuming: false,
      menuAfterUse: 'close',
      effects: [
        {
          kind: 'runSceneHook',
          hook: 'onTeleport',
          unavailableMessage: '此处无法使用。',
        },
      ],
    },
  }
  session.dispatch(new AddItemCommand(authored))
  const copy = cloneItemForAuthoring(authored, session.getState().items)
  session.dispatch(new AddItemCommand(copy))
  session.dispatch(new UpdateItemCommand(copy.id, { name: '临时副本' }))
  session.dispatch(new DeleteItemCommand(copy.id))
  expect(session.undo()).toBe(true)
  expect(session.getState().items.find((item) => item.id === copy.id)?.name).toBe('临时副本')
  expect(session.redo()).toBe(true)

  const bytes = new Uint8Array([137, 80, 78, 71]).buffer
  const icon: AssetRecordV1 = {
    kind: 'item-icon',
    path: 'assets/authored/item-icons/authoring-roundtrip.png',
    mediaType: 'image/png',
    bytes: bytes.byteLength,
    sha256: 'f'.repeat(64),
    label: '作者物品图标',
    origin: { kind: 'authored', ref: 'authoring-roundtrip.png' },
  }
  session.dispatch(
    new CompositeCommand('导入并绑定作者物品图标', [
      new UpsertAssetCommand('item-icon.authoring-roundtrip', icon, bytes),
      new UpdateItemCommand(authored.id, {
        icon: 'item-icon.authoring-roundtrip',
        buyPrice: 88,
      }),
    ]),
  )

  const saved = serializeProject(session.getState())
  expect(saved[icon.path]).toEqual(bytes)
  const reopened = toEditorState(
    assembleProject(saved['manifest.json'] as LoadedManifest, {
      ...JSONS,
      items: saved['content/items.json'],
      assetCatalog: saved['assets/index.json'],
    }),
    SCENES,
  )

  expect(reopened.items.find((item) => item.id === authored.id)).toEqual({
    ...authored,
    icon: 'item-icon.authoring-roundtrip',
    buyPrice: 88,
  })
  expect(reopened.items.some((item) => item.id === copy.id)).toBe(false)
  expect(reopened.assetCatalog.assets['item-icon.authoring-roundtrip']).toEqual(icon)
})

test('ED-5I 保存边界拒绝非法投掷效果，不生成无法重开的工程', () => {
  const current = toEditorState(assembleProject(manifest, JSONS), SCENES)
  current.items.push({
    id: 'bad-throw',
    name: '坏投掷物',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    throw: { effects: [{ kind: 'healHp', amount: 10 }] },
  } as never)

  expect(() => serializeProject(current)).toThrow(/保存前物品数据校验失败.*不可用于投掷上下文/)
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

test('HTTP 首次保存物化全部 catalog 二进制，pending 优先且 hash 不符 fail-loud', async () => {
  const sourceTile = canonicalTilesetBytes.slice(0)
  const sourceSprite = canonicalSpriteBytes.slice(0)
  const sourceBattleSprite = canonicalBattleSpriteBytes.slice(0)
  const pendingSound = new Uint8Array([1, 2, 3]).buffer
  const state = toEditorState(assembleProject(manifest, JSONS), SCENES)
  const tileRecord = {
    ...assetCatalogJson.assets['tileset.pal.056'],
    bytes: sourceTile.byteLength,
    sha256: await sha256Hex(sourceTile),
  }
  const spriteRecord = {
    ...assetCatalogJson.assets['sprite.test.world'],
    bytes: sourceSprite.byteLength,
    sha256: await sha256Hex(sourceSprite),
  }
  const soundRecord = {
    kind: 'sound' as const,
    path: 'assets/authored/sounds/pending.wav',
    mediaType: 'audio/wav',
    bytes: pendingSound.byteLength,
    sha256: await sha256Hex(pendingSound),
    origin: { kind: 'authored' as const },
  }
  const battleSpriteRecord = {
    ...assetCatalogJson.assets['battle-sprite.test.hero'],
    bytes: sourceBattleSprite.byteLength,
    sha256: await sha256Hex(sourceBattleSprite),
  }
  const reads: string[] = []
  const source = {
    readText: async () => '{}',
    readJson: async <T>() => ({}) as T,
    readBytes: async (path: string) => {
      reads.push(path)
      if (path === spriteRecord.path) return sourceSprite
      if (path === battleSpriteRecord.path) return sourceBattleSprite
      return sourceTile
    },
    urlFor: async (path: string) => path,
  }
  const files = await serializeProjectWithMapCopies(
    {
      ...state,
      assetCatalog: {
        version: 1,
        assets: {
          'tileset.pal.056': tileRecord,
          'sprite.test.world': spriteRecord,
          'battle-sprite.test.hero': battleSpriteRecord,
          'sound.pending': soundRecord,
        },
      },
      assetBlobs: { [soundRecord.path]: pendingSound },
    },
    source,
    { includeAssetCopies: true },
  )

  expect(reads).toEqual([tileRecord.path, spriteRecord.path, battleSpriteRecord.path])
  expect(files[tileRecord.path]).toBe(sourceTile)
  expect(files[spriteRecord.path]).toBe(sourceSprite)
  expect(files[battleSpriteRecord.path]).toBe(sourceBattleSprite)
  expect(files[soundRecord.path]).toBe(pendingSound)
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()

  const corrupted = await serializeProjectWithMapCopies(
    {
      ...state,
      assetCatalog: {
        version: 1,
        assets: {
          'tileset.pal.056': tileRecord,
          'sprite.test.world': spriteRecord,
          'battle-sprite.test.hero': battleSpriteRecord,
        },
      },
    },
    { ...source, readBytes: async () => new Uint8Array([7, 8, 9]).buffer },
    { includeAssetCopies: true },
  )
  await expect(preflightProjectWriteSet(corrupted)).rejects.toThrow(/catalog 不符/)
})

test.each([
  {
    label: '裸 RLE',
    bytes: new Uint8Array([1, 0, 1, 0]).buffer,
    error: /canonical gzip/,
  },
  {
    label: '损坏 gzip',
    bytes: new Uint8Array([0x1f, 0x8b, 0]).buffer,
    error: /RLE 损坏/,
  },
])('tileset pending $label 即使 bytes/hash 自洽也在写前 fail-loud', async (input) => {
  const path = 'assets/authored/tilesets/bad.rle'
  const record = {
    kind: 'tileset' as const,
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: input.bytes.byteLength,
    sha256: await sha256Hex(input.bytes),
    origin: { kind: 'authored' as const },
  }
  await expect(
    preflightProjectWriteSet({
      'manifest.json': { assets: { catalog: 'assets/index.json' } },
      'assets/index.json': { version: 1, assets: { 'tileset.bad': record } },
      [path]: input.bytes,
    }),
  ).rejects.toThrow(input.error)
})

test('sprite pending 统一走 origin 分级 codec：legacy 坏尾可过，authored 同字节 fail-loud', async () => {
  const raw = new Uint8Array(16)
  const view = new DataView(raw.buffer)
  view.setUint16(0, 2, true)
  view.setUint16(2, 5, true)
  view.setUint16(4, 1, true)
  view.setUint16(6, 1, true)
  raw[8] = 1
  raw[9] = 0x33
  view.setUint16(10, 500, true)
  view.setUint16(12, 1, true)
  const encoded = await compressGzip(raw)
  const bytes = encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer
  const record = {
    kind: 'sprite' as const,
    path: 'assets/migrated/sprites/023.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    origin: { kind: 'legacy-migrated' as const, ref: 'sprite/23.rle' },
  }
  const files = {
    'manifest.json': { assets: { catalog: 'assets/index.json' } },
    'assets/index.json': { version: 1, assets: { 'sprite.pal.023': record } },
    [record.path]: bytes,
  }
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()
  const authoredPath = 'assets/authored/sprites/bad-tail.rle'
  await expect(
    preflightProjectWriteSet({
      'manifest.json': files['manifest.json'],
      'assets/index.json': {
        version: 1,
        assets: {
          'sprite.authored.bad': {
            ...record,
            path: authoredPath,
            origin: { kind: 'authored' },
          },
        },
      },
      [authoredPath]: bytes,
    }),
  ).rejects.toThrow(/精灵资源 RLE 损坏/)
})

test('sprite pending 即使 bytes/hash 自洽也拒绝非 gzip 容器', async () => {
  const path = 'assets/authored/sprites/bare.rle'
  const bytes = new Uint8Array([1, 0, 1, 0, 1, 0x44]).buffer
  const record = {
    kind: 'sprite' as const,
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    origin: { kind: 'authored' as const },
  }
  await expect(
    preflightProjectWriteSet({
      'manifest.json': { assets: { catalog: 'assets/index.json' } },
      'assets/index.json': { version: 1, assets: { 'sprite.authored.bare': record } },
      [path]: bytes,
    }),
  ).rejects.toThrow(/canonical \.rle 必须带 gzip 头/)
})

test('battle-sprite pending 统一走 origin 分级 codec，写前验证完整 bytes/hash/RLE', async () => {
  const path = 'assets/authored/battle-sprites/hero.rle'
  const bytes = canonicalBattleSpriteBytes.slice(0)
  const record = {
    kind: 'battle-sprite' as const,
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    origin: { kind: 'authored' as const },
  }
  const files = {
    'manifest.json': { assets: { catalog: 'assets/index.json' } },
    'assets/index.json': { version: 1, assets: { 'battle-sprite.authored.hero': record } },
    [path]: bytes,
  }
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()

  const bad = new Uint8Array([0x1f, 0x8b, 0]).buffer
  await expect(
    preflightProjectWriteSet({
      ...files,
      'assets/index.json': {
        version: 1,
        assets: {
          'battle-sprite.authored.hero': {
            ...record,
            bytes: bad.byteLength,
            sha256: await sha256Hex(bad),
          },
        },
      },
      [path]: bad,
    }),
  ).rejects.toThrow(/战斗精灵资源 RLE 损坏/)
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
    contentVersion: 4,
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

test('canonical v3 manifest/content 缺 sprites 时加载边界 fail-loud', () => {
  const noSprites = { ...manifest, content: { ...manifest.content } }
  delete noSprites.content.sprites
  expect(() => assembleProject(noSprites, { ...JSONS, sprites: undefined })).toThrow(
    'sprites: 期望数组',
  )
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
      'content/battle-sprites.json',
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
      ...assetCatalogJson.assets,
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
  test('只挑内容变了的写;快照有、现无的删', async () => {
    const prev = new Map<string, string>([
      ['a.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`],
      ['b.json', `${JSON.stringify({ v: 2 }, null, 2)}\n`],
      ['old.json', `${JSON.stringify({ v: 3 }, null, 2)}\n`],
    ])
    const next = { 'a.json': { v: 1 }, 'b.json': { v: 99 }, 'c.json': { v: 4 } }
    const { write, remove } = await diffFiles(prev, next)
    expect(write.sort()).toEqual(['b.json', 'c.json']) // a 未变跳过;b 变;c 新
    expect(remove).toEqual(['old.json']) // old 消失 → 删
  })

  test('全未变 → 写空、删空(打开未改立即存 = 零写)', async () => {
    const files = { 'a.json': { v: 1 } }
    const snap = new Map([['a.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`]])
    await expect(diffFiles(snap, files)).resolves.toEqual({ write: [], remove: [] })
  })

  test('同路径同长度但内容变化仍写二进制，签名使用完整 sha256', async () => {
    const before = new Uint8Array([1, 2, 3]).buffer
    const after = new Uint8Array([3, 2, 1]).buffer
    const snapshot = new Map([['assets/a.rle', await binarySnapshotSignature(before)]])
    expect(await diffFiles(snapshot, { 'assets/a.rle': after })).toEqual({
      write: ['assets/a.rle'],
      remove: [],
    })
    expect(snapshot.get('assets/a.rle')).toMatch(/^bin:3:[a-f0-9]{64}$/)
  })

  test('写盘提交顺序固定为二进制 → catalog → 内容 → manifest', async () => {
    const bytes = canonicalTilesetBytes.slice(0)
    const events: string[] = []
    const makeDir = (prefix: string): FileSystemDirectoryHandle =>
      ({
        async getDirectoryHandle(name: string) {
          return makeDir(prefix ? `${prefix}/${name}` : name)
        },
        async getFileHandle(name: string, options?: { create?: boolean }) {
          const path = prefix ? `${prefix}/${name}` : name
          if (!options?.create) throw new DOMException(`NotFound ${path}`, 'NotFoundError')
          return {
            async createWritable() {
              return {
                async write() {},
                async close() {
                  events.push(path)
                },
              }
            },
          }
        },
      }) as unknown as FileSystemDirectoryHandle
    const record = {
      kind: 'tileset' as const,
      path: 'assets/authored/tilesets/a.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      origin: { kind: 'authored' as const },
    }
    await writeProject(makeDir(''), {
      'manifest.json': {
        assets: { catalog: 'assets/index.json' },
      },
      'assets/index.json': { version: 1, assets: { 'tileset.a': record } },
      'content/tilesets.json': [],
      [record.path]: bytes,
    })
    expect(events).toEqual([
      record.path,
      'assets/index.json',
      'content/tilesets.json',
      'manifest.json',
    ])
  })

  test('删除未引用地图会改写 index，并把地图 JSON 列入 remove', async () => {
    const ownManifest: LoadedManifest = {
      ...manifest,
      contentVersion: 4,
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
    const diff = await diffFiles(snapshot, after)
    expect(diff.write).toContain('content/maps/index.json')
    expect(diff.remove).toContain('content/maps/unused.json')
    expect(diff.remove).not.toContain('content/maps/used.json')
  })

  test('地图路径与其他工程输出碰撞时 fail-loud，不静默覆盖', () => {
    const ownManifest: LoadedManifest = {
      ...manifest,
      contentVersion: 4,
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
  const reg = [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' }]
  const project = {
    ...assembleProject(withTilesets, JSONS),
    tilesets: reg,
    assetCatalog: {
      version: 1 as const,
      assets: {
        'sprite.test.world': assetCatalogJson.assets['sprite.test.world'],
        'battle-sprite.test.hero': assetCatalogJson.assets['battle-sprite.test.hero'],
        'tileset.grass': {
          kind: 'tileset' as const,
          path: 'assets/authored/tilesets/grass.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 8,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' as const },
        },
      },
    },
  }
  const state = toEditorState(project, SCENES)
  expect(state.tilesets).toEqual(reg)
  const buf = new ArrayBuffer(8)
  const out = serializeProject({
    ...state,
    assetBlobs: { 'assets/authored/tilesets/grass.rle': buf },
  })
  expect(out['content/tilesets.json']).toEqual(reg)
  expect(out['assets/authored/tilesets/grass.rle']).toBe(buf)
})
