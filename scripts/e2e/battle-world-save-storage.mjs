// Browser functions are passed unchanged into page.evaluate. Storage APIs remain the production
// readers. Only transfer between two isolated browser contexts and the deliberate fault write.
export async function readStoredBattleSave({ engine, slot }) {
  if (engine === 'game') {
    const { IndexedDbSave } = await import('/src/core/save/indexed-db.ts')
    const { serializeSave } = await import('/src/tools/save-io.ts')
    const entry = await IndexedDbSave.loadSlot(slot)
    return entry ? { meta: entry.meta, payload: JSON.parse(serializeSave(entry.gs)) } : null
  }
  const { IndexedDbSaveStore } = await import('/src/save/store.ts')
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'pal' })
  const meta = (await store.listMeta()).find(({ slotId }) => slotId === slot)
  if (!meta) return null
  const [payload, thumb] = await Promise.all([store.getPayload(slot), store.getThumb(slot)])
  if (!payload || !thumb) throw new Error('manual slot missing payload or thumbnail')
  return {
    meta,
    payload,
    thumb: { type: thumb.type, bytes: Array.from(new Uint8Array(await thumb.arrayBuffer())) },
  }
}

export async function stageBattleSaves({ engine, records }) {
  if ((await indexedDB.databases()).length) throw new Error('expected isolated empty save storage')
  if (engine === 'game') {
    const { IndexedDbSave } = await import('/src/core/save/indexed-db.ts')
    const { parseImportedSave } = await import('/src/tools/save-io.ts')
    for (const { slot, meta, payload } of records) {
      const checked = parseImportedSave(JSON.stringify(payload))
      await IndexedDbSave.saveSlot(slot, checked, meta)
    }
  } else {
    const { IndexedDbSaveStore } = await import('/src/save/store.ts')
    const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'pal' })
    for (const { meta, payload, thumb } of records) {
      await store.putSlot(
        meta,
        payload,
        new Blob([Uint8Array.from(thumb.bytes)], { type: thumb.type }),
      )
    }
  }
}

export async function rejectCorruptGameImport(record) {
  const malformed = structuredClone(record.payload)
  const { parseImportedSave } = await import('/src/tools/save-io.ts')
  malformed.gs.dwCash = 'corrupt-cash'
  try {
    parseImportedSave(JSON.stringify(malformed))
  } catch (error) {
    return String(error)
  }
  throw new Error('Game portable save imported a nonnumeric cash value')
}

export async function seedCorruptBattleSlot({ engine, slot, record }) {
  if (engine === 'game') {
    const { IndexedDbSave } = await import('/src/core/save/indexed-db.ts')
    const source = await IndexedDbSave.loadSlot(record.slot)
    if (!source) throw new Error('native source slot was not committed')
    const malformed = { ...source.gs, dwCash: 'corrupt-cash' }
    await IndexedDbSave.saveSlot(slot, malformed, source.meta)
    return { field: 'gs.dwCash', value: malformed.dwCash }
  }
  const malformed = structuredClone(record.payload)
  const { IndexedDbSaveStore } = await import('/src/save/store.ts')
  malformed.world.money = 'corrupt-cash'
  const meta = { ...record.meta, slotId: slot }
  const thumb = new Blob([Uint8Array.from(record.thumb.bytes)], { type: record.thumb.type })
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'pal' })
  await store.putSlot(meta, malformed, thumb)
  return { field: 'world.money', value: malformed.world.money }
}
