import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { gunzipSync, inflateSync } from 'node:zlib'
import {
  type AssetCatalogV1,
  type Command,
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  type ItemData,
  itemUseSupportsContextV5,
  type LoadedManifest,
  type MigrationDiagnosticsV1,
  palFrameAnimationAssetId,
  palSpriteAssetId,
  parseFrameSequence,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptRef,
  type SpriteDef,
  spriteDefinitionFrameDemand,
  upgradeItemsV7ToV8,
  validateAssetCatalog,
  validateItemsV5,
  validateMigrationDiagnostics,
} from '@type-pal/content'
import {
  decodeRngFrames,
  type Palette,
  parseSpriteChunk,
  parseWorldSpriteChunk,
  RNG_HEIGHT,
  RNG_WIDTH,
} from '@type-pal/shared'
import { afterAll, describe, expect, test } from 'vitest'
import { projectMigrationV9ToLegacyV8 } from './experimental/script-v5/equip-battle-sprite-v8-authority.js'
import { buildP7GeneratedCanonical } from './experimental/script-v5/p7-generated.js'
import { createR13EnemyScriptV5MigrationPlan } from './experimental/script-v5/r13-enemy-script-mg2.js'
import { prepareR13SourceExecutionCensus } from './experimental/script-v5/source-execution-census.js'
import { migratedItemUseScriptRef } from './migrate-content.js'
import {
  isAtomicProjectMapPath,
  loadPalBaseline,
  type MigrationSnapshot,
  sha256,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import { applyBootstrapReport, type BootstrapReportV1 } from './migration-bootstrap.js'
import { createInitialMigrationPlan, createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertHashMapsEqual,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'
import { commitMigrationTransaction } from './migration-transaction.js'
import { validatePalMigrationTarget } from './migration-validate.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { auditMusicReferences } from './music-reference-audit.js'
import {
  materializePalAssets,
  PAL_ASSET_ROLES,
  PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_TUPLE_DIGEST,
  PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_WORLD_SPRITE_TUPLE_DIGEST,
} from './pal-assets.js'
import {
  PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS,
  PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS,
} from './pal-battle-sprites.js'
import { preparePalManifest } from './pal-manifest.js'
import {
  buildPalHistoricalR13_4V9Migration,
  buildPalMigration,
  type MigrationJson,
  PAL_WORLD_SPRITE_UNUSED_NUMBERS,
  palSoundAssetForSources,
} from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
import {
  PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
} from './pal-world-sprite-layouts.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from './script-control-flow-audit.js'
import { normalizeMigrationScriptFiles } from './script-library-normalize.js'
import {
  assertPalSoundReferenceBaseline,
  auditPalSoundReferences,
} from './sound-reference-audit.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const hasExtractedData = existsSync(resolve(repo, 'data/extracted/events/all.json'))
const hasBootstrapFixture =
  hasExtractedData &&
  existsSync(resolve(repo, 'packages/migrate/bootstrap/pal.json')) &&
  !existsSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'))
const hasCommittedBaseline =
  hasExtractedData && existsSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'))
const tempRoots: string[] = []
const expectedLegacyPaletteByFrameAnimation = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [
    `frame-animation.pal.${String(index).padStart(3, '0')}`,
    index === 3 ? 2 : index === 6 ? 3 : index === 7 ? 6 : 0,
  ]),
)
const expectedPalAssetReport = {
  videos: 6,
  frameAnimations: 12,
  frames: 1_464,
  sounds: 363,
  emptySounds: 142,
  soundBytes: 18_110_864,
  portraits: 88,
  portraitBytes: 768_841,
  faces: 6,
  faceBytes: 10_392,
  itemIcons: 233,
  itemIconBytes: 262_667,
  battleBackgrounds: 52,
  battleBackgroundBytes: 4_422_281,
  battleSprites: 172,
  battleSpriteBytes: 900_973,
  battleSpriteRawBytes: 2_313_598,
  battleSpriteFrames: 775,
  battleSpriteMalformedTailSlots: 6,
  battleSpritePlayerTupleDigest: PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
  battleSpriteEnemyTupleDigest: PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
  battleSpriteTupleDigest: PAL_BATTLE_SPRITE_TUPLE_DIGEST,
  battleSpritePlayerFrameCounts: [...PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS],
  battleSpriteEnemyFrameCounts: [...PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS],
  battleSpriteLegacyTailAnomalies: [...PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES],
  tilesets: 223,
  tilesetBytes: 6_501_041,
  tilesetFrames: 67_715,
  sprites: 636,
  spriteBytes: 1_332_725,
  spriteFrames: 4_133,
  spriteMalformedTailSlots: 30,
  spriteTupleDigest: PAL_WORLD_SPRITE_TUPLE_DIGEST,
  spriteLegacyTailAnomalies: [...PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES],
  legacyPaletteByFrameAnimation: expectedLegacyPaletteByFrameAnimation,
}

