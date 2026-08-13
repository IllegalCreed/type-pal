import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GridPos, ProjectMap, WalkSpeed } from '@type-pal/content'
import { isBlockedAt } from '../src/collision.js'
import { motionTerrainSweepBlocked } from '../src/entity-motion.js'
import { walkTick } from '../src/entity-walk.js'

type JsonObject = Record<string, unknown>

interface RawScene extends JsonObject {
  id: string
  mapId: string
  entities?: RawEntity[]
}

interface RawEntity extends JsonObject {
  id: string
  pos: GridPos
  collide?: boolean
  initialPage?: string
  pages?: Array<JsonObject & { id?: string; auto?: unknown }>
  behaviors?: { auto?: Record<string, unknown> }
}

interface CommandHit {
  command: JsonObject
  path: string
}

const repo = resolve(import.meta.dirname, '../../..')
const sceneDir = resolve(repo, 'projects/pal/content/scenes')
const mapDir = resolve(repo, 'projects/pal/content/maps')
const motionKinds = new Set(['moveEntity', 'stepEntity', 'nudgeEntity', 'chasePlayer'])

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined
}

function visitCommands(value: unknown, path: string, hits: CommandHit[]): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      visitCommands(child, `${path}.${index}`, hits)
    })
    return
  }
  const candidate = object(value)
  if (!candidate) return
  if (typeof candidate.kind === 'string') hits.push({ command: candidate, path })
  for (const [key, child] of Object.entries(candidate)) visitCommands(child, `${path}.${key}`, hits)
}

function requiredArrayValue<T>(values: readonly T[], index: number, context: string): T {
  const value = values[index]
  if (value === undefined) throw new Error(`audit:entity-motion 缺少 ${context}`)
  return value
}

function containsMotion(value: unknown): boolean {
  const hits: CommandHit[] = []
  visitCommands(value, 'flow', hits)
  return hits.some(({ command }) => motionKinds.has(String(command.kind)))
}

function targetEntity(command: JsonObject, fallback: string): string {
  return String(object(command.target)?.entity ?? command.entity ?? fallback)
}

function commandPos(command: JsonObject): GridPos | undefined {
  const to = object(command.to)
  if (!to || typeof to.col !== 'number' || typeof to.row !== 'number') return undefined
  return { col: to.col, row: to.row, height: typeof to.height === 'number' ? to.height : 0 }
}

function firstBlockedRuntimeStep(
  map: ProjectMap,
  from: GridPos,
  to: GridPos,
  speed: WalkSpeed,
): { from: GridPos; proposed: GridPos; tick: number } | undefined {
  let cursor = from
  for (let tick = 1; tick <= 100_000; tick++) {
    const proposal = walkTick(cursor, to, speed)
    if (
      motionTerrainSweepBlocked(cursor, proposal.pos, [{ dcol: 0, drow: 0 }], (pos) =>
        isBlockedAt(map, pos),
      )
    )
      return { from: cursor, proposed: proposal.pos, tick }
    cursor = proposal.pos
    if (proposal.done) return undefined
  }
  throw new Error(`walkTick 未在 100000 tick 内收敛: ${JSON.stringify({ from, to, speed })}`)
}

function currentAutoBehavior(entity: RawEntity): unknown {
  const pages = entity.pages ?? []
  const page = pages.find((candidate) => candidate.id === entity.initialPage) ?? pages[0]
  const binding = page?.auto
  if (typeof binding === 'string') return entity.behaviors?.auto?.[binding]
  return binding
}

function currentAutoBehaviorId(entity: RawEntity): string | undefined {
  const pages = entity.pages ?? []
  const page = pages.find((candidate) => candidate.id === entity.initialPage) ?? pages[0]
  return typeof page?.auto === 'string' ? page.auto : undefined
}

function stableCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}

const sceneFiles = readdirSync(sceneDir)
  .filter((name) => /^s\d{3}\.json$/.test(name))
  .sort()
const scenes = sceneFiles.map((name) => json<RawScene>(resolve(sceneDir, name)))
const maps = new Map<string, ProjectMap>()
const sceneMap = (scene: RawScene): ProjectMap => {
  const cached = maps.get(scene.mapId)
  if (cached) return cached
  const loaded = json<ProjectMap>(resolve(mapDir, `${scene.mapId}.json`))
  maps.set(scene.mapId, loaded)
  return loaded
}

