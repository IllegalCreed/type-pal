import type {
  ActorDef,
  AssetKind,
  AssetRecordV1,
  LoadedManifest,
  SceneDef,
  SpriteDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  assertProjectSaveValid,
  collectEditorStatusIssues,
  collectProjectIssues,
  getRepairableEntryIndexes,
  resolveProjectEntryPoints,
  validateManifestEntryPoints,
} from './project-diagnostics.js'

const hero = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'hero',
  portraits: { default: 1 },
  battler: {
    baseStats: {
      level: 1,
      hp: 100,
      maxHP: 100,
      mp: 30,
      maxMP: 30,
      attack: 10,
      defense: 10,
      magicAttack: 10,
      speed: 10,
      luck: 10,
    },
    initialEquipment: {},
    initialMagic: [],
  },
} as ActorDef

const heroSprite = {
  id: 'hero',
  spriteNum: 1,
  label: 'Hero',
  layout: { kind: 'directional', framesPerDir: 3 },
} as SpriteDef

function state(overrides: Partial<EditorState> = {}): EditorState {
  const manifest: LoadedManifest = {
    id: 'test',
    name: 'Test',
    contentVersion: 3,
    entryScene: 's000',
    content: { maps: 'content/maps/index.json' },
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
  }
  const scenes: SceneDef[] = [
    {
      id: 's000',
      mapId: 'map-000',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    },
  ]
  const base: EditorState = {
    manifest,
    scenes,
    actors: [hero],
    skills: [],
    levelUp: {},
    items: [],
    locale: { 'name.hero': '主角' },
    sprites: [heroSprite],
    startWorld: manifest.startWorld,
    maps: {},
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-000', name: 'Map', path: 'content/maps/map-000.json' }],
    },
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  }
  return { ...base, ...overrides }
}

function assetRecord(kind: AssetKind, stem: string): AssetRecordV1 {
  return {
    kind,
    path: `assets/authored/${stem}.bin`,
    mediaType: 'application/octet-stream',
    bytes: 0,
    sha256: 'a'.repeat(64),
    origin: { kind: 'authored' },
  }
}

describe('X7 工程入口不变式', () => {
  test('缺省 entryPoints 只合成 UI 入口，不改 manifest，也不重复报告缺场景', () => {
    const manifest = { ...state().manifest, entryScene: 'missing' }
    expect(resolveProjectEntryPoints(manifest)).toEqual([
      { id: 'new-game', label: '开始游戏', scene: 'missing' },
    ])
    expect(manifest.entryPoints).toBeUndefined()
    expect(
      validateManifestEntryPoints(manifest, state().scenes).map((issue) => issue.code),
    ).toEqual(['missing-entry-scene'])
    expect(validateManifestEntryPoints(manifest, state().scenes)[0]?.target).toEqual({
      module: 'project',
      page: 'entrypoint',
    })
  })

  test('显式入口点拒绝空表、重复/非规范 id 和不存在场景', () => {
    const manifest: LoadedManifest = {
      ...state().manifest,
      entryPoints: [
        { id: ' duplicate ', label: 'A', scene: 'missing-a' },
        { id: 'duplicate', label: 'B', scene: 'missing-b' },
      ],
    }
    const codes = validateManifestEntryPoints(manifest, state().scenes).map((issue) => issue.code)
    expect(codes).toContain('noncanonical-entry-id')
    expect(codes).toContain('duplicate-entry-id')
    expect(codes.filter((code) => code === 'missing-entry-point-scene')).toHaveLength(2)
    expect(
      validateManifestEntryPoints({ ...manifest, entryPoints: [] }, state().scenes).some(
        (issue) => issue.code === 'empty-entry-points',
      ),
    ).toBe(true)
    expect(
      validateManifestEntryPoints(manifest, state().scenes).find(
        (issue) => issue.code === 'duplicate-entry-id',
      )?.target,
    ).toEqual({ module: 'project', page: 'entrypoint' })
  })

  test('损坏恢复只开放坏 id，合法唯一入口仍保持只读', () => {
    const entries = [
      { id: 'stable', label: '稳定入口', scene: 's000' },
      { id: ' duplicate ', label: '非规范入口', scene: 's000' },
      { id: 'duplicate', label: '重复入口 A', scene: 's000' },
      { id: 'duplicate', label: '重复入口 B', scene: 's000' },
      { id: '', label: '空入口', scene: 's000' },
    ]
    expect([...getRepairableEntryIndexes(entries)]).toEqual([1, 2, 3, 4])
  })
})

