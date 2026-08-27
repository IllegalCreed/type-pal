// @ts-nocheck -- Vitest-only source census; editor production bundle intentionally has no Node types.
import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { deriveFieldAdoptionTruth } from '../../../scripts/design-system-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const watchedComponents = new Set([
  'DsFieldGroup',
  'DsInspectorHost',
  'DsInspectorPortal',
  'DsInspectorTabs',
  'DsPropertyGrid',
  'DsPropertyRow',
])

function isLayoutFieldComponent(name: string): boolean {
  return /^Ds[A-Za-z0-9]*Field$/.test(name)
}

const inspectorDesignSystemComponents = new Set([
  'DsInspectorHost',
  'DsInspectorPortal',
  'DsInspectorTabs',
  'DsPropertyGrid',
  'DsPropertyRow',
])

function officialDesignSystemBindings(
  sourceFile: ts.SourceFile,
  source: string,
): Map<string, string> {
  const bindings = new Map<string, string>()
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.')
    )
      continue
    const target = join(dirname(source), statement.moduleSpecifier.text)
      .split(sep)
      .join('/')
      .replace(/\.(?:[cm]?[jt]sx?)$/, '')
    const namedBindings = statement.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue
    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      const isOfficial =
        target === 'design-system/index' ||
        (target === 'design-system/controls' &&
          (imported === 'DsFieldGroup' || isLayoutFieldComponent(imported))) ||
        (target === 'design-system/recipes' && inspectorDesignSystemComponents.has(imported))
      if (isOfficial) bindings.set(element.name.text, imported)
    }
  }
  return bindings
}

function scopedLocalBindings(sourceFile: ts.SourceFile) {
  const bindings = new Map<string, Array<{ scope: ts.Node; declaration: ts.Node }>>()
  const nearestScope = (node: ts.Node): ts.Node => {
    let current: ts.Node | undefined = node.parent
    while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) current = current.parent
    return current ?? sourceFile
  }
  const nearestFunctionScope = (node: ts.Node): ts.Node => {
    let current: ts.Node | undefined = node.parent
    while (current && !ts.isSourceFile(current) && !ts.isFunctionLike(current))
      current = current.parent
    return current ?? sourceFile
  }
  const add = (name: ts.BindingName, scope: ts.Node, declaration: ts.Node): void => {
    if (ts.isIdentifier(name)) {
      const entries = bindings.get(name.text) ?? []
      entries.push({ scope, declaration })
      bindings.set(name.text, entries)
      return
    }
    for (const element of name.elements)
      if (ts.isBindingElement(element)) add(element.name, scope, declaration)
  }
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) return
    if (ts.isVariableDeclaration(node)) {
      const declarationList = ts.isVariableDeclarationList(node.parent) ? node.parent : undefined
      add(
        node.name,
        declarationList && (declarationList.flags & ts.NodeFlags.BlockScoped) === 0
          ? nearestFunctionScope(node)
          : nearestScope(node),
        node,
      )
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      add(node.name, nearestScope(node), node)
    } else if (ts.isClassDeclaration(node) && node.name) {
      add(node.name, nearestScope(node), node)
    } else if (ts.isParameter(node)) {
      add(node.name, ts.isFunctionLike(node.parent) ? node.parent : nearestScope(node), node)
    } else if (ts.isCatchClause(node) && node.variableDeclaration) {
      add(node.variableDeclaration.name, node.block, node.variableDeclaration)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return bindings
}

function sameScope(left: ts.Node, right: ts.Node): boolean {
  return left === right ||
    (left.kind === right.kind && left.pos === right.pos && left.end === right.end)
}

function visibleLocalBinding(
  bindings: ReturnType<typeof scopedLocalBindings>,
  name: string,
  usage: ts.Node,
): { scope: ts.Node; declaration: ts.Node } | undefined {
  const candidates = bindings.get(name) ?? []
  let scope: ts.Node | undefined = usage
  while (scope) {
    if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isFunctionLike(scope))
      {
        const visible = candidates
          .filter((candidate) => sameScope(candidate.scope, scope))
          .sort((left, right) => right.declaration.pos - left.declaration.pos)
        if (visible[0]) return visible[0]
      }
    scope = scope.parent
  }
  return undefined
}

function hasVisibleLocalBinding(
  bindings: ReturnType<typeof scopedLocalBindings>,
  name: string,
  usage: ts.Node,
): boolean {
  return Boolean(visibleLocalBinding(bindings, name, usage))
}

function assertOfficialDesignSystemTag(
  opening: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile,
  source: string,
  officialBindings: Map<string, string>,
  localBindings: ReturnType<typeof scopedLocalBindings>,
): void {
  const tag = opening.tagName.getText(sourceFile)
  if (!watchedComponents.has(tag) && !isLayoutFieldComponent(tag)) return
  if (officialBindings.get(tag) === tag && !hasVisibleLocalBinding(localBindings, tag, opening))
    return
  const line = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile)).line + 1
  throw new Error(
    `${source}:${line}: ${tag} must resolve to its canonical design-system export`,
  )
}

function recursiveFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name)
      return entry.isDirectory() ? recursiveFiles(path) : [path]
    })
    .sort()
}

function isProductionTsx(file: string): boolean {
  const source = relative(uiRoot, file).split(sep).join('/')
  return (
    file.endsWith('.tsx') &&
    !source.startsWith('design-system/') &&
    !/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/.test(source) &&
    !/\.(?:test|spec|stories|fixture)\.tsx$/.test(source)
  )
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function staticAttribute(
  opening: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile,
  source: string,
): string | undefined {
  const attribute = opening.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name,
  )
  if (!attribute) return undefined
  const initializer = attribute.initializer
  if (ts.isStringLiteral(initializer)) return initializer.text
  if (
    ts.isJsxExpression(initializer) &&
    initializer.expression &&
    (ts.isStringLiteral(initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(initializer.expression))
  )
    return initializer.expression.text
  throw new Error(
    `${source}: ${opening.tagName.getText(sourceFile)} ${name} must be a static string literal; received ${attribute.getText(sourceFile)}`,
  )
}

function jsxAttribute(
  opening: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined {
  return opening.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function namedComponent(node: ts.Node, sourceFile: ts.SourceFile, source: string): string {
  let current: ts.Node | undefined = node
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    )
      return current.parent.name.text
    if (ts.isFunctionExpression(current) && current.name) return current.name.text
    current = current.parent
  }
  throw new Error(
    `${source}: governed field layout callsite must belong to a named component near ${node.getText(sourceFile).slice(0, 80)}`,
  )
}

function hasJsxAncestor(node: ts.Node, tag: string, sourceFile: ts.SourceFile): boolean {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (ts.isJsxElement(current) && current.openingElement.tagName.getText(sourceFile) === tag)
      return true
    current = current.parent
  }
  return false
}

function staticClassFragments(node: ts.Node): string[] {
  const values: string[] = []
  function visit(current: ts.Node): void {
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      values.push(current.text)
      return
    }
    if (ts.isTemplateExpression(current)) {
      values.push(current.head.text)
      for (const span of current.templateSpans) {
        visit(span.expression)
        values.push(span.literal.text)
      }
      return
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
  return values
}

function hasExactClassToken(node: ts.Node, token: string): boolean {
  return staticClassFragments(node).some((fragment) =>
    fragment.split(/\s+/).filter(Boolean).includes(token),
  )
}

function inspectorShellCallsite(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile,
): boolean {
  let current: ts.Node | undefined = node
  while (current) {
    const opening = ts.isJsxElement(current)
      ? current.openingElement
      : ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)
        ? current
        : undefined
    if (opening?.tagName.getText(sourceFile) === 'DsInspectorHost') return true
    if (
      ts.isJsxAttribute(current) &&
      current.name.getText(sourceFile) === 'inspector' &&
      (ts.isJsxOpeningElement(current.parent.parent) ||
        ts.isJsxSelfClosingElement(current.parent.parent)) &&
      ['DsWorkbench', 'DsObjectWorkspace'].includes(
        current.parent.parent.tagName.getText(sourceFile),
      )
    )
      return true
    current = current.parent
  }
  return false
}

