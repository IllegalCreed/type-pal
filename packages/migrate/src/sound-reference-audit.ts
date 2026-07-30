import {
  type AssetKind,
  type AssetReference,
  collectAssetReferences,
  type EntryPoint,
  type ItemData,
  type ManifestAssetConfigV3,
  palSoundAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upgradeItemsV7ToV8,
  upgradeItemsV8ToV9,
  validateActors,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateBattleSprites,
  validateEnemies,
  validateItemsV5,
  validateScenes,
  validateSkills,
  validateSprites,
  validateTilesets,
} from '@type-pal/content'
import type { SourceMagic, SourceSpell } from './migrate-content.js'
import type { MigrationJson, PalMigrationSources } from './pal-migration.js'
import type { TranslateReport } from './translate-events.js'

type StaticImageKind = Extract<AssetKind, 'portrait' | 'face' | 'item-icon' | 'battle-background'>

export interface StaticImageKindAudit {
  records: number
  bytes: number
  edges: number
  referenced: number
  unused: number
  unusedIds: string[]
}

export interface StaticImageReferenceAudit {
  byKind: Record<StaticImageKind, StaticImageKindAudit>
  records: number
  bytes: number
  edges: number
  referenced: number
  unused: number
  unusedIds: string[]
}

export interface SoundValueChannelAudit {
  sites: number
  nonzero: number
  positive: number
  zero: number
  negative: number
}

export interface PalSoundReferenceAudit {
  source: {
    channels: {
      actors: SoundValueChannelAudit
      enemies: SoundValueChannelAudit
      skillAnimation: SoundValueChannelAudit
      skillSummon: SoundValueChannelAudit
      playSound: SoundValueChannelAudit
    }
    sites: number
    nonzero: number
    uniqueAbsoluteIds: number
    empty122Occurrences: number
    playSound45Occurrences: number
  }
  target: {
    channels: {
      actors: number
      enemies: number
      skillAnimation: number
      skillSummon: number
      playSound: number
      itemUse: number
      itemThrow: number
      roles: number
    }
    soundEdges: number
    allReferences: number
    nonSoundReferences: number
    catalogSounds: number
    referencedSounds: number
    unusedSounds: number
    unusedSoundIds: string[]
    warnings: number
    missing: number
    kindMismatch: number
    hasFake122Asset: boolean
    staticImages: StaticImageReferenceAudit
  }
  recovery: {
    droppedEmptySounds: Array<{
      legacyId: number
      sourceAddress?: number
      owner: string
      path: string
    }>
    skill377Sound: string | undefined
    item151UseSound: string | undefined
    itemThrowSoundEdges: number
    negativeEnemyMagicSites: number
    negativeEnemySemanticViolations: string[]
  }
}

function required(files: ReadonlyMap<string, MigrationJson>, path: string): unknown {
  if (!files.has(path)) throw new Error(`音效引用审计缺文件 ${path}`)
  return files.get(path)
}

function summarize(values: readonly number[]): SoundValueChannelAudit {
  return {
    sites: values.length,
    nonzero: values.filter((value) => value !== 0).length,
    positive: values.filter((value) => value > 0).length,
    zero: values.filter((value) => value === 0).length,
    negative: values.filter((value) => value < 0).length,
  }
}

function legacySoundNumber(asset: string): number {
  const match = /^sound\.pal\.(\d+)$/.exec(asset)
  if (!match) throw new Error(`PAL 纯生成出现非 PAL sound AssetId: ${asset}`)
  return Number(match[1])
}

function targetChannel(
  reference: AssetReference,
): keyof PalSoundReferenceAudit['target']['channels'] {
  const { where } = reference
  if (/^actors\[\d+\]\.battler\.sounds\./.test(where)) return 'actors'
  if (/^enemies\[\d+\]\.sounds\./.test(where)) return 'enemies'
  if (/^skills\[\d+\]\.animation\.sound$/.test(where)) return 'skillAnimation'
  if (/^skills\[\d+\]\.effects\[\d+\]\.sound$/.test(where)) return 'skillSummon'
  if (/^items\[\d+\]\.use\.sound$/.test(where)) return 'itemUse'
  if (/^items\[\d+\]\.throw\.(?:sound|presentation\.animation\.sound)$/.test(where))
    return 'itemThrow'
  if (where.startsWith('manifest.assets.roles.')) return 'roles'
  if (where.endsWith('.asset')) return 'playSound'
  throw new Error(`未分类 sound 引用: ${where}`)
}

