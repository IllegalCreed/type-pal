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

describe('PAL 大世界外观与 Actor 身份边界', () => {
  test('生产代码不以视觉 SpriteDef id 比较推断 PAL Actor 身份', () => {
    const actors = JSON.parse(
      readFileSync(join(repoRoot, 'projects/pal/content/actors.json'), 'utf8'),
    ) as { id: string }[]
    const actorIds = actors.map(({ id }) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const identityComparison = new RegExp(
      `(?:\\.sprite\\s*(?:===|!==|==|!=)\\s*['"](?:${actorIds})['"]|['"](?:${actorIds})['"]\\s*(?:===|!==|==|!=)\\s*[^\\n;]*\\.sprite\\b)`,
    )
    const violations = productRoots.flatMap(productionSources).flatMap((path) => {
      const rel = relative(repoRoot, path)
      return readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          identityComparison.test(line) ? [`${rel}:${index + 1}:${line.trim()}`] : [],
        )
    })
    expect(violations).toEqual([])
  })
})
