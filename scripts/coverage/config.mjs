import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const baselinePath = resolve(repoRoot, 'scripts/coverage/baseline.fast.json')
export const coverageRoot = resolve(repoRoot, 'coverage')

export const coverageVersions = Object.freeze({
  provider: 'v8',
  vitest: '4.1.7',
  coverageV8: '4.1.7',
})

export const coverageExcludes = Object.freeze([
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.d.ts',
])

export const testRunnerExcludes = Object.freeze([
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
])

export const fastPalTestGlobs = Object.freeze([
  '**/*.pal.test.js',
  '**/*.pal.test.jsx',
  '**/*.pal.test.ts',
  '**/*.pal.test.tsx',
  '**/*.pal.test.mjs',
  '**/*.pal.test.mts',
  '**/*.pal.test.cjs',
  '**/*.pal.test.cts',
])

export const fullRequiredBinaryFiles = Object.freeze([
  'data/raw/ABC.MKF',
  'data/raw/BALL.MKF',
  'data/raw/DATA.MKF',
  'data/raw/F.MKF',
  'data/raw/FBP.MKF',
  'data/raw/FIRE.MKF',
  'data/raw/GOP.MKF',
  'data/raw/MAP.MKF',
  'data/raw/MGO.MKF',
  'data/raw/M.MSG',
  'data/raw/PAT.MKF',
  'data/raw/RGM.MKF',
  'data/raw/RNG.MKF',
  'data/raw/SOUNDS.MKF',
  'data/raw/SSS.MKF',
  'data/raw/WORD.DAT',
])

export const fullRequiredJsonFiles = Object.freeze([
  'data/extracted/asset-manifest.json',
  'data/extracted/events/all.json',
  'data/extracted/data/player-roles.json',
  'data/extracted/data/scene/0.json',
  'data/extracted/data/scene/1.json',
  'data/extracted/data/scene/14.json',
  'data/extracted/data/scene/17.json',
  'projects/pal/manifest.json',
  'packages/migrate/baselines/pal/_state.json',
])

export const fullRequiredDirectories = Object.freeze([
  { path: 'data/extracted/data/tileset', extension: '.rle', minimumFiles: 223 },
  { path: 'data/extracted/data/animation', extension: '.rle', minimumFiles: 12 },
  { path: 'data/extracted/data/sprite', extension: '.rle', minimumFiles: 636 },
  { path: 'data/extracted/data/battle-sprite/enemy', extension: '.rle', minimumFiles: 153 },
  { path: 'data/extracted/data/battle-sprite/player', extension: '.rle', minimumFiles: 19 },
  { path: 'data/extracted/data/magic', extension: '.rle', minimumFiles: 56 },
])

export const migrateCoverageFastTestExcludes = Object.freeze([
  'src/dialogue-project.test.ts',
  'src/migrate-content.test.ts',
  'src/migrate-enemies.test.ts',
  'src/pal-assets.test.ts',
  'src/pal-casualty-scripts.test.ts',
  'src/pal-project.test.ts',
  'src/pal-world-sprite-identity-boundary.test.ts',
  'src/scene-entry-product.test.ts',
  'src/script-library-audit.test.ts',
])

const standardSource = Object.freeze({
  include: ['src/**/*.{ts,tsx}'],
  roots: ['src'],
  extraFiles: [],
})

/**
 * `include` 是覆盖率的真源：Vitest 4 只有显式 include 才会把未导入文件按 0% 纳入。
 * `roots/extraFiles` 是独立文件 census，用来验证报告没有漏掉匹配的生产源码。
 */