function assertSameSnapshot(expected: MigrationSnapshot, actual: MigrationSnapshot): void {
  const paths = new Set([...expected.managedFiles, ...actual.managedFiles])
  for (const path of paths) {
    if (isAtomicProjectMapPath(path)) {
      expect(snapshotFilePresent(actual, path), path).toBe(snapshotFilePresent(expected, path))
      expect(snapshotFileHash(actual, path), path).toBe(snapshotFileHash(expected, path))
      continue
    }
    expect(actual.files.has(path), path).toBe(expected.files.has(path))
    expect(isDeepStrictEqual(actual.files.get(path), expected.files.get(path)), path).toBe(true)
  }
}

function expectOriginalPalNewGame(manifest: LoadedManifest): void {
  expect(manifest.startWorld).toEqual({
    party: ['li-xiaoyao'],
    money: 0,
    learnedSkills: { 'li-xiaoyao': ['296'] },
    inventory: [],
  })
}

function auditSounds(
  sources: ReturnType<typeof loadPalMigrationSources>,
  generated: ReturnType<typeof buildPalMigration>,
  manifest: LoadedManifest,
  currentItems?: unknown,
) {
  const catalog = validateAssetCatalog(
    generated.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'PAL integration assets/index.json',
  )
  const nextManifest = preparePalManifest(manifest, catalog)
  const report = auditPalSoundReferences({
    sources,
    files: generated.files,
    ...(currentItems === undefined ? {} : { items: currentItems }),
    itemContentVersion: currentItems === undefined ? 7 : 9,
    assets: nextManifest.assets,
    entryPoints: nextManifest.entryPoints,
    translationReport: generated.report.scripts,
  })
  assertPalSoundReferenceBaseline(report)
  return { catalog, nextManifest, report }
}

function sourceRgba(pixels: Uint8Array, palette: Palette): Uint8Array {
  const rgba = new Uint8Array(RNG_WIDTH * RNG_HEIGHT * 4)
  for (let pixel = 0; pixel < pixels.length; pixel++) {
    const color = palette.colors[pixels[pixel] ?? 0]
    if (!color) throw new Error(`源帧颜色索引越界: ${String(pixels[pixel])}`)
    const offset = pixel * 4
    rgba[offset] = color[0]
    rgba[offset + 1] = color[1]
    rgba[offset + 2] = color[2]
    rgba[offset + 3] = 255
  }
  return rgba
}

async function assertFrameAnimationsMatchSource(
  sources: ReturnType<typeof loadPalMigrationSources>,
): Promise<void> {
  for (let chunk = 0; chunk < 12; chunk++) {
    const id = palFrameAnimationAssetId(chunk)
    const binary = sources.binaryAssets.find((source) => source.id === id)
    if (!binary || binary.bytes === undefined) throw new Error(`缺确定性 TPFS 源 ${id}`)
    const sequence = parseFrameSequence(binary.bytes)
    const legacyPalette = sources.assetReport.legacyPaletteByFrameAnimation[id]
    const palette = JSON.parse(
      readFileSync(resolve(repo, `data/extracted/data/palette/${legacyPalette}.json`), 'utf8'),
    ) as Palette
    const indexed = decodeRngFrames(
      gunzipSync(
        readFileSync(
          resolve(repo, `data/extracted/data/animation/rng-${String(chunk).padStart(2, '0')}.rle`),
        ),
      ),
    )
    expect(sequence.index.frames.length, id).toBe(indexed.length)
    let absoluteFrame = 0
    for (let block = 0; block < sequence.index.blocks.length; block++) {
      const decoded = await decodeFrameSequenceBlock(sequence, block, (bytes) => inflateSync(bytes))
      for (const rgba of decoded) {
        const source = indexed[absoluteFrame]
        if (!source) throw new Error(`${id}: 缺源帧 ${absoluteFrame}`)
        expect(sha256(rgba), `${id} frame ${absoluteFrame}`).toBe(
          sha256(sourceRgba(source.pixels, palette)),
        )
        absoluteFrame++
      }
    }
    for (const frame of new Set([0, Math.floor(indexed.length / 2), indexed.length - 1])) {
      const random = await decodeFrameSequenceFrame(sequence, frame, (bytes) => inflateSync(bytes))
      const source = indexed[frame]
      if (!source) throw new Error(`${id}: 缺随机 seek 源帧 ${frame}`)
      expect(sha256(random), `${id} random frame ${frame}`).toBe(
        sha256(sourceRgba(source.pixels, palette)),
      )
    }
  }
}

