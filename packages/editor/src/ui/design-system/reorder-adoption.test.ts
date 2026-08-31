// @ts-nocheck -- Vitest-only source census; editor production bundle intentionally has no Node types.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const sourceRoot = join(uiRoot, '..')
const contentRoot = join(sourceRoot, '..', '..', 'content', 'src')

function relativePath(root: string, file: string): string {
  return relative(root, file).split(sep).join('/')
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
  return (
    file.endsWith('.tsx') &&
    !/(?:^|\/)(?:__tests__|fixtures?)(?:\/|$)/.test(file) &&
    !/\.(?:test|spec|stories|fixture)\.tsx$/.test(file)
  )
}

function productionTsxFiles(root: string): string[] {
  return recursiveFiles(root).filter(isProductionTsx)
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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
    `${source}: adoptionId must be a static string literal, received ${attribute.getText(sourceFile)}`,
  )
}

function reorderCallsites(file: string, content: string) {
  const source = relativePath(uiRoot, file)
  const sourceFile = ts.createSourceFile(
    source,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const aliases: string[] = []
  const namespaceTags: string[] = []
  const openings: ts.JsxOpeningLikeElement[] = []

  function isCollectionExpression(node: ts.Expression): boolean {
    if (ts.isIdentifier(node)) return node.text === 'DsReorderCollection'
    if (ts.isPropertyAccessExpression(node)) return node.name.text === 'DsReorderCollection'
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return isCollectionExpression(node.expression)
    if (ts.isConditionalExpression(node))
      return isCollectionExpression(node.whenTrue) || isCollectionExpression(node.whenFalse)
    return false
  }

  function visit(node: ts.Node): void {
    if (ts.isImportSpecifier(node)) {
      const imported = node.propertyName?.text ?? node.name.text
      if (imported === 'DsReorderCollection' && node.name.text !== imported)
        aliases.push(node.name.text)
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text !== 'DsReorderCollection' &&
      node.initializer &&
      isCollectionExpression(node.initializer)
    )
      aliases.push(node.name.text)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile)
      if (tag === 'DsReorderCollection') openings.push(node)
      else if (tag.endsWith('.DsReorderCollection')) namespaceTags.push(tag)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (aliases.length)
    throw new Error(
      `${source}: DsReorderCollection aliases evade the adoption gate: ${aliases.join(', ')}`,
    )
  if (namespaceTags.length)
    throw new Error(
      `${source}: namespace reorder tags evade the adoption gate: ${namespaceTags.join(', ')}`,
    )

  return openings.map((opening) => {
    if (opening.attributes.properties.some(ts.isJsxSpreadAttribute))
      throw new Error(
        `${source}: DsReorderCollection spread props are forbidden by the adoption gate`,
      )
    const attributes = opening.attributes.properties.filter(ts.isJsxAttribute)
    const byName = new Map(
      attributes.map((attribute) => [attribute.name.getText(sourceFile), attribute]),
    )
    for (const required of ['adoptionId', 'scopeKey', 'entries', 'revision', 'onReorder']) {
      if (!byName.has(required))
        throw new Error(`${source}: DsReorderCollection is missing required ${required}`)
    }
    return {
      adoptionId: literalAttribute(byName.get('adoptionId')!, sourceFile, source),
      source,
    }
  })
}

function productionRegistry() {
  return productionTsxFiles(uiRoot).flatMap((file) =>
    reorderCallsites(file, readFileSync(file, 'utf8')),
  )
}

function countFingerprint(content: string, fingerprint: string): number {
  return content.split(fingerprint).length - 1
}

function staticTestTitles(file: string): string[] {
  const source = relativePath(sourceRoot, file)
  const sourceFile = ts.createSourceFile(
    source,
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

describe('reorder adoption gate', () => {
  test('binds the machine census to every public collection callsite', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'reorder-adoption.json'), 'utf8'))
    const registered = manifest.families.flatMap((family) => family.adoptions)
    const callsites = productionRegistry()
    const dataPathCount = registered.reduce(
      (total, adoption) => total + adoption.dataPaths.length,
      0,
    )

    expect(manifest.version).toBe(2)
    expect(manifest.baseline).toEqual({
      families: 18,
      adoptions: 29,
      dataPaths: 32,
      interactionOwnerFiles: 20,
    })
    expect(manifest.families).toHaveLength(manifest.baseline.families)
    expect(registered).toHaveLength(manifest.baseline.adoptions)
    expect(dataPathCount).toBe(manifest.baseline.dataPaths)
    expect(manifest.interactionOwnerFiles).toHaveLength(manifest.baseline.interactionOwnerFiles)
    expect(new Set(manifest.interactionOwnerFiles).size).toBe(manifest.interactionOwnerFiles.length)
    expect(new Set(registered.map((adoption) => adoption.adoptionId)).size).toBe(registered.length)

    expect(callsites.map((callsite) => callsite.adoptionId).sort()).toEqual(
      registered.map((adoption) => adoption.adoptionId).sort(),
    )
    for (const family of manifest.families) {
      const verification = family.integrationVerification
      expect(Object.keys(verification).sort(), family.id).toEqual(['file', 'marker'])
      expect(verification.file, family.id).toMatch(/^(?:core|ui)\/.+\.test\.tsx?$/)
      expect(verification.marker, family.id).toBe(`[reorder-family:${family.id}]`)
      const verificationFile = join(sourceRoot, verification.file)
      expect(existsSync(verificationFile), family.id).toBe(true)
      const matchingTitles = staticTestTitles(verificationFile).filter((title) =>
        title.includes(verification.marker),
      )
      expect(
        matchingTitles,
        `${family.id} marker must belong to exactly one static test/it title`,
      ).toHaveLength(1)
    }
    for (const ownerFile of manifest.interactionOwnerFiles) {
      const ownerPath = join(uiRoot, ownerFile)
      const owner = readFileSync(ownerPath, 'utf8')
      expect(owner, `${ownerFile} must consume or configure the public reorder owner`).toMatch(
        /DsReorder(?:Collection|Item|MoveButton)|\breorder\s*=/,
      )
    }
    for (const adoption of registered) {
      expect(
        callsites.filter((callsite) => callsite.adoptionId === adoption.adoptionId),
        adoption.adoptionId,
      ).toEqual([{ adoptionId: adoption.adoptionId, source: adoption.source }])
      expect(Object.keys(adoption).sort(), adoption.adoptionId).toEqual([
        'adapter',
        'adoptionId',
        'commandOwner',
        'contentOwner',
        'contentSurface',
        'dataPaths',
        'identity',
        'railLayout',
        'railOwner',
        'revisionOwner',
        'source',
        'verification',
      ])
      expect(adoption.dataPaths.length).toBeGreaterThan(0)
      expect(adoption.verification.length).toBeGreaterThan(0)
      for (const verification of adoption.verification) {
        expect(
          verification,
          `${adoption.adoptionId} verification must be source-root relative`,
        ).toMatch(/^(?:core|ui)\/.+\.test\.tsx?$/)
        expect(
          existsSync(join(sourceRoot, verification)),
          `${adoption.adoptionId} has missing verification ${verification}`,
        ).toBe(true)
      }
    }
  })

  test('keeps the three canonical order declarations represented by stable-order adoptions', () => {
    const manifest = JSON.parse(readFileSync(join(here, 'reorder-adoption.json'), 'utf8'))
    const registeredIds = new Set(
      manifest.families.flatMap((family) =>
        family.adoptions.map((adoption) => adoption.adoptionId),
      ),
    )
    const declarations = recursiveFiles(contentRoot)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8')
        return [...content.matchAll(/^\s*order\??:\s*number\b/gm)].map((match) => ({
          source: relativePath(contentRoot, file),
          declaration: normalized(match[0]),
        }))
      })
    expect(declarations).toEqual([
      { source: 'author-script-core.ts', declaration: 'order: number' },
      { source: 'author-script-core.ts', declaration: 'order: number' },
      { source: 'sprite.ts', declaration: 'order?: number' },
    ])
    for (const adoptionId of [
      'story/entity-behavior-schemes',
      'story/scene-hook-variants',
      'asset/sprite-action-definitions',
    ])
      expect(registeredIds.has(adoptionId), adoptionId).toBe(true)
  })

  test('keeps native transfer and spatial movement exceptions evidence-bound and fresh', () => {
    const allowlist = JSON.parse(readFileSync(join(here, 'reorder-allowlist.json'), 'utf8'))
    const files = productionTsxFiles(uiRoot)
    const contents = new Map(
      files.map((file) => [relativePath(uiRoot, file), readFileSync(file, 'utf8')]),
    )
    const nativeDraggables: Array<{ file: string; fingerprint: string }> = []

    for (const [file, content] of contents) {
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      function visit(node: ts.Node): void {
        if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === 'draggable')
          nativeDraggables.push({ file, fingerprint: normalized(node.getText(sourceFile)) })
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
    }

    expect(allowlist.version).toBe(1)
    expect(allowlist.entries).toHaveLength(11)
    expect(new Set(allowlist.entries.map((entry) => entry.rule))).toEqual(
      new Set([
        'asset-transfer-drop',
        'derived-order',
        'membership-change',
        'native-draggable-transfer',
        'pan-zoom-gesture',
        'resize-gesture',
        'spatial-move-action',
      ]),
    )
    const identities = new Set<string>()
    for (const entry of allowlist.entries) {
      expect(Object.keys(entry).sort()).toEqual([
        'file',
        'fingerprint',
        'owner',
        'reason',
        'removalCondition',
        'rule',
        'verification',
      ])
      const identity = `${entry.file}:${entry.rule}:${entry.fingerprint}`
      expect(identities.has(identity), `duplicate allowlist entry ${identity}`).toBe(false)
      identities.add(identity)
      const content = contents.get(entry.file)
      expect(content, `missing allowlisted source ${entry.file}`).toBeDefined()
      expect(
        countFingerprint(content!, entry.fingerprint),
        `stale or ambiguous allowlist entry ${identity}`,
      ).toBe(1)
      expect(entry.owner).toMatch(/^card:/)
      expect(entry.reason.length).toBeGreaterThan(8)
      expect(entry.verification.length).toBeGreaterThan(8)
      expect(entry.removalCondition.length).toBeGreaterThan(8)
    }

    const allowedNative = allowlist.entries
      .filter((entry) => entry.rule === 'native-draggable-transfer')
      .map((entry) => ({ file: entry.file, fingerprint: normalized(entry.fingerprint) }))
    expect(nativeDraggables).toEqual(allowedNative)

    const productionDndOwners = [...contents]
      .filter(([_file, content]) =>
        /\bdraggable=|\bonDrag(?:Start|End|Over|Enter|Leave)=|\bonDrop=/.test(content),
      )
      .map(([file]) => file)
      .sort()
    const allowlistedDndOwners = [
      ...new Set(
        allowlist.entries
          .filter(
            (entry) =>
              entry.rule === 'native-draggable-transfer' || entry.rule === 'asset-transfer-drop',
          )
          .map((entry) => entry.file),
      ),
    ].sort()
    expect(productionDndOwners).toEqual(allowlistedDndOwners)
  })

  test('rejects private movement actions, handles, glyphs, and hand-built button intents', () => {
    const allowlist = JSON.parse(readFileSync(join(here, 'reorder-allowlist.json'), 'utf8'))
    const spatial = allowlist.entries.filter((entry) => entry.rule === 'spatial-move-action')
    const movement = /上移|下移|前移|后移(?!除)|移到最前|移到最后|置顶|置底/
    const actionTags = new Set(['button', 'DsButton', 'DsIconButton', 'DsPressable'])
    const violations: string[] = []

    for (const file of productionTsxFiles(uiRoot)) {
      if (file.startsWith(here)) continue
      const source = relative(uiRoot, file).split(sep).join('/')
      const content = readFileSync(file, 'utf8')
      const sourceFile = ts.createSourceFile(
        source,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      function visit(node: ts.Node): void {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sourceFile)
          const fullNode =
            ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent) ? node.parent : node
          const text = normalized(fullNode.getText(sourceFile))
          if (actionTags.has(tag) && movement.test(text)) {
            const allowed = spatial.some(
              (entry) => entry.file === source && text.includes(entry.fingerprint),
            )
            if (!allowed) violations.push(`${source}: private movement action ${text}`)
          }
        }
        if (ts.isObjectLiteralExpression(node)) {
          const text = normalized(node.getText(sourceFile))
          if (/input\s*:\s*['"]button['"]/.test(text) && /(?:sourceKey|fromIndex)\s*:/.test(text))
            violations.push(`${source}: hand-built reorder button intent ${text}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)

      if (content.includes('≡')) violations.push(`${source}: private text grip glyph`)
    }

    for (const path of recursiveFiles(uiRoot).filter((candidate) => candidate.endsWith('.css'))) {
      const file = relativePath(uiRoot, path)
      const content = readFileSync(path, 'utf8')
      for (const match of content.matchAll(
        /\.([\w-]*(?:reorder|sortable|drag-(?:handle|grip)|(?:handle|grip)-drag)[\w-]*)/gi,
      )) {
        if (!match[1]!.startsWith('ds-reorder'))
          violations.push(`${file}: private reorder selector .${match[1]}`)
      }
    }

    expect(violations).toEqual([])
  })

  test('keeps the grip physically inside the item boundary and outside catalog media', () => {
    const reorder = readFileSync(join(here, 'reorder.tsx'), 'utf8')
    const css = readFileSync(join(here, 'reorder.css'), 'utf8')
    const catalogGate = readFileSync(join(here, 'catalog-row-content-adoption.test.ts'), 'utf8')

    expect(reorder).toMatch(
      /<Item[\s\S]*?<span className="ds-reorder-item__rail"[\s\S]*?<div className=\{dsClasses\('ds-reorder-item__content'/,
    )
    expect(css).toMatch(/\.ds-reorder-item\s*\{[\s\S]*?position:\s*relative;/)
    expect(css).toMatch(
      /\.ds-reorder-item__rail\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset-inline-start:\s*var\(--ds-space-2\);/,
    )
    expect(css).toMatch(
      /\.ds-reorder-item\[data-layout="inline"\][\s\S]*?padding-inline-start:\s*calc\(var\(--ds-space-3\) \+ var\(--ds-hit-target-compact\)\);/,
    )
    expect(catalogGate).toContain('reorder ownership must stay outside DsCatalogRow')
  })

  test('fails closed when a collection is aliased or hides required evidence behind spread props', () => {
    expect(() =>
      reorderCallsites(
        join(uiRoot, 'SyntheticAlias.tsx'),
        `import { DsReorderCollection as Hidden } from './design-system/index.js'
       export const Example = () => <Hidden />`,
      ),
    ).toThrow('aliases evade the adoption gate')
    expect(() =>
      reorderCallsites(
        join(uiRoot, 'SyntheticSpread.tsx'),
        `import { DsReorderCollection } from './design-system/index.js'
       const evidence = {}
       export const Example = () => <DsReorderCollection {...evidence} />`,
      ),
    ).toThrow('spread props are forbidden')
  })
})
