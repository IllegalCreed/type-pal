// Directed collision/connectivity diagnosis; not E2E or a walking trace.
import { readFileSync } from 'node:fs'
import { gridToPixel } from '../../../../packages/content/src/grid.ts'
import { isWalkable } from '../../../../packages/game/src/core/scene-system.ts'
import { buildIsBlocked } from '../../../../packages/reforge/src/collision.ts'
import { originalScripts } from './raw-source.mjs'

const root = new URL('../../../../', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))
const { commands, objects } = originalScripts()
const scenes = [225, 226, 249, 260, 285, 286, 281, 81]
const out = []
for (const sid of scenes) {
  const scene = read(`projects/pal/content/scenes/s${String(sid).padStart(3, '0')}.json`)
  const mid = Number(scene.mapId.slice(4))
  const map = read(`data/extracted/data/tilemap/${mid}.json`)
  const rfmap = read(`projects/pal/content/maps/${scene.mapId}.json`)
  const rfBlocked = buildIsBlocked(rfmap)
  const components = new Map(),
    sizes = []
  let collisionDifferences = 0
  for (let y = 7 * 16; y < 128 * 16; y += 8)
    for (let x = 5 * 32 + (y % 16 ? 16 : 0); x < 64 * 32; x += 32) {
      const native = isWalkable(map, x, y, [], 0, true)
      if (native === rfBlocked(x, y)) collisionDifferences++
      const key = `${x},${y}`
      if (!native || components.has(key)) continue
      const id = sizes.length,
        q = [[x, y]]
      components.set(key, id)
      for (let n = 0; n < q.length; n++)
        for (const [dx, dy] of [
          [16, 8],
          [16, -8],
          [-16, 8],
          [-16, -8],
        ]) {
          const [qx, qy] = q[n],
            nx = qx + dx,
            ny = qy + dy,
            k = `${nx},${ny}`
          if (!components.has(k) && isWalkable(map, nx, ny, [], 0, true)) {
            components.set(k, id)
            q.push([nx, ny])
          }
        }
      sizes.push(q.length)
    }
  const posInfo = (x, y) => ({
    x,
    y,
    walkable: isWalkable(map, x, y, [], 0, true),
    reforgeWalkable: !rfBlocked(x, y),
    component: components.get(`${x},${y}`) ?? null,
  })
  const entities = scene.entities.map((e) => {
    const p = gridToPixel(e.pos),
      o = objects[Number(e.id.slice(1))]
    return {
      id: e.id,
      sprite: e.sprite,
      hidden: e.hidden,
      trigger: o?.triggerLabel,
      state: o?.sState,
      ...posInfo(p.x, p.y),
    }
  })
  const ips = [30946, 30950, 31046, 34024, 34028, 34032, 35091, 35095]
  const landings = ips
    .filter((ip) => commands[ip].sceneId === sid + 1)
    .map((ip) => {
      const [col, row, h] = commands[ip + 1].operands
      return { ip, ...posInfo(col * 32 + h * 16, row * 16 + h * 8) }
    })
  const candidates =
    sid === 226
      ? [
          [30946, 34, 93, 1],
          [30950, 31, 88, 0],
          [31046, 53, 71, 0],
        ]
      : sid === 260 || sid === 286
        ? [[34024, 29, 51, 0]]
        : sid === 249 || sid === 285
          ? [[34028, 43, 38, 1]]
          : []
  out.push({
    sid,
    map: mid,
    sizes,
    collisionDifferences,
    entry: posInfo(...Object.values(gridToPixel(scene.entry.pos))),
    landings,
    candidates: candidates.map(([ip, c, r, h]) => ({
      ip,
      ...posInfo(c * 32 + h * 16, r * 16 + h * 8),
    })),
    entities,
  })
}
console.log(
  JSON.stringify(
    {
      kind: 'directed-production-collision-and-map-component-analysis',
      limits: [
        'Map-only 4-direction connectivity excludes dynamic NPC and trigger consequences; not a legal end-to-end save route.',
      ],
      scenes: out,
    },
    null,
    2,
  ),
)