function unsafePropertyGridPortals(sourceFile: ts.SourceFile, source: string): string[] {
  const portalNames = new Set<string>()
  const declarations = new Map<string, ts.Expression>()
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'react-dom'
    )
      for (const element of statement.importClause?.namedBindings?.elements ?? [])
        if ((element.propertyName?.text ?? element.name.text) === 'createPortal')
          portalNames.add(element.name.text)
  }
  function collectDeclarations(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      declarations.set(node.name.text, node.initializer)
    ts.forEachChild(node, collectDeclarations)
  }
  collectDeclarations(sourceFile)

  function containsPropertyGrid(node: ts.Node, seen = new Set<string>()): boolean {
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return false
      const declaration = declarations.get(node.text)
      if (declaration) return containsPropertyGrid(declaration, new Set(seen).add(node.text))
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sourceFile) === 'DsPropertyGrid'
    )
      return true
    let found = false
    ts.forEachChild(node, (child) => {
      if (!found) found = containsPropertyGrid(child, seen)
    })
    return found
  }

  const violations: string[] = []
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      portalNames.has(node.expression.text) &&
      node.arguments[0] &&
      containsPropertyGrid(node.arguments[0])
    ) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
      violations.push(`${source}:${line}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return violations
}

const governedInlineStyleKeys = new Set([
  'grid',
  'gridTemplate',
  'gridTemplateColumns',
  '--ds-field-label-track',
  '--ds-inspector-property-label-track',
])

function governedInlineStyleViolations(sourceFile: ts.SourceFile, source: string): string[] {
  const declarations = new Map<string, ts.Expression>()
  function collectDeclarations(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      declarations.set(node.name.text, node.initializer)
    ts.forEachChild(node, collectDeclarations)
  }
  collectDeclarations(sourceFile)

  const violations: string[] = []
  function inspect(expression: ts.Expression, seen = new Set<string>()): void {
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression)) {
      inspect(expression.expression, seen)
      return
    }
    if (ts.isConditionalExpression(expression)) {
      inspect(expression.whenTrue, seen)
      inspect(expression.whenFalse, seen)
      return
    }
    if (ts.isIdentifier(expression)) {
      if (seen.has(expression.text)) return
      const declaration = declarations.get(expression.text)
      if (declaration) inspect(declaration, new Set(seen).add(expression.text))
      return
    }
    if (!ts.isObjectLiteralExpression(expression)) return
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        inspect(property.expression, seen)
        continue
      }
      const name = property.name
      const key =
        name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
          ? name.text
          : undefined
      if (key && governedInlineStyleKeys.has(key)) {
        const line =
          sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1
        violations.push(`${source}:${line}:${key}`)
      }
      if (ts.isPropertyAssignment(property)) inspect(property.initializer, seen)
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === 'style' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    )
      inspect(node.initializer.expression)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return violations
}

function forbiddenDesignSystemOwnerAliases(sourceFile: ts.SourceFile): string[] {
  const origins = new Map<string, string>()
  const edges: Array<{ local: string; target: string }> = []
  const aliasTarget = (node: ts.Expression): string | undefined => {
    let expression = node
    while (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isNonNullExpression(expression)
    )
      expression = expression.expression
    if (ts.isIdentifier(expression)) return expression.text
    if (ts.isCallExpression(expression) && expression.arguments.length === 1) {
      const callee = expression.expression
      const isMemo =
        (ts.isIdentifier(callee) && ['memo', 'forwardRef'].includes(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && ['memo', 'forwardRef'].includes(callee.name.text))
      if (isMemo) return aliasTarget(expression.arguments[0]!)
    }
    return undefined
  }
  function visit(node: ts.Node): void {
    if (ts.isImportSpecifier(node)) {
      const imported = node.propertyName?.text ?? node.name.text
      if (watchedComponents.has(imported) || isLayoutFieldComponent(imported))
        origins.set(node.name.text, imported)
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const target = aliasTarget(node.initializer)
      if (target) edges.push({ local: node.name.text, target })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  let changed = true
  while (changed) {
    changed = false
    for (const edge of edges) {
      const origin = origins.get(edge.target)
      if (!origin || origins.has(edge.local)) continue
      origins.set(edge.local, origin)
      changed = true
    }
  }
  return [...origins]
    .filter(([local, origin]) => local !== origin && /^[A-Z]/.test(local))
    .map(([local, origin]) => `${origin} as ${local}`)
    .sort()
}

function productionCensus(root = uiRoot) {
  const groups: Array<{
    source: string
    component: string
    responsive: number
    stacked: number
  }> = []
  const inlineFields: Array<{
    source: string
    component: string
    fieldComponent: string
    label: string
    className: string
  }> = []
  const detachedPropertyGrids: Array<{
    source: string
    component: string
    propertyGrids: number
  }> = []
  const rawFieldClasses: string[] = []
  const businessInspectorHosts: Array<{ source: string; component: string }> = []
  const businessInspectorTabs: Array<{ source: string; component: string }> = []
  const invalidInspectorShells: string[] = []
  const unsafeInspectorPortals: string[] = []
  const inlineLayoutStyles: string[] = []
  const fieldGroupBusinessClasses = new Set<string>()
  const indirectPropertyRowOwners = new Set<string>()
  const componentUsages: Array<{
    component: string
    definitionSource: string
    callsiteSource: string
    insidePropertyGrid: boolean
  }> = []

  for (const file of recursiveFiles(root).filter(isProductionTsx)) {
    const source = relative(root, file).split(sep).join('/')
    const sourceFile = ts.createSourceFile(
      source,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const groupCounts = new Map<string, { responsive: number; stacked: number }>()
    const detachedCounts = new Map<string, number>()
    const importedComponentSources = new Map<string, string>()
    const officialBindings = officialDesignSystemBindings(sourceFile, source)
    const localBindings = scopedLocalBindings(sourceFile)
    const aliases = forbiddenDesignSystemOwnerAliases(sourceFile)
    const namespaceTags: string[] = []
    inlineLayoutStyles.push(...governedInlineStyleViolations(sourceFile, source))
    unsafeInspectorPortals.push(...unsafePropertyGridPortals(sourceFile, source))
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue
      const specifier = statement.moduleSpecifier.text
      if (!specifier.startsWith('.') || !specifier.endsWith('.js')) continue
      const target = `${join(dirname(source), specifier.slice(0, -3)).split(sep).join('/')}.tsx`
      for (const element of statement.importClause?.namedBindings?.elements ?? [])
        importedComponentSources.set(element.name.text, target)
    }

    function visit(node: ts.Node): void {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        assertOfficialDesignSystemTag(
          node,
          sourceFile,
          source,
          officialBindings,
          localBindings,
        )
        const tag = node.tagName.getText(sourceFile)
        if (/^[A-Z][A-Za-z0-9]*$/.test(tag))
          componentUsages.push({
            component: tag,
            definitionSource: importedComponentSources.get(tag) ?? source,
            callsiteSource: source,
            insidePropertyGrid: hasJsxAncestor(node, 'DsPropertyGrid', sourceFile),
          })
        if (
          [...watchedComponents].some((name) => tag.endsWith(`.${name}`)) ||
          /\.Ds[A-Za-z0-9]*Field$/.test(tag)
        )
          namespaceTags.push(tag)

        const className = node.attributes.properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'className',
        )
        if (className && hasExactClassToken(className, 'field'))
          rawFieldClasses.push(
            `${source}:${sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1}`,
          )

        if (jsxAttribute(node, 'data-ds-inspector-host'))
          throw new Error(
            `${source}: raw data-ds-inspector-host is forbidden; use a public Inspector host`,
          )

        if (tag === 'DsInspectorHost')
          businessInspectorHosts.push({
            source: basename(source),
            component: namedComponent(node, sourceFile, source),
          })
        if (tag === 'DsInspectorTabs')
          businessInspectorTabs.push({
            source: basename(source),
            component: namedComponent(node, sourceFile, source),
          })
        if (
          (tag === 'DsInspectorHost' || tag === 'DsInspectorTabs') &&
          !inspectorShellCallsite(node, sourceFile)
        )
          invalidInspectorShells.push(
            `${source}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}:${tag}`,
          )

        if (tag === 'DsFieldGroup') {
          if (node.attributes.properties.some(ts.isJsxSpreadAttribute))
            throw new Error(`${source}: DsFieldGroup spread props evade the field-layout gate`)
          const layout = staticAttribute(node, 'layout', sourceFile, source) ?? 'responsive'
          if (layout !== 'responsive' && layout !== 'stacked')
            throw new Error(`${source}: unsupported DsFieldGroup layout ${layout}`)
          const component = namedComponent(node, sourceFile, source)
          const className = staticAttribute(node, 'className', sourceFile, source)
          for (const token of className?.split(/\s+/).filter(Boolean) ?? [])
            fieldGroupBusinessClasses.add(token)
          const count = groupCounts.get(component) ?? { responsive: 0, stacked: 0 }
          count[layout] += 1
          groupCounts.set(component, count)
        }

        if (isLayoutFieldComponent(tag)) {
          if (node.attributes.properties.some(ts.isJsxSpreadAttribute))
            throw new Error(`${source}: ${tag} spread props evade the field-layout gate`)
          const layout = staticAttribute(node, 'layout', sourceFile, source)
          if (layout === 'inline') {
            inlineFields.push({
              source: basename(source),
              component: namedComponent(node, sourceFile, source),
              fieldComponent: tag,
              label: staticAttribute(node, 'label', sourceFile, source) ?? '',
              className:
                staticAttribute(node, 'className', sourceFile, source) ??
                staticAttribute(node, 'fieldClassName', sourceFile, source) ??
                '',
            })
          }
        }

        if (
          tag === 'DsPropertyGrid' &&
          !hasJsxAncestor(node, 'DsInspectorTabs', sourceFile) &&
          !hasJsxAncestor(node, 'DsInspectorHost', sourceFile)
        ) {
          if (node.attributes.properties.some(ts.isJsxSpreadAttribute))
            throw new Error(`${source}: DsPropertyGrid spread props evade the field-layout gate`)
          const component = namedComponent(node, sourceFile, source)
          detachedCounts.set(component, (detachedCounts.get(component) ?? 0) + 1)
        }
        if (tag === 'DsPropertyRow' && !hasJsxAncestor(node, 'DsPropertyGrid', sourceFile))
          indirectPropertyRowOwners.add(`${source}@${namedComponent(node, sourceFile, source)}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    if (aliases.length)
      throw new Error(
        `${source}: design-system field owner aliases are forbidden: ${aliases.join(', ')}`,
      )
    if (namespaceTags.length)
      throw new Error(
        `${source}: namespace field owner tags are forbidden: ${namespaceTags.join(', ')}`,
      )

    for (const [component, counts] of groupCounts)
      groups.push({ source: basename(source), component, ...counts })
    for (const [component, propertyGrids] of detachedCounts)
      detachedPropertyGrids.push({ source: basename(source), component, propertyGrids })
  }

  for (const identity of indirectPropertyRowOwners) {
    const separator = identity.lastIndexOf('@')
    const source = identity.slice(0, separator)
    const component = identity.slice(separator + 1)
    const usages = componentUsages.filter(
      (usage) => usage.definitionSource === source && usage.component === component,
    )
    if (!usages.length || usages.some((usage) => !usage.insidePropertyGrid))
      throw new Error(
        `${component}: property-row helper must only be consumed inside DsPropertyGrid; usages=${JSON.stringify(usages)}`,
      )
  }

  return {
    groups,
    inlineFields,
    detachedPropertyGrids,
    rawFieldClasses,
    businessInspectorHosts,
    businessInspectorTabs,
    invalidInspectorShells,
    unsafeInspectorPortals,
    fieldGroupBusinessClasses: [...fieldGroupBusinessClasses].sort(),
    inlineLayoutStyles,
  }
}

interface InspectorEdge {
  callee?: string
  tag: string
  inspector: boolean
  line: number
  attributes: Record<string, string>
}

interface InspectorGrid {
  inspector: boolean
  line: number
  portal?: number
}

interface InspectorPortal {
  host: string
}

interface InspectorComponent {
  id: string
  source: string
  name: string
  grids: InspectorGrid[]
  edges: InspectorEdge[]
  inspectorRefs: Set<string>
  portals: InspectorPortal[]
  hosts: number
  tabs: number
  hostBindings: Map<string, string>
  refCallbacks: Map<string, string>
}

interface InspectorGraph {
  components: Map<string, InspectorComponent>
  paths: Map<string, string>
}

function componentIdentity(source: string, component: string): string {
  return `${source}@${component}`
}

function componentFunctionName(node: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text))
    return node.name.text
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name) &&
    /^[A-Z]/.test(node.parent.name.text)
  )
    return node.parent.name.text
  return undefined
}

function resolveRelativeModule(
  source: string,
  specifier: string,
  knownSources: Set<string>,
): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  const unresolved = join(dirname(source), specifier).split(sep).join('/')
  const base = unresolved.replace(/\.(?:[cm]?[jt]sx?)$/, '')
  return [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find((candidate) =>
    knownSources.has(candidate),
  )
}

