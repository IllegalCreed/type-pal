import { validateAssetCatalog } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { createEditorAssetReader } from './editor-asset-reader.js'
import { loadEditorSprite } from './sprite-assets.js'

test('the editor reuses recently decoded sprites and frees older cache entries', async () => {
  const { source, state } = await loadBoundaryProject()
  const registered = state.sprites.find(({ id }) => id === 'hero')
  if (!registered) throw new Error('blank project hero sprite missing')
  const record = state.assetCatalog.assets[registered.asset]
  if (!record) throw new Error('blank project hero asset missing')

  const ids = Array.from({ length: 97 }, (_, index) => `sprite.variation.${index}`)
  const assetCatalog = validateAssetCatalog({
    ...state.assetCatalog,
    assets: { ...state.assetCatalog.assets, ...Object.fromEntries(ids.map((id) => [id, record])) },
  })
  const reader = createEditorAssetReader(source, { ...state, assetCatalog })
  const oldestId = 'sprite.variation.0'
  const latestId = 'sprite.variation.96'
  const oldest = await loadEditorSprite(reader, oldestId)
  for (const id of ids.slice(1, -1)) await loadEditorSprite(reader, id)
  const latest = await loadEditorSprite(reader, latestId)

  expect(await loadEditorSprite(reader, latestId)).toBe(latest)
  const reloaded = await loadEditorSprite(reader, oldestId)
  expect(reloaded).not.toBe(oldest)
  expect(reloaded).toEqual(oldest)
})
