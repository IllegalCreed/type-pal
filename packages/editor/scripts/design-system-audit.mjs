import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const uiRoot = join(packageRoot, 'src/ui')
const allowlistPath = join(uiRoot, 'design-system/design-system-allowlist.json')
const adoptionPath = join(uiRoot, 'design-system/design-system-adoption.json')
const navigationPath = join(uiRoot, 'editor-navigation.ts')
const dataModePath = join(uiRoot, 'DataMode.tsx')
const appPath = join(uiRoot, 'App.tsx')
const allowlistKeys = [
  'file',
  'line',
  'rule',
  'owner',
  'reason',
  'verification',
  'removalCondition',
].sort()
const legacyTokens = new Set([
  'in',
  'tool',
  'btn',
  'mini',
  'mini-txt',
  'pv-btn',
  'item-action-button',
  'mini-icon',
  'media-zoom-controls',
])

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

function productionSources() {
  return filesUnder(uiRoot)
    .filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    .sort()
}

function jsxTag(node) {
  return node.tagName.getText()
}

function jsxAttribute(node, name) {
  return node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function literalAttribute(node, name) {
  const initializer = jsxAttribute(node, name)?.initializer
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : undefined
}

function classTokens(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (!initializer) return []
  return initializer
    .getText()
    .replace(/[{}'"`]/g, ' ')
    .split(/[^A-Za-z0-9_-]+/)
    .filter(Boolean)
}

function isStaticLiteral(expression) {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword
  )
    return true
  return (
    ts.isPrefixUnaryExpression(expression) &&
    (expression.operator === ts.SyntaxKind.MinusToken ||
      expression.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(expression.operand)
  )
}

function isStaticStyle(node) {
  const initializer = jsxAttribute(node, 'style')?.initializer
  if (!initializer || !ts.isJsxExpression(initializer)) return false
  const expression = initializer.expression
  if (!expression || !ts.isObjectLiteralExpression(expression) || !expression.properties.length)
    return false
  return expression.properties.every(
    (property) => ts.isPropertyAssignment(property) && isStaticLiteral(property.initializer),
  )
}

function shortFound(node, source) {
  return node.getText(source).split('\n')[0].trim().slice(0, 96)
}

const navigationActionWords = /(?:打开|查看|预览|跳转|定位|管理|编辑|引用|返回)/
const embeddedNavigationGlyphs = /[←-⇿]/u

/** Standard navigation actions use DsIcon(open); directional controls may still use arrow glyphs. */
export function isEmbeddedNavigationGlyphAction(tag, sourceText) {
  return (
    ['DsActionLink', 'DsButton', 'DsDiagnosticRow', 'DsPressable', 'DsReferenceRow'].includes(
      tag,
    ) &&
    embeddedNavigationGlyphs.test(sourceText) &&
    navigationActionWords.test(sourceText)
  )
}

function embeddedNavigationGlyphNodes(source) {
  const matches = []
  const visit = (node) => {
    const tagNode = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : undefined
    if (tagNode && isEmbeddedNavigationGlyphAction(jsxTag(tagNode), node.getText(source)))
      matches.push(tagNode)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return matches
}

export function findEmbeddedNavigationGlyphActions(sourceText) {
  const source = ts.createSourceFile(
    'NavigationGlyphFixture.tsx',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return embeddedNavigationGlyphNodes(source).map((node) => ({
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    tag: jsxTag(node),
  }))
}

function collectViolations() {
  const failures = []
  const add = (path, source, node, rule, recommendation) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
    failures.push({
      file: relative(uiRoot, path),
      line,
      rule,
      found: shortFound(node, source),
      recommendation,
    })
  }

  for (const path of productionSources()) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    for (const node of embeddedNavigationGlyphNodes(source))
      add(
        path,
        source,
        node,
        'embedded-navigation-glyph',
        'use DsIcon/DsButton icon="open" with plain action text; do not encode navigation icons in the label',
      )
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = jsxTag(node)
        const tokens = classTokens(node)
        for (const token of tokens) {
          if (!legacyTokens.has(token)) continue
          add(
            path,
            source,
            node,
            `legacy-class:${token}`,
            'use the matching DsButton/DsIconButton/DsCatalogRow owner and remove the legacy token',
          )
        }
        if (tag === 'select' || tag === 'datalist')
          add(path, source, node, 'native-choice', 'use DsSelect on DsFloatingLayer')
        if (tag === 'textarea')
          add(path, source, node, 'native-form-control', 'use DsTextArea or DsDraftTextArea')
        if (tag === 'input') {
          const type = literalAttribute(node, 'type') ?? 'text'
          add(
            path,
            source,
            node,
            type === 'checkbox' ? 'native-checkbox' : `native-input:${type}`,
            type === 'checkbox'
              ? 'use DsCheckbox'
              : type === 'file'
                ? 'use DsFileInput or document a semantic file-input exception'
                : type === 'range'
                  ? 'use DsRangeInput'
                  : 'use the matching design-system control',
          )
        }
        if (tag === 'button')
          add(
            path,
            source,
            node,
            tokens.includes('danger') ? 'native-danger-action' : 'native-button',
            tokens.includes('danger')
              ? 'use DsButton variant="danger"'
              : 'use DsButton/DsIconButton for actions or DsPressable for a rich selection surface',
          )
        if (tag === 'dialog') add(path, source, node, 'private-overlay', 'use DsDialog or DsDrawer')
        if (isStaticStyle(node))
          add(
            path,
            source,
            node,
            'static-inline-style',
            'move visual constants to a shared token/recipe class; dynamic geometry stays exempt',
          )
      }
      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) && node.expression.text === 'createPortal') ||
          (ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'createPortal'))
      )
        add(path, source, node, 'private-overlay-portal', 'use DsFloatingLayer or DsDialog')
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return failures.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  )
}

function parseJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

function unwrapExpression(expression) {
  let current = expression
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isParenthesizedExpression(current))
  )
    current = current.expression
  return current
}

function objectProperty(object, name) {
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name)),
  )
}

function stringProperty(object, name) {
  const value = unwrapExpression(objectProperty(object, name)?.initializer)
  return value && ts.isStringLiteral(value) ? value.text : undefined
}

function registeredSubpages(sourceOverride) {
  const source = ts.createSourceFile(
    navigationPath,
    sourceOverride ?? readFileSync(navigationPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const declarations = source.statements.flatMap((statement) => {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      return []
    return statement.declarationList.declarations.filter(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'EDITOR_MODULES',
    )
  })
  if (declarations.length !== 1)
    throw new Error('editor-navigation.ts must expose one top-level exported EDITOR_MODULES')
  const modules = unwrapExpression(declarations[0].initializer)
  if (!modules || !ts.isArrayLiteralExpression(modules))
    throw new Error('editor-navigation.ts must expose EDITOR_MODULES as an array literal')
  return modules.elements.flatMap((moduleNode) => {
    const module = unwrapExpression(moduleNode)
    if (!module || !ts.isObjectLiteralExpression(module)) return []
    const moduleId = stringProperty(module, 'id')
    const subpages = unwrapExpression(objectProperty(module, 'subpages')?.initializer)
    if (!moduleId || !subpages || !ts.isArrayLiteralExpression(subpages)) return []
    return subpages.elements.flatMap((subpageNode) => {
      const subpage = unwrapExpression(subpageNode)
      if (!subpage || !ts.isObjectLiteralExpression(subpage)) return []
      const id = stringProperty(subpage, 'id')
      if (!id) return []
      return [
        {
          registry: `${moduleId}/${id}`,
          kind: stringProperty(subpage, 'kind'),
          dataPage: stringProperty(subpage, 'dataPage'),
          projectPage: stringProperty(subpage, 'projectPage'),
        },
      ]
    })
  })
}

function functionLikeDefinition(node) {
  if (ts.isFunctionDeclaration(node) && node.name && node.body)
    return {
      name: node.name.text,
      body: node.body,
      parameters: node.parameters,
      declaration: node,
      hoisted: true,
    }
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer)
    return undefined
  let initializer = unwrapExpression(node.initializer)
  if (
    ts.isCallExpression(initializer) &&
    ts.isIdentifier(initializer.expression) &&
    ['memo', 'forwardRef'].includes(initializer.expression.text)
  )
    initializer = unwrapExpression(initializer.arguments[0])
  if (!initializer || (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)))
    return undefined
  return {
    name: node.name.text,
    body: initializer.body,
    parameters: initializer.parameters,
    declaration: node,
    hoisted: false,
  }
}

function topLevelFunctionDefinitions(source) {
  const definitions = new Map()
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      const definition = functionLikeDefinition(statement)
      if (definition) definitions.set(definition.name, definition)
      continue
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      const definition = functionLikeDefinition(declaration)
      if (definition) definitions.set(definition.name, definition)
    }
  }
  return definitions
}

function scopedFunctionDefinitions(source) {
  const definitions = new Map()
  const nearestScope = (node) => {
    let current = node.parent
    while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) current = current.parent
    return current
  }
  const visit = (node) => {
    const definition = functionLikeDefinition(node)
    if (definition) {
      const entries = definitions.get(definition.name) ?? []
      entries.push({ ...definition, scope: nearestScope(node) })
      definitions.set(definition.name, entries)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return definitions
}

function sameLexicalScope(left, right) {
  return (
    left === right ||
    (left && right && left.kind === right.kind && left.pos === right.pos && left.end === right.end)
  )
}

function resolveScopedFunctionAt(definitions, name, usage) {
  const candidates = definitions.get(name) ?? []
  let scope = usage
  while (scope) {
    if (ts.isBlock(scope) || ts.isSourceFile(scope)) {
      const visible = candidates
        .filter(
          (definition) =>
            sameLexicalScope(definition.scope, scope) &&
            (ts.isSourceFile(definition.scope) ||
              definition.hoisted ||
              definition.declaration.pos <= usage.pos),
        )
        .sort((left, right) => right.declaration.pos - left.declaration.pos)
      if (visible[0]) return visible[0]
    }
    scope = scope.parent
  }
  return undefined
}

function scopedConstIdentifierAliases(source) {
  const aliases = new Map()
  const nearestScope = (node) => {
    let current = node.parent
    while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) current = current.parent
    return current
  }
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const target = unwrapExpression(node.initializer)
      if (target && ts.isIdentifier(target)) {
        const entries = aliases.get(node.name.text) ?? []
        entries.push({ scope: nearestScope(node), declaration: node, target: target.text })
        aliases.set(node.name.text, entries)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return aliases
}

function resolveScopedConstAliasAt(aliases, name, usage) {
  const candidates = aliases.get(name) ?? []
  let scope = usage
  while (scope) {
    if (ts.isBlock(scope) || ts.isSourceFile(scope)) {
      const visible = candidates
        .filter(
          (alias) =>
            sameLexicalScope(alias.scope, scope) && alias.declaration.pos <= usage.pos,
        )
        .sort((left, right) => right.declaration.pos - left.declaration.pos)
      if (visible[0]) return visible[0]
    }
    scope = scope.parent
  }
  return undefined
}

function scopedValueBindings(source) {
  const bindings = new Map()
  const addNames = (name, scope, declaration) => {
    if (ts.isIdentifier(name)) {
      const entries = bindings.get(name.text) ?? []
      entries.push({ scope, declaration })
      bindings.set(name.text, entries)
      return
    }
    if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
      for (const element of name.elements)
        if (ts.isBindingElement(element)) addNames(element.name, scope, declaration)
  }
  const nearestScope = (node) => {
    let current = node.parent
    while (
      current &&
      !ts.isBlock(current) &&
      !ts.isSourceFile(current) &&
      !ts.isFunctionLike(current)
    )
      current = current.parent
    return current
  }
  const nearestFunctionScope = (node) => {
    let current = node.parent
    while (current && !ts.isSourceFile(current) && !ts.isFunctionLike(current))
      current = current.parent
    return current
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) return
    if (ts.isVariableDeclaration(node))
      addNames(
        node.name,
        ts.isVariableDeclarationList(node.parent) &&
          (node.parent.flags & ts.NodeFlags.BlockScoped) === 0
          ? nearestFunctionScope(node)
          : nearestScope(node),
        node,
      )
    else if (ts.isFunctionDeclaration(node) && node.name)
      addNames(node.name, nearestScope(node), node)
    else if (ts.isClassDeclaration(node) && node.name)
      addNames(node.name, nearestScope(node), node)
    else if (ts.isParameter(node))
      addNames(node.name, ts.isFunctionLike(node.parent) ? node.parent : nearestScope(node), node)
    else if (ts.isCatchClause(node) && node.variableDeclaration)
      addNames(node.variableDeclaration.name, node.block, node.variableDeclaration)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return bindings
}

const scopedFunctionCache = new WeakMap()
const scopedAliasCache = new WeakMap()
const scopedValueCache = new WeakMap()

function cachedScopedFunctions(source) {
  if (!scopedFunctionCache.has(source))
    scopedFunctionCache.set(source, scopedFunctionDefinitions(source))
  return scopedFunctionCache.get(source)
}

function cachedScopedAliases(source) {
  if (!scopedAliasCache.has(source))
    scopedAliasCache.set(source, scopedConstIdentifierAliases(source))
  return scopedAliasCache.get(source)
}

function cachedScopedValues(source) {
  if (!scopedValueCache.has(source)) scopedValueCache.set(source, scopedValueBindings(source))
  return scopedValueCache.get(source)
}

function hasVisibleLocalBinding(bindings, name, usage) {
  return Boolean(resolveScopedValueAt(bindings, name, usage))
}

function resolveScopedValueAt(bindings, name, usage) {
  const candidates = bindings.get(name) ?? []
  let scope = usage
  while (scope) {
    if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isFunctionLike(scope)) {
      const visible = candidates
        .filter((candidate) => sameLexicalScope(candidate.scope, scope))
        .sort((left, right) => right.declaration.pos - left.declaration.pos)
      if (visible[0]) return visible[0]
    }
    scope = scope.parent
  }
  return undefined
}

