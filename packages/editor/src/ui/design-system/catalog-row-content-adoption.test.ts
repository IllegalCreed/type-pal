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
const titleKinds = [
  'authored-name',
  'derived-content',
  'resource-label-or-kind-fallback',
  'semantic-label',
  'canonical-id',
  'referenced-id',
] as const
const identitySlots = ['meta', 'title', 'none'] as const
const idPresentations = [
  'canonical-exact',
  'canonical-formatted',
  'reference-exact',
  'none',
] as const
const summaryKinds = [
  'none',
  'classification',
  'status',
  'selection-summary',
  'structural-summary',
  'diagnostic',
] as const
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

function heroMediaCallsites(root = uiRoot) {
  return productionTsxFiles(root).flatMap((file) => {
    const source = relative(root, file).split(sep).join('/')
    const content = readFileSync(file, 'utf8')
    const sourceFile = ts.createSourceFile(
      source,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const callsites: Array<{
      component: string
      fingerprint: string
      hasRawText: boolean
      source: string
    }> = []
    const aliases: string[] = []
    const namespaceTags: string[] = []

    const hasRawMediaText = (node: ts.Node): boolean => {
      if (ts.isJsxText(node)) return Boolean(node.text.trim())
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true
      if (ts.isJsxExpression(node))
        return node.expression ? hasRawMediaText(node.expression) : false
      if (ts.isJsxElement(node) || ts.isJsxFragment(node))
        return node.children.some(hasRawMediaText)
      if (ts.isConditionalExpression(node))
        return hasRawMediaText(node.whenTrue) || hasRawMediaText(node.whenFalse)
      if (ts.isBinaryExpression(node))
        return hasRawMediaText(node.left) || hasRawMediaText(node.right)
      return false
    }

    function visit(node: ts.Node) {
      if (ts.isImportSpecifier(node)) {
        const imported = node.propertyName?.text ?? node.name.text
        if (imported === 'DsObjectHero' && node.name.text !== 'DsObjectHero')
          aliases.push(node.name.text)
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sourceFile)
        if (tag.endsWith('.DsObjectHero')) namespaceTags.push(tag)
        if (tag === 'DsObjectHero') {
          if (node.attributes.properties.some(ts.isJsxSpreadAttribute))
            throw new Error(`${source}: DsObjectHero spread attributes can hide an unregistered media owner`)
          const media = node.attributes.properties.find(
            (property): property is ts.JsxAttribute =>
              ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'media',
          )
          if (media) {
            const initializer = media.initializer
            const expression =
              initializer && ts.isJsxExpression(initializer) ? initializer.expression : undefined
            const component = expression && ts.isJsxElement(expression)
              ? expression.openingElement.tagName.getText(sourceFile)
              : expression && ts.isJsxSelfClosingElement(expression)
                ? expression.tagName.getText(sourceFile)
                : 'dynamic'
            const mediaText = normalized(media.getText(sourceFile))
            callsites.push({
              component,
              fingerprint: createHash('sha256').update(mediaText).digest('hex').slice(0, 16),
              hasRawText: expression ? hasRawMediaText(expression) : true,
              source,
            })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    if (aliases.length)
      throw new Error(`${source}: DsObjectHero aliases evade the Hero media census: ${aliases.join(', ')}`)
    if (namespaceTags.length)
      throw new Error(`${source}: namespace DsObjectHero tags evade the Hero media census: ${namespaceTags.join(', ')}`)
    return callsites
  })
}

function source(file: string): string {
  return readFileSync(join(uiRoot, file), 'utf8')
}

function heroMediaPresence(sourceName: string, eyebrow: string): boolean[] {
  const content = source(sourceName)
  const sourceFile = ts.createSourceFile(
    sourceName,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const matches: boolean[] = []
  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(sourceFile) === 'DsObjectHero'
    ) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute)
      const eyebrowAttribute = attributes.find(
        (attribute) => attribute.name.getText(sourceFile) === 'eyebrow',
      )
      if (eyebrowAttribute?.initializer && ts.isStringLiteral(eyebrowAttribute.initializer)) {
        if (eyebrowAttribute.initializer.text === eyebrow) {
          matches.push(
            attributes.some((attribute) => attribute.name.getText(sourceFile) === 'media'),
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return matches
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
    expect(matrix.version).toBe(4)
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
      expect(titleKinds).toContain(entry.titleKind)
      expect(identitySlots).toContain(entry.identitySlot)
      expect(idPresentations).toContain(entry.idPresentation)
      expect(summaryKinds).toContain(entry.summaryKind)
      if (entry.identitySlot !== 'none')
        expect(callsite.slots[entry.identitySlot], `${entry.id} identity slot`).toBe(true)
      if (entry.idPresentation.startsWith('canonical-'))
        expect(entry.identitySlot, `${entry.id} canonical identity placement`).not.toBe('none')
      if (entry.idPresentation === 'reference-exact') {
        expect(entry.titleKind, `${entry.id} reference title kind`).toBe('referenced-id')
        expect(entry.identitySlot, `${entry.id} diagnostic is not a stable object identity`).toBe('none')
      }
      if (entry.summaryKind === 'none') {
        const summarySlots = ['meta', 'trailing'].filter(
          (slot) => slot !== entry.identitySlot && callsite.slots[slot],
        )
        expect(summarySlots, `${entry.id} must not retain an unclassified summary`).toEqual([])
      }
      expect(entry.reason.length).toBeGreaterThan(12)
    }

    const idsFor = (field: string, value: string): string[] => matrix.entries
      .filter((entry) => entry[field] === value)
      .map((entry) => entry.id)
      .sort()
    expect(idsFor('titleKind', 'derived-content')).toEqual([
      'enemy-team/catalog',
      'shop/catalog',
    ])
    expect(idsFor('titleKind', 'resource-label-or-kind-fallback')).toEqual([
      'audio/asset-catalog',
      'battle-sprite/asset-catalog',
      'cutscene/asset-catalog',
      'image/asset-catalog',
      'world-sprite/asset-catalog',
    ])
    expect(idsFor('identitySlot', 'title')).toEqual(['scene/current-outline-root'])
    expect(idsFor('idPresentation', 'reference-exact')).toEqual([
      'variables/undeclared-reference-catalog',
    ])
    expect(idsFor('idPresentation', 'canonical-formatted')).toEqual(['battle-field/catalog'])

    const contractFor = (id: string) => {
      const entry = matrix.entries.find((candidate) => candidate.id === id)
      return entry && {
        titleKind: entry.titleKind,
        identitySlot: entry.identitySlot,
        idPresentation: entry.idPresentation,
        summaryKind: entry.summaryKind,
        decision: entry.decision,
      }
    }
    expect(contractFor('enemy-team/catalog')).toEqual({
      titleKind: 'derived-content',
      identitySlot: 'meta',
      idPresentation: 'canonical-exact',
      summaryKind: 'none',
      decision: 'compliant',
    })
    expect(contractFor('shop/catalog')).toEqual({
      titleKind: 'derived-content',
      identitySlot: 'meta',
      idPresentation: 'canonical-exact',
      summaryKind: 'none',
      decision: 'compliant',
    })
    expect(contractFor('scene/current-outline-root')).toEqual({
      titleKind: 'canonical-id',
      identitySlot: 'title',
      idPresentation: 'canonical-exact',
      summaryKind: 'structural-summary',
      decision: 'bounded-exception',
    })
    expect(contractFor('variables/undeclared-reference-catalog')).toEqual({
      titleKind: 'referenced-id',
      identitySlot: 'none',
      idPresentation: 'reference-exact',
      summaryKind: 'diagnostic',
      decision: 'bounded-exception',
    })
  })

  test('closes every production object Hero media owner without raw glyph fallbacks', () => {
    const matrix = JSON.parse(readFileSync(join(here, 'catalog-row-content-adoption.json'), 'utf8'))
    const actual = heroMediaCallsites()
    const actualByIdentity = new Map(
      actual.map((entry) => [`${entry.source}@${entry.fingerprint}`, entry]),
    )
    const recorded = matrix.heroMedia.map(
      (entry) => `${entry.source}@${entry.jsxFingerprint}`,
    )

    expect([...recorded].sort()).toEqual([...actualByIdentity.keys()].sort())
    expect(new Set(recorded).size).toBe(recorded.length)
    expect(new Set(matrix.heroMedia.map((entry) => entry.id)).size).toBe(matrix.heroMedia.length)
    for (const entry of matrix.heroMedia) {
      const actualEntry = actualByIdentity.get(`${entry.source}@${entry.jsxFingerprint}`)
      expect(actualEntry, `${entry.id} must bind to a live DsObjectHero media prop`).toBeDefined()
      expect(actualEntry?.component, `${entry.id} media owner`).toBe(entry.component)
      expect(actualEntry?.hasRawText, `${entry.id} must not render raw text or emoji as media`).toBe(false)
      expect(['identity-media', 'semantic-swatch']).toContain(entry.kind)
      expect(entry.fallback.length).toBeGreaterThan(12)
    }

    expect(matrix.heroMedia.map((entry) => entry.id).sort()).toEqual([
      'actor/hero-avatar',
      'ambience/hero-swatch',
      'enemy/hero-idle-frame',
      'item/hero-icon',
    ])
    expect(matrix.heroMediaNone.map((entry) => entry.id).sort()).toEqual([
      'enemy-team/hero-no-media',
      'variables/hero-no-media',
    ])
    for (const entry of matrix.heroMediaNone) {
      expect(heroMediaPresence(entry.source, entry.eyebrow), entry.id).toEqual([false])
      expect(entry.reason.length).toBeGreaterThan(12)
    }
    expect(source('EnemyTab.tsx')).toContain('placement="hero"')
    expect(source('EnemyTab.tsx')).not.toMatch(/[👹]/u)
    expect(source('EnemyTeamTab.tsx')).not.toMatch(/media=.*[⚔]/u)
    expect(source('VarsTab.tsx')).not.toMatch(/media=.*[⚑№]/u)
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

    expect(
      matrix.entries
        .filter((entry) => entry.leading === 'present')
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(
      [
        'actor/catalog',
        'ambience/catalog',
        'enemy/catalog',
        'image/asset-catalog',
        'item/catalog',
      ].sort(),
    )
  })

  test('locks the repaired content hierarchy without changing DsCatalogRow props', () => {
    const app = source('App.tsx')
    const audio = source('AudioAssetWorkbench.tsx')
    const battlefield = source('BattleFieldTab.tsx')
    const item = source('ItemTab.tsx')
    const enemy = source('EnemyTab.tsx')
    const enemyThumbnail = source('EnemyBattleSpriteThumbnail.tsx')
    const enemyTeam = source('EnemyTeamTab.tsx')
    const editorCss = source('editor.css')
    const map = source('MapMode.tsx')
    const cutscene = source('CutsceneTab.tsx')
    const project = source('ProjectWorkbenchTab.tsx')
    const script = source('SharedScriptTab.tsx')
    const shop = source('ShopTab.tsx')
    const spriteAction = source('SpriteActionEditor.tsx')
    const variables = source('VarsTab.tsx')
    const worldSprite = source('WorldSpriteLibrary.tsx')
    const battleSprite = source('BattleSpriteLibrary.tsx')

    expect(app).not.toContain('leading={<span aria-hidden="true">🗺️</span>}')
    expect(audio).not.toContain('leading={<DsIcon name="play" />}')
    expect(audio).toContain('title={editorAssetCatalogTitle(entry.record)}')
    expect(audio).not.toContain('entry.record.label || entry.id')
    expect(battlefield).not.toContain('bf-catalog-id')
    expect(battlefield).toContain("meta={`#${String(candidate.id).padStart(3, '0')}`}")
    expect(item).toContain('meta={candidate.id}')
    expect(item).toContain('<DsTag tone="warning">待迁移</DsTag>')
    expect(item).not.toContain('refs ? `引用 ${refs}`')
    expect(enemy).not.toContain('<span className="face">👹</span>')
    expect(enemy).toContain('meta={e.id}')
    expect(enemy).toContain('<EnemyBattleSpriteThumbnail')
    expect(enemyThumbnail).toContain('definition.profile.idle.start')
    expect(enemyThumbnail).not.toMatch(/frames\s*\[\s*0\s*\]/)
    expect(enemyThumbnail).not.toContain('frameIndex = 0')
    expect(enemyThumbnail).not.toContain('setInterval')
    expect(enemyThumbnail).not.toContain('requestAnimationFrame')
    expect(enemyThumbnail).not.toMatch(/[👹🎭]/u)
    expect(enemyTeam).not.toContain('leading={<span aria-hidden="true">⚔</span>}')
    expect(enemyTeam).toContain('key={team.id}')
    expect(enemyTeam).toContain('meta={team.id}')
    expect(enemyTeam).toContain('onClick={() => select(team.id)}')
    expect(map).toContain('meta={asset.id}')
    expect(cutscene).toContain('meta={entry.id}')
    expect(cutscene).toContain('title={editorAssetCatalogTitle(entry.record)}')
    expect(cutscene).not.toContain('entry.record.label || entry.id')
    expect(cutscene).not.toContain("entry.record.kind === 'video' ? '▶' : '▦'")
    expect(project).toContain('meta={entry.id}')
    expect(project).not.toContain("entry.id === manifest.defaultEntryId ? '🧭' : '🚪'")
    expect(editorCss).toContain(`.project-entry-item-content {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding-inline-end: var(--ds-space-2);
}`)
    expect(editorCss).toContain(`.enemy-catalog-row {
  content-visibility: auto;
  contain-intrinsic-size: var(--ds-catalog-row-height);
}`)
    expect(script).not.toContain('trailing={<DsTag tone="neutral">{script.body.length}</DsTag>}')
    expect(shop).toContain('key={x.id}')
    expect(shop).toContain('meta={String(x.id)}')
    expect(shop).toContain('onClick={() => selectShop(x.id)}')
    expect(spriteAction).not.toContain('title={`#${index} · ${candidate.label}`}')
    expect(variables).not.toContain("definition.kind === 'flag' ? '⚑' : '№'")
    expect(variables).not.toContain('leading={<span aria-hidden="true">!</span>}')
    expect(worldSprite).not.toContain('title={`#${index} · ${action.label}`}')
    expect(worldSprite).not.toContain('leading={<span aria-hidden="true">▦</span>}')
    expect(worldSprite).toContain('editorAssetCatalogTitle(assetRecord, entries[0]?.label)')
    expect(worldSprite).not.toContain("entries[0]?.label?.trim() || asset")
    expect(worldSprite).toContain('meta={asset}')
    expect(battleSprite).not.toContain('leading={<span aria-hidden="true">▦</span>}')
    expect(battleSprite).toContain('editorAssetCatalogTitle(assetRecord, entries[0]?.label)')
    expect(battleSprite).not.toContain("entries[0]?.label?.trim() || asset")
    expect(battleSprite).toContain('meta={asset}')
    expect(source('ImageTab.tsx')).toContain('title={editorAssetCatalogTitle(entry.record)}')
    expect(source('ImageTab.tsx')).not.toContain('entry.record.label || entry.id')

    const fakeObjectAliases = productionTsxFiles(uiRoot).flatMap((file) => {
      const matches = readFileSync(file, 'utf8').match(/(?:skill|enemy|team)\.pal\./g) ?? []
      return matches.map((match) => `${relative(uiRoot, file)}:${match}`)
    })
    expect(fakeObjectAliases).toEqual([])

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