function sourceSkillSounds(
  skills: readonly { id: string }[],
  spells: readonly SourceSpell[],
  magic: readonly SourceMagic[],
): { animation: number[]; summon: number[] } {
  const spellById = new Map(spells.map((spell) => [spell.id, spell]))
  const magicById = new Map(magic.map((entry) => [entry.id, entry]))
  const animation: number[] = []
  const summon: number[] = []
  for (const skill of skills) {
    const spell = spellById.get(Number(skill.id))
    if (!spell) throw new Error(`PAL 目标技能 ${skill.id} 无提取源 spell`)
    const primary = magicById.get(spell.magicNumber)
    if (!primary) throw new Error(`PAL spell ${spell.id} 缺 magic ${spell.magicNumber}`)
    const animationMagic =
      primary.type === 'summon' ? (magicById.get(primary.effect) ?? primary) : primary
    animation.push(animationMagic.sound ?? 0)
    if (primary.type === 'summon') summon.push(primary.sound ?? 0)
  }
  return { animation, summon }
}

/**
 * 权威 PAL SFX 账本：源位点与目标引用边分别计算，禁止把 site/edge/unique 混成一个数字。
 * `files` 必须是纯生成 theirs；作者合并 target 可自由增删引用，只走通用闭包校验。
 */
export function auditPalSoundReferences(args: {
  sources: PalMigrationSources
  files: ReadonlyMap<string, MigrationJson>
  /** 可用 R13-3 successor items 覆盖 immutable v7 parent 中的同一路径。 */
  items?: unknown
  /** buildPalMigration 是 immutable R13-3 parent；只允许显式声明后做 v7→v8 投掷归一。 */
  itemContentVersion: 7 | 8 | 9
  assets: ManifestAssetConfigV3
  entryPoints?: readonly EntryPoint[]
  translationReport: TranslateReport
}): PalSoundReferenceAudit {
  const { files, sources } = args
  const catalog = validateAssetCatalog(required(files, 'assets/index.json'))
  const actors = validateActors(required(files, 'content/actors.json'))
  const enemies = validateEnemies(required(files, 'content/enemies.json'))
  const rawItems = args.items ?? required(files, 'content/items.json')
  const items = validateItemsV5(
    args.itemContentVersion === 7
      ? upgradeItemsV8ToV9(upgradeItemsV7ToV8(rawItems))
      : args.itemContentVersion === 8
        ? upgradeItemsV8ToV9(rawItems)
        : rawItems,
  )
  const battleFields = required(files, 'content/battle-fields.json') as never
  const skills = validateSkills(required(files, 'content/skills.json')).skills
  const sprites = validateSprites(required(files, 'content/sprites.json'), catalog)
  const tilesets = validateTilesets(required(files, 'content/tilesets.json'), catalog)
  const battleSprites = validateBattleSprites(
    required(files, 'content/battle-sprites.json'),
    catalog,
  )
  const sceneIds = required(files, 'content/scenes/index.json') as string[]
  const scenes = validateScenes(sceneIds.map((id) => required(files, `content/scenes/${id}.json`)))
  const scriptIndex = required(files, 'content/scripts/index.json') as ScriptIndexV1
  const scriptChunks: Record<string, ScriptChunkV1> = {}
  for (const [id, meta] of Object.entries(scriptIndex.chunks))
    scriptChunks[id] = required(files, `content/scripts/${meta.path}`) as ScriptChunkV1

  const references = collectAssetReferences({
    assets: args.assets,
    entryPoints: args.entryPoints,
    scenes,
    scriptChunks,
    actors,
    enemies,
    items: items as unknown as ItemData[],
    skills,
    battleFields,
    battleSprites,
    sprites,
    tilesets,
  })
  const soundReferences = references.filter((reference) => reference.expectedKind === 'sound')
  const channels: PalSoundReferenceAudit['target']['channels'] = {
    actors: 0,
    enemies: 0,
    skillAnimation: 0,
    skillSummon: 0,
    playSound: 0,
    itemUse: 0,
    itemThrow: 0,
    roles: 0,
  }
  for (const reference of soundReferences) channels[targetChannel(reference)]++

  const closure = validateAssetReferenceClosure(catalog, references)
  const staticKinds: StaticImageKind[] = ['portrait', 'face', 'item-icon', 'battle-background']
  const staticImageByKind = Object.fromEntries(
    staticKinds.map((kind) => {
      const records = Object.entries(catalog.assets).filter(([, record]) => record.kind === kind)
      const kindReferences = references.filter((reference) => reference.expectedKind === kind)
      const referencedIds = new Set(kindReferences.map((reference) => reference.asset))
      const unusedIds = records
        .map(([id]) => id)
        .filter((id) => !referencedIds.has(id))
        .sort()
      return [
        kind,
        {
          records: records.length,
          bytes: records.reduce((sum, [, record]) => sum + record.bytes, 0),
          edges: kindReferences.length,
          referenced: referencedIds.size,
          unused: unusedIds.length,
          unusedIds,
        },
      ]
    }),
  ) as Record<StaticImageKind, StaticImageKindAudit>
  const staticImages: StaticImageReferenceAudit = {
    byKind: staticImageByKind,
    records: staticKinds.reduce((sum, kind) => sum + staticImageByKind[kind].records, 0),
    bytes: staticKinds.reduce((sum, kind) => sum + staticImageByKind[kind].bytes, 0),
    edges: staticKinds.reduce((sum, kind) => sum + staticImageByKind[kind].edges, 0),
    referenced: staticKinds.reduce((sum, kind) => sum + staticImageByKind[kind].referenced, 0),
    unused: staticKinds.reduce((sum, kind) => sum + staticImageByKind[kind].unused, 0),
    unusedIds: staticKinds.flatMap((kind) => staticImageByKind[kind].unusedIds).sort(),
  }
  const referencedSoundIds = new Set(soundReferences.map((reference) => reference.asset))
  const catalogSoundIds = Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'sound')
    .map(([id]) => id)
    .sort()
  const unusedSoundIds = catalogSoundIds.filter((id) => !referencedSoundIds.has(id))

  const actorValues = sources.migrate.roles.flatMap((role) => [
    role.attackSound,
    role.weaponSound,
    role.criticalSound,
    role.magicSound,
    role.coverSound,
    role.dyingSound,
    role.deathSound,
  ])
  const sourceEnemyById = new Map((sources.migrate.enemies ?? []).map((enemy) => [enemy.id, enemy]))
  const enemyValues = (sources.migrate.enemyObjects ?? []).flatMap((object) => {
    const enemy = sourceEnemyById.get(object.enemyId)
    if (!enemy) throw new Error(`PAL enemyObject ${object.objectIndex} 缺 enemy ${object.enemyId}`)
    return [
      enemy.attackSound,
      enemy.actionSound,
      enemy.magicSound,
      enemy.deathSound,
      enemy.callSound,
    ]
  })
  const sourceSkills = sourceSkillSounds(skills, sources.migrate.spells, sources.migrate.magic)
  const targetPlaySoundValues = soundReferences
    .filter(
      (reference) =>
        targetChannel(reference) === 'playSound' &&
        // PAL 源没有 SpriteAction cue；这些边由已计数的 legacy playSound 物化而来。
        // 目标闭包必须保留 cue 边，但重建源 site 时不能把同一命令重复算第二次。
        !/^sprites\[\d+\]\.poses\[.+\]\.steps\[\d+\]\.cues\[\d+\]\.asset$/.test(reference.where),
    )
    .map((reference) => legacySoundNumber(reference.asset))
  const droppedEmptySounds = args.translationReport.knownNoOpDetails
    .filter((detail) => detail.key === 'playSound.emptyChunk')
    .map((detail) => {
      if (detail.legacyId === undefined) throw new Error('playSound.emptyChunk 审计明细缺 legacyId')
      return {
        legacyId: detail.legacyId,
        ...(detail.sourceAddress === undefined ? {} : { sourceAddress: detail.sourceAddress }),
        owner: detail.owner,
        path: detail.path,
      }
    })
  const playSoundValues = [
    ...targetPlaySoundValues,
    ...droppedEmptySounds.map((detail) => detail.legacyId),
  ]
  const sourceChannels = {
    actors: summarize(actorValues),
    enemies: summarize(enemyValues),
    skillAnimation: summarize(sourceSkills.animation),
    skillSummon: summarize(sourceSkills.summon),
    playSound: summarize(playSoundValues),
  }
  const allSourceValues = [
    ...actorValues,
    ...enemyValues,
    ...sourceSkills.animation,
    ...sourceSkills.summon,
    ...playSoundValues,
  ]

  const targetEnemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]))
  const negativeEnemySemanticViolations: string[] = []
  let negativeEnemyMagicSites = 0
  for (const object of sources.migrate.enemyObjects ?? []) {
    const source = sourceEnemyById.get(object.enemyId)
    const target = targetEnemyById.get(`enemy-${object.objectIndex}`)
    if (!source || !target) continue
    if (source.magicSound < 0) {
      negativeEnemyMagicSites++
      if (
        target.sounds.magic !== palSoundAssetId(Math.abs(source.magicSound)) ||
        target.sounds.suppressMagicEffectSound !== true
      )
        negativeEnemySemanticViolations.push(target.id)
    } else if (
      target.sounds.suppressMagicEffectSound !== undefined ||
      (source.magicSound === 0 && target.sounds.magic !== undefined)
    )
      negativeEnemySemanticViolations.push(target.id)
  }

  const skill377 = skills.find((skill) => skill.id === '377')
  const item151 = items.find((item) => item.id === '151')
  return {
    source: {
      channels: sourceChannels,
      sites: allSourceValues.length,
      nonzero: allSourceValues.filter((value) => value !== 0).length,
      uniqueAbsoluteIds: new Set(
        allSourceValues.filter((value) => value !== 0).map((value) => Math.abs(value)),
      ).size,
      empty122Occurrences: playSoundValues.filter((value) => value === 122).length,
      playSound45Occurrences: playSoundValues.filter((value) => value === 45).length,
    },
    target: {
      channels,
      soundEdges: soundReferences.length,
      allReferences: references.length,
      nonSoundReferences: references.length - soundReferences.length,
      catalogSounds: catalogSoundIds.length,
      referencedSounds: referencedSoundIds.size,
      unusedSounds: unusedSoundIds.length,
      unusedSoundIds,
      warnings: closure.filter((issue) => issue.severity === 'warn').length,
      missing: closure.filter((issue) => issue.code === 'missing-asset').length,
      kindMismatch: closure.filter((issue) => issue.code === 'kind-mismatch').length,
      hasFake122Asset: catalog.assets[palSoundAssetId(122)] !== undefined,
      staticImages,
    },
    recovery: {
      droppedEmptySounds,
      skill377Sound: skill377?.animation.sound,
      item151UseSound: item151?.use?.sound,
      itemThrowSoundEdges: channels.itemThrow,
      negativeEnemyMagicSites,
      negativeEnemySemanticViolations,
    },
  }
}