function namedFunctionBodies(source) {
  return new Map(
    [...topLevelFunctionDefinitions(source)].map(([name, definition]) => [name, definition.body]),
  )
}

function namedFunctionParameters(source) {
  return new Map(
    [...topLevelFunctionDefinitions(source)].map(([name, definition]) => [
      name,
      definition.parameters,
    ]),
  )
}

const staticUnknown = Symbol('static-unknown')
const staticUndefinedExpression = ts.factory.createIdentifier('undefined')

function staticAccessPath(expression) {
  const current = unwrapExpression(expression)
  if (!current) return undefined
  if (ts.isIdentifier(current)) return current.text
  if (ts.isPropertyAccessExpression(current)) {
    const base = staticAccessPath(current.expression)
    return base ? `${base}.${current.name.text}` : undefined
  }
  if (ts.isElementAccessExpression(current)) {
    const base = staticAccessPath(current.expression)
    const argument = unwrapExpression(current.argumentExpression)
    return base && argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))
      ? `${base}.${argument.text}`
      : undefined
  }
  return undefined
}

function staticMemberExpression(baseExpression, key, bindings, resolving = new Set()) {
  const path = staticAccessPath(baseExpression)
  const directKey = path ? `${path}.${key}` : undefined
  if (directKey && bindings?.has(directKey))
    return { known: true, expression: bindings.get(directKey), bindingKey: directKey }

  let base = unwrapExpression(baseExpression)
  if (path && bindings?.has(path) && !resolving.has(path)) {
    resolving.add(path)
    base = unwrapExpression(bindings.get(path))
    resolving.delete(path)
  }
  if (base && ts.isObjectLiteralExpression(base)) {
    let hasUnknownSpread = false
    for (const property of [...base.properties].reverse()) {
      if (ts.isSpreadAssignment(property)) {
        const spread = staticMemberExpression(property.expression, key, bindings, resolving)
        if (spread.known) return spread
        hasUnknownSpread = true
        continue
      }
      if (!('name' in property) || !property.name) continue
      const name = unwrapExpression(property.name)
      if (
        (!ts.isIdentifier(name) && !ts.isStringLiteral(name) && !ts.isNumericLiteral(name)) ||
        name.text !== key
      )
        continue
      if (ts.isPropertyAssignment(property)) return { known: true, expression: property.initializer }
      if (ts.isShorthandPropertyAssignment(property))
        return { known: true, expression: property.name }
    }
    return hasUnknownSpread
      ? { known: false }
      : { known: true, expression: staticUndefinedExpression }
  }
  if (base && ts.isArrayLiteralExpression(base) && /^\d+$/.test(key)) {
    const element = base.elements[Number(key)]
    return element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)
      ? { known: true, expression: element }
      : { known: true, expression: staticUndefinedExpression }
  }
  return { known: false }
}

function bindStaticPattern(pattern, initializer, bindings) {
  if (ts.isIdentifier(pattern)) {
    bindings.set(pattern.text, initializer)
    return
  }
  if (!ts.isObjectBindingPattern(pattern)) return
  for (const element of pattern.elements) {
    if (element.dotDotDotToken) continue
    const sourceName = element.propertyName?.getText() ??
      (ts.isIdentifier(element.name) ? element.name.text : undefined)
    if (!sourceName) continue
    const member = staticMemberExpression(initializer, sourceName, bindings)
    if (!member.known) continue
    let value = member.expression ?? staticUndefinedExpression
    if (element.initializer && staticPrimitiveValue(value, bindings) === undefined)
      value = element.initializer
    bindStaticPattern(element.name, value, bindings)
  }
}

function staticPrimitiveValue(expression, bindings, resolving = new Set()) {
  const current = unwrapExpression(expression)
  if (!current) return staticUnknown
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    const base = unwrapExpression(current.expression)
    const key = ts.isPropertyAccessExpression(current)
      ? current.name.text
      : (() => {
          const argument = unwrapExpression(current.argumentExpression)
          return argument &&
            (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))
            ? argument.text
            : undefined
        })()
    if (current.questionDotToken) {
      const baseValue = staticPrimitiveValue(base, bindings, resolving)
      if (baseValue === null || baseValue === undefined) return undefined
    }
    if (key !== undefined) {
      const member = staticMemberExpression(base, key, bindings, resolving)
      if (member.known) {
        if (member.bindingKey && resolving.has(member.bindingKey)) return staticUnknown
        if (member.bindingKey) resolving.add(member.bindingKey)
        const value = staticPrimitiveValue(
          member.expression ?? staticUndefinedExpression,
          bindings,
          resolving,
        )
        if (member.bindingKey) resolving.delete(member.bindingKey)
        return value
      }
    }
    const directKey = base && ts.isIdentifier(base) && key !== undefined ? `${base.text}.${key}` : ''
    if (directKey && bindings?.has(directKey)) {
      if (resolving.has(directKey)) return staticUnknown
      resolving.add(directKey)
      const value = staticPrimitiveValue(bindings.get(directKey), bindings, resolving)
      resolving.delete(directKey)
      return value
    }
    const initializer =
      base && ts.isIdentifier(base) && bindings?.has(base.text)
        ? unwrapExpression(bindings.get(base.text))
        : undefined
    if (initializer && ts.isObjectLiteralExpression(initializer) && key !== undefined) {
      const property = initializer.properties.find((candidate) => {
        if (!('name' in candidate) || !candidate.name) return false
        const name = unwrapExpression(candidate.name)
        return (
          (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) &&
          name.text === key
        )
      })
      if (property && ts.isPropertyAssignment(property))
        return staticPrimitiveValue(property.initializer, bindings, resolving)
      if (property && ts.isShorthandPropertyAssignment(property))
        return staticPrimitiveValue(property.name, bindings, resolving)
    }
    return staticUnknown
  }
  if (ts.isIdentifier(current) && bindings?.has(current.text)) {
    if (resolving.has(current.text)) return staticUnknown
    resolving.add(current.text)
    const value = staticPrimitiveValue(bindings.get(current.text), bindings, resolving)
    resolving.delete(current.text)
    return value
  }
  if (ts.isIdentifier(current) && current.text === 'undefined') return undefined
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false
  if (current.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isNumericLiteral(current)) return Number(current.text)
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
    return current.text
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = staticPrimitiveValue(current.operand, bindings, resolving)
    return operand === staticUnknown ? staticUnknown : !operand
  }
  if (ts.isConditionalExpression(current)) {
    const condition = staticBooleanValue(current.condition, bindings, resolving)
    if (condition === true) return staticPrimitiveValue(current.whenTrue, bindings, resolving)
    if (condition === false) return staticPrimitiveValue(current.whenFalse, bindings, resolving)
    return staticUnknown
  }
  if (ts.isBinaryExpression(current)) {
    const left = staticPrimitiveValue(current.left, bindings, resolving)
    if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      if (left === staticUnknown) return staticUnknown
      return left ? staticPrimitiveValue(current.right, bindings, resolving) : left
    }
    if (current.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      if (left === staticUnknown) return staticUnknown
      return left ? left : staticPrimitiveValue(current.right, bindings, resolving)
    }
    if (
      [
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
      ].includes(current.operatorToken.kind)
    ) {
      const right = staticPrimitiveValue(current.right, bindings, resolving)
      if (left === staticUnknown || right === staticUnknown) return staticUnknown
      const equal =
        Object.is(left, right) ||
        ((left === null || left === undefined) && (right === null || right === undefined))
      return [
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
      ].includes(current.operatorToken.kind)
        ? !equal
        : equal
    }
  }
  return staticUnknown
}

function staticBooleanValue(expression, bindings, resolving = new Set()) {
  const value = staticPrimitiveValue(expression, bindings, resolving)
  return value === staticUnknown ? undefined : Boolean(value)
}

