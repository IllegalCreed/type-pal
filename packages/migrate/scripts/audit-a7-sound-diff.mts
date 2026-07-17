import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import {
  type AssetCatalogV1,
  normalizeScriptLibrary,
  palSoundAssetId,
  type ScriptChunkV1,
  type ScriptIndexV1,
  upgradeLegacyActorSounds,
  upgradeLegacyEnemySounds,
  upgradeLegacyItemSounds,
  upgradeLegacySkillSounds,
  upgradeLegacySoundCommands,
  validateAssetCatalog,
} from '@type-pal/content'
import {
  type BaselineStateV1,
  baselineState,
  isAtomicProjectMapPath,
  sha256,
} from '../src/migration-baseline.js'
import { loadPalSoundAssets } from '../src/pal-assets.js'
import { closePalSoundManifest } from '../src/pal-manifest.js'
import type { MigrationJson } from '../src/pal-migration.js'

const BASE = '08cb9050f42590b44673f508b56795355c5f9c41'
const repo = resolve(import.meta.dirname, '../../..')
const baselineRoot = 'packages/migrate/baselines/pal'
const projectRoot = 'projects/pal'

function fail(message: string): never {
  throw new Error(`[A7-1 diff audit] ${message}`)
}

function jsonAt(path: string): MigrationJson {
  return JSON.parse(readFileSync(resolve(repo, path), 'utf8')) as MigrationJson
}

function gitJson(path: string): MigrationJson {
  try {
    return JSON.parse(
      execFileSync('git', ['show', `${BASE}:${path}`], { cwd: repo, encoding: 'utf8' }),
    ) as MigrationJson
  } catch (error) {
    fail(
      `无法从基线 ${BASE} 读取 ${path}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function assertSame(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) fail(`${label} 超出声音迁移白名单`)
}

function jsonDigest(paths: readonly string[]): string {
  return createHash('sha256')
    .update(JSON.stringify([...paths].sort()))
    .digest('hex')
}

function diffEntries(root: string): Map<string, string> {
  const output = execFileSync('git', ['diff', '--name-status', BASE, '--', root], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()
  const entries = new Map<string, string>()
  if (!output) return entries
  for (const line of output.split('\n')) {
    const [status, path, extra] = line.split('\t')
    if (!status || !path || extra || status !== 'M') fail(`${root} 出现非原位修改: ${line}`)
    entries.set(path, status)
  }
  return entries
}

function assertExactPaths(
  actual: ReadonlySet<string>,
  expected: ReadonlySet<string>,
  label: string,
) {
  const missing = [...expected].filter((path) => !actual.has(path))
  const extra = [...actual].filter((path) => !expected.has(path))
  if (missing.length || extra.length)
    fail(`${label} 路径集不符: missing=${missing.join(',')} extra=${extra.join(',')}`)
}

function findLegacySound122(value: unknown, pointer = '#'): string[] {
  if (Array.isArray(value))
    return value.flatMap((child, index) => findLegacySound122(child, `${pointer}/${index}`))
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  const here = object.kind === 'playSound' && object.soundId === 122 ? [pointer] : []
  return [
    ...here,
    ...Object.entries(object).flatMap(([key, child]) =>
      findLegacySound122(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`),
    ),
  ]
}

try {
  execFileSync('git', ['merge-base', '--is-ancestor', BASE, 'HEAD'], { cwd: repo })
} catch {
  fail(`${BASE} 不是当前 HEAD 的祖先`)
}

const rawBaseState = gitJson(`${baselineRoot}/_state.json`) as unknown as BaselineStateV1
if (rawBaseState.version !== 1 || rawBaseState.managedFiles.length !== 829)
  fail(
    `基线托管清单漂移: version=${rawBaseState.version} files=${rawBaseState.managedFiles.length}`,
  )
const managedFiles = new Set(rawBaseState.managedFiles)
const baseFiles = new Map<string, MigrationJson>()
const atomicHashes = new Map<string, string>()
for (const path of rawBaseState.managedFiles) {
  const hash = rawBaseState.files[path]
  if (!hash) fail(`旧 _state 缺 hash: ${path}`)
  if (isAtomicProjectMapPath(path)) atomicHashes.set(path, hash)
  else baseFiles.set(path, gitJson(`${baselineRoot}/${path}`))
}
if (baseFiles.size !== 606 || atomicHashes.size !== 223)
  fail(`基线形状漂移: JSON=${baseFiles.size} atomicMaps=${atomicHashes.size}`)

