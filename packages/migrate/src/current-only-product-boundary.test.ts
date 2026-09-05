import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCurrentManifestStartup, validateSceneIndex } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const productRoots = [
  'packages/content/src',
  'packages/reforge/src',
  'packages/reforge/scripts',
  'packages/editor/src',
] as const

function productionSources(root: string): string[] {
  const out: string[] = []
  const visit = (path: string): void => {
    for (const name of readdirSync(path)) {
      const child = join(path, name)
      if (statSync(child).isDirectory()) visit(child)
      else if (
        ['.ts', '.tsx', '.mts'].includes(extname(child)) &&
        !name.includes('.test.') &&
        !name.includes('.spec.')
      )
        out.push(child)
    }
  }
  visit(join(repoRoot, root))
  return out
}

const productSources = productRoots.flatMap(productionSources)
const migrationSources = ['packages/migrate/src', 'packages/migrate/scripts'].flatMap(
  productionSources,
)

const retiredVersionNumber = '(?:5|8|9|1[0-9])'
const retiredEpochPathToken = new RegExp(
  `(?:^|[/_.-])(?:v${retiredVersionNumber}|(?:content|manifest|project|save)[-_.]?v?${retiredVersionNumber})(?=$|[/_.-])`,
  'i',
)
const retiredSymbolName = new RegExp(
  `^(?:Compat\\w*|Upgrade\\w*|Legacy(?:Content|Manifest|Project|Save)\\w*|\\w*Legacy(?:Content|Manifest|Project|Save)\\w*|v${retiredVersionNumber}\\w*|\\w*V${retiredVersionNumber}\\w*|(?:Content|Manifest|Project|Save)V?${retiredVersionNumber}\\w*|(?:content|manifest|project|save)v?${retiredVersionNumber}\\w*)$`,
)

function hasRetiredEpochPath(value: string): boolean {
  const normalized = value.replaceAll('\\\\', '/')
  return (
    retiredEpochPathToken.test(normalized) ||
    /(?:^|[/_.-])(?:compat|upgrade)(?=$|[/_.-])/i.test(normalized) ||
    /(?:legacy[-_.]?(?:content|manifest|project|save)|(?:content|manifest|project|save)[-_.]?legacy)/i.test(
      normalized,
    )
  )
}