function reachableRenderFlow(body, initialBindings = new Map(), options = {}) {
  const returns = []
  let completedReturns = 0
  let hasNonRenderExit = false
  const source = options.source
  const scopedFunctions =
    options.scopedFunctions ?? (source ? cachedScopedFunctions(source) : new Map())
  const scopedAliases =
    options.scopedAliases ?? (source ? cachedScopedAliases(source) : new Map())
  const scopedValues = options.scopedValues ?? (source ? cachedScopedValues(source) : new Map())
  const callableBindings = options.callableBindings ?? new Map()
  const callStack = options.callStack ?? new Set()
  const mutatedBindings = new Set()
  const visitStatements = (statements, inheritedBindings) => {
    const bindings = new Map(inheritedBindings)
    let canContinue = true
    for (const statement of statements) {
      if (!canContinue) break
      canContinue = visitStatement(statement, bindings)
    }
    return canContinue
  }
  const bindingRoot = (expression) => {
    let current = unwrapExpression(expression)
    while (
      current &&
      (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current))
    )
      current = unwrapExpression(current.expression)
    return current && ts.isIdentifier(current) ? current.text : undefined
  }
  const hasReachableLoopBreak = (statement, bindings) => {
    if (ts.isBreakStatement(statement)) return !statement.label
    if (ts.isBlock(statement))
      return statement.statements.some((child) => hasReachableLoopBreak(child, bindings))
    if (ts.isIfStatement(statement)) {
      const condition = staticBooleanValue(statement.expression, bindings)
      if (condition === true) return hasReachableLoopBreak(statement.thenStatement, bindings)
      if (condition === false)
        return statement.elseStatement
          ? hasReachableLoopBreak(statement.elseStatement, bindings)
          : false
      return (
        hasReachableLoopBreak(statement.thenStatement, bindings) ||
        (statement.elseStatement
          ? hasReachableLoopBreak(statement.elseStatement, bindings)
          : false)
      )
    }
    if (ts.isTryStatement(statement))
      return (
        hasReachableLoopBreak(statement.tryBlock, bindings) ||
        (statement.catchClause
          ? hasReachableLoopBreak(statement.catchClause.block, bindings)
          : false) ||
        (statement.finallyBlock
          ? hasReachableLoopBreak(statement.finallyBlock, bindings)
          : false)
      )
    if (
      ts.isFunctionLike(statement) ||
      ts.isSwitchStatement(statement) ||
      ts.isWhileStatement(statement) ||
      ts.isDoStatement(statement) ||
      ts.isForStatement(statement) ||
      ts.isForInStatement(statement) ||
      ts.isForOfStatement(statement)
    )
      return false
    return false
  }
  const invalidateBinding = (name, bindings) => {
    const invalid = new Set()
    let current = name
    while (current && !invalid.has(current)) {
      invalid.add(current)
      const initializer = unwrapExpression(bindings.get(current))
      current = initializer && ts.isIdentifier(initializer) ? initializer.text : undefined
    }
    for (const candidate of invalid) {
      mutatedBindings.add(candidate)
      bindings.delete(candidate)
    }
  }
  const forgetAssignedBinding = (expression, bindings) => {
    const current = unwrapExpression(expression)
    if (!current) return
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      current.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
      invalidateBinding(bindingRoot(current.left), bindings)
    if (
      (ts.isPrefixUnaryExpression(current) || ts.isPostfixUnaryExpression(current)) &&
      [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(current.operator) &&
      bindingRoot(current.operand)
    )
      invalidateBinding(bindingRoot(current.operand), bindings)
    if (ts.isDeleteExpression(current))
      invalidateBinding(bindingRoot(current.expression), bindings)
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      [
        'add',
        'clear',
        'copyWithin',
        'delete',
        'fill',
        'pop',
        'push',
        'reverse',
        'set',
        'shift',
        'sort',
        'splice',
        'unshift',
      ].includes(current.expression.name.text)
    )
      invalidateBinding(bindingRoot(current.expression.expression), bindings)
    if (!ts.isFunctionLike(current))
      ts.forEachChild(current, (child) => forgetAssignedBinding(child, bindings))
  }
  const executeReachableCalls = (expression, bindings) => {
    if (!source) return true
    const current = unwrapExpression(expression)
    if (!current || ts.isFunctionLike(current)) return true
    if (ts.isConditionalExpression(current)) {
      if (!executeReachableCalls(current.condition, bindings)) return false
      const condition = staticBooleanValue(current.condition, bindings)
      if (condition === true) return executeReachableCalls(current.whenTrue, bindings)
      if (condition === false) return executeReachableCalls(current.whenFalse, bindings)
      const whenTrueContinues = executeReachableCalls(current.whenTrue, bindings)
      const whenFalseContinues = executeReachableCalls(current.whenFalse, bindings)
      return whenTrueContinues || whenFalseContinues
    }
    if (ts.isBinaryExpression(current)) {
      if (!executeReachableCalls(current.left, bindings)) return false
      if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const left = staticBooleanValue(current.left, bindings)
        if (left === false) return true
        const rightContinues = executeReachableCalls(current.right, bindings)
        return left === true ? rightContinues : true
      }
      if (current.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        const left = staticBooleanValue(current.left, bindings)
        if (left === true) return true
        const rightContinues = executeReachableCalls(current.right, bindings)
        return left === false ? rightContinues : true
      }
      if (current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        const left = staticPrimitiveValue(current.left, bindings)
        if (left !== staticUnknown && left !== null && left !== undefined) return true
        const rightContinues = executeReachableCalls(current.right, bindings)
        return left === null || left === undefined ? rightContinues : true
      }
      return executeReachableCalls(current.right, bindings)
    }
    if (ts.isCallExpression(current)) {
      if (!executeReachableCalls(current.expression, bindings)) return false
      for (const argument of current.arguments)
        if (!executeReachableCalls(argument, bindings)) return false
      const directCallee = unwrapExpression(current.expression)
      let definition =
        directCallee && (ts.isArrowFunction(directCallee) || ts.isFunctionExpression(directCallee))
          ? {
              body: directCallee.body,
              parameters: directCallee.parameters,
              declaration: directCallee,
            }
          : undefined
      if (ts.isIdentifier(current.expression)) {
        let calledName = current.expression.text
        let resolutionSite = current
        const seenAliases = new Set()
        while (!seenAliases.has(calledName)) {
          seenAliases.add(calledName)
          const visibleValue = resolveScopedValueAt(scopedValues, calledName, resolutionSite)
          const callable = visibleValue
            ? unwrapExpression(callableBindings.get(visibleValue.declaration))
            : undefined
          if (callable) {
            if (ts.isIdentifier(callable)) {
              calledName = callable.text
              resolutionSite = callable
              continue
            }
            if (ts.isArrowFunction(callable) || ts.isFunctionExpression(callable)) {
              definition = {
                body: callable.body,
                parameters: callable.parameters,
                declaration: callable,
              }
              break
            }
          }
          const scopedDefinition = resolveScopedFunctionAt(
            scopedFunctions,
            calledName,
            resolutionSite,
          )
          if (
            scopedDefinition &&
            (!visibleValue || visibleValue.declaration === scopedDefinition.declaration)
          ) {
            definition = scopedDefinition
            break
          }
          const alias = resolveScopedConstAliasAt(scopedAliases, calledName, resolutionSite)
          if (!alias || (visibleValue && visibleValue.declaration !== alias.declaration)) break
          calledName = alias.target
          resolutionSite = alias.declaration
        }
      }
      const identity = definition
        ? `${definition.declaration.pos}:${definition.declaration.end}`
        : undefined
      if (definition && identity && !callStack.has(identity)) {
        const helperBindings = new Map(bindings)
        const helperCallableBindings = new Map(callableBindings)
        for (const [index, parameter] of definition.parameters.entries())
          if (ts.isIdentifier(parameter.name)) {
            const argument = current.arguments[index]
            if (argument) {
              helperBindings.set(parameter.name.text, argument)
              helperCallableBindings.set(parameter, argument)
            } else if (parameter.initializer) {
              helperBindings.set(parameter.name.text, parameter.initializer)
              helperCallableBindings.set(parameter, parameter.initializer)
            }
          }
        const helperFlow = reachableRenderFlow(definition.body, helperBindings, {
          source,
          scopedFunctions,
          scopedAliases,
          scopedValues,
          callableBindings: helperCallableBindings,
          callStack: new Set(callStack).add(identity),
        })
        for (const name of helperFlow.mutatedBindings) invalidateBinding(name, bindings)
        if (helperFlow.hasNonRenderExit) hasNonRenderExit = true
        return helperFlow.canContinue || helperFlow.completedReturns > 0
      }
      return true
    }
    let canContinue = true
    ts.forEachChild(current, (child) => {
      if (canContinue) canContinue = executeReachableCalls(child, bindings)
    })
    return canContinue
  }
  const visitStatement = (statement, bindings) => {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          declaration.initializer &&
          !executeReachableCalls(declaration.initializer, bindings)
        )
          return false
        if (
          declaration.initializer &&
          (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
        )
            bindStaticPattern(declaration.name, declaration.initializer, bindings)
      }
      return true
    }
    if (ts.isExpressionStatement(statement)) {
      const callsContinue = executeReachableCalls(statement.expression, bindings)
      forgetAssignedBinding(statement.expression, bindings)
      return callsContinue
    }
    if (ts.isReturnStatement(statement)) {
      if (statement.expression) {
        if (!executeReachableCalls(statement.expression, bindings)) return false
        returns.push({ expression: statement.expression, bindings: new Map(bindings) })
      }
      completedReturns += 1
      return false
    }
    if (ts.isThrowStatement(statement)) {
      if (statement.expression && !executeReachableCalls(statement.expression, bindings))
        return false
      hasNonRenderExit = true
      return false
    }
    if (ts.isBlock(statement)) return visitStatements(statement.statements, new Map(bindings))
    if (ts.isIfStatement(statement)) {
      if (!executeReachableCalls(statement.expression, bindings)) return false
      const condition = staticBooleanValue(statement.expression, bindings)
      if (condition === true) return visitStatement(statement.thenStatement, new Map(bindings))
      if (condition === false)
        return statement.elseStatement
          ? visitStatement(statement.elseStatement, new Map(bindings))
          : true
      const thenContinues = visitStatement(statement.thenStatement, new Map(bindings))
      const elseContinues = statement.elseStatement
        ? visitStatement(statement.elseStatement, new Map(bindings))
        : true
      return thenContinues || elseContinues
    }
    if (ts.isSwitchStatement(statement)) {
      if (!executeReachableCalls(statement.expression, bindings)) return false
      const discriminant = staticPrimitiveValue(statement.expression, bindings)
      if (discriminant !== staticUnknown) {
        const clauses = statement.caseBlock.clauses
        let start = clauses.findIndex(
          (clause) =>
            ts.isCaseClause(clause) &&
            staticPrimitiveValue(clause.expression, bindings) !== staticUnknown &&
            Object.is(staticPrimitiveValue(clause.expression, bindings), discriminant),
        )
        if (start < 0) start = clauses.findIndex(ts.isDefaultClause)
        if (start < 0) return true
        const switchBindings = new Map(bindings)
        for (const clause of clauses.slice(start))
          for (const child of clause.statements) {
            if (ts.isBreakStatement(child) && !child.label) return true
            if (!visitStatement(child, switchBindings)) return false
          }
        return true
      }
      const clauses = statement.caseBlock.clauses
      let canContinue = !clauses.some(ts.isDefaultClause)
      for (const [start] of clauses.entries()) {
        const switchBindings = new Map(bindings)
        let pathContinues = true
        for (const clause of clauses.slice(start)) {
          for (const child of clause.statements) {
            if (ts.isBreakStatement(child) && !child.label) {
              pathContinues = true
              break
            }
            if (!visitStatement(child, switchBindings)) {
              pathContinues = false
              break
            }
          }
          if (!pathContinues || clause.statements.some(
            (child) => ts.isBreakStatement(child) && !child.label,
          ))
            break
        }
        canContinue ||= pathContinues
      }
      return canContinue
    }
    if (ts.isTryStatement(statement)) {
      const tryContinues = visitStatement(statement.tryBlock, new Map(bindings))
      const catchContinues = statement.catchClause
        ? visitStatement(statement.catchClause.block, new Map(bindings))
        : false
      const finallyContinues = statement.finallyBlock
        ? visitStatement(statement.finallyBlock, new Map(bindings))
        : true
      return finallyContinues && (tryContinues || catchContinues)
    }
    if (
      ts.isWhileStatement(statement) ||
      ts.isDoStatement(statement) ||
      ts.isForStatement(statement) ||
      ts.isForInStatement(statement) ||
      ts.isForOfStatement(statement)
    ) {
      const loopExpression =
        ts.isWhileStatement(statement) || ts.isDoStatement(statement)
          ? statement.expression
          : ts.isForStatement(statement)
            ? statement.condition
            : statement.expression
      if (loopExpression && !executeReachableCalls(loopExpression, bindings)) return false
      if (
        (ts.isWhileStatement(statement) || ts.isForStatement(statement)) &&
        statement.expression &&
        staticBooleanValue(statement.expression, bindings) === false
      )
        return true
      const bodyContinues = visitStatement(statement.statement, new Map(bindings))
      const loopCondition =
        (ts.isWhileStatement(statement) || ts.isDoStatement(statement))
          ? staticBooleanValue(statement.expression, bindings)
          : ts.isForStatement(statement)
            ? statement.condition
              ? staticBooleanValue(statement.condition, bindings)
              : true
            : false
      if (
        loopCondition !== false &&
        !hasReachableLoopBreak(statement.statement, bindings) &&
        bodyContinues
      ) {
        hasNonRenderExit = true
        if (loopCondition === true) return false
      }
      return true
    }
    if (ts.isLabeledStatement(statement) || ts.isWithStatement(statement))
      return visitStatement(statement.statement, new Map(bindings))
    return true
  }
  const canContinue = ts.isBlock(body)
    ? visitStatements(body.statements, initialBindings)
    : ts.isStatement(body)
      ? visitStatement(body, new Map(initialBindings))
      : executeReachableCalls(body, new Map(initialBindings))
        ? (returns.push({ expression: body, bindings: new Map(initialBindings) }),
          (completedReturns += 1),
          false)
        : false
  return {
    returns,
    expressions: returns.map((entry) => entry.expression),
    completedReturns,
    canContinue,
    hasNonRenderExit,
    mutatedBindings,
  }
}

const provenRenderPropConsumers = new Set(['DsField'])
const provenDesignSystemChildrenConsumers = new Set([
  'DsActionLink',
  'DsButton',
  'DsCard',
  'DsCatalogGroupEmpty',
  'DsCatalogGroupList',
  'DsDiagnosticList',
  'DsDiagnosticPanel',
  'DsDialog',
  'DsDrawer',
  'DsField',
  'DsFieldGroup',
  'DsFieldMeasure',
  'DsFloatingLayer',
  'DsHelpTip',
  'DsInspectorHost',
  'DsInspectorPortal',
  'DsInspectorSection',
  'DsMediaViewport',
  'DsObjectWorkspace',
  'DsPressable',
  'DsPropertyGrid',
  'DsPropertyRow',
  'DsReadoutList',
  'DsReadoutRow',
  'DsReferenceGroup',
  'DsReferenceList',
  'DsReferencePanel',
  'DsReorderCollection',
  'DsReorderItem',
  'DsRepeatRow',
  'DsStatus',
  'DsTag',
  'DsTooltip',
  'DsWorkbenchSection',
])
const provenDesignSystemRenderNodeProps = new Map([
  ['DsCatalogControls', new Set(['filters'])],
  ['DsControlGroup', new Set(['control'])],
  ['DsInspectorTabs', new Set(['items'])],
  ['DsToolbar', new Set(['trailing'])],
  ['DsWorkbenchSection', new Set(['actions'])],
])
const semanticFieldOwnerSources = new Map([
  ['MediaAssetNameField', 'MediaAssetLifecycle.tsx'],
])

