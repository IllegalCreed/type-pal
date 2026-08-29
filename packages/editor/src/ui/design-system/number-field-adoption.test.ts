// @ts-nocheck -- Vitest-only AST/CSS census; production editor intentionally has no Node types.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const governedControls = new Set([
  'DsNumberInput',
  'DsDraftNumberInput',
  'DsNumberField',
  'DsDraftNumberField',
])
const watchedComponents = new Set([...governedControls, 'DsNumberFieldGrid'])
const fieldControls = new Set(['DsNumberField', 'DsDraftNumberField'])
const canonicalModules = new Set([
  './design-system/index.js',
  './design-system/controls.js',
  './design-system/recipes.js',
])

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

function componentName(node: ts.Node, source: string): string {
  let current: ts.Node | undefined = node
  while (current) {
    if ((ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) && current.name)
      return current.name.text
    if (
      ts.isArrowFunction(current) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    )
      return current.parent.name.text
    current = current.parent
  }
  throw new Error(`${source}: governed number call must belong to a named component`)
}

function literalAttribute(
  opening: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile,
  source: string,
): string {
  const attribute = opening.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name,
  )
  if (!attribute?.initializer) return ''
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (ts.isStringLiteral(attribute.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))
  )
    return attribute.initializer.expression.text
  throw new Error(`${source}: ${name} on a governed number control must be a static string`)
}

function hasAttribute(opening: ts.JsxOpeningLikeElement, name: string): boolean {
  return opening.attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function ancestorTags(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  const tags: string[] = []
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (ts.isJsxElement(current)) tags.push(current.openingElement.tagName.getText(sourceFile))
    current = current.parent
  }
  return tags
}

function numberContext(node: ts.Node, sourceFile: ts.SourceFile): string {
  const tags = ancestorTags(node, sourceFile)
  const ordered: Array<[string, string]> = [
    ['DsNumberFieldGrid', 'number-grid'],
    ['DsFieldMeasure', 'field-measure'],
    ['DsPropertyRow', 'property-row'],
    ['DsField', 'field'],
    ['DsFieldGroup', 'field-group'],
    ['label', 'native-label'],
  ]
  return ordered.find(([tag]) => tags.includes(tag))?.[1] ?? 'none'
}

function canonicalBindings(sourceFile: ts.SourceFile, source: string): Set<string> {
  const bindings = new Set<string>()
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue
    const moduleName = statement.moduleSpecifier.text
    const named = statement.importClause?.namedBindings
    if (!canonicalModules.has(moduleName)) {
      if (named && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          const imported = element.propertyName?.text ?? element.name.text
          if (watchedComponents.has(imported))
            throw new Error(
              `${source}: ${imported} must come from the canonical design-system module`,
            )
        }
      }
      continue
    }
    if (named && ts.isNamespaceImport(named))
      throw new Error(`${source}: namespace design-system imports evade the number adoption gate`)
    if (!named || !ts.isNamedImports(named)) continue
    for (const element of named.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      if (!watchedComponents.has(imported)) continue
      if (element.name.text !== imported)
        throw new Error(`${source}: ${imported} aliases evade the number adoption gate`)
      bindings.add(imported)
    }
  }
  return bindings
}

function localCounterfeits(sourceFile: ts.SourceFile): string[] {
  const names: string[] = []
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) return
    const name =
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name)
        ? node.name.text
        : undefined
    if (name && watchedComponents.has(name)) names.push(name)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return names
}

type NumberCall = {
  source: string
  component: string
  control: string
  context: string
  fieldClass: string
  line: number
  node: ts.JsxOpeningLikeElement
  sourceFile: ts.SourceFile
}