let enabledAutoEntities = 0
let registryMovers = 0
let registrySolidMovers = 0
let pageEnabledMovers = 0
let pageEnabledSolidMovers = 0
let currentMovers = 0
let currentSolidMovers = 0
const selectorReferences = new Map<string, JsonObject[]>()
const entityKindSets = new Map<string, Set<string>>()
const entityKindOwners = new Map<string, Set<string>>()
const solidEntityKindSets = new Map<string, Set<string>>()
const commandCounts = new Map<string, number>()
const endpointTerrainBlocked: JsonObject[] = []
const segmentTerrainBlocked: JsonObject[] = []
const initialSolidOverlaps: JsonObject[] = []
const chasePlayerSites: JsonObject[] = []
const registryMoverRecords: Array<{
  scene: string
  entity: string
  solid: boolean
  pageEnabled: boolean
  behaviors: string[]
}> = []
const unknownOriginMoves: JsonObject[] = []

for (const scene of scenes) {
  const map = sceneMap(scene)
  const sceneCommandHits: CommandHit[] = []
  visitCommands(scene, `scene.${scene.id}`, sceneCommandHits)
  for (const { command, path } of sceneCommandHits) {
    if (command.kind !== 'selectEntityBehavior' || command.channel !== 'auto') continue
    const selection = object(command.selection)
    const target = object(command.target)
    if (selection?.kind !== 'use' || typeof selection.value !== 'string') continue
    const targetScene = String(target?.scene ?? scene.id)
    const targetEntityId = String(target?.entity ?? '')
    if (!targetEntityId) continue
    const key = `${targetScene}/${targetEntityId}/${selection.value}`
    const refs = selectorReferences.get(key) ?? []
    refs.push({ sourceScene: scene.id, path })
    selectorReferences.set(key, refs)
  }
  const solids = (scene.entities ?? []).filter((entity) => entity.collide === true)
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const a = requiredArrayValue(solids, i, `${scene.id} solid ${i}`)
      const b = requiredArrayValue(solids, j, `${scene.id} solid ${j}`)
      if (Math.max(Math.abs(a.pos.col - b.pos.col), Math.abs(a.pos.row - b.pos.row)) < 1)
        initialSolidOverlaps.push({ scene: scene.id, actors: [a.id, b.id], a: a.pos, b: b.pos })
    }
  }

  for (const entity of scene.entities ?? []) {
    for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.auto ?? {})) {
      const hits: CommandHit[] = []
      visitCommands(behavior, `behaviors.auto.${behaviorId}`, hits)
      for (const { command, path } of hits)
        if (command.kind === 'chasePlayer')
          chasePlayerSites.push({
            scene: scene.id,
            entity: entity.id,
            behavior: behaviorId,
            path,
            current: currentAutoBehaviorId(entity) === behaviorId,
            solid: entity.collide === true,
          })
    }
    const pages = entity.pages ?? []
    const pageEnabled = pages.some((page) => page.auto !== undefined)
    if (pageEnabled) enabledAutoEntities++
    const behaviors = entity.behaviors?.auto ?? {}
    const mover = Object.values(behaviors).some(containsMotion)
    if (mover) {
      registryMoverRecords.push({
        scene: scene.id,
        entity: entity.id,
        solid: entity.collide === true,
        pageEnabled,
        behaviors: Object.entries(behaviors)
          .filter(([, behavior]) => containsMotion(behavior))
          .map(([behaviorId]) => behaviorId)
          .sort(stableCompare),
      })
      registryMovers++
      if (entity.collide === true) registrySolidMovers++
      if (pageEnabled) {
        pageEnabledMovers++
        if (entity.collide === true) pageEnabledSolidMovers++
      }
    }
    if (containsMotion(currentAutoBehavior(entity))) {
      currentMovers++
      if (entity.collide === true) currentSolidMovers++
    }

    for (const [behaviorId, behavior] of Object.entries(behaviors)) {
      const hits: CommandHit[] = []
      visitCommands(behavior, `behaviors.auto.${behaviorId}`, hits)
      const localKinds = new Set(
        hits.map(({ command }) => String(command.kind)).filter((kind) => motionKinds.has(kind)),
      )
      for (const kind of localKinds) {
        const key = `${scene.id}/${entity.id}/${behaviorId}`
        const ownerKey = `${scene.id}/${entity.id}`
        const all = entityKindSets.get(kind) ?? new Set<string>()
        all.add(key)
        entityKindSets.set(kind, all)
        const owners = entityKindOwners.get(kind) ?? new Set<string>()
        owners.add(ownerKey)
        entityKindOwners.set(kind, owners)
        if (entity.collide === true) {
          const solid = solidEntityKindSets.get(kind) ?? new Set<string>()
          solid.add(key)
          solidEntityKindSets.set(kind, solid)
        }
      }

      for (const { command, path } of hits) {
        const kind = String(command.kind)
        if (!motionKinds.has(kind)) continue
        commandCounts.set(kind, (commandCounts.get(kind) ?? 0) + 1)
        if (kind !== 'moveEntity') continue
        const to = commandPos(command)
        if (!to || targetEntity(command, entity.id) !== entity.id) continue
        if (isBlockedAt(map, to))
          endpointTerrainBlocked.push({
            scene: scene.id,
            map: scene.mapId,
            entity: entity.id,
            behavior: behaviorId,
            current: currentAutoBehaviorId(entity) === behaviorId,
            solid: entity.collide === true,
            path,
            to,
          })
      }

      // Runtime-step dry pass for the only path whose origin is proven here: the initial stage's
      // direct sequential body. Every other branch/state path is reported unresolved below instead
      // of being treated as a false green.
      const flow = object(object(behavior)?.flow)
      const stages = Array.isArray(flow?.stages) ? flow.stages : []
      const initial = String(flow?.initial ?? object(stages[0])?.id ?? '')
      const knownOriginPaths = new Set<string>()
      for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
        const stage = object(stages[stageIndex])
        if (String(stage?.id ?? '') !== initial) continue
        const body = Array.isArray(stage?.body) ? stage.body : []
        let cursor: GridPos = entity.pos
        for (let commandIndex = 0; commandIndex < body.length; commandIndex++) {
          const command = object(body[commandIndex])
          if (!command || command.kind !== 'moveEntity') continue
          const to = commandPos(command)
          if (!to || targetEntity(command, entity.id) !== entity.id) continue
          const path = `behaviors.auto.${behaviorId}.flow.stages.${stageIndex}.body.${commandIndex}`
          knownOriginPaths.add(path)
          const speed =
            command.speed === 'slow' ||
            command.speed === 'normal' ||
            command.speed === 'fast' ||
            command.speed === 'run'
              ? command.speed
              : 'normal'
          const blocked = firstBlockedRuntimeStep(map, cursor, to, speed)
          if (blocked)
            segmentTerrainBlocked.push({
              scene: scene.id,
              map: scene.mapId,
              entity: entity.id,
              behavior: behaviorId,
              current: currentAutoBehaviorId(entity) === behaviorId,
              solid: entity.collide === true,
              path,
              from: cursor,
              to,
              speed,
              firstBlockedFrom: blocked.from,
              firstBlockedProposal: blocked.proposed,
              runtimeTick: blocked.tick,
            })
          cursor = to
        }
      }
      for (const { command, path } of hits) {
        if (command.kind !== 'moveEntity' || !commandPos(command) || knownOriginPaths.has(path))
          continue
        unknownOriginMoves.push({
          scene: scene.id,
          map: scene.mapId,
          entity: entity.id,
          behavior: behaviorId,
          current: currentAutoBehaviorId(entity) === behaviorId,
          solid: entity.collide === true,
          path,
          target: targetEntity(command, entity.id),
          to: commandPos(command),
          reason: '控制流或目标实体的运行时起点未被证明',
        })
      }
    }
  }
}

