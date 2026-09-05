/**
 * D15 autonomous movement planner.
 *
 * This module deliberately owns no scene, runner, promise, trigger, or persistence state. The
 * runtime supplies one immutable snapshot and commits the returned outcomes only after the whole
 * batch has been planned.
 */
import type { Facing, GridPos } from '@type-pal/content'

export const COLLISION_EPSILON = 1e-6
export const TERRAIN_SAMPLE_STEP = 0.25
const FOOTPRINT_DISTANCE = 1 - COLLISION_EPSILON
const SIDE_STICK_TICKS = 4

export type MotionActor = { kind: 'party' } | { kind: 'entity'; id: string }

export type MotionSource = 'player' | 'auto' | 'hostile' | 'script-chase' | 'script'
export type MotionCollision = 'dynamic' | 'scriptedBypass'

export interface FootprintOffset {
  dcol: number
  drow: number
}

export interface MotionSnapshotActor {
  actor: MotionActor
  pos: GridPos
  facing: Facing
  /** A compound actor (mount + riders) exposes every member as an offset from `pos`. */
  footprints: readonly FootprintOffset[]
  /** Non-solid actors still check terrain, but neither block nor reserve actor space. */
  hasBody: boolean
  /** Product-level classification consumed by the runtime's player/NPC yield adapter. */
  yieldable: boolean
}

export interface MotionIntent {
  actor: MotionActor
  source: MotionSource
  /** Authored command locomotion (interactive or auto) bypasses autonomous collision. */
  collision: MotionCollision
  from: GridPos
  desired: GridPos
  desiredFacing: Facing
  /** Original PAL floating pursuit bypasses the whole obstacle check: terrain and solid bodies. */
  floating: boolean
  /** Command/endpoint identity. Side-stick is invalidated when this changes. */
  epoch: number
  /** Maximum lateral distance for one sidestep. */
  quantum: number
  allowSidestep: boolean
}

export type Side = 'negative' | 'positive'

export interface SideStick {
  actor: MotionActor
  epoch: number
  side: Side
  remainingEligibleTicks: number
}

export interface MotionPlanInput {
  tick: number
  actors: readonly MotionSnapshotActor[]
  intents: readonly MotionIntent[]
  sideSticks?: readonly SideStick[]
  /** Runtime authority check captured with the snapshot; rechecked again before commit. */
  partyCanYield?: boolean
  /**
   * Optional component-local eligible epoch. The runtime uses this so slow/cooldown rest ticks and
   * unrelated movers do not age a contention ring. The raw world tick remains the pure fallback.
   */
  fairnessTickForGroup?: (
    members: readonly Readonly<{ actor: MotionActor; epoch: number }>[],
  ) => number
  terrainBlocked: (pos: GridPos) => boolean
}

export type MotionBlockReason =
  | { kind: 'terrain' }
  | { kind: 'actor'; actor: MotionActor }
  | { kind: 'reservation'; actor: MotionActor }
  | { kind: 'cycle'; actors: readonly MotionActor[] }

export type MotionOutcome =
  | {
      kind: 'moved' | 'sidestepped' | 'passive-yield'
      actor: MotionActor
      from: GridPos
      to: GridPos
      facing: Facing
      actualDirection: Facing
    }
  | {
      kind: 'blocked'
      actor: MotionActor
      from: GridPos
      facing: Facing
      reason: MotionBlockReason
    }

export interface MotionPlan {
  /** Stable actor-key order, independent of input/Map/scene order. */
  outcomes: readonly MotionOutcome[]
  nextSideSticks: readonly SideStick[]
  /** Logical validation order only. The runtime still performs one atomic live-state commit. */
  logicalSubphases: readonly (readonly MotionActor[])[]
}

/** Runtime-only fairness clock keyed by a stable contention actor set, never by leaf epoch. */
export class MotionFairnessClock {
  private readonly records = new Map<
    string,
    { nextEligibleTick: number; members: readonly string[] }
  >()
  private readonly activeThisBatch = new Set<string>()

  beginBatch(): void {
    this.activeThisBatch.clear()
  }

  tickForGroup(members: readonly Readonly<{ actor: MotionActor; epoch: number }>[]): number {
    const memberKeys = members.map(({ actor }) => motionActorKey(actor)).sort(stableCompare)
    const key = memberKeys.join('|')
    this.activeThisBatch.add(key)
    const record = this.records.get(key) ?? { nextEligibleTick: 0, members: memberKeys }
    this.records.set(key, record)
    return record.nextEligibleTick
  }

  commitBatch(liveActors: ReadonlySet<string>): void {
    for (const key of this.activeThisBatch) {
      const record = this.records.get(key)
      if (record) record.nextEligibleTick++
    }
    for (const [key, record] of this.records)
      if (!record.members.every((member) => liveActors.has(member))) this.records.delete(key)
    this.activeThisBatch.clear()
  }

  clear(): void {
    this.records.clear()
    this.activeThisBatch.clear()
  }
}

interface Candidate {
  kind: 'primary' | 'side' | 'passive'
  side?: Side
  to: GridPos
  facing: Facing
  actualDirection: Facing
}

interface Accepted {
  actor: MotionSnapshotActor
  intent?: MotionIntent
  candidate: Candidate
  bypass: boolean
}

export function motionActorKey(actor: MotionActor): string {
  return actor.kind === 'party' ? '0:party' : `1:${actor.id}`
}

function cloneActor(actor: MotionActor): MotionActor {
  return actor.kind === 'party' ? { kind: 'party' } : { kind: 'entity', id: actor.id }
}

function clonePos(pos: GridPos): GridPos {
  return { col: pos.col, row: pos.row, height: pos.height }
}

function requiredMapValue<K, V>(map: ReadonlyMap<K, V>, key: K, context: string): V {
  const value = map.get(key)
  if (value === undefined) throw new Error(`entity-motion: missing ${context}`)
  return value
}

function requiredArrayValue<T>(values: readonly T[], index: number, context: string): T {
  const value = values[index]
  if (value === undefined) throw new Error(`entity-motion: missing ${context}`)
  return value
}

function samePos(a: GridPos, b: GridPos): boolean {
  return a.col === b.col && a.row === b.row && a.height === b.height
}

function chebyshevDistance(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
}

/** Continuous footpoint overlap. Height is intentionally not part of logical collision. */
export function motionFootprintsOverlap(a: GridPos, b: GridPos): boolean {
  return chebyshevDistance(a, b) < FOOTPRINT_DISTANCE
}

