import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import {
  type AssetCatalogV1,
  collectAssetReferences,
  collectCommandAssetReferences,
  groupAssetReferencesBySite,
  legacyPalPortraitAssetId,
  type ManifestAssetConfigV3,
  palBattleBackgroundAssetId,
  palFaceAssetId,
  palFrameAnimationAssetId,
  palItemIconAssetId,
  palMusicAssetId,
  palPortraitAssetId,
  palSoundAssetId,
  palVideoAssetId,
  validateAssetCatalog,
  validateAssetFileClosure,
  validateAssetReferenceClosure,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
} from './asset.js'
import type { EnemyDef } from './enemy.js'
import type { ItemData } from './item.js'
import type { SkillData } from './skill.js'

const hash = 'a'.repeat(64)
const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'music.pal.002': {
      kind: 'music',
      path: 'assets/migrated/music/002.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'music.pal.003': {
      kind: 'music',
      path: 'assets/migrated/music/003.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'music.pal.004': {
      kind: 'music',
      path: 'assets/migrated/music/004.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'music.pal.037': {
      kind: 'music',
      path: 'assets/migrated/music/037.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'soundfont.default': {
      kind: 'soundfont',
      path: 'assets/runtime/soundfont.sf3',
      mediaType: 'audio/sf3',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'licensed' },
    },
    'sound.pal.029': {
      kind: 'sound',
      path: 'assets/migrated/sounds/029.wav',
      mediaType: 'audio/wav',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'sound.pal.045': {
      kind: 'sound',
      path: 'assets/migrated/sounds/045.wav',
      mediaType: 'audio/wav',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'sound.pal.174': {
      kind: 'sound',
      path: 'assets/migrated/sounds/174.wav',
      mediaType: 'audio/wav',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'sound.pal.301': {
      kind: 'sound',
      path: 'assets/migrated/sounds/301.wav',
      mediaType: 'audio/wav',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'color.project-standard': {
      kind: 'color-table',
      path: 'assets/migrated/color/project-standard.json',
      mediaType: 'application/json',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'video.pal.001': {
      kind: 'video',
      path: 'assets/migrated/videos/001.mp4',
      mediaType: 'video/mp4',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'video.pal.004': {
      kind: 'video',
      path: 'assets/migrated/videos/004.mp4',
      mediaType: 'video/mp4',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'frame-animation.pal.003': {
      kind: 'frame-animation',
      path: 'assets/migrated/frame-animations/003.tpfs',
      mediaType: 'application/vnd.type-pal.frame-sequence',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
  },
}

const assets: ManifestAssetConfigV3 = {
  catalog: 'assets/index.json',
  roles: {
    'audio.midiSoundfont': 'soundfont.default',
    'audio.defaultBattleMusic': 'music.pal.037',
    'audio.bossVictoryMusic': 'music.pal.002',
    'audio.normalVictoryMusic': 'music.pal.003',
    'audio.openingMenuMusic': 'music.pal.004',
    'audio.battleItemUseSound': 'sound.pal.045',
    'visual.standardColorTable': 'color.project-standard',
  },
  legacy: { families: ['sprite', 'tileset'] },
}

describe('validateProjectRelativePath', () => {
  test('规范工程相对路径通过', () => {
    expect(validateProjectRelativePath('assets/authored/a.mid')).toBe('assets/authored/a.mid')
  })

  test.each([
    '',
    '/assets/a.mid',
    'https://example.com/a.mid',
    'file:a.mid',
    'C:/assets/a.mid',
    'assets\\a.mid',
    'assets/../a.mid',
    'assets/./a.mid',
    'assets//a.mid',
    'assets/a.mid?raw',
    'assets/a.mid#x',
    'assets/\0a.mid',
  ])('拒绝 %j', (path) => {
    expect(() => validateProjectRelativePath(path)).toThrow()
  })
})

describe('catalog 与 manifest v3', () => {
  test('合法目录、音频与视觉角色及 legacy 债务区通过', () => {
    expect(validateAssetCatalog(catalog)).toEqual(catalog)
    expect(validateManifestAssetConfigV3(assets, catalog)).toEqual(assets)
  })

  test('未知角色、角色 kind 错、缺角色均 fail-loud', () => {
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.hidden': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('未知资源角色')
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.midiSoundfont': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('期望 soundfont')
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.openingMenuMusic': 'soundfont.default' } },
        catalog,
      ),
    ).toThrow('期望 music')
    expect(() =>
      validateManifestAssetConfigV3(
        {
          ...assets,
          roles: { ...assets.roles, 'visual.standardColorTable': 'music.pal.002' },
        },
        catalog,
      ),
    ).toThrow('期望 color-table')
    expect(() =>
      validateManifestAssetConfigV3(
        {
          ...assets,
          roles: { ...assets.roles, 'video.startupSplash': 'music.pal.002' },
        },
        catalog,
      ),
    ).toThrow('期望 video')
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.battleEscapeSound': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('期望 sound')
    const { 'audio.openingMenuMusic': _openingMenuMusic, ...rolesWithoutOpeningMenu } = assets.roles
    expect(() =>
      validateManifestAssetConfigV3({ ...assets, roles: rolesWithoutOpeningMenu }, catalog),
    ).toThrow('音乐切片缺角色 "audio.openingMenuMusic"')
  })

  test('同一资源族不得同时存在于 catalog 和 legacy', () => {
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, legacy: { families: ['music', 'sprite'] } },
        catalog,
      ),
    ).toThrow('同时出现在 catalog 与 legacy')
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, legacy: { families: ['sound', 'sprite'] } },
        catalog,
      ),
    ).toThrow('资源族 "sound" 同时出现在 catalog 与 legacy')
  })

  test('旧 UI 目录字段 actionable fail，不作为未知扩展静默穿透', () => {
    expect(() => validateManifestAssetConfigV3({ ...assets, ui: 'assets/ui' }, catalog)).toThrow(
      'manifest.assets.ui',
    )
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, legacy: { families: ['sprite'], ui: 'assets/ui' } },
        catalog,
      ),
    ).toThrow('manifest.assets.legacy.ui')
  })
})

