import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateActors } from '@type-pal/content'
import ts from 'typescript'
import { expect, test } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const productRoots = ['packages/content/src', 'packages/reforge/src', 'packages/editor/src']

function productionSources(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : productionSources(path)
    return entry.isFile() &&
      /\.(?:ts|tsx|mts)$/.test(entry.name) &&
      !/\.(?:test|spec)\./.test(entry.name)
      ? [path]
      : []
  })
}

function spriteIdentityComparisons(path: string, source: string, actorIds: ReadonlySet<string>) {
  if (!source.includes('sprite')) return []
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest)
  const matches: string[] = []
  const equality = new Set([
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ])
  function unparenthesized(expression: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(expression)) expression = expression.expression
    return expression
  }
  function isSpriteProperty(value: ts.Expression): boolean {
    const expression = unparenthesized(value)
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text === 'sprite'
    return (
      ts.isElementAccessExpression(expression) &&
      ts.isStringLiteralLike(expression.argumentExpression) &&
      expression.argumentExpression.text === 'sprite'
    )
  }
  function isPalActorId(value: ts.Expression): boolean {
    const expression = unparenthesized(value)
    return ts.isStringLiteralLike(expression) && actorIds.has(expression.text)
  }
  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      equality.has(node.operatorToken.kind) &&
      ((isSpriteProperty(node.left) && isPalActorId(node.right)) ||
        (isSpriteProperty(node.right) && isPalActorId(node.left)))
    ) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
      matches.push(`${path}:${line + 1}: ${node.getText(file)}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return matches
}

test('production has no direct sprite-property equality with a literal PAL ActorId', () => {
  const actors = validateActors(
    JSON.parse(readFileSync(join(repoRoot, 'projects/pal/content/actors.json'), 'utf8')),
  )
  const actorIds = new Set(actors.map(({ id }) => id))
  const violations = productRoots
    .flatMap((root) => productionSources(join(repoRoot, root)))
    .flatMap((path) =>
      spriteIdentityComparisons(relative(repoRoot, path), readFileSync(path, 'utf8'), actorIds),
    )
  expect(violations).toEqual([])
})

test('finds direct equality on either side and ignores comments, strings and actor properties', () => {
  const source = [
    "const wrong = entity.sprite\n  === 'li-xiaoyao'",
    "const wrongToo = 'li-xiaoyao' !== entity['sprite']",
    "const right = entity.actor === 'li-xiaoyao'",
    "// entity.sprite === 'li-xiaoyao'",
    `const text = "entity.sprite === 'li-xiaoyao'"`,
  ].join('\n')
  expect(spriteIdentityComparisons('fixture.ts', source, new Set(['li-xiaoyao']))).toEqual([
    "fixture.ts:1: entity.sprite\n  === 'li-xiaoyao'",
    "fixture.ts:3: 'li-xiaoyao' !== entity['sprite']",
  ])
})