function moduleSpecifiers(line: string): string[] {
  const out: string[] = []
  const pattern = /\b(?:from|import|require)\s*(?:\(\s*)?['"]([^'"]+)['"]/g
  for (const match of line.matchAll(pattern)) if (match[1]) out.push(match[1])
  return out
}

function hasRetiredModuleReference(line: string): boolean {
  return moduleSpecifiers(line).some(hasRetiredEpochPath)
}

function hasRetiredPublicSymbol(line: string): boolean {
  const declaration = line.match(
    /\b(?:export\s+(?:default\s+)?)?(?:abstract\s+)?(?:type|interface|class|function|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/,
  )
  if (declaration?.[1] && retiredSymbolName.test(declaration[1])) return true
  if (!/\bexport\s*\{/.test(line)) return false
  return (line.match(/[A-Za-z_$][\w$]*/g) ?? []).some((identifier) =>
    retiredSymbolName.test(identifier),
  )
}

describe('current-only product boundary', () => {
  test.each(['demo', 'e2e-own', 'pal'])('%s manifest is canonical content20 startup data', (id) => {
    const manifestPath = join(repoRoot, `projects/${id}/manifest.json`)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
    const content = manifest.content as Record<string, string>
    const scenesPath = content.scenes
    if (!scenesPath) throw new Error(`${id}: manifest 缺 content.scenes`)
    const sceneDir = scenesPath.endsWith('/') ? scenesPath : `${scenesPath}/`
    const sceneIndex = validateSceneIndex(
      JSON.parse(readFileSync(join(repoRoot, `projects/${id}/${sceneDir}index.json`), 'utf8')),
      `${sceneDir}index.json`,
    )
    const ids = sceneIndex.scenes.map((entry) => entry.id)
    expect(() =>
      validateCurrentManifestStartup(manifest, ids, `projects/${id}/manifest.json`),
    ).not.toThrow()
    expect(Object.hasOwn(manifest, 'entryScene')).toBe(false)
    expect(Object.hasOwn(manifest, 'startWorld')).toBe(false)
    for (const entry of manifest.entryPoints as Array<{ startWorld: Record<string, unknown> }>)
      expect(entry.startWorld).not.toHaveProperty('learnedSkills')
  })

  test('production code has no persisted top-level startup fallback', () => {
    const violations = productSources.flatMap((path) => {
      const rel = relative(repoRoot, path)
      return readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          /\bmanifest\.(?:entryScene|startWorld)\b/.test(line)
            ? [`${rel}:${index + 1}:${line.trim()}`]
            : [],
        )
    })
    expect(violations).toEqual([])
  })

  test('has no product-epoch filenames', () => {
    const forbidden = productSources
      .map((path) => relative(repoRoot, path))
      .filter((path) =>
        /(?:^|[-_.])(v(?:5|8|9|1[0-8])|legacy|compat|upgrade)(?:[-_.]|$)/i.test(path),
      )
    expect(forbidden).toEqual([])
  })

  test('has no old product imports, exports, public symbols or version branches', () => {
    const violations: string[] = []
    for (const path of productSources) {
      const source = readFileSync(path, 'utf8')
      const rel = relative(repoRoot, path)
      const lines = source.split('\n')
      lines.forEach((line, index) => {
        const oldContentBranch = /\bcontentVersion\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-9]|1[0-9])\b/
        const oldMinimumSaveBranch = /\bminimumSaveVersion\s*(?:===|!==|<=|>=|<|>)\s*[1-7]\b/
        const retiredStartWorldSkills = /\.startWorld\.learnedSkills|startWorld[^\n]*learnedSkills/
        const oldProjectLoader =
          /(?:from\s+['"][^'"]*\/loader\.js['"]|\bloadProjectFrom\b|\bloadAllScriptChunks\b)/
        const oldSaveBranch =
          rel.startsWith('packages/reforge/src/save/') &&
          /\bversion\s*(?:===|!==|<=|>=|<|>)\s*[1-7]\b/.test(line)
        if (
          hasRetiredModuleReference(line) ||
          hasRetiredPublicSymbol(line) ||
          oldContentBranch.test(line) ||
          oldMinimumSaveBranch.test(line) ||
          retiredStartWorldSkills.test(line) ||
          oldProjectLoader.test(line) ||
          oldSaveBranch
        )
          violations.push(`${rel}:${index + 1}:${line.trim()}`)
      })
    }
    expect(violations).toEqual([])
  })

  test('migration publishes only the current project epoch', () => {
    const violations: string[] = []
    const forbiddenFilenames = migrationSources
      .map((path) => relative(repoRoot, path))
      .filter(hasRetiredEpochPath)
    expect(forbiddenFilenames).toEqual([])

    for (const path of migrationSources) {
      const source = readFileSync(path, 'utf8')
      const rel = relative(repoRoot, path)
      source.split('\n').forEach((line, index) => {
        const historicalPublicationPath = /(?:_transitions\/|content\/migrations\/|script-v4-v5)/
        const oldContentBranch =
          /(?:\bcontentVersion\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-9]|1[0-9])\b|\b(?:[1-9]|1[0-9])\s*(?:===|!==|<=|>=|<|>)\s*(?:\w+\.)*contentVersion\b)/
        const oldMinimumSaveBranch =
          /(?:\bminimumSaveVersion\s*(?:===|!==|<=|>=|<|>)\s*[1-7]\b|\b[1-7]\s*(?:===|!==|<=|>=|<|>)\s*(?:\w+\.)*minimumSaveVersion\b)/
        const oldPublicationApi =
          /\b(?:rewind|transitionSeal|extractLegacyScriptEdges|LegacySavePayload)\b/i
        if (
          historicalPublicationPath.test(line) ||
          hasRetiredModuleReference(line) ||
          hasRetiredPublicSymbol(line) ||
          oldContentBranch.test(line) ||
          oldMinimumSaveBranch.test(line) ||
          oldPublicationApi.test(line)
        )
          violations.push(`${rel}:${index + 1}:${line.trim()}`)
      })
    }
    expect(violations).toEqual([])
  })

  test.each([
    'packages/migrate/src/content18-parser.ts',
    'packages/migrate/src/content18-upgrader.ts',
    'packages/migrate/src/v18/transform.ts',
    'packages/migrate/src/project-v9-compat.ts',
  ])('retired migration path detector rejects %s', (path) => {
    expect(hasRetiredEpochPath(path)).toBe(true)
  })

  test.each([
    "import('./v18/transform.js')",
    "from 'v18-upgrade'",
    "export * from './content18-parser.js'",
    "require('./project-v9-compat.js')",
  ])('retired module detector rejects %s', (line) => {
    expect(hasRetiredModuleReference(line)).toBe(true)
  })

  test.each([
    'export class Content18Parser {}',
    'const v18Migration = {}',
    'enum ContentV18 {}',
    'export { Content18Parser }',
  ])('retired public symbol detector rejects %s', (line) => {
    expect(hasRetiredPublicSymbol(line)).toBe(true)
  })

  test.each([
    'packages/migrate/src/legacy-dialog.ts',
    'packages/migrate/src/current-project.ts',
  ])('current or raw-input migration path remains allowed: %s', (path) => {
    expect(hasRetiredEpochPath(path)).toBe(false)
  })
})