function scanNumberSource(text: string, source: string): NumberCall[] {
  const sourceFile = ts.createSourceFile(
    source,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const bindings = canonicalBindings(sourceFile, source)
  const counterfeits = localCounterfeits(sourceFile)
  if (counterfeits.length)
    throw new Error(`${source}: local counterfeit number controls: ${counterfeits.join(', ')}`)
  const calls: NumberCall[] = []
  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile)
      if (tag === 'input') {
        const type = literalAttribute(node, 'type', sourceFile, source)
        if (type === 'number') throw new Error(`${source}: raw input[type=number] is forbidden`)
      }
      if (watchedComponents.has(tag) && !bindings.has(tag))
        throw new Error(`${source}: ${tag} must resolve to its canonical design-system export`)
      if (governedControls.has(tag)) {
        for (const forbidden of [
          'onWheel',
          'fill',
          'fullWidth',
          'showStepper',
          'hideStepper',
          'noStepper',
        ]) {
          if (hasAttribute(node, forbidden))
            throw new Error(`${source}: ${tag} ${forbidden} bypasses the number owner`)
        }
        for (const property of node.attributes.properties) {
          if (!ts.isJsxSpreadAttribute(property)) continue
          const expression = property.expression.getText(sourceFile)
          if (expression !== 'field' && expression !== 'control')
            throw new Error(`${source}: ${tag} spread props evade the number adoption gate`)
        }
        const style = node.attributes.properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'style',
        )
        if (style?.initializer?.getText(sourceFile).includes('width'))
          throw new Error(`${source}: ${tag} owns a page-private inline width`)
        calls.push({
          source,
          component: componentName(node, source),
          control: tag,
          context: numberContext(node, sourceFile),
          fieldClass: literalAttribute(node, 'fieldClassName', sourceFile, source),
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          node,
          sourceFile,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return calls
}

function productionTruth(overrides = new Map<string, string>()) {
  const files = recursiveFiles(uiRoot).filter(isProductionTsx)
  const parsed = new Map<string, { text: string; sourceFile: ts.SourceFile }>()
  const calls = files.flatMap((file) => {
    const source = relative(uiRoot, file).split(sep).join('/')
    const text = overrides.get(source) ?? readFileSync(file, 'utf8')
    const sourceFile = ts.createSourceFile(
      source,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    parsed.set(source, { text, sourceFile })
    return scanNumberSource(text, source)
  })
  return { calls, parsed }
}

function groupedCalls(calls: NumberCall[]) {
  const groups = new Map<string, ReturnType<typeof callShape> & { count: number }>()
  for (const call of calls) {
    const shape = callShape(call)
    const key = JSON.stringify(shape)
    const current = groups.get(key) ?? { ...shape, count: 0 }
    current.count += 1
    groups.set(key, current)
  }
  return [...groups.values()].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  )
}

function callShape(
  call: Pick<NumberCall, 'source' | 'component' | 'control' | 'context' | 'fieldClass'>,
) {
  return {
    source: call.source,
    component: call.component,
    control: call.control,
    context: call.context,
    fieldClass: call.fieldClass,
  }
}

function manifestShape(entry: any) {
  return {
    source: entry.source,
    component: entry.component,
    control: entry.control,
    context: entry.match.context,
    fieldClass: entry.match.fieldClass,
    count: entry.count,
  }
}

function validateEntry(entry: any, modes: Set<string>): void {
  expect(Object.keys(entry).sort()).toEqual(
    [
      'component',
      'control',
      'count',
      'grid',
      'match',
      'measure',
      'mode',
      'owner',
      'reason',
      'removalCondition',
      'source',
      'verification',
    ].sort(),
  )
  expect(Object.keys(entry.match).sort()).toEqual(['context', 'fieldClass'])
  expect(modes.has(entry.mode)).toBe(true)
  expect(governedControls.has(entry.control)).toBe(true)
  expect(entry.count).toBeGreaterThan(0)
  for (const key of [
    'source',
    'component',
    'mode',
    'control',
    'measure',
    'grid',
    'owner',
    'reason',
    'verification',
    'removalCondition',
  ])
    expect(entry[key], `${entry.source}@${entry.component}.${key}`).toBeTruthy()
  if (entry.mode === 'main-form-short' && !fieldControls.has(entry.control))
    throw new Error(
      `${entry.source}@${entry.component}: main-form numbers require canonical NumberField`,
    )
  if (fieldControls.has(entry.control) && entry.measure !== 'canonical-short')
    throw new Error(
      `${entry.source}@${entry.component}: NumberField must own canonical-short measure`,
    )
  if (entry.grid === 'direct-number-grid' && entry.match.context !== 'number-grid')
    throw new Error(`${entry.source}@${entry.component}: direct grid evidence is not an ancestor`)
}

function jsxTagCount(sourceFile: ts.SourceFile, tag: string): number {
  let count = 0
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sourceFile) === tag
    )
      count += 1
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return count
}

