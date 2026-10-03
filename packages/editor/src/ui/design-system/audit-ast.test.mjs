import ts from 'typescript'
import { expect, test } from 'vitest'
import { staticPrimitiveValue, staticUnknown } from '../../../scripts/design-system-audit-ast.mjs'

function expression(text) {
  const source = ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true)
  const statement = source.statements[0]
  if (!statement || !ts.isExpressionStatement(statement)) throw new Error('Expression required')
  return statement.expression
}

test('recursive object spread bindings stay unknown without losing explicit local fields', () => {
  const bindings = new Map([['props.context', expression('({ ...props.context, active: false })')]])
  expect(staticPrimitiveValue(expression('props.context.missing'), bindings)).toBe(staticUnknown)
  expect(staticPrimitiveValue(expression('props.context.active'), bindings)).toBe(false)
  expect(staticPrimitiveValue(expression('props.context.missing'), bindings)).toBe(staticUnknown)
})

test('mutually recursive spread aliases terminate while independent fields remain reachable', () => {
  const bindings = new Map([
    ['first', expression('({ ...second, active: true })')],
    ['second', expression('({ ...first, visible: false })')],
  ])
  expect(staticPrimitiveValue(expression('first.missing'), bindings)).toBe(staticUnknown)
  expect(staticPrimitiveValue(expression('first.visible'), bindings)).toBe(false)
  expect(staticPrimitiveValue(expression('second.active'), bindings)).toBe(true)
})
