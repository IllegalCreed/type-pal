import { fileURLToPath } from 'node:url'
import { validateSprites } from '@type-pal/content'
import { beforeAll, expect, test } from 'vitest'
import { loadPalBaseline, type MigrationSnapshot } from './migration-baseline.js'
import type { PalContentSupplySources } from './pal-content-supply.js'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import { buildPalCurrentPublication } from './pal-current-publication.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))
let baseline: MigrationSnapshot
let sources: PalContentSupplySources

beforeAll(() => {
  const snapshot = loadPalBaseline(repo)
  if (!snapshot) throw new Error('PAL publication baseline is missing')
  baseline = snapshot
  sources = loadPalContentSupplySources(repo)
})

test('publishes the existing directional layout', () => {
  const publication = buildPalCurrentPublication(baseline, sources)
  expect(
    validateSprites(publication.files.get('content/sprites.json')).find(
      ({ id }) => id === 'li-xiaoyao',
    )?.layout,
  ).toEqual({ kind: 'directional', framesPerDir: 3 })
})

test('publishes the same directional layout with reversed author JSON key order', () => {
  const scratch = structuredClone(baseline)
  const sprites = validateSprites(scratch.files.get('content/sprites.json'))
  const hero = sprites.find(({ id }) => id === 'li-xiaoyao')
  if (hero?.layout.kind !== 'directional')
    throw new Error('Expected the canonical directional hero')
  hero.layout = { framesPerDir: hero.layout.framesPerDir, kind: 'directional' }
  validateSprites(sprites)
  const publication = buildPalCurrentPublication(scratch, sources)
  expect(
    validateSprites(publication.files.get('content/sprites.json')).find(
      ({ id }) => id === 'li-xiaoyao',
    )?.layout,
  ).toEqual({ kind: 'directional', framesPerDir: 3 })
})
