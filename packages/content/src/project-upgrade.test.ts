import { describe, expect, test } from 'vitest'
import type { AssetCatalogV1 } from './asset.js'
import type { WorldState } from './character.js'
import {
  applyV2MusicLabels,
  exitLegacySoundFamily,
  upgradeLegacyActorImages,
  upgradeLegacyActorSounds,
  upgradeLegacyEnemySounds,
  upgradeLegacyItemImages,
  upgradeLegacyItemSounds,
  upgradeLegacyPalBattleFields,
  upgradeLegacySkillSounds,
  upgradeLegacySoundCommands,
  upgradeLegacyStaticImageCommands,
  upgradeLegacyWorldPortraits,
  upgradeManifestV2ToV3,
  upgradeV2MusicReferences,
} from './project-upgrade.js'

const record = (track: number) => ({
  kind: 'music' as const,
  path: `assets/migrated/music/${String(track).padStart(3, '0')}.mid`,
  mediaType: 'audio/midi',
  bytes: 1,
  sha256: String(track % 10).repeat(64),
  origin: { kind: 'legacy-migrated' as const },
})

describe('旧静态图引用单向升级', () => {
  test('actor default/expressions、item 0 哨兵与 battle fields 幂等规范化', () => {
    const actors = [
      {
        id: 'a',
        portraits: { default: 1, expressions: { hurt: 2, hidden: 0 } },
      },
    ]
    const upgradedActors = upgradeLegacyActorImages(actors)
    expect(upgradedActors).toEqual([
      {
        id: 'a',
        portraits: {
          default: 'portrait.pal.001',
          expressions: { hurt: 'portrait.pal.002' },
        },
      },
    ])
    expect(upgradeLegacyActorImages(upgradedActors)).toEqual(upgradedActors)
    expect(
      upgradeLegacyItemImages([
        { id: '277', icon: 0 },
        { id: '1', icon: 7 },
      ]),
    ).toEqual([{ id: '277' }, { id: '1', icon: 'item-icon.pal.007' }])
    const fields = [
      { id: 5 },
      { id: 6 },
      { id: 7, background: 'battle-background.authored' },
      { id: 58 },
    ]
    expect(upgradeLegacyPalBattleFields(fields)).toEqual([
      { id: 5 },
      { id: 6, background: 'battle-background.pal.006' },
      { id: 7, background: 'battle-background.authored' },
      { id: 58 },
    ])
    expect(fields[1]).toEqual({ id: 6 })
  })

  test('命令树覆盖 dialog/setActorAppearance，0 删除且不保留空命令', () => {
    const upgraded = upgradeLegacyStaticImageCommands([
      {
        kind: 'dialog',
        cue: { rows: [{ text: 'dlg' }], portrait: { icon: 3, side: 'left' } },
      },
      { kind: 'setActorAppearance', actor: 'a', portrait: 4 },
      { kind: 'setActorAppearance', actor: 'a', portrait: 0 },
      {
        kind: 'branch',
        then: [{ kind: 'setActorAppearance', actor: 'a', portrait: 0, battleSprite: 9 }],
      },
    ])
    expect(upgraded).toEqual([
      {
        kind: 'dialog',
        cue: {
          rows: [{ text: 'dlg' }],
          portrait: { asset: 'portrait.pal.003', side: 'left' },
        },
      },
      { kind: 'setActorAppearance', actor: 'a', portrait: 'portrait.pal.004' },
      { kind: 'branch', then: [{ kind: 'setActorAppearance', actor: 'a', battleSprite: 9 }] },
    ])
    expect(upgradeLegacyStaticImageCommands(upgraded)).toEqual(upgraded)
  })

  test('存档 party/reserve 共用同一立绘映射，0 清字段且不改输入', () => {
    const character = (id: string, portrait: number) => ({
      id,
      template: id,
      level: 1,
      exp: 0,
      hp: 1,
      maxHP: 1,
      mp: 1,
      maxMP: 1,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
      equipment: {},
      tags: [],
      appearance: { portrait },
    })
    const world = {
      party: [character('a', 8)],
      reserve: [character('b', 0)],
      money: 0,
      learnedSkills: {},
      inventory: [],
    }
    const upgraded = upgradeLegacyWorldPortraits(world as unknown as WorldState)
    expect(upgraded.party[0]?.appearance).toEqual({ portrait: 'portrait.pal.008' })
    expect(upgraded.reserve?.[0]?.appearance).toBeUndefined()
    expect(world.party[0]?.appearance.portrait).toBe(8)
  })
})

