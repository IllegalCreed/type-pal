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

const navigationActionWords = /(?:打开|查看|预览|跳转|定位|管理|编辑|引用)/

/** Standard navigation actions use DsIcon(open); directional controls may still use arrow glyphs. */
export function isEmbeddedNavigationGlyphAction(tag, sourceText) {
  return (
    (tag === 'DsButton' || tag === 'DsActionLink') &&
    sourceText.includes('↗') &&
    navigationActionWords.test(sourceText)
  )
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
    const visit = (node) => {
      if (ts.isJsxElement(node)) {
        const tag = jsxTag(node.openingElement)
        if (isEmbeddedNavigationGlyphAction(tag, node.getText(source)))
          add(
            path,
            source,
            node.openingElement,
            'embedded-navigation-glyph',
            'use icon="open" with plain action text; do not encode navigation icons in the label',
          )
      }
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

function registeredSubpages() {
  const source = ts.createSourceFile(
    navigationPath,
    readFileSync(navigationPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let modules
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'EDITOR_MODULES')
      modules = unwrapExpression(node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(source)
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
      return [{ registry: `${moduleId}/${id}`, dataPage: stringProperty(subpage, 'dataPage') }]
    })
  })
}

function dataModeDispatchFiles() {
  const source = ts.createSourceFile(
    dataModePath,
    readFileSync(dataModePath, 'utf8'),
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
  const tabLiteral = (node) => {
    if (!node) return undefined
    if (
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(
        node.operatorToken.kind,
      )
    ) {
      if (ts.isIdentifier(node.left) && node.left.text === 'tab' && ts.isStringLiteral(node.right))
        return node.right.text
      if (ts.isIdentifier(node.right) && node.right.text === 'tab' && ts.isStringLiteral(node.left))
        return node.left.text
    }
    let found
    ts.forEachChild(node, (child) => {
      found ??= tabLiteral(child)
    })
    return found
  }
  const returnedComponent = (expression) => {
    const root = unwrapExpression(expression)
    if (root && (ts.isJsxElement(root) || ts.isJsxSelfClosingElement(root))) {
      const tag = ts.isJsxElement(root)
        ? root.openingElement.tagName.getText(source)
        : root.tagName.getText(source)
      return /^[A-Z]/.test(tag) ? imports.get(tag) : undefined
    }
    return undefined
  }
  const visit = (node) => {
    if (ts.isIfStatement(node)) {
      const page = tabLiteral(node.expression)
      if (page) {
        const files = dispatched.get(page) ?? new Set()
        const collectReturns = (child) => {
          if (ts.isReturnStatement(child)) {
            const file = returnedComponent(child.expression)
            if (file) files.add(file)
          } else ts.forEachChild(child, collectReturns)
        }
        collectReturns(node.thenStatement)
        dispatched.set(page, files)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return dispatched
}

export function validateAdoption(document) {
  const problems = []
  if (!document || document.version !== 1 || !Array.isArray(document.pages))
    return ['design-system-adoption.json must contain { version: 1, pages: [] }']
  let registry
  let dispatch
  try {
    registry = registeredSubpages()
    dispatch = dataModeDispatchFiles()
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }
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
  }
  for (const id of expected.keys())
    if (!actual.has(id)) problems.push(`registry page missing: ${id}`)
  for (const id of actual.keys()) if (!expected.has(id)) problems.push(`stale registry page: ${id}`)
  for (const { registry: registryId, dataPage } of registry) {
    if (!dataPage) continue
    const files = dispatch.get(dataPage)
    if (!files?.size) {
      problems.push(`DataMode has no component return for ${dataPage} (${registryId})`)
      continue
    }
    const components = new Set(actual.get(registryId)?.components ?? [])
    for (const file of files)
      if (!components.has(file))
        problems.push(`DataMode return ${file} missing from ${registryId} components`)
  }
  for (const page of dispatch.keys())
    if (!registry.some((entry) => entry.dataPage === page))
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
