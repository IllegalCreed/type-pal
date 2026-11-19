import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import * as publicApi from './index.js'
import * as overlays from './pal-authored-overlays.js'
import * as battleSprites from './pal-battle-sprites.js'
import * as shopProjection from './pal-shop-projection.js'
import { createPalWorldSpriteRegistry } from './pal-world-sprite-registry.js'
import * as facts from './source-facts.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const retired = [
  'item-script-roots',
  'legacy-dialog',
  'migrate-content',
  'migrate-enemies',
  'music-reference-audit',
  'pal-boss-overlay',
  'pal-migration-io',
  'pal-migration',
  'pal-palette-sites',
  'pal-sprite-action-census',
  'pal-sprite-action-materialize',
  'scene-entry-normalize',
  'scene-entry',
  'scene-migration-source-plan',
  'script-control-flow-audit',
  'script-graph',
  'script-library-audit',
  'script-library-normalize',
  'script-overlays',
  'sound-reference-audit',
  'translate-enemy-hook-flow',
  'translate-enemy-scripts',
  'translate-event-motion',
  'translate-events',
]
function retiredModuleRefs(source: string): string[] {
  const file = ts.createSourceFile('migration-module.ts', source, ts.ScriptTarget.Latest)
  const references: string[] = []
  function add(specifier: ts.Node | undefined): void {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return
    const name = specifier.text
      .split('/')
      .at(-1)
      ?.replace(/\.(?:[mc]?[jt]s)$/, '')
    if (name && retired.includes(name)) references.push(specifier.text)
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier)
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node.arguments[0])
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node.argument.literal)
    }
    ts.forEachChild(node, visit)
  }

  visit(file)
  return references
}
function implementationFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : implementationFiles(path)
    return /\.(ts|mts|mjs)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}
describe('original script conversion retirement', () => {
  it('removes exact implementation entries, public action exports and the action audit command', () => {
    for (const name of retired)
      expect(existsSync(resolve(packageRoot, 'src', `${name}.ts`)), name).toBe(false)
    expect(existsSync(resolve(packageRoot, 'scripts/audit-pal-sprite-actions.mts'))).toBe(false)
    const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts).not.toHaveProperty('audit:sprite-actions')
    expect(Object.keys(publicApi)).not.toContain('auditPalSpriteActions')
    expect(Object.keys(publicApi)).not.toContain('materializePalSpriteActions')
  })
  it('has no literal import, re-export or type reference to a retired kernel', () => {
    for (const path of [
      ...implementationFiles(resolve(packageRoot, 'src')),
      ...implementationFiles(resolve(packageRoot, 'scripts')),
    ])
      expect(retiredModuleRefs(readFileSync(path, 'utf8')), path).toEqual([])
    expect(retiredModuleRefs("import type { SourceRole } from './migrate-content.js'")).toEqual([
      './migrate-content.js',
    ])
    expect(retiredModuleRefs("const x = import('./pal-migration.js')")).toEqual([
      './pal-migration.js',
    ])
    expect(retiredModuleRefs("export * from './pal-sprite-action-census.js'")).toEqual([
      './pal-sprite-action-census.js',
    ])
  })
  it('finds literal side-effect and type imports while ignoring comments and strings', () => {
    const source = [
      "import './translate-events.js'",
      "type Source = import('./migrate-content.js').SourceRole",
      "// import './scene-entry.js'",
      `const text = "import './pal-migration.js'"`,
    ].join('\n')
    expect(retiredModuleRefs(source)).toEqual(['./translate-events.js', './migrate-content.js'])
  })
  it('does not retain retired profiles, full builders or script-number resolvers behind leaf APIs', () => {
    expect(Object.keys(overlays).sort()).toEqual(
      [
        'applyPalGeneratedCraftMessages',
        'applyPalGeneratedResourcePoolMessages',
        'applyPalItemOverlays',
      ].sort(),
    )
    expect(Object.keys(battleSprites)).toEqual(['palPlayerBattleSpriteDefinitionId'])
    expect(Object.keys(shopProjection)).toEqual(['migratePalShops'])
    expect(Object.keys(facts).sort()).toEqual(
      ['PAL_PLAYER_FACE_FRAME_BY_ROLE_ID', 'ROLE_SLUGS', 'sceneSlug'].sort(),
    )
    expect(Object.keys(createPalWorldSpriteRegistry([], new Map())).sort()).toEqual([
      'report',
      'spriteDefs',
      'spriteRef',
    ])
  })
})