function jsxExpressionText(attribute: ts.JsxAttribute, sourceFile: ts.SourceFile): string {
  if (!attribute.initializer) return 'true'
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression)
    return normalized(attribute.initializer.expression.getText(sourceFile))
  return normalized(attribute.initializer.getText(sourceFile))
}

function inspectorGraph(overrides: Record<string, string> = {}, root = uiRoot): InspectorGraph {
  const files = recursiveFiles(root).filter(isProductionTsx)
  const sources = new Map(
    files.map((file) => {
      const source = relative(root, file).split(sep).join('/')
      return [source, overrides[source] ?? readFileSync(file, 'utf8')] as const
    }),
  )
  const knownSources = new Set(sources.keys())
  const sourceFiles = new Map(
    [...sources].map(([source, content]) => [
      source,
      ts.createSourceFile(source, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    ]),
  )
  const componentNodes = new Map<string, Map<string, ts.FunctionLikeDeclaration>>()
  const defaultExports = new Map<string, string>()

  for (const [source, sourceFile] of sourceFiles) {
    const nodes = new Map<string, ts.FunctionLikeDeclaration>()
    function collectTopLevel(node: ts.Node): void {
      const name = componentFunctionName(node)
      if (name) nodes.set(name, node as ts.FunctionLikeDeclaration)
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
      )
        defaultExports.set(source, node.name.text)
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression))
        defaultExports.set(source, node.expression.text)
    }
    for (const statement of sourceFile.statements) {
      collectTopLevel(statement)
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (declaration.initializer) collectTopLevel(declaration.initializer)
    }
    componentNodes.set(source, nodes)
  }

  const components = new Map<string, InspectorComponent>()

  for (const [source, sourceFile] of sourceFiles) {
    const localComponents = componentNodes.get(source) ?? new Map()
    const functionNodes = new Set(localComponents.values())
    const imports = new Map<string, string>()
    const officialBindings = officialDesignSystemBindings(sourceFile, source)
    const localBindings = scopedLocalBindings(sourceFile)
    const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
      kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment
    const isBindingWrite = (identifier: ts.Identifier): boolean => {
      const parent = identifier.parent
      return (
        (ts.isBinaryExpression(parent) &&
          parent.left === identifier &&
          isAssignmentOperator(parent.operatorToken.kind)) ||
        ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
          parent.operand === identifier &&
          (parent.operator === ts.SyntaxKind.PlusPlusToken ||
            parent.operator === ts.SyntaxKind.MinusMinusToken)) ||
        ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) &&
          parent.initializer === identifier)
      )
    }
    const writtenBindings = new Set<ts.VariableDeclaration>()
    function collectBindingWrites(node: ts.Node): void {
      if (ts.isIdentifier(node) && isBindingWrite(node)) {
        const declaration = visibleLocalBinding(localBindings, node.text, node)?.declaration
        if (declaration && ts.isVariableDeclaration(declaration)) writtenBindings.add(declaration)
      }
      ts.forEachChild(node, collectBindingWrites)
    }
    collectBindingWrites(sourceFile)
    const staticBooleanAt = (
      node: ts.Node | undefined,
      resolving = new Set<ts.VariableDeclaration>(),
    ): boolean | undefined => {
      if (!node) return undefined
      if (
        ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isTypeAssertionExpression(node) ||
        ts.isNonNullExpression(node)
      )
        return staticBooleanAt(node.expression, resolving)
      if (node.kind === ts.SyntaxKind.TrueKeyword) return true
      if (node.kind === ts.SyntaxKind.FalseKeyword) return false
      if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
        const operand = staticBooleanAt(node.operand, resolving)
        return operand === undefined ? undefined : !operand
      }
      if (!ts.isIdentifier(node)) return undefined
      const binding = visibleLocalBinding(localBindings, node.text, node)
      const declaration = binding?.declaration
      if (
        !declaration ||
        !ts.isVariableDeclaration(declaration) ||
        !declaration.initializer ||
        declaration.pos >= node.pos ||
        !ts.isVariableDeclarationList(declaration.parent) ||
        (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
        writtenBindings.has(declaration) ||
        resolving.has(declaration)
      )
        return undefined
      const nextResolving = new Set(resolving).add(declaration)
      return staticBooleanAt(declaration.initializer, nextResolving)
    }
    const ordinaryPortalNames = new Set<string>()
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue
      if (statement.moduleSpecifier.text === 'react-dom')
        for (const element of statement.importClause?.namedBindings?.elements ?? [])
          if ((element.propertyName?.text ?? element.name.text) === 'createPortal')
            ordinaryPortalNames.add(element.name.text)
      const targetSource = resolveRelativeModule(
        source,
        statement.moduleSpecifier.text,
        knownSources,
      )
      if (!targetSource || !statement.importClause) continue
      if (statement.importClause.name) {
        const exported = defaultExports.get(targetSource) ?? statement.importClause.name.text
        imports.set(statement.importClause.name.text, componentIdentity(targetSource, exported))
      }
      const bindings = statement.importClause.namedBindings
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements) {
          const exported = element.propertyName?.text ?? element.name.text
          imports.set(element.name.text, componentIdentity(targetSource, exported))
        }
    }
    const componentAliasTargets = new Map<ts.Node, string>()
    const componentAliasTarget = (node: ts.Expression): string | undefined => {
      let expression = node
      while (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isNonNullExpression(expression)
      )
        expression = expression.expression
      if (ts.isIdentifier(expression)) return expression.text
      if (ts.isCallExpression(expression) && expression.arguments.length === 1) {
        const callee = expression.expression
        const wrapper = ts.isIdentifier(callee)
          ? callee.text
          : ts.isPropertyAccessExpression(callee)
            ? callee.name.text
            : undefined
        if (wrapper === 'memo' || wrapper === 'forwardRef')
          return componentAliasTarget(expression.arguments[0]!)
      }
      return undefined
    }
    function collectComponentAliases(node: ts.Node): void {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isVariableDeclarationList(node.parent) &&
        (node.parent.flags & ts.NodeFlags.Const) !== 0
      ) {
        const target = componentAliasTarget(node.initializer)
        if (target) componentAliasTargets.set(node, target)
      }
      ts.forEachChild(node, collectComponentAliases)
    }
    collectComponentAliases(sourceFile)

    const localComponentDeclarations = new Map<string, ts.Node>(
      [...localComponents].map(([name, node]) => [
        name,
        (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
        ts.isVariableDeclaration(node.parent)
          ? node.parent
          : node,
      ]),
    )
    const resolveComponentReference = (
      name: string,
      usage: ts.Node,
      seen = new Set<string>(),
    ): string | undefined => {
      if (seen.has(name)) return undefined
      const nextSeen = new Set(seen).add(name)
      const localBinding = visibleLocalBinding(localBindings, name, usage)
      if (localBinding) {
        if (
          (ts.isVariableDeclaration(localBinding.declaration) ||
            ts.isClassDeclaration(localBinding.declaration)) &&
          localBinding.declaration.pos > usage.pos
        )
          return undefined
        const aliasTarget = componentAliasTargets.get(localBinding.declaration)
        if (aliasTarget)
          return resolveComponentReference(aliasTarget, localBinding.declaration, nextSeen)
        if (localComponentDeclarations.get(name) === localBinding.declaration)
          return componentIdentity(source, name)
        return undefined
      }
      return imports.get(name)
    }

    for (const [name, componentNode] of localComponents) {
      const id = componentIdentity(source, name)
      const component: InspectorComponent = {
        id,
        source,
        name,
        grids: [],
        edges: [],
        inspectorRefs: new Set(),
        portals: [],
        hosts: 0,
        tabs: 0,
        hostBindings: new Map(),
        refCallbacks: new Map(),
      }
      const portalFragments = new Map<string, number>()
      const portalNodes = new Map<ts.JsxElement, number>()
      const fragmentReferences = new Map<string, { portal: number; other: number }>()

      function collectPortalFragments(
        node: ts.Node,
        inPortalChild = false,
        portalIndex?: number,
      ): void {
        if (node !== componentNode && functionNodes.has(node as ts.FunctionLikeDeclaration)) return
        if (ts.isIfStatement(node)) {
          const condition = staticBooleanAt(node.expression)
          if (condition !== false)
            collectPortalFragments(node.thenStatement, inPortalChild, portalIndex)
          if (condition !== true && node.elseStatement)
            collectPortalFragments(node.elseStatement, inPortalChild, portalIndex)
          return
        }
        if (ts.isConditionalExpression(node)) {
          const condition = staticBooleanAt(node.condition)
          if (condition !== false) collectPortalFragments(node.whenTrue, inPortalChild, portalIndex)
          if (condition !== true) collectPortalFragments(node.whenFalse, inPortalChild, portalIndex)
          return
        }
        if (ts.isBinaryExpression(node)) {
          const condition = staticBooleanAt(node.left)
          if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
            if (condition !== false) collectPortalFragments(node.right, inPortalChild, portalIndex)
            return
          }
          if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
            if (condition !== true) collectPortalFragments(node.right, inPortalChild, portalIndex)
            return
          }
        }
        if (ts.isJsxElement(node)) {
          const tag = node.openingElement.tagName.getText(sourceFile)
          if (tag === 'DsInspectorPortal') {
            const host = jsxAttribute(node.openingElement, 'host')
            const index =
              component.portals.push({
                host: host ? jsxExpressionText(host, sourceFile) : '',
              }) - 1
            portalNodes.set(node, index)
            for (const child of node.children) collectPortalFragments(child, true, index)
            for (const attribute of node.openingElement.attributes.properties)
              collectPortalFragments(attribute, false, undefined)
            return
          }
        }
        if (ts.isIdentifier(node)) {
          const parent = node.parent
          const isDeclaration = ts.isVariableDeclaration(parent) && parent.name === node
          if (!isDeclaration) {
            const counts = fragmentReferences.get(node.text) ?? { portal: 0, other: 0 }
            counts[inPortalChild ? 'portal' : 'other'] += 1
            fragmentReferences.set(node.text, counts)
          }
          if (inPortalChild && portalIndex !== undefined) {
            const current = portalFragments.get(node.text)
            portalFragments.set(
              node.text,
              current === undefined || current === portalIndex ? portalIndex : -1,
            )
          }
        }
        ts.forEachChild(node, (child) => collectPortalFragments(child, inPortalChild, portalIndex))
      }
      collectPortalFragments(componentNode)
      for (const [fragment, portalIndex] of [...portalFragments]) {
        const references = fragmentReferences.get(fragment)
        if (!references || references.other > 0 || portalIndex < 0) portalFragments.delete(fragment)
      }

      function recordOpening(
        opening: ts.JsxOpeningLikeElement,
        inspector: boolean,
        portal?: number,
      ): void {
        assertOfficialDesignSystemTag(
          opening,
          sourceFile,
          source,
          officialBindings,
          localBindings,
        )
        const tag = opening.tagName.getText(sourceFile)
        const line = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile)).line + 1
        if (tag === 'DsInspectorHost') component.hosts += 1
        if (tag === 'DsPropertyGrid') component.grids.push({ inspector, line, portal })
        if (tag === 'DsInspectorTabs') component.tabs += 1
        if (!/^[A-Z][A-Za-z0-9]*$/.test(tag) || tag.startsWith('Ds')) return
        const attributes = Object.fromEntries(
          opening.attributes.properties
            .filter(ts.isJsxAttribute)
            .map((attribute) => [
              attribute.name.getText(sourceFile),
              jsxExpressionText(attribute, sourceFile),
            ]),
        )
        component.edges.push({
          tag,
          inspector,
          line,
          attributes,
          callee: resolveComponentReference(tag, opening),
        })
      }

      function visitAttributes(
        opening: ts.JsxOpeningLikeElement,
        inspector: boolean,
        portal: number | undefined,
        tabsPanel: boolean,
        tabsItems: boolean,
        inspectorAttribute?: string,
        tabsItemsAttribute?: string,
      ): void {
        for (const attribute of opening.attributes.properties) {
          const attributeName = ts.isJsxAttribute(attribute)
            ? attribute.name.getText(sourceFile)
            : undefined
          visit(
            attribute,
            inspector || attributeName === inspectorAttribute,
            portal,
            tabsPanel,
            tabsItems || attributeName === tabsItemsAttribute,
          )
          if (
            tabsPanel &&
            /^[a-z][a-z0-9-]*$/.test(opening.tagName.getText(sourceFile)) &&
            ts.isJsxAttribute(attribute) &&
            attributeName === 'ref' &&
            attribute.initializer
          )
            component.inspectorRefs.add(jsxExpressionText(attribute, sourceFile))
        }
      }

      function visit(
        node: ts.Node,
        inspector = false,
        portal?: number,
        tabsPanel = false,
        tabsItems = false,
      ): void {
        if (node !== componentNode && functionNodes.has(node as ts.FunctionLikeDeclaration)) return
        if (ts.isIfStatement(node)) {
          const condition = staticBooleanAt(node.expression)
          if (condition !== false)
            visit(node.thenStatement, inspector, portal, tabsPanel, tabsItems)
          if (condition !== true && node.elseStatement)
            visit(node.elseStatement, inspector, portal, tabsPanel, tabsItems)
          return
        }
        if (ts.isConditionalExpression(node)) {
          const condition = staticBooleanAt(node.condition)
          if (condition !== false) visit(node.whenTrue, inspector, portal, tabsPanel, tabsItems)
          if (condition !== true) visit(node.whenFalse, inspector, portal, tabsPanel, tabsItems)
          return
        }
        if (ts.isBinaryExpression(node)) {
          const condition = staticBooleanAt(node.left)
          if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
            if (condition !== false) visit(node.right, inspector, portal, tabsPanel, tabsItems)
            return
          }
          if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
            if (condition !== true) visit(node.right, inspector, portal, tabsPanel, tabsItems)
            return
          }
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ordinaryPortalNames.has(node.expression.text)
        ) {
          if (node.arguments[0]) visit(node.arguments[0], false, undefined, false, false)
          for (const argument of node.arguments.slice(1))
            visit(argument, false, undefined, false, false)
          return
        }
        if (tabsItems && ts.isPropertyAssignment(node)) {
          const propertyName =
            ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : undefined
          visit(node.initializer, inspector, portal, propertyName === 'panel', false)
          return
        }
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          node.initializer.expression.getText(sourceFile) === 'useCallback'
        ) {
          const callback = node.initializer.arguments[0]
          if (
            callback &&
            (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
            callback.parameters.length === 1 &&
            ts.isIdentifier(callback.parameters[0]?.name)
          ) {
            const parameter = callback.parameters[0].name.text
            const bodyExpression = ts.isBlock(callback.body)
              ? callback.body.statements.length === 1
                ? ts.isExpressionStatement(callback.body.statements[0])
                  ? callback.body.statements[0].expression
                  : ts.isReturnStatement(callback.body.statements[0])
                    ? callback.body.statements[0].expression
                    : undefined
                : undefined
              : callback.body
            if (
              bodyExpression &&
              ts.isCallExpression(bodyExpression) &&
              ts.isIdentifier(bodyExpression.expression) &&
              bodyExpression.arguments.length === 1 &&
              ts.isIdentifier(bodyExpression.arguments[0]) &&
              bodyExpression.arguments[0].text === parameter
            ) {
              component.refCallbacks.set(node.name.text, bodyExpression.expression.text)
            }
          }
        }
        if (
          ts.isVariableDeclaration(node) &&
          ts.isArrayBindingPattern(node.name) &&
          node.name.elements.length >= 2 &&
          ts.isBindingElement(node.name.elements[0]) &&
          ts.isBindingElement(node.name.elements[1]) &&
          ts.isIdentifier(node.name.elements[0].name) &&
          ts.isIdentifier(node.name.elements[1].name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          node.initializer.expression.getText(sourceFile) === 'useState'
        ) {
          const first = node.name.elements[0]
          const second = node.name.elements[1]
          component.hostBindings.set(
            (first.name as ts.Identifier).text,
            (second.name as ts.Identifier).text,
          )
        }
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer &&
          portalFragments.has(node.name.text)
        ) {
          visit(node.initializer, true, portalFragments.get(node.name.text), false, false)
          return
        }
        if (ts.isJsxElement(node)) {
          const opening = node.openingElement
          const tag = opening.tagName.getText(sourceFile)
          const currentPortal = tag === 'DsInspectorPortal' ? portalNodes.get(node) : portal
          recordOpening(opening, inspector, portal)
          if (tag === 'DsInspectorHost') {
            visitAttributes(opening, inspector, portal, tabsPanel, tabsItems)
            for (const child of node.children) visit(child, true, portal, false, false)
            return
          }
          if (tag === 'DsInspectorPortal') {
            visitAttributes(opening, inspector, portal, tabsPanel, tabsItems)
            for (const child of node.children) visit(child, true, currentPortal, false, false)
            return
          }
          if (tag === 'DsInspectorTabs') {
            visitAttributes(opening, inspector, portal, tabsPanel, tabsItems, 'items', 'items')
            for (const child of node.children) visit(child, true, portal, true, false)
            return
          }
          if (tag === 'DsWorkbench') {
            visitAttributes(opening, inspector, portal, tabsPanel, tabsItems, 'inspector')
            for (const child of node.children) visit(child, inspector, portal, tabsPanel, tabsItems)
            return
          }
          visitAttributes(opening, inspector, portal, tabsPanel, tabsItems)
          for (const child of node.children) visit(child, inspector, portal, tabsPanel, tabsItems)
          return
        }
        if (ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sourceFile)
          recordOpening(node, inspector, portal)
          visitAttributes(
            node,
            inspector,
            portal,
            tabsPanel,
            tabsItems,
            tag === 'DsInspectorTabs' ? 'items' : tag === 'DsWorkbench' ? 'inspector' : undefined,
            tag === 'DsInspectorTabs' ? 'items' : undefined,
          )
          return
        }
        ts.forEachChild(node, (child) => visit(child, inspector, portal, tabsPanel, tabsItems))
      }
      visit(componentNode)
      components.set(id, component)
    }
  }

  const incoming = new Map<string, number>()
  for (const component of components.values())
    for (const edge of component.edges)
      if (edge.callee && components.has(edge.callee))
        incoming.set(edge.callee, (incoming.get(edge.callee) ?? 0) + 1)

  const states = new Map<string, Set<boolean>>()
  const paths = new Map<string, string>()
  const queue: Array<{ id: string; inspector: boolean; path: string }> = []
  function enqueue(id: string, inspector: boolean, path: string): void {
    const seen = states.get(id) ?? new Set<boolean>()
    if (seen.has(inspector)) return
    seen.add(inspector)
    states.set(id, seen)
    paths.set(`${id}|${inspector}`, path)
    queue.push({ id, inspector, path })
  }
  for (const id of components.keys()) if (!incoming.get(id)) enqueue(id, false, id)
  while (queue.length) {
    const current = queue.shift()!
    const component = components.get(current.id)!
    for (const edge of component.edges) {
      if (!edge.callee || !components.has(edge.callee)) continue
      const nextInspector = current.inspector || edge.inspector
      enqueue(
        edge.callee,
        nextInspector,
        `${current.path} > ${edge.inspector ? 'Inspector > ' : ''}${edge.callee}:${edge.line}`,
      )
    }
  }
  for (const id of components.keys())
    if (!states.has(id)) enqueue(id, false, `${id} (unresolved root)`)
  while (queue.length) {
    const current = queue.shift()!
    const component = components.get(current.id)!
    for (const edge of component.edges) {
      if (!edge.callee || !components.has(edge.callee)) continue
      enqueue(
        edge.callee,
        current.inspector || edge.inspector,
        `${current.path} > ${edge.callee}:${edge.line}`,
      )
    }
  }

  for (const component of components.values()) {
    const componentStates = states.get(component.id) ?? new Set([false])
    for (const grid of component.grids)
      if (!grid.inspector && componentStates.has(false))
        paths.set(
          `${component.id}|unsafe-grid:${grid.line}`,
          paths.get(`${component.id}|false`) ?? component.id,
        )
  }
  return { components, paths }
}