function assertWorldSpriteGraph(
  migration: ReturnType<typeof buildPalMigration>,
  sources: ReturnType<typeof loadPalMigrationSources>,
): void {
  const sprites = migration.files.get('content/sprites.json') as unknown as SpriteDef[]
  const used = new Set(sprites.map(({ asset }) => asset))
  const generatedCatalog = validateAssetCatalog(migration.files.get('assets/index.json'))
  const catalogIds = Object.entries(generatedCatalog.assets)
    .filter(([, record]) => record.kind === 'sprite')
    .map(([asset]) => asset)
    .sort()
  const expectedCatalogIds = Array.from({ length: 636 }, (_, index) => palSpriteAssetId(index + 1))
  expect(sprites).toHaveLength(577)
  expect(used.size).toBe(559)
  expect(sprites.length - used.size).toBe(18)
  expect(catalogIds).toEqual(expectedCatalogIds)
  expect(expectedCatalogIds.filter((asset) => !used.has(asset))).toEqual(
    PAL_WORLD_SPRITE_UNUSED_NUMBERS.map(palSpriteAssetId),
  )

  const actualDebt = sprites.flatMap((definition) => {
    const spriteNum = Number(definition.asset.slice(-3))
    const frames = sources.worldSpriteFrameCounts[spriteNum - 1]
    if (frames === undefined) throw new Error(`缺 world sprite 帧数 ${definition.asset}`)
    const demand = spriteDefinitionFrameDemand(definition)
    return demand > frames ? [{ id: definition.id, spriteNum, demand, frames }] : []
  })
  expect(actualDebt).toEqual([])

  const definitionsById = new Map(sprites.map((definition) => [definition.id, definition]))
  for (const audit of PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT) {
    expect(definitionsById.get(`sprite-${audit.spriteNum}`), audit.evidence).toMatchObject({
      asset: palSpriteAssetId(audit.spriteNum),
      layout: { kind: 'static' },
    })
    expect(sources.worldSpriteFrameCounts[audit.spriteNum - 1], audit.evidence).toBe(
      audit.expectedFrameCount,
    )
  }
  const debtSpriteNums = new Set<number>(
    PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT.map(({ spriteNum }) => spriteNum),
  )
  expect(
    migration.report.scenes.layoutEvidence
      .filter(({ spriteNum }) => debtSpriteNums.has(spriteNum))
      .sort((left, right) => left.spriteNum - right.spriteNum),
  ).toEqual(
    PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.filter(({ spriteNum }) => debtSpriteNums.has(spriteNum))
      .map(({ spriteNum, evidence }) => ({
        spriteNum,
        definitionId: `sprite-${spriteNum}`,
        source: 'pal-overlay',
        evidence,
      }))
      .sort((left, right) => left.spriteNum - right.spriteNum),
  )
  for (const spriteNum of [193, 228, 232, 245, 521, 531, 532, 533, 538, 563, 576, 607])
    expect(definitionsById.get(`sprite-${spriteNum}`)?.layout, `sprite-${spriteNum}`).toEqual({
      kind: 'directional',
      framesPerDir: 3,
    })
  expect(definitionsById.get('sprite-534')?.layout).toEqual({
    kind: 'directional',
    framesPerDir: 4,
  })
  expect(definitionsById.get('sprite-511')?.layout).toEqual({ kind: 'static' })
  for (const removed of ['sprite-242-f0', 'sprite-379-f0', 'sprite-541-f0'])
    expect(definitionsById.has(removed), removed).toBe(false)
  for (const preserved of [18, 95, 163, 193, 228, 232, 365, 369, 408])
    expect(definitionsById.get(`sprite-${preserved}-f0`)?.layout, `sprite-${preserved}-f0`).toEqual(
      {
        kind: 'static',
      },
    )

  const entitySprite = (scene: string, entity: string): string | undefined => {
    const definition = migration.files.get(`content/scenes/${scene}.json`) as unknown as {
      entities: Array<{ id: string; sprite?: string }>
    }
    return definition.entities.find(({ id }) => id === entity)?.sprite
  }
  expect(entitySprite('s266', 'e4659')).toBe('sprite-541')
  expect(entitySprite('s199', 'e3349')).toBe('sprite-511')
  expect(
    JSON.stringify(migration.files.get('content/scripts/chunks/scene/s192.json')).match(
      /sprite-541/g,
    ),
  ).toHaveLength(2)
  expect(
    JSON.stringify(migration.files.get('content/scripts/chunks/scene/s145.json')).match(
      /sprite-511/g,
    ),
  ).toHaveLength(1)

  const followerCommands: string[][] = []
  const collectFollowers = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) collectFollowers(entry)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (record.kind === 'setFollowers') followerCommands.push(record.sprites as string[])
    for (const child of Object.values(record)) collectFollowers(child)
  }
  collectFollowers(migration.files.get('content/scripts/chunks/scene/s102.json'))
  expect(followerCommands).toEqual([[], ['sprite-82']])
}