test('PAL 数字号只在迁移边界确定性映射', () => {
  expect(palMusicAssetId(31)).toBe('music.pal.031')
  expect(palSoundAssetId(45)).toBe('sound.pal.045')
  expect(palVideoAssetId(1)).toBe('video.pal.001')
  expect(palFrameAnimationAssetId(0)).toBe('frame-animation.pal.000')
  expect(palPortraitAssetId(7)).toBe('portrait.pal.007')
  expect(legacyPalPortraitAssetId(0)).toBeUndefined()
  expect(legacyPalPortraitAssetId(7)).toBe('portrait.pal.007')
  expect(palFaceAssetId('li-xiaoyao')).toBe('face.pal.li-xiaoyao')
  expect(palItemIconAssetId(12)).toBe('item-icon.pal.012')
  expect(palBattleBackgroundAssetId(6)).toBe('battle-background.pal.006')
  expect(() => palMusicAssetId(0)).toThrow('正整数')
  expect(() => palSoundAssetId(0)).toThrow('正整数')
  expect(() => palVideoAssetId(0)).toThrow('正整数')
  expect(() => palFrameAnimationAssetId(-1)).toThrow('非负整数')
  expect(() => palPortraitAssetId(0)).toThrow('正整数')
  expect(() => legacyPalPortraitAssetId(-1)).toThrow('非负整数')
  expect(() => palFaceAssetId('')).toThrow('非空字符串')
  expect(() => palItemIconAssetId(0)).toThrow('正整数')
  expect(() => palBattleBackgroundAssetId(-1)).toThrow('非负整数')
})

test('项目 schema 不再接受幽灵 glyph/ui 资源族', () => {
  expect(() =>
    validateManifestAssetConfigV3({
      catalog: 'assets/index.json',
      roles: {},
      legacy: { families: ['glyph-table'] },
    }),
  ).toThrow('未知 legacy family')
  expect(() =>
    validateAssetCatalog({
      version: 1,
      assets: {
        ghost: {
          kind: 'ui-image',
          path: 'assets/migrated/ui/ghost.png',
          mediaType: 'image/png',
          bytes: 0,
          sha256: hash,
          origin: { kind: 'legacy-migrated' },
        },
      },
    }),
  ).toThrow('非法 AssetKind')
})

test('命令级 walker 与全工程 walker 共用深层递归', () => {
  expect(
    collectCommandAssetReferences(
      [{ kind: 'branch', then: [{ kind: 'playSound', asset: 'sound.deep' }] }],
      'body',
      'script:test',
    ),
  ).toEqual([
    {
      asset: 'sound.deep',
      expectedKind: 'sound',
      where: 'body[0].then[0].asset',
      site: 'script:test',
    },
  ])
})

