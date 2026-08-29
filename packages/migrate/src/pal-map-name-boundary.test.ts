import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const packagesDir = join(repo, 'packages')
const authoredModule = ['@type-pal/shared', 'pal-authored-map-names'].join('/')
const gameModule = ['@type-pal', 'game'].join('/')
const allowedConsumers = new Set([
  'packages/game/src/tools/map-names.ts',
  'packages/migrate/src/pal-map-names.ts',
  'packages/migrate/src/pal-map-names.pal.test.ts',
])

const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'coverage',
  'baselines',
  'public',
  'assets',
])

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name)
    return statSync(path).isDirectory()
      ? ignoredDirectories.has(name)
        ? []
        : files(path)
      : /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(name)
        ? [path]
        : []
  })
}

const packageNames = readdirSync(packagesDir).filter((packageName) => {
  const root = join(packagesDir, packageName)
  return statSync(root).isDirectory() && existsSync(join(root, 'package.json'))
})
const packageSources = packageNames.flatMap((packageName) =>
  files(join(packagesDir, packageName)),
)
type Manifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}
const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const
const manifest = (packageName: string): Manifest =>
  JSON.parse(readFileSync(join(packagesDir, packageName, 'package.json'), 'utf8')) as Manifest
const dependency = (packageName: string, dependencyName: string): string | undefined => {
  const value = manifest(packageName)
  return dependencySections.map((section) => value[section]?.[dependencyName]).find(Boolean)
}

describe('PAL authored map-name boundary', () => {
  test('only the phase1 wrapper and migration producer/test consume the authored fixture', () => {
    const consumers = packageSources
      .filter((path) => readFileSync(path, 'utf8').includes(authoredModule))
      .map((path) => relative(repo, path))
    expect(consumers.sort()).toEqual([...allowedConsumers].sort())
    expect(readFileSync(join(packagesDir, 'shared/src/index.ts'), 'utf8')).not.toContain(
      'pal-authored-map-names',
    )
  })

  test('keeps the dependency graph one-way through shared', () => {
    expect(dependency('game', '@type-pal/shared')).toBe('workspace:*')
    expect(dependency('migrate', '@type-pal/shared')).toBe('workspace:*')
    expect(dependency('editor', '@type-pal/shared')).toBeUndefined()
    for (const packageName of packageNames.filter((name) => name !== 'game'))
      expect(dependency(packageName, gameModule), packageName).toBeUndefined()

    const reverseImports = packageSources
      .filter((path) => !path.startsWith(join(packagesDir, 'game', 'src')))
      .filter((path) => readFileSync(path, 'utf8').includes(gameModule))
      .map((path) => relative(repo, path))
    expect(reverseImports).toEqual([])
  })
})
