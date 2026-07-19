import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { gunzipSync, inflateSync } from 'node:zlib'
import {
  type AssetCatalogV1,
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  type LoadedManifest,
  palFrameAnimationAssetId,
  parseFrameSequence,
  validateAssetCatalog,
} from '@type-pal/content'
import { decodeRngFrames, type Palette, RNG_HEIGHT, RNG_WIDTH } from '@type-pal/shared'
import { afterAll, describe, expect, test } from 'vitest'
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
import { materializePalAssets, PAL_ASSET_ROLES } from './pal-assets.js'
import { preparePalManifest } from './pal-manifest.js'
import { buildPalMigration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
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
) {
  const catalog = validateAssetCatalog(
    generated.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'PAL integration assets/index.json',
  )
  const nextManifest = preparePalManifest(manifest, catalog)
  const report = auditPalSoundReferences({
    sources,
    files: generated.files,
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

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true })
})

describe.skipIf(!hasBootstrapFixture)('MG2 真实 PAL 数据临时目录演练', () => {
  test('闭合 bootstrap -> 同事务工程+baseline -> 二次严格空计划', () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    expect(theirs.report.assets).toEqual({
      videos: 6,
      frameAnimations: 12,
      frames: 1_464,
      sounds: 363,
      emptySounds: 142,
      soundBytes: 18_110_864,
      tilesets: 223,
      tilesetBytes: 6_501_041,
      tilesetFrames: 67_715,
      portraits: 88,
      portraitBytes: 768_841,
      faces: 6,
      faceBytes: 10_392,
      itemIcons: 233,
      itemIconBytes: 262_667,
      battleBackgrounds: 52,
      battleBackgroundBytes: 4_422_281,
      legacyPaletteByFrameAnimation: expectedLegacyPaletteByFrameAnimation,
    })
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_174,
      stopMusic: 53,
      legacyPlayMusicTotal: 1_227,
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
    expect(soundAudit.report.target.soundEdges).toBe(1_666)
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
    expect(validation.assetReferences).toBe(5_899)
    expect(validation.assetWarnings).toBe(54)
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 966, default: 169, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 580, migrated: 574 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
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
  test('当前工程 + baseline + 纯生成必须是严格空计划', async () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    expect(theirs.report.assets).toEqual({
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
      tilesets: 223,
      tilesetBytes: 6_501_041,
      tilesetFrames: 67_715,
      legacyPaletteByFrameAnimation: expectedLegacyPaletteByFrameAnimation,
    })
    await assertFrameAnimationsMatchSource(sources)
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_174,
      stopMusic: 53,
      legacyPlayMusicTotal: 1_227,
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

    const managed = discoverProjectManagedFiles(repo, theirs.managedFiles)
    const ours = loadProjectMigrationSnapshot(repo, managed)
    const plan = createMigrationPlan(baseline!, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])

    const manifest = JSON.parse(
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
    ) as LoadedManifest
    const soundAudit = auditSounds(sources, theirs, manifest)
    expect(soundAudit.report.target.soundEdges).toBe(1_666)
    expect(manifest.assets.roles).toMatchObject(PAL_ASSET_ROLES)
    expect(manifest.assets.legacy?.families).not.toContain('sound')
    expect(manifest.assets.legacy?.sounds).toBeUndefined()
    expectOriginalPalNewGame(manifest)
    const validation = validatePalMigrationTarget({
      files: ours.files,
      managedFiles: ours.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: manifest.assets,
      entryPoints: manifest.entryPoints,
    })
    expect(validation.scenes).toBe(294)
    expect(validation.maps).toBe(223)
    expect(validation.assetReferences).toBe(5_899)
    expect(validation.assetWarnings).toBe(54)
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 966, default: 169, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 580, migrated: 574 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
    })
  }, 120_000)
})
