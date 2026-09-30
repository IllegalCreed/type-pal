import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as publicApi from './index.js'
import * as overlays from './pal-authored-overlays.js'
import * as battleSprites from './pal-battle-sprites.js'
import * as derived from './pal-derived-content.js'
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
const oldImports = (body: string): string[] =>
  [...body.matchAll(/(?:from\s*|import\s*\(\s*|export\s*\*\s*from\s*)['"]([^'"]+)['"]/g)]
    .map((match) => match[1]!)
    .filter((path) =>
      retired.includes(
        path
          .split('/')
          .at(-1)!
          .replace(/\.(js|ts)$/, ''),
      ),
    )
function implementationFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : implementationFiles(path)
    return /\.(ts|mts)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
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
  it('has no runtime, re-export or type-only import edge to a retired kernel', () => {
    for (const path of [
      ...implementationFiles(resolve(packageRoot, 'src')),
      ...implementationFiles(resolve(packageRoot, 'scripts')),
    ])
      expect(oldImports(readFileSync(path, 'utf8')), path).toEqual([])
    expect(oldImports("import type { SourceRole } from './migrate-content.js'")).toEqual([
      './migrate-content.js',
    ])
    expect(oldImports("const x = import('./pal-migration.js')")).toEqual(['./pal-migration.js'])
    expect(oldImports("export * from './pal-sprite-action-census.js'")).toEqual([
      './pal-sprite-action-census.js',
    ])
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
    expect(Object.keys(derived)).toEqual(['migratePalShops'])
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
