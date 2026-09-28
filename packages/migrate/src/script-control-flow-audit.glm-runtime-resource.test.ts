/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R28（migrate/script-control-flow-audit.ts:545–651，
 * **唯一授权入口 collectSourceEntrySites**；文件其余部分、完整审计与 ForTest 出口不在本卡）。
 * 该入口此前零测试。合同：scene enter/teleport、entity trigger/auto 通道、
 * 全局 item/skill/enemy/actor 已知源位点、0/缺席指针的 empty-pointers 分类、
 * sites/emptyPointers 排序与有序身份、enemyObjects 缺 objectIndex fail-loud、输入零突变。
 */
import { describe, expect, test } from 'vitest'
import type { PalMigrationSources } from './pal-migration.js'
import { collectSourceEntrySites } from './script-control-flow-audit.js'
import type { SourceCmd } from './source-facts.js'

const item = {
  id: 61,
  _name: '观音符',
  bitmap: 0,
  price: 50,
  scriptOnUse: 5,
  scriptOnEquip: 0,
  scriptOnThrow: 0,
  scriptDesc: 9,
  flags: {
    usable: true,
    equipable: false,
    throwable: false,
    consuming: true,
    applyToAll: false,
    sellable: true,
    equipableBy: [true, false, false, false, false, false],
  },
}
const spell = {
  id: 296,
  magicNumber: 1,
  scriptOnSuccess: 0,
  scriptOnUse: 8,
  scriptDesc: 11,
  _name: '气疗术',
  flags: {
    usableOutsideBattle: true,
    usableInBattle: true,
    usableToEnemy: false,
    applyToAll: false,
  },
}

/** 最小合法 sources：只填 collectSourceEntrySites 消费的域，其余为合法空集合。 */
function sources(): PalMigrationSources {
  return {
    migrate: {
      roles: [],
      levelUpExp: [],
      levelUpMagic: [],
      spells: [spell],
      magic: [],
      items: [item],
      commands: [] as SourceCmd[],
      enemyObjects: [
        {
          objectIndex: 400,
          enemyId: 1,
          resistanceToSorcery: 0,
          scriptOnTurnStart: 7,
          scriptOnBattleEnd: 0,
          scriptOnReady: 0,
        },
      ],
    },
    allJson: { segments: [] },
    allJsonPrettyBytes: 0,
    scenes: [
      {
        sceneId: 1,
        mapNum: 0,
        onEnterLabel: 'L_59',
        onTeleportLabel: 'L_0', // 解析到 0 → empty-pointer
        eventObjects: [
          { id: 0, x: 0, y: 0, spriteNum: 0, triggerLabel: 'L_12', autoLabel: 'shared#L_30' },
          { id: 1, x: 0, y: 0, spriteNum: 0 }, // 两 label 缺席 → 不产位点也不产 empty
        ],
      },
    ],
    eventsByScene: new Map(),
    tilemaps: [],
    objectPlayers: [{ scriptOnFriendDeath: 21, scriptOnDying: 0 }],
    musicMidi: [],
    assetCatalog: { version: 1, assets: {} },
    binaryAssets: [],
    worldSpriteFrameCounts: [],
    assetReport: {
      videos: 0,
      frameAnimations: 0,
      frames: 0,
      sounds: 0,
      emptySounds: 0,
      soundBytes: 0,
      portraits: 0,
      portraitBytes: 0,
      faces: 0,
      faceBytes: 0,
      itemIcons: 0,
      itemIconBytes: 0,
      battleBackgrounds: 0,
      battleBackgroundBytes: 0,
      effectSprites: 0,
      effectSpriteBytes: 0,
      effectSpriteFrames: 0,
      tilesets: 0,
      tilesetBytes: 0,
      tilesetFrames: 0,
      sprites: 0,
      spriteBytes: 0,
      spriteFrames: 0,
      spriteMalformedTailSlots: 0,
      spriteTupleDigest: '',
      spriteLegacyTailAnomalies: [],
      battleSprites: 0,
      battleSpriteBytes: 0,
      battleSpriteRawBytes: 0,
      battleSpriteFrames: 0,
      battleSpriteMalformedTailSlots: 0,
      battleSpritePlayerTupleDigest: '',
      battleSpriteEnemyTupleDigest: '',
      battleSpriteTupleDigest: '',
      battleSpritePlayerFrameCounts: [],
      battleSpriteEnemyFrameCounts: [],
      battleSpriteLegacyTailAnomalies: [],
      legacyPaletteByFrameAnimation: {},
    },
    battleEffectIndex: [],
    battleFields: [],
    objectPoisons: [],
    stores: [],
  }
}

describe('R28 collectSourceEntrySites', () => {
  test('全通道位点 + 排序（kind→sourceId→entry）+ 有序身份', () => {
    const { sites } = collectSourceEntrySites(sources())
    const keys = sites.map((s) => `${s.kind}|${s.sourceId}|${s.entry}`)
    expect(keys).toEqual([
      'actor|global/actors/0/scriptOnFriendDeath|21',
      'enemy|global/enemies/400/scriptOnTurnStart|7',
      'entity-auto|s001/e0/auto|30',
      'entity-trigger|s001/e0/trigger|12',
      'item|global/items/61/scriptDesc|9',
      'item|global/items/61/scriptOnUse|5',
      'scene-on-enter|s001/on-enter|59',
      'skill|global/skills/296/scriptDesc|11',
      'skill|global/skills/296/scriptOnUse|8',
    ])
    // 通道：entity-auto = auto，其余 trigger
    expect(sites.find((s) => s.kind === 'entity-auto')?.channel).toBe('auto')
    expect(sites.find((s) => s.kind === 'entity-trigger')?.channel).toBe('trigger')
    expect(sites.find((s) => s.kind === 'scene-on-enter')?.owner).toBe('s001')
  })

  test('0/缺席指针 → empty-pointers 分类（scene L_0、item equip、actor dying、enemy 尾字段）', () => {
    const { emptyPointers } = collectSourceEntrySites(sources())
    expect(emptyPointers.map((p) => p.sourceId).sort()).toEqual([
      'global/actors/0/scriptOnDying',
      'global/enemies/400/scriptOnBattleEnd',
      'global/enemies/400/scriptOnReady',
      'global/items/61/scriptOnEquip',
      'global/items/61/scriptOnThrow',
      'global/skills/296/scriptOnSuccess',
      's001/on-teleport',
    ])
    expect(emptyPointers.every((p) => p.disposition === 'empty-pointer')).toBe(true)
  })

  test('enemyObjects 缺稳定 objectIndex：fail-loud', () => {
    const s = sources()
    const badObject = s.migrate.enemyObjects![0]!
    ;(badObject as { objectIndex: unknown }).objectIndex = 'x'
    expect(() => collectSourceEntrySites(s)).toThrow('缺稳定 objectIndex')
  })

  test('输入零突变（structuredClone 前后相等）', () => {
    const s = sources()
    const before = structuredClone(s)
    collectSourceEntrySites(s)
    expect(s).toEqual(before)
  })
})