function reachableJsxOwners(sourcePath, rootComponent, options = {}) {
  const modules = new Map()
  const loadModule = (componentSource) => {
    if (modules.has(componentSource)) return modules.get(componentSource)
    const absoluteSource = join(uiRoot, componentSource)
    const sourceOverride = options.overrides?.[componentSource]
    if (sourceOverride === undefined && !statSync(absoluteSource, { throwIfNoEntry: false }))
      return undefined
    const source = ts.createSourceFile(
      componentSource,
      sourceOverride ?? readFileSync(absoluteSource, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const imports = new Map()
    const designSystemImports = new Set()
    const fragmentTags = new Set()
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue
      const specifier = statement.moduleSpecifier.text
      if (specifier === 'react') {
        const bindings = statement.importClause?.namedBindings
        if (bindings && ts.isNamedImports(bindings))
          for (const element of bindings.elements)
            if ((element.propertyName?.text ?? element.name.text) === 'Fragment')
              fragmentTags.add(element.name.text)
        if (bindings && ts.isNamespaceImport(bindings))
          fragmentTags.add(`${bindings.name.text}.Fragment`)
      }
      if (!specifier.startsWith('./') || !specifier.endsWith('.js')) continue
      const targetSource = join(dirname(componentSource), `${specifier.slice(2, -3)}.tsx`)
      if (targetSource.startsWith('design-system/')) {
        if (statement.importClause?.name) designSystemImports.add(statement.importClause.name.text)
        for (const element of statement.importClause?.namedBindings?.elements ?? [])
          designSystemImports.add(element.name.text)
        continue
      }
      if (
        options.overrides?.[targetSource] === undefined &&
        !statSync(join(uiRoot, targetSource), { throwIfNoEntry: false })
      )
        continue
      if (statement.importClause?.name)
        imports.set(statement.importClause.name.text, {
          source: targetSource,
          component: 'default',
        })
      for (const element of statement.importClause?.namedBindings?.elements ?? [])
        imports.set(element.name.text, {
          source: targetSource,
          component: element.propertyName?.text ?? element.name.text,
        })
    }
    const module = {
      source,
      functions: namedFunctionBodies(source),
      parameters: namedFunctionParameters(source),
      scopedFunctions: scopedFunctionDefinitions(source),
      scopedValues: scopedValueBindings(source),
      imports,
      designSystemImports,
      fragmentTags,
    }
    modules.set(componentSource, module)
    return module
  }
  const rootModule = loadModule(sourcePath)
  if (!rootModule?.functions.has(rootComponent))
    throw new Error(`${sourcePath} has no named component ${rootComponent}`)
  const tags = new Set()
  const ownerSources = new Set()
  const visitedSources = new Set()
  const visited = new Set()
  const scopedFunctionAt = (module, name, usage) =>
    resolveScopedFunctionAt(module.scopedFunctions, name, usage)
  const hasLocalShadow = (module, tag, usage) =>
    hasVisibleLocalBinding(module.scopedValues, tag.split('.')[0], usage)
  const resolveBoundExpression = (expression, bindings, resolving = new Set()) => {
    if (Array.isArray(expression)) return expression
    const current = unwrapExpression(expression)
    if (!current) return expression
    const bindingKey = ts.isIdentifier(current)
      ? current.text
      : ts.isPropertyAccessExpression(current) && ts.isIdentifier(current.expression)
        ? `${current.expression.text}.${current.name.text}`
        : undefined
    if (!bindingKey || !bindings.has(bindingKey) || resolving.has(bindingKey)) return current
    resolving.add(bindingKey)
    const resolved = resolveBoundExpression(bindings.get(bindingKey), bindings, resolving)
    resolving.delete(bindingKey)
    return resolved
  }
  const bindCallParameters = (parameters, argumentsList, bindings) => {
    const next = new Map(bindings)
    for (const [index, parameter] of parameters.entries()) {
      const argument = argumentsList[index]
      if (ts.isIdentifier(parameter.name)) {
        next.delete(parameter.name.text)
        next.set(
          parameter.name.text,
          argument
            ? resolveBoundExpression(argument, bindings)
            : parameter.initializer
              ? parameter.initializer
              : staticUndefinedExpression,
        )
        continue
      }
      if (!ts.isObjectBindingPattern(parameter.name)) continue
      const object = argument ? unwrapExpression(resolveBoundExpression(argument, bindings)) : undefined
      for (const element of parameter.name.elements) {
        if (!ts.isIdentifier(element.name)) continue
        const sourceName = element.propertyName?.getText() ?? element.name.text
        const property =
          object && ts.isObjectLiteralExpression(object)
            ? object.properties.find(
                (candidate) =>
                  ts.isPropertyAssignment(candidate) &&
                  candidate.name.getText().replace(/^['"]|['"]$/g, '') === sourceName,
              )
            : undefined
        next.delete(element.name.text)
        next.set(
          element.name.text,
          property && ts.isPropertyAssignment(property)
            ? resolveBoundExpression(property.initializer, bindings)
            : element.initializer ?? staticUndefinedExpression,
        )
      }
    }
    return next
  }
  const jsxAttributeValue = (attribute) => {
    if (!attribute.initializer) return undefined
    if (ts.isJsxExpression(attribute.initializer)) return attribute.initializer.expression
    return attribute.initializer
  }
  const bindJsxComponentProps = (opening, parameters, body, bindings) => {
    const next = new Map(bindings)
    const parameter = parameters?.[0]
    if (!parameter) return next
    const values = new Map()
    let hasUnknownSpread = false
    const addObjectProperties = (expression, resolving = new Set()) => {
      const current = resolveBoundExpression(expression, bindings, resolving)
      if (!current || Array.isArray(current) || !ts.isObjectLiteralExpression(current)) return false
      for (const property of current.properties) {
        if (ts.isSpreadAssignment(property)) {
          if (!addObjectProperties(property.expression, resolving)) return false
          continue
        }
        if (!property.name) continue
        const name = property.name.getText().replace(/^['"]|['"]$/g, '')
        if (ts.isPropertyAssignment(property))
          values.set(name, resolveBoundExpression(property.initializer, bindings))
        else if (ts.isShorthandPropertyAssignment(property))
          values.set(name, resolveBoundExpression(property.name, bindings))
      }
      return true
    }
    for (const attribute of opening.attributes.properties) {
      if (ts.isJsxSpreadAttribute(attribute)) {
        if (!addObjectProperties(attribute.expression)) hasUnknownSpread = true
        continue
      }
      if (!ts.isJsxAttribute(attribute)) continue
      const value = jsxAttributeValue(attribute)
      if (value) values.set(attribute.name.getText(), resolveBoundExpression(value, bindings))
    }
    if (ts.isJsxElement(opening.parent)) {
      const renderedChildren = opening.parent.children
        .map((child) =>
          ts.isJsxExpression(child)
            ? child.expression
            : ts.isJsxText(child) && !child.getText().trim()
              ? undefined
              : child,
        )
        .filter(Boolean)
      if (renderedChildren.length)
        values.set(
          'children',
          renderedChildren.length === 1
            ? resolveBoundExpression(renderedChildren[0], bindings)
            : renderedChildren.map((child) => resolveBoundExpression(child, bindings)),
        )
    }
    if (ts.isIdentifier(parameter.name)) {
      for (const key of [...next.keys()])
        if (key === parameter.name.text || key.startsWith(`${parameter.name.text}.`)) next.delete(key)
      for (const [name, value] of values) next.set(`${parameter.name.text}.${name}`, value)
      if (!hasUnknownSpread && body) {
        const referenced = new Set()
        const visit = (node) => {
          if (
            ts.isPropertyAccessExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === parameter.name.text
          )
            referenced.add(node.name.text)
          ts.forEachChild(node, visit)
        }
        visit(body)
        for (const name of referenced)
          if (!values.has(name))
            next.set(`${parameter.name.text}.${name}`, staticUndefinedExpression)
      }
    } else if (ts.isObjectBindingPattern(parameter.name))
      for (const element of parameter.name.elements) {
        if (!ts.isIdentifier(element.name)) continue
        const sourceName = element.propertyName?.getText() ?? element.name.text
        const value = values.get(sourceName)
        next.delete(element.name.text)
        next.set(
          element.name.text,
          value ?? element.initializer ?? staticUndefinedExpression,
        )
      }
    return next
  }
  const collect = (componentSource, component, initialNode, inheritedBindings = new Map()) => {
    const bindingIdentity = [...inheritedBindings]
      .map(
        ([name, initializer]) =>
          `${name}:${Array.isArray(initializer) ? initializer.map((node) => node.pos).join('.') : initializer.pos}`,
      )
      .sort()
      .join(',')
    const identity = `${componentSource}@${component}${initialNode ? '#routed' : ''}#${bindingIdentity}`
    if (visited.has(identity)) return
    visited.add(identity)
    const module = loadModule(componentSource)
    const body = initialNode ?? module?.functions.get(component)
    if (!body) return
    visitedSources.add(componentSource)
    const visitAggregateMember = (node, bindings, visitedInitializers) => {
      const base = unwrapExpression(node.expression)
      if (!base || !ts.isIdentifier(base)) return
      const initializer = unwrapExpression(bindings.get(base.text))
      if (!initializer) return
      const key = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : (() => {
            const argument = unwrapExpression(node.argumentExpression)
            return argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))
              ? argument.text
              : undefined
          })()
      if (key === undefined) return
      if (ts.isObjectLiteralExpression(initializer)) {
        const property = initializer.properties.find((candidate) => {
          if (!('name' in candidate) || !candidate.name) return false
          const name = unwrapExpression(candidate.name)
          return (
            (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) &&
            name.text === key
          )
        })
        if (property && ts.isPropertyAssignment(property))
          visit(property.initializer, bindings, visitedInitializers)
        else if (property && ts.isShorthandPropertyAssignment(property))
          visit(property.name, bindings, visitedInitializers)
        return
      }
      if (ts.isArrayLiteralExpression(initializer)) {
        const index = Number(key)
        const element = Number.isInteger(index) ? initializer.elements[index] : undefined
        if (element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element))
          visit(element, bindings, visitedInitializers)
      }
    }
    const visit = (node, bindings = inheritedBindings, visitedInitializers = new Set()) => {
      if (Array.isArray(node)) {
        for (const child of node) visit(child, bindings, visitedInitializers)
        return
      }
      const owningSource = node?.getSourceFile?.()?.fileName
      if (owningSource && owningSource !== componentSource) {
        collect(owningSource, `__bound_${node.pos}_${node.end}`, node, bindings)
        return
      }
      const expression = unwrapExpression(node)
      if (expression !== node) {
        visit(expression, bindings, visitedInitializers)
        return
      }
      if (ts.isFunctionLike(node)) return
      if (ts.isJsxExpression(node)) {
        const child = unwrapExpression(node.expression)
        const parentTag = ts.isJsxElement(node.parent)
          ? node.parent.openingElement.tagName.getText(module.source)
          : undefined
        const provenConsumer =
          provenRenderPropConsumers.has(parentTag) &&
          module.designSystemImports.has(parentTag) &&
          !hasLocalShadow(module, parentTag, node.parent.openingElement)
        if (
          child &&
          (ts.isArrowFunction(child) || ts.isFunctionExpression(child)) &&
          provenConsumer
        ) {
          for (const rendered of reachableRenderFlow(child.body, bindings, { source: module.source }).returns)
            visit(rendered.expression, rendered.bindings)
          return
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        const binding = bindings.get(
          `${node.expression.expression.text}.${node.expression.name.text}`,
        )
        const callback = unwrapExpression(binding)
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          const callbackBindings = bindCallParameters(callback.parameters, node.arguments, bindings)
          for (const rendered of reachableRenderFlow(callback.body, callbackBindings, {
            source: callback.getSourceFile(),
          }).returns)
            visit(rendered.expression, rendered.bindings)
          return
        }
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        const base = unwrapExpression(node.expression)
        const key = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : (() => {
              const argument = unwrapExpression(node.argumentExpression)
              return argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))
                ? argument.text
                : undefined
            })()
        if (base && ts.isIdentifier(base) && key !== undefined) {
          const bindingKey = `${base.text}.${key}`
          const binding = bindings.get(bindingKey)
          if (binding && !visitedInitializers.has(bindingKey)) {
            visitedInitializers.add(bindingKey)
            visit(binding, bindings, visitedInitializers)
            visitedInitializers.delete(bindingKey)
            return
          }
        }
        visitAggregateMember(node, bindings, visitedInitializers)
        return
      }
      if (ts.isIdentifier(node)) {
        const initializer = bindings.get(node.text)
        if (initializer && !visitedInitializers.has(node.text)) {
          visitedInitializers.add(node.text)
          visit(initializer, bindings, visitedInitializers)
          visitedInitializers.delete(node.text)
        }
        return
      }
      if (ts.isJsxElement(node)) {
        visit(node.openingElement, bindings, visitedInitializers)
        const tag = node.openingElement.tagName.getText(module.source)
        const localShadow = hasLocalShadow(module, tag, node.openingElement)
        const directChildrenAreRendered =
          /^[a-z]/.test(tag) ||
          (module.fragmentTags.has(tag) && !localShadow) ||
          (module.designSystemImports.has(tag) &&
            !localShadow &&
            provenDesignSystemChildrenConsumers.has(tag))
        if (directChildrenAreRendered)
          for (const child of node.children) visit(child, bindings, visitedInitializers)
        return
      }
      if (ts.isJsxFragment(node)) {
        for (const child of node.children) visit(child, bindings, visitedInitializers)
        return
      }
      if (ts.isConditionalExpression(node)) {
        const condition = staticBooleanValue(node.condition, bindings)
        if (condition !== false) visit(node.whenTrue, bindings, visitedInitializers)
        if (condition !== true) visit(node.whenFalse, bindings, visitedInitializers)
        return
      }
      if (ts.isBinaryExpression(node)) {
        const operator = node.operatorToken.kind
        if (operator === ts.SyntaxKind.CommaToken) {
          visit(node.right, bindings, visitedInitializers)
          return
        }
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
          if (staticBooleanValue(node.left, bindings) !== false)
            visit(node.right, bindings, visitedInitializers)
          return
        }
        if (operator === ts.SyntaxKind.BarBarToken) {
          const left = staticBooleanValue(node.left, bindings)
          if (left !== false) visit(node.left, bindings, visitedInitializers)
          if (left !== true) visit(node.right, bindings, visitedInitializers)
          return
        }
        if (operator === ts.SyntaxKind.QuestionQuestionToken) {
          const left = staticPrimitiveValue(node.left, bindings)
          if (left === staticUnknown) {
            visit(node.left, bindings, visitedInitializers)
            visit(node.right, bindings, visitedInitializers)
          } else if (left === null || left === undefined)
            visit(node.right, bindings, visitedInitializers)
          else visit(node.left, bindings, visitedInitializers)
          return
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const definition = scopedFunctionAt(module, node.expression.text, node)
        if (definition) {
        collect(
          componentSource,
            `${node.expression.text}@${definition.declaration.pos}`,
            definition.body,
          bindCallParameters(
              definition.parameters,
            node.arguments,
            bindings,
          ),
        )
        return
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callback = unwrapExpression(bindings.get(node.expression.text))
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          const callbackBindings = bindCallParameters(callback.parameters, node.arguments, bindings)
          for (const rendered of reachableRenderFlow(callback.body, callbackBindings, {
            source: callback.getSourceFile(),
          }).returns)
            visit(rendered.expression, rendered.bindings)
          return
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['map', 'flatMap'].includes(node.expression.name.text)
      ) {
        for (const argument of node.arguments) {
          if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
            for (const rendered of reachableRenderFlow(argument.body, bindings, {
              source: argument.getSourceFile(),
            }).returns)
              visit(rendered.expression, rendered.bindings)
          } else if (ts.isIdentifier(argument)) {
            const definition = scopedFunctionAt(module, argument.text, node)
            if (definition)
              collect(
                componentSource,
                `${argument.text}@${definition.declaration.pos}`,
                definition.body,
                bindings,
              )
          }
        }
        return
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'useMemo'
      ) {
        const factory = unwrapExpression(node.arguments[0])
        if (factory && (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)))
          for (const rendered of reachableRenderFlow(factory.body, bindings, {
            source: factory.getSourceFile(),
          }).returns)
            visit(rendered.expression, rendered.bindings)
        return
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'createPortal'
      ) {
        if (node.arguments[0]) visit(node.arguments[0], bindings, visitedInitializers)
        return
      }
      if (ts.isCallExpression(node)) {
        const callee = unwrapExpression(node.expression)
        if (callee && (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee))) {
          for (const rendered of reachableRenderFlow(callee.body, bindings, {
            source: callee.getSourceFile(),
          }).returns)
            visit(rendered.expression, rendered.bindings)
          return
        }
        return
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(module.source)
        const localShadow = hasLocalShadow(module, tag, node)
        const imported = localShadow ? undefined : module.imports.get(tag)
        const governedOwner = tag.startsWith('Ds')
          ? module.designSystemImports.has(tag) && !localShadow
          : semanticFieldOwnerSources.get(tag) === imported?.source ||
            (semanticFieldOwnerSources.get(tag) === componentSource &&
              Boolean(scopedFunctionAt(module, tag, node)))
        if (!fieldOwnerTokenForTag(tag) || governedOwner) tags.add(tag)
        if (fieldOwnerTokenForTag(tag) && governedOwner) ownerSources.add(componentSource)
        if (/^[A-Z][A-Za-z0-9_]*$/.test(tag)) {
          const definition = scopedFunctionAt(module, tag, node)
          if (definition)
            collect(
              componentSource,
              `${tag}@${definition.declaration.pos}`,
              definition.body,
              bindJsxComponentProps(node, definition.parameters, definition.body, bindings),
            )
          else {
            if (imported) {
              const targetModule = loadModule(imported.source)
              collect(
                imported.source,
                imported.component,
                undefined,
                bindJsxComponentProps(
                  node,
                  targetModule?.parameters.get(imported.component),
                  targetModule?.functions.get(imported.component),
                  bindings,
                ),
              )
            }
          }
        }
        if (module.designSystemImports.has(tag) && !localShadow) {
          const renderedProps = provenDesignSystemRenderNodeProps.get(tag) ?? new Set()
          for (const attribute of node.attributes.properties)
            if (
              ts.isJsxAttribute(attribute) &&
              renderedProps.has(attribute.name.getText()) &&
              attribute.initializer
            )
              visit(attribute.initializer, bindings, visitedInitializers)
        }
        return
      }
      if (ts.isJsxClosingElement(node) || ts.isJsxSpreadAttribute(node)) return
      ts.forEachChild(node, (child) => visit(child, bindings, visitedInitializers))
    }
    const renderFlow =
      initialNode && !ts.isBlock(initialNode)
        ? { returns: [{ expression: initialNode, bindings: new Map(inheritedBindings) }] }
        : reachableRenderFlow(body, inheritedBindings, { source: module.source })
    for (const rendered of renderFlow.returns) visit(rendered.expression, rendered.bindings)
  }
  collect(sourcePath, rootComponent, options.initialNode)
  return { tags, ownerSources, visitedSources }
}

