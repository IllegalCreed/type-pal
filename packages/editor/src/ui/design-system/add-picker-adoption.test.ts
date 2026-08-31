// @ts-nocheck -- Vitest-only source census; editor production bundle intentionally has no Node types.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const sourceRoot = join(uiRoot, '..')
const semanticAttributeNames = new Set([
  'adoptionId',
  'onConfirm',
  'options',
  'readOnly',
  'revision',
  'scopeKey',
])
const actionTags = new Set(['button', 'DsButton', 'DsIconButton', 'DsPressable'])

function recursiveFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name)
      return entry.isDirectory() ? recursiveFiles(path) : [path]
    })
    .sort()
}

function isProductionTsx(file: string): boolean {
  return (
    file.endsWith('.tsx') &&
    !/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/.test(file) &&
    !/\.(?:test|spec|stories|fixture)\.tsx$/.test(file)
  )
}

function relativePath(root: string, file: string): string {
  return relative(root, file).split(sep).join('/')
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function literalAttribute(
  attribute: ts.JsxAttribute,
  sourceFile: ts.SourceFile,
  source: string,
): string {
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
    `${source}: adoption identity must be a static string literal, received ${attribute.getText(sourceFile)}`,
  )
}

function actionNode(opening: ts.JsxOpeningLikeElement): ts.JsxElement | ts.JsxSelfClosingElement {
  return ts.isJsxOpeningElement(opening) && ts.isJsxElement(opening.parent)
    ? opening.parent
    : (opening as ts.JsxSelfClosingElement)
}

