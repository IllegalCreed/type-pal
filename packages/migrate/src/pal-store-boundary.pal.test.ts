import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAuthorItems, validateShops } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import {
  assertPalAlchemyBoundaryInvariant,
  assertPalStoreBoundaryInvariant,
} from './pal-store-boundary.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))

test('actual store seed matches the source and both PAL snapshots retain Store0 alchemy', () => {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('Expected the actual PAL baseline')
  const { stores: sourceStores } = loadPalContentSupplySources(repo)
  const seedShops = validateShops(baseline.files.get('content/shops.json'))
  const seedItems = validateAuthorItems(baseline.files.get('content/items.json'))
  const currentItems = validateAuthorItems(
    JSON.parse(readFileSync(resolve(repo, 'projects/pal/content/items.json'), 'utf8')),
  )

  expect(seedShops.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1))
  expect(() =>
    assertPalStoreBoundaryInvariant({ sourceStores, shops: seedShops, items: seedItems }),
  ).not.toThrow()
  expect(() =>
    assertPalAlchemyBoundaryInvariant({ sourceStores, items: currentItems }),
  ).not.toThrow()
})
