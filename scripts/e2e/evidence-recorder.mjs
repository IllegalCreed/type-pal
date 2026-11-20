export function evidenceObserverScript(install, causal) {
  return `(${install.toString()})(${causal ? causal.toString() : 'undefined'}, ${createEvidenceRecorder.toString()})`
}

/** Browser-serializable storage kernel. Adapters supply facts, never expected values. */
export function createEvidenceRecorder({ context, errors, onOverflow, budgets = {} }) {
  const limits = {
    events: 4 * 1024 * 1024,
    causes: 192 * 1024 * 1024,
    worldRenders: 24 * 1024 * 1024,
    atomicSnapshots: 8 * 1024 * 1024,
    resources: 16 * 1024 * 1024,
    ...budgets,
  }
  const used = Object.fromEntries(Object.keys(limits).map((key) => [key, 0]))
  const sizes = new WeakMap()
  const encoder = new TextEncoder()
  let order = 0,
    sealed = false
  const overflow = () => {
    sealed = true
    onOverflow()
  }
  const size = (value) => encoder.encode(JSON.stringify(value)).byteLength
  const groupFor = (value) =>
    value.kind === 'sprite-frame'
      ? 'resources'
      : value.kind === 'cause'
        ? 'causes'
        : value.kind === 'world-render'
          ? 'worldRenders'
          : Object.hasOwn(value, 'payload')
            ? 'atomicSnapshots'
            : 'events'
  const append = (list, value, limit = 16000) => {
    if (sealed) return
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('invalid evidence count limit')
    if (list.length >= limit) {
      overflow()
      return
    }
    // No caller may replace envelope identity with a copied seq/order.
    const event = {
      ...structuredClone(context(value)),
      ...structuredClone(value),
      seq: list.length,
      order,
    }
    const group = groupFor(event),
      bytes = size(event)
    if (used[group] + bytes > limits[group]) {
      overflow()
      return
    }
    used[group] += bytes
    order++
    list.push(event)
    sizes.set(event, { group, bytes })
    return event
  }
  // A repeated draw extends an existing span; growth consumes the same byte budget.
  // Detached exports cannot mutate live evidence, and caller-owned tail objects are cloned.
  const extend = (event, tail) => {
    if (sealed) return false
    const prior = sizes.get(event)
    if (!prior) throw new Error('cannot extend unrecorded evidence')
    for (const key of Object.keys(tail))
      if (!['throughRenderId', 'throughAtMs', 'throughOrder'].includes(key))
        throw new Error(`invalid render span field ${key}`)
    const copy = structuredClone(tail),
      bytes = size({ ...event, ...copy }),
      growth = bytes - prior.bytes
    if (used[prior.group] + growth > limits[prior.group]) {
      overflow()
      return false
    }
    used[prior.group] += growth
    Object.assign(event, copy)
    sizes.set(event, { ...prior, bytes })
    return true
  }
  const fail = (error) => {
    if (errors.length < 12) errors.push(String(error))
    else overflow()
  }
  // Keep the actual decoded pixels selected by the draw caller, not an asset-name claim.
  // A cached object is checked byte-for-byte on reuse, so in-place corruption is not hidden.
  const resources = [],
    frameReceipts = new WeakMap(),
    frameContents = new Map()
  const sameFrame = (receipt, frame, pixels, opaque) =>
    receipt.width === frame.width &&
    receipt.height === frame.height &&
    pixels.every((value, index) => value === receipt.pixels[index]) &&
    opaque.every((value, index) => value === receipt.opaque[index])
  globalThis.__e2eRecordSpriteFrame = (frame) => {
    try {
      const pixels = frame?.pixels ?? frame?.indices,
        opaque = frame?.opaque
      const count = frame?.width * frame?.height
      if (
        !Number.isSafeInteger(count) ||
        count <= 0 ||
        pixels?.length !== count ||
        opaque?.length !== count
      )
        throw new Error('drawn sprite has no complete decoded pixel payload')
      const previous = frameReceipts.get(frame)
      if (previous && sameFrame(previous, frame, pixels, opaque)) return previous.order
      // Palette/image rebuilds can wrap the same decoded pixels in different objects.
      // The fingerprint only selects candidates. Reuse always requires equal bytes.
      let fingerprint = 2166136261
      for (let i = 0; i < count; i++) {
        fingerprint = Math.imul(fingerprint ^ pixels[i], 16777619)
        fingerprint = Math.imul(fingerprint ^ opaque[i], 16777619)
      }
      const key = `${frame.width}:${frame.height}:${fingerprint}`
      const candidates = frameContents.get(key) ?? []
      const duplicate = candidates.find((candidate) => sameFrame(candidate, frame, pixels, opaque))
      if (duplicate) {
        frameReceipts.set(frame, duplicate)
        return duplicate.order
      }
      const receipt = append(
        resources,
        {
          kind: 'sprite-frame',
          atMs: performance.now(),
          width: frame.width,
          height: frame.height,
          pixels: Array.from(pixels),
          opaque: Array.from(opaque),
        },
        4096,
      )
      if (!receipt) return null
      frameReceipts.set(frame, receipt)
      candidates.push(receipt)
      frameContents.set(key, candidates)
      return receipt.order
    } catch (error) {
      fail(error)
      return null
    }
  }
  return {
    append,
    extend,
    fail,
    resources: () => resources,
    get nextOrder() {
      return order
    },
    byteSizes: () => ({ ...used }),
  }
}
