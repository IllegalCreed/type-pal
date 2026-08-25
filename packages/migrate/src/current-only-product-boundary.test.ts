import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCurrentManifestStartup } from '@type-pal/content'
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
const migrationSources = ['packages/migrate/src', 'packages/migrate/scripts'].flatMap(productionSources)

describe('current-only product boundary', () => {
  test.each(['demo', 'e2e-own', 'pal'])('%s manifest is canonical content18 startup data', (id) => {
    const manifestPath = join(repoRoot, `projects/${id}/manifest.json`)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
    const content = manifest.content as Record<string, string>
    const scenesPath = content.scenes
    if (!scenesPath) throw new Error(`${id}: manifest 缺 content.scenes`)
    const sceneDir = scenesPath.endsWith('/') ? scenesPath : `${scenesPath}/`
    const ids = JSON.parse(
      readFileSync(join(repoRoot, `projects/${id}/${sceneDir}index.json`), 'utf8'),
    ) as string[]
    expect(() => validateCurrentManifestStartup(manifest, ids, `projects/${id}/manifest.json`)).not.toThrow()
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
      .filter((path) => /(?:^|[-_.])(v(?:5|8|9|1[0-7])|legacy|compat|upgrade)(?:[-_.]|$)/i.test(path))
    expect(forbidden).toEqual([])
  })

  test('has no old product imports, exports, public symbols or version branches', () => {
    const violations: string[] = []
    for (const path of productSources) {
      const source = readFileSync(path, 'utf8')
      const rel = relative(repoRoot, path)
      const lines = source.split('\n')
      lines.forEach((line, index) => {
        const oldModule = /(?:from|export\s+\*\s+from)\s+['"][^'"]*(?:v5|v1[2-7]|legacy|compat|upgrade)[^'"]*['"]/i
        const oldPublicSymbol = /\b(?:export\s+)?(?:type|interface|class|function|const)\s+(?:Legacy\w*|Compat\w*|Upgrade\w*|\w*V(?:5|12|13|14|15|16|17)\w*)\b/
        const oldProductBranch =
          /\b(?:contentVersion|minimumSaveVersion)\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-7]|1[0-7])\b/
        const retiredStartWorldSkills = /\.startWorld\.learnedSkills|startWorld[^\n]*learnedSkills/
        const oldProjectLoader = /(?:from\s+['"][^'"]*\/loader\.js['"]|\bloadProjectFrom\b|\bloadAllScriptChunks\b)/
        const oldSaveBranch =
          rel.startsWith('packages/reforge/src/save/') &&
          /\bversion\s*(?:===|!==|<=|>=|<|>)\s*[1-7]\b/.test(line)
        if (
          oldModule.test(line) ||
          oldPublicSymbol.test(line) ||
          oldProductBranch.test(line) ||
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
    for (const path of migrationSources) {
      const source = readFileSync(path, 'utf8')
      const rel = relative(repoRoot, path)
      source.split('\n').forEach((line, index) => {
        const historicalPublicationPath = /(?:_transitions\/|content\/migrations\/|script-v4-v5)/
        const oldProductBranch = /\b(?:contentVersion|minimumSaveVersion)\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-7]|1[0-7])\b/
        const oldPublicationApi = /\b(?:rewind|transitionSeal|extractLegacyScriptEdges|LegacySavePayload)\b/i
        if (
          historicalPublicationPath.test(line) ||
          oldProductBranch.test(line) ||
          oldPublicationApi.test(line)
        )
          violations.push(`${rel}:${index + 1}:${line.trim()}`)
      })
    }
    expect(violations).toEqual([])
  })
})