describe('typed 资源引用与文件闭包', () => {
  const scene = {
    id: 's',
    mapId: 'map-001',
    music: 'music.pal.002',
    battleMusic: null,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
    entities: [],
    onEnter: [
      {
        body: [
          { kind: 'playMusic' as const, asset: 'music.pal.003' },
          {
            kind: 'startBattle' as const,
            team: 1,
            music: 'music.pal.037',
            onLose: [
              { kind: 'playMusic' as const, asset: 'music.missing' },
              { kind: 'playVideo' as const, asset: 'video.pal.001' },
              {
                kind: 'playFrameAnimation' as const,
                asset: 'frame-animation.pal.003',
                startFrame: 2,
                endFrame: 8,
              },
              { kind: 'quitToTitle' as const, videos: ['video.pal.004'] },
              { kind: 'playSound' as const, asset: 'sound.pal.029' },
            ],
          },
        ],
      },
    ],
  }

  test('静态图 walker 覆盖立绘表情、对话、形象命令、face、物品、战场与存档世界', () => {
    const refs = collectAssetReferences({
      actors: [
        {
          id: 'li-xiaoyao',
          name: 'name.li-xiaoyao',
          spriteId: 'sprite.li-xiaoyao',
          portraits: {
            default: 'portrait.pal.001',
            expressions: { hurt: 'portrait.pal.002' },
          },
          face: 'face.pal.li-xiaoyao',
        },
      ],
      scenes: [
        {
          id: 's',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          onEnter: [
            {
              body: [
                {
                  kind: 'dialog',
                  cue: {
                    rows: [{ text: 'dlg.test' }],
                    portrait: { asset: 'portrait.pal.003', side: 'left' },
                  },
                },
                {
                  kind: 'setActorAppearance',
                  actor: 'li-xiaoyao',
                  portrait: 'portrait.pal.004',
                },
              ],
            },
          ],
        },
      ],
      items: [
        {
          id: '1',
          name: 'item.1.name',
          desc: [],
          icon: 'item-icon.pal.001',
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
        },
      ],
      battleFields: [
        {
          id: 6,
          background: 'battle-background.pal.006',
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
      worlds: [
        {
          party: [
            {
              id: 'li-xiaoyao',
              template: 'li-xiaoyao',
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
              appearance: { portrait: 'portrait.pal.005' },
            },
          ],
          reserve: [
            {
              id: 'zhao-linger',
              template: 'zhao-linger',
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
              appearance: { portrait: 'portrait.pal.006' },
            },
          ],
          money: 0,
          learnedSkills: {},
          inventory: [],
        },
      ],
    })
    expect(refs.map(({ asset, expectedKind }) => [asset, expectedKind])).toEqual([
      ['portrait.pal.003', 'portrait'],
      ['portrait.pal.004', 'portrait'],
      ['portrait.pal.001', 'portrait'],
      ['portrait.pal.002', 'portrait'],
      ['face.pal.li-xiaoyao', 'face'],
      ['item-icon.pal.001', 'item-icon'],
      ['battle-background.pal.006', 'battle-background'],
      ['portrait.pal.005', 'portrait'],
      ['portrait.pal.006', 'portrait'],
    ])
    expect(refs).toContainEqual({
      asset: 'portrait.pal.002',
      expectedKind: 'portrait',
      where: 'actors[0].portraits.expressions["hurt"]',
      site: 'actor:li-xiaoyao:portraits',
    })
    expect(refs).toContainEqual({
      asset: 'portrait.pal.006',
      expectedKind: 'portrait',
      where: 'worlds[0].reserve[0].appearance.portrait',
      site: 'world:0:character:zhao-linger:appearance',
    })
  })

  test('walker 覆盖 roles、场景、嵌套命令', () => {
    const actors = [
      {
        id: 'li-xiaoyao',
        battler: { sounds: { attack: 'sound.pal.045', weapon: 'sound.pal.029' } },
      } as ActorDef,
    ]
    const enemies = [
      {
        id: 'enemy-1',
        sounds: { magic: 'sound.pal.174', suppressMagicEffectSound: true },
        choreography: [
          { at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.pal.029' }] },
        ],
      } as EnemyDef,
    ]
    const skills: SkillData[] = [
      {
        id: '377',
        name: 'skill.377.name',
        desc: 'skill.377.desc',
        cost: {},
        usableOutsideBattle: false,
        target: 'allEnemies',
        effects: [
          { kind: 'damage', power: 1, elemental: 0 },
          { kind: 'summon', godId: 1, sound: 'sound.pal.301' },
        ],
        animation: { effectSprite: 1, sound: 'sound.pal.174' },
      },
    ]
    const items = [
      {
        id: '151',
        use: { consuming: true, effects: [], sound: 'sound.pal.045' },
      } as unknown as ItemData,
    ]
    const refs = collectAssetReferences({
      assets,
      entryPoints: [{ id: 'new-game', label: '新的故事', scene: 's', introVideo: 'video.pal.001' }],
      scenes: [scene],
      actors,
      enemies,
      items,
      skills,
    })
    expect(refs.map((ref) => ref.asset)).toEqual(
      expect.arrayContaining([
        'soundfont.default',
        'music.pal.037',
        'music.pal.002',
        'music.pal.003',
        'music.pal.004',
        'color.project-standard',
        'video.pal.001',
        'video.pal.004',
        'frame-animation.pal.003',
        'music.missing',
        'sound.pal.029',
        'sound.pal.045',
        'sound.pal.174',
        'sound.pal.301',
      ]),
    )
    expect(refs).toContainEqual({
      asset: 'music.pal.004',
      expectedKind: 'music',
      where: 'manifest.assets.roles.audio.openingMenuMusic',
      site: 'manifest.assets.roles.audio.openingMenuMusic',
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.001',
      expectedKind: 'video',
      where: 'entryPoints[0].introVideo',
      site: 'entryPoint:new-game:introVideo',
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.001',
      expectedKind: 'video',
      where: 'scenes[0].onEnter[0].body[1].onLose[1].asset',
      site: 'scene:s:onEnter',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.029',
      expectedKind: 'sound',
      where: 'scenes[0].onEnter[0].body[1].onLose[4].asset',
      site: 'scene:s:onEnter',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.045',
      expectedKind: 'sound',
      where: 'actors[0].battler.sounds.attack',
      site: 'actor:li-xiaoyao:sounds',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.174',
      expectedKind: 'sound',
      where: 'enemies[0].sounds.magic',
      site: 'enemy:enemy-1:sounds',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.174',
      expectedKind: 'sound',
      where: 'skills[0].animation.sound',
      site: 'skill:377:animation',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.301',
      expectedKind: 'sound',
      where: 'skills[0].effects[1].sound',
      site: 'skill:377:effects',
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.045',
      expectedKind: 'sound',
      where: 'items[0].use.sound',
      site: 'item:151:use',
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.004',
      expectedKind: 'video',
      where: 'scenes[0].onEnter[0].body[1].onLose[3].videos[0]',
      site: 'scene:s:onEnter',
    })
    expect(refs).toContainEqual({
      asset: 'frame-animation.pal.003',
      expectedKind: 'frame-animation',
      where: 'scenes[0].onEnter[0].body[1].onLose[2].asset',
      site: 'scene:s:onEnter',
    })
    expect(validateAssetReferenceClosure(catalog, refs)).toContainEqual(
      expect.objectContaining({ code: 'missing-asset', severity: 'error' }),
    )
  })

  test('文件缺失、大小与 hash 不符均有独立错误', async () => {
    const refs = [
      {
        asset: 'music.pal.002',
        expectedKind: 'music' as const,
        where: 'scene.music',
        site: 'scene.music',
      },
      {
        asset: 'music.pal.003',
        expectedKind: 'music' as const,
        where: 'script.asset',
        site: 'script.asset',
      },
      {
        asset: 'music.pal.037',
        expectedKind: 'music' as const,
        where: 'battle.music',
        site: 'battle.music',
      },
    ]
    const issues = await validateAssetFileClosure(catalog, refs, {
      readBytes: async (path) => {
        if (path.endsWith('002.mid')) throw new Error('ENOENT')
        return path.endsWith('003.mid') ? new Uint8Array(4) : new Uint8Array(3)
      },
      sha256: (bytes) => (bytes.byteLength === 3 ? 'b'.repeat(64) : hash),
    })
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['missing-file', 'bytes-mismatch', 'hash-mismatch']),
    )
  })

  test('文件闭包也校验未引用 catalog 记录', async () => {
    const unusedCatalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'portrait.unused': {
          kind: 'portrait',
          path: 'assets/authored/unused.png',
          mediaType: 'image/png',
          bytes: 3,
          sha256: hash,
          origin: { kind: 'authored' },
        },
      },
    }
    const issues = await validateAssetFileClosure(unusedCatalog, [], {
      readBytes: async () => {
        throw new Error('ENOENT')
      },
      sha256: () => hash,
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unused-asset', severity: 'warn' }),
        expect.objectContaining({ code: 'missing-file', severity: 'error' }),
      ]),
    )
  })

  test('同一脚本内多次调用同一过场资源时，原始边表保留命令次数，引用站点只显示一处', () => {
    const refs = collectAssetReferences({
      scriptChunks: {
        'scene/s011': {
          version: 1,
          id: 'scene/s011',
          scripts: {
            'scene/s011/root/entity-e195/page-0/trigger/stage-0': [
              { kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 0 },
              { kind: 'wait', ms: 1 },
              { kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 2 },
            ],
            'scene/s011/root/entity-e196/page-0/trigger/stage-0': [
              { kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 4 },
            ],
          },
        },
      },
    })
    expect(refs).toHaveLength(3)
    expect(groupAssetReferencesBySite(refs)).toEqual([
      expect.objectContaining({
        asset: 'frame-animation.pal.003',
        site: 'script:scene/s011:scene/s011/root/entity-e195/page-0/trigger/stage-0',
        occurrences: 2,
      }),
      expect.objectContaining({
        asset: 'frame-animation.pal.003',
        site: 'script:scene/s011:scene/s011/root/entity-e196/page-0/trigger/stage-0',
        occurrences: 1,
      }),
    ])
  })
})
