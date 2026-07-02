import { expect, test } from 'vitest'
import { assembleProject } from '@type-pal/reforge'
import type { LoadedManifest } from '@type-pal/content'
import { serializeProject, toEditorState } from './project-io.js'

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

const JSONS = { actors: actorsJson, sceneIds: scenesJson.map((s) => s.id), entryScene: scenesJson[0], skills: skillsJson, items: itemsJson, locale: localeJson, sprites: spritesJson }
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

  // manifest.json 整体还原(startWorld 含 seedStats)
  expect(out['manifest.json']).toEqual(manifest)
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
    ['content/actors.json', 'content/items.json', 'content/locale.json', 'content/scenes/index.json', 'content/scenes/guijie-minju.json', 'content/skills.json', 'content/sprites.json', 'manifest.json'].sort(),
  )
})
