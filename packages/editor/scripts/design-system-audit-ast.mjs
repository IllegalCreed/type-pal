import ts from 'typescript'

export function unwrapExpression(expression) {
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

export function jsxTag(node) {
  return node.tagName.getText()
}

export function jsxAttribute(node, name) {
  return node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

export function literalAttribute(node, name) {
  const initializer = jsxAttribute(node, name)?.initializer
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : undefined
}

export function classTokens(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (!initializer) return []
  return initializer
    .getText()
    .replace(/[{}'"`]/g, ' ')
    .split(/[^A-Za-z0-9_-]+/)
    .filter(Boolean)
}

export function literalClassTokens(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (
    !initializer ||
    (!ts.isStringLiteral(initializer) && !ts.isNoSubstitutionTemplateLiteral(initializer))
  )
    return []
  return initializer.text.split(/\s+/).filter(Boolean)
}

export function reachableClassTokens(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (!initializer) return []
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))
    return initializer.text.split(/\s+/).filter(Boolean)
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return []
  const tokens = new Set()
  const collect = (expression) => {
    const current = unwrapExpression(expression)
    if (!current) return
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      for (const token of current.text.split(/\s+/).filter(Boolean)) tokens.add(token)
      return
    }
    if (ts.isTemplateExpression(current)) {
      for (const token of current.head.text.split(/\s+/).filter(Boolean)) tokens.add(token)
      for (const span of current.templateSpans) {
        collect(span.expression)
        for (const token of span.literal.text.split(/\s+/).filter(Boolean)) tokens.add(token)
      }
      return
    }
    if (ts.isConditionalExpression(current)) {
      collect(current.whenTrue)
      collect(current.whenFalse)
      return
    }
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      collect(current.left)
      collect(current.right)
    }
  }
  collect(initializer.expression)
  return [...tokens]
}

export function reachableClassVariants(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (!initializer) return { truncated: false, variants: [[]] }
  let truncated = false
  const merge = (left, right) => {
    const values = []
    for (const prefix of left)
      for (const suffix of right) {
        values.push(`${prefix}${suffix}`)
        if (values.length > 32) {
          truncated = true
          return undefined
        }
      }
    return values
  }
  const resolve = (expression) => {
    const current = unwrapExpression(expression)
    if (!current) return ['']
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
      return [current.text]
    if (ts.isNumericLiteral(current)) return [current.text]
    if (
      current.kind === ts.SyntaxKind.FalseKeyword ||
      current.kind === ts.SyntaxKind.NullKeyword ||
      (ts.isIdentifier(current) && current.text === 'undefined')
    )
      return ['']
    if (ts.isConditionalExpression(current)) {
      const whenTrue = resolve(current.whenTrue)
      const whenFalse = resolve(current.whenFalse)
      return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : undefined
    }
    if (ts.isBinaryExpression(current)) {
      if (current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = resolve(current.left)
        const right = resolve(current.right)
        return left && right ? merge(left, right) : undefined
      }
      if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const right = resolve(current.right)
        return right ? ['', ...right] : undefined
      }
      if (
        current.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        const left = resolve(current.left)
        const right = resolve(current.right)
        return left && right ? [...left, ...right] : undefined
      }
    }
    if (ts.isTemplateExpression(current)) {
      let values = [current.head.text]
      for (const span of current.templateSpans) {
        const expressions = resolve(span.expression)
        if (!expressions) return undefined
        const withExpression = merge(values, expressions)
        if (!withExpression) return undefined
        const withLiteral = merge(withExpression, [span.literal.text])
        if (!withLiteral) return undefined
        values = withLiteral
      }
      return values
    }
    return undefined
  }
  const values = ts.isStringLiteral(initializer)
    ? [initializer.text]
    : ts.isJsxExpression(initializer)
      ? resolve(initializer.expression)
      : undefined
  if (!values) return { truncated, variants: [reachableClassTokens(node)] }
  const unique = new Map()
  for (const value of values) {
    const tokens = value.split(/\s+/).filter(Boolean)
    unique.set([...tokens].sort().join('.'), tokens)
  }
  return { truncated, variants: [...unique.values()] }
}

export function reachableStaticAttributes(node) {
  const attributes = {}
  for (const property of node.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue
    const name = property.name.getText()
    if (name === 'className') continue
    if (!property.initializer) {
      attributes[name] = ''
      continue
    }
    if (ts.isStringLiteral(property.initializer)) {
      attributes[name] = property.initializer.text
      continue
    }
    if (!ts.isJsxExpression(property.initializer) || !property.initializer.expression) continue
    const expression = unwrapExpression(property.initializer.expression)
    if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression))
      attributes[name] = expression.text
    else if (expression.kind === ts.SyntaxKind.TrueKeyword) attributes[name] = ''
    else if (expression.kind === ts.SyntaxKind.FalseKeyword) continue
  }
  return attributes
}