const reachableOwnerCache = new Map()

function cachedReachableJsxOwners(sourcePath, rootComponent, options = {}) {
  const initialText = options.initialNode?.getText?.() ?? ''
  const key = `${sourcePath}@${rootComponent}#${initialText}`
  const candidates = reachableOwnerCache.get(key) ?? []
  const contentFor = (source) =>
    options.overrides?.[source] ?? readFileSync(join(uiRoot, source), 'utf8')
  for (const candidate of candidates)
    if ([...candidate.fingerprints].every(([source, content]) => contentFor(source) === content))
      return candidate.result
  const result = reachableJsxOwners(sourcePath, rootComponent, options)
  const fingerprints = new Map(
    [...result.visitedSources].map((source) => [source, contentFor(source)]),
  )
  candidates.push({ fingerprints, result })
  reachableOwnerCache.set(key, candidates)
  return result
}

const canonicalFieldOwnerTokens = new Set([
  'MediaAssetNameField',
  'DsAddPickerDialog',
  'DsCheckbox',
  'DsColorInput',
  'DsControlGroup',
  'DsDraftNumberField',
  'DsDraftNumberInput',
  'DsDraftTextArea',
  'DsDraftTextAreaField',
  'DsDraftTextField',
  'DsDraftTextInput',
  'DsField',
  'DsFieldGroup',
  'DsFileInput',
  'DsFilePicker',
  'DsMultiSelect',
  'DsNumberField',
  'DsNumberInput',
  'DsPropertyRow',
  'DsRadioGroup',
  'DsRangeInput',
  'DsReadonlyValue',
  'DsReadoutList',
  'DsRepeatRow',
  'DsSelect',
  'DsSelectField',
  'DsSwitch',
  'DsTextArea',
  'DsTextAreaField',
  'DsTextField',
  'DsTextInput',
])

function isFieldOwnerToken(token) {
  return canonicalFieldOwnerTokens.has(token)
}

function fieldOwnerTokenForTag(tag) {
  if (tag === 'DsPropertyGrid' || tag === 'DsPropertyRow') return 'DsPropertyRow'
  if (tag === 'DsReadoutList' || tag === 'DsReadoutRow') return 'DsReadoutList'
  return isFieldOwnerToken(tag) ? tag : undefined
}

function hasCanonicalNamedImport(source, localName, exportedName, moduleSpecifier) {
  return source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleSpecifier &&
      (statement.importClause?.namedBindings?.elements ?? []).some(
        (element) =>
          element.name.text === localName &&
          (element.propertyName?.text ?? element.name.text) === exportedName,
      ),
  )
}

function directConstDeclaration(body, predicate) {
  if (!body || !ts.isBlock(body)) return undefined
  for (const statement of body.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    )
      continue
    for (const declaration of statement.declarationList.declarations)
      if (predicate(declaration)) return declaration
  }
  return undefined
}

function objectBindingOwnsName(pattern, name) {
  return pattern.elements.some(
    (element) =>
      !element.dotDotDotToken &&
      ts.isIdentifier(element.name) &&
      element.name.text === name &&
      (!element.propertyName || element.propertyName.getText() === name),
  )
}

function objectBindingMapsName(pattern, propertyName, localName) {
  return pattern.elements.some(
    (element) =>
      !element.dotDotDotToken &&
      ts.isIdentifier(element.name) &&
      element.name.text === localName &&
      (element.propertyName?.getText() ?? element.name.text) === propertyName,
  )
}

function objectBindingOwnsRest(pattern, name) {
  return pattern.elements.some(
    (element) =>
      Boolean(element.dotDotDotToken) &&
      ts.isIdentifier(element.name) &&
      element.name.text === name,
  )
}