const expectedFiles = new Map(
  [...baseFiles].map(([path, value]) => [path, structuredClone(value)] as const),
)
const baseCatalog = baseFiles.get('assets/index.json') as unknown as AssetCatalogV1
const expectedCatalog = structuredClone(baseCatalog)
const soundAssets = loadPalSoundAssets(repo)
if (
  soundAssets.report.sounds !== 363 ||
  soundAssets.report.emptySounds !== 142 ||
  soundAssets.report.soundBytes !== 18_110_864
)
  fail(`声音源普查漂移: ${JSON.stringify(soundAssets.report)}`)
for (const sound of soundAssets.binaries) {
  if (expectedCatalog.assets[sound.id]) fail(`旧 catalog 已占用声音 AssetId ${sound.id}`)
  expectedCatalog.assets[sound.id] = structuredClone(sound.record)
}
validateAssetCatalog(expectedCatalog, 'A7-1 diff expected catalog')
if (
  Object.keys(baseCatalog.assets).length !== 106 ||
  Object.keys(expectedCatalog.assets).length !== 469
)
  fail(
    `catalog 计数漂移: base=${Object.keys(baseCatalog.assets).length} target=${Object.keys(expectedCatalog.assets).length}`,
  )
expectedFiles.set('assets/index.json', expectedCatalog as unknown as MigrationJson)

const resolveSound = (legacyId: number) => {
  const asset = palSoundAssetId(legacyId)
  return expectedCatalog.assets[asset]?.kind === 'sound' ? asset : undefined
}
expectedFiles.set(
  'content/actors.json',
  upgradeLegacyActorSounds(baseFiles.get('content/actors.json'), resolveSound) as MigrationJson,
)
const enemies = upgradeLegacyEnemySounds(baseFiles.get('content/enemies.json'), resolveSound)
expectedFiles.set(
  'content/enemies.json',
  upgradeLegacySoundCommands(enemies, resolveSound) as MigrationJson,
)

const skills = upgradeLegacySkillSounds(
  baseFiles.get('content/skills.json'),
  resolveSound,
) as unknown as {
  skills: Array<{ id: string; animation: Record<string, unknown> }>
}
const restoredSkill = skills.skills.find((skill) => skill.id === '377')
if (!restoredSkill) fail('缺技能 377')
restoredSkill.animation.sound = palSoundAssetId(174)
expectedFiles.set('content/skills.json', skills as unknown as MigrationJson)

const items = upgradeLegacyItemSounds(
  baseFiles.get('content/items.json'),
  resolveSound,
) as unknown as Array<{ id: string; use?: Record<string, unknown> }>
const restoredItem = items.find((item) => item.id === '151')
if (!restoredItem?.use) fail('物品 151 缺 use 能力块')
restoredItem.use.sound = palSoundAssetId(45)
expectedFiles.set('content/items.json', items as unknown as MigrationJson)

const sceneIds = baseFiles.get('content/scenes/index.json') as unknown as string[]
for (const sceneId of sceneIds) {
  const path = `content/scenes/${sceneId}.json`
  expectedFiles.set(
    path,
    upgradeLegacySoundCommands(baseFiles.get(path), resolveSound) as MigrationJson,
  )
}

const baseScriptIndex = baseFiles.get('content/scripts/index.json') as unknown as ScriptIndexV1
const upgradedChunks: Record<string, ScriptChunkV1> = {}
for (const [id, meta] of Object.entries(baseScriptIndex.chunks)) {
  const path = `content/scripts/${meta.path}`
  upgradedChunks[id] = upgradeLegacySoundCommands(
    baseFiles.get(path),
    resolveSound,
  ) as unknown as ScriptChunkV1
}
const legacy122 = findLegacySound122(baseFiles.get('content/scripts/chunks/scene/s145.json'))
assertSame(
  legacy122,
  ['#/scripts/scene~1s145~1override~1on-enter~1L-23975~1stage-0/86'],
  '旧空槽 122 唯一位置',
)
const normalizedScripts = normalizeScriptLibrary(baseScriptIndex, upgradedChunks)
expectedFiles.set('content/scripts/index.json', normalizedScripts.index as unknown as MigrationJson)
for (const [id, chunk] of Object.entries(normalizedScripts.chunks)) {
  const meta = normalizedScripts.index.chunks[id]
  if (!meta) fail(`归一化脚本缺 meta: ${id}`)
  expectedFiles.set(`content/scripts/${meta.path}`, chunk as unknown as MigrationJson)
}