describe('X7 工程诊断与保存门', () => {
  test('未引用音乐和帧动画跳到资源模块的具体对象', () => {
    const base = state()
    const musicIds = [
      'music.bound.1',
      'music.bound.2',
      'music.bound.3',
      'music.bound.4',
      'music.bound.5',
    ]
    const assets = Object.fromEntries([
      ['soundfont.bound', assetRecord('soundfont', 'soundfont-bound')],
      ...musicIds.map((id) => [id, assetRecord('music', id)] as const),
      ['music.unused', assetRecord('music', 'music-unused')],
      ['sound.unused', assetRecord('sound', 'sound-unused')],
      ['rng.unused', assetRecord('frame-animation', 'rng-unused')],
    ])
    const manifest: LoadedManifest = {
      ...base.manifest,
      assets: {
        ...base.manifest.assets,
        roles: {
          'audio.midiSoundfont': 'soundfont.bound',
          'audio.defaultBattleMusic': musicIds[0]!,
          'audio.bossVictoryMusic': musicIds[1]!,
          'audio.normalVictoryMusic': musicIds[2]!,
          'audio.openingMenuMusic': musicIds[3]!,
        },
      },
    }
    const issues = collectProjectIssues({
      ...base,
      manifest,
      assetCatalog: { version: 1, assets },
    })
    expect(issues.find((issue) => issue.message.includes('music.unused'))?.target).toEqual({
      module: 'asset',
      page: 'music',
      objectId: 'music.unused',
    })
    expect(issues.find((issue) => issue.message.includes('rng.unused'))?.target).toEqual({
      module: 'asset',
      page: 'cutscene',
      objectId: 'rng.unused',
    })
    expect(issues.find((issue) => issue.message.includes('sound.unused'))?.target).toEqual({
      module: 'asset',
      page: 'sound',
      objectId: 'sound.unused',
    })
  })

  test('Actor/Enemy/Item/Skill/Script 音效引用共用 typed walker，缺失项拒绝保存', () => {
    const base = state()
    const sound = 'sound.used'
    const actor: ActorDef = {
      ...hero,
      battler: { ...hero.battler!, sounds: { attack: sound } },
    }
    const enemy = {
      id: 'enemy',
      name: 'enemy',
      spriteNum: 1,
      stats: {
        health: 1,
        level: 1,
        exp: 0,
        cash: 0,
        attackStrength: 1,
        magicStrength: 1,
        defense: 1,
        dexterity: 1,
        fleeRate: 1,
        physicalResistance: 0,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        dualMove: false,
        collectValue: 0,
      },
      ai: { resistanceToSorcery: 0 },
      anim: {
        idleFrames: 1,
        magicFrames: 1,
        attackFrames: 1,
        idleAnimSpeed: 1,
        actWaitFrames: 1,
        yPosOffset: 0,
      },
      sounds: { action: sound },
    }
    const withEverySoundSite = state({
      actors: [actor],
      enemies: [enemy],
      items: [
        {
          id: 'item',
          name: 'Item',
          desc: [],
          icon: 0,
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { consuming: false, effects: [], sound },
        },
      ],
      skills: [
        {
          id: 'skill',
          name: 'Skill',
          desc: '',
          cost: {},
          usableOutsideBattle: false,
          target: 'self',
          effects: [],
          animation: { effectSprite: 1, sound },
        },
      ],
      scenes: [
        {
          ...base.scenes[0]!,
          onEnter: [{ body: [{ kind: 'playSound', asset: sound }] }],
        },
      ],
      scriptChunks: {
        shared: {
          version: 1,
          id: 'shared',
          scripts: { 'shared/test': [{ kind: 'playSound', asset: sound }] },
        },
      },
      assetCatalog: { version: 1, assets: { [sound]: assetRecord('sound', 'used') } },
    })
    expect(
      collectProjectIssues(withEverySoundSite).some(
        (issue) => issue.code === 'unused-asset' && issue.message.includes(sound),
      ),
    ).toBe(false)
    expect(() => assertProjectSaveValid(withEverySoundSite)).not.toThrow()

    const broken = {
      ...withEverySoundSite,
      items: [
        {
          ...withEverySoundSite.items[0]!,
          use: { consuming: false, effects: [], sound: 'sound.missing' },
        },
      ],
    }
    expect(
      collectProjectIssues(broken).find((issue) => issue.message.includes('sound.missing'))?.target,
    ).toEqual({ module: 'asset', page: 'sound', objectId: 'sound.missing' })
    expect(() => assertProjectSaveValid(broken)).toThrow(/保存前资源引用校验失败/)
  })

  test('底部状态诊断合并未引用资产、普通内容引用且不重复 startWorld', () => {
    const base = state({
      assetCatalog: {
        version: 1,
        assets: { 'rng.unused': assetRecord('frame-animation', 'rng-unused') },
      },
      scenes: [
        {
          ...state().scenes[0]!,
          mapId: 'map.missing',
        },
      ],
    })
    const status = collectEditorStatusIssues(base)
    expect(status.some((issue) => issue.message.includes('rng.unused'))).toBe(true)
    expect(status.some((issue) => issue.message.includes('map.missing'))).toBe(true)

    const startWorldBroken = collectEditorStatusIssues({
      ...base,
      manifest: {
        ...base.manifest,
        startWorld: { ...base.manifest.startWorld, party: ['ghost'] },
      },
      startWorld: { ...base.startWorld, party: ['ghost'] },
    })
    expect(startWorldBroken.filter((issue) => issue.message.includes('ghost')).length).toBe(1)
  })

  test('入口视频和资源角色错误跳到字段唯一作者，而不是悬空资源页', () => {
    const base = state()
    const manifest: LoadedManifest = {
      ...base.manifest,
      assets: {
        ...base.manifest.assets,
        roles: { 'video.startupSplash': 'video.missing' },
      },
      entryPoints: [
        { id: 'entry:chapter-1', label: '第一章', scene: 's000', introVideo: 'video.intro' },
      ],
    }
    const issues = collectProjectIssues({ ...base, manifest })
    expect(issues.find((issue) => issue.code === 'missing-role-asset')?.target).toEqual({
      module: 'project',
      page: 'startup',
    })
    expect(issues.find((issue) => issue.code === 'missing-intro-video')?.target).toEqual({
      module: 'project',
      page: 'entrypoint',
      objectId: 'entry:chapter-1',
    })
  })

  test('seedStats 只接受已存在角色的非负整数，入口覆盖错误跳回稳定入口 id', () => {
    const base = state()
    const manifest: LoadedManifest = {
      ...base.manifest,
      entryPoints: [
        {
          id: 'dlc',
          label: 'DLC',
          scene: 's000',
          startWorld: {
            party: ['hero'],
            money: 0,
            learnedSkills: {},
            inventory: [],
            seedStats: { hero: { hp: 1.5 }, ghost: { mp: 1 } },
          },
        },
      ],
    }
    const issues = collectProjectIssues({ ...base, manifest })
    const seedIssues = issues.filter(
      (issue) => issue.code === 'invalid-start-world' && issue.path.includes('seedStats'),
    )
    expect(seedIssues).toHaveLength(2)
    expect(seedIssues.every((issue) => issue.target?.objectId === 'dlc')).toBe(true)
    expect(() => assertProjectSaveValid({ ...base, manifest })).toThrow(/保存前开局数据校验失败/)
  })

  test('合法工程通过保存门；重复入口和缺失角色资源 fail-loud', () => {
    const base = state()
    expect(() => assertProjectSaveValid(base)).not.toThrow()

    const duplicate: LoadedManifest = {
      ...base.manifest,
      entryPoints: [
        { id: 'same', label: 'A', scene: 's000' },
        { id: 'same', label: 'B', scene: 's000' },
      ],
    }
    expect(() => assertProjectSaveValid({ ...base, manifest: duplicate })).toThrow(
      /入口点 id.*重复/,
    )

    const brokenRole: LoadedManifest = {
      ...base.manifest,
      assets: { ...base.manifest.assets, roles: { 'video.startupSplash': 'missing' } },
    }
    expect(() => assertProjectSaveValid({ ...base, manifest: brokenRole })).toThrow(
      /保存前资源角色校验失败/,
    )
  })

  test('初始队伍、道具和每名角色的技能都拒绝重复 id', () => {
    const base = state()
    const manifest: LoadedManifest = {
      ...base.manifest,
      startWorld: {
        party: ['hero', 'hero'],
        money: 0,
        learnedSkills: { hero: ['skill-a', 'skill-a'] },
        inventory: [
          { itemId: 'item-a', count: 1 },
          { itemId: 'item-a', count: 2 },
        ],
      },
    }
    const duplicateIssues = collectProjectIssues({ ...base, manifest }).filter(
      (issue) => issue.code === 'invalid-start-world' && issue.severity === 'error',
    )
    expect(duplicateIssues.map((issue) => issue.path)).toEqual([
      'startWorld.party[1]',
      'startWorld.inventory[1].itemId',
      'startWorld.learnedSkills.hero[1]',
    ])
    expect(() => assertProjectSaveValid({ ...base, manifest })).toThrow(
      /保存前开局数据校验失败.*重复/,
    )
  })
})