function addOffset(pos: GridPos, offset: FootprintOffset): GridPos {
  return {
    col: pos.col + offset.dcol,
    row: pos.row + offset.drow,
    height: pos.height,
  }
}

function lerpPos(from: GridPos, to: GridPos, t: number): GridPos {
  return {
    col: from.col + (to.col - from.col) * t,
    row: from.row + (to.row - from.row) * t,
    height: from.height + (to.height - from.height) * t,
  }
}

/** Sample terrain at no more than 0.25 grid units, including the endpoint. */
export function motionTerrainSweepBlocked(
  from: GridPos,
  to: GridPos,
  footprints: readonly FootprintOffset[],
  terrainBlocked: (pos: GridPos) => boolean,
): boolean {
  const distance = chebyshevDistance(from, to)
  const samples = Math.max(1, Math.ceil(distance / TERRAIN_SAMPLE_STEP))
  for (let i = 1; i <= samples; i++) {
    const base = lerpPos(from, to, i / samples)
    for (const footprint of footprints) {
      if (terrainBlocked(addOffset(base, footprint))) return true
    }
  }
  return false
}

function addCandidateTime(times: number[], value: number): void {
  if (Number.isFinite(value) && value > 0 && value < 1) times.push(value)
}

/** Exact minimum L-infinity distance of two linearly moving points over one logical subphase. */
function minimumRelativeDistance(
  aFrom: GridPos,
  aTo: GridPos,
  bFrom: GridPos,
  bTo: GridPos,
): number {
  const x0 = aFrom.col - bFrom.col
  const y0 = aFrom.row - bFrom.row
  const vx = aTo.col - aFrom.col - (bTo.col - bFrom.col)
  const vy = aTo.row - aFrom.row - (bTo.row - bFrom.row)
  const times = [0, 1]
  if (vx !== 0) addCandidateTime(times, -x0 / vx)
  if (vy !== 0) addCandidateTime(times, -y0 / vy)
  if (vx !== vy) addCandidateTime(times, (y0 - x0) / (vx - vy))
  if (vx !== -vy) addCandidateTime(times, (-y0 - x0) / (vx + vy))
  let minimum = Number.POSITIVE_INFINITY
  for (const t of times) {
    minimum = Math.min(minimum, Math.max(Math.abs(x0 + vx * t), Math.abs(y0 + vy * t)))
  }
  return minimum
}

interface MotionSweepAssessment {
  /** A new overlap or a deeper point than the starting penetration is always unsafe. */
  unsafe: boolean
  /** At least one compound-footprint pair was already overlapping at the phase start. */
  hadExistingOverlap: boolean
  /** At least one existing pair ends strictly farther apart. */
  improvedExistingOverlap: boolean
}

/**
 * Exact actor sweep for two compound footprints. Internal compound pairs are never compared;
 * across actors, every existing overlap must be non-worsening and at least one pair must improve.
 */
function assessMotionSweeps(
  aFrom: GridPos,
  aTo: GridPos,
  aFootprints: readonly FootprintOffset[],
  bFrom: GridPos,
  bTo: GridPos,
  bFootprints: readonly FootprintOffset[],
): MotionSweepAssessment {
  let unsafe = false
  let hadExistingOverlap = false
  let improvedExistingOverlap = false
  for (const aOffset of aFootprints) {
    const af = addOffset(aFrom, aOffset)
    const at = addOffset(aTo, aOffset)
    for (const bOffset of bFootprints) {
      const bf = addOffset(bFrom, bOffset)
      const bt = addOffset(bTo, bOffset)
      const startDistance = chebyshevDistance(af, bf)
      const endDistance = chebyshevDistance(at, bt)
      const minimum = minimumRelativeDistance(af, at, bf, bt)
      if (startDistance < FOOTPRINT_DISTANCE) {
        hadExistingOverlap = true
        if (minimum + COLLISION_EPSILON < startDistance) unsafe = true
        if (endDistance > startDistance + COLLISION_EPSILON) improvedExistingOverlap = true
      } else if (minimum < FOOTPRINT_DISTANCE) {
        unsafe = true
      }
    }
  }
  return { unsafe, hadExistingOverlap, improvedExistingOverlap }
}

export function motionSweepsConflict(
  aFrom: GridPos,
  aTo: GridPos,
  aFootprints: readonly FootprintOffset[],
  bFrom: GridPos,
  bTo: GridPos,
  bFootprints: readonly FootprintOffset[],
): boolean {
  const assessment = assessMotionSweeps(aFrom, aTo, aFootprints, bFrom, bTo, bFootprints)
  return assessment.unsafe || (assessment.hadExistingOverlap && !assessment.improvedExistingOverlap)
}

