import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'
import { PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE } from './pal-r13-six-b-overlays.js'
import { PAL_CASUALTY_LOCALE_KEYS } from './pal-casualty-scripts.js'

/**
 * R13-6B is an append-only successor, while the R13-6A source canary still needs to replay
 * from its published parent. The live PAL baseline may already be content11, so reconstruct the
 * 6A snapshot by reversing only the 6B-owned leaves. This is deliberately fail-closed: a changed
 * 6B shape or an author edit must not be silently treated as the old authority.
 */

const R13_SIX_B_EXECUTION_SKILLS = ['303', '304', '305', '370'] as const
const R13_SIX_B_PRESHAKE_SKILLS = ['330', '334', '342', '357', '378', '380', '385'] as const
const R13_SIX_B_REORDERED_SKILLS = ['352', '372', '373'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // Keep the rewind copy-on-write. A published PAL baseline contains hundreds of MB of
    // JSON; eagerly cloning every file here used to put the canary over its 1168 MiB heap cap.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function setRewoundFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  snapshot.files.set(path, value)
  if (snapshot.hashes)
    snapshot.hashes.set(path, sha256(serializeMigrationJson(value, path)))
}

function sourceTransitionCount(value: unknown): number {
  let count = 0
  const walk = (current: unknown): void => {
    if (Array.isArray(current)) {
      for (const entry of current) walk(entry)
      return
    }
    if (!isRecord(current)) return
    if (
      current.kind === 'loadScene' &&
      isRecord(current.transition) &&
      current.transition.kind === 'source' &&
      typeof current.transition.evidenceId === 'string' &&
      current.transition.evidenceId.startsWith('pal-load-scene-')
    )
      count++
    for (const child of Object.values(current)) walk(child)
  }
  walk(value)
  return count
}

function hasPublishedR13SixBMarker(source: MigrationSnapshot): boolean {
  const hasMarker = (current: unknown): boolean => {
    if (Array.isArray(current)) return current.some(hasMarker)
    if (!isRecord(current)) return false
    if (
      (current.kind === 'holdScreen' || current.kind === 'revealScreen') &&
      typeof current.token === 'string'
    )
      return true
    if (
      current.kind === 'loadScene' &&
      isRecord(current.transition) &&
      current.transition.kind === 'source' &&
      typeof current.transition.evidenceId === 'string' &&
      current.transition.evidenceId.startsWith('pal-load-scene-')
    )
      return true
    return Object.values(current).some(hasMarker)
  }
  const skills = source.files.get('content/skills.json')
  return hasMarker(skills) || [...source.files.values()].some(hasMarker)
}

function visitArrays(
  value: unknown,
  visit: (commands: Array<Record<string, unknown>>) => void,
): void {
  if (Array.isArray(value)) {
    if (value.every(isRecord)) visit(value)
    for (const child of value) visitArrays(child, visit)
    return
  }
  if (isRecord(value)) for (const child of Object.values(value)) visitArrays(child, visit)
}

function rewindLoadSceneTransitions(snapshot: MigrationSnapshot): number {
  let removed = 0
  for (const [path, value] of snapshot.files) {
    if (sourceTransitionCount(value) === 0) continue
    const cloned = structuredClone(value)
    let changed = false
    const walk = (current: unknown): void => {
      if (Array.isArray(current)) {
        for (const entry of current) walk(entry)
        return
      }
      if (!isRecord(current)) return
      if (
        current.kind === 'loadScene' &&
        isRecord(current.transition) &&
        current.transition.kind === 'source' &&
        typeof current.transition.evidenceId === 'string' &&
        current.transition.evidenceId.startsWith('pal-load-scene-')
      ) {
        delete current.transition
        removed++
        changed = true
      }
      for (const child of Object.values(current)) walk(child)
    }
    walk(cloned)
    if (changed) setRewoundFile(snapshot, path, cloned)
  }
  return removed
}