function projectPageDispatchRoots(sourceOverride) {
  const sourcePath = 'ProjectWorkbenchTab.tsx'
  const source = ts.createSourceFile(
    sourcePath,
    sourceOverride ?? readFileSync(join(uiRoot, sourcePath), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const functions = namedFunctionBodies(source)
  const topLevelDefinitions = topLevelFunctionDefinitions(source)
  const scopedDefinitions = scopedFunctionDefinitions(source)
  const body = functions.get('ProjectWorkbenchTab')
  if (!body || !ts.isBlock(body)) throw new Error('ProjectWorkbenchTab must be a named function')
  const roots = new Map()
  const register = (page, tag) => {
    if (roots.has(page))
      throw new Error(`ProjectWorkbenchTab.tsx has multiple top-level routes for ${page}`)
    roots.set(page, tag)
  }
  const returnedTag = (statement) => {
    const expression = ts.isReturnStatement(statement)
      ? unwrapExpression(statement.expression)
      : ts.isBlock(statement)
        ? unwrapExpression(statement.statements.find(ts.isReturnStatement)?.expression)
        : undefined
    if (expression && (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression))) {
      const opening = ts.isJsxElement(expression) ? expression.openingElement : expression
      const tag = opening.tagName.getText(source)
      const canonical = topLevelDefinitions.get(tag)
      const resolved = resolveScopedFunctionAt(scopedDefinitions, tag, opening)
      if (!canonical || !resolved || canonical.declaration !== resolved.declaration)
        throw new Error(
          `ProjectWorkbenchTab.tsx route ${tag} must resolve to its canonical top-level page`,
        )
      return tag
    }
    return undefined
  }
  for (const [index, statement] of body.statements.entries()) {
    if (ts.isIfStatement(statement) && ts.isBinaryExpression(statement.expression)) {
      const { left, right, operatorToken } = statement.expression
      if (
        operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken ||
        !ts.isPropertyAccessExpression(left) ||
        left.expression.getText(source) !== 'props' ||
        left.name.text !== 'page' ||
        !ts.isStringLiteral(right) ||
        !ts.isReturnStatement(statement.thenStatement)
      )
        throw new Error('ProjectWorkbenchTab.tsx has non-canonical top-level route control flow')
      const tag = returnedTag(statement.thenStatement)
      if (!tag)
        throw new Error(`ProjectWorkbenchTab.tsx route ${right.text} must directly return JSX`)
      register(right.text, tag)
      continue
    }
    if (ts.isReturnStatement(statement)) {
      const tag = returnedTag(statement)
      if (index !== body.statements.length - 1)
        throw new Error('ProjectWorkbenchTab.tsx fallback return must be the final statement')
      if (!tag)
        throw new Error('ProjectWorkbenchTab.tsx overview fallback must directly return JSX')
      register('overview', tag)
      continue
    }
    throw new Error('ProjectWorkbenchTab.tsx has non-canonical top-level dispatcher statements')
  }
  if (
    JSON.stringify([...roots.keys()]) !==
    JSON.stringify(['entrypoint', 'startup', 'advanced', 'overview'])
  )
    throw new Error(
      'ProjectWorkbenchTab.tsx must expose entrypoint/startup/advanced/overview routes',
    )
  return roots
}

function directWorkspaceKindLiteral(node, source) {
  const expression = unwrapExpression(node)
  if (
    expression &&
    ts.isBinaryExpression(expression) &&
    [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(
      expression.operatorToken.kind,
    )
  ) {
    if (
      ts.isPropertyAccessExpression(expression.left) &&
      expression.left.getText(source) === 'activeSubpage.kind' &&
      ts.isStringLiteral(expression.right)
    )
      return expression.right.text
    if (
      ts.isPropertyAccessExpression(expression.right) &&
      expression.right.getText(source) === 'activeSubpage.kind' &&
      ts.isStringLiteral(expression.left)
    )
      return expression.left.text
  }
  return undefined
}

function workspaceKindLiteral(node, source) {
  const expression = unwrapExpression(node)
  const direct = expression ? directWorkspaceKindLiteral(expression, source) : undefined
  if (direct) return direct
  if (
    !expression ||
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken
  )
    return undefined
  const leftKind = directWorkspaceKindLiteral(expression.left, source)
  const rightKind = directWorkspaceKindLiteral(expression.right, source)
  const kind = leftKind ?? rightKind
  const guard = unwrapExpression(leftKind ? expression.right : expression.left)
  if (!kind || (leftKind && rightKind) || !guard) return undefined
  const requiredGuard =
    kind === 'project'
      ? 'activeSubpage.projectPage'
      : kind === 'data'
        ? 'activeSubpage.dataPage'
        : undefined
  return requiredGuard && guard.getText(source) === requiredGuard ? kind : undefined
}

function returnedJsxOpening(expression) {
  const root = unwrapExpression(expression)
  if (root && ts.isJsxElement(root)) return root.openingElement
  if (root && ts.isJsxSelfClosingElement(root)) return root
  return undefined
}

function hasNonNestedExit(root) {
  if (
    ts.isFunctionDeclaration(root) ||
    ts.isFunctionExpression(root) ||
    ts.isArrowFunction(root) ||
    ts.isMethodDeclaration(root)
  )
    return false
  let found = false
  const visit = (node) => {
    if (found) return
    if (
      node !== root &&
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node))
    )
      return
    if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

function canonicalTopLevelReturnExpression(body, label, allowedExit, source) {
  if (!body || !ts.isBlock(body)) throw new Error(`${label} must use a block body`)
  const last = body.statements.at(-1)
  if (!last || !ts.isReturnStatement(last) || !last.expression)
    throw new Error(`${label} canonical rendered root must be the final top-level return`)
  const prefix = body.statements.slice(0, -1)
  for (const statement of prefix)
    if (hasNonNestedExit(statement) && !allowedExit?.(statement))
      throw new Error(`${label} has a non-continuing path before its canonical rendered root`)
  const prefixFlow = reachableRenderFlow(ts.factory.createBlock(prefix, true), new Map(), { source })
  if (!prefixFlow.canContinue || prefixFlow.hasNonRenderExit)
    throw new Error(`${label} has a non-continuing path before its canonical rendered root`)
  return last.expression
}

function jsxCallMetadata(node, source) {
  const attributes = new Map()
  const spreads = []
  for (const property of node.attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      spreads.push(property.expression.getText(source))
      continue
    }
    const name = property.name.getText(source)
    if (!property.initializer) attributes.set(name, 'true')
    else if (ts.isStringLiteral(property.initializer))
      attributes.set(name, JSON.stringify(property.initializer.text))
    else if (ts.isJsxExpression(property.initializer) && property.initializer.expression)
      attributes.set(name, property.initializer.expression.getText(source))
  }
  return { attributes, spreads }
}

function appWorkspaceDispatchRoots(overrides = {}) {
  const sourcePath = 'App.tsx'
  const source = ts.createSourceFile(
    sourcePath,
    overrides[sourcePath] ?? readFileSync(appPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const imports = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const specifier = statement.moduleSpecifier.text
    if (!specifier.startsWith('./') || !specifier.endsWith('.js')) continue
    const targetSource = `${specifier.slice(2, -3)}.tsx`
    if (!statSync(join(uiRoot, targetSource), { throwIfNoEntry: false })) continue
    for (const element of statement.importClause?.namedBindings?.elements ?? [])
      imports.set(element.name.text, {
        source: targetSource,
        component: element.propertyName?.text ?? element.name.text,
      })
  }
  const functions = namedFunctionBodies(source)
  const body = functions.get('App')
  if (!body) throw new Error('App.tsx must expose named App component')
  const scopedValues = scopedValueBindings(source)
  const activeSubpageDeclaration = directConstDeclaration(
    body,
    (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'activeSubpage',
  )
  const activeSubpageInitializer = unwrapExpression(activeSubpageDeclaration?.initializer)
  if (
    !activeSubpageDeclaration ||
    !activeSubpageInitializer ||
    !ts.isCallExpression(activeSubpageInitializer) ||
    !ts.isIdentifier(activeSubpageInitializer.expression) ||
    activeSubpageInitializer.expression.text !== 'editorSubpage' ||
    activeSubpageInitializer.arguments.length !== 1 ||
    activeSubpageInitializer.arguments[0]?.getText(source) !== 'location' ||
    !hasCanonicalNamedImport(
      source,
      'editorSubpage',
      'editorSubpage',
      './editor-navigation.js',
    ) ||
    hasVisibleLocalBinding(scopedValues, 'editorSubpage', activeSubpageInitializer)
  )
    throw new Error('App.tsx activeSubpage must come from canonical editorSubpage(location)')
  const missingTargetDeclaration = directConstDeclaration(
    body,
    (declaration) =>
      ts.isIdentifier(declaration.name) && declaration.name.text === 'objectTargetMissing',
  )
  const missingTargetInitializer = unwrapExpression(missingTargetDeclaration?.initializer)
  if (
    !missingTargetDeclaration ||
    !missingTargetInitializer ||
    !ts.isCallExpression(missingTargetInitializer) ||
    !ts.isIdentifier(missingTargetInitializer.expression) ||
    missingTargetInitializer.expression.text !== 'editorObjectTargetMissing' ||
    missingTargetInitializer.getText(source).replace(/\s+/g, ' ').trim() !==
      'editorObjectTargetMissing(state, location, scriptState?.sharedScripts)' ||
    !hasCanonicalNamedImport(
      source,
      'editorObjectTargetMissing',
      'editorObjectTargetMissing',
      './editor-target.js',
    ) ||
    hasVisibleLocalBinding(scopedValues, 'editorObjectTargetMissing', missingTargetInitializer)
  )
    throw new Error(
      'App.tsx objectTargetMissing must come from canonical editorObjectTargetMissing inputs',
    )
  const appSetupFlow = ts.isBlock(body)
    ? reachableRenderFlow(
        ts.factory.createBlock(body.statements.slice(0, -1), true),
        new Map(),
        { source },
      )
    : undefined
  if (
    appSetupFlow &&
    ['activeSubpage', 'objectTargetMissing', 'scene'].some((name) =>
      appSetupFlow.mutatedBindings.has(name),
    )
  )
    throw new Error('App.tsx must not mutate workspace route discriminators')
  const returned = canonicalTopLevelReturnExpression(body, 'App.tsx', (statement) => {
    if (
      !ts.isIfStatement(statement) ||
      statement.elseStatement ||
      statement.expression.getText(source).replace(/\s+/g, ' ') !==
        "!scene && activeSubpage.kind !== 'project'" ||
      !ts.isBlock(statement.thenStatement)
    )
      return false
    const branchStatements = statement.thenStatement.statements
    const branchReturn = branchStatements.at(-1)
    if (
      !branchReturn ||
      !ts.isReturnStatement(branchReturn) ||
      !returnedJsxOpening(branchReturn.expression)
    )
      return false
    return !branchStatements.slice(0, -1).some(hasNonNestedExit)
  }, source)
  const renderedRoot = unwrapExpression(returned)
  if (!renderedRoot || !ts.isJsxElement(renderedRoot))
    throw new Error('App.tsx rendered workspace root must be a JSX element')
  const bodySections = renderedRoot.children.filter((node) => {
    if (!ts.isJsxElement(node) || node.openingElement.tagName.getText(source) !== 'section')
      return false
    return jsxCallMetadata(node.openingElement, source).attributes.get('ref') === 'bodyRef'
  })
  if (bodySections.length !== 1)
    throw new Error(
      `App.tsx must render exactly one bodyRef workspace section; received ${bodySections.length}`,
    )
  const routeExpressions = bodySections[0].children
    .filter(ts.isJsxExpression)
    .map((child) => unwrapExpression(child.expression))
    .filter(
      (expression) =>
        expression &&
        ts.isConditionalExpression(expression) &&
        expression.condition.getText(source) === 'objectTargetMissing',
    )
  if (routeExpressions.length !== 1)
    throw new Error('App.tsx bodyRef section must contain one direct workspace route expression')
  const missingTargetGuard = routeExpressions[0]
  const candidateRoots = new Map()
  let current = unwrapExpression(missingTargetGuard.whenFalse)
  const routedKinds = []
  while (current && ts.isConditionalExpression(current)) {
    const kind = workspaceKindLiteral(current.condition, source)
    const opening = kind ? returnedJsxOpening(current.whenTrue) : undefined
    const tag = opening?.tagName.getText(source)
    const imported =
      tag && opening && !hasVisibleLocalBinding(scopedValues, tag, opening)
        ? imports.get(tag)
        : undefined
    if (!kind || !opening || !imported) break
    routedKinds.push(kind)
    candidateRoots.set(kind, { ...imported, routeCall: jsxCallMetadata(opening, source) })
    current = unwrapExpression(current.whenFalse)
  }
  if (JSON.stringify(routedKinds) !== JSON.stringify(['map', 'actor', 'project', 'data']))
    throw new Error('App.tsx has no canonical map/actor/project/data route chain')
  const routedChain = { roots: candidateRoots, sceneExpression: current }
  const roots = routedChain.roots
  roots.set('scene', {
    source: sourcePath,
    component: 'App',
    initialNode: routedChain.sceneExpression,
  })
  return roots
}

function directImportedRenderTargets(root, overrides = {}) {
  const content = overrides[root.source] ?? readFileSync(join(uiRoot, root.source), 'utf8')
  const source = ts.createSourceFile(
    root.source,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const imports = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const specifier = statement.moduleSpecifier.text
    if (!specifier.startsWith('./') || !specifier.endsWith('.js')) continue
    const targetSource = join(dirname(root.source), `${specifier.slice(2, -3)}.tsx`)
    if (!statSync(join(uiRoot, targetSource), { throwIfNoEntry: false })) continue
    if (statement.importClause?.name)
      imports.set(statement.importClause.name.text, {
        source: targetSource,
        component: 'default',
      })
    for (const element of statement.importClause?.namedBindings?.elements ?? [])
      imports.set(element.name.text, {
        source: targetSource,
        component: element.propertyName?.text ?? element.name.text,
      })
  }
  const definition = topLevelFunctionDefinitions(source).get(root.component)
  const body = definition?.body
  if (!body) throw new Error(`${root.source} has no named component ${root.component}`)
  const scopedValues = scopedValueBindings(source)
  const routeBindingName =
    root.component === 'ConnectedProjectWorkbench'
      ? 'page'
      : root.component === 'ConnectedDataMode'
        ? 'tab'
        : undefined
  const propsDeclaration = directConstDeclaration(
    body,
    (declaration) =>
      ts.isObjectBindingPattern(declaration.name) &&
      declaration.initializer?.getText(source) === 'props' &&
      objectBindingOwnsRest(declaration.name, 'staticProps') &&
      (!routeBindingName || objectBindingOwnsName(declaration.name, routeBindingName)),
  )
  if (
    !definition.parameters[0] ||
    !ts.isIdentifier(definition.parameters[0].name) ||
    definition.parameters[0].name.text !== 'props' ||
    !propsDeclaration
  )
    throw new Error(
      `${root.source}@${root.component} must derive staticProps${routeBindingName ? ` and ${routeBindingName}` : ''} from one canonical props destructure`,
    )
  const connectorSetupFlow = ts.isBlock(body)
    ? reachableRenderFlow(
        ts.factory.createBlock(body.statements.slice(0, -1), true),
        new Map(),
        { source },
      )
    : undefined
  if (
    connectorSetupFlow &&
    ['page', 'props', 'spriteDomain', 'tab'].some((name) =>
      connectorSetupFlow.mutatedBindings.has(name),
    )
  )
    throw new Error(`${root.source}@${root.component} mutates a forwarded route discriminator`)
  const targets = new Map()
  const returned = canonicalTopLevelReturnExpression(
    body,
    `${root.source}@${root.component}`,
    undefined,
    source,
  )
  const opening = returnedJsxOpening(returned)
  const tag = opening?.tagName.getText(source)
  const imported =
    opening && tag && !hasVisibleLocalBinding(scopedValues, tag, opening)
      ? imports.get(tag)
      : undefined
  if (opening) {
    const staticPropsSpread = opening.attributes.properties.find(
      (property) =>
        ts.isJsxSpreadAttribute(property) && property.expression.getText(source) === 'staticProps',
    )
    if (
      !staticPropsSpread ||
      resolveScopedValueAt(scopedValues, 'staticProps', staticPropsSpread)?.declaration !==
        propsDeclaration
    )
      throw new Error(`${root.source}@${root.component} must forward canonical staticProps`)
    if (routeBindingName) {
      const routeAttribute = opening.attributes.properties.find(
        (property) =>
          ts.isJsxAttribute(property) && property.name.getText(source) === routeBindingName,
      )
      const routeExpression =
        routeAttribute &&
        ts.isJsxAttribute(routeAttribute) &&
        ts.isJsxExpression(routeAttribute.initializer) &&
        routeAttribute.initializer.expression
      if (
        !routeExpression ||
        !ts.isIdentifier(routeExpression) ||
        routeExpression.text !== routeBindingName ||
        resolveScopedValueAt(scopedValues, routeBindingName, routeExpression)?.declaration !==
          propsDeclaration
      )
        throw new Error(
          routeBindingName === 'page'
            ? `${root.source}@${root.component} must forward page={page} to ProjectWorkbenchTab`
            : `${root.source}@${root.component} must forward tab={tab} to DataMode`,
        )
    }
  }
  if (opening && imported)
    targets.set(`${imported.source}@${imported.component}`, [
      { ...imported, ...jsxCallMetadata(opening, source) },
    ])
  return targets
}

const workspaceConnectorTargets = {
  actor: { source: 'ActorMode.tsx', component: 'ActorMode' },
  project: { source: 'ProjectWorkbenchTab.tsx', component: 'ProjectWorkbenchTab' },
  data: { source: 'DataMode.tsx', component: 'DataMode' },
}

export function validateWorkspaceConnectors(overrides = {}, workspaceRoots) {
  const problems = []
  let roots
  try {
    roots = workspaceRoots ?? appWorkspaceDispatchRoots(overrides)
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }
  for (const [kind, expected] of Object.entries(workspaceConnectorTargets)) {
    const root = roots.get(kind)
    if (!root) {
      problems.push(`App workspace connector missing for ${kind}`)
      continue
    }
    let targets
    try {
      targets = directImportedRenderTargets(root, overrides)
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
      continue
    }
    const identity = `${expected.source}@${expected.component}`
    const calls = targets.get(identity) ?? []
    if (calls.length !== 1)
      problems.push(
        `${root.source}@${root.component} must directly render exactly one canonical ${kind} dispatcher ${identity}; received ${calls.length}`,
      )
    const call = calls[0]
    if (!call?.spreads.includes('staticProps'))
      problems.push(
        `${root.source}@${root.component} must forward staticProps to canonical ${kind} dispatcher`,
      )
    if (kind === 'project' && call?.attributes.get('page') !== 'page')
      problems.push(
        `${root.source}@${root.component} must forward page={page} to ProjectWorkbenchTab`,
      )
    if (kind === 'data' && call?.attributes.get('tab') !== 'tab')
      problems.push(`${root.source}@${root.component} must forward tab={tab} to DataMode`)

    if (
      kind === 'project' &&
      root.routeCall?.attributes.get('page') !== 'activeSubpage.projectPage'
    )
      problems.push('App must pass page={activeSubpage.projectPage} to ConnectedProjectWorkbench')
    if (kind === 'data' && root.routeCall?.attributes.get('tab') !== 'activeSubpage.dataPage')
      problems.push('App must pass tab={activeSubpage.dataPage} to ConnectedDataMode')
  }
  return problems
}

function dataModeDispatchRoots(sourceOverride) {
  const source = ts.createSourceFile(
    'DataMode.tsx',
    sourceOverride ?? readFileSync(dataModePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const imports = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const module = statement.moduleSpecifier.text
    if (!module.startsWith('./') || !module.endsWith('.js')) continue
    for (const element of statement.importClause?.namedBindings?.elements ?? [])
      imports.set(element.name.text, `${module.slice(2, -3)}.tsx`)
  }
  const dispatched = new Map()
  const routeVariants = new Map()
  const definition = topLevelFunctionDefinitions(source).get('DataMode')
  const body = definition?.body
  if (!body) throw new Error('DataMode.tsx must expose named DataMode component')
  const scopedValues = scopedValueBindings(source)
  const propsDeclaration = directConstDeclaration(
    body,
    (declaration) =>
      ts.isObjectBindingPattern(declaration.name) &&
      declaration.initializer?.getText(source) === 'props' &&
      objectBindingOwnsName(declaration.name, 'tab') &&
      objectBindingMapsName(declaration.name, 'spriteDomain', 'controlledSpriteDomain'),
  )
  const spriteStateDeclaration = directConstDeclaration(
    body,
    (declaration) =>
      ts.isArrayBindingPattern(declaration.name) &&
      ts.isBindingElement(declaration.name.elements[0]) &&
      ts.isIdentifier(declaration.name.elements[0].name) &&
      declaration.name.elements[0].name.text === 'spriteDomain' &&
      ts.isBindingElement(declaration.name.elements[1]) &&
      ts.isIdentifier(declaration.name.elements[1].name) &&
      declaration.name.elements[1].name.text === 'setSpriteDomain',
  )
  const spriteStateInitializer = unwrapExpression(spriteStateDeclaration?.initializer)
  const spriteInitialState =
    spriteStateInitializer && ts.isCallExpression(spriteStateInitializer)
      ? spriteStateInitializer.arguments[0]
      : undefined
  const spriteInitialStateText = spriteInitialState?.getText(source) ?? ''
  if (
    !definition.parameters[0] ||
    !ts.isIdentifier(definition.parameters[0].name) ||
    definition.parameters[0].name.text !== 'props' ||
    !propsDeclaration ||
    !spriteStateDeclaration ||
    !spriteStateInitializer ||
    !ts.isCallExpression(spriteStateInitializer) ||
    !ts.isIdentifier(spriteStateInitializer.expression) ||
    spriteStateInitializer.expression.text !== 'useState' ||
    !hasCanonicalNamedImport(source, 'useState', 'useState', 'react') ||
    hasVisibleLocalBinding(scopedValues, 'useState', spriteStateInitializer) ||
    !['controlledSpriteDomain', 'focusObjectId', 'battleSprites', 'assetCatalog', "'battle'", "'world'"].every(
      (token) => spriteInitialStateText.includes(token),
    )
  )
    throw new Error(
      'DataMode.tsx tab and spriteDomain must come from canonical props/state bindings',
    )
  const canonicalRouteBinding = (name, usage) =>
    resolveScopedValueAt(scopedValues, name, usage)?.declaration ===
    (name === 'tab' ? propsDeclaration : spriteStateDeclaration)
  const directEquality = (node, identifier) => {
    const expression = unwrapExpression(node)
    if (
      expression &&
      ts.isBinaryExpression(expression) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(
        expression.operatorToken.kind,
      )
    ) {
      if (
        ts.isIdentifier(expression.left) &&
        expression.left.text === identifier &&
        ts.isStringLiteral(expression.right)
      )
        return canonicalRouteBinding(identifier, expression.left)
          ? expression.right.text
          : undefined
      if (
        ts.isIdentifier(expression.right) &&
        expression.right.text === identifier &&
        ts.isStringLiteral(expression.left)
      )
        return canonicalRouteBinding(identifier, expression.right)
          ? expression.left.text
          : undefined
    }
    return undefined
  }
  const routeCondition = (node) => {
    const expression = unwrapExpression(node)
    const tab = directEquality(expression, 'tab')
    if (tab) return { tab, variant: 'default' }
    if (
      !expression ||
      !ts.isBinaryExpression(expression) ||
      expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken
    )
      return undefined
    const leftTab = directEquality(expression.left, 'tab')
    const rightTab = directEquality(expression.right, 'tab')
    const routedTab = leftTab ?? rightTab
    const guard = leftTab ? expression.right : expression.left
    return routedTab === 'sprite' && directEquality(guard, 'spriteDomain') === 'battle'
      ? { tab: routedTab, variant: 'battle' }
      : undefined
  }
  const returnedComponent = (expression) => {
    const root = unwrapExpression(expression)
    if (root && (ts.isJsxElement(root) || ts.isJsxSelfClosingElement(root))) {
      const opening = ts.isJsxElement(root) ? root.openingElement : root
      const tag = opening.tagName.getText(source)
      const componentSource =
        /^[A-Z]/.test(tag) && !hasVisibleLocalBinding(scopedValues, tag, opening)
          ? imports.get(tag)
          : undefined
      return componentSource ? { source: componentSource, component: tag } : undefined
    }
    return undefined
  }
  let routingStarted = false
  let fallbackStarted = false
  const setupPrefix = []
  const fallbackPrefix = []
  const statements = ts.isBlock(body) ? body.statements : []
  for (const [index, node] of statements.entries()) {
    if (ts.isIfStatement(node)) {
      const route = routeCondition(node.expression)
      if (route) {
        if (fallbackStarted)
          throw new Error('DataMode.tsx route appears after fallback control flow')
        routingStarted = true
        const variants = routeVariants.get(route.tab) ?? new Set()
        if (variants.has(route.variant) || (route.tab !== 'sprite' && variants.size > 0))
          throw new Error(`DataMode.tsx has multiple top-level routes for ${route.tab}`)
        variants.add(route.variant)
        routeVariants.set(route.tab, variants)
        const roots = dispatched.get(route.tab) ?? new Map()
        const routeFlow = reachableRenderFlow(node.thenStatement, new Map(), { source })
        const returns = routeFlow.expressions.map(returnedComponent)
        for (const root of returns) if (root) roots.set(`${root.source}@${root.component}`, root)
        const expectedReturns = route.tab === 'scripts' ? 2 : 1
        if (
          routeFlow.canContinue ||
          routeFlow.hasNonRenderExit ||
          returns.length !== expectedReturns ||
          returns.filter(Boolean).length !== 1
        )
          throw new Error(
            `DataMode.tsx route ${route.tab}/${route.variant} must have ${expectedReturns} reachable return(s) and exactly one imported dispatcher`,
          )
        dispatched.set(route.tab, roots)
        continue
      }
    }
    if (routingStarted) {
      fallbackStarted = true
      if (ts.isReturnStatement(node)) {
        const fallback = unwrapExpression(node.expression)
        if (
          index !== statements.length - 1 ||
          !fallback ||
          (!ts.isJsxElement(fallback) &&
            !ts.isJsxSelfClosingElement(fallback) &&
            !ts.isJsxFragment(fallback))
        )
          throw new Error('DataMode.tsx fallback must be the final direct JSX return')
        continue
      }
      fallbackPrefix.push(node)
      const fallbackFlow = reachableRenderFlow(
        ts.factory.createBlock(fallbackPrefix, true),
        new Map(),
        { source },
      )
      if (
        !fallbackFlow.canContinue ||
        fallbackFlow.hasNonRenderExit ||
        fallbackFlow.returns.length
      )
        throw new Error('DataMode.tsx has non-continuing fallback setup')
      continue
    }
    setupPrefix.push(node)
    const setupFlow = reachableRenderFlow(
      ts.factory.createBlock(setupPrefix, true),
      new Map(),
      { source },
    )
    if (
      ['spriteDomain', 'tab'].some((name) => setupFlow.mutatedBindings.has(name))
    )
      throw new Error('DataMode.tsx mutates a route discriminator before canonical routes')
    if (!setupFlow.canContinue || setupFlow.hasNonRenderExit || setupFlow.returns.length)
      throw new Error('DataMode.tsx has non-continuing setup before canonical routes')
  }
  if (!fallbackStarted) throw new Error('DataMode.tsx must end with a canonical fallback return')
  return dispatched
}

function canonicalFieldRoots(registryEntry, projectRoots, dataRoots, workspaceRoots) {
  if (!registryEntry) return []
  if (registryEntry.projectPage) {
    const component = projectRoots.get(registryEntry.projectPage)
    return component ? [{ source: 'ProjectWorkbenchTab.tsx', component }] : []
  }
  if (registryEntry.kind === 'data' && registryEntry.dataPage)
    return [...(dataRoots.get(registryEntry.dataPage)?.values() ?? [])].sort((left, right) =>
      `${left.source}@${left.component}`.localeCompare(`${right.source}@${right.component}`),
    )
  const root = workspaceRoots.get(registryEntry.kind)
  return root ? [root] : []
}

function publicRoot(root) {
  return { source: root.source, component: root.component }
}

export function deriveFieldAdoptionTruth(overrides = {}) {
  const registry = registeredSubpages()
  const projectRoots = projectPageDispatchRoots(overrides['ProjectWorkbenchTab.tsx'])
  const dataRoots = dataModeDispatchRoots(overrides['DataMode.tsx'])
  const workspaceRoots = appWorkspaceDispatchRoots(overrides)
  const connectorProblems = validateWorkspaceConnectors(overrides, workspaceRoots)
  if (connectorProblems.length) throw new Error(connectorProblems.join('\n'))
  return Object.fromEntries(
    registry.map((entry) => {
      const roots = canonicalFieldRoots(entry, projectRoots, dataRoots, workspaceRoots)
      const owners = new Set()
      const ownerSources = new Set(roots.map((root) => root.source))
      for (const root of roots) {
        const reachable = cachedReachableJsxOwners(root.source, root.component, {
          initialNode: root.initialNode,
          overrides,
        })
        for (const tag of reachable.tags) {
          const owner = fieldOwnerTokenForTag(tag)
          if (owner) owners.add(owner)
        }
        for (const source of reachable.ownerSources) ownerSources.add(source)
      }
      return [
        entry.registry,
        {
          components: [...ownerSources].sort(),
          owners: [...owners].sort(),
          evidence: roots.map(publicRoot),
        },
      ]
    }),
  )
}

export function validateAdoption(document, overrides = {}) {
  const problems = []
  if (!document || document.version !== 2 || !Array.isArray(document.pages))
    return ['design-system-adoption.json must contain { version: 2, pages: [] }']
  let registry
  let dispatch
  let workspaceRoots
  let projectRoots
  try {
    registry = registeredSubpages(overrides['editor-navigation.ts'])
    dispatch = dataModeDispatchRoots(overrides['DataMode.tsx'])
    workspaceRoots = appWorkspaceDispatchRoots(overrides)
    projectRoots = projectPageDispatchRoots(overrides['ProjectWorkbenchTab.tsx'])
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }
  problems.push(...validateWorkspaceConnectors(overrides, workspaceRoots))
  const expected = new Map(registry.map((page) => [page.registry, page]))
  const actual = new Map()
  const ownerKeys = ['action', 'catalog', 'field', 'overlay', 'scroll']
  for (const [index, page] of document.pages.entries()) {
    if (!page || typeof page !== 'object') {
      problems.push(`pages[${index}] must be an object`)
      continue
    }
    if (typeof page.registry !== 'string' || !page.registry)
      problems.push(`pages[${index}].registry must be non-empty`)
    else if (actual.has(page.registry)) problems.push(`duplicate registry ${page.registry}`)
    else actual.set(page.registry, page)
    if (!['unadopted', 'partial', 'adopted', 'exception'].includes(page.status))
      problems.push(`pages[${index}].status is invalid`)
    if (!Array.isArray(page.components) || !page.components.length)
      problems.push(`pages[${index}].components must be non-empty`)
    else
      for (const component of page.components) {
        if (typeof component !== 'string' || !component.endsWith('.tsx'))
          problems.push(`pages[${index}] has invalid component ${String(component)}`)
        else if (!statSync(join(uiRoot, component), { throwIfNoEntry: false }))
          problems.push(`pages[${index}] component does not exist: ${component}`)
      }
    if (
      !page.owners ||
      JSON.stringify(Object.keys(page.owners).sort()) !== JSON.stringify(ownerKeys)
    )
      problems.push(`pages[${index}].owners must use exactly ${ownerKeys.join(', ')}`)
    else
      for (const key of ownerKeys)
        if (typeof page.owners[key] !== 'string' || !page.owners[key].trim())
          problems.push(`pages[${index}].owners.${key} must be non-empty`)
    if (page.owners && typeof page.owners.field === 'string') {
      const scopes = page.ownerEvidence?.field
      if (!Array.isArray(scopes) || !scopes.length)
        problems.push(`pages[${index}].ownerEvidence.field must be a non-empty array`)
      const validScopes = []
      for (const [scopeIndex, scope] of (Array.isArray(scopes) ? scopes : []).entries()) {
        if (
          !scope ||
          typeof scope !== 'object' ||
          JSON.stringify(Object.keys(scope).sort()) !== JSON.stringify(['component', 'source'])
        ) {
          problems.push(
            `pages[${index}].ownerEvidence.field[${scopeIndex}] must use exactly component, source`,
          )
          continue
        }
        validScopes.push(scope)
      }
      const registryEntry = expected.get(page.registry)
      const routedRoots = canonicalFieldRoots(registryEntry, projectRoots, dispatch, workspaceRoots)
      const expectedScopes = routedRoots.map(publicRoot)
      const scopeIdentity = (scope) => `${scope.source}@${scope.component}`
      if (
        JSON.stringify(validScopes.map(scopeIdentity).sort()) !==
        JSON.stringify(expectedScopes.map(scopeIdentity).sort())
      )
        problems.push(
          `${page.registry} field evidence must exactly match routed roots ${expectedScopes.map(scopeIdentity).join(', ') || '(missing)'}`,
        )

      const reachable = new Set()
      const ownerSources = new Set()
      const visitedSources = new Set()
      for (const root of routedRoots) {
        try {
          const result = cachedReachableJsxOwners(root.source, root.component, {
            initialNode: root.initialNode,
            overrides,
          })
          for (const tag of result.tags) reachable.add(tag)
          for (const source of result.ownerSources) ownerSources.add(source)
          for (const source of result.visitedSources) visitedSources.add(source)
        } catch (error) {
          problems.push(
            `${page.registry} routed field root invalid: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
      const registeredComponents = new Set(page.components ?? [])
      const requiredComponents = new Set([
        ...routedRoots.map((root) => root.source),
        ...ownerSources,
      ])
      for (const source of requiredComponents)
        if (!registeredComponents.has(source))
          problems.push(`${page.registry} routed field source is not registered: ${source}`)
      for (const source of registeredComponents)
        if (!visitedSources.has(source))
          problems.push(
            `${page.registry} component is not reachable from its routed roots: ${source}`,
          )

      const isNotApplicable = page.owners.field.startsWith('N/A:')
      if (isNotApplicable && !page.owners.field.slice('N/A:'.length).trim())
        problems.push(`${page.registry} field owner N/A must include an explanation`)
      const fieldOwnerTokens = isNotApplicable
        ? []
        : page.owners.field
            .split('+')
            .map((token) => token.trim())
            .filter(Boolean)
      if (!isNotApplicable && fieldOwnerTokens.length === 0)
        problems.push(
          `pages[${index}].owners.field must name a production JSX owner or use an explained N/A`,
        )
      for (const token of fieldOwnerTokens)
        if (!isFieldOwnerToken(token))
          problems.push(
            `${page.registry} field owner ${token} is not a governed field/control owner`,
          )
      for (const token of fieldOwnerTokens)
        if (![...reachable].some((tag) => fieldOwnerTokenForTag(tag) === token))
          problems.push(
            `${page.registry} field owner ${token} is not rendered by its routed field root`,
          )
      const renderedFieldOwners = new Set([...reachable].map(fieldOwnerTokenForTag).filter(Boolean))
      if (isNotApplicable && renderedFieldOwners.size)
        problems.push(
          `${page.registry} field owner is N/A but renders ${[...renderedFieldOwners].sort().join(', ')}`,
        )
      for (const token of renderedFieldOwners)
        if (!fieldOwnerTokens.includes(token))
          problems.push(`${page.registry} renders unregistered field/control owner ${token}`)
    }
  }
  for (const id of expected.keys())
    if (!actual.has(id)) problems.push(`registry page missing: ${id}`)
  for (const id of actual.keys()) if (!expected.has(id)) problems.push(`stale registry page: ${id}`)
  for (const { registry: registryId, kind, dataPage } of registry)
    if (kind === 'data' && dataPage && !dispatch.get(dataPage)?.size)
      problems.push(`DataMode has no component return for ${dataPage} (${registryId})`)
  for (const page of dispatch.keys())
    if (!registry.some((entry) => entry.kind === 'data' && entry.dataPage === page))
      problems.push(`DataMode dispatch is not registered: ${page}`)
  return problems
}

export function validateAllowlist(document) {
  const problems = []
  if (!document || document.version !== 1 || !Array.isArray(document.entries))
    return ['design-system-allowlist.json must contain { version: 1, entries: [] }']
  const seen = new Set()
  for (const [index, entry] of document.entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`entries[${index}] must be an object`)
      continue
    }
    const keys = Object.keys(entry).sort()
    if (JSON.stringify(keys) !== JSON.stringify(allowlistKeys))
      problems.push(`entries[${index}] must use exactly ${allowlistKeys.join(', ')}`)
    if (typeof entry.file !== 'string' || !entry.file.endsWith('.tsx'))
      problems.push(`entries[${index}].file must be a production .tsx path relative to src/ui`)
    if (!Number.isInteger(entry.line) || entry.line < 1)
      problems.push(`entries[${index}].line must be a positive integer`)
    if (typeof entry.rule !== 'string' || !entry.rule)
      problems.push(`entries[${index}].rule must be non-empty`)
    if (
      typeof entry.owner !== 'string' ||
      !/^(?:Codex|Kimi|GLM|card:[A-Z0-9-]+)$/.test(entry.owner)
    )
      problems.push(`entries[${index}].owner must name an Agent or card:ED-XXX`)
    for (const key of ['reason', 'verification', 'removalCondition'])
      if (typeof entry[key] !== 'string' || !entry[key].trim())
        problems.push(`entries[${index}].${key} must be non-empty`)
    const identity = `${entry.file}:${entry.line}:${entry.rule}`
    if (seen.has(identity)) problems.push(`duplicate allowlist identity ${identity}`)
    seen.add(identity)
  }
  return problems
}

export function evaluateAllowlist(document, violations) {
  const problems = validateAllowlist(document)
  if (problems.length) return { code: 2, active: [], unapproved: [], stale: [], problems }
  const allowlist = new Map(
    document.entries.map((entry) => [`${entry.file}:${entry.line}:${entry.rule}`, entry]),
  )
  const active = []
  const unapproved = []
  for (const violation of violations) {
    const identity = `${violation.file}:${violation.line}:${violation.rule}`
    if (allowlist.has(identity)) active.push(identity)
    else unapproved.push(violation)
  }
  const stale = [...allowlist.keys()].filter((identity) => !active.includes(identity))
  return {
    code: stale.length ? 2 : unapproved.length ? 1 : 0,
    active,
    unapproved,
    stale,
    problems: [],
  }
}

export function runDesignSystemGate() {
  const adoption = parseJson(adoptionPath)
  if (adoption.error) {
    console.error(`design-system adoption matrix invalid: ${adoption.error}`)
    return 2
  }
  const adoptionProblems = validateAdoption(adoption.value)
  if (adoptionProblems.length) {
    for (const problem of adoptionProblems) console.error(`adoption: ${problem}`)
    return 2
  }
  const parsed = parseJson(allowlistPath)
  if (parsed.error) {
    console.error(`design-system allowlist invalid: ${parsed.error}`)
    return 2
  }
  const result = evaluateAllowlist(parsed.value, collectViolations())
  if (result.problems.length) {
    for (const problem of result.problems) console.error(`allowlist: ${problem}`)
    return 2
  }
  if (result.stale.length) {
    for (const identity of result.stale) console.error(`allowlist stale: ${identity}`)
    return 2
  }
  if (result.unapproved.length) {
    for (const violation of result.unapproved)
      console.error(
        `${violation.file}:${violation.line}: ${violation.rule}: ${violation.found} -> design-system owner: ${violation.recommendation}`,
      )
    return 1
  }
  console.log(
    `design-system gate passed: ${productionSources().length} files, ${result.active.length} evidence-bound exceptions`,
  )
  return 0
}

export function printAdoptionMatrix() {
  const parsed = parseJson(adoptionPath)
  if (parsed.error) {
    console.error(`design-system adoption matrix invalid: ${parsed.error}`)
    return 2
  }
  const problems = validateAdoption(parsed.value)
  if (problems.length) {
    for (const problem of problems) console.error(`adoption: ${problem}`)
    return 2
  }
  console.log(JSON.stringify(parsed.value, null, 2))
  return 0
}