function actualDirection(from: GridPos, to: GridPos, fallback: Facing): Facing {
  const dcol = to.col - from.col
  const drow = to.row - from.row
  if (Math.abs(dcol) >= Math.abs(drow) && dcol !== 0) return dcol > 0 ? 'right' : 'left'
  if (drow !== 0) return drow > 0 ? 'down' : 'up'
  return fallback
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Locale-independent UTF-16 code-unit order. */
function stableCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function sideCandidate(intent: MotionIntent, side: Side): Candidate | null {
  const dcol = intent.desired.col - intent.from.col
  const drow = intent.desired.row - intent.from.row
  const length = Math.max(Math.abs(dcol), Math.abs(drow))
  if (length <= COLLISION_EPSILON || intent.quantum <= 0) return null
  const amount = Math.min(intent.quantum, length)
  const sign = side === 'negative' ? -1 : 1
  let scol: number
  let srow: number
  if (Math.abs(dcol) >= Math.abs(drow)) {
    scol = 0
    srow = Math.sign(dcol || 1) * sign * amount
  } else {
    scol = -Math.sign(drow || 1) * sign * amount
    srow = 0
  }
  const to = {
    col: intent.from.col + scol,
    row: intent.from.row + srow,
    height: intent.from.height,
  }
  const direction = actualDirection(intent.from, to, intent.desiredFacing)
  return {
    kind: 'side',
    side,
    to,
    // The player visually keeps the held input facing while sliding around an NPC.
    facing: intent.actor.kind === 'party' ? intent.desiredFacing : direction,
    actualDirection: direction,
  }
}

function candidatesFor(
  intent: MotionIntent,
  actorKey: string,
  stick: SideStick | undefined,
): Candidate[] {
  const primary: Candidate = {
    kind: 'primary',
    to: clonePos(intent.desired),
    facing: intent.desiredFacing,
    actualDirection: actualDirection(intent.from, intent.desired, intent.desiredFacing),
  }
  if (!intent.allowSidestep) return [primary]
  const held =
    stick?.epoch === intent.epoch && stick.remainingEligibleTicks > 0 ? stick.side : undefined
  const preferred: Side = held ?? (stableHash(actorKey) % 2 === 0 ? 'negative' : 'positive')
  const first = sideCandidate(intent, preferred)
  if (held) return first ? [primary, first] : [primary]
  const second = sideCandidate(intent, preferred === 'negative' ? 'positive' : 'negative')
  return [primary, ...(first ? [first] : []), ...(second ? [second] : [])]
}

function normalizedActorList(input: MotionPlanInput): MotionSnapshotActor[] {
  const result = [...input.actors].sort((a, b) =>
    stableCompare(motionActorKey(a.actor), motionActorKey(b.actor)),
  )
  const seen = new Set<string>()
  for (const actor of result) {
    const key = motionActorKey(actor.actor)
    if (seen.has(key)) throw new Error(`entity-motion: duplicate snapshot actor ${key}`)
    if (!actor.footprints.length) throw new Error(`entity-motion: actor ${key} has no footprint`)
    seen.add(key)
  }
  return result
}

function normalizedIntentList(
  input: MotionPlanInput,
  actorsByKey: ReadonlyMap<string, MotionSnapshotActor>,
): MotionIntent[] {
  const result = [...input.intents].sort((a, b) =>
    stableCompare(motionActorKey(a.actor), motionActorKey(b.actor)),
  )
  const seen = new Set<string>()
  for (const intent of result) {
    const key = motionActorKey(intent.actor)
    if (seen.has(key)) throw new Error(`entity-motion: duplicate intent for ${key}`)
    const actor = actorsByKey.get(key)
    if (!actor) throw new Error(`entity-motion: intent references missing actor ${key}`)
    if (!samePos(intent.from, actor.pos))
      throw new Error(`entity-motion: stale intent origin for ${key}`)
    if (!Number.isFinite(intent.quantum) || intent.quantum <= 0)
      throw new Error(`entity-motion: invalid quantum for ${key}`)
    if (!Number.isSafeInteger(intent.epoch))
      throw new Error(`entity-motion: invalid command epoch for ${key}`)
    seen.add(key)
  }
  return result
}

function normalizedSideSticks(
  input: MotionPlanInput,
  actorsByKey: ReadonlyMap<string, MotionSnapshotActor>,
): Map<string, SideStick> {
  const result = new Map<string, SideStick>()
  const sorted = [...(input.sideSticks ?? [])].sort((a, b) =>
    stableCompare(motionActorKey(a.actor), motionActorKey(b.actor)),
  )
  for (const stick of sorted) {
    const key = motionActorKey(stick.actor)
    if (!actorsByKey.has(key))
      throw new Error(`entity-motion: side-stick references missing actor ${key}`)
    if (result.has(key)) throw new Error(`entity-motion: duplicate side-stick for ${key}`)
    if (!Number.isSafeInteger(stick.epoch))
      throw new Error(`entity-motion: invalid side-stick epoch for ${key}`)
    if (
      !Number.isSafeInteger(stick.remainingEligibleTicks) ||
      stick.remainingEligibleTicks < 1 ||
      stick.remainingEligibleTicks >= SIDE_STICK_TICKS
    )
      throw new Error(`entity-motion: invalid side-stick duration for ${key}`)
    result.set(key, stick)
  }
  return result
}

function primaryCandidate(intent: MotionIntent): Candidate {
  return {
    kind: 'primary',
    to: clonePos(intent.desired),
    facing: intent.desiredFacing,
    actualDirection: actualDirection(intent.from, intent.desired, intent.desiredFacing),
  }
}

class DisjointSets {
  private readonly parent = new Map<string, string>()

  add(key: string): void {
    if (!this.parent.has(key)) this.parent.set(key, key)
  }

  find(key: string): string {
    const parent = this.parent.get(key)
    if (!parent) throw new Error(`entity-motion: missing contention key ${key}`)
    if (parent === key) return key
    const root = this.find(parent)
    this.parent.set(key, root)
    return root
  }

  join(a: string, b: string): void {
    const ar = this.find(a)
    const br = this.find(b)
    if (ar === br) return
    if (stableCompare(ar, br) <= 0) this.parent.set(br, ar)
    else this.parent.set(ar, br)
  }
}

type CandidateMode = 'normal' | 'side-only' | 'primary-only'

interface AssignmentViolation {
  actors: ReadonlySet<string>
  reasons: ReadonlyMap<string, MotionBlockReason>
}

interface AssignmentValidation {
  ok: boolean
  phases: readonly (readonly string[])[]
  violation?: AssignmentViolation
}

interface DynamicSolveResult {
  selected: ReadonlyMap<string, Candidate>
  blocked: ReadonlyMap<string, MotionBlockReason>
  phases: readonly (readonly string[])[]
  sideAttempted: ReadonlySet<string>
  priority: readonly string[]
  priorityRank: ReadonlyMap<string, number>
}

function candidateTerrainBlocked(
  input: MotionPlanInput,
  actor: MotionSnapshotActor,
  intent: MotionIntent,
  candidate: Candidate,
): boolean {
  return (
    !intent.floating &&
    motionTerrainSweepBlocked(intent.from, candidate.to, actor.footprints, input.terrainBlocked)
  )
}

function intentBypassesCollision(intent: MotionIntent): boolean {
  return intent.collision === 'scriptedBypass' || intent.floating
}

function conflictReason(other: MotionSnapshotActor, reservation: boolean): MotionBlockReason {
  return {
    kind: reservation ? 'reservation' : 'actor',
    actor: cloneActor(other.actor),
  }
}

function priorityOrderForCandidates(
  input: MotionPlanInput,
  keys: readonly string[],
  candidateLists: ReadonlyMap<string, readonly Candidate[]>,
  actorsByKey: ReadonlyMap<string, MotionSnapshotActor>,
  intentsByKey: ReadonlyMap<string, MotionIntent>,
  basePositions: ReadonlyMap<string, GridPos>,
): { priority: string[]; priorityRank: Map<string, number> } {
  const worldKeys = keys.filter((key) => key !== '0:party')
  const sets = new DisjointSets()
  for (const key of worldKeys) sets.add(key)

  const validEnvelope = (key: string): readonly Candidate[] => {
    const actor = requiredMapValue(actorsByKey, key, `actor ${key}`)
    const intent = requiredMapValue(intentsByKey, key, `intent ${key}`)
    return (candidateLists.get(key) ?? []).filter(
      (candidate) => !candidateTerrainBlocked(input, actor, intent, candidate),
    )
  }

  for (let i = 0; i < worldKeys.length; i++) {
    const aKey = requiredArrayValue(worldKeys, i, `world actor at ${i}`)
    const aActor = requiredMapValue(actorsByKey, aKey, `actor ${aKey}`)
    const aIntent = requiredMapValue(intentsByKey, aKey, `intent ${aKey}`)
    if (!aActor.hasBody) continue
    for (let j = i + 1; j < worldKeys.length; j++) {
      const bKey = requiredArrayValue(worldKeys, j, `world actor at ${j}`)
      const bActor = requiredMapValue(actorsByKey, bKey, `actor ${bKey}`)
      const bIntent = requiredMapValue(intentsByKey, bKey, `intent ${bKey}`)
      if (!bActor.hasBody) continue
      const aBase = requiredMapValue(basePositions, aKey, `base position ${aKey}`)
      const bBase = requiredMapValue(basePositions, bKey, `base position ${bKey}`)
      let related = false
      for (const aCandidate of validEnvelope(aKey)) {
        const againstBStart = assessMotionSweeps(
          aIntent.from,
          aCandidate.to,
          aActor.footprints,
          bBase,
          bBase,
          bActor.footprints,
        )
        if (againstBStart.unsafe) {
          related = true
          break
        }
        for (const bCandidate of validEnvelope(bKey)) {
          const synchronous = assessMotionSweeps(
            aIntent.from,
            aCandidate.to,
            aActor.footprints,
            bIntent.from,
            bCandidate.to,
            bActor.footprints,
          )
          if (synchronous.unsafe) {
            related = true
            break
          }
        }
        if (related) break
      }
      if (!related) {
        for (const bCandidate of validEnvelope(bKey)) {
          const againstAStart = assessMotionSweeps(
            bIntent.from,
            bCandidate.to,
            bActor.footprints,
            aBase,
            aBase,
            aActor.footprints,
          )
          if (againstAStart.unsafe) {
            related = true
            break
          }
        }
      }
      if (related) sets.join(aKey, bKey)
    }
  }

  // Movers that may all request the same passive party resource belong to one fairness ring even
  // when their own primary/side envelopes do not intersect.
  const partyActor = actorsByKey.get('0:party')
  const partyPos = basePositions.get('0:party')
  if (partyActor?.hasBody && partyPos) {
    const claimants = worldKeys.filter((key) => {
      const actor = requiredMapValue(actorsByKey, key, `actor ${key}`)
      const intent = requiredMapValue(intentsByKey, key, `intent ${key}`)
      if (!actor.hasBody || !['auto', 'hostile', 'script-chase'].includes(intent.source))
        return false
      return assessMotionSweeps(
        intent.from,
        intent.desired,
        actor.footprints,
        partyPos,
        partyPos,
        partyActor.footprints,
      ).unsafe
    })
    if (claimants.length > 1) {
      const first = requiredArrayValue(claimants, 0, 'first party claimant')
      for (let i = 1; i < claimants.length; i++)
        sets.join(first, requiredArrayValue(claimants, i, `party claimant at ${i}`))
    }
  }

  const groups = new Map<string, string[]>()
  for (const key of worldKeys) {
    const root = sets.find(key)
    const group = groups.get(root) ?? []
    group.push(key)
    groups.set(root, group)
  }
  const orderedGroups = [...groups.values()]
    .map((group) => group.sort(stableCompare))
    .sort((a, b) =>
      stableCompare(
        requiredArrayValue(a, 0, 'first actor in fairness group'),
        requiredArrayValue(b, 0, 'first actor in fairness group'),
      ),
    )
  const priority: string[] = []
  for (const group of orderedGroups) {
    const fairnessTick =
      group.length > 1 && input.fairnessTickForGroup
        ? input.fairnessTickForGroup(
            group.map((key) => ({
              actor: cloneActor(requiredMapValue(actorsByKey, key, `actor ${key}`).actor),
              epoch: requiredMapValue(intentsByKey, key, `intent ${key}`).epoch,
            })),
          )
        : input.tick
    if (!Number.isSafeInteger(fairnessTick))
      throw new Error('entity-motion: fairness tick must be a safe integer')
    const offset = ((fairnessTick % group.length) + group.length) % group.length
    priority.push(...group.slice(offset), ...group.slice(0, offset))
  }
  if (keys.includes('0:party')) priority.unshift('0:party')
  return {
    priority,
    priorityRank: new Map(priority.map((key, index) => [key, index])),
  }
}

function validateAssignment(
  selected: ReadonlyMap<string, Candidate>,
  actors: readonly MotionSnapshotActor[],
  actorsByKey: ReadonlyMap<string, MotionSnapshotActor>,
  intentsByKey: ReadonlyMap<string, MotionIntent>,
  basePositions: ReadonlyMap<string, GridPos>,
  priorityRank: ReadonlyMap<string, number>,
): AssignmentValidation {
  const selectedKeys = [...selected.keys()].sort(stableCompare)
  const prerequisites = new Map(selectedKeys.map((key) => [key, new Set<string>()]))
  const reasonPair = (aKey: string, bKey: string): AssignmentViolation => {
    const aActor = requiredMapValue(actorsByKey, aKey, `actor ${aKey}`)
    const bActor = requiredMapValue(actorsByKey, bKey, `actor ${bKey}`)
    return {
      actors: new Set([aKey, bKey]),
      reasons: new Map([
        [aKey, conflictReason(bActor, true)],
        [bKey, conflictReason(aActor, true)],
      ]),
    }
  }

  // Build only genuine vacate dependencies. Independent crossing paths contend instead of being
  // serialized opportunistically; logical subphases are reserved for entering a vacated start.
  for (let i = 0; i < selectedKeys.length; i++) {
    const aKey = requiredArrayValue(selectedKeys, i, `selected actor at ${i}`)
    const aActor = requiredMapValue(actorsByKey, aKey, `actor ${aKey}`)
    if (!aActor.hasBody) continue
    const aIntent = requiredMapValue(intentsByKey, aKey, `intent ${aKey}`)
    const aCandidate = requiredMapValue(selected, aKey, `candidate ${aKey}`)
    const aStart = requiredMapValue(basePositions, aKey, `base position ${aKey}`)
    for (let j = i + 1; j < selectedKeys.length; j++) {
      const bKey = requiredArrayValue(selectedKeys, j, `selected actor at ${j}`)
      const bActor = requiredMapValue(actorsByKey, bKey, `actor ${bKey}`)
      if (!bActor.hasBody) continue
      const bIntent = requiredMapValue(intentsByKey, bKey, `intent ${bKey}`)
      const bCandidate = requiredMapValue(selected, bKey, `candidate ${bKey}`)
      const bStart = requiredMapValue(basePositions, bKey, `base position ${bKey}`)
      const aAgainstBStart = assessMotionSweeps(
        aIntent.from,
        aCandidate.to,
        aActor.footprints,
        bStart,
        bStart,
        bActor.footprints,
      )
      const bAgainstAStart = assessMotionSweeps(
        bIntent.from,
        bCandidate.to,
        bActor.footprints,
        aStart,
        aStart,
        aActor.footprints,
      )
      if (aAgainstBStart.unsafe) {
        const afterBVacates = assessMotionSweeps(
          aIntent.from,
          aCandidate.to,
          aActor.footprints,
          bCandidate.to,
          bCandidate.to,
          bActor.footprints,
        )
        if (afterBVacates.unsafe)
          return { ok: false, phases: [], violation: reasonPair(aKey, bKey) }
        requiredMapValue(prerequisites, aKey, `prerequisites ${aKey}`).add(bKey)
      }
      if (bAgainstAStart.unsafe) {
        const afterAVacates = assessMotionSweeps(
          bIntent.from,
          bCandidate.to,
          bActor.footprints,
          aCandidate.to,
          aCandidate.to,
          aActor.footprints,
        )
        if (afterAVacates.unsafe)
          return { ok: false, phases: [], violation: reasonPair(aKey, bKey) }
        requiredMapValue(prerequisites, bKey, `prerequisites ${bKey}`).add(aKey)
      }
      if (!aAgainstBStart.unsafe && !bAgainstAStart.unsafe) {
        const synchronous = assessMotionSweeps(
          aIntent.from,
          aCandidate.to,
          aActor.footprints,
          bIntent.from,
          bCandidate.to,
          bActor.footprints,
        )
        if (synchronous.unsafe) return { ok: false, phases: [], violation: reasonPair(aKey, bKey) }
      }
    }
  }

  const phases: string[][] = []
  const completed = new Set<string>()
  const remaining = new Set(selectedKeys)
  while (remaining.size) {
    const ready = [...remaining]
      .filter((key) =>
        [...requiredMapValue(prerequisites, key, `prerequisites ${key}`)].every((dependency) =>
          completed.has(dependency),
        ),
      )
      .sort((a, b) => {
        const ar = priorityRank.get(a) ?? Number.MAX_SAFE_INTEGER
        const br = priorityRank.get(b) ?? Number.MAX_SAFE_INTEGER
        return ar - br || stableCompare(a, b)
      })
    if (!ready.length) {
      const cycle = [...remaining].sort(stableCompare)
      const cycleActorsValue = cycle.map((key) =>
        cloneActor(requiredMapValue(actorsByKey, key, `cycle actor ${key}`).actor),
      )
      return {
        ok: false,
        phases: [],
        violation: {
          actors: new Set(cycle),
          reasons: new Map(
            cycle.map((key) => [
              key,
              { kind: 'cycle', actors: cycleActorsValue } as MotionBlockReason,
            ]),
          ),
        },
      }
    }
    phases.push(ready)
    for (const key of ready) {
      remaining.delete(key)
      completed.add(key)
    }
  }

  // Production fail-closed invariant: replay every logical phase from the immutable base. This
  // catches stale dependency decisions, same-phase crossings, endpoint overlap, and compound
  // escape aggregation before the runtime can commit anything.
  const current = new Map([...basePositions].map(([key, value]) => [key, clonePos(value)]))
  const solidActors = actors.filter((actor) => actor.hasBody)
  for (const phase of phases) {
    const phaseSet = new Set(phase)
    const hadExisting = new Set<string>()
    const improvedExisting = new Set<string>()
    const reasons = new Map<string, MotionBlockReason>()
    const unsafeActors = new Set<string>()
    for (let i = 0; i < solidActors.length; i++) {
      const aActor = requiredArrayValue(solidActors, i, `solid actor at ${i}`)
      const aKey = motionActorKey(aActor.actor)
      const aMoves = phaseSet.has(aKey)
      for (let j = i + 1; j < solidActors.length; j++) {
        const bActor = requiredArrayValue(solidActors, j, `solid actor at ${j}`)
        const bKey = motionActorKey(bActor.actor)
        const bMoves = phaseSet.has(bKey)
        if (!aMoves && !bMoves) continue
        const aFrom = requiredMapValue(current, aKey, `phase position ${aKey}`)
        const bFrom = requiredMapValue(current, bKey, `phase position ${bKey}`)
        const aTo = aMoves ? requiredMapValue(selected, aKey, `candidate ${aKey}`).to : aFrom
        const bTo = bMoves ? requiredMapValue(selected, bKey, `candidate ${bKey}`).to : bFrom
        const assessment = assessMotionSweeps(
          aFrom,
          aTo,
          aActor.footprints,
          bFrom,
          bTo,
          bActor.footprints,
        )
        if (assessment.unsafe) {
          if (aMoves) {
            unsafeActors.add(aKey)
            reasons.set(aKey, conflictReason(bActor, selected.has(bKey)))
          }
          if (bMoves) {
            unsafeActors.add(bKey)
            reasons.set(bKey, conflictReason(aActor, selected.has(aKey)))
          }
        }
        if (assessment.hadExistingOverlap) {
          if (aMoves) hadExisting.add(aKey)
          if (bMoves) hadExisting.add(bKey)
          if (assessment.improvedExistingOverlap) {
            if (aMoves) improvedExisting.add(aKey)
            if (bMoves) improvedExisting.add(bKey)
          }
        }
      }
    }
    for (const key of hadExisting) {
      if (improvedExisting.has(key)) continue
      unsafeActors.add(key)
      if (!reasons.has(key)) {
        const other = solidActors.find((actor) => motionActorKey(actor.actor) !== key)
        if (!other) throw new Error(`entity-motion: overlap actor ${key} has no counterpart`)
        reasons.set(key, conflictReason(other, selected.has(motionActorKey(other.actor))))
      }
    }
    if (unsafeActors.size)
      return {
        ok: false,
        phases: [],
        violation: { actors: unsafeActors, reasons },
      }
    for (const key of phase)
      current.set(key, clonePos(requiredMapValue(selected, key, `candidate ${key}`).to))
  }
  return { ok: true, phases }
}

function solveDynamicAssignment(
  input: MotionPlanInput,
  actors: readonly MotionSnapshotActor[],
  actorsByKey: ReadonlyMap<string, MotionSnapshotActor>,
  intentsByKey: ReadonlyMap<string, MotionIntent>,
  sticksByKey: ReadonlyMap<string, SideStick>,
  basePositions: ReadonlyMap<string, GridPos>,
  modes: ReadonlyMap<string, CandidateMode> = new Map(),
  excluded: ReadonlySet<string> = new Set(),
): DynamicSolveResult {
  const keys = [...intentsByKey]
    .filter(([key, intent]) => intent.collision === 'dynamic' && !excluded.has(key))
    .map(([key]) => key)
    .sort(stableCompare)
  const candidateLists = new Map<string, Candidate[]>()
  const blocked = new Map<string, MotionBlockReason>()
  for (const key of keys) {
    const actor = requiredMapValue(actorsByKey, key, `actor ${key}`)
    const intent = requiredMapValue(intentsByKey, key, `intent ${key}`)
    const primary = primaryCandidate(intent)
    // Terrain-blocked primary is terminal even for a forced-side yield attempt.
    if (candidateTerrainBlocked(input, actor, intent, primary)) {
      blocked.set(key, { kind: 'terrain' })
      candidateLists.set(key, [])
      continue
    }
    const all = candidatesFor(intent, key, sticksByKey.get(key))
    const mode = modes.get(key) ?? 'normal'
    const list =
      mode === 'side-only'
        ? all.filter((candidate) => candidate.kind === 'side')
        : mode === 'primary-only'
          ? all.filter((candidate) => candidate.kind === 'primary')
          : all
    candidateLists.set(key, list)
    if (!list.length) blocked.set(key, { kind: 'actor', actor: cloneActor(actor.actor) })
  }
  const activeKeys = keys.filter((key) => !blocked.has(key))
  const { priority, priorityRank } = priorityOrderForCandidates(
    input,
    activeKeys,
    candidateLists,
    actorsByKey,
    intentsByKey,
    basePositions,
  )
  const cursor = new Map(activeKeys.map((key) => [key, 0]))
  const sideAttempted = new Set<string>()
  const loserOrder = (witness: ReadonlySet<string>): string[] =>
    [...witness]
      .filter((key) => cursor.has(key) && !blocked.has(key))
      .sort((a, b) => {
        const ar = priorityRank.get(a) ?? Number.MAX_SAFE_INTEGER
        const br = priorityRank.get(b) ?? Number.MAX_SAFE_INTEGER
        return br - ar || stableCompare(b, a)
      })

  const maximumProgress =
    [...candidateLists.values()].reduce((sum, candidates) => sum + candidates.length, 0) +
    activeKeys.length +
    1
  for (let progress = 0; progress < maximumProgress; progress++) {
    const selected = new Map<string, Candidate>()
    let terrainViolation: AssignmentViolation | undefined
    for (const key of activeKeys) {
      if (blocked.has(key)) continue
      const candidate = candidateLists.get(key)?.[cursor.get(key) ?? 0]
      if (!candidate) continue
      if (candidate.kind === 'side') sideAttempted.add(key)
      const actor = requiredMapValue(actorsByKey, key, `actor ${key}`)
      const intent = requiredMapValue(intentsByKey, key, `intent ${key}`)
      if (candidateTerrainBlocked(input, actor, intent, candidate)) {
        terrainViolation = {
          actors: new Set([key]),
          reasons: new Map([[key, { kind: 'terrain' }]]),
        }
        break
      }
      selected.set(key, candidate)
    }
    const validation = terrainViolation
      ? { ok: false, phases: [], violation: terrainViolation }
      : validateAssignment(selected, actors, actorsByKey, intentsByKey, basePositions, priorityRank)
    if (validation.ok)
      return {
        selected,
        blocked,
        phases: validation.phases,
        sideAttempted,
        priority,
        priorityRank,
      }
    const violation = validation.violation
    if (!violation) throw new Error('entity-motion: invalid assignment failed without a witness')
    const losers = loserOrder(violation.actors)
    if (!losers.length) throw new Error('entity-motion: assignment witness has no selectable actor')
    let advanced = false
    for (const key of losers) {
      const index = requiredMapValue(cursor, key, `candidate cursor ${key}`)
      if (index + 1 >= (candidateLists.get(key)?.length ?? 0)) continue
      cursor.set(key, index + 1)
      advanced = true
      break
    }
    if (advanced) continue
    const loser = requiredArrayValue(losers, 0, 'assignment loser')
    blocked.set(
      loser,
      violation.reasons.get(loser) ?? {
        kind: 'actor',
        actor: cloneActor(requiredMapValue(actorsByKey, loser, `loser actor ${loser}`).actor),
      },
    )
  }
  throw new Error('entity-motion: finite candidate solver did not converge')
}

function passiveMoveIsSafe(
  input: MotionPlanInput,
  partyActor: MotionSnapshotActor,
  to: GridPos,
  actors: readonly MotionSnapshotActor[],
  basePositions: ReadonlyMap<string, GridPos>,
): boolean {
  if (motionTerrainSweepBlocked(partyActor.pos, to, partyActor.footprints, input.terrainBlocked))
    return false
  let hadExisting = false
  let improvedExisting = false
  for (const other of actors) {
    const otherKey = motionActorKey(other.actor)
    if (!other.hasBody || otherKey === '0:party') continue
    const otherPos = requiredMapValue(basePositions, otherKey, `base position ${otherKey}`)
    const assessment = assessMotionSweeps(
      partyActor.pos,
      to,
      partyActor.footprints,
      otherPos,
      otherPos,
      other.footprints,
    )
    if (assessment.unsafe) return false
    if (assessment.hadExistingOverlap) {
      hadExisting = true
      if (assessment.improvedExistingOverlap) improvedExisting = true
    }
  }
  return !hadExisting || improvedExisting
}

/** Plan one deterministic autonomous movement batch. */
export function planEntityMotion(input: MotionPlanInput): MotionPlan {
  if (!Number.isSafeInteger(input.tick))
    throw new Error('entity-motion: tick must be a safe integer')
  const actors = normalizedActorList(input)
  const actorsByKey = new Map(actors.map((actor) => [motionActorKey(actor.actor), actor]))
  const intents = normalizedIntentList(input, actorsByKey)
  const intentsByKey = new Map(intents.map((intent) => [motionActorKey(intent.actor), intent]))
  const sticksByKey = normalizedSideSticks(input, actorsByKey)
  const accepted = new Map<string, Accepted>()
  const basePositions = new Map(
    actors.map((actor) => [motionActorKey(actor.actor), clonePos(actor.pos)]),
  )

  // Original PAL has two obstacle-free paths: authored locomotion and floating pursuit. Both
  // linearize before the dynamic batch and bypass terrain/body checks while their committed
  // endpoint remains a normal solid body for other autonomous movement.
  for (const intent of intents) {
    if (!intentBypassesCollision(intent)) continue
    const key = motionActorKey(intent.actor)
    const value: Accepted = {
      actor: requiredMapValue(actorsByKey, key, `bypass actor ${key}`),
      intent,
      candidate: primaryCandidate(intent),
      bypass: true,
    }
    accepted.set(key, value)
    basePositions.set(key, clonePos(value.candidate.to))
  }

  const partyKey = '0:party'
  const partyActor = actorsByKey.get(partyKey)
  const partyIntent = intentsByKey.get(partyKey)
  const dynamicExcluded = new Set(
    intents.filter(intentBypassesCollision).map((intent) => motionActorKey(intent.actor)),
  )
  let manualPartyBlock: MotionBlockReason | undefined
  let solve: DynamicSolveResult

  if (partyActor && partyIntent?.collision === 'dynamic') {
    const primary = primaryCandidate(partyIntent)
    const primaryTerrain = candidateTerrainBlocked(input, partyActor, partyIntent, primary)
    const primaryAssessments = primaryTerrain
      ? []
      : actors.flatMap((other) => {
          const otherKey = motionActorKey(other.actor)
          if (!other.hasBody || otherKey === partyKey) return []
          const otherPos = requiredMapValue(basePositions, otherKey, `base position ${otherKey}`)
          return [
            {
              other,
              assessment: assessMotionSweeps(
                partyIntent.from,
                primary.to,
                partyActor.footprints,
                otherPos,
                otherPos,
                other.footprints,
              ),
            },
          ]
        })
    const unsafePrimaryBlockers = primaryAssessments
      .filter(({ assessment }) => assessment.unsafe)
      .map(({ other }) => other)
    const heldPrimaryOverlaps = primaryAssessments.filter(
      ({ assessment }) => assessment.hadExistingOverlap,
    )
    const primaryImprovesAnyOverlap = heldPrimaryOverlaps.some(
      ({ assessment }) => assessment.improvedExistingOverlap,
    )
    // Compound escape is one proposal against the whole external body set: a held old overlap is
    // legal when another old pair strictly improves. Only all-held/no-improvement is a blocker.
    const blockers = unsafePrimaryBlockers.length
      ? unsafePrimaryBlockers
      : heldPrimaryOverlaps.length && !primaryImprovesAnyOverlap
        ? heldPrimaryOverlaps.map(({ other }) => other)
        : []
    if (blockers.length) {
      const allOrdinaryYielders = blockers.every((other) => {
        const otherIntent = intentsByKey.get(motionActorKey(other.actor))
        return (
          other.yieldable &&
          otherIntent?.collision === 'dynamic' &&
          !otherIntent.floating &&
          otherIntent.source === 'auto' &&
          otherIntent.allowSidestep
        )
      })
      if (allOrdinaryYielders) {
        const forcedModes = new Map<string, CandidateMode>(
          blockers.map((other) => [motionActorKey(other.actor), 'side-only']),
        )
        const withoutParty = new Set([...dynamicExcluded, partyKey])
        const yielded = solveDynamicAssignment(
          input,
          actors,
          actorsByKey,
          intentsByKey,
          sticksByKey,
          basePositions,
          forcedModes,
          withoutParty,
        )
        const everyBlockerYielded = blockers.every(
          (other) => yielded.selected.get(motionActorKey(other.actor))?.kind === 'side',
        )
        if (everyBlockerYielded) {
          solve = yielded
          manualPartyBlock = {
            kind: 'actor',
            actor: cloneActor(requiredArrayValue(blockers, 0, 'party blocker').actor),
          }
        } else {
          const fallbackModes = new Map<string, CandidateMode>([[partyKey, 'side-only']])
          solve = solveDynamicAssignment(
            input,
            actors,
            actorsByKey,
            intentsByKey,
            sticksByKey,
            basePositions,
            fallbackModes,
            dynamicExcluded,
          )
        }
      } else {
        solve = solveDynamicAssignment(
          input,
          actors,
          actorsByKey,
          intentsByKey,
          sticksByKey,
          basePositions,
          new Map(),
          new Set([...dynamicExcluded, partyKey]),
        )
        manualPartyBlock = {
          kind: 'actor',
          actor: cloneActor(requiredArrayValue(blockers, 0, 'party blocker').actor),
        }
      }
    } else {
      solve = solveDynamicAssignment(
        input,
        actors,
        actorsByKey,
        intentsByKey,
        sticksByKey,
        basePositions,
        new Map(),
        dynamicExcluded,
      )
    }
  } else {
    solve = solveDynamicAssignment(
      input,
      actors,
      actorsByKey,
      intentsByKey,
      sticksByKey,
      basePositions,
      new Map(),
      dynamicExcluded,
    )
  }

  let passiveCandidate: Candidate | undefined
  if (input.partyCanYield && partyActor && !solve.selected.has(partyKey)) {
    const requesters = solve.priority.filter((key) => {
      const intent = intentsByKey.get(key)
      const actor = actorsByKey.get(key)
      if (
        !intent ||
        !actor?.hasBody ||
        solve.selected.has(key) ||
        !['auto', 'hostile', 'script-chase'].includes(intent.source)
      )
        return false
      if (candidateTerrainBlocked(input, actor, intent, primaryCandidate(intent))) return false
      const partyPos = requiredMapValue(basePositions, partyKey, 'party base position')
      return motionSweepsConflict(
        intent.from,
        intent.desired,
        actor.footprints,
        partyPos,
        partyPos,
        partyActor.footprints,
      )
    })
    const stepForFacing: Record<Facing, { dcol: number; drow: number }> = {
      up: { dcol: 0, drow: -1 },
      right: { dcol: 1, drow: 0 },
      down: { dcol: 0, drow: 1 },
      left: { dcol: -1, drow: 0 },
    }
    const rightOf: Record<Facing, Facing> = {
      up: 'right',
      right: 'down',
      down: 'left',
      left: 'up',
    }
    const leftOf: Record<Facing, Facing> = {
      up: 'left',
      right: 'up',
      down: 'right',
      left: 'down',
    }
    const oppositeOf: Record<Facing, Facing> = {
      up: 'down',
      right: 'left',
      down: 'up',
      left: 'right',
    }
    for (const requesterKey of requesters) {
      const requester = requiredMapValue(intentsByKey, requesterKey, `requester ${requesterKey}`)
      const forward = actualDirection(requester.from, requester.desired, requester.desiredFacing)
      const directions = [rightOf[forward], forward, leftOf[forward], oppositeOf[forward]]
      for (const direction of directions) {
        const delta = stepForFacing[direction]
        const to: GridPos = {
          col: partyActor.pos.col + delta.dcol,
          row: partyActor.pos.row + delta.drow,
          height: partyActor.pos.height,
        }
        if (!passiveMoveIsSafe(input, partyActor, to, actors, basePositions)) continue
        const passiveBase = new Map(basePositions)
        passiveBase.set(partyKey, clonePos(to))
        const rerun = solveDynamicAssignment(
          input,
          actors,
          actorsByKey,
          intentsByKey,
          sticksByKey,
          passiveBase,
          new Map([[requesterKey, 'primary-only']]),
          new Set([...dynamicExcluded, partyKey]),
        )
        if (rerun.selected.get(requesterKey)?.kind !== 'primary') continue
        solve = rerun
        passiveCandidate = {
          kind: 'passive',
          to,
          facing: partyActor.facing,
          actualDirection: direction,
        }
        manualPartyBlock = undefined
        break
      }
      if (passiveCandidate) break
    }
  }

  for (const [key, candidate] of solve.selected) {
    accepted.set(key, {
      actor: requiredMapValue(actorsByKey, key, `accepted actor ${key}`),
      intent: intentsByKey.get(key),
      candidate,
      bypass: false,
    })
  }
  if (passiveCandidate && partyActor) {
    accepted.set(partyKey, {
      actor: partyActor,
      candidate: passiveCandidate,
      bypass: false,
    })
  }

  const blocked = new Map(solve.blocked)
  if (manualPartyBlock) blocked.set(partyKey, manualPartyBlock)
  const outcomeKeys = new Set(intents.map((intent) => motionActorKey(intent.actor)))
  if (passiveCandidate) outcomeKeys.add(partyKey)
  const outcomes: MotionOutcome[] = [...outcomeKeys]
    .sort(stableCompare)
    .map((key): MotionOutcome => {
      const intent = intentsByKey.get(key)
      const actor = requiredMapValue(actorsByKey, key, `outcome actor ${key}`)
      const value = accepted.get(key)
      if (!value) {
        if (!intent) throw new Error(`entity-motion: no intent for blocked actor ${key}`)
        return {
          kind: 'blocked',
          actor: cloneActor(actor.actor),
          from: clonePos(intent.from),
          facing: intent.desiredFacing,
          reason: blocked.get(key) ?? { kind: 'terrain' },
        }
      }
      return {
        kind:
          value.candidate.kind === 'side'
            ? 'sidestepped'
            : value.candidate.kind === 'passive'
              ? 'passive-yield'
              : 'moved',
        actor: cloneActor(actor.actor),
        from: clonePos(value.intent?.from ?? actor.pos),
        to: clonePos(value.candidate.to),
        facing: value.candidate.facing,
        actualDirection: value.candidate.actualDirection,
      }
    })

  const nextSideSticks: SideStick[] = []
  for (const intent of intents) {
    if (intent.collision !== 'dynamic') continue
    const key = motionActorKey(intent.actor)
    const prior = sticksByKey.get(key)
    const value = accepted.get(key)
    if (value?.candidate.kind === 'primary' || value?.candidate.kind === 'passive') continue
    if (value?.candidate.kind === 'side' && value.candidate.side) {
      const continuing = prior?.epoch === intent.epoch && prior.side === value.candidate.side
      const remaining = continuing
        ? Math.max(0, prior.remainingEligibleTicks - 1)
        : SIDE_STICK_TICKS - 1
      if (remaining > 0) {
        nextSideSticks.push({
          actor: cloneActor(intent.actor),
          epoch: intent.epoch,
          side: value.candidate.side,
          remainingEligibleTicks: remaining,
        })
      }
      continue
    }
    if (
      prior?.epoch === intent.epoch &&
      (!solve.sideAttempted.has(key) || prior.remainingEligibleTicks > 1)
    ) {
      nextSideSticks.push({
        actor: cloneActor(intent.actor),
        epoch: intent.epoch,
        side: prior.side,
        remainingEligibleTicks: solve.sideAttempted.has(key)
          ? prior.remainingEligibleTicks - 1
          : prior.remainingEligibleTicks,
      })
    }
  }
  nextSideSticks.sort((a, b) => stableCompare(motionActorKey(a.actor), motionActorKey(b.actor)))

  const logicalSubphases: MotionActor[][] = []
  const bypassKeys = [...accepted]
    .filter(([, value]) => value.bypass)
    .map(([key]) => key)
    .sort(stableCompare)
  if (bypassKeys.length)
    logicalSubphases.push(
      bypassKeys.map((key) =>
        cloneActor(requiredMapValue(actorsByKey, key, `bypass actor ${key}`).actor),
      ),
    )
  if (passiveCandidate && partyActor) logicalSubphases.push([cloneActor(partyActor.actor)])
  for (const phase of solve.phases) {
    if (!phase.length) continue
    logicalSubphases.push(
      phase.map((key) =>
        cloneActor(requiredMapValue(actorsByKey, key, `phase actor ${key}`).actor),
      ),
    )
  }

  return { outcomes, nextSideSticks, logicalSubphases }
}