function resolvedModule(source: string, specifier: string): string {
  const normalized = join(dirname(source), specifier).split(sep).join('/')
  return normalized.replace(/\.js$/, '.tsx').replace(/^\.\//, '')
}

function wrapperConsumerCount(
  wrapper: { source: string; component: string },
  parsed: Map<string, { sourceFile: ts.SourceFile }>,
): number {
  let count = 0
  for (const [source, { sourceFile }] of parsed) {
    if (source === wrapper.source) {
      count += jsxTagCount(sourceFile, wrapper.component)
      continue
    }
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue
      if (resolvedModule(source, statement.moduleSpecifier.text) !== wrapper.source) continue
      const named = statement.importClause?.namedBindings
      if (!named || !ts.isNamedImports(named)) continue
      for (const element of named.elements) {
        const imported = element.propertyName?.text ?? element.name.text
        if (imported === wrapper.component) count += jsxTagCount(sourceFile, element.name.text)
      }
    }
  }
  return count
}

function findVariable(sourceFile: ts.SourceFile, name: string): ts.Expression {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations)
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer
      )
        return unwrap(declaration.initializer)
  }
  throw new Error(`${sourceFile.fileName}: missing static evidence ${name}`)
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  )
    current = current.expression
  return current
}

function staticArrayCount(sourceFile: ts.SourceFile, name: string): number {
  const expression = findVariable(sourceFile, name)
  if (!ts.isArrayLiteralExpression(expression))
    throw new Error(`${name} must remain a static array`)
  return expression.elements.length
}

function staticObjectCount(sourceFile: ts.SourceFile, name: string): number {
  const expression = findVariable(sourceFile, name)
  if (!ts.isObjectLiteralExpression(expression))
    throw new Error(`${name} must remain a static object`)
  return expression.properties.length
}

function enemyStatCount(sourceFile: ts.SourceFile): number {
  const expression = findVariable(sourceFile, 'ENEMY_STAT_GROUPS')
  if (!ts.isArrayLiteralExpression(expression))
    throw new Error('ENEMY_STAT_GROUPS must stay static')
  return expression.elements.reduce((total, element) => {
    const object = unwrap(element as ts.Expression)
    if (!ts.isObjectLiteralExpression(object)) throw new Error('enemy stat group must be an object')
    const fields = object.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'fields',
    )
    const value = fields && unwrap(fields.initializer)
    if (!value || !ts.isArrayLiteralExpression(value))
      throw new Error('enemy stat fields must be static')
    return total + value.elements.length
  }, 0)
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cssRules(css: string) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: normalized(match[1] ?? ''),
    body: match[2] ?? '',
  }))
}

function cssProperty(body: string, property: string): string | undefined {
  const match = body.match(new RegExp(`(?:^|;)\\s*${property.replace('-', '\\-')}\\s*:\\s*([^;]+)`))
  return match?.[1]?.trim()
}

function assertBusinessCss(css: string, owners: any[]): void {
  const rules = cssRules(css)
  for (const rule of rules) {
    if (/\.ds-number-|\[type\s*=\s*["']?number/.test(rule.selector))
      throw new Error(
        `${rule.selector}: business CSS may not target the public number implementation`,
      )
  }
  for (const owner of owners) {
    for (const key of [
      'selector',
      'property',
      'owner',
      'reason',
      'verification',
      'removalCondition',
    ])
      if (!owner[key]) throw new Error(`business CSS owner is missing ${key}`)
    const matches = rules.filter(
      (rule) =>
        rule.selector === normalized(owner.selector) && cssProperty(rule.body, owner.property),
    )
    if (matches.length !== 1)
      throw new Error(`${owner.selector} must own exactly one ${owner.property} declaration`)
  }
  for (const className of [
    'enemy-stat-grid',
    'actor-stat-editor',
    'bf-elements',
    'item-trade-number-fields',
    'project-party-state',
    'battle-data-number-fields',
    'level-curve-fields',
  ]) {
    const drift = rules.find(
      (rule) =>
        new RegExp(`\\.${className}(?![\\w-])`).test(rule.selector) &&
        cssProperty(rule.body, 'grid-template-columns'),
    )
    if (drift) throw new Error(`${className}: page-private numeric grid owner is forbidden`)
  }
}

function inlineWidthOwners(calls: NumberCall[]) {
  const owners = new Set<string>()
  for (const call of calls) {
    let current: ts.Node | undefined = call.node.parent
    while (current) {
      if (ts.isJsxElement(current)) {
        const style = current.openingElement.attributes.properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && property.name.getText(call.sourceFile) === 'style',
        )
        if (style?.initializer?.getText(call.sourceFile).includes('width'))
          owners.add(`${call.source}@${call.component}`)
      }
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current)
      )
        break
      current = current.parent
    }
  }
  return [...owners].sort()
}

