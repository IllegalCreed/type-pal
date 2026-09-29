/**
 * TEST-GLM-LARGE-WAVE-4 D02 白名单 fixture：auditPalSoundReferences 的最小合法工程内容。
 * 全部经当前 content validators 校验（validateAssetCatalog/Actors/Enemies/Skills/…），
 * 提取源侧为显式 legacy 数字向量。这是合成样本，不得当作原版实测。
 * 仅测试导入，不进生产。
 */
import type {
  AssetCatalogV1,
  AssetId,
  AssetRecordV1,
  BattleSpriteDef,
  EnemyDef,
  ItemData,
  SceneDef,
  SceneIndexV1,
  ScriptIndexV1,
  SkillData,
  SpriteDef,
  TilesetDef,
} from '@type-pal/content'
import {
  validateActors,
  validateAuthorItemCore,
  validateBattleSprites,
  validateEnemies,
  validateSceneIndex,
  validateScenes,
  validateSkills,
  validateSprites,
  validateTilesets,
} from '@type-pal/content'
import type { PalMigrationSources } from '../../pal-migration.js'
import type { TranslateReport } from '../../translate-events.js'

function record(id: AssetId, kind: AssetRecordV1['kind']): [AssetId, AssetRecordV1] {
  const digest = Array.from({ length: 64 }, (_, index) =>
    ((index + id.length) % 16).toString(16),
  ).join('')
  return [
    id,
    {
      kind,
      path: `assets/generated/${id}.bin`,
      mediaType: 'application/octet-stream',
      bytes: 16,
      sha256: digest,
      origin: { kind: 'generated' },
    },
  ]
}

export interface SoundAuditInputs {
  sources: PalMigrationSources
  files: ReadonlyMap<string, unknown>
  assets: { catalog: string; roles: Record<string, never> }
  entryPoints: [
    {
      id: string
      label: string
      scene: string
      startWorld: { party: never[]; money: number; inventory: never[] }
    },
  ]
  translationReport: TranslateReport
  /** 断言辅助：输入深快照。 */
  snapshot: () => boolean
}

