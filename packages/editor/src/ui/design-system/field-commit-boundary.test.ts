// @ts-nocheck -- Vitest-only Node/TypeScript AST audit; the editor bundle has no Node dependency.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { EDITOR_MODULES } from '../editor-navigation.js'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = dirname(here)
const adoption = JSON.parse(readFileSync(join(here, 'field-commit-adoption.json'), 'utf8'))

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

function tagName(node: ts.JsxOpeningLikeElement): string {
  return node.tagName.getText()
}

function attribute(node: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function literalAttribute(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  const initializer = attribute(node, name)?.initializer
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : undefined
}

function isContinuousControl(node: ts.JsxOpeningLikeElement): boolean {
  const tag = tagName(node)
  if (['DsDraftTextInput', 'DsDraftNumberInput', 'DsDraftTextArea'].includes(tag)) return false
  if (['DsTextInput', 'DsNumberInput', 'DsTextArea'].includes(tag)) return true
  if (tag === 'textarea') return true
  if (tag !== 'input') return false
  return !['checkbox', 'radio', 'file', 'range', 'color', 'button', 'submit'].includes(
    literalAttribute(node, 'type') ?? 'text',
  )
}

function callName(node: ts.CallExpression): string {
  const expression = node.expression
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return expression.getText()
}

function handlerCalls(node: ts.JsxOpeningLikeElement): ts.CallExpression[] {
  const initializer = attribute(node, 'onChange')?.initializer
  if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) return []
  const calls: ts.CallExpression[] = []
  const visit = (candidate: ts.Node): void => {
    if (ts.isCallExpression(candidate)) calls.push(candidate)
    ts.forEachChild(candidate, visit)
  }
  visit(initializer.expression)
  return calls
}

const indirectProjectMutations = new Set([
  'on',
  'onChange',
  'patch',
  'patchResource',
  'patchSeed',
  'patchStats',
  'props.on',
  'setAction',
  'setCostItems',
  'setDefeatedReward',
  'setEffect',
  'setRules',
  'setStat',
])

function violations(path: string, enforceIndirect: boolean): string[] {
  const sourceText = readFileSync(path, 'utf8')
  const source = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const failures: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      isContinuousControl(node)
    ) {
      for (const call of handlerCalls(node)) {
        const name = callName(call)
        const directDispatch = name === 'dispatch'
        if (!directDispatch && !(enforceIndirect && indirectProjectMutations.has(name))) continue
        const line = source.getLineAndCharacterOfPosition(call.getStart(source)).line + 1
        failures.push(`${relative(uiRoot, path)}:${line}: continuous-onchange-project-mutation`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return failures
}

describe('editor field draft/commit static boundary', () => {
  test('keeps the adoption inventory attached to real registered pages', () => {
    const registered = new Set(
      EDITOR_MODULES.flatMap((module) =>
        module.subpages.map((subpage) => `${module.id}/${subpage.id}`),
      ),
    )
    const inventoried = adoption.surfaces.flatMap(
      (surface: { registry: string[] }) => surface.registry,
    )
    for (const id of inventoried) expect(registered, id).toContain(id)
    expect(inventoried).toContain('actor/workspace')
    expect(new Set(inventoried).size).toBe(inventoried.length)
  })

  test('keeps allowlist entries machine-readable and evidence-bound', () => {
    const keys = ['file', 'line', 'rule', 'owner', 'reason', 'verification', 'removalCondition']
    for (const entry of adoption.allowlist)
      expect(Object.keys(entry).sort()).toEqual([...keys].sort())
  })

  test('rejects direct per-change dispatch globally and indirect mutations on adopted surfaces', () => {
    const production = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const adopted = new Set(adoption.surfaces.map((surface: { file: string }) => surface.file))
    const failures = production.flatMap((path) =>
      violations(path, adopted.has(relative(uiRoot, path))),
    )
    expect(failures).toEqual([])
  })
})