function assertPortalOwnership(
  graph: InspectorGraph,
  owner: InspectorComponent,
  host: InspectorComponent,
): void {
  expect(host.tabs, `${host.id} must own a DsInspectorTabs target`).toBeGreaterThan(0)
  const edges = host.edges.filter((candidate) => candidate.callee === owner.id)
  expect(edges.length, `${host.id} must render ${owner.id}`).toBeGreaterThan(0)
  const gridPortals = new Set(owner.grids.map((grid) => grid.portal))
  expect(
    gridPortals.has(undefined),
    `${owner.id} has a PropertyGrid outside DsInspectorPortal`,
  ).toBe(false)
  for (const portalIndex of gridPortals as Set<number>) {
    const portal = owner.portals[portalIndex]
    expect(portal, `${owner.id} is missing portal IR ${portalIndex}`).toBeDefined()
    const portalProp = /^props\.([A-Za-z0-9_]+)$/.exec(portal.host)?.[1]
    expect(
      portalProp,
      `${owner.id} governed portal host must come from an explicit component prop`,
    ).toBeDefined()
    const hostValues = edges
      .map((edge) => edge.attributes[portalProp!])
      .filter((value): value is string => Boolean(value))
    expect(hostValues.length, `${host.id} must pass ${portalProp} to ${owner.id}`).toBeGreaterThan(
      0,
    )
    const attached = hostValues.some((hostValue) => {
      const setter = host.hostBindings.get(hostValue)
      if (!setter) return false
      return [...host.inspectorRefs].some(
        (reference) => reference === setter || host.refCallbacks.get(reference) === setter,
      )
    })
    expect(
      attached,
      `${host.id} must attach ${portalProp} state to an intrinsic DOM ref inside DsInspectorTabs.items.panel`,
    ).toBe(true)
  }
}

