/** D03: real session batches and real proof factories, no forged brands/generations. */
import { validateTilesets } from '@type-pal/content'
import { expect, test } from 'vitest'
import { referenceProject } from '../__tests__/coverage-wave2/d-reference-project.js'
import { EditSession } from './edit-session.js'
import {
  assertTilesetRemovalAllowed,
  assertTilesetReplacementAllowed,
  TilesetRemovalProof,
  TilesetReplacementProof,
} from './tileset-references.js'

async function fixture() {
  const { state } = await referenceProject()
  const definition = state.tilesets?.[0]
  if (!definition) throw new Error('loader fixture must contain its original tileset')
  state.tilesets!.push({ ...definition, id: 'unused-alias', name: 'Alias' })
  validateTilesets(state.tilesets)
  const session = new EditSession(state)
  const batch = await session.ensureMapReferencesIndexed()
  expect(batch.done).toBe(true)
  expect(batch.failures).toEqual([])
  return { session, batch, definition }
}
test('removal proof rejects a real newer scan generation even when coverage and asset identities stay equal', async () => {
  const { session, batch } = await fixture()
  const proof = TilesetRemovalProof.fromBatch(batch, session.getState(), 'unused-alias')
  const current = (state: Parameters<EditSession['getCurrentMapReferenceBatch']>[0]) =>
    session.getCurrentMapReferenceBatch(state)
  expect(() =>
    assertTilesetRemovalAllowed(session.getState(), 'unused-alias', proof, current),
  ).not.toThrow()
  session.dispatch({
    label: 'Equivalent index replacement',
    apply: (state) => ({ ...state, mapIndex: structuredClone(state.mapIndex) }),
    invert: (state) => state,
  })
  const next = await session.ensureMapReferencesIndexed()
  expect(next.generation).not.toBe(batch.generation)
  expect(next.coverage).toEqual(batch.coverage)
  const before = structuredClone(session.getState())
  expect(() =>
    assertTilesetRemovalAllowed(session.getState(), 'unused-alias', proof, current),
  ).toThrow('地图引用事实已变化')
  expect(session.getState()).toEqual(before)
  const fresh = TilesetRemovalProof.fromBatch(next, session.getState(), 'unused-alias')
  expect(() =>
    assertTilesetRemovalAllowed(session.getState(), 'unused-alias', fresh, current),
  ).not.toThrow()
})
test('replacement proof snapshots the actual resource and rejects later metadata drift', async () => {
  const { session, batch, definition } = await fixture()
  const state = session.getState(),
    record = state.assetCatalog.assets[definition.asset]!
  const definitions = state.tilesets!.filter((value) => value.asset === definition.asset)
  const proof = TilesetReplacementProof.fromBatch(batch, definition.id, 10000, {
    asset: definition.asset,
    previousRecord: record,
    definitions,
  })
  const current = (value: typeof state) => session.getCurrentMapReferenceBatch(value)
  expect(() =>
    assertTilesetReplacementAllowed(state, definition.id, definition.asset, proof, current),
  ).not.toThrow()
  session.dispatch({
    label: 'Change asset label',
    apply: (s) => ({
      ...s,
      assetCatalog: {
        ...s.assetCatalog,
        assets: { ...s.assetCatalog.assets, [definition.asset]: { ...record, label: 'changed' } },
      },
    }),
    invert: () => state,
  })
  const before = structuredClone(session.getState())
  expect(() =>
    assertTilesetReplacementAllowed(
      session.getState(),
      definition.id,
      definition.asset,
      proof,
      current,
    ),
  ).toThrow('瓦片集资源已变化')
  expect(proof.previousRecord).toEqual(record)
  expect(session.getState()).toEqual(before)
})
