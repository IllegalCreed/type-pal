import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { buildPalContentSupply } from './pal-content-supply.js'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import { buildPalCurrentPublication } from './pal-current-publication.js'

vi.mock('./pal-migration.js', () => {
  throw new Error('full migration loaded')
})
vi.mock('./migrate-content.js', () => {
  throw new Error('full translator loaded')
})
vi.mock('./pal-migration-io.js', () => {
  throw new Error('full source loader loaded')
})

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const roots: string[] = []
const omitted = new Set([
  'level-up-magic.json',
  'spells.json',
  'magic.json',
  'object-magics.json',
  'enemies.json',
  'enemy-objects.json',
  'enemy-teams.json',
  'battle-effect-index.json',
  'battle-fields.json',
  'object-poisons.json',
])

function narrowRepo(): string {
  const temporary = mkdtempSync(resolve(tmpdir(), 'type-pal-supply-source-'))
  roots.push(temporary)
  const original = resolve(repo, 'data/extracted')
  const target = resolve(temporary, 'data/extracted')
  mkdirSync(resolve(target, 'data'), { recursive: true })
  mkdirSync(resolve(target, 'events'), { recursive: true })
  mkdirSync(resolve(temporary, 'packages/reforge/public'), { recursive: true })
  symlinkSync(
    resolve(repo, 'packages/reforge/public/soundfont.sf3'),
    resolve(temporary, 'packages/reforge/public/soundfont.sf3'),
  )
  for (const name of readdirSync(original)) {
    if (name === 'data' || name === 'events') continue
    symlinkSync(resolve(original, name), resolve(target, name))
  }
  for (const name of readdirSync(resolve(original, 'data'))) {
    if (omitted.has(name)) continue
    symlinkSync(resolve(original, 'data', name), resolve(target, 'data', name))
  }
  symlinkSync(resolve(original, 'events/all.json'), resolve(target, 'events/all.json'))
  return temporary
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('PAL supply input boundary', () => {
  it('loads and publishes without skills, enemy AI or scene event inputs, while full modules throw', () => {
    const temporary = narrowRepo()
    expect(existsSync(resolve(temporary, 'data/extracted/data/spells.json'))).toBe(false)
    expect(readdirSync(resolve(temporary, 'data/extracted/events'))).toEqual(['all.json'])
    const sources = loadPalContentSupplySources(temporary)
    expect(Object.keys(sources.migrate).sort()).toEqual([
      'commands',
      'items',
      'levelUpExp',
      'roles',
    ])
    const supply = buildPalContentSupply(sources)
    expect(supply.files.size).toBe(228)
    const publication = buildPalCurrentPublication(loadPalBaseline(repo)!, sources)
    expect(publication.mapReport.mapCount).toBe(223)
  })

  it.each([
    'events/all.json',
    'data/player-roles.json',
    'data/level-up-exp.json',
    'data/items.json',
    'data/object-players.json',
    'data/music-manifest.json',
    'data/stores.json',
    'data/scene',
    'data/tilemap',
    'data/palette',
    'asset-manifest.json',
  ])('fails when required real source input %s is absent', (path) => {
    const temporary = narrowRepo()
    const target = resolve(temporary, 'data/extracted', path)
    expect(lstatSync(target).isSymbolicLink()).toBe(true)
    unlinkSync(target)
    expect(() => loadPalContentSupplySources(temporary)).toThrow()
  })

  it('proves native Node runtime reachability excludes every complete conversion entry', () => {
    const result = execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '--eval',
        `
      import { registerHooks } from 'node:module';
      const forbidden = new Set(['migrate-content.ts', 'pal-migration.ts', 'pal-migration-io.ts', 'translate-events.ts', 'migrate-enemies.ts', 'script-graph.ts']);
      const loaded = [];
      registerHooks({ resolve(specifier, context, nextResolve) {
        const result = nextResolve(specifier, context);
        const name = result.url.split('/').at(-1);
        if (forbidden.has(name)) throw new Error('forbidden runtime dependency: ' + result.url);
        if (result.url.includes('/packages/migrate/')) loaded.push(name);
        return result;
      }});
      const { loadPalContentSupplySources } = await import('./packages/migrate/src/pal-content-supply-io.ts');
      const { buildPalCurrentPublication } = await import('./packages/migrate/src/pal-current-publication.ts');
      const { loadPalBaseline } = await import('./packages/migrate/src/migration-baseline.ts');
      const sources = loadPalContentSupplySources(process.cwd());
      const publication = buildPalCurrentPublication(loadPalBaseline(process.cwd()), sources);
      process.stdout.write(JSON.stringify({ files: publication.files.size, loaded }));
    `,
      ],
      { cwd: repo, encoding: 'utf8', timeout: 120_000 },
    )
    const runtime = JSON.parse(result) as { files: number; loaded: string[] }
    expect(runtime.files).toBe(537)
    expect(runtime.loaded).toContain('pal-world-sprite-registry.ts')
    expect(runtime.loaded).toContain('pal-item-message-source.ts')
    expect(runtime.loaded).not.toContain('migrate-content.ts')
  })
})