function validateInspectorOwnershipGraph(
  manifest: any,
  overrides: Record<string, string> = {},
): void {
  const graph = inspectorGraph(overrides)
  const ownerNames = new Set(
    manifest.exceptions.inspectorOwners.map((entry: any) => entry.component),
  )
  for (const component of graph.components.values())
    for (const edge of component.edges)
      if (!edge.callee && ownerNames.has(edge.tag))
        throw new Error(`${component.id}:${edge.line} cannot resolve Inspector owner ${edge.tag}`)

  for (const entry of manifest.exceptions.inspectorHosts) {
    const hostId = componentIdentity(entry.source, entry.component)
    const host = graph.components.get(hostId)
    if (!host || host.hosts < 1)
      throw new Error(`${hostId} must own a real DsInspectorHost`)
  }
  for (const entry of manifest.exceptions.inspectorTabs) {
    const hostId = componentIdentity(entry.source, entry.component)
    const host = graph.components.get(hostId)
    if (!host || host.tabs < 1)
      throw new Error(`${hostId} must own a real DsInspectorTabs`)
  }

  for (const entry of manifest.exceptions.inspectorOwners) {
    const ownerId = componentIdentity(entry.source, entry.component)
    const hostId = componentIdentity(entry.host.source, entry.host.component)
    const owner = graph.components.get(ownerId)
    const host = graph.components.get(hostId)
    if (!owner) throw new Error(`missing Inspector owner ${ownerId}`)
    if (!host) throw new Error(`missing Inspector host ${hostId}`)
    if (owner.grids.length !== entry.propertyGrids)
      throw new Error(
        `${ownerId} PropertyGrid census changed: expected ${entry.propertyGrids}, received ${owner.grids.length}`,
      )
    for (const grid of owner.grids) {
      const unsafePath = graph.paths.get(`${ownerId}|unsafe-grid:${grid.line}`)
      if (unsafePath)
        throw new Error(
          `${ownerId}:${grid.line} can render outside a real Inspector host via ${unsafePath}`,
        )
    }
    if (entry.host.kind === 'public-inspector-portal') {
      assertPortalOwnership(graph, owner, host)
      continue
    }
    if (ownerId === hostId) {
      if (!owner.grids.every((grid) => grid.inspector))
        throw new Error(`${ownerId} must place every PropertyGrid under its own Inspector host`)
      continue
    }
    const hostReachable = new Set<string>()
    const queue: Array<{ id: string; inspector: boolean }> = [{ id: hostId, inspector: false }]
    while (queue.length) {
      const current = queue.shift()!
      const key = `${current.id}|${current.inspector}`
      if (hostReachable.has(key)) continue
      hostReachable.add(key)
      const component = graph.components.get(current.id)
      if (!component) continue
      for (const edge of component.edges)
        if (edge.callee)
          queue.push({ id: edge.callee, inspector: current.inspector || edge.inspector })
    }
    if (!hostReachable.has(`${ownerId}|true`) && !owner.grids.every((grid) => grid.inspector))
      throw new Error(`${hostId} has no Inspector-context path to ${ownerId}`)
  }
}

interface CssRule {
  selector: string
  body: string
  atRules: string[]
}

function splitTopLevelSelectors(selectorList: string): string[] {
  const selectors: string[] = []
  let start = 0
  let depth = 0
  for (let index = 0; index < selectorList.length; index += 1) {
    const character = selectorList[index]
    if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
    else if (character === ',' && depth === 0) {
      selectors.push(normalized(selectorList.slice(start, index)))
      start = index + 1
    }
  }
  selectors.push(normalized(selectorList.slice(start)))
  return selectors.filter(Boolean)
}

function cssRules(content: string): CssRule[] {
  const source = content.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: CssRule[] = []

  function parse(region: string, atRules: string[]): void {
    let cursor = 0
    while (cursor < region.length) {
      let opening = -1
      let quote = ''
      let parenDepth = 0
      for (let index = cursor; index < region.length; index += 1) {
        const character = region[index]
        if (quote) {
          if (character === quote && region[index - 1] !== '\\') quote = ''
          continue
        }
        if (character === '"' || character === "'") quote = character
        else if (character === '(' || character === '[') parenDepth += 1
        else if (character === ')' || character === ']') parenDepth = Math.max(0, parenDepth - 1)
        else if (character === '{' && parenDepth === 0) {
          opening = index
          break
        }
      }
      if (opening < 0) return

      let depth = 1
      quote = ''
      let closing = opening + 1
      for (; closing < region.length && depth > 0; closing += 1) {
        const character = region[closing]
        if (quote) {
          if (character === quote && region[closing - 1] !== '\\') quote = ''
          continue
        }
        if (character === '"' || character === "'") quote = character
        else if (character === '{') depth += 1
        else if (character === '}') depth -= 1
      }
      if (depth !== 0) throw new Error('Unbalanced CSS block in field-layout census')

      const header = normalized(region.slice(cursor, opening))
      const body = region.slice(opening + 1, closing - 1)
      if (header.startsWith('@')) parse(body, [...atRules, header])
      else
        for (const selector of splitTopLevelSelectors(header))
          rules.push({ selector, body, atRules })
      cursor = closing
    }
  }

  parse(source, [])
  return rules
}

function gridTemplateColumns(rule: CssRule): string[] {
  return [...rule.body.matchAll(/(?:^|;)\s*grid-template-columns\s*:\s*([^;}]*)/g)].map((match) =>
    normalized(match[1] ?? ''),
  )
}

function gridTrackDeclarations(rule: CssRule): Array<{ property: string; value: string }> {
  return [
    ...rule.body.matchAll(/(?:^|;)\s*(grid-template-columns|grid-template|grid)\s*:\s*([^;}]*)/g),
  ].map((match) => ({ property: match[1]!, value: normalized(match[2] ?? '') }))
}

function topLevelGridTracks(value: string): string[] {
  const tracks: string[] = []
  let start = 0
  let depth = 0
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index] ?? ' '
    if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
    if (/\s/.test(character) && depth === 0) {
      const track = value.slice(start, index).trim()
      if (track) tracks.push(track)
      start = index + 1
    }
  }
  return tracks
}

function gridColumnTracks(declaration: { property: string; value: string }): string[] {
  let value = declaration.value
  if (declaration.property !== 'grid-template-columns') {
    let depth = 0
    let slash = -1
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index]
      if (character === '(' || character === '[') depth += 1
      else if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
      else if (character === '/' && depth === 0) slash = index
    }
    if (slash < 0) return []
    value = value.slice(slash + 1)
  }
  return topLevelGridTracks(value)
}

function isPotentialBusinessLabelTrack(
  selector: string,
  declaration: { property: string; value: string },
): boolean {
  const tracks = gridColumnTracks(declaration)
  if (tracks.length < 2) return false
  if (/(?:field|form|meta|propert|setting)/i.test(selector)) return true
  const first = tracks[0] ?? ''
  const flexibleFirst = /(?:\b\d*\.?\d+fr\b|minmax\([^)]*fr|repeat\()/i.test(first)
  const flexibleRest = tracks
    .slice(1)
    .some((track) => /(?:\b\d*\.?\d+fr\b|minmax\([^)]*fr)/.test(track))
  return !flexibleFirst && flexibleRest
}

function containsExactFieldClass(selector: string): boolean {
  return /(^|[\s>+~,])\.field(?=[:.#[\s>+~,]|$)/.test(selector)
}

function productionCssFiles(): string[] {
  return recursiveFiles(uiRoot).filter((file) => file.endsWith('.css'))
}

function productionClassEvidence(): Map<string, Set<string>> {
  const evidence = new Map<string, Set<string>>()
  const add = (token: string, source: string): void => {
    if (!/^[-_A-Za-z][-_A-Za-z0-9]*$/.test(token)) return
    const sources = evidence.get(token) ?? new Set<string>()
    sources.add(source)
    evidence.set(token, sources)
  }
  for (const file of recursiveFiles(uiRoot).filter(
    (candidate) =>
      candidate.endsWith('.tsx') &&
      !/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/.test(candidate) &&
      !/\.(?:test|spec|stories|fixture)\.tsx$/.test(candidate),
  )) {
    const source = relative(uiRoot, file).split(sep).join('/')
    const sourceFile = ts.createSourceFile(
      source,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    function visit(node: ts.Node): void {
      if (ts.isJsxAttribute(node) && /className$/i.test(node.name.getText(sourceFile)))
        for (const fragment of staticClassFragments(node))
          for (const token of fragment.split(/\s+/).filter(Boolean)) add(token, source)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.name.text === 'classList' &&
        ['add', 'remove', 'toggle'].includes(node.expression.name.text)
      )
        for (const argument of node.arguments)
          if (ts.isStringLiteral(argument)) add(argument.text, source)
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }
  return evidence
}

function selectorClassTokens(selector: string): string[] {
  return [...selector.matchAll(/\.([-_A-Za-z][-_A-Za-z0-9]*)/g)]
    .map((match) => match[1]!)
    .filter((token, index, values) => values.indexOf(token) === index)
    .sort()
}

function liveCssTrackCensus(manifest: any): string[] {
  const classEvidence = productionClassEvidence()
  const nonForm = new Set(
    manifest.exceptions.nonFormTracks.map(
      (entry: any) =>
        `${entry.source}|${entry.atRule || 'root'}|${normalized(entry.selector)}|${entry.property}|${normalized(entry.value)}`,
    ),
  )
  return productionCssFiles()
    .flatMap((file) => {
      const source = relative(uiRoot, file).split(sep).join('/')
      return cssRules(readFileSync(file, 'utf8')).flatMap((rule) =>
        gridTrackDeclarations(rule).map(({ property, value }) => {
          const atRule = rule.atRules.join(' > ') || 'root'
          const identity = `${source}|${atRule}|${rule.selector}|${property}|${value}`
          const classification = nonForm.has(identity)
            ? 'reviewed-non-form'
            : source === 'design-system/primitives.css' && rule.selector.includes('.ds-field')
              ? 'public-main-field'
              : source === 'design-system/recipes.css' &&
                  rule.selector.includes('[data-ds-inspector-host]')
                ? 'public-inspector'
                : source === 'design-system/recipes.css' &&
                    rule.selector.includes('.ds-readout-row')
                  ? 'public-readout'
                  : source.startsWith('design-system/')
                    ? 'public-structure'
                    : rule.atRules.length
                      ? 'business-responsive-structure'
                      : 'business-structure'
          const classTokens = selectorClassTokens(rule.selector)
          const missingTokens = classTokens.filter((token) => !classEvidence.has(token))
          const isPublic = source.startsWith('design-system/')
          const liveness =
            isPublic || classTokens.length === 0 || missingTokens.length === 0 ? 'live' : 'dead'
          const evidence = isPublic
            ? `public-owner:${source}`
            : classTokens.length === 0
              ? `intrinsic-selector:${rule.selector}`
              : missingTokens.length
                ? `missing-class:${missingTokens.join(',')}`
                : classTokens
                    .map(
                      (token) =>
                        `${token}@${[...(classEvidence.get(token) ?? [])].sort().join(',')}`,
                    )
                    .join(';')
          return JSON.stringify({
            classification,
            evidence,
            liveness,
            source,
            atRule,
            selector: rule.selector,
            property,
            value,
          })
        }),
      )
    })
    .sort()
}

function publicRecord(entry: Record<string, unknown>, ignored: string[]) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !ignored.includes(key)))
}

function routeReachableInspectorComponents(graph: InspectorGraph): Set<string> {
  const truth = deriveFieldAdoptionTruth()
  const reachable = new Set<string>()
  const queue = Object.values(truth).flatMap((entry: any) =>
    entry.evidence.map((root: any) => componentIdentity(root.source, root.component)),
  )
  while (queue.length) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    const component = graph.components.get(id)
    if (!component) continue
    for (const edge of component.edges)
      if (edge.callee && !reachable.has(edge.callee)) queue.push(edge.callee)
  }
  return reachable
}

