import { describe, expect, test } from 'vitest'
import { assembleProject, buildBlankOwnMap, loadOwnMap } from '@type-pal/reforge'
import type { LoadedManifest } from '@type-pal/content'
import { diffFiles, serializeProject, toEditorState } from './project-io.js'

/**
 * L3 round-trip 钉真值:toEditorState(读入)→ serializeProject(落盘)应还原各 content JSON。
 * fixture 形状对齐 loader.test.ts + demo manifest(C0:characters → actors)。
 */

const manifest: LoadedManifest = {
  id: 'demo',
  name: '鬼界·民居(验证 demo)',
  contentVersion: 1,
  entryScene: 'guijie-minju',
  content: {
    scenes: 'content/scenes/',
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    items: 'content/items.json',
    locale: 'content/locale.json',
    sprites: 'content/sprites.json',
    battleFields: 'content/battle-fields.json',
  },
  assets: { root: 'assets', maps: 'maps', tilesets: 'tilesets', sprites: 'sprites', palettes: 'palettes' },
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
    map: { reuseOriginalMap: 56, room: { col: 26, row: 34, cols: 22, rows: 25 } },
    paletteId: 0,
    entry: { pos: { col: 90, row: 14, height: 0 }, facing: 'down' },
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
    dialogues: [{ id: 'ghost-hearsay', lines: [{ text: 'dlg.ghost.0' }] }],
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
const itemsJson = [{ id: '166', name: '木剑', desc: 'x', icon: 56, buyPrice: 50, sellPrice: 25, sellable: true }]
const localeJson = { 'menu.status': '状态', 'name.li-xiaoyao': '李逍遥', 'dlg.ghost.0': '...' }
const spritesJson = [
  { id: 'ghost', spriteNum: 16, label: '游魂(占位)', layout: { kind: 'directional', framesPerDir: 3 } },
  { id: 'li-xiaoyao', spriteNum: 2, label: '李逍遥(大世界)', layout: { kind: 'directional', framesPerDir: 3 } },
]

const battleFieldsJson = [
  { id: 24, name: '客栈', screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
  { id: 22, screenWave: 5, magicEffect: { wind: 0, thunder: 0, water: 3, fire: -3, earth: 0 } },
]
const JSONS = { actors: actorsJson, sceneIds: scenesJson.map((s) => s.id), entryScene: scenesJson[0], skills: skillsJson, items: itemsJson, locale: localeJson, sprites: spritesJson, battleFields: battleFieldsJson }
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
  expect(out['content/skills.json']).toEqual({ skills: skillsJson.skills, levelUp: skillsJson.levelUp })
  // D24:战场表 round-trip(数组直传保序)
  expect(out['content/battle-fields.json']).toEqual(battleFieldsJson)

  // manifest.json 整体还原(startWorld 含 seedStats)
  expect(out['manifest.json']).toEqual(manifest)
})

test('W7D 自有地图 round-trip:ownMaps → serializeProject 产出 content/maps 文件', () => {
  const project = assembleProject(manifest, JSONS)
  const ownMap = buildBlankOwnMap(2, 2, 'tileset/56.rle')
  const ownMaps = { 'content/maps/guijie-minju.json': ownMap }
  const state = toEditorState(project, SCENES, [], ownMaps)
  expect(state.maps).toEqual(ownMaps) // 键 = ownMap 相对路径,原样入 state
  const out = serializeProject(state)
  expect(out['content/maps/guijie-minju.json']).toEqual(ownMap) // 键即路径,直接产出为文件
})

test('W7D 自有地图 serialize → loadOwnMap 重开闭环', async () => {
  const project = assembleProject(manifest, JSONS)
  const rel = 'content/maps/guijie-minju.json'
  const ownMap = buildBlankOwnMap(2, 2, 'tileset/56.rle')
  const files = serializeProject(toEditorState(project, SCENES, [], { [rel]: ownMap }))
  const source = {
    readText: async (path: string) => JSON.stringify(files[path]),
    readJson: async <T>(path: string) => files[path] as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (path: string) => path,
  }
  expect(await loadOwnMap({ ...project.assetBase, source }, rel)).toEqual(ownMap)
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
    ['content/actors.json', 'content/battle-fields.json', 'content/items.json', 'content/locale.json', 'content/scenes/index.json', 'content/scenes/guijie-minju.json', 'content/skills.json', 'content/sprites.json', 'manifest.json'].sort(),
  )
})

test('W5 音乐库:manifest 声明 music → 注入/序列化 round-trip;未声明不产出', () => {
  const withMusic = {
    ...manifest,
    content: { ...manifest.content, music: 'content/music.json' },
  }
  const project = assembleProject(withMusic, JSONS)
  const lib = [{ id: 1, name: '蝶恋' }, { id: 31 }]
  const state = toEditorState(project, SCENES, lib)
  expect(state.music).toBe(lib)
  const out = serializeProject(state)
  expect(out['content/music.json']).toEqual(lib)

  // 未声明(原 manifest):不产出 music 文件;toEditorState 缺省空数组
  const plain = toEditorState(assembleProject(manifest, JSONS), SCENES)
  expect(plain.music).toEqual([])
  expect(serializeProject(plain)['content/music.json']).toBeUndefined()
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
})