describe('number field adoption gate', () => {
  test('recomputes every production leaf call and classifies it exactly once', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'number-field-adoption.json'), 'utf8'))
    const modes = new Set(manifest.modes)
    expect(manifest.version).toBe(1)
    expect([...modes].sort()).toEqual(
      [
        'main-form-short',
        'compact-repeat-row',
        'range-timeline',
        'coordinate-frame',
        'id-code-readout',
        'bounded-exception',
      ].sort(),
    )
    for (const entry of manifest.entries) validateEntry(entry, modes)
    const { calls } = productionTruth()
    expect(calls).toHaveLength(manifest.baseline.leafCalls)
    expect(new Set(calls.map((call) => call.source)).size).toBe(manifest.baseline.files)
    const controlCounts = Object.fromEntries(
      [...governedControls].map((control) => [
        control,
        calls.filter((call) => call.control === control).length,
      ]),
    )
    expect(controlCounts).toEqual(manifest.baseline.controls)
    expect(groupedCalls(calls)).toEqual(
      manifest.entries
        .map(manifestShape)
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    )
    expect(
      new Set(manifest.entries.map((entry) => JSON.stringify(manifestShape(entry)))).size,
    ).toBe(manifest.entries.length)
  })

  test('locks wrapper consumers and representative static expansions', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'number-field-adoption.json'), 'utf8'))
    const { calls, parsed } = productionTruth()
    const leafOwners = new Map<string, number>()
    for (const call of calls) {
      const key = `${call.source}@${call.component}`
      leafOwners.set(key, (leafOwners.get(key) ?? 0) + 1)
    }
    for (const wrapper of manifest.wrappers) {
      for (const key of [
        'source',
        'component',
        'context',
        'owner',
        'reason',
        'verification',
        'removalCondition',
      ])
        expect(wrapper[key], `${wrapper.source}@${wrapper.component}.${key}`).toBeTruthy()
      expect(wrapperConsumerCount(wrapper, parsed), `${wrapper.source}@${wrapper.component}`).toBe(
        wrapper.consumerCount,
      )
    }
    const requiredWrappers = [...leafOwners]
      .filter(([key]) => {
        const [source, component] = key.split('@')
        return wrapperConsumerCount({ source, component }, parsed) > 1
      })
      .map(([key]) => key)
      .sort()
    expect(manifest.wrappers.map((entry) => `${entry.source}@${entry.component}`).sort()).toEqual(
      [...new Set([...requiredWrappers, 'ActorMode.tsx@ActorStatField'])].sort(),
    )

    const actor = parsed.get('ActorMode.tsx')!.sourceFile
    const enemy = parsed.get('EnemyTab.tsx')!.sourceFile
    const battlefield = parsed.get('BattleFieldTab.tsx')!.sourceFile
    const computed = new Map([
      ['ActorMode.tsx@ActorStatField', staticArrayCount(actor, 'BASE_STAT_FIELDS')],
      ['EnemyTab.tsx@EnemyTab', enemyStatCount(enemy)],
      ['BattleFieldTab.tsx@BattleFieldTab', staticObjectCount(battlefield, 'ELEM_LABEL')],
      [
        'SkillTab.tsx@SkillTab',
        calls.filter(
          (call) =>
            call.source === 'SkillTab.tsx' &&
            call.component === 'SkillTab' &&
            call.context === 'number-grid',
        ).length,
      ],
      [
        'ItemTab.tsx@ItemTab',
        calls.filter(
          (call) =>
            call.source === 'ItemTab.tsx' &&
            call.component === 'ItemTab' &&
            call.context === 'number-grid',
        ).length,
      ],
    ])
    for (const expansion of manifest.renderMultiplicities) {
      expect(expansion.evidence).toBeTruthy()
      expect(computed.get(`${expansion.source}@${expansion.component}`)).toBe(
        expansion.renderedCount,
      )
    }
    const actorConsumers = [...parsed.get('ActorMode.tsx')!.sourceFile.statements]
    expect(
      calls.find((call) => call.source === 'ActorMode.tsx' && call.component === 'ActorStatField')
        ?.control,
    ).toBe('DsDraftNumberField')
    expect(actorConsumers.length).toBeGreaterThan(0)
    const actorSource = parsed.get('ActorMode.tsx')!.sourceFile
    let actorOutsideGrid = false
    function visitActor(node: ts.Node): void {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(actorSource) === 'ActorStatField' &&
        !ancestorTags(node, actorSource).includes('DsNumberFieldGrid')
      )
        actorOutsideGrid = true
      ts.forEachChild(node, visitActor)
    }
    visitActor(actorSource)
    expect(actorOutsideGrid).toBe(false)
  })

  test('locks public ownership of wheel, private widths and responsive grids', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'number-field-adoption.json'), 'utf8'))
    const { calls } = productionTruth()
    const css = readFileSync(join(here, '..', 'editor.css'), 'utf8')
    assertBusinessCss(css, manifest.businessCssOwners)
    for (const owner of manifest.inlineWidthOwners)
      for (const key of [
        'source',
        'component',
        'owner',
        'reason',
        'verification',
        'removalCondition',
      ])
        expect(owner[key], `${owner.source}@${owner.component}.${key}`).toBeTruthy()
    expect(inlineWidthOwners(calls)).toEqual(
      manifest.inlineWidthOwners.map((entry) => `${entry.source}@${entry.component}`).sort(),
    )
  })

  test('rejects raw, counterfeit, unregistered and page-owned number contracts', () => {
    const canonical = `import { DsField, DsNumberField, DsNumberFieldGrid, DsNumberInput } from './design-system/index.js'\n`
    expect(() =>
      scanNumberSource(`${canonical}function X(){return <input type="number" />}`, 'X.tsx'),
    ).toThrow('raw input[type=number]')
    expect(() =>
      scanNumberSource(
        `import { DsNumberInput as Number } from './design-system/index.js'; function X(){return <Number />}`,
        'X.tsx',
      ),
    ).toThrow('aliases evade')
    expect(() =>
      scanNumberSource(
        `function DsNumberInput(){return null}; function X(){return <DsNumberInput />}`,
        'X.tsx',
      ),
    ).toThrow('local counterfeit')
    expect(() =>
      scanNumberSource(`${canonical}function X(p){return <DsNumberInput {...p} />}`, 'X.tsx'),
    ).toThrow('spread props evade')
    expect(() =>
      scanNumberSource(
        `${canonical}function X(){return <DsNumberInput onWheel={()=>{}} />}`,
        'X.tsx',
      ),
    ).toThrow('onWheel bypasses')
    expect(() =>
      scanNumberSource(
        `${canonical}function X(){return <DsNumberField label="值" fill />}`,
        'X.tsx',
      ),
    ).toThrow('fill bypasses')
    expect(() =>
      validateEntry(
        {
          source: 'X.tsx',
          component: 'X',
          match: { context: 'field', fieldClass: '' },
          count: 1,
          mode: 'main-form-short',
          control: 'DsNumberInput',
          measure: 'canonical-short',
          grid: 'single',
          owner: 'card:test',
          reason: 'test',
          verification: 'test',
          removalCondition: 'test',
        },
        new Set(['main-form-short']),
      ),
    ).toThrow('main-form numbers require canonical NumberField')
    const sibling = scanNumberSource(
      `${canonical}function X(){return <><DsNumberFieldGrid /><DsNumberField label="值" /></>}`,
      'X.tsx',
    )[0]!
    expect(sibling.context).toBe('none')
    const wrapperSource = ts.createSourceFile(
      'X.tsx',
      `function N(){return null}; function X(){return <><N/><N/></>}`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(jsxTagCount(wrapperSource, 'N')).toBe(2)
    expect(() => assertBusinessCss('.enemy-stat-grid{grid-template-columns:1fr}', [])).toThrow(
      'page-private numeric grid owner',
    )
    expect(() => assertBusinessCss('.ds-number-stepper{width:100%}', [])).toThrow(
      'public number implementation',
    )
  })
})
