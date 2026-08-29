import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import Specificity from '@bramus/specificity'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = join(packageRoot, '../..')
const uiRoot = join(packageRoot, 'src/ui')
const allowlistPath = join(uiRoot, 'design-system/design-system-allowlist.json')
const adoptionPath = join(uiRoot, 'design-system/design-system-adoption.json')
const effectCardAdoptionPath = join(uiRoot, 'design-system/effect-card-adoption.json')
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

function effectCardSource(name, overrides) {
  return overrides[name] ?? readFileSync(join(uiRoot, name), 'utf8')
}

function effectKindConstant(source, constantName, property) {
  const match = source.match(
    new RegExp(`const\\s+${constantName}\\s*:[^=]+?=\\s*\\[([\\s\\S]*?)\\n\\]`),
  )
  if (!match) return undefined
  return [...match[1].matchAll(new RegExp(`\\b${property}\\s*:\\s*['\"]([^'\"]+)['\"]`, 'g'))]
    .map((entry) => entry[1])
}

function effectKindsForFamily(id, source) {
  if (id === 'item/use-effects') return effectKindConstant(source, 'EFFECT_KINDS', 'value')
  if (id === 'item/throw-effects')
    return effectKindConstant(source, 'THROW_EFFECT_KINDS', 'value')
  if (id === 'item/equipment-effects') return effectKindConstant(source, 'EFFECT_KINDS', 'v')
  if (id === 'skill/base-effects' || id === 'skill/execution-effects')
    return effectKindConstant(source, 'EFFECT_KINDS', 'v')
  if (id === 'actor/casualty-effects') {
    const typeOptions = source.match(
      /aria-label=\{`第 \$\{index \+ 1\} 个效果类型`\}[\s\S]*?options=\{\[([\s\S]*?)\]\}/,
    )
    return typeOptions
      ? [...typeOptions[1].matchAll(/\bvalue\s*:\s*['\"]([^'\"]+)['\"]/g)].map(
          (entry) => entry[1],
        )
      : undefined
  }
  return undefined
}

function escapedEffectCardId(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function effectCardChainBlocks(source, id) {
  return [
    ...source.matchAll(
      new RegExp(
        `<EffectEditorChain\\b(?=[^>]*\\bfamily=['\"]${escapedEffectCardId(id)}['\"])[^>]*>[\\s\\S]*?<\\/EffectEditorChain>`,
        'g',
      ),
    ),
  ].map((match) => match[0])
}

const effectCardIdentityPatterns = {
  'actor/casualty-effects':
    /useDsReorderKeys\(\s*branch\.effects\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
  'item/equipment-effects':
    /useDsReorderKeys\(\s*equip\?\.effects\s*\?\?\s*\[\]\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
  'item/throw-effects':
    /useDsReorderKeys\(\s*spec\.effects\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
  'item/use-effects':
    /useDsReorderKeys\(\s*use\.effects\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
  'skill/base-effects':
    /useDsReorderKeys\(\s*skill\?\.effects\s*\?\?\s*\[\]\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
  'skill/execution-effects':
    /useDsReorderKeys\(\s*effects\s*,\s*\(effect\)\s*=>\s*JSON\.stringify\(effect\)/,
}

const effectCardRemovalMarkers = {
  'actor/casualty-effects': 'effectReorderKeys.remove(index)',
  'item/equipment-effects': 'equipEffectReorderKeys.remove(index)',
  'item/throw-effects': 'reorderKeys.remove(index)',
  'item/use-effects': 'reorderKeys.remove(index)',
  'skill/base-effects': 'effectReorderKeys.remove(i)',
  'skill/execution-effects': 'reorderKeys.remove(index)',
}

/** Route-live effect-card census used by both Vitest and the command-line design-system gate. */
export function validateEffectCardAdoption(document, overrides = {}) {
  const problems = []
  if (
    !document ||
    document.version !== 1 ||
    document.owner !== 'EffectEditorCard' ||
    !Array.isArray(document.families)
  )
    return [
      'effect-card-adoption.json must contain { version: 1, owner: "EffectEditorCard", families: [] }',
    ]

  const familyKeys = [
    'density',
    'fieldsLayout',
    'id',
    'kinds',
    'previewKinds',
    'privateBranch',
    'source',
    'verification',
  ].sort()
  const allowedDensities = new Set(['default', 'compact'])
  const allowedLayouts = new Set(['item', 'skill', 'equipment', 'casualty'])
  const manifestIds = new Set()
  for (const [index, family] of document.families.entries()) {
    if (!family || typeof family !== 'object') {
      problems.push(`effect-card families[${index}] must be an object`)
      continue
    }
    if (JSON.stringify(Object.keys(family).sort()) !== JSON.stringify(familyKeys))
      problems.push(`effect-card families[${index}] must use exactly ${familyKeys.join(', ')}`)
    if (typeof family.id !== 'string' || !family.id.endsWith('-effects'))
      problems.push(`effect-card families[${index}].id must be a static *-effects adoption id`)
    if (manifestIds.has(family.id)) problems.push(`duplicate effect-card family ${family.id}`)
    manifestIds.add(family.id)
    if (typeof family.source !== 'string' || !family.source.endsWith('.tsx'))
      problems.push(`effect-card ${family.id} source must be a production TSX basename`)
    if (!allowedDensities.has(family.density))
      problems.push(`effect-card ${family.id} has invalid density ${family.density}`)
    if (!allowedLayouts.has(family.fieldsLayout))
      problems.push(`effect-card ${family.id} has invalid fieldsLayout ${family.fieldsLayout}`)
    if (!Array.isArray(family.kinds) || family.kinds.length === 0)
      problems.push(`effect-card ${family.id} must enumerate its effect kinds`)
    if (!Array.isArray(family.previewKinds))
      problems.push(`effect-card ${family.id} previewKinds must be an array`)
    if (typeof family.privateBranch !== 'boolean')
      problems.push(`effect-card ${family.id} privateBranch must be boolean`)
    if (typeof family.verification !== 'string' || !family.verification.trim())
      problems.push(`effect-card ${family.id} verification must be non-empty`)
    if (new Set(family.kinds).size !== family.kinds.length)
      problems.push(`effect-card ${family.id} contains duplicate kinds`)
  }

  const actualAdoption = new Map()
  const actualChains = new Map()
  const addOccurrence = (registry, id, sourceName) => {
    registry.set(id, [...(registry.get(id) ?? []), sourceName])
  }
  for (const path of productionSources()) {
    const sourceName = relative(uiRoot, path)
    const source = effectCardSource(sourceName, overrides)
    for (const match of source.matchAll(/adoptionId=['\"]([^'\"]+-effects)['\"]/g))
      addOccurrence(actualAdoption, match[1], sourceName)
    for (const match of source.matchAll(/<EffectEditorChain\b[\s\S]*?family=['\"]([^'\"]+)['\"]/g))
      addOccurrence(actualChains, match[1], sourceName)
  }
  for (const [id, sources] of actualAdoption) {
    if (!manifestIds.has(id)) problems.push(`unregistered route-live effect-card family ${id}`)
    if (sources.length !== 1)
      problems.push(`effect-card family ${id} must have exactly one reorder adoption owner`)
  }
  for (const id of manifestIds) {
    if (!actualAdoption.has(id)) problems.push(`stale effect-card family ${id}`)
    if (!actualChains.has(id)) problems.push(`effect-card family ${id} has no EffectEditorChain owner`)
    if ((actualChains.get(id) ?? []).length !== 1)
      problems.push(`effect-card family ${id} must have exactly one EffectEditorChain owner`)
  }
  for (const id of actualChains.keys()) {
    if (!actualAdoption.has(id)) problems.push(`EffectEditorChain ${id} has no reorder adoption id`)
  }

  for (const family of document.families) {
    if (!family || typeof family.source !== 'string') continue
    const source = effectCardSource(family.source, overrides)
    const chainBlocks = effectCardChainBlocks(source, family.id)
    const chain = chainBlocks[0] ?? ''
    if (!/import\s*\{[\s\S]*?\bEffectEditorCard\b[\s\S]*?\bEffectEditorChain\b[\s\S]*?\}\s*from\s*['\"]\.\/EffectEditorCard\.js['\"]/.test(source))
      problems.push(`${family.id} must import the canonical EffectEditorCard and EffectEditorChain`)
    if (chainBlocks.length !== 1)
      problems.push(`${family.id} must own exactly one statically scoped EffectEditorChain`)
    if (!chain.includes(`adoptionId="${family.id}"`))
      problems.push(`${family.id} is not the declared DsReorderCollection adoption owner`)
    if (!chain.includes('<EffectEditorCard'))
      problems.push(`${family.id} has no route-live EffectEditorCard item owner`)
    if (
      !/<EffectEditorCard\b(?=[\s\S]{0,240}?\bkey=\{reorderKey\})(?=[\s\S]{0,240}?\bitemKey=\{reorderKey\})/.test(
        chain,
      )
    )
      problems.push(`${family.id} must bind each card to its stable reorderKey`)
    if (!chain.includes(`density="${family.density}"`))
      problems.push(`${family.id} does not consume its declared ${family.density} density`)
    if (!chain.includes(`fieldsLayout="${family.fieldsLayout}"`))
      problems.push(`${family.id} does not consume fieldsLayout ${family.fieldsLayout}`)
    if (!effectCardIdentityPatterns[family.id]?.test(source))
      problems.push(`${family.id} must derive reorder tokens from serializable effect identity`)
    if (!chain.includes(effectCardRemovalMarkers[family.id]))
      problems.push(`${family.id} must remove its occurrence token before deleting a card`)
    const actualKinds = effectKindsForFamily(family.id, source)
    if (!actualKinds)
      problems.push(`${family.id} kind census could not be derived from ${family.source}`)
    else if (JSON.stringify(actualKinds) !== JSON.stringify(family.kinds))
      problems.push(`${family.id} kind census differs from its route-live source`)
    for (const previewKind of family.previewKinds ?? [])
      if (!family.kinds.includes(previewKind) || !source.includes(`effect.kind === '${previewKind}'`))
        problems.push(`${family.id} preview kind ${previewKind} is not route-live`)
    if (
      family.privateBranch &&
      (!chain.includes("effectKind={privateScript ? 'author-private-script'") ||
        !chain.includes('<ItemPrivateScriptBodyEditor'))
    )
      problems.push(`${family.id} lost its author-private branch`)
  }
  if (!effectCardSource('ItemUseEffectEditor.tsx', overrides).includes('reorderKeys.retain(index)'))
    problems.push('item/use-effects must retain the selected token when a kind becomes exclusive')

  const owner = effectCardSource('EffectEditorCard.tsx', overrides)
  const editorCss = effectCardSource('editor.css', overrides)
  for (const required of [
    /<DsReorderItem(?=[\s\S]{0,200}?\bas="li")(?=[\s\S]{0,200}?\bitemKey=\{props\.itemKey\})(?=[\s\S]{0,200}?\blayout="overlay")/,
    /data-effect-editor-header="true"/,
    /className="effect-editor-card__body"/,
    /data-effect-editor-fields="true"/,
    /<DsIconButton[\s\S]{0,120}?\bsize="compact"/,
  ])
    if (!required.test(owner)) problems.push(`EffectEditorCard owner contract missing ${required}`)
  if (owner.indexOf('data-effect-editor-header="true"') > owner.indexOf('effect-editor-card__body'))
    problems.push('EffectEditorCard header must precede its parameter body')
  if (
    !/\.ds-reorder-item\.effect-editor-card-item\[data-layout="overlay"\]\s*>\s*\.ds-reorder-item__rail\s*\{[^}]*inset-block-start:\s*0[^}]*block-size:\s*calc\([^)]*var\(--ds-control-height\)/.test(
      editorCss,
    ) ||
    !/\.effect-editor-card-item\[data-layout="overlay"\]:has\([\s\S]*?data-density="compact"[\s\S]*?\.ds-reorder-item__rail\s*\{[^}]*block-size:\s*calc\([^)]*var\(--ds-control-height-compact\)/.test(
      editorCss,
    )
  )
    problems.push('EffectEditorCard overlay handle is not header-aligned')
  const responsiveHandleRule = editorCss.match(
    /@container effect-editor-card \(max-width: 520px\)\s*\{[\s\S]*?\.ds-reorder-item\.effect-editor-card-item\[data-layout="overlay"\]\s*>\s*\.ds-reorder-item__rail\s*\{([^}]*)\}/,
  )
  if (
    !responsiveHandleRule ||
    !/block-size:\s*calc\([^)]*var\(--ds-control-height-compact\)/.test(
      responsiveHandleRule[1],
    )
  )
    problems.push('EffectEditorCard responsive overlay handle is not first-row aligned')
  const fullSpanRule = editorCss.match(
    /\.effect-editor-card__fields\s*>\s*\.item-effect-field-wide[^\{]*\{([^}]*)\}/,
  )
  if (!fullSpanRule || !/grid-column:\s*1\s*\/\s*-1/.test(fullSpanRule[1]))
    problems.push('EffectEditorCard lost its full-span nested field contract')
  if (/skill-effect-card|item-effect-row-head/.test(editorCss))
    problems.push('stale private effect-card CSS remains after shared owner adoption')
  return problems
}

const uiSourceContentCache = new Map()

function readUiSource(sourcePath, overrides = {}) {
  if (Object.hasOwn(overrides, sourcePath)) return overrides[sourcePath]
  const absolutePath = join(uiRoot, sourcePath)
  const stats = statSync(absolutePath)
  const cached = uiSourceContentCache.get(sourcePath)
  if (cached?.mtimeMs === stats.mtimeMs && cached?.size === stats.size) return cached.content
  const content = readFileSync(absolutePath, 'utf8')
  uiSourceContentCache.set(sourcePath, { content, mtimeMs: stats.mtimeMs, size: stats.size })
  return content
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

function literalClassTokens(node) {
  const initializer = jsxAttribute(node, 'className')?.initializer
  if (
    !initializer ||
    (!ts.isStringLiteral(initializer) && !ts.isNoSubstitutionTemplateLiteral(initializer))
  )
    return []
  return initializer.text.split(/\s+/).filter(Boolean)
}

function reachableClassTokens(node) {
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

function reachableClassVariants(node) {
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

function reachableStaticAttributes(node) {
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

function reachableAttributeNames(node) {
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

function inlineScrollStyle(node) {
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

function intrinsicClassSelector(node) {
  const tag = jsxTag(node)
  const classes = literalClassTokens(node)
  return /^[a-z]/.test(tag) && classes.length ? `${tag}.${classes.join('.')}` : undefined
}

const governedCatalogScrollTags = new Set([
  'DsCatalogGroupList',
  'DsCatalogWorkspace',
  'DsInspectorTabs',
  'DsObjectWorkspaceContent',
  'DsVirtualList',
])

const governedCatalogScrollRoles = new Map([
  ['DsCatalogGroupList', new Set(['catalog'])],
  ['DsCatalogWorkspace', new Set(['catalog', 'scroll'])],
  ['DsInspectorTabs', new Set(['scroll'])],
  ['DsObjectWorkspaceContent', new Set(['scroll'])],
  ['DsVirtualList', new Set(['catalog', 'scroll'])],
])

const governedScrollAxes = new Map([
  ['DsCatalogWorkspace', new Set(['y'])],
  ['DsInspectorTabs', new Set(['y'])],
  ['DsObjectWorkspaceContent', new Set(['y'])],
  ['DsVirtualList', new Set(['y'])],
])

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
      (declaration) =>
        ts.isIdentifier(declaration.name) && declaration.name.text === 'EDITOR_MODULES',
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
          (alias) => sameLexicalScope(alias.scope, scope) && alias.declaration.pos <= usage.pos,
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

function staticPrimitiveValue(expression, bindings, resolving = new Set()) {
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
  'DsObjectWorkspaceContent',
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
const semanticFieldOwnerSources = new Map([['MediaAssetNameField', 'MediaAssetLifecycle.tsx']])

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
      sourceOverride ?? readUiSource(componentSource, options.overrides),
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
  const callsiteMetadata = new Map()
  const elementMetadata = new Map()
  const elementSiteIds = new Map()
  const activeCollects = new Map()
  const recursiveCollects = new Set()
  const uncertainties = new Set()
  const elementNamespace = `${sourcePath}@${rootComponent}#${
    options.initialNode ? `${options.initialNode.pos}:${options.initialNode.end}` : 'root'
  }`
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
      const object = argument
        ? unwrapExpression(resolveBoundExpression(argument, bindings))
        : undefined
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
            : (element.initializer ?? staticUndefinedExpression),
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
        if (key === parameter.name.text || key.startsWith(`${parameter.name.text}.`))
          next.delete(key)
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
        next.set(element.name.text, value ?? element.initializer ?? staticUndefinedExpression)
      }
    return next
  }
  const collect = (
    componentSource,
    component,
    initialNode,
    inheritedBindings = new Map(),
    inheritedRenderCounts = new Map(),
    inheritedAncestorSites = [],
  ) => {
    const module = loadModule(componentSource)
    const body = initialNode ?? module?.functions.get(component)
    if (!body) return
    const identity = `${componentSource}@${component}#${body.pos}`
    const publicComponent = component.split('@')[0]
    if (activeCollects.has(identity)) {
      recursiveCollects.add(identity)
      return
    }
    activeCollects.set(identity, new Map(inheritedRenderCounts))
    visitedSources.add(componentSource)
    let currentRenderCounts = inheritedRenderCounts
    let currentAncestorSites = inheritedAncestorSites
    const withRenderCounts = (counts, action) => {
      const previous = currentRenderCounts
      currentRenderCounts = counts
      try {
        return action()
      } finally {
        currentRenderCounts = previous
      }
    }
    const withAncestorSites = (ancestorSites, action) => {
      const previous = currentAncestorSites
      currentAncestorSites = ancestorSites
      try {
        return action()
      } finally {
        currentAncestorSites = previous
      }
    }
    const mergeAlternativeCounts = (actions) => {
      const target = currentRenderCounts
      const base = new Map(target)
      const alternatives = actions.map((action) => {
        const counts = new Map(base)
        withRenderCounts(counts, action)
        return counts
      })
      const states = [base, ...alternatives]
      const ownerBase = (site) => {
        const metadata = callsiteMetadata.get(site)
        return metadata ? `${metadata.source}@${metadata.component}#${metadata.callsite}` : site
      }
      const sitesByBase = new Map()
      for (const counts of states)
        for (const site of counts.keys()) {
          const identity = ownerBase(site)
          const sites = sitesByBase.get(identity) ?? new Set()
          sites.add(site)
          sitesByBase.set(identity, sites)
        }
      target.clear()
      for (const sites of sitesByBase.values()) {
        const selected = states.reduce((best, candidate) => {
          const total = [...sites].reduce((sum, site) => sum + (candidate.get(site) ?? 0), 0)
          const bestTotal = [...sites].reduce((sum, site) => sum + (best.get(site) ?? 0), 0)
          return total > bestTotal ? candidate : best
        }, states[0])
        for (const site of sites) {
          const count = selected.get(site) ?? 0
          if (count > 0) target.set(site, count)
        }
      }
    }
    const elementSiteFor = (node) => {
      const key = `${identity}#${node.getStart(module.source)}#anc:${currentAncestorSites.join('>')}`
      if (!elementSiteIds.has(key))
        elementSiteIds.set(key, `${elementNamespace}:element:${elementSiteIds.size + 1}`)
      return elementSiteIds.get(key)
    }
    const recordElement = (node, tag) => {
      const elementSite = elementSiteFor(node)
      if (!elementMetadata.has(elementSite)) {
        const classVariantAnalysis = reachableClassVariants(node)
        elementMetadata.set(elementSite, {
          source: componentSource,
          component: publicComponent,
          tag,
          attributes: reachableStaticAttributes(node),
          attributeNames: reachableAttributeNames(node),
          classes: reachableClassTokens(node),
          classVariants: classVariantAnalysis.variants,
          classVariantsTruncated: classVariantAnalysis.truncated,
          inlineScrollStyle: inlineScrollStyle(node),
          position: node.getStart(module.source),
          elementSite,
          ancestorSites: [...currentAncestorSites],
        })
      }
      return elementSite
    }
    const recordCallsite = (node, callsite, tag, governed) => {
      const elementSite = recordElement(node, tag)
      const renderSite = `${elementSite}#${callsite}`
      const renderVisit = (currentRenderCounts.get(renderSite) ?? 0) + 1
      currentRenderCounts.set(renderSite, renderVisit)
      if (!callsiteMetadata.has(renderSite))
        callsiteMetadata.set(renderSite, {
          source: componentSource,
          component: publicComponent,
          callsite,
          tag,
          governed,
          attributes: reachableStaticAttributes(node),
          attributeNames: reachableAttributeNames(node),
          classes: reachableClassTokens(node),
          classVariants: elementMetadata.get(elementSite).classVariants,
          classVariantsTruncated: elementMetadata.get(elementSite).classVariantsTruncated,
          inlineScrollStyle: inlineScrollStyle(node),
          position: node.getStart(module.source),
          elementSite,
          ancestorSites: [...currentAncestorSites],
        })
    }
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
    const visitReachableReturns = (flow, visitedInitializers) => {
      if (flow.returns.length === 1) {
        const rendered = flow.returns[0]
        visit(rendered.expression, rendered.bindings, visitedInitializers)
      } else if (flow.returns.length > 1)
        mergeAlternativeCounts(
          flow.returns.map(
            (rendered) => () =>
              visit(rendered.expression, rendered.bindings, new Set(visitedInitializers)),
          ),
        )
    }
    const visit = (node, bindings = inheritedBindings, visitedInitializers = new Set()) => {
      if (Array.isArray(node)) {
        for (const child of node) visit(child, bindings, visitedInitializers)
        return
      }
      const owningSource = node?.getSourceFile?.()?.fileName
      if (owningSource && owningSource !== componentSource) {
        collect(
          owningSource,
          `__bound_${node.pos}_${node.end}`,
          node,
          bindings,
          currentRenderCounts,
          currentAncestorSites,
        )
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
          visitReachableReturns(
            reachableRenderFlow(child.body, bindings, { source: module.source }),
            visitedInitializers,
          )
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
          visitReachableReturns(
            reachableRenderFlow(callback.body, callbackBindings, {
              source: callback.getSourceFile(),
            }),
            visitedInitializers,
          )
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
        const elementSite = recordElement(node.openingElement, tag)
        const localShadow = hasLocalShadow(module, tag, node.openingElement)
        const directChildrenAreRendered =
          /^[a-z]/.test(tag) ||
          (module.fragmentTags.has(tag) && !localShadow) ||
          (module.designSystemImports.has(tag) &&
            !localShadow &&
            provenDesignSystemChildrenConsumers.has(tag))
        if (directChildrenAreRendered)
          withAncestorSites([...currentAncestorSites, elementSite], () => {
            for (const child of node.children) visit(child, bindings, visitedInitializers)
          })
        return
      }
      if (ts.isJsxFragment(node)) {
        for (const child of node.children) visit(child, bindings, visitedInitializers)
        return
      }
      if (ts.isConditionalExpression(node)) {
        const condition = staticBooleanValue(node.condition, bindings)
        if (condition === true) visit(node.whenTrue, bindings, visitedInitializers)
        else if (condition === false) visit(node.whenFalse, bindings, visitedInitializers)
        else
          mergeAlternativeCounts([
            () => visit(node.whenTrue, bindings, new Set(visitedInitializers)),
            () => visit(node.whenFalse, bindings, new Set(visitedInitializers)),
          ])
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
          if (left === true) visit(node.left, bindings, visitedInitializers)
          else if (left === false) visit(node.right, bindings, visitedInitializers)
          else
            mergeAlternativeCounts([
              () => visit(node.left, bindings, new Set(visitedInitializers)),
              () => visit(node.right, bindings, new Set(visitedInitializers)),
            ])
          return
        }
        if (operator === ts.SyntaxKind.QuestionQuestionToken) {
          const left = staticPrimitiveValue(node.left, bindings)
          if (left === staticUnknown) {
            mergeAlternativeCounts([
              () => visit(node.left, bindings, new Set(visitedInitializers)),
              () => visit(node.right, bindings, new Set(visitedInitializers)),
            ])
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
            bindCallParameters(definition.parameters, node.arguments, bindings),
            currentRenderCounts,
            currentAncestorSites,
          )
          return
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callback = unwrapExpression(bindings.get(node.expression.text))
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          const callbackBindings = bindCallParameters(callback.parameters, node.arguments, bindings)
          visitReachableReturns(
            reachableRenderFlow(callback.body, callbackBindings, {
              source: callback.getSourceFile(),
            }),
            visitedInitializers,
          )
          return
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['map', 'flatMap'].includes(node.expression.name.text)
      ) {
        const resolveStaticArrayExpression = (expression, usage, resolving = new Set()) => {
          const current = unwrapExpression(resolveBoundExpression(expression, bindings))
          if (!current || !ts.isIdentifier(current)) return current
          const binding = resolveScopedValueAt(module.scopedValues, current.text, usage)
          if (
            !binding ||
            binding.declaration.pos > usage.pos ||
            !ts.isVariableDeclaration(binding.declaration) ||
            !binding.declaration.initializer
          )
            return current
          const key = `${current.text}@${binding.declaration.pos}`
          if (resolving.has(key)) return current
          resolving.add(key)
          const resolved = resolveStaticArrayExpression(
            binding.declaration.initializer,
            binding.declaration,
            resolving,
          )
          resolving.delete(key)
          return resolved
        }
        const staticArraySlots = (expression, usage, resolving = new Set()) => {
          const array = resolveStaticArrayExpression(expression, usage, resolving)
          if (!array || !ts.isArrayLiteralExpression(array)) return undefined
          const slots = []
          for (const element of array.elements) {
            if (ts.isOmittedExpression(element)) {
              slots.push(undefined)
              continue
            }
            if (!ts.isSpreadElement(element)) {
              slots.push(element)
              continue
            }
            const key = `spread@${element.pos}`
            if (resolving.has(key)) return undefined
            resolving.add(key)
            const spreadSlots = staticArraySlots(element.expression, element, resolving)
            resolving.delete(key)
            if (!spreadSlots) return undefined
            for (const slot of spreadSlots) slots.push(slot ?? staticUndefinedExpression)
          }
          return slots
        }
        const receiver = resolveStaticArrayExpression(
          node.expression.expression,
          node.expression.expression,
        )
        const slots = staticArraySlots(node.expression.expression, node.expression.expression)
        const elements = slots
          ?.map((element, index) => ({ element, index }))
          .filter(({ element }) => element !== undefined)
        const visitCallbackReturns = (body, callbackBindings, source) => {
          const returns = reachableRenderFlow(body, callbackBindings, { source }).returns
          if (returns.length === 1) {
            const rendered = returns[0]
            visit(rendered.expression, rendered.bindings)
          } else if (returns.length > 1)
            mergeAlternativeCounts(
              returns.map(
                (rendered) => () =>
                  visit(rendered.expression, rendered.bindings, new Set(visitedInitializers)),
              ),
            )
        }
        const visitMapArgument = (argument, element, index, knownElement) => {
          const callbackArguments = knownElement
            ? [element, ts.factory.createNumericLiteral(index), receiver]
            : []
          if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
            const callbackBindings = knownElement
              ? bindCallParameters(argument.parameters, callbackArguments, bindings)
              : bindings
            visitCallbackReturns(argument.body, callbackBindings, argument.getSourceFile())
          } else if (ts.isIdentifier(argument)) {
            const definition = scopedFunctionAt(module, argument.text, node)
            if (definition)
              collect(
                componentSource,
                `${argument.text}@${definition.declaration.pos}`,
                definition.body,
                knownElement
                  ? bindCallParameters(definition.parameters, callbackArguments, bindings)
                  : bindings,
                currentRenderCounts,
                currentAncestorSites,
              )
          }
        }
        if (elements) {
          elements.forEach(({ element, index }) => {
            const callback = node.arguments[0]
            if (callback) visitMapArgument(callback, element, index, true)
          })
          return
        }

        const snapshots = {
          metadata: new Map(callsiteMetadata),
          uncertainties: new Set(uncertainties),
        }
        const probeCounts = new Map(currentRenderCounts)
        withRenderCounts(probeCounts, () => {
          const callback = node.arguments[0]
          if (callback) visitMapArgument(callback, undefined, 0, false)
        })
        const changedSites = [...probeCounts].filter(
          ([site, count]) => count > (currentRenderCounts.get(site) ?? 0),
        )
        const hasPotentialOwner = changedSites.some(([site]) => {
          const metadata = callsiteMetadata.get(site)
          return (
            metadata?.governed ||
            (metadata && cssElementOwnsVerticalScroll(metadata, elementMetadata, options.overrides))
          )
        })
        const hasNestedUncertainty = [...uncertainties].some(
          (uncertainty) => !snapshots.uncertainties.has(uncertainty),
        )
        const restoreSet = (target, snapshot) => {
          target.clear()
          for (const value of snapshot) target.add(value)
        }
        const restoreMap = (target, snapshot) => {
          target.clear()
          for (const [key, value] of snapshot) target.set(key, value)
        }
        restoreSet(uncertainties, snapshots.uncertainties)
        restoreMap(callsiteMetadata, snapshots.metadata)
        if (hasPotentialOwner || hasNestedUncertainty)
          uncertainties.add(
            `cannot prove catalog/scroll owner cardinality for dynamic ${node.expression.name.text} at ${componentSource}@${publicComponent}:${node.getStart(module.source)}`,
          )
        return
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'useMemo'
      ) {
        const factory = unwrapExpression(node.arguments[0])
        if (factory && (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)))
          visitReachableReturns(
            reachableRenderFlow(factory.body, bindings, {
              source: factory.getSourceFile(),
            }),
            visitedInitializers,
          )
        return
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'createPortal'
      ) {
        if (node.arguments[0])
          withAncestorSites([], () => visit(node.arguments[0], bindings, visitedInitializers))
        return
      }
      if (ts.isCallExpression(node)) {
        const callee = unwrapExpression(node.expression)
        if (callee && (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee))) {
          visitReachableReturns(
            reachableRenderFlow(callee.body, bindings, {
              source: callee.getSourceFile(),
            }),
            visitedInitializers,
          )
          return
        }
        return
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(module.source)
        const elementSite = recordElement(node, tag)
        const localShadow = hasLocalShadow(module, tag, node)
        const imported = localShadow ? undefined : module.imports.get(tag)
        const governedOwner = tag.startsWith('Ds')
          ? module.designSystemImports.has(tag) && !localShadow
          : semanticFieldOwnerSources.get(tag) === imported?.source ||
            (semanticFieldOwnerSources.get(tag) === componentSource &&
              Boolean(scopedFunctionAt(module, tag, node)))
        elementMetadata.get(elementSite).governed = governedOwner
        if (tag === 'DsDialog' && governedOwner)
          elementMetadata.get(elementSite).canonicalTopLayer = true
        if (!fieldOwnerTokenForTag(tag) || governedOwner) tags.add(tag)
        if (fieldOwnerTokenForTag(tag) && governedOwner) ownerSources.add(componentSource)
        if (tag === 'DsObjectWorkspace' && governedOwner) {
          const contentMode = node.attributes.properties.find(
            (attribute) =>
              ts.isJsxAttribute(attribute) &&
              attribute.name.getText(module.source) === 'contentMode',
          )
          const mode =
            contentMode &&
            ts.isJsxAttribute(contentMode) &&
            contentMode.initializer &&
            ts.isStringLiteral(contentMode.initializer)
              ? contentMode.initializer.text
              : 'wrapped'
          if (mode !== 'manual')
            recordCallsite(node, 'tag:DsObjectWorkspaceContent', 'DsObjectWorkspaceContent', true)
        } else if (governedCatalogScrollTags.has(tag) && governedOwner)
          recordCallsite(node, `tag:${tag}`, tag, true)
        for (const token of reachableClassTokens(node))
          recordCallsite(node, `class:${token}`, tag, false)
        if (/^[A-Z][A-Za-z0-9_]*$/.test(tag)) {
          const definition = scopedFunctionAt(module, tag, node)
          if (definition)
            collect(
              componentSource,
              `${tag}@${definition.declaration.pos}`,
              definition.body,
              bindJsxComponentProps(node, definition.parameters, definition.body, bindings),
              currentRenderCounts,
              currentAncestorSites,
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
                currentRenderCounts,
                currentAncestorSites,
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
    if (renderFlow.returns.length === 1) {
      const rendered = renderFlow.returns[0]
      visit(rendered.expression, rendered.bindings)
    } else if (renderFlow.returns.length > 1)
      mergeAlternativeCounts(
        renderFlow.returns.map((rendered) => () => visit(rendered.expression, rendered.bindings)),
      )
    if (recursiveCollects.has(identity)) {
      const baseline = activeCollects.get(identity) ?? new Map()
      const hasPotentialOwner = [...inheritedRenderCounts].some(([site, count]) => {
        if (count <= (baseline.get(site) ?? 0)) return false
        const metadata = callsiteMetadata.get(site)
        return (
          metadata?.governed ||
          (metadata && cssElementOwnsVerticalScroll(metadata, elementMetadata, options.overrides))
        )
      })
      if (hasPotentialOwner)
        uncertainties.add(
          `cannot prove catalog/scroll owner cardinality through recursive render ${componentSource}@${publicComponent}`,
        )
      recursiveCollects.delete(identity)
    }
    activeCollects.delete(identity)
  }
  const rootRenderCounts = new Map()
  collect(sourcePath, rootComponent, options.initialNode, new Map(), rootRenderCounts)
  const expandedCallsites = []
  for (const [renderSite, count] of rootRenderCounts) {
    const metadata = callsiteMetadata.get(renderSite)
    if (!metadata) continue
    for (let renderVisit = 1; renderVisit <= count; renderVisit++)
      expandedCallsites.push({
        ...metadata,
        renderVisit,
        trace: `${renderSite}#render:${renderVisit}`,
        elementTrace: `${metadata.elementSite}#render:${renderVisit}`,
      })
  }
  const groupedCallsites = new Map()
  for (const callsite of expandedCallsites) {
    const identity = `${callsite.source}@${callsite.component}#${callsite.callsite}`
    const entries = groupedCallsites.get(identity) ?? []
    entries.push(callsite)
    groupedCallsites.set(identity, entries)
  }
  const numberedCallsites = []
  for (const entries of groupedCallsites.values()) {
    entries.sort(
      (left, right) =>
        left.position - right.position ||
        left.renderVisit - right.renderVisit ||
        left.trace.localeCompare(right.trace),
    )
    entries.forEach((entry, index) => {
      numberedCallsites.push({ ...entry, occurrence: index + 1 })
    })
  }
  return {
    tags,
    ownerSources,
    visitedSources,
    elements: [...elementMetadata.values()],
    callsites: numberedCallsites,
    uncertainties: [...uncertainties].sort(),
  }
}

const reachableOwnerCache = new Map()

function cachedReachableJsxOwners(sourcePath, rootComponent, options = {}) {
  const initialAnchor = options.initialNode
    ? `${options.initialNode.getSourceFile().fileName}:${options.initialNode.pos}:${options.initialNode.end}:${options.initialNode.getText()}`
    : 'function-root'
  const key = `${sourcePath}@${rootComponent}#${initialAnchor}`
  const candidates = reachableOwnerCache.get(key) ?? []
  const contentFor = (source) => readUiSource(source, options.overrides)
  const manifest =
    options.manifest ??
    productionSources()
      .map((source) => relative(uiRoot, source))
      .join('\n')
  const css = readUiSource('editor.css', options.overrides)
  for (const candidate of candidates)
    if (
      candidate.manifest === manifest &&
      candidate.css === css &&
      [...candidate.fingerprints].every(([source, content]) => contentFor(source) === content)
    )
      return candidate.result
  const result = reachableJsxOwners(sourcePath, rootComponent, options)
  const fingerprints = new Map(
    [...result.visitedSources].map((source) => [source, contentFor(source)]),
  )
  candidates.unshift({ css, fingerprints, manifest, result })
  if (candidates.length > 12) candidates.length = 12
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
  const prefixFlow = reachableRenderFlow(ts.factory.createBlock(prefix, true), new Map(), {
    source,
  })
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
    !hasCanonicalNamedImport(source, 'editorSubpage', 'editorSubpage', './editor-navigation.js') ||
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
    ? reachableRenderFlow(ts.factory.createBlock(body.statements.slice(0, -1), true), new Map(), {
        source,
      })
    : undefined
  if (
    appSetupFlow &&
    ['activeSubpage', 'objectTargetMissing', 'scene'].some((name) =>
      appSetupFlow.mutatedBindings.has(name),
    )
  )
    throw new Error('App.tsx must not mutate workspace route discriminators')
  const returned = canonicalTopLevelReturnExpression(
    body,
    'App.tsx',
    (statement) => {
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
    },
    source,
  )
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
    ? reachableRenderFlow(ts.factory.createBlock(body.statements.slice(0, -1), true), new Map(), {
        source,
      })
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
    ![
      'controlledSpriteDomain',
      'focusObjectId',
      'battleSprites',
      'assetCatalog',
      "'battle'",
      "'world'",
    ].every((token) => spriteInitialStateText.includes(token))
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
      if (!fallbackFlow.canContinue || fallbackFlow.hasNonRenderExit || fallbackFlow.returns.length)
        throw new Error('DataMode.tsx has non-continuing fallback setup')
      continue
    }
    setupPrefix.push(node)
    const setupFlow = reachableRenderFlow(ts.factory.createBlock(setupPrefix, true), new Map(), {
      source,
    })
    if (['spriteDomain', 'tab'].some((name) => setupFlow.mutatedBindings.has(name)))
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
  const manifest = productionSources()
    .map((source) => relative(uiRoot, source))
    .join('\n')
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
          manifest,
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

const anchoredOverlayConsumerTags = new Set([
  'DsFloatingLayer',
  'DsHelpTip',
  'DsIconButton',
  'DsMenuBar',
  'DsMultiSelect',
  'DsSelect',
  'DsSelectField',
  'DsTooltip',
])
const modalOverlayConsumerTags = new Set(['DsAddPickerDialog', 'DsDialog', 'DsDrawer'])

function overlayOwnerForElement(element) {
  if (!element?.governed) return undefined
  if (modalOverlayConsumerTags.has(element.tag)) return { owner: 'DsDialog', kind: 'modal' }
  if (anchoredOverlayConsumerTags.has(element.tag))
    return { owner: 'DsFloatingLayer', kind: 'anchored-popup' }
  if (
    (element.tag === 'DsCatalogControls' || element.tag === 'DsListHeader') &&
    element.attributeNames?.includes('overflowActions')
  )
    return { owner: 'DsFloatingLayer', kind: 'anchored-popup' }
  return undefined
}

function overlayExceptionKindForElement(element) {
  const classes = new Set(element?.classes ?? [])
  if (classes.has('map-canvas-context-menu')) return 'canvas-local'
  if (classes.has('map-candidate-options')) return 'inline'
  if (
    classes.has('preview-dialog') ||
    classes.has('ambience-scene-preview__overlay') ||
    classes.has('map-viewport-status-cluster')
  )
    return 'preview-hud'
  return undefined
}

export function deriveOverlayAdoptionTruth(overrides = {}) {
  const registry = registeredSubpages()
  const manifest = productionSources()
    .map((source) => relative(uiRoot, source))
    .join('\n')
  const projectRoots = projectPageDispatchRoots(overrides['ProjectWorkbenchTab.tsx'])
  const dataRoots = dataModeDispatchRoots(overrides['DataMode.tsx'])
  const workspaceRoots = appWorkspaceDispatchRoots(overrides)
  const connectorProblems = validateWorkspaceConnectors(overrides, workspaceRoots)
  if (connectorProblems.length) throw new Error(connectorProblems.join('\n'))
  return Object.fromEntries(
    registry.map((entry) => {
      const roots = canonicalFieldRoots(entry, projectRoots, dataRoots, workspaceRoots)
      const owners = new Set()
      const components = new Set(roots.map((root) => root.source))
      const evidence = roots.map((root) => {
        const kinds = new Set()
        const reachable = cachedReachableJsxOwners(root.source, root.component, {
          initialNode: root.initialNode,
          manifest,
          overrides,
        })
        for (const element of reachable.elements ?? []) {
          const descriptor = overlayOwnerForElement(element)
          if (descriptor) {
            owners.add(descriptor.owner)
            kinds.add(descriptor.kind)
            components.add(element.source)
          }
          const exceptionKind = overlayExceptionKindForElement(element)
          if (exceptionKind) {
            kinds.add(exceptionKind)
            components.add(element.source)
          }
        }
        if (reachable.visitedSources.has('StampContentEditor.tsx')) {
          kinds.add('shell-slot')
          components.add('StampContentEditor.tsx')
        }
        return { ...publicRoot(root), kinds: [...kinds].sort() }
      })
      return [
        entry.registry,
        {
          components: [...components].sort(),
          owners: [...owners].sort(),
          evidence,
        },
      ]
    }),
  )
}

const reservedBusinessMarkerSourceCache = new Map()

function scanReservedBusinessMarkers(overrides = {}) {
  const workspace = []
  const forbidden = []
  for (const absolutePath of productionSources()) {
    const sourcePath = relative(uiRoot, absolutePath)
    const content = readUiSource(sourcePath, overrides)
    const cachedCandidates = reservedBusinessMarkerSourceCache.get(sourcePath) ?? []
    const cached = cachedCandidates.find((candidate) => candidate.content === content)
    if (cached) {
      workspace.push(...cached.workspace)
      forbidden.push(...cached.forbidden)
      continue
    }
    const sourceWorkspace = []
    const sourceForbidden = []
    const source = ts.createSourceFile(
      sourcePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const scopedValues = scopedValueBindings(source)
    const resolveStaticValue = (expression, usage, resolving = new Set()) => {
      const current = unwrapExpression(expression)
      if (!current) return staticUnknown
      if (ts.isIdentifier(current)) {
        if (current.text === 'undefined') return undefined
        const binding = resolveScopedValueAt(scopedValues, current.text, usage)
        if (
          !binding ||
          binding.declaration.pos > usage.pos ||
          !ts.isVariableDeclaration(binding.declaration) ||
          !binding.declaration.initializer
        )
          return staticUnknown
        const key = `${current.text}@${binding.declaration.pos}`
        if (resolving.has(key)) return staticUnknown
        resolving.add(key)
        const value = resolveStaticValue(
          binding.declaration.initializer,
          binding.declaration,
          resolving,
        )
        resolving.delete(key)
        return value
      }
      if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
        return current.text
      if (ts.isTemplateExpression(current)) {
        let value = current.head.text
        for (const span of current.templateSpans) {
          const expressionValue = resolveStaticValue(span.expression, usage, resolving)
          if (expressionValue === staticUnknown) return staticUnknown
          value += String(expressionValue) + span.literal.text
        }
        return value
      }
      if (
        ts.isBinaryExpression(current) &&
        current.operatorToken.kind === ts.SyntaxKind.PlusToken
      ) {
        const left = resolveStaticValue(current.left, usage, resolving)
        const right = resolveStaticValue(current.right, usage, resolving)
        if (left === staticUnknown || right === staticUnknown) return staticUnknown
        return typeof left === 'string' || typeof right === 'string'
          ? String(left) + String(right)
          : Number(left) + Number(right)
      }
      if (current.kind === ts.SyntaxKind.TrueKeyword) return true
      if (current.kind === ts.SyntaxKind.FalseKeyword) return false
      if (current.kind === ts.SyntaxKind.NullKeyword) return null
      if (ts.isNumericLiteral(current)) return Number(current.text)
      return staticUnknown
    }
    const staticPropertyName = (name, usage) => {
      const current = unwrapExpression(name)
      if (ts.isIdentifier(current) || ts.isStringLiteral(current) || ts.isNumericLiteral(current))
        return current.text
      if (ts.isComputedPropertyName(current)) {
        const value = resolveStaticValue(current.expression, usage)
        return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
      }
      return undefined
    }
    const resolveStaticObject = (expression, usage, resolving = new Set()) => {
      const current = unwrapExpression(expression)
      if (current && ts.isIdentifier(current)) {
        const binding = resolveScopedValueAt(scopedValues, current.text, usage)
        if (
          !binding ||
          binding.declaration.pos > usage.pos ||
          !ts.isVariableDeclaration(binding.declaration) ||
          !binding.declaration.initializer
        )
          return undefined
        const key = `${current.text}@${binding.declaration.pos}`
        if (resolving.has(key)) return undefined
        resolving.add(key)
        const result = resolveStaticObject(
          binding.declaration.initializer,
          binding.declaration,
          resolving,
        )
        resolving.delete(key)
        return result
      }
      if (!current || !ts.isObjectLiteralExpression(current)) return undefined
      const properties = new Map()
      for (const property of current.properties) {
        if (ts.isSpreadAssignment(property)) {
          const spread = resolveStaticObject(property.expression, usage, resolving)
          if (!spread) return undefined
          for (const [name, value] of spread) properties.set(name, value)
          continue
        }
        if (!('name' in property) || !property.name) continue
        const name = staticPropertyName(property.name, usage)
        if (!name) return undefined
        if (ts.isPropertyAssignment(property)) properties.set(name, property.initializer)
        else if (ts.isShorthandPropertyAssignment(property)) properties.set(name, property.name)
        else return undefined
      }
      return properties
    }
    const mergeClassValues = (left, right) => {
      const merged = new Set()
      for (const prefix of left)
        for (const suffix of right) {
          merged.add(`${prefix}${suffix}`)
          if (merged.size > 64) return undefined
        }
      return merged
    }
    const resolveStaticClassValues = (expression, usage, resolving = new Set()) => {
      const current = unwrapExpression(expression)
      if (!current) return new Set([''])
      if (ts.isIdentifier(current)) {
        if (current.text === 'undefined') return new Set([''])
        const binding = resolveScopedValueAt(scopedValues, current.text, usage)
        if (
          !binding ||
          binding.declaration.pos > usage.pos ||
          !ts.isVariableDeclaration(binding.declaration) ||
          !binding.declaration.initializer
        )
          return undefined
        const key = `${current.text}@${binding.declaration.pos}`
        if (resolving.has(key)) return undefined
        resolving.add(key)
        const values = resolveStaticClassValues(
          binding.declaration.initializer,
          binding.declaration,
          resolving,
        )
        resolving.delete(key)
        return values
      }
      if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
        return new Set([current.text])
      if (ts.isNumericLiteral(current)) return new Set([current.text])
      if (current.kind === ts.SyntaxKind.FalseKeyword || current.kind === ts.SyntaxKind.NullKeyword)
        return new Set([''])
      if (ts.isConditionalExpression(current)) {
        const whenTrue = resolveStaticClassValues(current.whenTrue, usage, resolving)
        const whenFalse = resolveStaticClassValues(current.whenFalse, usage, resolving)
        if (!whenTrue || !whenFalse) return undefined
        return new Set([...whenTrue, ...whenFalse])
      }
      if (ts.isBinaryExpression(current)) {
        if (current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          const left = resolveStaticClassValues(current.left, usage, resolving)
          const right = resolveStaticClassValues(current.right, usage, resolving)
          return left && right ? mergeClassValues(left, right) : undefined
        }
        if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
          const right = resolveStaticClassValues(current.right, usage, resolving)
          return right ? new Set(['', ...right]) : undefined
        }
        if (
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          const left = resolveStaticClassValues(current.left, usage, resolving)
          const right = resolveStaticClassValues(current.right, usage, resolving)
          return left && right ? new Set([...left, ...right]) : undefined
        }
      }
      if (ts.isTemplateExpression(current)) {
        let values = new Set([current.head.text])
        for (const span of current.templateSpans) {
          const expressions = resolveStaticClassValues(span.expression, usage, resolving)
          if (!expressions) return undefined
          const withExpression = mergeClassValues(values, expressions)
          if (!withExpression) return undefined
          const withLiteral = mergeClassValues(withExpression, new Set([span.literal.text]))
          if (!withLiteral) return undefined
          values = withLiteral
        }
        return values
      }
      return undefined
    }
    const readAttributeClassValues = (attribute, usage) => {
      if (!attribute.initializer) return new Set([''])
      if (ts.isStringLiteral(attribute.initializer)) return new Set([attribute.initializer.text])
      if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression)
        return resolveStaticClassValues(attribute.initializer.expression, usage)
      return undefined
    }
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const intrinsic = /^[a-z]/.test(jsxTag(node))
        const tokens = new Set(classTokens(node))
        const markerNames = new Set()
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute)) {
            const name = attribute.name.getText(source)
            if (name === 'className') {
              const values = readAttributeClassValues(attribute, node)
              if (!values && intrinsic)
                sourceForbidden.push(
                  `${sourcePath} uses an unverified dynamic intrinsic className; reserved design-system classes must be statically auditable`,
                )
              for (const value of values ?? [])
                for (const token of value.split(/\s+/).filter(Boolean)) tokens.add(token)
            }
            if (name.startsWith('data-ds-scroll-')) markerNames.add(name)
            continue
          }
          const spread = resolveStaticObject(attribute.expression, node)
          if (!spread) {
            if (intrinsic)
              sourceForbidden.push(
                `${sourcePath} uses an unverified intrinsic JSX spread; reserved design-system classes and markers must be statically auditable`,
              )
            continue
          }
          for (const [name, expression] of spread) {
            if (name === 'className') {
              const values = resolveStaticClassValues(expression, node)
              if (!values && intrinsic)
                sourceForbidden.push(
                  `${sourcePath} uses an unverified dynamic intrinsic className; reserved design-system classes must be statically auditable`,
                )
              for (const value of values ?? [])
                for (const token of value.split(/\s+/).filter(Boolean)) tokens.add(token)
            }
            if (name.startsWith('data-ds-scroll-')) markerNames.add(name)
          }
        }
        const selector = intrinsicClassSelector(node)
        for (const token of tokens) {
          if (token === 'ds-object-workspace' || token === 'ds-object-workspace__content')
            sourceWorkspace.push({
              source: sourcePath,
              selector: selector ?? `${jsxTag(node)}[class:${token}]`,
            })
          else if (token.startsWith('ds-catalog-') || token === 'sprite-list')
            sourceForbidden.push(`${sourcePath} uses reserved raw class ${token}`)
        }
        for (const name of markerNames)
          sourceForbidden.push(`${sourcePath} uses reserved raw marker ${name}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    cachedCandidates.unshift({ content, workspace: sourceWorkspace, forbidden: sourceForbidden })
    if (cachedCandidates.length > 4) cachedCandidates.length = 4
    reservedBusinessMarkerSourceCache.set(sourcePath, cachedCandidates)
    workspace.push(...sourceWorkspace)
    forbidden.push(...sourceForbidden)
  }
  return { workspace, forbidden }
}

function validateWorkspaceLegacyExceptions(entries, overrides = {}) {
  const problems = []
  const byId = new Map()
  const expected = new Map()
  const declaredRegistryPairs = new Set()
  const entryKeys = [
    'debtCard',
    'id',
    'reason',
    'registries',
    'removalCondition',
    'selectors',
    'source',
    'verification',
  ].sort()
  const selectorKeys = ['count', 'selector']
  if (!Array.isArray(entries))
    return {
      problems: ['design-system-adoption.json workspaceLegacyExceptions must be an array'],
      byId,
      declaredRegistryPairs,
    }
  const board = readFileSync(join(repositoryRoot, 'docs/ops/board.md'), 'utf8')
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`workspaceLegacyExceptions[${index}] must be an object`)
      continue
    }
    if (JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(entryKeys))
      problems.push(`workspaceLegacyExceptions[${index}] must use exactly ${entryKeys.join(', ')}`)
    if (typeof entry.id !== 'string' || !entry.id) {
      problems.push(`workspaceLegacyExceptions[${index}].id must be non-empty`)
      continue
    }
    if (byId.has(entry.id)) problems.push(`duplicate workspace legacy exception ${entry.id}`)
    else byId.set(entry.id, entry)
    if (
      typeof entry.source !== 'string' ||
      !entry.source.endsWith('.tsx') ||
      !statSync(join(uiRoot, entry.source), { throwIfNoEntry: false })
    )
      problems.push(`${entry.id} source must name a production TSX file`)
    if (!Array.isArray(entry.registries) || !entry.registries.length)
      problems.push(`${entry.id} registries must be non-empty`)
    else {
      const seenRegistries = new Set()
      for (const [registryIndex, registryId] of entry.registries.entries()) {
        if (typeof registryId !== 'string' || !registryId.trim()) {
          problems.push(`${entry.id} registries[${registryIndex}] must be non-empty`)
          continue
        }
        if (seenRegistries.has(registryId))
          problems.push(`${entry.id} has duplicate registry ${registryId}`)
        seenRegistries.add(registryId)
        declaredRegistryPairs.add(`${entry.id}@${registryId}`)
      }
    }
    for (const key of ['reason', 'verification', 'removalCondition'])
      if (typeof entry[key] !== 'string' || !entry[key].trim())
        problems.push(`${entry.id} ${key} must be non-empty`)
    if (
      typeof entry.debtCard !== 'string' ||
      !entry.debtCard.endsWith('.md') ||
      !statSync(join(repositoryRoot, entry.debtCard), { throwIfNoEntry: false })
    )
      problems.push(`${entry.id} debtCard must resolve to a task card`)
    else {
      const taskId = entry.debtCard.split('/').at(-1)?.split('-editor-')[0]
      if (!taskId || !board.includes(taskId))
        problems.push(`${entry.id} debtCard must be listed on docs/ops/board.md`)
    }
    if (!Array.isArray(entry.selectors) || !entry.selectors.length) {
      problems.push(`${entry.id} selectors must be non-empty`)
      continue
    }
    for (const [selectorIndex, selector] of entry.selectors.entries()) {
      if (
        !selector ||
        typeof selector !== 'object' ||
        JSON.stringify(Object.keys(selector).sort()) !== JSON.stringify(selectorKeys)
      ) {
        problems.push(`${entry.id} selectors[${selectorIndex}] must use exactly count, selector`)
        continue
      }
      if (typeof selector.selector !== 'string' || !selector.selector)
        problems.push(`${entry.id} selectors[${selectorIndex}].selector must be non-empty`)
      if (!Number.isInteger(selector.count) || selector.count < 1)
        problems.push(`${entry.id} selectors[${selectorIndex}].count must be positive`)
      const identity = `${entry.source}#${selector.selector}`
      if (expected.has(identity)) problems.push(`duplicate workspace legacy selector ${identity}`)
      else expected.set(identity, selector.count)
    }
  }

  const actual = new Map()
  const scan = scanReservedBusinessMarkers(overrides)
  problems.push(...scan.forbidden)
  for (const usage of scan.workspace) {
    const identity = `${usage.source}#${usage.selector}`
    actual.set(identity, (actual.get(identity) ?? 0) + 1)
  }
  for (const [identity, count] of actual)
    if (!expected.has(identity))
      problems.push(`unregistered raw workspace marker ${identity} (${count})`)
  for (const [identity, count] of expected) {
    const actualCount = actual.get(identity) ?? 0
    if (actualCount !== count)
      problems.push(
        `workspace legacy selector ${identity} expected ${count}, rendered ${actualCount}`,
      )
  }
  return { problems, byId, declaredRegistryPairs }
}

function callsiteIdentity(value) {
  return `${value.source}@${value.component}#${value.callsite}@${value.occurrence ?? 1}`
}

function callsiteBaseIdentity(value) {
  return `${value.source}@${value.component}#${value.callsite}`
}

function validateCatalogScrollRecord(record, context) {
  const problems = []
  const keys = [
    'axis',
    'callsite',
    'component',
    'owner',
    'reason',
    'region',
    'source',
    'verification',
  ].sort()
  const optionalKeys = ['boundaryKind', 'condition', 'nestedWithin', 'occurrence', 'variant']
  const actualKeys = record && typeof record === 'object' ? Object.keys(record).sort() : []
  if (
    !record ||
    typeof record !== 'object' ||
    actualKeys.some((key) => !keys.includes(key) && !optionalKeys.includes(key)) ||
    keys.some((key) => !actualKeys.includes(key))
  )
    return [`${context} must use ${keys.join(', ')} with optional ${optionalKeys.join(', ')}`]
  for (const key of [
    'callsite',
    'component',
    'owner',
    'reason',
    'region',
    'source',
    'verification',
  ])
    if (typeof record[key] !== 'string' || !record[key].trim())
      problems.push(`${context}.${key} must be non-empty`)
  if (!['none', 'x', 'y', 'both'].includes(record.axis)) problems.push(`${context}.axis is invalid`)
  if (
    typeof record.region === 'string' &&
    !/^(?:catalog|drawer|inspector|main|overlay)(?:\.|$)/.test(record.region)
  )
    problems.push(`${context}.region must start with catalog, drawer, inspector, main, or overlay`)
  if (typeof record.source === 'string' && !record.source.endsWith('.tsx'))
    problems.push(`${context}.source must be a TSX path`)
  if (
    typeof record.callsite === 'string' &&
    !/^(?:tag|class):[A-Za-z0-9_-]+$/.test(record.callsite)
  )
    problems.push(`${context}.callsite must be a stable tag: or class: selector`)
  if (
    record.occurrence !== undefined &&
    (!Number.isInteger(record.occurrence) || record.occurrence < 1)
  )
    problems.push(`${context}.occurrence must be a positive integer`)
  if (
    record.variant !== undefined &&
    (typeof record.variant !== 'string' || !record.variant.trim())
  )
    problems.push(`${context}.variant must be non-empty`)
  if (
    record.condition !== undefined &&
    (typeof record.condition !== 'string' || !record.condition.trim())
  )
    problems.push(`${context}.condition must be non-empty`)
  if (
    typeof record.condition === 'string' &&
    record.condition.trim() !== 'default' &&
    !record.condition
      .split(' && ')
      .every((clause) => /^@(media|container|supports)\s+\S/.test(clause.trim()))
  )
    problems.push(`${context}.condition must be default or a CSS at-rule condition`)
  if (record.condition !== undefined && !record.owner?.startsWith('custom:.'))
    problems.push(`${context}.condition is only supported for custom CSS owners`)
  if ((record.nestedWithin === undefined) !== (record.boundaryKind === undefined))
    problems.push(`${context}.nestedWithin and boundaryKind must be declared together`)
  if (
    record.nestedWithin !== undefined &&
    (typeof record.nestedWithin !== 'string' || !record.nestedWithin.trim())
  )
    problems.push(`${context}.nestedWithin must be non-empty`)
  if (record.boundaryKind !== undefined && record.boundaryKind !== 'bounded-subviewport')
    problems.push(`${context}.boundaryKind must be bounded-subviewport`)
  return problems
}

const parsedCssScrollRuleCache = new Map()
const cssElementScrollResultCache = new Map()

const cssContractProperties = new Set([
  'block-size',
  'height',
  'max-block-size',
  'max-height',
  'overflow',
  'overflow-x',
  'overflow-y',
])

function cssConditionForRule(rule) {
  if (!rule?.cssRules) return undefined
  if (rule.constructor.name === 'CSSMediaRule') return `@media ${rule.conditionText}`
  if (rule.constructor.name === 'CSSContainerRule') return `@container ${rule.conditionText}`
  if (rule.constructor.name === 'CSSSupportsRule') return `@supports ${rule.conditionText}`
  return undefined
}

const cssConditionProfileCache = new Map()

function cssConditionProfile(condition) {
  const cached = cssConditionProfileCache.get(condition)
  if (cached) return cached
  const constraints = new Map()
  const opaque = new Set()
  for (const clause of condition.split(' && ')) {
    if (clause.includes(',')) {
      opaque.add(clause)
      continue
    }
    const media = clause.match(/^@media\s+/)
    const container = clause.match(/^@container(?:\s+([A-Za-z0-9_-]+))?\s+/)
    const dimension = media
      ? 'media:viewport'
      : container
        ? `container:${container[1] ?? '<anonymous>'}`
        : undefined
    const bounds = [...clause.matchAll(/\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)]
    if (!dimension || !bounds.length) {
      opaque.add(clause)
      continue
    }
    const residue = clause
      .replace(/\((?:min|max)-width:\s*\d+(?:\.\d+)?px\)/g, '')
      .replace(/^@media\s+/, '')
      .replace(/^@container(?:\s+[A-Za-z0-9_-]+)?\s+/, '')
      .replace(/\band\b/g, '')
      .trim()
    if (residue) {
      opaque.add(clause)
      continue
    }
    const constraint = constraints.get(dimension) ?? {
      max: Number.POSITIVE_INFINITY,
      min: Number.NEGATIVE_INFINITY,
    }
    for (const match of bounds) {
      const value = Number(match[2])
      if (match[1] === 'min') constraint.min = Math.max(constraint.min, value)
      else constraint.max = Math.min(constraint.max, value)
    }
    constraints.set(dimension, constraint)
  }
  const result = { constraints, opaque }
  cssConditionProfileCache.set(condition, result)
  return result
}

function mergeCssConditionProfiles(conditions) {
  const constraints = new Map()
  const opaque = new Set()
  for (const condition of conditions) {
    const profile = cssConditionProfile(condition)
    for (const value of profile.opaque) opaque.add(value)
    for (const [dimension, bound] of profile.constraints) {
      const merged = constraints.get(dimension) ?? {
        max: Number.POSITIVE_INFINITY,
        min: Number.NEGATIVE_INFINITY,
      }
      merged.min = Math.max(merged.min, bound.min)
      merged.max = Math.min(merged.max, bound.max)
      if (merged.min > merged.max) return undefined
      constraints.set(dimension, merged)
    }
  }
  return { constraints, opaque }
}

function cssConditionProfileImplies(source, target) {
  for (const value of target.opaque) if (!source.opaque.has(value)) return false
  for (const [dimension, targetBound] of target.constraints) {
    const sourceBound = source.constraints.get(dimension)
    if (!sourceBound || sourceBound.min < targetBound.min || sourceBound.max > targetBound.max)
      return false
  }
  return true
}

function cssConditionScenarios(conditions) {
  const unique = [...new Set(conditions)].sort()
  const scenarios = [{ activeConditions: new Set(), condition: 'default' }]
  for (const basis of unique) {
    const basisProfile = mergeCssConditionProfiles([basis])
    if (!basisProfile) continue
    const seeds = [[basis]]
    for (const peer of unique) {
      if (peer === basis) continue
      const combined = mergeCssConditionProfiles([basis, peer])
      if (!combined || cssConditionProfileImplies(basisProfile, cssConditionProfile(peer))) continue
      seeds.push([basis, peer])
    }
    const seen = new Set()
    for (const seed of seeds) {
      const profile = mergeCssConditionProfiles(seed)
      if (!profile) continue
      const activeConditions = new Set(
        unique.filter((condition) =>
          cssConditionProfileImplies(profile, cssConditionProfile(condition)),
        ),
      )
      const signature = [...activeConditions].sort().join(' && ')
      if (seen.has(signature)) continue
      seen.add(signature)
      scenarios.push({ activeConditions, condition: basis })
    }
  }
  return scenarios
}

function parsedCssScrollRules(css) {
  const cached = parsedCssScrollRuleCache.get(css)
  if (cached) return cached
  const dom = new JSDOM('<!doctype html><html><head><style></style></head><body></body></html>')
  dom.window.document.querySelector('style').textContent = css
  const sheet = dom.window.document.styleSheets[0]
  const rules = []
  const conditions = new Set()
  let order = 0
  const walk = (cssRules, conditionStack = []) => {
    for (const rule of cssRules ?? []) {
      if (typeof rule.selectorText === 'string') {
        const declarations = []
        for (let index = 0; index < rule.style.length; index += 1) {
          const property = rule.style[index]
          if (!cssContractProperties.has(property)) continue
          declarations.push({
            property,
            value: rule.style.getPropertyValue(property).trim(),
            important: rule.style.getPropertyPriority(property) === 'important',
            declarationOrder: index,
          })
        }
        if (!declarations.length) continue
        order += 1
        const condition = conditionStack.length ? conditionStack.join(' && ') : 'default'
        if (condition !== 'default') conditions.add(condition)
        for (const specificity of Specificity.calculate(rule.selectorText))
          rules.push({
            condition,
            declarations,
            order,
            selector: specificity.selectorString(),
            specificity: specificity.toArray(),
          })
        continue
      }
      if (!rule.cssRules) continue
      const condition = cssConditionForRule(rule)
      walk(rule.cssRules, condition ? [...conditionStack, condition] : conditionStack)
    }
  }
  walk(sheet?.cssRules)
  const result = { conditions: [...conditions].sort(), document: dom.window.document, rules }
  parsedCssScrollRuleCache.set(css, result)
  if (parsedCssScrollRuleCache.size > 8)
    parsedCssScrollRuleCache.delete(parsedCssScrollRuleCache.keys().next().value)
  return result
}

function cssCascadeOrder(left, right) {
  return (
    Number(left.important) - Number(right.important) ||
    left.specificity[0] - right.specificity[0] ||
    left.specificity[1] - right.specificity[1] ||
    left.specificity[2] - right.specificity[2] ||
    left.order - right.order ||
    left.declarationOrder - right.declarationOrder
  )
}

function overflowAxisValues(value) {
  const values = value.split(/\s+/).filter(Boolean)
  return { x: values[0], y: values[1] ?? values[0] }
}

function selectorClassTokens(selector) {
  return [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1])
}

function finiteBlockBoundary(value) {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '0') return false
  if (
    /\b(?:auto|content|fit-content|max-content|min-content|none|normal|inherit|initial|unset|revert|revert-layer)\b/.test(
      normalized,
    ) ||
    /(?:var|env)\(/.test(normalized) ||
    normalized.includes('%')
  )
    return false
  const withoutDimensions = normalized
    .replace(
      /-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|ex|ch|lh|rlh|cm|mm|q|in|pt|pc|vh|svh|lvh|dvh|vw|svw|lvw|dvw|vmin|svmin|lvmin|dvmin|vmax|svmax|lvmax|dvmax)\b/g,
      '',
    )
    .replace(/\b0\b/g, '')
    .replace(/\b(?:calc|min|max|clamp)\(/g, '(')
    .replace(/[\s(),+*/-]/g, '')
  return withoutDimensions === ''
}

function virtualElementSignature(metadata, elements) {
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  return path
    .map((site) => {
      const element = site === metadata.elementSite ? metadata : elements.get(site)
      return `${element?.tag ?? 'div'}#${[...(element?.classes ?? [])].sort().join('.')}#${JSON.stringify(element?.classVariants ?? [])}#${Boolean(element?.classVariantsTruncated)}#${JSON.stringify(element?.attributes ?? {})}#${JSON.stringify(element?.inlineScrollStyle ?? {})}`
    })
    .join('>')
}

function virtualElementClassPaths(metadata, elements) {
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  const elementPath = path.map((site) =>
    site === metadata.elementSite ? metadata : elements.get(site),
  )
  let truncated = elementPath.some((element) => element?.classVariantsTruncated)
  const classPaths = elementPath.reduce(
    (paths, element) => {
      const variants = element?.classVariants?.length
        ? element.classVariants
        : [element?.classes ?? []]
      const expanded = paths.flatMap((classes) => variants.map((variant) => [...classes, variant]))
      if (expanded.length > 256) truncated = true
      return expanded.slice(0, 256)
    },
    [[]],
  )
  return { classPaths, elementPath, truncated }
}

function selectorHasVariantCorrelationRisk(selector, elementPath) {
  const selectorTokens = new Set(selectorClassTokens(selector))
  let sensitiveElements = 0
  for (const element of elementPath) {
    const variants = element?.classVariants ?? []
    if (variants.length < 2) continue
    const union = new Set(variants.flat())
    const common = new Set(
      variants[0].filter((token) => variants.every((classes) => classes.includes(token))),
    )
    if ([...union].some((token) => !common.has(token) && selectorTokens.has(token)))
      sensitiveElements += 1
  }
  return sensitiveElements > 1
}

function buildVirtualElement(metadata, elements, document, classPath) {
  document.body.replaceChildren()
  let parent = document.body
  const append = (elementMetadata, classes = elementMetadata?.classes ?? []) => {
    const intrinsicTag = /^[a-z][A-Za-z0-9-]*$/.test(elementMetadata?.tag ?? '')
      ? elementMetadata.tag
      : 'div'
    const element = document.createElement(intrinsicTag)
    for (const token of classes) element.classList.add(token)
    for (const [name, value] of Object.entries(elementMetadata?.attributes ?? {}))
      try {
        element.setAttribute(name, value)
      } catch {
        // Invalid or framework-only JSX attribute names cannot contribute selector evidence.
      }
    parent.appendChild(element)
    parent = element
    return element
  }
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  let target = parent
  path.forEach((site, index) => {
    target = append(site === metadata.elementSite ? metadata : elements.get(site), classPath[index])
  })
  return target
}

function cssElementScrollContracts(metadata, elements, overrides = {}) {
  const css = readUiSource('editor.css', overrides)
  let results = cssElementScrollResultCache.get(css)
  if (!results) {
    results = new Map()
    cssElementScrollResultCache.set(css, results)
    if (cssElementScrollResultCache.size > 8)
      cssElementScrollResultCache.delete(cssElementScrollResultCache.keys().next().value)
  }
  const key = virtualElementSignature(metadata, elements)
  if (results.has(key)) return results.get(key)
  const analysis = parsedCssScrollRules(css)
  const { classPaths, elementPath, truncated } = virtualElementClassPaths(metadata, elements)
  const scenarios = classPaths.flatMap((classPath, classVariant) => {
    const targetClasses = classPath.at(-1) ?? []
    const element = buildVirtualElement(metadata, elements, analysis.document, classPath)
    const matchedRules = analysis.rules.filter((rule) => {
      try {
        return element.matches(rule.selector)
      } catch {
        return false
      }
    })
    const conditionScenarios = cssConditionScenarios(
      matchedRules.map((rule) => rule.condition).filter((condition) => condition !== 'default'),
    )
    return conditionScenarios.map(({ activeConditions, condition }) => {
      const winners = new Map()
      for (const rule of matchedRules) {
        if (rule.condition !== 'default' && !activeConditions.has(rule.condition)) continue
        for (const declaration of rule.declarations) {
          const candidates = []
          if (declaration.property === 'overflow') {
            const values = overflowAxisValues(declaration.value)
            candidates.push(['overflow-x', values.x], ['overflow-y', values.y])
          } else candidates.push([declaration.property, declaration.value])
          for (const [property, value] of candidates) {
            const candidate = { ...rule, ...declaration, property, value }
            const winner = winners.get(property)
            if (!winner || cssCascadeOrder(winner, candidate) <= 0) winners.set(property, candidate)
          }
        }
      }
      for (const [declarationOrder, declaration] of (
        metadata.inlineScrollStyle?.declarations ?? []
      ).entries()) {
        const candidates = []
        if (declaration.property === 'overflow') {
          const values = overflowAxisValues(declaration.value)
          candidates.push(['overflow-x', values.x], ['overflow-y', values.y])
        } else candidates.push([declaration.property, declaration.value])
        for (const [property, value] of candidates) {
          const candidate = {
            condition: 'default',
            declarationOrder,
            important: false,
            order: Number.MAX_SAFE_INTEGER,
            property,
            selector: '<inline style>',
            specificity: [Number.MAX_SAFE_INTEGER, 0, 0],
            value,
          }
          const winner = winners.get(property)
          if (!winner || cssCascadeOrder(winner, candidate) <= 0) winners.set(property, candidate)
        }
      }
      const axis = (name) => {
        const winner = winners.get(`overflow-${name}`)
        return {
          ownerClasses: winner
            ? selectorClassTokens(winner.selector).filter((token) => targetClasses.includes(token))
            : [],
          scroll: ['auto', 'scroll'].includes(winner?.value),
          selector: winner?.selector,
          sourceCondition: winner?.condition,
          variantCorrelationUncertain: winner
            ? selectorHasVariantCorrelationRisk(winner.selector, elementPath)
            : false,
          value: winner?.value,
        }
      }
      const boundaryWinners = [
        winners.get('height'),
        winners.get('max-height'),
        winners.get('block-size'),
        winners.get('max-block-size'),
      ].filter(Boolean)
      const finiteBoundary = boundaryWinners.find((winner) => finiteBlockBoundary(winner.value))
      return {
        activeConditions: [...activeConditions].sort(),
        classVariant,
        condition,
        inlineStyleUncertain: Boolean(metadata.inlineScrollStyle?.uncertain),
        variantEnumerationTruncated: truncated,
        x: axis('x'),
        y: axis('y'),
        bounded: Boolean(finiteBoundary),
        boundary: finiteBoundary ? `${finiteBoundary.property}:${finiteBoundary.value}` : undefined,
      }
    })
  })
  results.set(key, scenarios)
  return scenarios
}

function cssElementOwnsVerticalScroll(metadata, elements, overrides = {}) {
  return cssElementScrollContracts(metadata, elements, overrides).some(
    (scenario) => scenario.y.scroll,
  )
}

function scrollOwnerLiveConditions(owner) {
  if (!owner.scrollContracts) return undefined
  return new Set(
    owner.scrollContracts
      .filter((scenario) => scenario.y.scroll && !scenario.y.variantCorrelationUncertain)
      .map((scenario) => scenario.condition),
  )
}

function scrollOwnersCanCoexist(child, parent) {
  const childConditions = scrollOwnerLiveConditions(child)
  const parentConditions = scrollOwnerLiveConditions(parent)
  if (!childConditions || !parentConditions) return true
  if ([...childConditions].some((condition) => parentConditions.has(condition))) return true
  const explicitlyDisabledUnder = (owner, condition) => {
    const scenarios = owner.scrollContracts.filter((scenario) => scenario.condition === condition)
    return (
      condition !== 'default' &&
      scenarios.length > 0 &&
      scenarios.every((scenario) => !scenario.y.scroll && scenario.y.sourceCondition === condition)
    )
  }
  const childDisabledWheneverParentLives = [...parentConditions].every((condition) =>
    explicitlyDisabledUnder(child, condition),
  )
  const parentDisabledWheneverChildLives = [...childConditions].every((condition) =>
    explicitlyDisabledUnder(parent, condition),
  )
  return !childDisabledWheneverParentLives && !parentDisabledWheneverChildLives
}

function isCanonicalInspectorOwnerSwitch(child, parent) {
  if (child.record.owner !== 'DsInspectorTabs' || parent.record.owner !== 'custom:.inspector')
    return false
  if (child.record.region !== parent.record.region || child.record.region !== 'inspector')
    return false
  const variants = parent.callsite.classVariants ?? []
  if (
    !variants.length ||
    !variants.every((classes) => classes.includes('inspector')) ||
    !variants.some((classes) => classes.includes('inspector--tabbed')) ||
    !variants.some((classes) => !classes.includes('inspector--tabbed'))
  )
    return false
  const scenarios = parent.scrollContracts ?? []
  return (
    scenarios.some((scenario) => scenario.y.scroll) &&
    scenarios.some((scenario) => !scenario.y.scroll)
  )
}

function isCanonicalInspectorVariantCallsite(record, callsite) {
  if (record.owner !== 'custom:.inspector' || record.region !== 'inspector' || !record.variant)
    return false
  const variants = callsite.classVariants ?? []
  return (
    variants.length > 1 &&
    variants.every((classes) => classes.includes('inspector')) &&
    variants.some((classes) => classes.includes('inspector--tabbed')) &&
    variants.some((classes) => !classes.includes('inspector--tabbed'))
  )
}

function hasCanonicalTopLayerBetween(child, parent, elements) {
  const ancestors = child.callsite.ancestorSites ?? []
  const parentIndex = ancestors.indexOf(parent.callsite.elementSite)
  if (parentIndex < 0) return false
  return ancestors
    .slice(parentIndex + 1)
    .some((site) => elements.get(site)?.canonicalTopLayer === true)
}

const overlayKinds = new Set([
  'anchored-popup',
  'modal',
  'canvas-local',
  'inline',
  'preview-hud',
  'shell-slot',
])

function enclosingNamedComponent(node) {
  let current = node
  while (current) {
    if (
      (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) &&
      current.name
    )
      return current.name.text
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    )
      return current.parent.name.text
    current = current.parent
  }
  return undefined
}

function canonicalDesignSystemImports(source) {
  const imports = new Set()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const specifier = statement.moduleSpecifier.text
    if (!specifier.startsWith('./design-system/') && specifier !== './design-system/index.js')
      continue
    if (statement.importClause?.name) imports.add(statement.importClause.name.text)
    for (const element of statement.importClause?.namedBindings?.elements ?? [])
      imports.add(element.name.text)
  }
  return imports
}

function componentDirectlyRendersOwner(source, component, ownerTag, imports) {
  if (!imports.has(ownerTag)) return false
  const body = namedFunctionBodies(source).get(component)
  if (!body) return false
  let found = false
  const visit = (node) => {
    if (found) return
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === ownerTag
    ) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(body)
  return found
}

function overlayExceptionCallsites(sourcePath, source, component) {
  const body = namedFunctionBodies(source).get(component)
  if (!body) return []
  const callsites = []
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      for (const token of classTokens(node)) callsites.push(`class:${token}`)
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === 'createPortal') ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'createPortal'))
    )
      callsites.push('call:createPortal')
    ts.forEachChild(node, visit)
  }
  visit(body)
  return callsites.map((callsite, index, all) => ({
    source: sourcePath,
    component,
    callsite,
    occurrence: all.slice(0, index + 1).filter((candidate) => candidate === callsite).length,
  }))
}

function validateOverlayExceptions(exceptions, expectedRegistries, overlayTruth, overrides = {}) {
  const problems = []
  if (!Array.isArray(exceptions)) return ['overlayExceptions must be an array']
  const requiredKeys = [
    'callsite',
    'component',
    'id',
    'kind',
    'occurrence',
    'reason',
    'registries',
    'removalCondition',
    'source',
    'verification',
  ].sort()
  const seenIds = new Set()
  const seenCallsites = new Set()
  const registeredCallsites = new Set()
  const parsedSources = new Map()
  const sourceFor = (sourcePath) => {
    if (!parsedSources.has(sourcePath))
      parsedSources.set(
        sourcePath,
        ts.createSourceFile(
          sourcePath,
          readUiSource(sourcePath, overrides),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        ),
      )
    return parsedSources.get(sourcePath)
  }
  for (const [index, entry] of exceptions.entries()) {
    const context = `overlayExceptions[${index}]`
    if (
      !entry ||
      typeof entry !== 'object' ||
      JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(requiredKeys)
    ) {
      problems.push(`${context} must use exactly ${requiredKeys.join(', ')}`)
      continue
    }
    for (const key of [
      'callsite',
      'component',
      'id',
      'kind',
      'reason',
      'removalCondition',
      'source',
      'verification',
    ])
      if (typeof entry[key] !== 'string' || !entry[key].trim())
        problems.push(`${context}.${key} must be non-empty`)
    if (!entry.source.endsWith('.tsx')) problems.push(`${context}.source must be a TSX path`)
    if (!/^(?:class:[A-Za-z0-9_-]+|call:createPortal)$/.test(entry.callsite))
      problems.push(`${context}.callsite is invalid`)
    if (!Number.isInteger(entry.occurrence) || entry.occurrence < 1)
      problems.push(`${context}.occurrence must be a positive integer`)
    if (!overlayKinds.has(entry.kind)) problems.push(`${context}.kind is invalid`)
    if (!Array.isArray(entry.registries) || !entry.registries.length)
      problems.push(`${context}.registries must be a non-empty array`)
    if (seenIds.has(entry.id)) problems.push(`duplicate overlay exception id ${entry.id}`)
    seenIds.add(entry.id)
    const identity = `${entry.source}@${entry.component}#${entry.callsite}@${entry.occurrence}`
    if (seenCallsites.has(identity)) problems.push(`duplicate overlay exception callsite ${identity}`)
    seenCallsites.add(identity)
    registeredCallsites.add(identity)
    let source
    try {
      source = sourceFor(entry.source)
    } catch {
      problems.push(`${context}.source does not exist: ${entry.source}`)
      continue
    }
    const live = overlayExceptionCallsites(entry.source, source, entry.component).some(
      (candidate) =>
        `${candidate.source}@${candidate.component}#${candidate.callsite}@${candidate.occurrence}` ===
        identity,
    )
    if (!live) problems.push(`stale overlay exception ${entry.id}: ${identity}`)
    for (const registryId of entry.registries ?? []) {
      if (!expectedRegistries.has(registryId)) {
        problems.push(`${entry.id} references stale registry ${registryId}`)
        continue
      }
      const truth = overlayTruth[registryId]
      if (!truth?.components.includes(entry.source))
        problems.push(`${entry.id} source is not route-live for ${registryId}`)
      if (!truth?.evidence.some((scope) => scope.kinds.includes(entry.kind)))
        problems.push(`${entry.id} kind ${entry.kind} is not route-live for ${registryId}`)
    }
  }

  for (const absolutePath of productionSources()) {
    const sourcePath = relative(uiRoot, absolutePath)
    const source = sourceFor(sourcePath)
    const imports = canonicalDesignSystemImports(source)
    const occurrenceByCallsite = new Map()
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = jsxTag(node)
        const role = literalAttribute(node, 'role')
        const popup = literalAttribute(node, 'aria-haspopup')
        const component = enclosingNamedComponent(node)
        const rawSemanticRole = ['dialog', 'alertdialog', 'menu', 'listbox', 'tooltip'].includes(role)
        if (/^[a-z]/.test(tag) && rawSemanticRole) {
          const ownerTag = ['dialog', 'alertdialog'].includes(role) ? 'DsDialog' : 'DsFloatingLayer'
          const classes = classTokens(node)
          const registered = classes.some((token) => {
            const callsite = `class:${token}`
            const key = `${sourcePath}@${component}#${callsite}`
            const occurrence = (occurrenceByCallsite.get(key) ?? 0) + 1
            occurrenceByCallsite.set(key, occurrence)
            return registeredCallsites.has(`${key}@${occurrence}`)
          })
          const owned =
            component && componentDirectlyRendersOwner(source, component, ownerTag, imports)
          if (!registered && !owned)
            problems.push(
              `${sourcePath}@${component ?? '(anonymous)'} renders private ${role} without ${ownerTag} or an evidence-bound exception`,
            )
        }
        if (popup && ['dialog', 'menu', 'listbox'].includes(popup)) {
          const ownerTag = popup === 'dialog' ? 'DsDialog' : 'DsFloatingLayer'
          if (
            !component ||
            !componentDirectlyRendersOwner(source, component, ownerTag, imports)
          )
            problems.push(
              `${sourcePath}@${component ?? '(anonymous)'} declares aria-haspopup=${popup} without directly rendering ${ownerTag}`,
            )
        }
      }
      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) && node.expression.text === 'createPortal') ||
          (ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'createPortal'))
      ) {
        const component = enclosingNamedComponent(node)
        const key = `${sourcePath}@${component}#call:createPortal`
        const occurrence = (occurrenceByCallsite.get(key) ?? 0) + 1
        occurrenceByCallsite.set(key, occurrence)
        if (!registeredCallsites.has(`${key}@${occurrence}`))
          problems.push(`${sourcePath}@${component ?? '(anonymous)'} has unregistered createPortal`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }

  const css = readUiSource('editor.css', overrides)
  const semanticPositionedRules = []
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rulePattern.exec(css))) {
    if (!/position:\s*(?:absolute|fixed)\s*;/.test(match[2])) continue
    if (!/(?:menu|popover|dialog|tooltip|overlay|tray|backdrop)/.test(match[1])) continue
    semanticPositionedRules.push({ selector: match[1].trim(), classes: selectorClassTokens(match[1]) })
  }
  const registeredPositionedClasses = new Set(
    exceptions
      .filter((entry) => ['canvas-local', 'preview-hud'].includes(entry?.kind))
      .filter((entry) => entry?.callsite?.startsWith('class:'))
      .map((entry) => entry.callsite.slice('class:'.length)),
  )
  for (const rule of semanticPositionedRules)
    if (!rule.classes.some((token) => registeredPositionedClasses.has(token)))
      problems.push(`editor.css has unregistered private overlay geometry: ${rule.selector}`)
  return problems
}

export function validateAdoption(document, overrides = {}) {
  const problems = []
  if (
    !document ||
    document.version !== 4 ||
    !Array.isArray(document.pages) ||
    !Array.isArray(document.catalogScrollOwners) ||
    !Array.isArray(document.overlayExceptions) ||
    !Array.isArray(document.workspaceLegacyExceptions)
  )
    return [
      'design-system-adoption.json must contain { version: 4, catalogScrollOwners: [], overlayExceptions: [], workspaceLegacyExceptions: [], pages: [] }',
    ]
  const legacyValidation = validateWorkspaceLegacyExceptions(
    document.workspaceLegacyExceptions,
    overrides,
  )
  problems.push(...legacyValidation.problems)
  const catalogScrollByRegistry = new Map()
  const catalogScrollKeys = ['catalog', 'registry', 'scroll']
  for (const [index, entry] of document.catalogScrollOwners.entries()) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(catalogScrollKeys)
    ) {
      problems.push(
        `catalogScrollOwners[${index}] must use exactly ${catalogScrollKeys.join(', ')}`,
      )
      continue
    }
    if (typeof entry.registry !== 'string' || !entry.registry)
      problems.push(`catalogScrollOwners[${index}].registry must be non-empty`)
    else if (catalogScrollByRegistry.has(entry.registry))
      problems.push(`duplicate catalog/scroll registry ${entry.registry}`)
    else catalogScrollByRegistry.set(entry.registry, entry)
    for (const kind of ['catalog', 'scroll']) {
      if (!Array.isArray(entry[kind]) || !entry[kind].length) {
        problems.push(`catalogScrollOwners[${index}].${kind} must be non-empty`)
        continue
      }
      for (const [recordIndex, record] of entry[kind].entries())
        problems.push(
          ...validateCatalogScrollRecord(
            record,
            `catalogScrollOwners[${index}].${kind}[${recordIndex}]`,
          ),
        )
    }
  }
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
  const sourceManifest = productionSources()
    .map((source) => relative(uiRoot, source))
    .join('\n')
  const expected = new Map(registry.map((page) => [page.registry, page]))
  let overlayTruth = {}
  try {
    overlayTruth = deriveOverlayAdoptionTruth(overrides)
    problems.push(
      ...validateOverlayExceptions(
        document.overlayExceptions,
        new Set(expected.keys()),
        overlayTruth,
        overrides,
      ),
    )
  } catch (error) {
    problems.push(
      `overlay adoption truth invalid: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const actual = new Map()
  const linkedLegacyRegistryPairs = new Set()
  const legacyRegistries = new Set(
    [...legacyValidation.declaredRegistryPairs].map((pair) => pair.slice(pair.indexOf('@') + 1)),
  )
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
    const expectedStatus = legacyRegistries.has(page.registry) ? 'exception' : 'adopted'
    if (page.status !== expectedStatus)
      problems.push(
        `${page.registry} status must be ${expectedStatus}${expectedStatus === 'exception' ? ' while a workspace legacy exception is linked' : ''}`,
      )
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
    const expectedOverlay = overlayTruth[page.registry]
    const overlayScopes = page.ownerEvidence?.overlay
    if (!Array.isArray(overlayScopes) || !overlayScopes.length)
      problems.push(`pages[${index}].ownerEvidence.overlay must be a non-empty array`)
    const validOverlayScopes = []
    for (const [scopeIndex, scope] of (
      Array.isArray(overlayScopes) ? overlayScopes : []
    ).entries()) {
      if (
        !scope ||
        typeof scope !== 'object' ||
        JSON.stringify(Object.keys(scope).sort()) !==
          JSON.stringify(['component', 'kinds', 'source']) ||
        !Array.isArray(scope.kinds) ||
        scope.kinds.some((kind) => !overlayKinds.has(kind)) ||
        JSON.stringify([...scope.kinds].sort()) !== JSON.stringify(scope.kinds)
      ) {
        problems.push(
          `pages[${index}].ownerEvidence.overlay[${scopeIndex}] must use exactly component, kinds, source with sorted valid kinds`,
        )
        continue
      }
      validOverlayScopes.push(scope)
    }
    if (
      expectedOverlay &&
      JSON.stringify(validOverlayScopes) !== JSON.stringify(expectedOverlay.evidence)
    )
      problems.push(`${page.registry} overlay evidence must exactly match routed overlay truth`)
    const expectedOverlayOwner = expectedOverlay?.owners.length
      ? expectedOverlay.owners.join(' + ')
      : 'N/A: no route-live anchored popup or modal'
    if (page.owners?.overlay !== expectedOverlayOwner)
      problems.push(
        `${page.registry} overlay owner must be ${expectedOverlayOwner}; received ${page.owners?.overlay ?? '(missing)'}`,
      )
    for (const source of expectedOverlay?.components ?? [])
      if (!page.components?.includes(source))
        problems.push(`${page.registry} routed overlay source is not registered: ${source}`)
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
            manifest: sourceManifest,
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

    const catalogScrollEntry = catalogScrollByRegistry.get(page.registry)
    if (!catalogScrollEntry) {
      problems.push(`${page.registry} catalog/scroll owner truth is missing`)
      continue
    }
    const registryEntry = expected.get(page.registry)
    const routedRoots = canonicalFieldRoots(registryEntry, projectRoots, dispatch, workspaceRoots)
    const routedCallsiteCandidates = new Map()
    const routedElementMetadata = new Map()
    const routedUncertainties = new Set()
    for (const root of routedRoots) {
      try {
        const result = cachedReachableJsxOwners(root.source, root.component, {
          initialNode: root.initialNode,
          manifest: sourceManifest,
          overrides,
        })
        for (const callsite of result.callsites) {
          const key = `${callsiteBaseIdentity(callsite)}#${callsite.trace}`
          routedCallsiteCandidates.set(key, callsite)
        }
        for (const element of result.elements ?? []) {
          const existing = routedElementMetadata.get(element.elementSite)
          if (
            existing &&
            (existing.source !== element.source ||
              existing.component !== element.component ||
              existing.position !== element.position ||
              existing.ancestorSites.join('>') !== element.ancestorSites.join('>'))
          )
            problems.push(
              `${page.registry} routed element identity collision: ${element.elementSite}`,
            )
          else routedElementMetadata.set(element.elementSite, element)
        }
        for (const uncertainty of result.uncertainties) routedUncertainties.add(uncertainty)
      } catch (error) {
        problems.push(
          `${page.registry} routed catalog/scroll root invalid: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    for (const uncertainty of routedUncertainties) problems.push(`${page.registry} ${uncertainty}`)
    const groupedRoutedCallsites = new Map()
    for (const callsite of routedCallsiteCandidates.values()) {
      const base = callsiteBaseIdentity(callsite)
      const entries = groupedRoutedCallsites.get(base) ?? []
      entries.push(callsite)
      groupedRoutedCallsites.set(base, entries)
    }
    const routedCallsites = new Map()
    for (const entries of groupedRoutedCallsites.values()) {
      entries.sort(
        (left, right) =>
          left.position - right.position ||
          left.renderVisit - right.renderVisit ||
          left.trace.localeCompare(right.trace),
      )
      entries.forEach((entry, index) => {
        const numbered = { ...entry, occurrence: index + 1 }
        routedCallsites.set(callsiteIdentity(numbered), numbered)
      })
    }
    const registeredEdges = new Set()
    const registeredElementEdges = new Set()
    const registeredScrollOwners = []
    const customBases = new Map([
      ['catalog', new Set()],
      ['scroll', new Set()],
    ])
    for (const kind of ['catalog', 'scroll']) {
      const regionAxes = new Set()
      for (const record of catalogScrollEntry[kind] ?? []) {
        if (!record || typeof record !== 'object') continue
        const regionAxis = `${record.region}@${record.axis}@${record.variant ?? 'default'}`
        if (regionAxes.has(regionAxis))
          problems.push(`${page.registry} has duplicate ${kind} owner region ${regionAxis}`)
        regionAxes.add(regionAxis)
        const identity = callsiteIdentity(record)
        const callsite = routedCallsites.get(identity)
        if (!callsite)
          problems.push(
            `${page.registry} ${kind} owner ${record.owner} is not rendered by its routed root`,
          )
        let validOwnerBinding = Boolean(callsite)
        let scrollContract
        let variantSpecificOwner = false
        if (governedCatalogScrollTags.has(record.owner)) {
          if (
            record.callsite !== `tag:${record.owner}` ||
            !callsite?.governed ||
            callsite?.tag !== record.owner
          ) {
            problems.push(
              `${page.registry} ${kind} owner ${record.owner} is not a governed design-system callsite`,
            )
            validOwnerBinding = false
          }
          if (!governedCatalogScrollRoles.get(record.owner)?.has(kind)) {
            problems.push(
              `${page.registry} ${kind} owner ${record.owner} does not support the ${kind} role`,
            )
            validOwnerBinding = false
          }
          if (
            kind === 'scroll' &&
            record.axis === 'both' &&
            !governedScrollAxes.get(record.owner)?.has('both')
          ) {
            problems.push(
              `${page.registry} governed scroll owner ${record.owner} declares unsupported axis both`,
            )
            validOwnerBinding = false
          }
        } else if (record.owner?.startsWith('custom:.')) {
          const token = record.owner.slice('custom:.'.length)
          if (record.callsite !== `class:${token}`) {
            problems.push(
              `${page.registry} ${kind} custom owner ${record.owner} must bind class:${token}`,
            )
            validOwnerBinding = false
          }
          if (callsite && !/^[a-z]/.test(callsite.tag) && callsite.tag !== 'DsInspectorHost') {
            problems.push(
              `${page.registry} ${kind} custom owner ${record.owner} must bind an intrinsic JSX class or DsInspectorHost`,
            )
            validOwnerBinding = false
          }
          if (kind === 'scroll' && callsite) {
            const scrollContracts = cssElementScrollContracts(
              callsite,
              routedElementMetadata,
              overrides,
            )
            const matchingContracts = record.condition
              ? scrollContracts.filter((scenario) => scenario.condition === record.condition)
              : scrollContracts
            const variantEnumerationTruncated = scrollContracts.some(
              (scenario) => scenario.variantEnumerationTruncated,
            )
            const inlineStyleUncertain = matchingContracts.some(
              (scenario) => scenario.inlineStyleUncertain,
            )
            const uncertainVerticalContract = matchingContracts.find(
              (scenario) => scenario.y.scroll && scenario.y.variantCorrelationUncertain,
            )
            const contractsByClassVariant = new Map()
            const expectedClassVariants = new Set(
              scrollContracts.map((scenario) => scenario.classVariant),
            )
            for (const contract of matchingContracts) {
              const contracts = contractsByClassVariant.get(contract.classVariant) ?? []
              contracts.push(contract)
              contractsByClassVariant.set(contract.classVariant, contracts)
            }
            const verticalVariantContracts = [...contractsByClassVariant.values()]
              .filter(
                (contracts) =>
                  contracts.length > 0 &&
                  contracts.every(
                    (scenario) => scenario.y.scroll && !scenario.y.variantCorrelationUncertain,
                  ),
              )
              .map((contracts) => contracts[0])
            const bothVariantContracts = [...contractsByClassVariant.values()]
              .filter(
                (contracts) =>
                  contracts.length > 0 &&
                  contracts.every(
                    (scenario) =>
                      scenario.y.scroll &&
                      scenario.x.scroll &&
                      !scenario.y.variantCorrelationUncertain &&
                      !scenario.x.variantCorrelationUncertain,
                  ),
              )
              .map((contracts) => contracts[0])
            const everyClassVariantOwnsVertical =
              expectedClassVariants.size > 0 &&
              contractsByClassVariant.size === expectedClassVariants.size &&
              verticalVariantContracts.length === expectedClassVariants.size
            const canonicalInspectorVariant = isCanonicalInspectorVariantCallsite(record, callsite)
            const verticalContract = everyClassVariantOwnsVertical
              ? verticalVariantContracts[0]
              : canonicalInspectorVariant
                ? verticalVariantContracts[0]
                : undefined
            variantSpecificOwner = Boolean(verticalContract && !everyClassVariantOwnsVertical)
            scrollContract =
              record.axis === 'both'
                ? contractsByClassVariant.size > 0 &&
                  contractsByClassVariant.size === expectedClassVariants.size &&
                  bothVariantContracts.length === expectedClassVariants.size
                  ? bothVariantContracts[0]
                  : undefined
                : verticalContract
            if (variantEnumerationTruncated) {
              problems.push(
                `${page.registry} scroll custom owner ${record.owner} cannot prove CSS class variants because its routed element path exceeds 256 combinations`,
              )
              validOwnerBinding = false
            }
            if (inlineStyleUncertain) {
              problems.push(
                `${page.registry} scroll custom owner ${record.owner} has a dynamic inline style that can override its scroll contract`,
              )
              validOwnerBinding = false
            }
            if (!verticalContract && !variantEnumerationTruncated && !inlineStyleUncertain) {
              problems.push(
                uncertainVerticalContract
                  ? `${page.registry} scroll custom owner ${record.owner} relies on an unprovable cross-element class variant correlation`
                  : `${page.registry} scroll custom owner ${record.owner} has no live vertical overflow contract${record.condition ? ` under ${record.condition}` : ''}`,
              )
              validOwnerBinding = false
            }
            if (record.axis === 'both' && verticalContract && !scrollContract) {
              problems.push(
                `${page.registry} scroll custom owner ${record.owner} declares axis both without a live horizontal overflow contract`,
              )
              validOwnerBinding = false
            }
          }
          customBases.get(kind).add(callsiteBaseIdentity(record))
        } else if (record.owner?.startsWith('N/A:')) {
          if (!record.owner.slice('N/A:'.length).trim()) {
            problems.push(`${page.registry} ${kind} N/A owner must explain why`)
            validOwnerBinding = false
          }
          if (record.axis !== 'none') {
            problems.push(`${page.registry} ${kind} N/A owner must use axis none`)
            validOwnerBinding = false
          }
          if (callsite && (callsite.governed || !/^[a-z]/.test(callsite.tag))) {
            problems.push(
              `${page.registry} ${kind} N/A owner must bind a non-governed intrinsic evidence callsite`,
            )
            validOwnerBinding = false
          }
        } else if (record.owner?.startsWith('legacy-exception:')) {
          const exceptionId = record.owner.slice('legacy-exception:'.length)
          const exception = legacyValidation.byId.get(exceptionId)
          if (!exception) {
            problems.push(
              `${page.registry} ${kind} owner references unknown legacy exception ${exceptionId}`,
            )
            validOwnerBinding = false
          } else {
            linkedLegacyRegistryPairs.add(`${exceptionId}@${page.registry}`)
            if (!exception.registries.includes(page.registry)) {
              problems.push(`${exceptionId} does not register ${page.registry}`)
              validOwnerBinding = false
            }
            if (exception.source !== record.source) {
              problems.push(`${exceptionId} owner source must be ${exception.source}`)
              validOwnerBinding = false
            }
            const token = record.callsite?.startsWith('class:')
              ? record.callsite.slice('class:'.length)
              : undefined
            if (
              !token ||
              !exception.selectors.some((selector) =>
                selector.selector.split('.').slice(1).includes(token),
              )
            ) {
              problems.push(`${exceptionId} does not authorize ${record.callsite}`)
              validOwnerBinding = false
            }
            if (callsite && !/^[a-z]/.test(callsite.tag)) {
              problems.push(`${exceptionId} must bind an intrinsic JSX class`)
              validOwnerBinding = false
            }
          }
        } else {
          problems.push(
            `${page.registry} ${kind} owner ${String(record.owner)} must be governed, custom, N/A, or legacy-exception`,
          )
          validOwnerBinding = false
        }

        const notApplicable = record.owner?.startsWith('N/A:')
        if (kind === 'catalog' && record.axis !== 'none') {
          problems.push(`${page.registry} catalog owner ${record.owner} must use axis none`)
          validOwnerBinding = false
        }
        if (kind === 'scroll' && !notApplicable && !['y', 'both'].includes(record.axis)) {
          problems.push(`${page.registry} scroll owner ${record.owner} must own vertical scrolling`)
          validOwnerBinding = false
        }
        if (validOwnerBinding && !notApplicable) {
          const edge = `${kind}@${identity}`
          if (registeredEdges.has(edge))
            problems.push(`${page.registry} has duplicate ${kind} owner registration ${identity}`)
          registeredEdges.add(edge)
          if (callsite?.elementTrace)
            registeredElementEdges.add(
              `${kind}@${callsite.elementTrace}@${record.condition ?? 'default'}`,
            )
          if (kind === 'scroll' && callsite)
            registeredScrollOwners.push({
              callsite,
              record,
              scrollContract,
              variantSpecificOwner,
              scrollContracts: record.owner.startsWith('custom:.')
                ? cssElementScrollContracts(callsite, routedElementMetadata, overrides)
                : undefined,
            })
        }
      }
    }
    for (const callsite of routedCallsites.values()) {
      const identity = callsiteIdentity(callsite)
      if (callsite.governed && governedCatalogScrollTags.has(callsite.tag))
        for (const kind of governedCatalogScrollRoles.get(callsite.tag) ?? [])
          if (!registeredEdges.has(`${kind}@${identity}`))
            problems.push(
              `${page.registry} renders unregistered ${kind} owner ${callsite.tag} at ${identity}`,
            )
      for (const kind of ['catalog', 'scroll'])
        if (
          customBases.get(kind).has(callsiteBaseIdentity(callsite)) &&
          !registeredEdges.has(`${kind}@${identity}`)
        )
          problems.push(`${page.registry} renders unregistered ${kind} custom owner at ${identity}`)
    }
    const routedElements = new Map()
    for (const callsite of routedCallsites.values()) {
      const element = routedElements.get(callsite.elementTrace) ?? {
        classes: new Set(),
        callsites: [],
      }
      for (const token of callsite.classes) element.classes.add(token)
      element.callsites.push(callsite)
      routedElements.set(callsite.elementTrace, element)
    }
    for (const [elementTrace, element] of routedElements) {
      const evidence = element.callsites.find(
        (callsite) =>
          callsite.callsite.startsWith('class:') &&
          (/^[a-z]/.test(callsite.tag) || callsite.tag === 'DsInspectorHost'),
      )
      if (!evidence) continue
      const scenarios = cssElementScrollContracts(evidence, routedElementMetadata, overrides)
      if (scenarios.some((scenario) => scenario.variantEnumerationTruncated)) {
        problems.push(
          `${page.registry} cannot prove live scroll ownership for ${evidence.source}@${evidence.component}#${evidence.callsite} because its routed class variants exceed 256 combinations`,
        )
        continue
      }
      if (
        scenarios.some((scenario) => scenario.inlineStyleUncertain) &&
        scenarios.some((scenario) => scenario.y.scroll)
      ) {
        problems.push(
          `${page.registry} cannot prove live scroll ownership for ${evidence.source}@${evidence.component}#${evidence.callsite} because a dynamic inline style can override it`,
        )
        continue
      }
      const defaultScenario = scenarios.find(
        (scenario) =>
          scenario.condition === 'default' &&
          scenario.y.scroll &&
          !scenario.y.variantCorrelationUncertain,
      )
      const liveScenarios = defaultScenario
        ? [defaultScenario]
        : [...new Set(scenarios.map((scenario) => scenario.condition))]
            .filter((condition) => condition !== 'default')
            .map((condition) =>
              scenarios.find(
                (scenario) =>
                  scenario.condition === condition &&
                  scenario.y.scroll &&
                  !scenario.y.variantCorrelationUncertain,
              ),
            )
            .filter(Boolean)
      if (
        !liveScenarios.length &&
        scenarios.some((scenario) => scenario.y.scroll && scenario.y.variantCorrelationUncertain)
      ) {
        problems.push(
          `${page.registry} cannot prove live scroll ownership for ${evidence.source}@${evidence.component}#${evidence.callsite} because its CSS selector crosses correlated class variants`,
        )
        continue
      }
      for (const scenario of liveScenarios) {
        if (registeredElementEdges.has(`scroll@${elementTrace}@${scenario.condition}`)) continue
        const liveOwnerClasses = scenario.y.ownerClasses.length
          ? scenario.y.ownerClasses
          : [...element.classes]
        problems.push(
          `${page.registry} renders unregistered live custom scroll owner ${evidence.source}@${evidence.component}#${liveOwnerClasses.sort().join('+')}@${evidence.occurrence}${scenario.condition === 'default' ? '' : ` under ${scenario.condition}`}`,
        )
      }
    }
    for (const parent of registeredScrollOwners.filter((owner) => owner.variantSpecificOwner)) {
      const switchOwner = registeredScrollOwners.find(
        (child) =>
          child !== parent &&
          child.callsite.ancestorSites?.includes(parent.callsite.elementSite) &&
          isCanonicalInspectorOwnerSwitch(child, parent),
      )
      if (!switchOwner)
        problems.push(
          `${page.registry} variant-specific custom:.inspector owner must pair with a routed DsInspectorTabs owner`,
        )
    }
    const declaredNestedOwners = new Set()
    for (const child of registeredScrollOwners) {
      for (const parent of registeredScrollOwners) {
        if (child === parent) continue
        if (!child.callsite.ancestorSites?.includes(parent.callsite.elementSite)) continue
        if (hasCanonicalTopLayerBetween(child, parent, routedElementMetadata)) continue
        if (!scrollOwnersCanCoexist(child, parent)) continue
        if (isCanonicalInspectorOwnerSwitch(child, parent)) continue
        const nestedIdentity = `${child.record.region}@${parent.record.region}`
        declaredNestedOwners.add(nestedIdentity)
        const structurallyDeclared =
          child.record.nestedWithin === parent.record.region &&
          child.record.boundaryKind === 'bounded-subviewport' &&
          child.record.region.startsWith(`${parent.record.region}.`)
        const bounded = child.scrollContract?.bounded === true
        if (!structurallyDeclared || !bounded)
          problems.push(
            `${page.registry} scroll owner ${child.record.owner} at ${child.record.region} is nested on axis ${child.record.axis} inside ${parent.record.owner} at ${parent.record.region} without a bounded subviewport`,
          )
      }
    }
    for (const owner of registeredScrollOwners) {
      if (!owner.record.nestedWithin) continue
      const nestedIdentity = `${owner.record.region}@${owner.record.nestedWithin}`
      if (!owner.record.region.startsWith(`${owner.record.nestedWithin}.`))
        problems.push(
          `${page.registry} nested scroll region ${owner.record.region} must be a strict child of ${owner.record.nestedWithin}`,
        )
      if (!declaredNestedOwners.has(nestedIdentity))
        problems.push(
          `${page.registry} scroll owner ${owner.record.owner} declares nestedWithin ${owner.record.nestedWithin} without a matching DOM ancestor owner`,
        )
      if (owner.scrollContract && !owner.scrollContract.bounded)
        problems.push(
          `${page.registry} scroll owner ${owner.record.owner} declares a bounded subviewport without a finite block-size contract`,
        )
    }
  }
  for (const id of expected.keys())
    if (!actual.has(id)) problems.push(`registry page missing: ${id}`)
  for (const id of actual.keys()) if (!expected.has(id)) problems.push(`stale registry page: ${id}`)
  for (const id of expected.keys())
    if (!catalogScrollByRegistry.has(id)) problems.push(`catalog/scroll registry missing: ${id}`)
  for (const id of catalogScrollByRegistry.keys())
    if (!expected.has(id)) problems.push(`stale catalog/scroll registry: ${id}`)
  const allLegacyRegistryPairs = new Set([
    ...legacyValidation.declaredRegistryPairs,
    ...linkedLegacyRegistryPairs,
  ])
  for (const pair of allLegacyRegistryPairs) {
    const declared = legacyValidation.declaredRegistryPairs.has(pair)
    const linked = linkedLegacyRegistryPairs.has(pair)
    if (declared && !linked)
      problems.push(`workspace legacy exception pair is not owner-linked: ${pair}`)
    if (linked && !declared) problems.push(`workspace legacy owner pair is not declared: ${pair}`)
  }
  for (const [id, exception] of legacyValidation.byId)
    for (const registryId of exception.registries)
      if (!expected.has(registryId)) problems.push(`${id} references stale registry ${registryId}`)
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
  const effectCardAdoption = parseJson(effectCardAdoptionPath)
  if (effectCardAdoption.error) {
    console.error(`effect-card adoption registry invalid: ${effectCardAdoption.error}`)
    return 2
  }
  const effectCardProblems = validateEffectCardAdoption(effectCardAdoption.value)
  if (effectCardProblems.length) {
    for (const problem of effectCardProblems) console.error(`effect-card: ${problem}`)
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
