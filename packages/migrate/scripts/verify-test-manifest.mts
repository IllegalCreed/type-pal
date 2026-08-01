import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ListedVitestTest,
  normalizeTestList,
  summarizeTestList,
} from '../src/test-manifest.js'
import {
  PAL_CANARY_TESTS,
  PAL_FRESH_TESTS,
  PAL_LITE_TESTS,
  PAL_MIXED_TESTS,
  PAL_ORACLE_TESTS,
  PAL_RELEASE_PREFLIGHT_TESTS,
  PAL_SHARED_ONLY_TESTS,
  PAL_SHARED_TESTS,
  PAL_UNIT_SAFE_TESTS,
} from '../vitest.tests.js'

interface GatePin {
  files: number
  tests: number
  sha256: string
  routeSha256: string
}

interface TestManifestV1 {
  kind: 'migrate-test-manifest'
  version: 1
  baseline: { files: number; tests: number }
  gates: { fast: GatePin; release: GatePin; canary: GatePin }
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(packageRoot, 'test-fixtures/test-manifest-v1.json')
const oldManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as TestManifestV1

function list(config: string, projects: string[] = []): ListedVitestTest[] {
  const args = ['exec', 'vitest', 'list', '--config', config, '--json']
  for (const project of projects) args.push('--project', project)
  const output = execFileSync('pnpm', args, {
    cwd: packageRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  return JSON.parse(output) as ListedVitestTest[]
}

function gateSummary(config: string, projects: string[] = []) {
  const normalized = normalizeTestList(list(config, projects), packageRoot)
  return summarizeTestList(normalized)
}

function allFiles(root: string): string[] {
  const result: string[] = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.isFile()) result.push(relative(packageRoot, absolute).split(sep).join('/'))
    }
  }
  visit(resolve(packageRoot, root))
  return result
}

function assertRoutes(
  fast: ReturnType<typeof gateSummary>,
  release: ReturnType<typeof gateSummary>,
  canary: ReturnType<typeof gateSummary>,
): void {
  const fastKeys = new Set(fast.entries.map((entry) => entry.key))
  const releaseKeys = new Set(release.entries.map((entry) => entry.key))
  for (const key of fastKeys) {
    if (!releaseKeys.has(key)) throw new Error(`test manifest: fast test 不在 release ${key}`)
  }
  const expected = {
    shared: PAL_SHARED_ONLY_TESTS,
    mixed: PAL_MIXED_TESTS,
    fresh: PAL_FRESH_TESTS,
    lite: PAL_LITE_TESTS,
    oracle: PAL_ORACLE_TESTS,
    canary: PAL_CANARY_TESTS,
    preflight: PAL_RELEASE_PREFLIGHT_TESTS,
  }
  for (const [route, files] of Object.entries(expected)) {
    for (const file of files) {
      const fastHas = fast.entries.some((entry) => entry.file === file)
      const releaseHas = release.entries.some((entry) => entry.file === file)
      const canaryHas = canary.entries.some((entry) => entry.file === file)
      if (route === 'mixed') {
        if (!fastHas || !releaseHas || canaryHas)
          throw new Error(`test manifest: mixed route 漂移 ${file}`)
      } else if (route === 'shared' || route === 'fresh' || route === 'preflight') {
        if (!releaseHas || fastHas) throw new Error(`test manifest: ${route} route 漂移 ${file}`)
      } else if (route === 'lite' || route === 'oracle') {
        if (!fastHas || !releaseHas) throw new Error(`test manifest: ${route} route 漂移 ${file}`)
      } else if (!canaryHas || fastHas || releaseHas) {
        throw new Error(`test manifest: canary route 漂移 ${file}`)
      }
    }
  }
  for (const file of PAL_UNIT_SAFE_TESTS) {
    if (
      !fast.entries.some((entry) => entry.file === file) ||
      !release.entries.some((entry) => entry.file === file)
    )
      throw new Error(`test manifest: unit-safe route 漂移 ${file}`)
  }

  // File suffixes are a diagnostic convention only; the explicit route table is authority.
  const classified = new Set([
    ...PAL_SHARED_TESTS,
    ...PAL_FRESH_TESTS,
    ...PAL_LITE_TESTS,
    ...PAL_ORACLE_TESTS,
    ...PAL_CANARY_TESTS,
    ...PAL_RELEASE_PREFLIGHT_TESTS,
    ...PAL_UNIT_SAFE_TESTS,
  ])
  const sourceBackedMarkers = [
    'pal-test-fixture',
    '.shadow/N3-1/',
    'data/extracted',
    'loadPalMigrationSources',
  ] as const
  for (const file of allFiles('src')) {
    if (!file.endsWith('.test.ts')) continue
    const source = readFileSync(resolve(packageRoot, file), 'utf8')
    const sourceBacked =
      file.endsWith('.pal.test.ts') || sourceBackedMarkers.some((marker) => source.includes(marker))
    if (sourceBacked && !classified.has(file))
      throw new Error(`test manifest: source-backed consumer 未显式分类 ${file}`)
  }
}

const fast = gateSummary('vitest.config.ts', ['unit', 'pal-lite', 'pal-oracle'])
const release = gateSummary('vitest.release.config.ts')
const canary = gateSummary('vitest.canary.config.ts')
assertRoutes(fast, release, canary)

if (release.files < oldManifest.baseline.files || release.tests < oldManifest.baseline.tests)
  throw new Error(
    `test manifest: release 清单缩水 ${release.files}/${release.tests} < ${oldManifest.baseline.files}/${oldManifest.baseline.tests}`,
  )

const current: TestManifestV1 = {
  kind: 'migrate-test-manifest',
  version: 1,
  baseline: oldManifest.baseline,
  gates: {
    fast: {
      files: fast.files,
      tests: fast.tests,
      sha256: fast.sha256,
      routeSha256: fast.routeSha256,
    },
    release: {
      files: release.files,
      tests: release.tests,
      sha256: release.sha256,
      routeSha256: release.routeSha256,
    },
    canary: {
      files: canary.files,
      tests: canary.tests,
      sha256: canary.sha256,
      routeSha256: canary.routeSha256,
    },
  },
}
const mode = process.argv[2] ?? '--check'
if (mode === '--check') {
  if (JSON.stringify(current) !== JSON.stringify(oldManifest))
    throw new Error('test manifest: 清单发生变化；请显式运行 --write 并审查 diff')
  console.log(
    `test manifest verified: fast ${fast.files}/${fast.tests}, release ${release.files}/${release.tests}, canary ${canary.files}/${canary.tests}`,
  )
} else if (mode === '--write') {
  writeFileSync(manifestPath, `${JSON.stringify(current, null, 2)}\n`)
  console.log('test manifest: wrote pins; review git diff')
} else {
  throw new Error(`unknown mode ${mode}; use --check or --write`)
}