describe('field layout adoption gate', () => {
  test('closes over every production field group, inline exception, and detached Inspector owner', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'field-layout-adoption.json'), 'utf8'))
    const census = productionCensus()

    expect(manifest.version).toBe(1)
    expect(census.rawFieldClasses).toEqual([])
    expect(census.inlineLayoutStyles).toEqual([])
    expect(census.invalidInspectorShells).toEqual([])
    expect(census.unsafeInspectorPortals).toEqual([])
    expect(census.groups.map((entry) => JSON.stringify(entry)).sort()).toEqual(
      manifest.adoptions.map((entry) => JSON.stringify(entry)).sort(),
    )
    expect(census.inlineFields.map((entry) => JSON.stringify(entry)).sort()).toEqual(
      manifest.exceptions.inlineFields
        .map((entry) =>
          JSON.stringify(
            publicRecord(entry, ['owner', 'reason', 'responsiveEvidence', 'removalCondition']),
          ),
        )
        .sort(),
    )
    expect(census.detachedPropertyGrids.map((entry) => JSON.stringify(entry)).sort()).toEqual(
      manifest.exceptions.inspectorOwners
        .map((entry) =>
          JSON.stringify(
            publicRecord(entry, [
              'host',
              'owner',
              'reason',
              'responsiveEvidence',
              'removalCondition',
            ]),
          ),
        )
        .sort(),
    )
    expect(census.businessInspectorHosts.map((entry) => JSON.stringify(entry)).sort()).toEqual(
      manifest.exceptions.inspectorHosts.map((entry) => JSON.stringify(entry)).sort(),
    )
    expect(census.businessInspectorTabs.map((entry) => JSON.stringify(entry)).sort()).toEqual(
      manifest.exceptions.inspectorTabs.map((entry) => JSON.stringify(entry)).sort(),
    )
    const graph = inspectorGraph()
    const reachable = routeReachableInspectorComponents(graph)
    for (const entry of [...census.businessInspectorHosts, ...census.businessInspectorTabs])
      expect(
        reachable.has(componentIdentity(entry.source, entry.component)),
        `${entry.source}@${entry.component} must be reachable from a registered route`,
      ).toBe(true)
    validateInspectorOwnershipGraph(manifest)
  })

  test('rejects Inspector owners moved outside hosts, tabs, or a live portal bridge', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'field-layout-adoption.json'), 'utf8'))
    const appSource = readFileSync(join(uiRoot, 'App.tsx'), 'utf8')
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'App.tsx': appSource
          .replace(/<DsInspectorHost\b/g, '<div')
          .replace(/<\/DsInspectorHost>/g, '</div>'),
      }),
    ).toThrow(/must own a real DsInspectorHost|outside a real Inspector host|no Inspector-context path/)

    const aliasedOutsideHost = appSource
      .replace('export function App(', 'const Unsafe = EntityInspector\n\nexport function App(')
      .replace(
        '\n            <DsInspectorHost',
        '\n            <Unsafe />\n\n            <DsInspectorHost',
      )
    expect(aliasedOutsideHost).not.toBe(appSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'App.tsx': aliasedOutsideHost,
      }),
    ).toThrow(/outside a real Inspector host/)

    const memoAliasedOutsideHost = appSource
      .replace('export function App(', 'const UnsafeMemo = React.memo(EntityInspector)\n\nexport function App(')
      .replace(
        '\n            <DsInspectorHost',
        '\n            <UnsafeMemo />\n\n            <DsInspectorHost',
      )
    expect(memoAliasedOutsideHost).not.toBe(appSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'App.tsx': memoAliasedOutsideHost,
      }),
    ).toThrow(/outside a real Inspector host/)

    const counterfeitHost = appSource
      .replace('  DsInspectorHost,\n', '')
      .replace(
        'export function App(',
        'function DsInspectorHost(props: { children?: ReactNode }) { return <main>{props.children}</main> }\n\nexport function App(',
      )
    expect(counterfeitHost).not.toBe(appSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, { 'App.tsx': counterfeitHost }),
    ).toThrow(/DsInspectorHost must resolve to its canonical design-system export/)

    const unrelatedInspectorImport = appSource.replace(
      /from '\.\/design-system\/index\.js'/g,
      "from './fake-design-system.js'",
    )
    expect(unrelatedInspectorImport).not.toBe(appSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, { 'App.tsx': unrelatedInspectorImport }),
    ).toThrow(/must resolve to its canonical design-system export/)

    const sceneStart = appSource.indexOf('function SceneEntityInspectorTabs(')
    const entityStart = appSource.indexOf('function EntityInspector(', sceneStart)
    expect(sceneStart).toBeGreaterThanOrEqual(0)
    expect(entityStart).toBeGreaterThan(sceneStart)
    const sceneComponent = appSource.slice(sceneStart, entityStart)
    const brokenSceneComponent = sceneComponent
      .replace('<DsInspectorHost className="scene-entity-inspector">', '<div>')
      .replace('</DsInspectorHost>', '</div>')
    expect(brokenSceneComponent).not.toBe(sceneComponent)
    const nestedSameNameDecoy = `${appSource.slice(0, sceneStart)}${brokenSceneComponent}${appSource.slice(entityStart)}
function UnusedInspectorDecoy() {
  function SceneEntityInspectorTabs() {
    return <DsInspectorHost><DsInspectorTabs id="decoy" label="decoy" items={[]} activeId="decoy" onChange={() => {}} /></DsInspectorHost>
  }
  return <SceneEntityInspectorTabs />
}`
    expect(() =>
      validateInspectorOwnershipGraph(manifest, { 'App.tsx': nestedSameNameDecoy }),
    ).toThrow(/must own a real DsInspectorHost|outside a real Inspector host/)

    const battleSource = readFileSync(join(uiRoot, 'BattleSpriteLibrary.tsx'), 'utf8')
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'BattleSpriteLibrary.tsx': battleSource
          .replace(/<DsInspectorTabs\b/g, '<div')
          .replace(/<DsInspectorHost\b/g, '<div')
          .replace(/<\/DsInspectorHost>/g, '</div>'),
      }),
    ).toThrow(/must own a real DsInspectorHost|outside a real Inspector host|must place every PropertyGrid/)

    const stampSource = readFileSync(join(uiRoot, 'StampContentEditor.tsx'), 'utf8')
    const withoutLivePortal = stampSource.replace(
      '<DsInspectorPortal host={props.propertiesHost}>{properties}</DsInspectorPortal>',
      '<>{properties}<span hidden>{"<DsInspectorPortal"}</span></>',
    )
    expect(withoutLivePortal).not.toBe(stampSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampContentEditor.tsx': withoutLivePortal,
      }),
    ).toThrow(/outside a real Inspector host|must use one real DsInspectorPortal/)

    const decoyPortal = stampSource.replace(
      '<DsInspectorPortal host={props.propertiesHost}>{properties}</DsInspectorPortal>',
      '<><DsInspectorPortal host={props.propertiesHost}><span /></DsInspectorPortal><DsInspectorPortal host={document.body}>{properties}</DsInspectorPortal></>',
    )
    expect(decoyPortal).not.toBe(stampSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampContentEditor.tsx': decoyPortal,
      }),
    ).toThrow(/governed portal host must come from an explicit component prop/)

    const stampHostSource = readFileSync(join(uiRoot, 'StampLibraryTab.tsx'), 'utf8')
    const droppedRefValue = stampHostSource.replace(
      '(node: HTMLDivElement | null) => setPropertiesHost(node)',
      '(node: HTMLDivElement | null) => setPropertiesHost(null)',
    )
    expect(droppedRefValue).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': droppedRefValue,
      }),
    ).toThrow(/must attach propertiesHost state/)

    const deadForwardingBranch = stampHostSource.replace(
      '(node: HTMLDivElement | null) => setPropertiesHost(node)',
      '(node: HTMLDivElement | null) => { if (false) setPropertiesHost(node); setPropertiesHost(null) }',
    )
    expect(deadForwardingBranch).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': deadForwardingBranch,
      }),
    ).toThrow(/must attach propertiesHost state/)

    const labelOnlyRef = stampHostSource
      .replace("label: '属性',", 'label: <div ref={bindPropertiesHost}>属性</div>,')
      .replace(
        '<div ref={bindPropertiesHost} className="stamp-inspector-properties-host" />',
        '<div className="stamp-inspector-properties-host" />',
      )
    expect(labelOnlyRef).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': labelOnlyRef,
      }),
    ).toThrow(/must attach propertiesHost state/)

    const customRefSink = stampHostSource.replace(
      '<div ref={bindPropertiesHost} className="stamp-inspector-properties-host" />',
      '<RefSink ref={bindPropertiesHost} />',
    )
    expect(customRefSink).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': customRefSink,
      }),
    ).toThrow(/must attach propertiesHost state/)

    const deadGoodOwnerEdge = stampHostSource
      .replace(
        '}) {\n  const {',
        '}) {\n  const neverBase = false\n  const never = !!neverBase\n  const {',
      )
      .replace('propertiesHost={propertiesHost}', 'propertiesHost={document.body}')
      .replace(
        '{contentEditor ? (\n          <StampContentEditor',
        '{never && <StampContentEditor propertiesHost={propertiesHost} />}\n        {contentEditor ? (\n          <StampContentEditor',
      )
    expect(deadGoodOwnerEdge).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': deadGoodOwnerEdge,
      }),
    ).toThrow(/must attach propertiesHost state/)

    const deadGoodPanelRef = stampHostSource
      .replace(
        '}) {\n  const {',
        '}) {\n  const neverBase = false\n  const never = !!neverBase\n  const {',
      )
      .replace(
        '<main className="center stamp-center">',
        '<div ref={bindPropertiesHost} />\n\n      <main className="center stamp-center">',
      )
      .replace(
        '<div ref={bindPropertiesHost} className="stamp-inspector-properties-host" />',
        '{never && <div ref={bindPropertiesHost} />}\n                      <div className="stamp-inspector-properties-host" />',
      )
    expect(deadGoodPanelRef).not.toBe(stampHostSource)
    expect(() =>
      validateInspectorOwnershipGraph(manifest, {
        'StampLibraryTab.tsx': deadGoodPanelRef,
      }),
    ).toThrow(/must attach propertiesHost state/)
  }, 15_000)

  test('rejects Inspector self-authorization in a main-area shell or ordinary portal', () => {
    const mainArea = ts.createSourceFile(
      'main-area.tsx',
      'export function Main() { return <main><DsInspectorTabs id="x" label="x" items={[]} activeId="x" onChange={() => {}} /></main> }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let tabs: ts.JsxOpeningLikeElement | undefined
    function findTabs(node: ts.Node): void {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(mainArea) === 'DsInspectorTabs'
      )
        tabs = node
      ts.forEachChild(node, findTabs)
    }
    findTabs(mainArea)
    expect(inspectorShellCallsite(tabs!, mainArea)).toBe(false)

    const fakeInspectorClass = ts.createSourceFile(
      'fake-inspector.tsx',
      'export function Main() { return <main className="main-inspector-preview"><DsInspectorTabs id="x" label="x" items={[]} activeId="x" onChange={() => {}} /></main> }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let fakeTabs: ts.JsxOpeningLikeElement | undefined
    function findFakeTabs(node: ts.Node): void {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(fakeInspectorClass) === 'DsInspectorTabs'
      )
        fakeTabs = node
      ts.forEachChild(node, findFakeTabs)
    }
    findFakeTabs(fakeInspectorClass)
    expect(inspectorShellCallsite(fakeTabs!, fakeInspectorClass)).toBe(false)

    const exactInspectorClass = ts.createSourceFile(
      'exact-inspector.tsx',
      'export function Main() { return <main className="inspector"><DsInspectorTabs id="x" label="x" items={[]} activeId="x" onChange={() => {}} /></main> }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let exactClassTabs: ts.JsxOpeningLikeElement | undefined
    function findExactClassTabs(node: ts.Node): void {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(exactInspectorClass) === 'DsInspectorTabs'
      )
        exactClassTabs = node
      ts.forEachChild(node, findExactClassTabs)
    }
    findExactClassTabs(exactInspectorClass)
    expect(inspectorShellCallsite(exactClassTabs!, exactInspectorClass)).toBe(false)

    const deadBranchInspector = ts.createSourceFile(
      'dead-branch-inspector.tsx',
      'export function Main() { return <main className={false ? "inspector" : "main"}><DsInspectorTabs id="x" label="x" items={[]} activeId="x" onChange={() => {}} /></main> }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let deadBranchTabs: ts.JsxOpeningLikeElement | undefined
    function findDeadBranchTabs(node: ts.Node): void {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(deadBranchInspector) === 'DsInspectorTabs'
      )
        deadBranchTabs = node
      ts.forEachChild(node, findDeadBranchTabs)
    }
    findDeadBranchTabs(deadBranchInspector)
    expect(inspectorShellCallsite(deadBranchTabs!, deadBranchInspector)).toBe(false)

    const localAliases = ts.createSourceFile(
      'local-aliases.tsx',
      `import { DsInspectorTabs, DsPropertyGrid, DsPropertyRow } from './design-system/index.js'
       const Tabs = DsInspectorTabs
       const GridAlias = DsPropertyGrid
       const RowAlias = GridAlias
       const MemoTabs = memo(DsInspectorTabs)
       const MemoGrid = React.memo(DsPropertyGrid)
       export function Unsafe() { return <MemoTabs items={[{ panel: <MemoGrid><RowAlias /></MemoGrid> }]} /> }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(forbiddenDesignSystemOwnerAliases(localAliases)).toEqual(
      [
        'DsPropertyGrid as GridAlias',
        'DsPropertyGrid as MemoGrid',
        'DsPropertyGrid as RowAlias',
        'DsInspectorTabs as Tabs',
        'DsInspectorTabs as MemoTabs',
      ].sort(),
    )

    const portal = ts.createSourceFile(
      'unsafe-portal.tsx',
      `import { createPortal } from 'react-dom'
       const grid = <DsPropertyGrid><DsPropertyRow label="x">x</DsPropertyRow></DsPropertyGrid>
       export function Unsafe() { return <DsInspectorHost className="inspector">{createPortal(grid, document.body)}</DsInspectorHost> }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(unsafePropertyGridPortals(portal, 'unsafe-portal.tsx')).toEqual(['unsafe-portal.tsx:3'])
  })

  test('requires exact, evidence-bearing records for every governed exception', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'field-layout-adoption.json'), 'utf8'))
    expect(
      new Set(manifest.adoptions.map((entry) => `${entry.source}@${entry.component}`)).size,
    ).toBe(manifest.adoptions.length)
    expect(
      new Set(manifest.retiredPrivateTracks.map((entry) => `${entry.source}@${entry.selector}`))
        .size,
    ).toBe(manifest.retiredPrivateTracks.length)

    for (const entry of manifest.adoptions) {
      expect(Object.keys(entry).sort()).toEqual(['component', 'responsive', 'source', 'stacked'])
      expect(entry.responsive + entry.stacked).toBeGreaterThan(0)
    }
    for (const entry of manifest.exceptions.inlineFields) {
      expect(Object.keys(entry).sort()).toEqual([
        'className',
        'component',
        'fieldComponent',
        'label',
        'owner',
        'reason',
        'removalCondition',
        'responsiveEvidence',
        'source',
      ])
    }
    for (const entry of manifest.exceptions.inspectorOwners) {
      expect(Object.keys(entry).sort()).toEqual([
        'component',
        'host',
        'owner',
        'propertyGrids',
        'reason',
        'removalCondition',
        'responsiveEvidence',
        'source',
      ])
      expect(Object.keys(entry.host).sort()).toEqual(['component', 'kind', 'source'])
      expect(['business-shell', 'public-inspector-portal', 'public-inspector-tabs']).toContain(
        entry.host.kind,
      )
      if (entry.host.kind === 'business-shell')
        expect(manifest.exceptions.inspectorHosts).toContainEqual({
          source: entry.host.source,
          component: entry.host.component,
        })
      else {
        const hostSource = readFileSync(join(uiRoot, entry.host.source), 'utf8')
        const hostFile = ts.createSourceFile(
          entry.host.source,
          hostSource,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        )
        let hostUsesTabs = false
        function visitHost(node: ts.Node, insideHost = false): void {
          const isHost =
            insideHost ||
            (ts.isFunctionDeclaration(node) && node.name?.text === entry.host.component) ||
            ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
              ts.isVariableDeclaration(node.parent) &&
              ts.isIdentifier(node.parent.name) &&
              node.parent.name.text === entry.host.component)
          if (
            isHost &&
            (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
            node.tagName.getText(hostFile) === 'DsInspectorTabs'
          )
            hostUsesTabs = true
          ts.forEachChild(node, (child) => visitHost(child, isHost))
        }
        visitHost(hostFile)
        expect(hostUsesTabs, `${entry.host.source}@${entry.host.component} Inspector host`).toBe(
          true,
        )
        if (entry.host.kind === 'public-inspector-portal') {
          const ownerSource = readFileSync(join(uiRoot, entry.source), 'utf8')
          expect(ownerSource, `${entry.source}@${entry.component} portal bridge`).toContain(
            '<DsInspectorPortal',
          )
          expect(
            hostSource,
            `${entry.host.source}@${entry.host.component} portal consumer`,
          ).toContain(`<${entry.component}`)
        }
      }
    }
    expect(Object.keys(manifest.exceptions.inspectorTrack).sort()).toEqual([
      'owner',
      'property',
      'reason',
      'removalCondition',
      'responsiveEvidence',
      'selector',
      'source',
      'value',
    ])
    for (const entry of manifest.exceptions.nonFormTracks)
      expect(Object.keys(entry).sort()).toEqual([
        'atRule',
        'owner',
        'property',
        'reason',
        'removalCondition',
        'responsiveEvidence',
        'selector',
        'source',
        'value',
      ])
    for (const entry of [
      ...manifest.exceptions.inlineFields,
      ...manifest.exceptions.inspectorOwners,
      manifest.exceptions.inspectorTrack,
      ...manifest.exceptions.nonFormTracks,
    ]) {
      expect(entry.owner).toBe('card:ED-FIELD-LAYOUT-1')
      expect(entry.reason.length).toBeGreaterThan(10)
      expect(entry.responsiveEvidence.length).toBeGreaterThan(10)
      expect(entry.removalCondition.length).toBeGreaterThan(10)
    }
    for (const entry of manifest.retiredPrivateTracks) {
      expect(Object.keys(entry).sort()).toEqual([
        'disposition',
        'evidence',
        'formerValues',
        'owner',
        'reason',
        'removalCondition',
        'replacement',
        'selector',
        'selectorPolicy',
        'source',
      ])
      expect(entry.owner).toBe('card:ED-FIELD-LAYOUT-1')
      expect(entry.formerValues.length).toBeGreaterThan(0)
      expect(entry.reason.length).toBeGreaterThan(10)
      expect(entry.evidence.length).toBeGreaterThan(10)
      expect(entry.removalCondition.length).toBeGreaterThan(10)
    }
  })

  test('locks every production CSS grid track and rejects public-owner or token overrides', async () => {
    const manifest = JSON.parse(readFileSync(join(here, 'field-layout-adoption.json'), 'utf8'))
    const census = productionCensus()
    const cssFiles = productionCssFiles()
    const editorRules = cssRules(readFileSync(join(uiRoot, 'editor.css'), 'utf8'))
    const recipeRules = cssRules(readFileSync(join(here, 'recipes.css'), 'utf8'))

    const cssTrackCensus = liveCssTrackCensus(manifest)
    const cssTrackRecords = cssTrackCensus.map((record) => JSON.parse(record))
    expect(
      cssTrackRecords.filter(
        (record) => !record.source.startsWith('design-system/') && record.liveness !== 'live',
      ),
    ).toEqual([])
    await expect(cssTrackCensus.join('\n')).toMatchFileSnapshot(
      join(here, 'field-layout-css-census.snapshot.txt'),
    )

    const tokenDeclarations = cssFiles.flatMap((file) => {
      const source = relative(uiRoot, file).split(sep).join('/')
      return cssRules(readFileSync(file, 'utf8')).flatMap((rule) =>
        [
          ...rule.body.matchAll(
            /(--ds-(?:field-label|inspector-property-label)-track)\s*:\s*([^;}]*)/g,
          ),
        ].map((match) => ({
          source,
          selector: rule.selector,
          atRule: rule.atRules.join(' > '),
          property: match[1],
          value: normalized(match[2] ?? ''),
        })),
      )
    })
    expect(tokenDeclarations).toEqual([
      {
        source: 'design-system/tokens.css',
        selector: ':root',
        atRule: '',
        property: '--ds-field-label-track',
        value: '96px',
      },
      {
        source: 'design-system/tokens.css',
        selector: ':root',
        atRule: '',
        property: '--ds-inspector-property-label-track',
        value: '60px',
      },
    ])

    const governedPublicTracks = cssFiles
      .flatMap((file) => {
        const source = relative(uiRoot, file).split(sep).join('/')
        return cssRules(readFileSync(file, 'utf8')).flatMap((rule) =>
          /\.ds-(?:field(?:\b|-)|property-(?:grid|row)\b|readout-(?:list|row)\b)/.test(
            rule.selector,
          )
            ? gridTrackDeclarations(rule).map((declaration) =>
                [
                  source,
                  rule.atRules.join(' > ') || 'root',
                  rule.selector,
                  declaration.property,
                  declaration.value,
                ].join('|'),
              )
            : [],
        )
      })
      .sort()
    expect(governedPublicTracks).toEqual(
      [
        'design-system/primitives.css|root|.ds-field--inline|grid-template-columns|auto minmax(0, 1fr)',
        'design-system/primitives.css|root|.ds-field-group[data-layout="responsive"] > .ds-field|grid-template-columns|var(--ds-field-label-track) minmax(0, 1fr)',
        'design-system/primitives.css|root|.ds-field-group[data-layout="stacked"] > .ds-field|grid-template-columns|minmax(0, 1fr)',
        'design-system/primitives.css|@container ds-field-group (width < 480px)|.ds-field-group[data-layout="responsive"] > .ds-field|grid-template-columns|minmax(0, 1fr)',
        'design-system/recipes.css|root|.ds-property-row|grid-template-columns|minmax(0, 1fr)',
        'design-system/recipes.css|root|[data-ds-inspector-host] .ds-property-row|grid-template-columns|var(--ds-inspector-property-label-track) minmax(0, 1fr)',
        'design-system/recipes.css|root|.ds-readout-row|grid-template-columns|var(--ds-field-label-track) minmax(0, 1fr)',
        'design-system/recipes.css|@container ds-readout-list (width < 480px)|.ds-readout-row|grid-template-columns|minmax(0, 1fr)',
      ].sort(),
    )

    const businessRules = cssFiles
      .filter((file) => !relative(uiRoot, file).split(sep).join('/').startsWith('design-system/'))
      .flatMap((file) => cssRules(readFileSync(file, 'utf8')))
    expect(businessRules.filter((rule) => containsExactFieldClass(rule.selector))).toEqual([])
    expect(
      businessRules.filter(
        (rule) =>
          /\.ds-(?:field-group|field|property-grid|property-row|readout-list|readout-row)\b/.test(
            rule.selector,
          ) && gridTrackDeclarations(rule).length,
      ),
    ).toEqual([])
    const groupLayoutProperties = new Set([
      'align-items',
      'column-gap',
      'display',
      'gap',
      'grid',
      'grid-auto-columns',
      'grid-auto-flow',
      'grid-auto-rows',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
      'justify-items',
      'row-gap',
    ])
    const groupClassLayoutOverrides = businessRules.flatMap((rule) => {
      const touchesGroup = census.fieldGroupBusinessClasses.some((token: string) =>
        rule.selector.split(',').some((selector) => {
          const match = new RegExp(
            `\\.${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?![A-Za-z0-9_-])`,
          ).exec(selector)
          return !!match && !/[ >+~]/.test(selector.slice(match.index + match[0].length))
        }),
      )
      if (!touchesGroup) return []
      return [...rule.body.matchAll(/(?:^|;)\s*([A-Za-z-]+)\s*:/g)]
        .map((match) => match[1])
        .filter((property) => groupLayoutProperties.has(property))
        .map((property) => `${rule.selector}:${property}`)
    })
    expect(groupClassLayoutOverrides).toEqual([])

    const reviewedNonForm = new Set(
      manifest.exceptions.nonFormTracks.map(
        (entry: any) =>
          `${entry.source}|${entry.atRule || 'root'}|${normalized(entry.selector)}|${entry.property}|${normalized(entry.value)}`,
      ),
    )
    const unreviewedLabelCandidates = cssFiles
      .filter((file) => !relative(uiRoot, file).split(sep).join('/').startsWith('design-system/'))
      .flatMap((file) => {
        const source = relative(uiRoot, file).split(sep).join('/')
        return cssRules(readFileSync(file, 'utf8')).flatMap((rule) =>
          gridTrackDeclarations(rule)
            .filter((declaration) => isPotentialBusinessLabelTrack(rule.selector, declaration))
            .map(
              (declaration) =>
                `${source}|${rule.atRules.join(' > ') || 'root'}|${rule.selector}|${declaration.property}|${declaration.value}`,
            )
            .filter((identity) => !reviewedNonForm.has(identity)),
        )
      })
      .sort()
    expect(unreviewedLabelCandidates).toEqual([])

    for (const record of manifest.retiredPrivateTracks) {
      const values = editorRules
        .filter((rule) => rule.selector === normalized(record.selector))
        .flatMap(gridTrackDeclarations)
      expect(values, `${record.selector} must not own a private label track`).toEqual([])
      if (record.selectorPolicy === 'must-be-absent')
        expect(
          editorRules.filter((rule) => rule.selector === normalized(record.selector)),
          `${record.selector} must remain absent`,
        ).toEqual([])
    }

    for (const entry of manifest.exceptions.nonFormTracks) {
      expect(
        editorRules.filter(
          (rule) =>
            rule.selector === normalized(entry.selector) &&
            (rule.atRules.join(' > ') || '') === entry.atRule &&
            gridTrackDeclarations(rule).some(
              (declaration) =>
                declaration.property === entry.property &&
                declaration.value === normalized(entry.value),
            ),
        ),
        entry.selector,
      ).toHaveLength(1)
    }
    expect(
      recipeRules.filter(
        (rule) =>
          rule.selector === manifest.exceptions.inspectorTrack.selector &&
          gridTrackDeclarations(rule).some(
            (declaration) =>
              declaration.property === manifest.exceptions.inspectorTrack.property &&
              declaration.value === manifest.exceptions.inspectorTrack.value,
          ),
      ),
    ).toHaveLength(1)
  })

  test('locks the main readout track to 96px and the exact <480px container boundary', () => {
    const recipes = readFileSync(join(here, 'recipes.css'), 'utf8')
    const rules = cssRules(recipes)
    expect(
      rules.filter(
        (rule) =>
          rule.selector === '.ds-readout-row' &&
          rule.atRules.length === 0 &&
          gridTemplateColumns(rule).includes('var(--ds-field-label-track) minmax(0, 1fr)'),
      ),
    ).toHaveLength(1)
    expect(
      rules.filter(
        (rule) =>
          rule.selector === '.ds-readout-row' &&
          rule.atRules.join(' > ') === '@container ds-readout-list (width < 480px)' &&
          gridTemplateColumns(rule).includes('minmax(0, 1fr)'),
      ),
    ).toHaveLength(1)
  })

  test('recognizes exact legacy class tokens without matching compound names', () => {
    const source = ts.createSourceFile(
      'fixture.tsx',
      '<><div className={`field active`} /><div className={ok ? "item-field" : "field"} /></>',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const attributes: ts.JsxAttribute[] = []
    function visit(node: ts.Node): void {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'className')
        attributes.push(node)
      ts.forEachChild(node, visit)
    }
    visit(source)
    expect(attributes.map((attribute) => hasExactClassToken(attribute, 'field'))).toEqual([
      true,
      true,
    ])
    const fixtureRules = cssRules(
      '.entry-settings { grid-template-columns: 72px 1fr; } .shorthand { grid: auto / 84px 1fr; }',
    )
    expect(fixtureRules.flatMap(gridTrackDeclarations)).toEqual([
      { property: 'grid-template-columns', value: '72px 1fr' },
      { property: 'grid', value: 'auto / 84px 1fr' },
    ])
    expect(
      fixtureRules.flatMap((rule) =>
        gridTrackDeclarations(rule).filter((declaration) =>
          isPotentialBusinessLabelTrack(rule.selector, declaration),
        ),
      ),
    ).toHaveLength(2)
    expect(
      isPotentialBusinessLabelTrack('.entry-row', {
        property: 'grid-template-columns',
        value: '72px minmax(0, 1fr) auto',
      }),
    ).toBe(true)
    expect(
      isPotentialBusinessLabelTrack('.entry-row', {
        property: 'grid-template-columns',
        value: 'minmax(72px, 96px) minmax(0, 1fr)',
      }),
    ).toBe(true)

    const inlineStyleSource = ts.createSourceFile(
      'inline-style-fixture.tsx',
      `
        const labelWidth = 72
        const badTrack = { gridTemplateColumns: \`${'${labelWidth}'}px minmax(0, 1fr)\` }
        export function Fixture() {
          return <>
            <div style={badTrack} />
            <div style={{ '--ds-field-label-track': \`${'${labelWidth}'}px\` }} />
          </>
        }
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(governedInlineStyleViolations(inlineStyleSource, 'inline-style-fixture.tsx')).toEqual([
      'inline-style-fixture.tsx:3:gridTemplateColumns',
      'inline-style-fixture.tsx:7:--ds-field-label-track',
    ])
  })
})
