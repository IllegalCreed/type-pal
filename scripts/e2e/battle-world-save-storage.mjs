// Browser functions are passed unchanged into page.evaluate. The real IndexedDB
// APIs own reads and writes; test staging transfers separately isolated inputs.
export async function accessBattleSaveSlots({ engine, slots, stage }) {
  if (stage && (await indexedDB.databases()).length)
    throw new Error('expected isolated empty save storage')

  if (engine === 'game') {
    const { IndexedDbSave } = await import('/src/core/save/indexed-db.ts')
    const { serializeSave } = await import('/src/tools/save-io.ts')
    // Native IndexedDB snapshots retain Map entries and byte-array identity when
    // moved between isolated browser contexts. The portable export is a separate input.
    const tag = '__gameNativeSave'
    const encode = (_key, value) => {
      if (value instanceof Map) return { [tag]: 'Map', entries: [...value] }
      if (value instanceof Uint8Array) return { [tag]: 'Uint8Array', values: [...value] }
      if (value === undefined) return { [tag]: 'undefined' }
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (Object.hasOwn(value, tag) || Object.getPrototypeOf(value) !== Object.prototype)
          throw new Error('unexpected native Game slot value')
      }
      if (typeof value === 'number' && !Number.isFinite(value))
        throw new Error('unexpected native Game slot number')
      return value
    }
    const decode = (value) => {
      if (Array.isArray(value)) return value.map(decode)
      if (value === null || typeof value !== 'object') return value
      if (value[tag] === 'Map')
        return new Map(value.entries.map(([key, item]) => [decode(key), decode(item)]))
      if (value[tag] === 'Uint8Array') return Uint8Array.from(value.values)
      if (value[tag] === 'undefined') return undefined
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]))
    }
    if (stage) {
      for (const { slot, meta, payload } of stage)
        await IndexedDbSave.saveSlot(slot, decode(payload.gs), meta)
    }
    const records = []
    for (const slot of slots) {
      const entry = await IndexedDbSave.loadSlot(slot)
      if (entry) {
        // Keep the evidence envelope so world fields use the same paths as the checkpoint.
        const envelope = { ...JSON.parse(serializeSave(entry.gs)), gs: entry.gs }
        records.push({ meta: entry.meta, payload: JSON.parse(JSON.stringify(envelope, encode)) })
      } else records.push(null)
    }
    return records
  }

  const { IndexedDbSaveStore } = await import('/src/save/store.ts')
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'pal' })
  if (stage) {
    for (const { meta, payload, thumb } of stage) {
      await store.putSlot(
        meta,
        payload,
        new Blob([Uint8Array.from(thumb.bytes)], { type: thumb.type }),
      )
    }
  }
  const rows = await store.listMeta()
  const records = []
  for (const slot of slots) {
    const meta = rows.find(({ slotId }) => slotId === slot)
    if (!meta) {
      records.push(null)
      continue
    }
    const [payload, thumb] = await Promise.all([store.getPayload(slot), store.getThumb(slot)])
    if (!payload || !thumb) throw new Error('manual slot missing payload or thumbnail')
    records.push({
      meta,
      payload,
      thumb: { type: thumb.type, bytes: Array.from(new Uint8Array(await thumb.arrayBuffer())) },
    })
  }
  return records
}

export async function rejectCorruptGameImport(slot) {
  const { IndexedDbSave } = await import('/src/core/save/indexed-db.ts')
  const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
  const entry = await IndexedDbSave.loadSlot(slot)
  if (!entry) throw new Error('native source slot was not committed')
  const malformed = JSON.parse(serializeSave(entry.gs))
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