const registryOnlyMoverSelectors = registryMoverRecords
  .filter((record) => !record.pageEnabled)
  .map((record) => {
    const selections = record.behaviors.flatMap((behavior) =>
      (selectorReferences.get(`${record.scene}/${record.entity}/${behavior}`) ?? []).map(
        (reference) => ({ behavior, ...reference }),
      ),
    )
    return { ...record, selections }
  })
  .sort((a, b) => stableCompare(`${a.scene}/${a.entity}`, `${b.scene}/${b.entity}`))

const perKind = Object.fromEntries(
  [...motionKinds].map((kind) => [
    kind,
    {
      commands: commandCounts.get(kind) ?? 0,
      entities: entityKindOwners.get(kind)?.size ?? 0,
      entityBehaviors: entityKindSets.get(kind)?.size ?? 0,
      solidEntityBehaviors: solidEntityKindSets.get(kind)?.size ?? 0,
    },
  ]),
)

const report = {
  generatedBy: 'pnpm --filter @type-pal/reforge audit:entity-motion',
  sceneCount: scenes.length,
  enabledAutoEntities,
  registryMovers,
  registrySolidMovers,
  registryNonSolidMovers: registryMovers - registrySolidMovers,
  pageEnabledMovers,
  pageEnabledSolidMovers,
  pageEnabledNonSolidMovers: pageEnabledMovers - pageEnabledSolidMovers,
  currentMovers,
  currentSolidMovers,
  currentNonSolidMovers: currentMovers - currentSolidMovers,
  perKind,
  endpointTerrainBlocked: endpointTerrainBlocked.sort((a, b) =>
    stableCompare(JSON.stringify(a), JSON.stringify(b)),
  ),
  sequentialSegmentTerrainBlocked: segmentTerrainBlocked.sort((a, b) =>
    stableCompare(JSON.stringify(a), JSON.stringify(b)),
  ),
  chasePlayerSites: chasePlayerSites.sort((a, b) =>
    stableCompare(JSON.stringify(a), JSON.stringify(b)),
  ),
  initialSolidOverlaps,
  unknownOriginMoves: unknownOriginMoves.sort((a, b) =>
    stableCompare(JSON.stringify(a), JSON.stringify(b)),
  ),
  registryOnlyMoverSelectors,
  registryOnlyMoversAllSelectorReferenced: registryOnlyMoverSelectors.every(
    (record) => record.selections.length > 0,
  ),
  selectorActivatedMotionBehaviors: [...selectorReferences.entries()]
    .filter(([key]) => {
      const [sceneId, entityId, behaviorId] = key.split('/')
      if (!sceneId || !entityId || !behaviorId) return false
      const entity = scenes
        .find((candidate) => candidate.id === sceneId)
        ?.entities?.find((candidate) => candidate.id === entityId)
      return containsMotion(entity?.behaviors?.auto?.[behaviorId])
    })
    .map(([behavior, references]) => ({ behavior, references }))
    .sort((a, b) => stableCompare(a.behavior, b.behavior)),
  interpretation: {
    endpointTerrainBlocked:
      '仅表示 authored 路线端点与地图 collision 相交；moveEntity/stepEntity 按原版语义为 scriptedBypass，不是 runtime blocker 或改线依据。',
    sequentialSegmentTerrainBlocked:
      '仅表示 authored 路线几何上穿过地图 collision；用于演出审计，不得冒充 runtime 阻塞证据或迁移改线依据。',
    nonSolid:
      'dynamic chase 中 collide:false 只是不形成 actor body，仍查 terrain；floating 才跳过 terrain。authored move/step 是否 bypass 与 collide 无关。',
  },
}

