import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual as same } from 'node:util'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

/** Independent scene/map inputs, never bounds reported by the camera under test. */
export function cameraProfile(scene, engine) {
  requireTrace(
    /^s\d{3}$/u.test(scene),
    'camera-scene-input',
    'canonical scene ID',
    scene,
    'unknown',
  )
  const sources = {}
  const read = (path) => {
    const bytes = readFileSync(new URL(`../../${path}`, import.meta.url))
    sources[path] = createHash('sha256').update(bytes).digest('hex')
    return JSON.parse(bytes)
  }
  const definition = read(
    engine === 'game'
      ? `data/extracted/data/scene/${Number(scene.slice(1))}.json`
      : `projects/pal/content/scenes/${scene}.json`,
  )
  const map = read(
    engine === 'game'
      ? `data/extracted/data/tilemap/${definition.mapNum}.json`
      : `projects/pal/content/maps/${definition.mapId}.json`,
  )
  requireTrace(
    [map.width, map.height].every((n) => Number.isSafeInteger(n) && n > 0),
    'camera-map-size',
    'positive canonical map dimensions',
    map,
    'unknown',
  )
  return {
    limits:
      engine === 'game'
        ? [
            [0, (map.width - 1) * 32],
            [0, (map.height - 1) * 16],
          ]
        : [
            [-32, Math.max(-32, map.width * 32 - 288)],
            [-40, Math.max(-40, map.height * 16 - 184)],
          ],
    sources,
  }
}

/** Declared follow-camera contract for stories without authored pans.
 * Compare every actual view against independently committed party coordinates. Computing a
 * cull rectangle from the same camera cannot validate that camera. This obligation can.
 * This is not a camera model for all games/scenes; another profile must explicitly model pans.
 */
export function checkFollowCamera(trace, engine, profileFor = cameraProfile) {
  const start = trace.renderScope?.afterOrder,
    end = trace.renderScope?.throughOrder
  if (
    !Array.isArray(trace.events) ||
    !Array.isArray(trace.worldRenders) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  )
    return { status: 'unknown', model: 'follow-camera/v1', reason: 'unscoped camera evidence' }
  const events = [
    ...trace.events
      .filter((e) => e.kind === 'actor' && e.id === 'party' && e.order <= end)
      .map((e) => ({ ...e, type: 'party' })),
    ...trace.worldRenders
      .filter((e) => e.order > start && e.order <= end)
      .map((e) => ({ ...e, type: 'draw' })),
  ].sort((a, b) => a.order - b.order)
  const profiles = new Map(),
    sources = {}
  const proof = checkTransitionTrace(
    {
      id: 'follow-camera/v1',
      initial: { party: {}, draws: 0 },
      transitions: {
        party: (s, e) => {
          const p = e.state?.position
          requireTrace(
            ['game', 'reforge'].includes(engine) &&
              Array.isArray(p) &&
              p.length === (engine === 'game' ? 2 : 3) &&
              p.every(Number.isFinite) &&
              (engine === 'game' || p[2] === 0),
            'camera-party-coordinates',
            'pixel pair or ground-plane grid triple',
            p,
            'unknown',
          )
          s.party[`${e.scene}/${e.sceneVisit}`] = {
            order: e.order,
            pixel: engine === 'game' ? p : [16 * (p[0] - p[1]), 8 * (p[0] + p[1])],
          }
          return s
        },
        draw: (s, e) => {
          const party = s.party[`${e.scene}/${e.sceneVisit}`]
          requireTrace(
            party && party.order < e.order,
            'camera-party-commit',
            'same-visit preceding party commit',
            party,
            'unknown',
          )
          const v = e.view,
            matrix = v?.transform,
            scale = matrix?.[0]
          requireTrace(
            Number.isFinite(scale) &&
              scale > 0 &&
              (engine !== 'game' || scale === 1) &&
              same(matrix, [scale, 0, 0, scale, 0, 0]) &&
              same(v.canvasSize, [320 * scale, 200 * scale]),
            'native-viewport-projection',
            '320x200 logical viewport with positive uniform scale',
            v,
          )
          const camera = Array.isArray(v.camera) ? v.camera : [v.camera?.x, v.camera?.y]
          if (!profiles.has(e.scene)) {
            const profile = profileFor(e.scene, engine)
            profiles.set(e.scene, profile)
            Object.assign(sources, profile.sources)
          }
          const { limits } = profiles.get(e.scene)
          requireTrace(
            Array.isArray(limits) &&
              limits.length === 2 &&
              limits.every(
                (v) =>
                  Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && v[0] <= v[1],
              ),
            'camera-bounds',
            'finite canonical limits',
            limits,
            'unknown',
          )
          const expected = [party.pixel[0] - 160, party.pixel[1] - 112].map((v, i) =>
            Math.max(limits[i][0], Math.min(limits[i][1], v)),
          )
          requireTrace(
            same(camera, expected),
            'camera-follows-party',
            { camera: expected, partyCommit: party.order },
            { camera, renderId: e.renderId },
          )
          s.draws++
          return s
        },
      },
      accept: (s) =>
        requireTrace(s.draws > 0, 'camera-draw-evidence', 'actual views', s.draws, 'unknown'),
    },
    events,
  )
  return { ...proof, sources }
}
