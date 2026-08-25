import type {
  ActorDef,
  AssetKind,
  AssetRecordV1,
  CurrentManifest,
  SceneDef,
  SpriteDef,
} from '@type-pal/content'
import { runtimeScriptRef } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { collectEditorAssetReferences } from './editor-asset-references.js'
import {
  assertProjectSaveValid,
  collectEditorStatusIssues,
  collectProjectIssues,
  createEditorStatusIssueCollector,
  getRepairableEntryIndexes,
  validateManifestEntryPoints,
} from './project-diagnostics.js'
import type { ScriptEditorState } from './script-editor.js'

const hero = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'hero',
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
    battleSprite: 'battle-sprite.test.hero',
  },
} as ActorDef

const heroSprite = {
  id: 'hero',
  asset: 'sprite.test.hero',
  label: 'Hero',
  layout: { kind: 'directional', framesPerDir: 3 },
} as SpriteDef

function state(overrides: Partial<EditorState> = {}): EditorState & { manifest: CurrentManifest } {
  const manifest: CurrentManifest = {
    id: 'test',
    name: 'Test',
    contentVersion: 17,
    minimumSaveVersion: 8,
    defaultEntryId: 'new-game',
    content: {
      maps: 'content/maps/index.json',
      battleSprites: 'content/battle-sprites.json',
      sharedScripts: 'content/shared-scripts.json',
      worldVariables: 'content/world-variables.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
    entryPoints: [
      {
        id: 'new-game',
        label: '新的故事',
        scene: 's000',
        startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
      },
    ],
  }
  const scenes: SceneDef[] = [
    {
      id: 's000',
      mapId: 'map-000',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    },
  ]
  const base: EditorState & { manifest: CurrentManifest } = {
    manifest,
    scenes,
    actors: [hero],
    skills: [],
    levelUp: {},
    items: [],
    locale: { 'name.hero': '主角' },
    sprites: [heroSprite],
    battleSprites: [
      {
        id: 'battle-sprite.test.hero',
        label: 'Hero Battle',
        asset: 'battle-sprite.test.hero',
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
    maps: {},
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-000', name: 'Map', path: 'content/maps/map-000.json' }],
    },
    tilesetBlobs: {},
    stamps: [],
    scriptChunks: {},
    sharedScripts: {},
    worldVariables: {},
    assetCatalog: {
      version: 1,
      assets: {
        'sprite.test.hero': {
          kind: 'sprite',
          path: 'assets/generated/sprites/hero.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'generated' },
        },
        'battle-sprite.test.hero': {
          kind: 'battle-sprite',
          path: 'assets/generated/battle-sprites/hero.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: 'b'.repeat(64),
          origin: { kind: 'generated' },
        },
      },
    },
    assetBlobs: {},
  }
  return { ...base, ...overrides } as unknown as EditorState & { manifest: CurrentManifest }
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

test('C8 迁移诊断进入统一问题面板并精确跳到物品；能力已补齐时不再提示', () => {
  const diagnostic = {
    version: 1 as const,
    diagnostics: [
      {
        id: 'item-use:story',
        severity: 'warn' as const,
        target: {
          domain: 'item' as const,
          objectId: 'story',
          capability: 'use' as const,
          label: '剧情物品',
        },
        category: 'story-script' as const,
        reason: '需要现代化剧情脚本',
        source: { kind: 'legacy-script' as const, label: 'L_99', address: 99 },
      },
    ],
  }
  const item = {
    id: 'story',
    name: '剧情物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
  const pending = collectProjectIssues(
    state({ items: [item], migrationDiagnostics: diagnostic }),
  ).find((issue) => issue.code === 'migration-pending')
  expect(pending).toMatchObject({
    severity: 'warn',
    path: 'migrationDiagnostics.diagnostics[0]',
    target: { module: 'item', page: 'item', objectId: 'story' },
  })
  expect(pending?.message).toContain('L_99')

  expect(
    collectProjectIssues(
      state({
        items: [
          {
            ...item,
            use: {
              target: 'scene',
              consuming: false,
              effects: [
                {
                  kind: 'runScript',
                  script: { chunk: 'shared/c00', id: 'shared/item/story' },
                },
              ],
            },
          },
        ],
        migrationDiagnostics: diagnostic,
      }),
    ).some((issue) => issue.code === 'migration-pending'),
  ).toBe(false)
})

test('非法投掷效果进入问题面板并被保存门拒绝', () => {
  const invalid = state({
    items: [
      {
        id: 'bad-throw',
        name: '坏投掷物',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        throw: { target: 'oneEnemy', effects: [{ kind: 'healHp', amount: 10 }] },
      } as never,
    ],
  })
  expect(collectProjectIssues(invalid)).toContainEqual(
    expect.objectContaining({
      severity: 'error',
      code: 'invalid-item-data',
      target: { module: 'item', page: 'item', objectId: 'bad-throw' },
    }),
  )
  expect(() => assertProjectSaveValid(invalid)).toThrow(
    /保存前物品数据校验失败.*未知投掷效果 healHp/,
  )
})

describe('X7 项目入口不变式', () => {
  test('直接启动入口必须命中真实入口，不合成兼容入口', () => {
    const manifest = { ...state().manifest, defaultEntryId: 'missing' }
    expect(validateManifestEntryPoints(manifest, state().scenes).map((issue) => issue.code)).toEqual([
      'missing-default-entry',
    ])
    expect(validateManifestEntryPoints(manifest, state().scenes)[0]?.target).toEqual({
      module: 'project',
      page: 'entrypoint',
    })
  })

  test('显式入口点拒绝空表、重复/非规范 id 和不存在场景', () => {
    const manifest: CurrentManifest = {
      ...state().manifest,
      entryPoints: [
        {
          id: ' duplicate ',
          label: 'A',
          scene: 'missing-a',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
        {
          id: 'duplicate',
          label: 'B',
          scene: 'missing-b',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    }
    const codes = validateManifestEntryPoints(manifest, state().scenes).map((issue) => issue.code)
    expect(codes).toContain('noncanonical-entry-id')
    expect(codes).toContain('duplicate-entry-id')
    expect(codes.filter((code) => code === 'missing-entry-point-scene')).toHaveLength(2)
    expect(
      validateManifestEntryPoints(
        { ...manifest, entryPoints: [] } as unknown as CurrentManifest,
        state().scenes,
      ).some(
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
      { id: 'stable', label: '稳定入口', scene: 's000', startWorld: {} },
      { id: ' duplicate ', label: '非规范入口', scene: 's000', startWorld: {} },
      { id: 'duplicate', label: '重复入口 A', scene: 's000', startWorld: {} },
      { id: 'duplicate', label: '重复入口 B', scene: 's000', startWorld: {} },
      { id: '', label: '空入口', scene: 's000', startWorld: {} },
    ]
    expect([...getRepairableEntryIndexes(entries as never)]).toEqual([1, 2, 3, 4])
  })
})

describe('X7 项目诊断与保存门', () => {
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
      ['sprite.unused', assetRecord('sprite', 'sprite-unused')],
    ])
    const manifest: CurrentManifest = {
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
    expect(issues.find((issue) => issue.message.includes('sprite.unused'))?.target).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: 'sprite.unused',
      domain: 'world',
      view: 'asset',
    })
  })

  test('SpriteDef 的缺失/kind 错误资源跳回语义定义，未使用 sprite 仍跳资源对象', () => {
    const base = state()
    const missing = collectProjectIssues({
      ...base,
      sprites: [{ ...heroSprite, asset: 'sprite.missing' }],
      assetCatalog: { version: 1, assets: {} },
    })
    expect(missing.find((issue) => issue.message.includes('sprite.missing'))?.target).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: heroSprite.id,
      domain: 'world',
      view: 'definition',
    })

    const wrongKind = collectProjectIssues({
      ...base,
      sprites: [{ ...heroSprite, asset: 'music.wrong-kind' }],
      assetCatalog: {
        version: 1,
        assets: { 'music.wrong-kind': assetRecord('music', 'wrong-kind') },
      },
    })
    expect(wrongKind.find((issue) => issue.code === 'asset-kind-mismatch')?.target).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: heroSprite.id,
      domain: 'world',
      view: 'definition',
    })
  })

  test('BattleSpriteDef 缺失/kind 错误跳语义定义，未使用资产跳 battle asset 视图', () => {
    const base = state()
    const definition = base.battleSprites[0]!
    const missing = collectProjectIssues({
      ...base,
      battleSprites: [{ ...definition, asset: 'battle-sprite.missing' }],
      assetCatalog: {
        version: 1,
        assets: { 'sprite.test.hero': base.assetCatalog.assets['sprite.test.hero']! },
      },
    })
    expect(
      missing.find((issue) => issue.message.includes('battle-sprite.missing'))?.target,
    ).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: definition.id,
      domain: 'battle',
      view: 'definition',
    })

    const wrongKind = collectProjectIssues({
      ...base,
      battleSprites: [{ ...definition, asset: 'music.wrong-battle-kind' }],
      assetCatalog: {
        version: 1,
        assets: {
          'sprite.test.hero': base.assetCatalog.assets['sprite.test.hero']!,
          'music.wrong-battle-kind': assetRecord('music', 'wrong-battle-kind'),
        },
      },
    })
    expect(
      wrongKind.find((issue) => issue.message.includes('music.wrong-battle-kind'))?.target,
    ).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: definition.id,
      domain: 'battle',
      view: 'definition',
    })

    const unusedAsset = 'battle-sprite.unused'
    const unused = collectProjectIssues({
      ...base,
      assetCatalog: {
        version: 1,
        assets: {
          ...base.assetCatalog.assets,
          [unusedAsset]: {
            ...base.assetCatalog.assets['battle-sprite.test.hero']!,
            path: 'assets/authored/battle-sprites/unused.rle',
            origin: { kind: 'authored' },
          },
        },
      },
    })
    expect(
      unused.find((issue) => issue.code === 'unused-asset' && issue.message.includes(unusedAsset))
        ?.target,
    ).toEqual({
      module: 'asset',
      page: 'sprite',
      objectId: unusedAsset,
      domain: 'battle',
      view: 'asset',
    })
    expect(
      unused.find((issue) => issue.code === 'unused-asset' && issue.message.includes(unusedAsset))
        ?.asset,
    ).toEqual({ id: unusedAsset, actualKind: 'battle-sprite' })
  })

  test('资源诊断保留期望与实际类型，不依赖中文消息分类', () => {
    const base = state()
    const wrongKind = collectProjectIssues({
      ...base,
      sprites: [{ ...heroSprite, asset: 'music.wrong-kind' }],
      assetCatalog: {
        version: 1,
        assets: { 'music.wrong-kind': assetRecord('music', 'wrong-kind') },
      },
    })
    expect(wrongKind.find((issue) => issue.code === 'asset-kind-mismatch')?.asset).toEqual({
      id: 'music.wrong-kind',
      expectedKind: 'sprite',
      actualKind: 'music',
    })
  })

  test('未知 manifest 顶层字段进入统一问题流，现行字段不产生假阳性', () => {
    const base = state()
    expect(
      collectProjectIssues(base).some((issue) => issue.code === 'unknown-manifest-field'),
    ).toBe(false)

    const manifest = {
      ...base.manifest,
      futureField: { enabled: true },
    } as unknown as CurrentManifest
    expect(collectProjectIssues({ ...base, manifest })).toContainEqual({
      severity: 'warn',
      code: 'unknown-manifest-field',
      message: '项目配置包含当前规范未登记的顶层字段 “futureField”',
      path: 'futureField',
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
      battleSprite: 'battle-sprite.test.enemy',
      yPosOffset: 0,
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
      sounds: { action: sound },
    }
    const sceneWithCurrentHooks = Object.assign(structuredClone(base.scenes[0]!), {
      hooks: {
        onEnter: {
          initial: 'sound-test',
          variants: {
            'sound-test': {
              label: '音效测试',
              order: 0,
              flow: {
                kind: 'stages' as const,
                initial: 'start',
                stages: [{ id: 'start', body: [{ kind: 'playSound' as const, asset: sound }] }],
              },
            },
          },
        },
      },
    })
    const withEverySoundSite = state({
      actors: [actor],
      enemies: [enemy],
      battleSprites: [
        ...base.battleSprites,
        {
          id: 'battle-sprite.test.enemy',
          label: 'Enemy Battle',
          asset: 'battle-sprite.test.enemy',
          profile: {
            kind: 'enemy',
            idle: { start: 0, count: 1 },
            magic: { start: 1, count: 1 },
            attack: { start: 2, count: 1 },
            idleTicksPerFrame: 1,
            actTicksPerFrame: 1,
          },
        },
      ],
      items: [
        {
          id: 'item',
          name: 'Item',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'oneAlly' as const,
            consuming: false,
            effects: [{ kind: 'healHp' as const, amount: 1 }],
            sound,
          },
          throw: {
            target: 'oneEnemy' as const,
            effects: [{ kind: 'fixedDamage' as const, amount: 1 }],
            presentation: {
              kind: 'magic' as const,
              animation: { effectSprite: 1, sound },
            },
          },
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
      scenes: [sceneWithCurrentHooks],
      scriptChunks: {
        shared: {
          version: 1,
          id: 'shared',
          scripts: { 'shared/test': [{ kind: 'playSound', asset: sound }] },
        },
      },
      assetCatalog: {
        version: 1,
        assets: {
          ...base.assetCatalog.assets,
          'battle-sprite.test.enemy': {
            kind: 'battle-sprite',
            path: 'assets/generated/battle-sprites/enemy.rle',
            mediaType: 'application/vnd.type-pal.rle',
            bytes: 1,
            sha256: 'c'.repeat(64),
            origin: { kind: 'generated' },
          },
          [sound]: assetRecord('sound', 'used'),
        },
      },
    })
    expect(
      collectProjectIssues(withEverySoundSite).some(
        (issue) => issue.code === 'unused-asset' && issue.message.includes(sound),
      ),
    ).toBe(false)
    expect(collectEditorAssetReferences(withEverySoundSite)).toContainEqual({
      asset: sound,
      expectedKind: 'sound',
      where: 'items[0].throw.presentation.animation.sound',
      site: 'item:item:throw',
    })
    expect(() => assertProjectSaveValid(withEverySoundSite)).not.toThrow()

    const broken = {
      ...withEverySoundSite,
      items: [
        {
          ...withEverySoundSite.items[0]!,
          throw: {
            ...withEverySoundSite.items[0]!.throw!,
            presentation: {
              kind: 'magic' as const,
              animation: { effectSprite: 1, sound: 'sound.missing' },
            },
          },
        },
      ],
    }
    expect(
      collectProjectIssues(broken).find((issue) => issue.message.includes('sound.missing'))?.target,
    ).toEqual({ module: 'asset', page: 'sound', objectId: 'sound.missing' })
    expect(() => assertProjectSaveValid(broken)).toThrow(/保存前资源引用校验失败/)
  })

  test('底部状态诊断合并未引用资产、普通内容引用且不重复入口开局', () => {
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
        entryPoints: [
          {
            ...base.manifest.entryPoints[0],
            startWorld: { ...base.manifest.entryPoints[0].startWorld, party: ['ghost'] },
          },
        ],
      },
    })
    expect(startWorldBroken.filter((issue) => issue.message.includes('ghost')).length).toBe(1)
  })

  test('状态诊断缓存忽略变量作者元数据，但变量结构与其他内容仍会失效', () => {
    const base = state({
      worldVariables: {
        ready: { kind: 'flag', name: '就绪', description: '', initial: false },
      },
    })
    const collect = createEditorStatusIssueCollector()
    const initial = collect(base)
    const metadataOnly = {
      ...base,
      worldVariables: {
        ready: { kind: 'flag' as const, name: '已经就绪', description: '作者说明', initial: true },
      },
    }
    expect(collect(metadataOnly)).toBe(initial)

    const kindChanged = {
      ...metadataOnly,
      worldVariables: {
        ready: { kind: 'number' as const, name: '已经就绪', description: '作者说明', initial: 1 },
      },
    }
    const afterKindChange = collect(kindChanged)
    expect(afterKindChange).not.toBe(initial)
    expect(collect({ ...kindChanged, scenes: [...kindChanged.scenes] })).not.toBe(afterKindChange)

    const baselineBeforeAdd = collect(kindChanged)
    expect(
      collect({
        ...kindChanged,
        worldVariables: {
          ...kindChanged.worldVariables,
          extra: { kind: 'flag', name: '额外变量', description: '', initial: false },
        },
      }),
    ).not.toBe(baselineBeforeAdd)
  })

  test('已声明战场表缺少系统默认 #24 时给出可见警告', () => {
    const base = state()
    const issues = collectEditorStatusIssues({
      ...base,
      manifest: {
        ...base.manifest,
        content: { ...base.manifest.content, battleFields: 'content/battle-fields.json' },
      },
      battleFields: [
        {
          id: 25,
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
    })
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warn', path: 'battleFields[24]' }),
      ]),
    )
  })

  test('保存门拒绝重复或结构不完整的战场定义', () => {
    const base = state()
    const invalid = {
      ...base,
      manifest: {
        ...base.manifest,
        content: { ...base.manifest.content, battleFields: 'content/battle-fields.json' },
      },
      battleFields: [
        {
          id: 24,
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
        {
          id: 24,
          screenWave: 1,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
    }
    expect(() => assertProjectSaveValid(invalid)).toThrow('保存前战场数据校验失败')
  })

  test('状态条按 canonical ScriptId 校验，不把运行时投影内部 ScriptRef 报成悬空', () => {
    const shell = state({
      items: [
        {
          id: 'private',
          name: '私有脚本物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [{ kind: 'runScript', script: runtimeScriptRef('item:private:use') }],
          },
        },
      ],
    })
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [
        {
          id: 'private',
          name: '私有脚本物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: { id: 'use', body: [] },
              },
            ],
          },
        },
      ],
      sharedScripts: {},
    }

    expect(
      collectEditorStatusIssues(shell).some((issue) => issue.message.includes('不在脚本库')),
    ).toBe(true)
    expect(
      collectEditorStatusIssues(shell, canonical).some((issue) =>
        issue.message.includes('不在脚本库'),
      ),
    ).toBe(false)

    const mixedShell = state({
      items: [
        {
          ...shell.items[0]!,
          use: {
            target: 'oneAlly',
            consuming: false,
            effects: [
              { kind: 'runScript', script: runtimeScriptRef('item:private:use') },
              { kind: 'healHp', amount: 1 },
            ],
          },
        },
      ],
    })
    expect(
      collectEditorStatusIssues(mixedShell, canonical).some((issue) =>
        issue.message.includes('必须作为唯一效果'),
      ),
    ).toBe(false)
  })

  test('入口视频和资源角色错误跳到字段唯一作者，而不是悬空资源页', () => {
    const base = state()
    const manifest: CurrentManifest = {
      ...base.manifest,
      defaultEntryId: 'entry:chapter-1',
      assets: {
        ...base.manifest.assets,
        roles: { 'video.startupSplash': 'video.missing' },
      },
      entryPoints: [
        {
          id: 'entry:chapter-1',
          label: '第一章',
          scene: 's000',
          introVideo: 'video.intro',
          startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
        },
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
    const manifest: CurrentManifest = {
      ...base.manifest,
      defaultEntryId: 'dlc',
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

  test('合法项目通过保存门；重复入口和缺失角色资源 fail-loud', () => {
    const base = state()
    expect(() => assertProjectSaveValid(base)).not.toThrow()

    const duplicate: CurrentManifest = {
      ...base.manifest,
      defaultEntryId: 'same',
      entryPoints: [
        {
          id: 'same',
          label: 'A',
          scene: 's000',
          startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
        },
        {
          id: 'same',
          label: 'B',
          scene: 's000',
          startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    }
    expect(() => assertProjectSaveValid({ ...base, manifest: duplicate })).toThrow(
      /入口点 id.*重复/,
    )

    const brokenRole: CurrentManifest = {
      ...base.manifest,
      assets: { ...base.manifest.assets, roles: { 'video.startupSplash': 'missing' } },
    }
    expect(() => assertProjectSaveValid({ ...base, manifest: brokenRole })).toThrow(
      /保存前资源角色校验失败/,
    )

    const brokenChunk: EditorState = {
      ...base,
      scriptChunks: {
        c: {
          version: 1,
          id: 'c',
          scripts: {
            bad: [{ kind: 'setFollowers', sprites: ['missing-sprite'] }],
          },
        },
      },
    }
    expect(() => assertProjectSaveValid(brokenChunk)).toThrow(
      /保存前内容引用校验失败.*missing-sprite/,
    )
  })

  test('初始队伍、道具和每名角色的技能都拒绝重复 id', () => {
    const base = state({
      skills: [
        {
          id: 'skill-a',
          name: '技能甲',
          desc: '',
          cost: {},
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [],
          animation: { effectSprite: 0 },
        },
      ],
      items: [
        {
          id: 'item-a',
          name: '道具甲',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
        },
      ],
    })
    const manifest: CurrentManifest = {
      ...base.manifest,
      entryPoints: [
        {
          ...base.manifest.entryPoints[0],
          startWorld: {
            party: ['hero', 'hero'],
            money: 0,
            learnedSkills: { hero: ['skill-a', 'skill-a'] },
            inventory: [
              { itemId: 'item-a', count: 1 },
              { itemId: 'item-a', count: 2 },
            ],
          },
        },
      ],
    }
    const duplicateIssues = collectProjectIssues({ ...base, manifest }).filter(
      (issue) => issue.code === 'invalid-start-world' && issue.severity === 'error',
    )
    expect(duplicateIssues.map((issue) => issue.path)).toEqual([
      'entryPoints[0].startWorld.party[1]',
      'entryPoints[0].startWorld.inventory[1].itemId',
      'entryPoints[0].startWorld.learnedSkills.hero[1]',
    ])
    expect(() => assertProjectSaveValid({ ...base, manifest })).toThrow(
      /保存前开局数据校验失败.*重复/,
    )
  })

  test('content17 保存门要求 registry 路径，并阻断未登记与错型变量引用', () => {
    const legacy = state()
    const current: EditorState = {
      ...legacy,
      manifest: {
        ...legacy.manifest,
        contentVersion: 17,
        minimumSaveVersion: 8,
        content: {
          ...legacy.manifest.content,
          worldVariables: 'content/world-variables.json',
        },
      },
      worldVariables: {},
      sharedScripts: {
        test: {
          name: '测试',
          self: 'none',
          body: [{ kind: 'setVar', var: 'score', value: 1 }],
        },
      },
    }
    expect(() => assertProjectSaveValid(current)).toThrow(
      /保存前世界变量校验失败.*score.*未在.*登记/,
    )

    current.worldVariables = {
      score: { kind: 'flag', name: '错误类型', description: '', initial: false },
    }
    expect(() => assertProjectSaveValid(current)).toThrow(
      /保存前世界变量校验失败.*score.*flag.*number/,
    )

    const { worldVariables: _worldVariablesPath, ...contentWithoutVariables } =
      current.manifest.content
    const missingPath: EditorState = {
      ...current,
      manifest: {
        ...current.manifest,
        content: contentWithoutVariables,
      },
    }
    expect(() => assertProjectSaveValid(missingPath)).toThrow(/manifest 缺 worldVariables/)
  })
})