const golden = {
  sceneCount: 294,
  registryMovers: 426,
  registrySolidMovers: 117,
  pageEnabledMovers: 333,
  pageEnabledSolidMovers: 65,
  currentMovers: 311,
  currentSolidMovers: 60,
  chasePlayerSites: 7,
  registryOnlyMovers: 93,
} as const
const actualGolden = {
  sceneCount: report.sceneCount,
  registryMovers: report.registryMovers,
  registrySolidMovers: report.registrySolidMovers,
  pageEnabledMovers: report.pageEnabledMovers,
  pageEnabledSolidMovers: report.pageEnabledSolidMovers,
  currentMovers: report.currentMovers,
  currentSolidMovers: report.currentSolidMovers,
  chasePlayerSites: report.chasePlayerSites.length,
  registryOnlyMovers: report.registryOnlyMoverSelectors.length,
}
if (JSON.stringify(actualGolden) !== JSON.stringify(golden))
  throw new Error(
    `D15 PAL census golden 漂移: expected=${JSON.stringify(golden)} actual=${JSON.stringify(actualGolden)}`,
  )
if (!report.registryOnlyMoversAllSelectorReferenced)
  throw new Error('D15 PAL census: registry-only mover 存在未记录的 auto selector 可达性')

export { report }

console.log(JSON.stringify(report, null, 2))