export function reachableAttributeNames(node) {
  return node.attributes.properties
    .filter(ts.isJsxAttribute)
    .map((property) => property.name.getText())
    .sort()
}

const inlineScrollStyleProperties = new Map([
  ['blockSize', 'block-size'],
  ['height', 'height'],
  ['maxBlockSize', 'max-block-size'],
  ['maxHeight', 'max-height'],
  ['overflow', 'overflow'],
  ['overflowX', 'overflow-x'],
  ['overflowY', 'overflow-y'],
])

export function inlineScrollStyle(node) {
  const initializer = jsxAttribute(node, 'style')?.initializer
  if (!initializer) return { declarations: [], uncertain: false }
  if (!ts.isJsxExpression(initializer) || !initializer.expression)
    return { declarations: [], uncertain: true }
  const expression = unwrapExpression(initializer.expression)
  if (!expression || !ts.isObjectLiteralExpression(expression))
    return { declarations: [], uncertain: true }
  const declarations = []
  let uncertain = false
  for (const property of expression.properties) {
    if (ts.isSpreadAssignment(property)) {
      uncertain = true
      continue
    }
    if (!('name' in property) || !property.name) {
      uncertain = true
      continue
    }
    const name = unwrapExpression(property.name)
    const propertyName =
      ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : undefined
    if (propertyName === undefined) {
      uncertain = true
      continue
    }
    const cssProperty = inlineScrollStyleProperties.get(propertyName)
    if (!cssProperty) continue
    if (!ts.isPropertyAssignment(property)) {
      uncertain = true
      continue
    }
    const value = unwrapExpression(property.initializer)
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      declarations.push({ property: cssProperty, value: value.text })
      continue
    }
    if (ts.isNumericLiteral(value)) {
      const numeric = Number(value.text)
      declarations.push({
        property: cssProperty,
        value:
          cssProperty.includes('height') || cssProperty.includes('size')
            ? numeric === 0
              ? '0'
              : `${numeric}px`
            : value.text,
      })
      continue
    }
    uncertain = true
  }
  return { declarations, uncertain }
}