test('v2 manifest 单向产出 v3，删除 music 清单与 music legacy 双轨', () => {
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const upgraded = upgradeManifestV2ToV3({
    manifest: {
      id: 'old',
      name: '旧工程',
      contentVersion: 2,
      entryScene: 's0',
      content: { scenes: 'content/scenes/', music: 'content/music.json' },
      assets: { root: 'assets', music: 'music', sprites: 'sprites' },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    catalog,
  })
  expect(upgraded.contentVersion).toBe(3)
  expect(upgraded.content.music).toBeUndefined()
  expect(upgraded.assets).toEqual({
    catalog: 'assets/index.json',
    roles: {},
    legacy: {
      families: [
        'battle-sprite',
        'effect-sprite',
        'battle-background',
        'rng',
        'video',
        'image',
        'sprite',
      ],
      root: 'assets',
      sprites: 'sprites',
    },
  })
})

test('v2 manifest 的旧 UI 目录不会被静默丢弃', () => {
  expect(() =>
    upgradeManifestV2ToV3({
      manifest: {
        id: 'old-ui',
        name: '旧 UI 工程',
        contentVersion: 2,
        entryScene: 's0',
        content: { scenes: 'content/scenes/' },
        assets: { ui: 'assets/ui' },
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      },
      catalog: { version: 1, assets: {} },
    }),
  ).toThrow('manifest.assets.ui')
})

describe('v2 音乐引用升级', () => {
  test('区分缺省、指定、显式停止，且递归处理分支', () => {
    expect(
      upgradeV2MusicReferences({
        id: 's',
        musicId: 31,
        battleMusicId: 0,
        body: [
          { kind: 'playMusic', musicId: 1 },
          { kind: 'playMusic', musicId: 0 },
          { kind: 'startBattle', team: 2, musicId: 37 },
        ],
      }),
    ).toEqual({
      id: 's',
      music: 'music.pal.031',
      battleMusic: null,
      body: [
        { kind: 'playMusic', asset: 'music.pal.001' },
        { kind: 'stopMusic' },
        { kind: 'startBattle', team: 2, music: 'music.pal.037' },
      ],
    })
  })

  test('旧别名只进入对应 catalog label', () => {
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'music.pal.001': record(1) } }
    expect(applyV2MusicLabels(catalog, [{ id: 1, name: '蝶恋' }]).assets).toEqual({
      'music.pal.001': { ...record(1), label: '蝶恋' },
    })
    expect(catalog.assets['music.pal.001']?.label).toBeUndefined()
  })
})

describe('旧 sound family 一次性升级', () => {
  const resolveSound = (id: number) => (id === 122 ? undefined : `sound.pal.${id}`)

  test('命令深层递归、空 122 删除且非空缺源 fail-loud', () => {
    expect(
      upgradeLegacySoundCommands(
        [
          {
            kind: 'branch',
            body: [
              { kind: 'playSound', soundId: 45 },
              { kind: 'playSound', soundId: 122 },
            ],
          },
        ],
        resolveSound,
      ),
    ).toEqual([{ kind: 'branch', body: [{ kind: 'playSound', asset: 'sound.pal.45' }] }])
    expect(() =>
      upgradeLegacySoundCommands([{ kind: 'playSound', soundId: 99 }], () => undefined),
    ).toThrow('旧音效 99')
  })

  test('角色、敌人负 magic、技能深层 summon 与物品分别升级，输入不变', () => {
    const actors = [{ battler: { sounds: { attack: 1, death: 0 } } }]
    const enemies = [{ sounds: { attack: 2, magic: -3, call: 0 } }]
    const skills = {
      skills: [
        {
          animation: { sound: 4 },
          effects: [{ kind: 'damage' }, { kind: 'summon', sound: 5 }],
        },
      ],
      levelUp: {},
    }
    const items = [{ use: { sound: 6 }, throw: { sound: 0 } }]
    expect(upgradeLegacyActorSounds(actors, resolveSound)).toEqual([
      { battler: { sounds: { attack: 'sound.pal.1' } } },
    ])
    expect(upgradeLegacyEnemySounds(enemies, resolveSound)).toEqual([
      {
        sounds: {
          attack: 'sound.pal.2',
          magic: 'sound.pal.3',
          suppressMagicEffectSound: true,
        },
      },
    ])
    expect(upgradeLegacySkillSounds(skills, resolveSound)).toEqual({
      skills: [
        {
          animation: { sound: 'sound.pal.4' },
          effects: [{ kind: 'damage' }, { kind: 'summon', sound: 'sound.pal.5' }],
        },
      ],
      levelUp: {},
    })
    expect(upgradeLegacyItemSounds(items, resolveSound)).toEqual([
      { use: { sound: 'sound.pal.6' }, throw: {} },
    ])
    expect(enemies[0]?.sounds.magic).toBe(-3)
  })

  test('manifest 只退出 sound 并保留作者角色覆盖', () => {
    const manifest = {
      id: 'p',
      name: 'P',
      contentVersion: 3 as const,
      entryScene: 's',
      content: {},
      assets: {
        catalog: 'assets/index.json',
        roles: { 'audio.battleEscapeSound': 'sound.authored' as const },
        legacy: { families: ['sound', 'sprite'] as const, sounds: 'old', sprites: 'sprite' },
      },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    }
    expect(
      exitLegacySoundFamily({
        manifest: manifest as never,
        roles: { 'audio.battleEscapeSound': 'sound.default' },
      }).assets,
    ).toEqual({
      catalog: 'assets/index.json',
      roles: { 'audio.battleEscapeSound': 'sound.authored' },
      legacy: { families: ['sprite'], sprites: 'sprite' },
    })
  })
})
