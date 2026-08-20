import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const productRoots = [
  'packages/content/src',
  'packages/reforge/src',
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
  test('has no product-epoch filenames', () => {
    const forbidden = productSources
      .map((path) => relative(repoRoot, path))
      .filter((path) => /(?:^|[-_.])(v(?:5|8|9|1[0-6])|legacy|compat|upgrade)(?:[-_.]|$)/i.test(path))
    expect(forbidden).toEqual([])
  })

  test('has no old product imports, exports, public symbols or version branches', () => {
    const violations: string[] = []
    for (const path of productSources) {
      const source = readFileSync(path, 'utf8')
      const rel = relative(repoRoot, path)
      const lines = source.split('\n')
      lines.forEach((line, index) => {
        const oldModule = /(?:from|export\s+\*\s+from)\s+['"][^'"]*(?:v5|v1[2-6]|legacy|compat|upgrade)[^'"]*['"]/i
        const oldPublicSymbol = /\b(?:export\s+)?(?:type|interface|class|function|const)\s+(?:Legacy\w*|Compat\w*|Upgrade\w*|\w*V(?:5|12|13|14|15|16)\w*)\b/
        const oldProductBranch = /\b(?:contentVersion|minimumSaveVersion)\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-7]|1[0-5])\b/
        const oldSaveBranch =
          rel.startsWith('packages/reforge/src/save/') &&
          /\bversion\s*(?:===|!==|<=|>=|<|>)\s*[1-7]\b/.test(line)
        if (
          oldModule.test(line) ||
          oldPublicSymbol.test(line) ||
          oldProductBranch.test(line) ||
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
        const oldProductBranch =
          /\b(?:contentVersion|minimumSaveVersion)\s*(?:===|!==|<=|>=|<|>)\s*(?:[1-7]|1[0-5])\b/
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
