/** JSON-value DAG: identical containers are stored once; every field, key order
 * and array entry remains represented. References only point backwards. This
 * function is self-contained so the recorder and offline reader use one codec. */
export function createSnapshotGraph({ maxBytes = 128 * 1024 * 1024, maxNodes = 1000000 } = {}) {
  const nodes = [],
    keys = new Map(),
    encoder = new TextEncoder(),
    lastFields = new Map()
  let bytes = 0
  const intern = (value) => {
    if (value === null || typeof value !== 'object') return value
    const node = Array.isArray(value)
      ? ['a', value.map(intern)]
      : ['o', Object.entries(value).map(([key, item]) => [key, intern(item)])]
    const key = JSON.stringify(node)
    if (keys.has(key)) return { ref: keys.get(key) }
    const size = encoder.encode(key).byteLength
    if (bytes + size > maxBytes || nodes.length >= maxNodes)
      throw new Error('snapshot graph capacity exceeded')
    const ref = nodes.length
    nodes.push(node)
    keys.set(key, ref)
    bytes += size
    return { ref }
  }
  const pack = (event) => {
    if (Object.hasOwn(event, 'snapshotRefs')) throw new Error('reserved snapshotRefs field')
    const packed = { ...event },
      snapshotRefs = {}
    for (const field of ['world', 'poses', 'lifecycle']) {
      if (!Object.hasOwn(event, field)) continue
      // Match the ordinary persisted JSON contract, including absent undefined
      // object properties and null array slots; never infer a missing field.
      const json = JSON.stringify(event[field])
      if (json !== undefined) {
        const last = lastFields.get(field),
          ref = last?.json === json ? last.ref : intern(JSON.parse(json))
        lastFields.set(field, { json, ref })
        snapshotRefs[field] = ref
      }
      delete packed[field]
    }
    return { ...packed, snapshotRefs }
  }
  const unpack = (records, sourceNodes) => {
    if (!Array.isArray(records) || !Array.isArray(sourceNodes))
      throw new Error('invalid snapshot graph')
    if (sourceNodes.length > maxNodes) throw new Error('snapshot graph capacity exceeded')
    let decodedBytes = 0
    for (const node of sourceNodes) {
      decodedBytes += encoder.encode(JSON.stringify(node)).byteLength
      if (decodedBytes > maxBytes) throw new Error('snapshot graph capacity exceeded')
    }
    const values = []
    const value = (item) => {
      if (
        item === null ||
        ['string', 'boolean'].includes(typeof item) ||
        (typeof item === 'number' && Number.isFinite(item))
      )
        return item
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        Object.keys(item).length !== 1 ||
        !Number.isSafeInteger(item.ref) ||
        item.ref < 0 ||
        item.ref >= values.length
      )
        throw new Error('invalid or forward snapshot reference')
      return values[item.ref]
    }
    for (const node of sourceNodes) {
      if (!Array.isArray(node) || node.length !== 2 || !Array.isArray(node[1]))
        throw new Error('invalid snapshot node')
      if (node[0] === 'a') values.push(Object.freeze(node[1].map(value)))
      else if (node[0] === 'o') {
        const seen = new Set()
        values.push(
          Object.freeze(
            Object.fromEntries(
              node[1].map((entry) => {
                if (
                  !Array.isArray(entry) ||
                  entry.length !== 2 ||
                  typeof entry[0] !== 'string' ||
                  seen.has(entry[0])
                )
                  throw new Error('invalid snapshot property')
                seen.add(entry[0])
                return [entry[0], value(entry[1])]
              }),
            ),
          ),
        )
      } else throw new Error('unknown snapshot node kind')
    }
    return Object.freeze(
      records.map((event) => {
        const { snapshotRefs, ...plain } = event
        if (!snapshotRefs || typeof snapshotRefs !== 'object' || Array.isArray(snapshotRefs))
          throw new Error('missing snapshot references')
        for (const [field, ref] of Object.entries(snapshotRefs)) {
          if (!['world', 'poses', 'lifecycle'].includes(field) || Object.hasOwn(plain, field))
            throw new Error('conflicting snapshot field')
          plain[field] = value(ref)
        }
        return Object.freeze(plain)
      }),
    )
  }
  const expandProgress = (events) => {
    let previous = null
    return Object.freeze(
      events.map((event) => {
        if (event.kind !== 'progress') return Object.freeze(event)
        const { delta, ...base } = event,
          next = { ...(previous ?? {}) }
        if (!delta || Object.hasOwn(base, 'before') || Object.hasOwn(base, 'state'))
          throw new Error('invalid compact progress')
        if (Object.keys(delta).some((field) => !['money', 'persistent', 'hooks'].includes(field)))
          throw new Error('unsupported progress field')
        if (Object.hasOwn(delta, 'money')) next.money = delta.money
        for (const field of ['persistent', 'hooks']) {
          const patch = delta[field]
          if (!patch) continue
          if (
            !patch.set ||
            typeof patch.set !== 'object' ||
            Array.isArray(patch.set) ||
            !Array.isArray(patch.removed) ||
            patch.removed.some((key) => typeof key !== 'string') ||
            Object.keys(patch).some((key) => !['set', 'removed'].includes(key))
          )
            throw new Error('invalid progress patch')
          next[field] = { ...(next[field] ?? {}), ...patch.set }
          for (const key of patch.removed) delete next[field][key]
          Object.freeze(next[field])
        }
        const result = Object.freeze({ ...base, before: previous, state: Object.freeze(next) })
        previous = next
        return result
      }),
    )
  }
  const compactProgress = (events) =>
    events.map((event) => {
      if (event.kind !== 'progress') return event
      const { before, state, ...base } = event,
        delta = {}
      if (
        !state ||
        Object.keys(state).some((field) => !['money', 'persistent', 'hooks'].includes(field)) ||
        Object.keys(before ?? {}).some((field) => !Object.hasOwn(state, field))
      )
        throw new Error('unsupported progress field')
      for (const field of ['money', 'persistent', 'hooks']) {
        if (JSON.stringify(before?.[field]) === JSON.stringify(state[field])) continue
        if (field === 'money') {
          delta.money = state.money
          continue
        }
        const old = before?.[field] ?? {},
          next = state[field] ?? {}
        delta[field] = {
          set: Object.fromEntries(
            Object.entries(next).filter(
              ([key, item]) => JSON.stringify(old[key]) !== JSON.stringify(item),
            ),
          ),
          removed: Object.keys(old).filter((key) => !Object.hasOwn(next, key)),
        }
      }
      return { ...base, delta }
    })
  return {
    pack,
    unpack,
    expandProgress,
    compactProgress,
    nodes,
    stats: () => ({ bytes, nodes: nodes.length, maxBytes, maxNodes }),
  }
}
