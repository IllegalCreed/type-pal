import type { AssetCatalogV1, MapIndexV1, ScriptIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  createScriptReferenceCatalog,
  SCRIPT_REFERENCE_KIND_LABEL,
} from './script-reference-catalog.js'

const assets: AssetCatalogV1 = {
  version: 1,
  assets: {
    'sound.test': {
      kind: 'sound',
      path: 'assets/sounds/test.rle',
      mediaType: 'application/octet-stream',
      bytes: 1,
      sha256: '0'.repeat(64),
      label: '测试音效',
      origin: { kind: 'authored' },
    },
    'sound.unlabelled': {
      kind: 'sound',
      path: 'assets/sounds/unlabelled.rle',
      mediaType: 'application/octet-stream',
      bytes: 1,
      sha256: '1'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

const mapIndex: MapIndexV1 = {
  version: 1,
  maps: [{ id: 'heaven-palace', name: '天界', path: 'content/maps/heaven-palace.json' }],
}

const scriptIndex: ScriptIndexV1 = {
  version: 1,
  shards: { shared: 16, global: {} },
  chunks: {},
  library: {
    'shared/user/item-use/book': { name: '天书使用', self: 'none' },
  },
}

function catalog() {
  return createScriptReferenceCatalog({
    locale: { 'actor.li': '李逍遥' },
    items: [{ id: '290', name: '天书', desc: [], buyPrice: 0, sellPrice: 0, sellable: false }],
    skills: [
      {
        id: '377',
        name: '飞龙探云手',
        desc: '',
        cost: {},
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [],
        animation: { effectSprite: 0 },
      },
    ],
    actors: [{ id: 'li-xiaoyao', name: 'actor.li', spriteId: 'li-world' }],
    sprites: [
      { id: 'li-world', label: '李逍遥（大世界）', asset: 'sprite.li', layout: { kind: 'static' } },
    ],
    battleSprites: [
      {
        id: 'li-battle',
        label: '李逍遥（战斗）',
        asset: 'battle.li',
        profile: {
          kind: 'player-fighter',
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
    ],
    ambiences: [{ id: 'night', name: '夜晚', tint: [200, 200, 255] }],
    mapIndex,
    assetCatalog: assets,
    scriptIndex,
  })
}

describe('脚本稳定引用目录', () => {
  test('每种有名称的一等定义都显示名称（ID）', () => {
    const references = catalog()
    expect(references.label('item', '290')).toBe('天书（290）')
    expect(references.label('skill', '377')).toBe('飞龙探云手（377）')
    expect(references.label('actor', 'li-xiaoyao')).toBe('李逍遥（li-xiaoyao）')
    expect(references.label('sprite', 'li-world')).toBe('李逍遥（大世界）（li-world）')
    expect(references.label('battleSprite', 'li-battle')).toBe('李逍遥（战斗）（li-battle）')
    expect(references.label('ambience', 'night')).toBe('夜晚（night）')
    expect(references.label('map', 'heaven-palace')).toBe('天界（heaven-palace）')
    expect(references.label('asset', 'sound.test')).toBe('测试音效（sound.test）')
    expect(references.label('authorScript', 'shared/user/item-use/book')).toBe(
      '天书使用（shared/user/item-use/book）',
    )
  })

  test('资源无 label 时以 path 定位；只收作者脚本目录', () => {
    const references = catalog()
    expect(references.label('asset', 'sound.unlabelled')).toBe(
      'assets/sounds/unlabelled.rle（sound.unlabelled）',
    )
    expect(references.choices('authorScript')).toEqual([
      { id: 'shared/user/item-use/book', name: '天书使用' },
    ])
  })

  test('缺失定义一律显式标为未知', () => {
    const references = catalog()
    for (const kind of Object.keys(SCRIPT_REFERENCE_KIND_LABEL) as Array<
      keyof typeof SCRIPT_REFERENCE_KIND_LABEL
    >) {
      expect(references.label(kind, 'missing')).toBe(
        `⚠ 未知${SCRIPT_REFERENCE_KIND_LABEL[kind]}（missing）`,
      )
      expect(references.has(kind, 'missing')).toBe(false)
    }
  })
})