export const coveragePackages = Object.freeze([
  {
    id: 'shared',
    name: '@type-pal/shared',
    directory: 'packages/shared',
    ...standardSource,
    testArgs: ['--passWithNoTests'],
  },
  {
    id: 'content',
    name: '@type-pal/content',
    directory: 'packages/content',
    ...standardSource,
    testArgs: ['--passWithNoTests'],
  },
  {
    id: 'pal-extract',
    name: '@type-pal/pal-extract',
    directory: 'packages/pal-extract',
    include: ['src/**/*.ts', 'scripts/extract-videos.ts'],
    roots: ['src'],
    extraFiles: ['scripts/extract-videos.ts'],
    testArgs: ['--passWithNoTests'],
    fastTestExcludes: [
      'src/events/roundtrip.test.ts',
      'src/io/msg.test.ts',
      'src/io/sss.test.ts',
      'src/io/word.test.ts',
      'src/io/yj2.test.ts',
      'src/resources/map.test.ts',
      'src/resources/parsers/__tests__/data-misc.test.ts',
      'src/resources/parsers/__tests__/misc-mkf.test.ts',
      'src/resources/parsers/rng-frames.test.ts',
      'src/resources/sprite.test.ts',
      'src/resources/tables.test.ts',
    ],
  },
  {
    id: 'migrate',
    name: '@type-pal/migrate',
    directory: 'packages/migrate',
    include: ['src/**/*.ts', 'scripts/migrate-content.mts', 'scripts/bake-assets.mts'],
    roots: ['src'],
    extraFiles: ['scripts/migrate-content.mts', 'scripts/bake-assets.mts'],
    testArgs: ['--config', 'vitest.config.ts'],
    fastTestArgs: ['--project', 'unit'],
    fastTestExcludes: migrateCoverageFastTestExcludes,
  },
  {
    id: 'reforge',
    name: '@type-pal/reforge',
    directory: 'packages/reforge',
    ...standardSource,
    testArgs: ['--passWithNoTests'],
  },
  {
    id: 'game',
    name: '@type-pal/game',
    directory: 'packages/game',
    ...standardSource,
    testArgs: ['--config', 'vitest.config.ts', '--passWithNoTests'],
    fastTestExcludes: [
      'src/__tests__/e2e-battle.test.ts',
      'src/assets/rng-blob-snapshot.test.ts',
      'src/assets/sprite-blob-snapshot.test.ts',
      'src/assets/tileset-blob-snapshot.test.ts',
      'src/dev/dev-panel.test.ts',
    ],
  },
  {
    id: 'editor',
    name: '@type-pal/editor',
    directory: 'packages/editor',
    ...standardSource,
    testArgs: ['--passWithNoTests', '--maxWorkers', '2'],
    coverageTestExcludes: [
      'src/ui/design-system/*-adoption.test.ts',
      'src/ui/design-system/adoption.test.ts',
      'src/ui/design-system/boundary.test.ts',
      'src/ui/design-system/field-commit-boundary.test.ts',
    ],
  },
])

const isProductionSource = (file) => {
  if (!/\.(?:ts|tsx|mts)$/.test(file)) return false
  if (/\.d\.ts$/.test(file)) return false
  if (/\.(?:test|spec)\.(?:ts|tsx|mts)$/.test(file)) return false
  return !file.split('/').includes('__tests__')
}

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

export async function listProductionSources(packageConfig) {
  const packageRoot = resolve(repoRoot, packageConfig.directory)
  const nested = (
    await Promise.all(packageConfig.roots.map((root) => walk(resolve(packageRoot, root))))
  ).flat()
  const extras = packageConfig.extraFiles.map((file) => resolve(packageRoot, file))
  return [
    ...new Set(
      [...nested, ...extras].filter((file) => isProductionSource(relative(packageRoot, file))),
    ),
  ].sort()
}

export function testSelection(packageConfig, profile) {
  return {
    args: [
      ...packageConfig.testArgs,
      ...(profile === 'fast' ? (packageConfig.fastTestArgs ?? []) : []),
    ],
    excludes: [
      ...testRunnerExcludes,
      ...(packageConfig.coverageTestExcludes ?? []),
      ...(profile === 'fast'
        ? [...fastPalTestGlobs, ...(packageConfig.fastTestExcludes ?? [])]
        : []),
    ],
  }
}

export function scopeDigest(packageConfig, absoluteFiles) {
  const payload = {
    directory: packageConfig.directory,
    include: packageConfig.include,
    exclude: coverageExcludes,
    files: absoluteFiles.map((file) => relative(repoRoot, file).replaceAll('\\', '/')),
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export async function testExecutionDigest(packageConfig, profile, testIdentities) {
  const packageRoot = resolve(repoRoot, packageConfig.directory)
  const configFiles = []
  for (const name of ['vitest.config.ts', 'vite.config.ts']) {
    try {
      const content = await readFile(resolve(packageRoot, name), 'utf8')
      configFiles.push({ name, sha256: createHash('sha256').update(content).digest('hex') })
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
    }
  }
  return createHash('sha256')
    .update(
      JSON.stringify({
        profile,
        selection: testSelection(packageConfig, profile),
        configFiles,
        testIdentities,
      }),
    )
    .digest('hex')
}