function assertFrozen(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `PAL sound 权威基线漂移 ${label}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    )
}

/** PAL 提取真值门禁；任何数字变化都必须先重新审计并经任务卡评审。 */
export function assertPalSoundReferenceBaseline(report: PalSoundReferenceAudit): void {
  assertFrozen(
    report.source.channels,
    {
      actors: { sites: 42, nonzero: 42, positive: 42, zero: 0, negative: 0 },
      enemies: { sites: 765, nonzero: 479, positive: 454, zero: 286, negative: 25 },
      skillAnimation: { sites: 103, nonzero: 97, positive: 97, zero: 6, negative: 0 },
      skillSummon: { sites: 9, nonzero: 9, positive: 9, zero: 0, negative: 0 },
      playSound: { sites: 1_035, nonzero: 1_035, positive: 1_035, zero: 0, negative: 0 },
    },
    'source.channels',
  )
  assertFrozen(
    {
      sites: report.source.sites,
      nonzero: report.source.nonzero,
      uniqueAbsoluteIds: report.source.uniqueAbsoluteIds,
      empty122Occurrences: report.source.empty122Occurrences,
      playSound45Occurrences: report.source.playSound45Occurrences,
    },
    {
      sites: 1_954,
      nonzero: 1_662,
      uniqueAbsoluteIds: 325,
      empty122Occurrences: 1,
      playSound45Occurrences: 3,
    },
    'source.total',
  )
  assertFrozen(
    report.target.channels,
    {
      actors: 42,
      enemies: 479,
      skillAnimation: 98,
      skillSummon: 9,
      playSound: 1_035,
      itemUse: 1,
      itemThrow: 75,
      roles: 4,
    },
    'target.channels',
  )
  assertFrozen(
    {
      soundEdges: report.target.soundEdges,
      allReferences: report.target.allReferences,
      nonSoundReferences: report.target.nonSoundReferences,
      catalogSounds: report.target.catalogSounds,
      referencedSounds: report.target.referencedSounds,
      unusedSounds: report.target.unusedSounds,
      warnings: report.target.warnings,
      missing: report.target.missing,
      kindMismatch: report.target.kindMismatch,
      hasFake122Asset: report.target.hasFake122Asset,
    },
    {
      soundEdges: 1_743,
      // C8 恢复共享用途根：物品 266 新增 portrait.pal.069，土灵珠出口 fallback 新增 sound.pal.045。
      allReferences: 6_725,
      nonSoundReferences: 4_982,
      catalogSounds: 363,
      referencedSounds: 329,
      unusedSounds: 34,
      warnings: 131,
      missing: 0,
      kindMismatch: 0,
      hasFake122Asset: false,
    },
    'target.total',
  )
  assertFrozen(
    report.target.staticImages,
    {
      byKind: {
        portrait: {
          records: 88,
          bytes: 768_841,
          edges: 2_366,
          referenced: 84,
          unused: 4,
          unusedIds: [
            'portrait.pal.050',
            'portrait.pal.068',
            'portrait.pal.072',
            'portrait.pal.089',
          ],
        },
        face: {
          records: 6,
          bytes: 10_392,
          edges: 6,
          referenced: 6,
          unused: 0,
          unusedIds: [],
        },
        'item-icon': {
          records: 233,
          bytes: 262_667,
          edges: 233,
          referenced: 233,
          unused: 0,
          unusedIds: [],
        },
        'battle-background': {
          records: 52,
          bytes: 4_422_281,
          edges: 52,
          referenced: 52,
          unused: 0,
          unusedIds: [],
        },
      },
      records: 379,
      bytes: 5_464_181,
      edges: 2_657,
      referenced: 375,
      unused: 4,
      unusedIds: ['portrait.pal.050', 'portrait.pal.068', 'portrait.pal.072', 'portrait.pal.089'],
    },
    'target.staticImages',
  )
  assertFrozen(
    {
      dropped: report.recovery.droppedEmptySounds.map((detail) => detail.legacyId),
      skill377Sound: report.recovery.skill377Sound,
      item151UseSound: report.recovery.item151UseSound,
      itemThrowSoundEdges: report.recovery.itemThrowSoundEdges,
      negativeEnemyMagicSites: report.recovery.negativeEnemyMagicSites,
      negativeEnemySemanticViolations: report.recovery.negativeEnemySemanticViolations,
    },
    {
      dropped: [122],
      skill377Sound: palSoundAssetId(174),
      item151UseSound: palSoundAssetId(45),
      itemThrowSoundEdges: 75,
      negativeEnemyMagicSites: 25,
      negativeEnemySemanticViolations: [],
    },
    'recovery',
  )
}
