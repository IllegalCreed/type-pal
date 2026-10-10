import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { parseIndexedRleChunk, parseSpriteChunk } from '../../packages/shared/src/rle.ts'
import { canonicalPosition } from './coordinate-evidence.mjs'
import { hashRepositoryFiles } from './evidence-dependencies.mjs'
import { originalSpriteNumber, spriteResource } from './game-pose-semantics.mjs'
import { renderedPoseEvidence } from './npc-transition-contract.mjs'
import { requireTrace, TraceObligation } from './trace-refinement.mjs'

/** Actual draw payload against independently loaded canonical resource bytes.
 * The codec is shared (not independently reimplemented); selection/identity and
 * raw-byte binding are independent of the draw/observer's resource-name claims.
 */
export async function checkSpriteResources(trace, engine, root) {
  const sources = {},
    files = new Map(),
    frameCounts = {}
  let draws = 0
  try {
    const primaryPath = 'reference/sdlpal/scene.c'
    Object.assign(sources, await hashRepositoryFiles(root, [primaryPath]))
    const primary = await readFile(resolve(root, primaryPath), 'utf8')
    assert(primary.includes('gpGlobals->rgParty[i].y + gpGlobals->wLayer + 10'))
    assert(primary.includes('gpGlobals->wLayer + 6);'))
    assert(primary.includes('PAL_Y(p->pos) - PAL_RLEGetHeight(p->lpSpriteFrame) - p->iLayer'))
    requireTrace(
      Array.isArray(trace.resources),
      'decoded-resource-evidence',
      'resource stream',
      trace.resources,
      'unknown',
    )
    const resources = new Map()
    for (const [index, resource] of trace.resources.entries()) {
      requireTrace(
        resource.seq === index &&
          Number.isSafeInteger(resource.order) &&
          !resources.has(resource.order),
        'resource-identity',
        'ordered unique resource',
        resource,
      )
      requireTrace(
        resource.kind === 'sprite-frame' &&
          Number.isSafeInteger(resource.width) &&
          resource.width > 0 &&
          Number.isSafeInteger(resource.height) &&
          resource.height > 0 &&
          Array.isArray(resource.pixels) &&
          Array.isArray(resource.opaque) &&
          resource.pixels.length === resource.width * resource.height &&
          resource.opaque.length === resource.pixels.length &&
          resource.pixels.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
          resource.opaque.every((n) => n === 0 || n === 1),
        'decoded-resource-payload',
        'complete indexed frame',
        resource,
      )
      resources.set(resource.order, resource)
    }
    let catalog = null
    if (engine === 'reforge') {
      const path = 'projects/pal/assets/index.json'
      const hashes = await hashRepositoryFiles(root, [path]),
        bytes = await readFile(resolve(root, path))
      assert.equal(
        createHash('sha256').update(bytes).digest('hex'),
        hashes[path],
        'catalog changed during read',
      )
      catalog = JSON.parse(bytes)
      Object.assign(sources, hashes)
    }
    const states = new Map()
    const actors = new Set(
      (trace.events ?? []).filter((e) => e.kind === 'actor-render').map((e) => e.id),
    )
    const drawn = [...actors].flatMap((id) =>
      renderedPoseEvidence(trace, id).map((e) => ({
        kind: 'actor-render',
        id,
        scene: e.scene,
        sceneVisit: e.sceneVisit,
        order: e.order,
        state: e,
      })),
    )
    const timeline = new Map(
      [
        ...(trace.initialEvents ?? []).filter((e) => e.kind === 'actor'),
        ...(trace.events ?? []).filter((e) => e.kind === 'actor'),
        ...drawn,
      ].map((e) => [`${e.sceneVisit}/${e.scene}/${e.id}/${e.kind}/${e.order}`, e]),
    )
    for (const event of [...timeline.values()].sort((a, b) => a.order - b.order)) {
      const key = `${event.sceneVisit}/${event.scene}/${event.id}`
      if (event.kind === 'actor') states.set(key, event.state)
      if (event.kind !== 'actor-render' || event.state.drawStatus !== 'drawn') continue
      const sprite = states.get(key)?.sprite,
        number = originalSpriteNumber(sprite)
      requireTrace(
        Number.isSafeInteger(number) && number > 0,
        'committed-sprite-resource',
        'preceding committed sprite',
        sprite,
        'unknown',
      )
      const record = catalog?.assets[spriteResource(sprite)]
      requireTrace(
        engine === 'game' || record?.kind === 'sprite',
        'resource-catalog',
        'canonical sprite record',
        record,
        'unknown',
      )
      const path =
        engine === 'game'
          ? `data/extracted/data/sprite/${number}.rle`
          : `projects/pal/${record.path}`
      if (!files.has(path)) {
        const hashes = await hashRepositoryFiles(root, [path]),
          bytes = await readFile(resolve(root, path))
        assert.equal(
          createHash('sha256').update(bytes).digest('hex'),
          hashes[path],
          'resource changed during read',
        )
        if (record) {
          requireTrace(
            hashes[path] === record.sha256 && bytes.byteLength === record.bytes,
            'canonical-resource-bytes',
            { sha256: record.sha256, bytes: record.bytes },
            { sha256: hashes[path], bytes: bytes.byteLength },
          )
        }
        const data = gunzipSync(bytes)
        files.set(
          path,
          engine === 'game'
            ? parseSpriteChunk(data)
            : parseIndexedRleChunk(
                data,
                record.origin.kind === 'legacy-migrated' ? 'legacy-migrated' : 'canonical',
              ).frames,
        )
        Object.assign(sources, hashes)
      }
      const frame = files.get(path)[event.state.frame],
        actual = resources.get(event.state.frameResourceId)
      frameCounts[spriteResource(sprite)] = files.get(path).length
      requireTrace(
        actual && actual.order < event.order,
        'draw-resource-binding',
        'earlier actual decoded frame',
        event,
        'unknown',
      )
      requireTrace(
        frame &&
          actual.width === frame.width &&
          actual.height === frame.height &&
          same(actual.pixels, Array.from(frame.pixels)) &&
          same(actual.opaque, Array.from(frame.opaque)),
        'draw-resource-pixels',
        { path, frame: event.state.frame },
        { order: event.order, resource: actual.order },
      )
      if (event.id === 'party') {
        const position = states.get(key)?.position
        requireTrace(
          Array.isArray(position) &&
            position.every(Number.isFinite) &&
            same(canonicalPosition(position), event.state.position),
          'party-draw-position-binding',
          'latest same-visit actor position',
          { position, drawn: event.state.position },
          'unknown',
        )
        const [a, b, height = 0] = position,
          x = engine === 'game' ? a : 16 * (a - b),
          y = engine === 'game' ? b : 8 * (a + b) - 16 * height,
          expected = [
            x - Math.floor(frame.width / 2),
            // Each engine's declared picture anchor, not cross-engine pixel identity.
            y + (engine === 'game' ? 4 : 7) - frame.height,
            frame.width,
            frame.height,
          ]
        requireTrace(
          same(event.state.geometry?.worldRect, expected),
          'party-draw-geometry',
          expected,
          event.state.geometry?.worldRect,
        )
      }
      draws++
    }
    requireTrace(draws > 0, 'resource-draw-coverage', 'actual NPC draws', draws, 'unknown')
    return {
      status: 'proved',
      model: 'draw-resource-bytes/v1',
      draws,
      resources: resources.size,
      sources,
      frameCounts,
    }
  } catch (error) {
    if (!(error instanceof TraceObligation)) throw error
    return {
      status: error.status,
      model: 'draw-resource-bytes/v1',
      draws,
      sources,
      witness: { rule: error.rule, expected: error.expected, actual: error.actual },
    }
  }
}
