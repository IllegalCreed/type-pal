// @ts-nocheck -- Vitest-only source census; editor production bundle intentionally has no Node types.
import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const slotNames = ['leading', 'title', 'meta', 'trailing'] as const
const reorderContractPattern
  = /reorder|sortable|draggable|onDrag(?:Start|End|Enter|Leave|Over)?|onDrop|onPointer(?:Down|Move|Up|Cancel|Enter|Leave|Over|Out|Capture)?|onMouse(?:Down|Move|Up|Enter|Leave|Over|Out)?|onTouch(?:Start|Move|End|Cancel)?|dragHandle|handleSlot|moveHandle|grip/i

function isProductionTsx(file: string): boolean {
  return file.endsWith('.tsx')
    && !/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/.test(file)
    && !/\.(?:test|spec|stories|fixture)\.tsx$/.test(file)
}

function productionTsxFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name)
      if (entry.isDirectory())
        return productionTsxFiles(path)
      return isProductionTsx(path) ? [path] : []
    })
    .sort()
}

function normalized(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function definitelyPresentLeading(
  attribute: ts.JsxAttribute,
  sourceFile: ts.SourceFile,
  file: string,
): boolean {
  const fail = () => {
    throw new Error(
      `${file}: leading must be absent or a statically non-empty JSX/string value; received ${attribute.getText(sourceFile)}`,
    )
  }
  const initializer = attribute.initializer
  if (!initializer)
    return fail()
  if (ts.isStringLiteral(initializer))
    return initializer.text.trim() ? true : fail()
  if (!ts.isJsxExpression(initializer) || !initializer.expression)
    return fail()

  function classify(expression: ts.Expression): boolean {
    if (
      ts.isParenthesizedExpression(expression)
      || ts.isAsExpression(expression)
      || ts.isTypeAssertionExpression(expression)
      || ts.isNonNullExpression(expression)
      || ts.isSatisfiesExpression(expression)
    ) {
      return classify(expression.expression)
    }
    if (
      ts.isJsxElement(expression)
      || ts.isJsxSelfClosingElement(expression)
      || ts.isJsxFragment(expression)
    ) {
      return true
    }
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
      return expression.text.trim() ? true : fail()
    if (ts.isConditionalExpression(expression)) {
      const whenTrue = classify(expression.whenTrue)
      const whenFalse = classify(expression.whenFalse)
      return whenTrue && whenFalse ? true : fail()
    }
    return fail()
  }

  return classify(initializer.expression)
}

function catalogCallsites(file: string, content: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const aliases: string[] = []
  const namespaceTags: string[] = []
  const openings: Array<ts.JsxOpeningLikeElement> = []

  function isCatalogRowAliasExpression(node: ts.Expression): boolean {
    if (ts.isIdentifier(node))
      return node.text === 'DsCatalogRow'
    if (ts.isPropertyAccessExpression(node))
      return node.name.text === 'DsCatalogRow'
    if (
      ts.isParenthesizedExpression(node)
      || ts.isAsExpression(node)
      || ts.isTypeAssertionExpression(node)
      || ts.isNonNullExpression(node)
      || ts.isSatisfiesExpression(node)
    ) {
      return isCatalogRowAliasExpression(node.expression)
    }
    if (ts.isCallExpression(node))
      return node.arguments.some((argument) => isCatalogRowAliasExpression(argument))
    if (ts.isConditionalExpression(node)) {
      return isCatalogRowAliasExpression(node.whenTrue)
        || isCatalogRowAliasExpression(node.whenFalse)
    }
    return false
  }

  function visit(node: ts.Node) {
    if (ts.isImportSpecifier(node)) {
      const imported = node.propertyName?.text ?? node.name.text
      if (imported === 'DsCatalogRow' && node.name.text !== 'DsCatalogRow')
        aliases.push(node.name.text)
    }
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text !== 'DsCatalogRow'
      && node.initializer
      && isCatalogRowAliasExpression(node.initializer)
    ) {
      aliases.push(node.name.text)
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
    ) {
      const tag = node.tagName.getText(sourceFile)
      if (tag === 'DsCatalogRow')
        openings.push(node)
      else if (tag.endsWith('.DsCatalogRow'))
        namespaceTags.push(tag)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (aliases.length) {
    throw new Error(
      `${file}: DsCatalogRow import aliases are forbidden because they evade the adoption registry: ${aliases.join(', ')}`,
    )
  }
  if (namespaceTags.length) {
    throw new Error(
      `${file}: namespace DsCatalogRow tags are forbidden because they evade the adoption registry: ${namespaceTags.join(', ')}`,
    )
  }

  return openings.map((opening) => {
    const spreads = opening.attributes.properties.filter(ts.isJsxSpreadAttribute)
    if (spreads.length)
      throw new Error(`${file}: DsCatalogRow spread attributes are forbidden by the adoption registry`)
    const jsxAttributes = opening.attributes.properties.filter(ts.isJsxAttribute)
    const attributeNames = jsxAttributes.map((attribute) => attribute.name.getText(sourceFile))
    const openingText = normalized(opening.getText(sourceFile))
    const forbiddenAttributes = attributeNames.filter((name) => reorderContractPattern.test(name))
    if (forbiddenAttributes.length || reorderContractPattern.test(openingText)) {
      throw new Error(
        `${file}: reorder ownership must stay outside DsCatalogRow: ${forbiddenAttributes.join(', ') || openingText}`,
      )
    }
    const attributes = jsxAttributes.map((attribute) => normalized(attribute.getText(sourceFile)))
    const slots = Object.fromEntries(slotNames.map((name) => {
      const attribute = jsxAttributes.find((candidate) => candidate.name.getText(sourceFile) === name)
      if (name === 'leading' && attribute)
        return [name, definitelyPresentLeading(attribute, sourceFile, file)]
      return [name, Boolean(attribute)]
    }))
    return {
      fingerprint: createHash('sha256').update(attributes.join('|')).digest('hex').slice(0, 16),
      slots,
    }
  })
}

function productionRegistry(root = uiRoot) {
  return productionTsxFiles(root).flatMap((file) => {
    const source = relative(root, file).split(sep).join('/')
    return catalogCallsites(source, readFileSync(file, 'utf8')).map((callsite) => ({
      ...callsite,
      source,
      identity: `${source}@${callsite.fingerprint}`,
    }))
  })
}

function source(file: string): string {
  return readFileSync(join(uiRoot, file), 'utf8')
}

function catalogRowDeclaration(content: string): string {
  const sourceFile = ts.createSourceFile('recipes.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let declaration = ''
  function visit(node: ts.Node) {
    if (
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node))
      && node.name?.getText(sourceFile) === 'DsCatalogRow'
    ) {
      declaration = node.getText(sourceFile)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return declaration
}

describe('catalog row content adoption gate', () => {
  test('closes over every production DsCatalogRow callsite with a bound content decision', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'catalog-row-content-adoption.json'), 'utf8'))
    const actual = productionRegistry()
    const actualByIdentity = new Map(actual.map((entry) => [entry.identity, entry]))
    const recorded = matrix.entries.map(
      (entry) => `${entry.source}@${entry.jsxFingerprint}`,
    )
    expect(matrix.version).toBe(2)
    expect([...recorded].sort()).toEqual(actual.map((entry) => entry.identity).sort())
    expect(new Set(recorded).size, 'matrix contains duplicate source + fingerprint identities').toBe(recorded.length)
    expect(actualByIdentity.size, 'production contains ambiguous duplicate source + fingerprint identities').toBe(actual.length)
    expect(new Set(matrix.entries.map((entry) => entry.id)).size, 'matrix contains duplicate stable surface ids').toBe(matrix.entries.length)

    for (const entry of matrix.entries) {
      const identity = `${entry.source}@${entry.jsxFingerprint}`
      const callsite = actualByIdentity.get(identity)
      expect(callsite, `${entry.id} must bind to its reviewed JSX callsite`).toBeDefined()
      expect(entry.id).toMatch(/^[a-z0-9/-]+$/)
      expect(entry.family).toMatch(/^[a-z0-9/-]+$/)
      expect(entry.jsxFingerprint).toMatch(/^[a-f0-9]{16}$/)
      expect(['present', 'none']).toContain(entry.leading)
      expect(callsite.slots.leading, `${entry.id} leading presence`).toBe(entry.leading === 'present')
      expect(callsite.slots.title, `${entry.id} title presence`).toBe(entry.title !== '无')
      expect(callsite.slots.meta, `${entry.id} meta presence`).toBe(entry.meta !== '无')
      expect(callsite.slots.trailing, `${entry.id} trailing presence`).toBe(entry.trailing !== '无')
      expect(['compliant', 'bounded-exception']).toContain(entry.decision)
      expect(entry.reason.length).toBeGreaterThan(12)
    }
  })

  test('keeps every catalog family on one leading-slot strategy', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'catalog-row-content-adoption.json'), 'utf8'))
    const strategies = new Map<string, Set<string>>()
    for (const entry of matrix.entries) {
      const values = strategies.get(entry.family) ?? new Set<string>()
      values.add(entry.leading)
      strategies.set(entry.family, values)
    }
    for (const [family, values] of strategies)
      expect([...values], family).toHaveLength(1)
  })

  test('locks the repaired content hierarchy without changing DsCatalogRow props', () => {
    const battlefield = source('BattleFieldTab.tsx')
    const item = source('ItemTab.tsx')
    const enemy = source('EnemyTab.tsx')
    const map = source('MapMode.tsx')
    const cutscene = source('CutsceneTab.tsx')
    const project = source('ProjectWorkbenchTab.tsx')
    const script = source('SharedScriptTab.tsx')
    const spriteAction = source('SpriteActionEditor.tsx')
    const worldSprite = source('WorldSpriteLibrary.tsx')
    const battleSprite = source('BattleSpriteLibrary.tsx')

    expect(battlefield).not.toContain('bf-catalog-id')
    expect(battlefield).toContain("meta={`#${String(candidate.id).padStart(3, '0')}`}")
    expect(item).toContain('meta={candidate.id}')
    expect(item).toContain('<DsTag tone="warning">待迁移</DsTag>')
    expect(item).not.toContain('refs ? `引用 ${refs}`')
    expect(enemy).not.toContain('<span className="face">👹</span>')
    expect(enemy).toContain('meta={e.id}')
    expect(map).toContain('meta={asset.id}')
    expect(cutscene).toContain('meta={entry.id}')
    expect(project).toContain('meta={entry.id}')
    expect(script).not.toContain('trailing={<DsTag tone="neutral">{script.body.length}</DsTag>}')
    expect(spriteAction).not.toContain('title={`#${index} · ${candidate.label}`}')
    expect(worldSprite).not.toContain('title={`#${index} · ${action.label}`}')
    expect(worldSprite).toContain('meta={asset}')
    expect(battleSprite).toContain('meta={asset}')

    const recipeDeclaration = catalogRowDeclaration(readFileSync(join(here, 'recipes.tsx'), 'utf8'))
    expect(recipeDeclaration).not.toBe('')
    expect(recipeDeclaration).not.toMatch(reorderContractPattern)
  })

  test('detects nested production calls, semantic drift, aliases, and scoped reorder ownership', () => {
    const root = mkdtempSync(join(tmpdir(), 'type-pal-catalog-row-'))
    try {
      mkdirSync(join(root, 'nested'), { recursive: true })
      writeFileSync(
        join(root, 'nested', 'Consumer.tsx'),
        'const view = <DsCatalogRow title={name} meta={id} />',
      )
      writeFileSync(
        join(root, 'nested', 'Consumer.test.tsx'),
        'const fixture = <DsCatalogRow title="ignored" />',
      )
      const nested = productionRegistry(root)
      expect(nested).toHaveLength(1)
      expect(nested[0].source).toBe('nested/Consumer.tsx')

      const before = catalogCallsites('Consumer.tsx', 'const view = <DsCatalogRow title={name} meta={id} />')[0]
      const after = catalogCallsites('Consumer.tsx', 'const view = <DsCatalogRow title={name} meta={otherId} />')[0]
      expect(after.fingerprint).not.toBe(before.fingerprint)
      expect(() => catalogCallsites(
        'Alias.tsx',
        'import { DsCatalogRow as Row } from "./design-system"; const view = <Row title="x" />',
      )).toThrow(/aliases are forbidden/)
      expect(() => catalogCallsites(
        'Namespace.tsx',
        'import * as DS from "./design-system"; const view = <DS.DsCatalogRow title="x" />',
      )).toThrow(/namespace DsCatalogRow tags are forbidden/)
      expect(() => catalogCallsites(
        'LocalAlias.tsx',
        'const Row = DsCatalogRow; const view = <Row title="x" />',
      )).toThrow(/aliases are forbidden/)
      expect(() => catalogCallsites(
        'Drag.tsx',
        'const view = <DsCatalogRow title="x" draggable onDragStart={begin} />',
      )).toThrow(/reorder ownership/)
      expect(() => catalogCallsites(
        'Spread.tsx',
        'const view = <DsCatalogRow title="x" {...props} />',
      )).toThrow(/spread attributes/)
      expect(() => catalogCallsites(
        'EmptyLeading.tsx',
        'const view = <DsCatalogRow leading={undefined} title="x" />',
      )).toThrow(/statically non-empty/)
      expect(() => catalogCallsites(
        'FalsyLeading.tsx',
        'const view = <DsCatalogRow leading={0} title="x" />',
      )).toThrow(/statically non-empty/)
      expect(() => catalogCallsites(
        'Pointer.tsx',
        'const view = <DsCatalogRow title="x" onPointerDown={begin} />',
      )).toThrow(/reorder ownership/)
      expect(() => catalogCallsites(
        'LeadingHandle.tsx',
        'const view = <DsCatalogRow leading={<button onPointerDown={begin}><DsIcon name="grip" /></button>} title="x" />',
      )).toThrow(/reorder ownership/)

      const allowed = `
        const DsCatalogRow = (props: { title: string }) => <button>{props.title}</button>
        const DsReorderRail = (props: { dragHandle: unknown }) => <aside>{props.dragHandle}</aside>
      `
      const forbidden = `
        const DsCatalogRow = (props: { title: string, dragHandle: unknown }) =>
          <button>{props.dragHandle}{props.title}</button>
      `
      expect(catalogRowDeclaration(allowed)).not.toMatch(reorderContractPattern)
      expect(catalogRowDeclaration(forbidden)).toMatch(reorderContractPattern)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