function isDirectLiveCandidateAppend(text: string): boolean {
  return (
    /\bonClick=/.test(text) &&
    /\.\.\./.test(text) &&
    /(?:\[\s*0\s*\]|\.at\(\s*0\s*\)|\.find\s*\(|\bfirst[A-Z]\w*\s*\()/.test(text) &&
    /items|actors|battlers|skills|skillIds|addableSkillIds|catalog|ingredientItems|SoundAsset/.test(
      text,
    )
  )
}

function pickerCallsites(source: string, content: string) {
  const sourceFile = ts.createSourceFile(
    source,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const aliases: string[] = []
  const namespaceTags: string[] = []
  const pickerOpenings: ts.JsxOpeningLikeElement[] = []
  const deferredOpenings: ts.JsxOpeningLikeElement[] = []
  const candidateActions: Array<{ source: string; actionFingerprint: string }> = []

  function isPickerExpression(node: ts.Expression): boolean {
    if (ts.isIdentifier(node)) return node.text === 'DsAddPickerDialog'
    if (ts.isPropertyAccessExpression(node)) return node.name.text === 'DsAddPickerDialog'
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return isPickerExpression(node.expression)
    if (ts.isConditionalExpression(node))
      return isPickerExpression(node.whenTrue) || isPickerExpression(node.whenFalse)
    return false
  }

  function visit(node: ts.Node): void {
    if (ts.isImportSpecifier(node)) {
      const imported = node.propertyName?.text ?? node.name.text
      if (imported === 'DsAddPickerDialog' && node.name.text !== imported)
        aliases.push(node.name.text)
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text !== 'DsAddPickerDialog' &&
      node.initializer &&
      isPickerExpression(node.initializer)
    )
      aliases.push(node.name.text)

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile)
      if (tag === 'DsAddPickerDialog') pickerOpenings.push(node)
      else if (tag.endsWith('.DsAddPickerDialog')) namespaceTags.push(tag)
      if (
        node.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(sourceFile) === 'data-ds-add-picker-deferred',
        )
      )
        deferredOpenings.push(node)
    }

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      const tag = opening.tagName.getText(sourceFile)
      const text = normalized(node.getText(sourceFile))
      if (actionTags.has(tag) && isDirectLiveCandidateAppend(text))
        candidateActions.push({ source, actionFingerprint: fingerprint(text) })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (aliases.length)
    throw new Error(
      `${source}: DsAddPickerDialog aliases evade the adoption gate: ${aliases.join(', ')}`,
    )
  if (namespaceTags.length)
    throw new Error(
      `${source}: namespace picker tags evade the adoption gate: ${namespaceTags.join(', ')}`,
    )

  const included = pickerOpenings.map((opening) => {
    if (opening.attributes.properties.some(ts.isJsxSpreadAttribute))
      throw new Error(`${source}: DsAddPickerDialog spread props are forbidden`)
    const attributes = opening.attributes.properties.filter(ts.isJsxAttribute)
    const byName = new Map(
      attributes.map((attribute) => [attribute.name.getText(sourceFile), attribute]),
    )
    for (const required of ['adoptionId', 'options', 'scopeKey', 'revision', 'onConfirm']) {
      if (!byName.has(required))
        throw new Error(`${source}: DsAddPickerDialog is missing required ${required}`)
    }
    const semantic = attributes
      .filter((attribute) => semanticAttributeNames.has(attribute.name.getText(sourceFile)))
      .sort((left, right) =>
        left.name.getText(sourceFile).localeCompare(right.name.getText(sourceFile)),
      )
      .map((attribute) => normalized(attribute.getText(sourceFile)))
      .join('|')
    return {
      adoptionId: literalAttribute(byName.get('adoptionId')!, sourceFile, source),
      source,
      callsiteFingerprint: fingerprint(semantic),
    }
  })

  const deferred = deferredOpenings.map((opening) => {
    if (opening.attributes.properties.some(ts.isJsxSpreadAttribute))
      throw new Error(`${source}: deferred add action spread props are forbidden`)
    const marker = opening.attributes.properties.find(
      (property): property is ts.JsxAttribute =>
        ts.isJsxAttribute(property) &&
        property.name.getText(sourceFile) === 'data-ds-add-picker-deferred',
    )!
    const action = actionNode(opening)
    const text = normalized(action.getText(sourceFile))
    if (!actionTags.has(opening.tagName.getText(sourceFile)) || !isDirectLiveCandidateAppend(text))
      throw new Error(
        `${source}: deferred marker must bind the live-candidate append action itself`,
      )
    return {
      adoptionId: literalAttribute(marker, sourceFile, source),
      source,
      actionFingerprint: fingerprint(text),
    }
  })

  return { included, deferred, candidateActions }
}

function productionRegistry(root = uiRoot) {
  return recursiveFiles(root)
    .filter(isProductionTsx)
    .flatMap((file) => {
      const source = relativePath(root, file)
      const result = pickerCallsites(source, readFileSync(file, 'utf8'))
      return [{ source, result }]
    })
}

function staticTestTitles(file: string): string[] {
  const sourceFile = ts.createSourceFile(
    relativePath(sourceRoot, file),
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const titles: string[] = []
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'test' || node.expression.text === 'it')
    ) {
      const title = node.arguments[0]
      if (title && (ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)))
        titles.push(title.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return titles
}

describe('add picker adoption gate', () => {
  test('binds all public owners and every deferred live-candidate append to reviewed evidence', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'add-picker-adoption.json'), 'utf8'))
    const production = productionRegistry()
    const included = production.flatMap((entry) => entry.result.included)
    const deferred = production.flatMap((entry) => entry.result.deferred)
    const candidates = production.flatMap((entry) => entry.result.candidateActions)
    const includedPaths = manifest.included.reduce(
      (count, entry) => count + entry.dataPaths.length,
      0,
    )
    const deferredPaths = manifest.deferred.reduce(
      (count, entry) => count + entry.dataPaths.length,
      0,
    )

    expect(manifest.version).toBe(1)
    expect(manifest.baseline).toEqual({
      included: 5,
      deferredOwners: 8,
      includedDataPaths: 6,
      deferredDataPaths: 9,
    })
    expect(manifest.included).toHaveLength(manifest.baseline.included)
    expect(manifest.deferred).toHaveLength(manifest.baseline.deferredOwners)
    expect(includedPaths).toBe(manifest.baseline.includedDataPaths)
    expect(deferredPaths).toBe(manifest.baseline.deferredDataPaths)
    expect(new Set(manifest.included.map((entry) => entry.adoptionId)).size).toBe(
      manifest.included.length,
    )
    expect(new Set(manifest.deferred.map((entry) => entry.adoptionId)).size).toBe(
      manifest.deferred.length,
    )
    expect(new Set(manifest.deferred.map((entry) => entry.actionFingerprint)).size).toBe(
      manifest.deferred.length,
    )

    expect(
      included
        .map((entry) => `${entry.adoptionId}@${entry.source}@${entry.callsiteFingerprint}`)
        .sort(),
    ).toEqual(
      manifest.included
        .map((entry) => `${entry.adoptionId}@${entry.source}@${entry.callsiteFingerprint}`)
        .sort(),
    )
    expect(
      deferred
        .map((entry) => `${entry.adoptionId}@${entry.source}@${entry.actionFingerprint}`)
        .sort(),
    ).toEqual(
      manifest.deferred
        .map((entry) => `${entry.adoptionId}@${entry.source}@${entry.actionFingerprint}`)
        .sort(),
    )
    expect(candidates.map((entry) => `${entry.source}@${entry.actionFingerprint}`).sort()).toEqual(
      deferred.map((entry) => `${entry.source}@${entry.actionFingerprint}`).sort(),
    )

    for (const entry of manifest.included) {
      expect(Object.keys(entry).sort(), entry.adoptionId).toEqual([
        'adoptionId',
        'callsiteFingerprint',
        'candidateOwner',
        'dataPaths',
        'mutationOwner',
        'owner',
        'source',
        'verification',
      ])
      expect(entry.adoptionId).toMatch(/^[a-z0-9/-]+$/)
      expect(entry.callsiteFingerprint).toMatch(/^[a-f0-9]{16}$/)
      expect(entry.dataPaths.length).toBeGreaterThan(0)
      const verificationFile = join(sourceRoot, entry.verification.file)
      expect(existsSync(verificationFile), entry.adoptionId).toBe(true)
      expect(entry.verification.marker).toBe(`[add-picker:${entry.adoptionId}]`)
      expect(
        staticTestTitles(verificationFile).filter((title) =>
          title.includes(entry.verification.marker),
        ),
        `${entry.adoptionId} must have exactly one static integration marker`,
      ).toHaveLength(1)
    }

    for (const entry of manifest.deferred) {
      expect(Object.keys(entry).sort(), entry.adoptionId).toEqual([
        'actionFingerprint',
        'adoptionId',
        'candidateOwner',
        'dataPaths',
        'mutationOwner',
        'owner',
        'reason',
        'removalCondition',
        'source',
        'verification',
      ])
      expect(entry.adoptionId).toMatch(/^[a-z0-9/-]+$/)
      expect(entry.actionFingerprint).toMatch(/^[a-f0-9]{16}$/)
      expect(entry.dataPaths.length).toBeGreaterThan(0)
      expect(entry.reason.length).toBeGreaterThan(16)
      expect(entry.removalCondition.length).toBeGreaterThan(16)
      expect(entry.verification.length).toBeGreaterThan(0)
      for (const verification of entry.verification)
        expect(existsSync(join(sourceRoot, verification)), verification).toBe(true)
    }
  })

  test('fails closed for hidden public owners and unregistered candidate appends', () => {
    expect(() =>
      pickerCallsites(
        'Alias.tsx',
        `import { DsAddPickerDialog as Picker } from './add-picker.js'; const view = <Picker />`,
      ),
    ).toThrow(/aliases evade/)
    expect(() =>
      pickerCallsites(
        'Namespace.tsx',
        `const view = <DesignSystem.DsAddPickerDialog adoptionId="x" />`,
      ),
    ).toThrow(/namespace picker tags/)
    expect(() =>
      pickerCallsites('Spread.tsx', `const view = <DsAddPickerDialog adoptionId="x" {...props} />`),
    ).toThrow(/spread props/)
    expect(() =>
      pickerCallsites(
        'Dynamic.tsx',
        `const view = <DsAddPickerDialog adoptionId={id} options={items} scopeKey={scope} revision={revision} onConfirm={confirm} />`,
      ),
    ).toThrow(/static string literal/)

    const unregistered = pickerCallsites(
      'Unknown.tsx',
      `<DsButton onClick={() => setRows([...rows, items[0]])}>添加</DsButton>`,
    )
    expect(unregistered.candidateActions).toHaveLength(1)
    expect(unregistered.deferred).toHaveLength(0)
    expect(() =>
      pickerCallsites(
        'WrongMarker.tsx',
        `<DsIconButton data-ds-add-picker-deferred="wrong" onClick={() => remove(items[0])} />`,
      ),
    ).toThrow(/must bind the live-candidate append action itself/)
  })
})
