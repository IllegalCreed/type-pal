import { describe, expect, test } from 'vitest'
import type { AssetCatalogV1 } from './asset.js'
import {
  applyV2MusicLabels,
  exitLegacySoundFamily,
  upgradeLegacyActorSounds,
  upgradeLegacyEnemySounds,
  upgradeLegacyItemSounds,
  upgradeLegacySkillSounds,
  upgradeLegacySoundCommands,
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
        'glyph-table',
        'ui-image',
        'image',
        'sprite',
      ],
      root: 'assets',
      sprites: 'sprites',
    },
  })
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