function rewindBlackScreenTransaction(
  snapshot: MigrationSnapshot,
  token: string,
  inMs: number,
): void {
  let matches = 0
  for (const [path, value] of snapshot.files) {
    let fileMatches = 0
    visitArrays(value, (commands) => {
      const hold = commands.findIndex(
        (command) => command.kind === 'holdScreen' && command.token === token,
      )
      const reveal = commands.findIndex(
        (command) => command.kind === 'revealScreen' && command.token === token,
      )
      if (hold < 0 && reveal < 0) return
      if (hold < 0 || reveal < 0 || reveal <= hold)
        throw new Error(`R13-6B rewind: transaction 不闭合 ${token}`)
      fileMatches++
    })
    if (fileMatches === 0) continue
    const cloned = structuredClone(value)
    let changed = false
    visitArrays(cloned, (commands) => {
      const hold = commands.findIndex(
        (command) => command.kind === 'holdScreen' && command.token === token,
      )
      const reveal = commands.findIndex(
        (command) => command.kind === 'revealScreen' && command.token === token,
      )
      if (hold < 0 && reveal < 0) return
      if (hold < 0 || reveal < 0 || reveal <= hold)
        throw new Error(`R13-6B rewind: transaction 不闭合 ${token}`)
      commands.splice(reveal, 1, { kind: 'fade', dir: 'in', ms: inMs })
      commands.splice(hold, 1)
      matches++
      changed = true
    })
    if (changed) setRewoundFile(snapshot, path, cloned)
  }
  if (matches !== 1) throw new Error(`R13-6B rewind: transaction 命中 ${token}=${matches}`)
}

function rewindSkillOverlay(snapshot: MigrationSnapshot): void {
  const rawValue = snapshot.files.get('content/skills.json')
  const raw = structuredClone(rawValue)
  if (!isRecord(raw) || !Array.isArray(raw.skills))
    throw new Error('R13-6B rewind: skills.json 形状无效')
  const skills: Array<Record<string, unknown>> = (raw.skills as unknown[]).map((skill) => {
    if (!isRecord(skill)) throw new Error('R13-6B rewind: skills.json 条目无效')
    return skill
  })
  const byId = new Map<string, Record<string, unknown>>()
  for (const skill of skills) {
    if (typeof skill.id !== 'string' || byId.has(skill.id))
      throw new Error('R13-6B rewind: skill id 不唯一')
    byId.set(skill.id, skill)
  }
  for (const id of R13_SIX_B_EXECUTION_SKILLS) {
    const skill = byId.get(id)
    if (!skill || !Object.hasOwn(skill, 'execution'))
      throw new Error(`R13-6B rewind: 缺 execution overlay ${id}`)
    delete skill.execution
  }
  for (const id of R13_SIX_B_PRESHAKE_SKILLS) {
    const skill = byId.get(id)
    const animation = skill && isRecord(skill.animation) ? skill.animation : undefined
    if (!animation || !Object.hasOwn(animation, 'preShake'))
      throw new Error(`R13-6B rewind: 缺 preShake overlay ${id}`)
    delete animation.preShake
  }
  const alcohol = byId.get('370')
  const alcoholCost = alcohol && isRecord(alcohol.cost) ? alcohol.cost : undefined
  if (!alcoholCost || !Object.hasOwn(alcoholCost, 'items'))
    throw new Error('R13-6B rewind: 缺酒神 item cost overlay')
  delete alcoholCost.items
  if (!alcohol || !Object.hasOwn(alcohol, 'lifetimeLimit'))
    throw new Error('R13-6B rewind: 缺酒神 lifetimeLimit overlay')
  delete alcohol.lifetimeLimit

  const moved = new Set<string>(R13_SIX_B_REORDERED_SKILLS)
  const reordered = skills.filter((skill) => !moved.has(String(skill.id)))
  const insertAfter = (id: string, ids: readonly string[]) => {
    const index = reordered.findIndex((skill) => skill.id === id)
    if (index < 0) throw new Error(`R13-6B rewind: skill anchor 缺失 ${id}`)
    reordered.splice(index + 1, 0, ...ids.map((skillId) => byId.get(skillId)!))
  }
  insertAfter('342', ['352'])
  insertAfter('357', ['372', '373'])
  if (reordered.length !== skills.length) throw new Error('R13-6B rewind: skill 数量漂移')
  raw.skills = reordered as unknown as MigrationJson
  setRewoundFile(snapshot, 'content/skills.json', raw as MigrationJson)
}