function assertEarthPearlSummonChain(migration: ReturnType<typeof buildPalMigration>): void {
  const items = migration.files.get('content/items.json') as unknown as ItemData[]
  const skills = migration.files.get('content/skills.json') as unknown as {
    skills: Array<{ id: string; effects?: unknown[] }>
  }
  const definitions = migration.files.get('content/battle-sprites.json') as unknown as Array<{
    id: string
    asset: string
    profile: { kind: string }
  }>
  const catalog = validateAssetCatalog(migration.files.get('assets/index.json'))

  expect(items.find(({ id }) => id === '267')?.equip?.effects).toContainEqual({
    kind: 'grantSkill',
    skillId: '336',
  })
  expect(skills.skills.find(({ id }) => id === '336')?.effects).toContainEqual(
    expect.objectContaining({ kind: 'summon', battleSprite: 'player-summon-13' }),
  )
  expect(definitions.find(({ id }) => id === 'player-summon-13')).toEqual(
    expect.objectContaining({
      asset: 'battle-sprite.pal.player.013',
      profile: { kind: 'summon' },
    }),
  )
  expect(catalog.assets['battle-sprite.pal.player.013']).toMatchObject({
    kind: 'battle-sprite',
    path: 'assets/migrated/battle-sprites/player/013.rle',
  })

  const earthPearl = items.find(({ id }) => id === '267')
  expect(earthPearl?.use).toEqual({
    target: 'scene',
    consuming: false,
    effects: [
      {
        kind: 'runScript',
        script: migratedItemUseScriptRef(267),
      },
    ],
  })
  const rootEffect = earthPearl!.use!.effects[0]!
  if (rootEffect.kind !== 'runScript') throw new Error('土灵珠用途不是稳定共享脚本')
  const scriptIndex = migration.files.get('content/scripts/index.json') as unknown as ScriptIndexV1
  expect(scriptIndex.library?.[rootEffect.script.id]).toMatchObject({
    name: '土灵珠使用',
    self: 'none',
  })
  const reachable = collectReachableCommands(migration, rootEffect.script)
  expect(reachable).toContainEqual({
    kind: 'branch',
    cond: { kind: 'not', cond: { kind: 'facingEntity', entity: 'e4285' } },
    then: [expect.objectContaining({ kind: 'jumpScript' })],
  })
  expect(reachable).toContainEqual(expect.objectContaining({ kind: 'teleportOut' }))
  expect(reachable).toContainEqual({ kind: 'playSound', asset: 'sound.pal.045' })
  expect(reachable).toContainEqual({ kind: 'setEntityState', entity: 'e4285', state: 3 })
  expect(reachable).toContainEqual({ kind: 'setEntityFacing', entity: 'e4285', facing: 'down' })
  expect(reachable).toContainEqual({ kind: 'setEntityFrame', entity: 'e4285', frame: 5 })
  expect(reachable).toContainEqual({ kind: 'loseItem', itemId: '267' })
  expect(
    reachable.flatMap((command) =>
      command.kind === 'branch' && command.cond.kind === 'entityState' ? [command.cond] : [],
    ),
  ).toEqual(
    [0, 2].flatMap((state) =>
      ['e4282', 'e4283', 'e4284', 'e4285', 'e4286'].map((entity) => ({
        kind: 'entityState',
        entity,
        is: state,
      })),
    ),
  )
  expect(reachable).toContainEqual({ kind: 'fade', dir: 'out', ms: 600 })
  expect(reachable).toContainEqual({ kind: 'loadScene', scene: 's227' })
  expect(reachable).not.toContainEqual({ kind: 'mountParty', entity: 'global/items' })
  const locale = migration.files.get('content/locale.json') as Record<string, string>
  expect(locale['dlg.12538']).toBe('无任何效果')
}