const generatedChanges = [...expectedFiles.keys()]
  .filter((path) => !isDeepStrictEqual(baseFiles.get(path), expectedFiles.get(path)))
  .sort()
const changedChunks = generatedChanges.filter((path) => path.startsWith('content/scripts/chunks/'))
if (generatedChanges.length !== 147 || changedChunks.length !== 138)
  fail(`期望变化计数漂移: generated=${generatedChanges.length} chunks=${changedChunks.length}`)
assertSame(
  generatedChanges.filter((path) => path.startsWith('content/scenes/')),
  ['content/scenes/s018.json', 'content/scenes/s090.json', 'content/scenes/s180.json'],
  '场景变化集',
)
if (
  jsonDigest(generatedChanges) !==
  '5ecdfdf2ae667719d8248a2e059f0598f7fedc5d5d9c3ceb1d98aecf2054a357'
)
  fail(`147 路径摘要漂移: ${jsonDigest(generatedChanges)}`)
if (
  jsonDigest(changedChunks) !== 'e476cdb7875553f0ebbea7703bfef93c1e1407b024ea02f60d86e112680b612a'
)
  fail(`138 chunk 路径摘要漂移: ${jsonDigest(changedChunks)}`)

for (const [path, expected] of expectedFiles)
  assertSame(jsonAt(`${baselineRoot}/${path}`), expected, `baseline/${path}`)
const expectedState = baselineState({ files: expectedFiles, managedFiles, hashes: atomicHashes })
assertSame(jsonAt(`${baselineRoot}/_state.json`), expectedState, 'baseline/_state.json')
const stateHashChanges = Object.keys(expectedState.files).filter(
  (path) => expectedState.files[path] !== rawBaseState.files[path],
)
assertSame(stateHashChanges.sort(), generatedChanges, 'baseline hash 变化集')

for (const path of generatedChanges) {
  assertSame(
    gitJson(`${projectRoot}/${path}`),
    baseFiles.get(path),
    `旧 project/baseline 共同基线 ${path}`,
  )
  assertSame(jsonAt(`${projectRoot}/${path}`), expectedFiles.get(path), `project/${path}`)
}
const baseManifest = gitJson(`${projectRoot}/manifest.json`) as never
const expectedManifest = closePalSoundManifest(baseManifest, expectedCatalog)
assertSame(jsonAt(`${projectRoot}/manifest.json`), expectedManifest, 'project/manifest.json')

const baselineDiff = diffEntries(baselineRoot)
assertExactPaths(
  new Set(baselineDiff.keys()),
  new Set([
    ...generatedChanges.map((path) => `${baselineRoot}/${path}`),
    `${baselineRoot}/_state.json`,
  ]),
  'baseline git diff',
)
const projectDiff = diffEntries(projectRoot)
assertExactPaths(
  new Set(projectDiff.keys()),
  new Set([
    ...generatedChanges.map((path) => `${projectRoot}/${path}`),
    `${projectRoot}/manifest.json`,
  ]),
  'project git diff',
)

const expectedWavs = new Set(
  soundAssets.binaries.map((sound) => sound.record.path.slice('assets/migrated/sounds/'.length)),
)
const soundDir = resolve(repo, projectRoot, 'assets/migrated/sounds')
assertExactPaths(new Set(readdirSync(soundDir)), expectedWavs, 'materialized WAV')
for (const sound of soundAssets.binaries) {
  const bytes = readFileSync(resolve(repo, projectRoot, sound.record.path))
  if (bytes.byteLength !== sound.record.bytes || sha256(bytes) !== sound.record.sha256)
    fail(`物化 WAV 与 catalog 不符: ${sound.id} ${sound.record.path}`)
}

const report = {
  base: BASE,
  managedFiles: rawBaseState.managedFiles.length,
  comparedBaselineJson: baseFiles.size,
  atomicMaps: atomicHashes.size,
  generatedJsonChanges: generatedChanges.length,
  sceneChanges: 3,
  chunkChanges: changedChunks.length,
  pathDigest: jsonDigest(generatedChanges),
  chunkPathDigest: jsonDigest(changedChunks),
  baselineDiffFiles: baselineDiff.size,
  projectDiffFiles: projectDiff.size,
  sounds: soundAssets.report,
  nonWhitelistChanges: 0,
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