/**
 * B11-1 是 6B-owned 叶(actors.json + locale.json 增量)。把 content11 还原成 6A
 * surface 时必须撤销:actors 删 coveredBy/casualty,locale 删 36 个 casualty 键。
 * fail-closed:6B 形状漂移或作者编辑不得被静默当成旧权威。
 */
function rewindCasualtyOverlay(snapshot: MigrationSnapshot): void {
  const actorsRaw = snapshot.files.get('content/actors.json')
  const actors = structuredClone(actorsRaw)
  if (!Array.isArray(actors))
    throw new Error('R13-6B rewind: actors.json 形状无效')
  let casualtyActors = 0
  const byId = new Map<string, Record<string, unknown>>()
  for (const entry of actors as unknown[]) {
    if (!isRecord(entry)) throw new Error('R13-6B rewind: actors.json 条目无效')
    if (typeof entry.id !== 'string') throw new Error('R13-6B rewind: actor id 非 string')
    byId.set(entry.id, entry)
  }
  for (const actorId of ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao']) {
    const actor = byId.get(actorId)
    const battler = actor && isRecord(actor.battler) ? actor.battler : undefined
    if (!battler) throw new Error(`R13-6B rewind: actor ${actorId} 缺 battler`)
    if ('coveredBy' in battler) delete battler.coveredBy
    if ('casualty' in battler) {
      casualtyActors++
      delete battler.casualty
    }
  }
  const expectedCasualtyActors = 3 // 李逍遥/赵灵儿/林月如
  if (casualtyActors !== expectedCasualtyActors)
    throw new Error(`R13-6B rewind: casualty actor 命中 ${casualtyActors}，期望 ${expectedCasualtyActors}`)
  setRewoundFile(snapshot, 'content/actors.json', actors as MigrationJson)

  const localeRaw = snapshot.files.get('content/locale.json')
  const locale = structuredClone(localeRaw)
  if (!isRecord(locale)) throw new Error('R13-6B rewind: locale.json 形状无效')
  let removed = 0
  for (const key of PAL_CASUALTY_LOCALE_KEYS) {
    if (!(key in locale)) throw new Error(`R13-6B rewind: 缺 casualty locale 键 ${key}`)
    delete locale[key]
    removed++
  }
  if (removed !== PAL_CASUALTY_LOCALE_KEYS.length)
    throw new Error('R13-6B rewind: casualty locale 键数量漂移')
  setRewoundFile(snapshot, 'content/locale.json', locale as MigrationJson)
}

export function rewindPalR13SixBPublication(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  const transitions = rewindLoadSceneTransitions(snapshot)
  // 871 source dispositions collapse onto 860 unique canonical loadScene commands; 11 aliases
  // become `already` during publication and must not be counted as distinct JSON leaves.
  if (transitions !== 860)
    throw new Error(`R13-6B rewind: loadScene transition 命中 ${transitions}，期望 860`)
  for (const evidence of PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE)
    rewindBlackScreenTransaction(snapshot, evidence.token, evidence.inMs)
  rewindSkillOverlay(snapshot)
  rewindCasualtyOverlay(snapshot)
  return snapshot
}

/** Synthetic v4/P7 fixtures predate R13-6B and must remain valid no-op inputs. */
export function rewindPalR13SixBPublicationIfPresent(source: MigrationSnapshot): MigrationSnapshot {
  return hasPublishedR13SixBMarker(source) ? rewindPalR13SixBPublication(source) : cloneSnapshot(source)
}