function scriptBody(
  migration: ReturnType<typeof buildPalMigration>,
  ref: ScriptRef,
): readonly Command[] {
  const chunk = migration.files.get(`content/scripts/chunks/${ref.chunk}.json`) as unknown as
    | ScriptChunkV1
    | undefined
  const body = chunk?.scripts[ref.id]
  if (!body) throw new Error(`测试找不到脚本 ${ref.chunk}:${ref.id}`)
  return body
}

function collectReachableCommands(
  migration: ReturnType<typeof buildPalMigration>,
  root: ScriptRef,
): Command[] {
  const output: Command[] = []
  const seen = new Set<string>([`${root.chunk}:${root.id}`])
  const walk = (body: readonly Command[]): void => {
    for (const command of body) {
      output.push(command)
      if (command.kind === 'callScript' || command.kind === 'jumpScript') {
        const key = `${command.ref.chunk}:${command.ref.id}`
        if (!seen.has(key)) {
          seen.add(key)
          walk(scriptBody(migration, command.ref))
        }
      } else if (command.kind === 'branch') {
        walk(command.then)
        if (command.else) walk(command.else)
      } else if (command.kind === 'teleportOut' && command.onFail) walk(command.onFail)
    }
  }
  walk(scriptBody(migration, root))
  return output
}

function assertItemUseCensus(migration: ReturnType<typeof buildPalMigration>): void {
  const items = migration.files.get('content/items.json') as unknown as ItemData[]
  const diagnostics = migration.files.get(
    'content/migration-diagnostics.json',
  ) as unknown as MigrationDiagnosticsV1
  expect(items.filter((item) => item.use)).toHaveLength(86)
  expect(items.filter((item) => item.use && !item.use.target)).toEqual([])
  expect(diagnostics.diagnostics.map((entry) => Number(entry.target.objectId))).toEqual([
    260, 263, 264, 271, 272, 273, 279, 284, 286, 287, 288, 289, 291, 292,
  ])
  expect(diagnostics.diagnostics.filter((entry) => entry.category === 'story-script')).toHaveLength(
    14,
  )
}

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true })
})