/** 组装最小合法工程内容 + 显式 legacy 源向量；返回 audit 入参与文件表。 */
export function soundAuditFixture(
  options: {
    /** 敌目标 magic 音是否按负源语义带 suppress 标记（默认遵守，可注入违例）。 */
    enemySuppress?: boolean
    enemyMagicAsset?: AssetId
  } = {},
): SoundAuditInputs {
  const suppress = options.enemySuppress ?? true
  const enemyMagicAsset = options.enemyMagicAsset ?? 'sound.pal.002'

  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries([
      record('sprite.pal.001', 'sprite'),
      record('battle.pal.001', 'battle-sprite'),
      record('tileset.pal.001', 'tileset'),
      record('sound.pal.001', 'sound'),
      record('sound.pal.002', 'sound'),
    ]),
  }
  const sprites = validateSprites(
    [
      {
        id: 'walk',
        label: '行走',
        asset: 'sprite.pal.001',
        layout: { kind: 'directional', framesPerDir: 3 },
      } satisfies SpriteDef,
    ],
    catalog,
  )
  const battleSprites = validateBattleSprites(
    [
      {
        id: 'fighter',
        label: '敌人形象',
        asset: 'battle.pal.001',
        profile: {
          kind: 'enemy',
          idle: { start: 0, count: 1 },
          magic: { start: 1, count: 1 },
          attack: { start: 2, count: 1 },
          idleTicksPerFrame: 1,
          actTicksPerFrame: 1,
        },
      } satisfies BattleSpriteDef,
    ],
    catalog,
  )
  const tilesets = validateTilesets(
    [
      {
        id: 'tiles',
        name: '图块',
        category: 'builtin',
        asset: 'tileset.pal.001',
      } satisfies TilesetDef,
    ],
    catalog,
  )
  const actors = validateActors([
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'walk',
      battler: {
        baseStats: {
          level: 1,
          hp: 10,
          maxHP: 10,
          mp: 5,
          maxMP: 5,
          attack: 5,
          defense: 5,
          magicAttack: 5,
          speed: 5,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
        battleSprite: 'fighter',
        sounds: { attack: 'sound.pal.001' },
      },
    },
  ])
  const enemies = validateEnemies([
    {
      id: 'enemy-0',
      name: 'name.enemy',
      battleSprite: 'fighter',
      yPosOffset: 0,
      stats: {
        health: 10,
        level: 1,
        exp: 1,
        cash: 1,
        attackStrength: 2,
        magicStrength: 2,
        defense: 2,
        dexterity: 2,
        fleeRate: 0,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        physicalResistance: 0,
        dualMove: false,
        collectValue: 0,
      },
      ai: { resistanceToSorcery: 0 },
      sounds: {
        magic: enemyMagicAsset,
        ...(suppress ? { suppressMagicEffectSound: true } : {}),
      },
    } satisfies EnemyDef,
  ])
  const items = validateAuthorItemCore([
    {
      id: '151',
      name: 'item.151',
      desc: [],
      buyPrice: 1,
      sellPrice: 1,
      sellable: true,
      use: {
        target: 'oneAlly',
        consuming: true,
        sound: 'sound.pal.001',
        effects: [{ kind: 'healHp', amount: 1 }],
      },
      throw: {
        target: 'oneEnemy',
        sound: 'sound.pal.002',
        effects: [{ kind: 'fixedDamage', amount: 1 }],
      },
    } satisfies ItemData,
  ])
  const { skills } = validateSkills({
    skills: [
      {
        id: '1',
        name: 'skill.1',
        desc: '召唤演示',
        cost: { mp: 1 },
        target: 'oneEnemy',
        usableOutsideBattle: false,
        animation: { effectSprite: 0, sound: 'sound.pal.001' },
        effects: [{ kind: 'summon', battleSprite: 'fighter', sound: 'sound.pal.002' }],
      } satisfies SkillData,
    ],
    levelUp: {},
  })
  const sceneIndex = validateSceneIndex({
    version: 1,
    scenes: [{ id: 's001', name: '场景一', path: 'content/scenes/s001.json' }],
  } satisfies SceneIndexV1)
  const scenes = validateScenes([
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    } satisfies SceneDef,
  ])
  const scriptIndex: ScriptIndexV1 = {
    version: 1,
    shards: { shared: 8, global: {} },
    chunks: {},
  }
  const files = new Map<string, unknown>([
    ['assets/index.json', catalog],
    ['content/actors.json', actors],
    ['content/enemies.json', enemies],
    ['content/items.json', items],
    ['content/skills.json', { skills, levelUp: {} }],
    ['content/sprites.json', sprites],
    ['content/tilesets.json', tilesets],
    ['content/battle-sprites.json', battleSprites],
    ['content/battle-fields.json', []],
    ['content/scenes/index.json', sceneIndex],
    ['content/scenes/s001.json', scenes[0]],
    ['content/scripts/index.json', scriptIndex],
  ])

  const sources: PalMigrationSources = {
    migrate: {
      roles: [
        {
          id: 0,
          _name: '李逍遥',
          avatar: 0,
          spriteNum: 1,
          spriteNumInBattle: 1,
          walkFrames: 4,
          level: 1,
          hp: 10,
          maxHP: 10,
          mp: 5,
          maxMP: 5,
          attackStrength: 5,
          magicStrength: 5,
          defense: 5,
          dexterity: 5,
          fleeRate: 0,
          equipment: [],
          magic: [],
          coveredBy: 0,
          attackSound: 1,
          weaponSound: 0,
          criticalSound: 1,
          magicSound: 0,
          coverSound: 0,
          dyingSound: 0,
          deathSound: 2,
        },
      ],
      levelUpExp: [],
      levelUpMagic: [],
      spells: [
        {
          id: 1,
          magicNumber: 10,
          scriptOnSuccess: 0,
          scriptOnUse: 0,
          scriptDesc: 0,
          _name: '召唤',
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: false,
          },
        },
      ],
      magic: [
        { id: 10, type: 'summon', costMP: 1, baseDamage: 0, elemental: 0, effect: 11, sound: 2 },
        { id: 11, type: 'normal', costMP: 0, baseDamage: 5, elemental: 0, effect: 0, sound: 1 },
      ],
      items: [],
      commands: [],
      enemies: [
        {
          id: 5,
          idleFrames: 3,
          magicFrames: 3,
          attackFrames: 3,
          idleAnimSpeed: 1,
          actWaitFrames: 1,
          yPosOffset: 0,
          attackSound: 2,
          actionSound: 0,
          magicSound: -2,
          deathSound: 1,
          callSound: 0,
          health: 10,
          exp: 1,
          cash: 1,
          level: 1,
          magic: 0,
          magicRate: 0,
          attackEquivItem: 0,
          attackEquivItemRate: 0,
          stealItem: 0,
          stealItemCount: 0,
          attackStrength: 2,
          magicStrength: 2,
          defense: 2,
          dexterity: 2,
          fleeRate: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          physicalResistance: 0,
          dualMove: 0,
          collectValue: 0,
        },
      ],
      enemyObjects: [
        {
          objectIndex: 0,
          enemyId: 5,
          resistanceToSorcery: 0,
          scriptOnTurnStart: 0,
          scriptOnBattleEnd: 0,
          scriptOnReady: 0,
        },
      ],
      enemyTeams: [],
    },
    allJson: { segments: [] },
    allJsonPrettyBytes: 0,
    scenes: [{ sceneId: 0, mapNum: 1, eventObjects: [] }],
    eventsByScene: new Map(),
    tilemaps: [],
    objectPlayers: [],
    musicMidi: [],
    assetCatalog: catalog,
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
    } as PalMigrationSources['assetReport'],
    battleEffectIndex: [],
    battleFields: [],
    objectPoisons: [],
    stores: [],
  }

  const translationReport: TranslateReport = {
    chains: 0,
    stages: 0,
    commands: 0,
    notes: {},
    knownNoOps: { 'playSound.emptyChunk': 1 },
    knownNoOpDetails: [
      {
        key: 'playSound.emptyChunk',
        sourceAddress: 0x1234,
        legacyId: 122,
        owner: 's001',
        path: 'entities[0].pages[0].auto.stages[0].body[0]',
      },
    ],
    segmentTransferDetails: [],
    instructionOutcomes: [],
    resolved: {},
    resolvedAddressTargets: [],
    gaps: [],
    flowCuts: 0,
  }

  const snapshotBefore = JSON.stringify({ sources, files: [...files.entries()] })
  return {
    sources,
    files,
    assets: { catalog: 'assets/index.json', roles: {} },
    entryPoints: [
      {
        id: 'main',
        label: '入口',
        scene: 's001',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    translationReport,
    snapshot: () => JSON.stringify({ sources, files: [...files.entries()] }) === snapshotBefore,
  }
}