export function intrinsicClassSelector(node) {
  const tag = jsxTag(node)
  const classes = literalClassTokens(node)
  return /^[a-z]/.test(tag) && classes.length ? `${tag}.${classes.join('.')}` : undefined
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

export function isStaticStyle(node) {
  const initializer = jsxAttribute(node, 'style')?.initializer
  if (!initializer || !ts.isJsxExpression(initializer)) return false
  const expression = initializer.expression
  if (!expression || !ts.isObjectLiteralExpression(expression) || !expression.properties.length)
    return false
  return expression.properties.every(
    (property) => ts.isPropertyAssignment(property) && isStaticLiteral(property.initializer),
  )
}

export function shortFound(node, source) {
  return node.getText(source).split('\n')[0].trim().slice(0, 96)
}

const jsxElementFactsCache = new WeakMap()

export function jsxElementFacts(node) {
  const cached = jsxElementFactsCache.get(node)
  if (cached) return cached
  const classVariantAnalysis = reachableClassVariants(node)
  const facts = {
    attributes: reachableStaticAttributes(node),
    attributeNames: reachableAttributeNames(node),
    classes: reachableClassTokens(node),
    classVariants: classVariantAnalysis.variants,
    classVariantsTruncated: classVariantAnalysis.truncated,
    inlineScrollStyle: inlineScrollStyle(node),
  }
  jsxElementFactsCache.set(node, facts)
  return facts
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

export function topLevelFunctionDefinitions(source) {
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

export function scopedFunctionDefinitions(source) {
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

export function resolveScopedFunctionAt(definitions, name, usage) {
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
          (alias) => sameLexicalScope(alias.scope, scope) && alias.declaration.pos <= usage.pos,
        )
        .sort((left, right) => right.declaration.pos - left.declaration.pos)
      if (visible[0]) return visible[0]
    }
    scope = scope.parent
  }
  return undefined
}

export function scopedValueBindings(source) {
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
    else if (ts.isClassDeclaration(node) && node.name) addNames(node.name, nearestScope(node), node)
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

export function cachedScopedFunctions(source) {
  if (!scopedFunctionCache.has(source))
    scopedFunctionCache.set(source, scopedFunctionDefinitions(source))
  return scopedFunctionCache.get(source)
}

export function cachedScopedAliases(source) {
  if (!scopedAliasCache.has(source))
    scopedAliasCache.set(source, scopedConstIdentifierAliases(source))
  return scopedAliasCache.get(source)
}

export function cachedScopedValues(source) {
  if (!scopedValueCache.has(source)) scopedValueCache.set(source, scopedValueBindings(source))
  return scopedValueCache.get(source)
}

export function hasVisibleLocalBinding(bindings, name, usage) {
  return Boolean(resolveScopedValueAt(bindings, name, usage))
}

export function resolveScopedValueAt(bindings, name, usage) {
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

export function namedFunctionBodies(source) {
  return new Map(
    [...topLevelFunctionDefinitions(source)].map(([name, definition]) => [name, definition.body]),
  )
}

export function namedFunctionParameters(source) {
  return new Map(
    [...topLevelFunctionDefinitions(source)].map(([name, definition]) => [
      name,
      definition.parameters,
    ]),
  )
}

export const staticUnknown = Symbol('static-unknown')
export const staticUndefinedExpression = ts.factory.createIdentifier('undefined')

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
      if (ts.isPropertyAssignment(property))
        return { known: true, expression: property.initializer }
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
    const sourceName =
      element.propertyName?.getText() ??
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

export function staticPrimitiveValue(expression, bindings, resolving = new Set()) {
  const current = unwrapExpression(expression)
  if (!current) return staticUnknown
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    const base = unwrapExpression(current.expression)
    const key = ts.isPropertyAccessExpression(current)
      ? current.name.text
      : (() => {
          const argument = unwrapExpression(current.argumentExpression)
          return argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument))
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
    const directKey =
      base && ts.isIdentifier(base) && key !== undefined ? `${base.text}.${key}` : ''
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
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text
    for (const span of current.templateSpans) {
      const expressionValue = staticPrimitiveValue(span.expression, bindings, resolving)
      if (expressionValue === staticUnknown) return staticUnknown
      value += String(expressionValue) + span.literal.text
    }
    return value
  }
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
    if (current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const right = staticPrimitiveValue(current.right, bindings, resolving)
      if (left === staticUnknown || right === staticUnknown) return staticUnknown
      return typeof left === 'string' || typeof right === 'string'
        ? String(left) + String(right)
        : Number(left) + Number(right)
    }
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

export function staticBooleanValue(expression, bindings, resolving = new Set()) {
  const value = staticPrimitiveValue(expression, bindings, resolving)
  return value === staticUnknown ? undefined : Boolean(value)
}

export function reachableRenderFlow(body, initialBindings = new Map(), options = {}) {
  const returns = []
  let completedReturns = 0
  let hasNonRenderExit = false
  const source = options.source
  const scopedFunctions =
    options.scopedFunctions ?? (source ? cachedScopedFunctions(source) : new Map())
  const scopedAliases = options.scopedAliases ?? (source ? cachedScopedAliases(source) : new Map())
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
        (statement.elseStatement ? hasReachableLoopBreak(statement.elseStatement, bindings) : false)
      )
    }
    if (ts.isTryStatement(statement))
      return (
        hasReachableLoopBreak(statement.tryBlock, bindings) ||
        (statement.catchClause
          ? hasReachableLoopBreak(statement.catchClause.block, bindings)
          : false) ||
        (statement.finallyBlock ? hasReachableLoopBreak(statement.finallyBlock, bindings) : false)
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
    if (ts.isDeleteExpression(current)) invalidateBinding(bindingRoot(current.expression), bindings)
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
        if (declaration.initializer && !executeReachableCalls(declaration.initializer, bindings))
          return false
        if (declaration.initializer && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0)
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
      const pathStarts = new Set()
      for (const [start] of clauses.entries()) {
        let firstExecutable = start
        while (firstExecutable < clauses.length && clauses[firstExecutable].statements.length === 0)
          firstExecutable += 1
        pathStarts.add(firstExecutable)
      }
      for (const start of pathStarts) {
        if (start === clauses.length) {
          canContinue = true
          continue
        }
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
          if (
            !pathContinues ||
            clause.statements.some((child) => ts.isBreakStatement(child) && !child.label)
          )
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
        ts.isWhileStatement(statement) || ts.isDoStatement(statement)
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
      : (() => {
          if (!executeReachableCalls(body, new Map(initialBindings))) return false
          returns.push({ expression: body, bindings: new Map(initialBindings) })
          completedReturns += 1
          return false
        })()
  return {
    returns,
    expressions: returns.map((entry) => entry.expression),
    completedReturns,
    canContinue,
    hasNonRenderExit,
    mutatedBindings,
  }
}