describe.skipIf(!hasBootstrapFixture)('MG2 真实 PAL 数据临时目录演练', () => {
  test('闭合 bootstrap -> 同事务工程+baseline -> 二次严格空计划', () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    assertWorldSpriteGraph(theirs, sources)
    assertEarthPearlSummonChain(theirs)
    assertItemUseCensus(theirs)
    expect(theirs.report.assets).toEqual(expectedPalAssetReport)
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_176,
      stopMusic: 54,
      legacyPlayMusicTotal: 1_230,
      sceneMusic: 36,
      sceneBattleMusic: 81,
      startBattleWithMusic: 31,
      uniqueMusicRefs: 71,
      missingMusicRefs: [],
      legacyMusicKeys: 0,
      internalBattleCfgMarkers: 0,
    })
    expect(theirs.report.scenes.entryNormalization).toEqual({
      staticCommands: 863,
      uniqueTargets: 762,
      defaultTargets: 61,
      namedTargets: 701,
      unresolvedCommands: 0,
    })
    const seed = discoverProjectManagedFiles(repo, theirs.managedFiles)
    const ours = loadProjectMigrationSnapshot(repo, seed)
    const report = JSON.parse(
      readFileSync(resolve(repo, 'packages/migrate/bootstrap/pal.json'), 'utf8'),
    ) as BootstrapReportV1
    const applied = applyBootstrapReport(ours, theirs, report)
    const normalized = normalizeMigrationScriptFiles(applied.files)
    const target: MigrationSnapshot = {
      files: normalized,
      managedFiles: new Set([...applied.managedFiles, ...normalized.keys()]),
    }
    const manifest = JSON.parse(
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
    ) as LoadedManifest
    const soundAudit = auditSounds(sources, theirs, manifest)
    expect(soundAudit.report.target.soundEdges).toBe(1_668)
    expect(soundAudit.nextManifest.content.stamps).toBe('content/stamps.json')
    expectOriginalPalNewGame(manifest)
    const validation = validatePalMigrationTarget({
      files: target.files,
      managedFiles: target.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: soundAudit.nextManifest.assets,
      entryPoints: manifest.entryPoints,
    })
    expect(validation.scenes).toBe(294)
    expect(validation.maps).toBe(223)
    expect(validation.assetReferences).toBe(6_650)
    expect(validation.assetWarnings).toBe(132)
    expect(validation.battleSpriteReferences).toEqual({
      definitions: 171,
      references: 179,
      usedDefinitions: 171,
      sharedDefinitions: 5,
      unusedAssets: 1,
    })
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 967, default: 170, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 577, migrated: 571 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
      setFollowers: { total: 1, migrated: 1 },
    })

    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-mg2-real-'))
    tempRoots.push(temp)
    mkdirSync(resolve(temp, 'projects'), { recursive: true })
    cpSync(resolve(repo, 'projects/pal'), resolve(temp, 'projects/pal'), { recursive: true })
    const tempManaged = discoverProjectManagedFiles(temp, theirs.managedFiles)
    const tempOurs = loadProjectMigrationSnapshot(temp, tempManaged)
    const transactionManaged = new Set([...tempManaged, ...target.managedFiles])
    const materialized = materializePalAssets({
      repo: temp,
      catalog: soundAudit.catalog,
      binaries: sources.binaryAssets,
    })
    expect(materialized.files).toBe(Object.keys(soundAudit.catalog.assets).length)
    const unmanagedBefore = hashUnmanagedProjectFiles(
      temp,
      transactionManaged,
      new Set(['manifest.json']),
    )
    const plan = createInitialMigrationPlan(tempOurs, target)
    const catalogHash = snapshotFileHash(target, 'assets/index.json')!
    const stampsHash = snapshotFileHash(target, 'content/stamps.json')!
    const changes = buildMigrationTransactionChanges({
      repo: temp,
      plan,
      nextBaseline: snapshotOf(theirs),
      nextManifest: soundAudit.nextManifest,
      manifestPreconditions: [
        { target: 'projects/pal/assets/index.json', hash: catalogHash },
        { target: 'projects/pal/content/stamps.json', hash: stampsHash },
        ...Object.values(soundAudit.catalog.assets).map((record) => ({
          target: `projects/pal/${record.path}`,
          hash: record.sha256,
        })),
      ],
    })
    expect(changes.some((change) => change.scope === 'project')).toBe(true)
    expect(changes.at(-2)?.target).toBe('packages/migrate/baselines/pal/_state.json')
    expect(changes.at(-1)?.target).toBe('projects/pal/manifest.json')
    commitMigrationTransaction(temp, changes)

    const unmanagedAfter = hashUnmanagedProjectFiles(
      temp,
      transactionManaged,
      new Set(['manifest.json']),
    )
    assertHashMapsEqual(unmanagedBefore, unmanagedAfter, '非托管工程文件')
    expect(JSON.parse(readFileSync(resolve(temp, 'projects/pal/manifest.json'), 'utf8'))).toEqual(
      soundAudit.nextManifest,
    )
    const baseline = loadPalBaseline(temp)
    expect(baseline).toBeDefined()
    assertSameSnapshot(snapshotOf(theirs), baseline!)
    const postManaged = discoverProjectManagedFiles(temp, target.managedFiles)
    const projectAfter = loadProjectMigrationSnapshot(temp, postManaged)
    assertSameSnapshot(target, projectAfter)

    const second = createMigrationPlan(baseline!, projectAfter, theirs)
    expect(second.conflicts).toEqual([])
    expect(second.writes.size).toBe(0)
    expect(second.deletes).toEqual([])
    expect(
      materializePalAssets({
        repo: temp,
        catalog: soundAudit.catalog,
        binaries: sources.binaryAssets,
      }).written,
    ).toBe(0)
  }, 60_000)
})

