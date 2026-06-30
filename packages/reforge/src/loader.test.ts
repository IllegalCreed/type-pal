import type { LoadedManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assembleProject } from './loader.js'

const manifest: LoadedManifest = {
  id: 'demo',
  name: '鬼界·民居(DLC-01)',
  contentVersion: 1,
  entryScene: 'guijie-minju',
  content: {},
  assets: {
    root: 'assets',
    maps: 'maps',
    tilesets: 'tilesets',
    sprites: 'sprites',
    palettes: 'palettes',
  },
  startWorld: {
    party: ['li-xiaoyao'],
    money: 0,
    learnedSkills: { 'li-xiaoyao': ['296'] },
    inventory: [],
  },
}

const charactersJson = [
  {
    id: 'li-xiaoyao',
    name: 'name.li-xiaoyao',
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
]
const scenesJson = [
  {
    id: 'guijie-minju',
    map: { reuseOriginalMap: 56, room: { col: 26, row: 34, cols: 22, rows: 25 } },
    entry: { pos: { col: 90, row: 14, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'wandering-ghost',
        pos: { col: 92, row: 12, height: 0 },
        sprite: 'ghost',
        collide: true,
        interact: 'ghost-hearsay',
      },
    ],
    dialogues: [],
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
const localeJson = { 'menu.status': '状态' }

describe('assembleProject(纯核)', () => {
  test('组装:scenes 数组 + charactersById/skills/items Record + locale + manifest', () => {
    const p = assembleProject(manifest, {
      characters: charactersJson,
      scenes: scenesJson,
      skills: skillsJson,
      items: itemsJson,
      locale: localeJson,
    })
    expect(p.manifest.id).toBe('demo')
    expect(p.scenes.map((s) => s.id)).toEqual(['guijie-minju'])
    expect(p.entryScene?.id).toBe('guijie-minju') // entryScene 解析 = scenes.find(entryScene)
    expect(p.charactersById['li-xiaoyao']?.baseStats.attack).toBe(33)
    expect(p.skills['296']?.name).toBe('气疗术')
    expect(p.levelUp['li-xiaoyao']).toEqual([{ level: 7, skillId: '349' }])
    expect(p.items['166']?.name).toBe('木剑')
    expect(p.locale['menu.status']).toBe('状态')
  })
  test('entryScene 在 scenes 里找不到 → throw', () => {
    expect(() =>
      assembleProject(
        { ...manifest, entryScene: 'nope' },
        {
          characters: charactersJson,
          scenes: scenesJson,
          skills: skillsJson,
          items: itemsJson,
          locale: localeJson,
        },
      ),
    ).toThrow('入口场景')
  })
  test('guard 拦截:items 缺 id → throw', () => {
    expect(() =>
      assembleProject(manifest, {
        characters: charactersJson,
        scenes: scenesJson,
        skills: skillsJson,
        items: [{ name: 'x' }],
        locale: localeJson,
      }),
    ).toThrow('id')
  })
})