describe.skipIf(!hasCommittedBaseline)('MG2 真实 PAL 已建基线回归', () => {
  test('636 个真实 world sprite 中仅冻结的 30 个坏尾源需要 legacy profile', () => {
    const anomalyByNumber = new Map<
      number,
      (typeof PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES)[number]
    >(PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES.map((entry) => [entry.sprite, entry]))
    const canonicalFailures: number[] = []
    for (let sprite = 1; sprite <= 636; sprite++) {
      const raw = gunzipSync(
        readFileSync(resolve(repo, `data/extracted/data/sprite/${sprite}.rle`)),
      )
      const legacy = parseWorldSpriteChunk(raw, 'legacy-migrated')
      const expectedAnomaly = anomalyByNumber.get(sprite)
      expect(legacy.frames.length, `sprite ${sprite} legacy/loose frame count`).toBe(
        parseSpriteChunk(raw).length,
      )
      if (expectedAnomaly) {
        expect(
          {
            sprite,
            frames: legacy.frames.length,
            malformedTailSlots: legacy.skippedLegacyTailSlots,
            trailingSentinel: legacy.trailingSentinel,
          },
          `sprite ${sprite} anomaly shape`,
        ).toEqual(expectedAnomaly)
      } else {
        expect(legacy.skippedLegacyTailSlots, `sprite ${sprite} unexpected legacy debt`).toBe(0)
      }
      try {
        parseWorldSpriteChunk(raw, 'canonical')
      } catch {
        canonicalFailures.push(sprite)
      }
    }
    expect(canonicalFailures).toEqual(
      PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES.map(({ sprite }) => sprite),
    )
  })

  test('当前工程 + baseline + 纯生成必须是严格空计划', async () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    assertWorldSpriteGraph(theirs, sources)
    assertEarthPearlSummonChain(theirs)
    assertItemUseCensus(theirs)
    expect(theirs.report.assets).toEqual(expectedPalAssetReport)
    await assertFrameAnimationsMatchSource(sources)
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_176,
      stopMusic: 54,
      legacyPlayMusicTotal: 1_230,
      sceneMusic: 36,
      sceneBattleMusic: 81,
      startBattleWithMusic: 31,
      uniqueMusicRefs: 71,
      missingMusicRefs: [],
      legacyMusicKeys: 0,
      internalBattleCfgMarkers: 0,
    })
    expect(theirs.report.scenes.entryNormalization).toEqual({
      staticCommands: 863,
      uniqueTargets: 762,
      defaultTargets: 61,
      namedTargets: 701,
      unresolvedCommands: 0,
    })
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()

    const frozenAudit = JSON.parse(
      readFileSync(
        resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json'),
        'utf8',
      ),
    ) as ScriptControlFlowAuditV1
    // historical/current authority 必须使用独立可变容器，但没有必要再次读取并解析同一份
    // 2,000+ 资源源树；structuredClone 保持隔离，同时省去约 9s 重复 I/O。
    const parentSources = structuredClone(sources)
    const parentRawMigration = buildPalHistoricalR13_4V9Migration(parentSources)
    const authorityMigration = projectMigrationV9ToLegacyV8(parentRawMigration)
    const parentAudit = auditPalScriptControlFlow(parentSources, authorityMigration)
    assertScriptControlFlowAudit(parentAudit)
    const preparedHistoricalSourceCensus = prepareR13SourceExecutionCensus(parentSources)
    const currentAudit = auditPalScriptControlFlow(sources, theirs)
    assertScriptControlFlowAudit(currentAudit)
    const generatedResult = baseline?.baselineMetadata
      ? buildP7GeneratedCanonical({
          migration: authorityMigration,
          currentAudit: parentAudit,
          frozenAudit,
          sourceCommands: parentSources.allJson.segments.flatMap((segment) => segment.commands),
          itemSources: parentSources.migrate.items,
          magicSources: parentSources.migrate.magic,
          objectMagicSources: parentSources.migrate.objectMagics ?? [],
          soundAssetForNum: palSoundAssetForSources(parentSources),
          sourceCensus: preparedHistoricalSourceCensus.census,
        })
      : undefined
    const generated = generatedResult?.snapshot
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([
        ...(baseline?.managedFiles ?? []),
        ...(generated?.managedFiles ?? theirs.managedFiles),
      ]),
    )
    const ours = loadProjectMigrationSnapshot(repo, managed)
    if (generated && generatedResult) {
      const result = createR13EnemyScriptV5MigrationPlan({
        base: baseline!,
        ours,
        generated: generatedResult,
        historicalSources: parentSources,
        historicalMigration: authorityMigration,
        historicalAudit: parentAudit,
        currentSources: sources,
        currentMigration: theirs,
        currentAudit,
        preparedHistoricalSourceCensus,
      })
      expect(result.plan.conflicts).toEqual([])
      expect([...result.plan.writes.keys()].sort()).toEqual(
        result.enemyScriptSealMode === 'initialize'
          ? [...result.enemyScriptEvidence.files.changedPaths].sort()
          : [],
      )
      expect(result.plan.deletes).toEqual([])
      const sourceUsable = sources.migrate.items
        .filter((item) => item.flags.usable)
        .map((item) => String(item.id))
        .sort((left, right) => Number(left) - Number(right))
      const targetRunnable = validateItemsV5(result.target.files.get('content/items.json'))
        .filter(
          (item) =>
            item.use !== undefined &&
            (itemUseSupportsContextV5(item.use, 'world') ||
              itemUseSupportsContextV5(item.use, 'battle')),
        )
        .map((item) => item.id)
        .sort((left, right) => Number(left) - Number(right))
      expect(targetRunnable).toEqual(sourceUsable)
      expect(targetRunnable).toHaveLength(100)
      expect(
        validateMigrationDiagnostics(
          result.target.files.get('content/migration-diagnostics.json'),
        ).diagnostics.filter(
          (diagnostic) =>
            diagnostic.target.domain === 'item' && diagnostic.target.capability === 'use',
        ),
      ).toEqual([])
    } else {
      const plan = createMigrationPlan(baseline!, ours, theirs)
      expect(plan.conflicts).toEqual([])
      expect(plan.writes.size).toBe(0)
      expect(plan.deletes).toEqual([])
    }

    const manifest = JSON.parse(
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
    ) as LoadedManifest
    const soundAudit = auditSounds(
      sources,
      theirs,
      manifest,
      generatedResult?.snapshot.files.get('content/items.json'),
    )
    expect(soundAudit.report.target.soundEdges).toBe(1_747)
    expect(manifest.assets.roles).toMatchObject(PAL_ASSET_ROLES)
    expect(manifest.assets.legacy?.families).not.toContain('sound')
    expect(manifest.assets.legacy?.sounds).toBeUndefined()
    expectOriginalPalNewGame(manifest)
    const normalizedParentFiles = new Map(theirs.files)
    normalizedParentFiles.set(
      'content/items.json',
      upgradeItemsV7ToV8(theirs.files.get('content/items.json')) as unknown as MigrationJson,
    )
    const validation = validatePalMigrationTarget({
      files: normalizedParentFiles,
      managedFiles: theirs.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: manifest.assets,
      entryPoints: manifest.entryPoints,
    })
    expect(validation.scenes).toBe(294)
    expect(validation.maps).toBe(223)
    // R13-5 恢复 4 条 enemy hook playSound 与 2 条 enemy hook music。
    expect(validation.assetReferences).toBe(6_673)
    expect(validation.assetWarnings).toBe(131)
    expect(validation.battleSpriteReferences).toEqual({
      definitions: 171,
      references: 179,
      usedDefinitions: 171,
      sharedDefinitions: 5,
      unusedAssets: 1,
    })
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 967, default: 170, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 577, migrated: 571 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
      setFollowers: { total: 1, migrated: 1 },
    })
  }, 240_000)
})
