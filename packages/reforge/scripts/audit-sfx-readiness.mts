import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type ActivePoison,
  type AssetId,
  buildWorld,
  type EntryPoint,
  effectiveSkills,
  type ItemData,
  type StartWorld,
} from '@type-pal/content'
import { SFX_DECODE_BUDGET } from '../src/audio/sfx.js'
import {
  collectBattleBaseSounds,
  collectSceneSoundAssets,
  collectTurnActionSounds,
} from '../src/audio/sfx-readiness.js'
import type { BattleAction } from '../src/battle/battle-core.js'
import type { FileSource } from '../src/file-source.js'
import { projectRelativeLegacyAdapter } from '../src/file-source.js'
import { loadAllScenes, loadAllScriptChunks, loadProjectFrom } from '../src/loader.js'

const repo = resolve(import.meta.dirname, '../../..')
const projectDir = resolve(repo, 'projects/pal')

function localSource(root: string): FileSource {
  const full = (rel: string): string => resolve(root, rel)
  const source: FileSource = {
    async readText(rel) {
      return readFileSync(full(rel), 'utf8')
    },
    async readJson<T>(rel) {
      return JSON.parse(readFileSync(full(rel), 'utf8')) as T
    },
    async readBytes(rel) {
      const bytes = readFileSync(full(rel))
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
    async urlFor(rel) {
      return `file://${full(rel)}`
    },
  }
  source.legacy = projectRelativeLegacyAdapter(source)
  return source
}

function visitObjects(value: unknown, visit: (value: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visitObjects(child, visit)
    return
  }
  if (!value || typeof value !== 'object') return
  const object = value as Record<string, unknown>
  visit(object)
  for (const child of Object.values(object)) visitObjects(child, visit)
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function mergeSounds(...sets: readonly ReadonlySet<AssetId>[]): Set<AssetId> {
  const merged = new Set<AssetId>()
  for (const set of sets) for (const asset of set) merged.add(asset)
  return merged
}

const source = localSource(projectDir)
const project = await loadProjectFrom(source)
const scenes = await loadAllScenes(project)
const chunks = await loadAllScriptChunks(project)
const signal = new AbortController().signal

function assertNoScriptLease(where: string): void {
  const leased = project.scriptStore?.stats.leased ?? 0
  if (leased !== 0) throw new Error(`${where}: ScriptChunkStore 尚有 ${leased} 个 lease`)
}

let maxScene = { id: '', sounds: 0 }
for (const scene of scenes) {
  const sounds = await collectSceneSoundAssets({
    scene,
    ...(project.scriptStore ? { resolver: project.scriptStore } : {}),
    signal,
  })
  if (sounds.size > maxScene.sounds) maxScene = { id: scene.id, sounds: sounds.size }
  assertNoScriptLease(`scene ${scene.id}`)
}

const allObjects: unknown[] = [...scenes, ...Object.values(chunks)]
const startBattles: Array<{
  team: number
  choreography?: unknown[]
}> = []
const learnedByRole = new Map<number, Set<string>>()
let sceneOverrideCommands = 0
for (const root of allObjects)
  visitObjects(root, (object) => {
    if (object.kind === 'startBattle' && Number.isInteger(object.team))
      startBattles.push({
        team: object.team as number,
        ...(Array.isArray(object.choreography) ? { choreography: object.choreography } : {}),
      })
    if (object.kind === 'setSceneOnEnter' || object.kind === 'setSceneOnTeleport')
      sceneOverrideCommands++
    if (
      object.kind === 'learnSkill' &&
      Number.isInteger(object.role) &&
      typeof object.skill === 'string'
    ) {
      const role = object.role as number
      const skills = learnedByRole.get(role) ?? new Set<string>()
      skills.add(object.skill)
      learnedByRole.set(role, skills)
    }
  })

function enemyDefs(teamId: string) {
  const team = project.enemyTeamsById[teamId]
  if (!team) throw new Error(`readiness audit: 敌队不存在 ${teamId}`)
  return team.members.map((id) => {
    const enemy = project.enemiesById[id]
    if (!enemy) throw new Error(`readiness audit: ${teamId} 引用缺失敌人 ${id}`)
    return enemy
  })
}

async function battleBaseSounds(
  start: StartWorld,
  teamId: string,
  choreography: readonly unknown[] = [],
): Promise<Set<AssetId>> {
  const world = buildWorld(start, project.actorsById)
  const sounds = await collectBattleBaseSounds({
    playerSounds: world.party.map(
      (character) => project.actorsById[character.template]?.battler?.sounds,
    ),
    cooperativeSkillIds: world.party.flatMap((character) => {
      const skill = project.actorsById[character.template]?.battler?.cooperativeMagicSkillId
      return skill ? [skill] : []
    }),
    enemyDefs: enemyDefs(teamId),
    enemiesById: project.enemiesById,
    skills: project.skills,
    itemsById: project.items,
    activePlayerPoisons: world.party.flatMap((character) => character.poisons ?? []),
    poisonDefs: project.poisonsById,
    roles: project.manifest.assets.roles,
    ...(choreography.length ? { encounterChoreography: choreography } : {}),
    ...(project.scriptStore ? { resolver: project.scriptStore } : {}),
    signal,
  })
  assertNoScriptLease(`battleBase ${teamId}`)
  return sounds
}

async function teamEnvelope(
  collect: (teamId: string) => Promise<ReadonlySet<AssetId>>,
): Promise<{ team: string; sounds: number }> {
  let maximum = { team: '', sounds: 0 }
  for (const teamId of Object.keys(project.enemyTeamsById)) {
    const sounds = await collect(teamId)
    if (sounds.size > maximum.sounds) maximum = { team: teamId, sounds: sounds.size }
  }
  return maximum
}

const entries: EntryPoint[] = project.manifest.entryPoints ?? [
  {
    id: 'new-game',
    label: '开始游戏',
    scene: project.manifest.entryScene,
    startWorld: project.manifest.startWorld,
  },
]
const entryBaseEnvelopes: Record<string, { team: string; sounds: number }> = {}
for (const entry of entries) {
  const start = entry.startWorld ?? project.manifest.startWorld
  entryBaseEnvelopes[entry.id] = await teamEnvelope((teamId) => battleBaseSounds(start, teamId))
}
const entryBaseMaximum = Object.entries(entryBaseEnvelopes).reduce(
  (maximum, [id, value]) => (value.sounds > maximum.sounds ? { entry: id, ...value } : maximum),
  { entry: '', team: '', sounds: 0 },
)

let startBattleBaseMaximum = { index: -1, team: '', sounds: 0 }
for (const [index, battle] of startBattles.entries()) {
  const team = `team-${battle.team}`
  const sounds = await battleBaseSounds(project.manifest.startWorld, team, battle.choreography)
  if (sounds.size > startBattleBaseMaximum.sounds)
    startBattleBaseMaximum = { index, team, sounds: sounds.size }
}

const actorOrder = Object.values(project.actorsById)
const progressionParty = ['li-xiaoyao', 'zhao-linger', 'lin-yueru']
const progressionSkills = Object.fromEntries(
  progressionParty.map((actorId) => [
    actorId,
    unique([
      ...(project.manifest.startWorld.learnedSkills[actorId] ?? []),
      ...(project.levelUp[actorId] ?? []).map((entry) => entry.skillId),
    ]),
  ]),
)
const progressionStart: StartWorld = {
  party: progressionParty,
  money: 0,
  learnedSkills: progressionSkills,
  inventory: [],
}
const progressionWithScripts: StartWorld = {
  ...progressionStart,
  learnedSkills: Object.fromEntries(
    progressionParty.map((actorId) => {
      const role = actorOrder.findIndex((actor) => actor.id === actorId)
      return [
        actorId,
        unique([...(progressionSkills[actorId] ?? []), ...(learnedByRole.get(role) ?? [])]),
      ]
    }),
  ),
}
const allSixStart: StartWorld = {
  party: actorOrder.map((actor) => actor.id),
  money: 0,
  learnedSkills: Object.fromEntries(
    actorOrder.map((actor) => [
      actor.id,
      unique([
        ...(project.manifest.startWorld.learnedSkills[actor.id] ?? []),
        ...(actor.battler?.initialMagic ?? []),
        ...(project.levelUp[actor.id] ?? []).map((entry) => entry.skillId),
        ...(learnedByRole.get(actorOrder.indexOf(actor)) ?? []),
      ]),
    ]),
  ),
  inventory: [],
}

const authorBattleBaseMaximum = await teamEnvelope((teamId) =>
  battleBaseSounds(allSixStart, teamId),
)
const allItems = Object.values(project.items)
const allPoisons = project.poisons.map((poison) => ({ poisonId: poison.id, tickIndex: 0 }))

function turnSounds(
  pendingActions: Iterable<BattleAction>,
  activePlayerPoisons: readonly ActivePoison[] = [],
  activeEnemyPoisons: readonly ActivePoison[] = [],
): Set<AssetId> {
  return collectTurnActionSounds({
    pendingActions,
    skills: project.skills,
    itemsById: project.items,
    poisonDefs: project.poisonsById,
    activePlayerPoisons,
    activeEnemyPoisons,
  })
}

function fullLoadActions(skillIds: readonly string[], items: readonly ItemData[]): BattleAction[] {
  const actions: BattleAction[] = skillIds.map((skillId) => ({ kind: 'cast', skillId }))
  for (const item of items) {
    if (item.use) actions.push({ kind: 'item', itemId: item.id })
    if (item.throw) actions.push({ kind: 'throw', itemId: item.id, targetEnemyIdx: 0 })
  }
  return actions
}

function effectiveSkillIds(start: StartWorld): string[] {
  const world = buildWorld(start, project.actorsById)
  return unique(
    world.party.flatMap((character) =>
      effectiveSkills(world.learnedSkills[character.id] ?? [], character, project.items),
    ),
  )
}

async function legacyFullLoadSounds(
  start: StartWorld,
  teamId: string,
  skillIds: readonly string[],
): Promise<number> {
  const base = await battleBaseSounds(start, teamId)
  const dynamic = turnSounds(fullLoadActions(skillIds, allItems), allPoisons, allPoisons)
  return mergeSounds(base, dynamic).size
}

const legacyFullLoadEvidence = {
  'progression-three': await legacyFullLoadSounds(
    progressionStart,
    'team-291',
    effectiveSkillIds(progressionStart),
  ),
  'progression-three+script-learn': await legacyFullLoadSounds(
    progressionWithScripts,
    'team-291',
    effectiveSkillIds(progressionWithScripts),
  ),
  'author-intent-six': await teamEnvelope(async (teamId) => {
    const base = await battleBaseSounds(allSixStart, teamId)
    return mergeSounds(
      base,
      turnSounds(
        fullLoadActions(unique(Object.values(allSixStart.learnedSkills).flat()), allItems),
        allPoisons,
        allPoisons,
      ),
    )
  }),
}

let maxSingleAction = { kind: '', id: '', sounds: 0 }
for (const skill of Object.values(project.skills)) {
  const sounds = turnSounds([{ kind: 'cast', skillId: skill.id }]).size
  if (sounds > maxSingleAction.sounds) maxSingleAction = { kind: 'skill', id: skill.id, sounds }
}
for (const item of allItems) {
  if (item.use) {
    const sounds = turnSounds([{ kind: 'item', itemId: item.id }]).size
    if (sounds > maxSingleAction.sounds) maxSingleAction = { kind: 'item-use', id: item.id, sounds }
  }
  if (item.throw) {
    const sounds = turnSounds([{ kind: 'throw', itemId: item.id, targetEnemyIdx: 0 }]).size
    if (sounds > maxSingleAction.sounds)
      maxSingleAction = { kind: 'item-throw', id: item.id, sounds }
  }
}

const activePoisonUpper = turnSounds([], allPoisons, allPoisons).size
const fivePlayerTurnUpper =
  authorBattleBaseMaximum.sounds + 5 * maxSingleAction.sounds + activePoisonUpper
// 当前 runtime 没有玩家人数上限；PAL 作者数据共六角色，额外保留更强的六人包络门禁。
const authorSixTurnUpper =
  authorBattleBaseMaximum.sounds + actorOrder.length * maxSingleAction.sounds + activePoisonUpper

let maxSceneWithItems = { id: '', sounds: 0 }
for (const scene of scenes) {
  const sounds = await collectSceneSoundAssets({
    scene,
    inventoryItems: allItems,
    ...(project.scriptStore ? { resolver: project.scriptStore } : {}),
    signal,
  })
  if (sounds.size > maxSceneWithItems.sounds)
    maxSceneWithItems = { id: scene.id, sounds: sounds.size }
  assertNoScriptLease(`scene+all-items ${scene.id}`)
}

const expected = {
  entryBaseMaximum: 26,
  startBattleBaseMaximum: 26,
  authorBattleBaseMaximum: 51,
  maxSingleAction: 2,
  activePoisonUpper: 0,
  fivePlayerTurnUpper: 61,
  authorSixTurnUpper: 63,
  legacyProgressionThree: 67,
  legacyProgressionThreeWithScripts: 74,
  legacyAuthorIntentSix: 94,
} as const
const actual = {
  entryBaseMaximum: entryBaseMaximum.sounds,
  startBattleBaseMaximum: startBattleBaseMaximum.sounds,
  authorBattleBaseMaximum: authorBattleBaseMaximum.sounds,
  maxSingleAction: maxSingleAction.sounds,
  activePoisonUpper,
  fivePlayerTurnUpper,
  authorSixTurnUpper,
  legacyProgressionThree: legacyFullLoadEvidence['progression-three'],
  legacyProgressionThreeWithScripts: legacyFullLoadEvidence['progression-three+script-learn'],
  legacyAuthorIntentSix: legacyFullLoadEvidence['author-intent-six'].sounds,
} as const

const violations: string[] = []
for (const key of Object.keys(expected) as Array<keyof typeof expected>)
  if (actual[key] !== expected[key])
    violations.push(`${key}: expected=${expected[key]}, actual=${actual[key]}`)
for (const [id, value] of Object.entries(entryBaseEnvelopes))
  if (value.sounds > SFX_DECODE_BUDGET) violations.push(`entryBase:${id}=${value.sounds}`)
if (startBattleBaseMaximum.sounds > SFX_DECODE_BUDGET)
  violations.push(`startBattleBase:${startBattleBaseMaximum.team}=${startBattleBaseMaximum.sounds}`)
if (authorBattleBaseMaximum.sounds > SFX_DECODE_BUDGET)
  violations.push(`battleBase:${authorBattleBaseMaximum.team}=${authorBattleBaseMaximum.sounds}`)
if (maxSingleAction.sounds > SFX_DECODE_BUDGET)
  violations.push(
    `singleAction:${maxSingleAction.kind}:${maxSingleAction.id}=${maxSingleAction.sounds}`,
  )
if (fivePlayerTurnUpper > SFX_DECODE_BUDGET)
  violations.push(`fivePlayerTurnUpper=${fivePlayerTurnUpper}`)
if (authorSixTurnUpper > SFX_DECODE_BUDGET)
  violations.push(`authorSixTurnUpper=${authorSixTurnUpper}`)
if (maxScene.sounds > SFX_DECODE_BUDGET) violations.push(`scene:${maxScene.id}=${maxScene.sounds}`)
if (maxSceneWithItems.sounds > SFX_DECODE_BUDGET)
  violations.push(`sceneWithItems:${maxSceneWithItems.id}=${maxSceneWithItems.sounds}`)
const leased = project.scriptStore?.stats.leased ?? 0
if (leased !== 0) violations.push(`scriptStore.leased=${leased}`)

const report = {
  budget: SFX_DECODE_BUDGET,
  scenes: scenes.length,
  enemyTeams: Object.keys(project.enemyTeamsById).length,
  scriptChunks: Object.keys(chunks).length,
  startBattles: startBattles.length,
  sceneOverrideCommands,
  maxScene,
  maxSceneWithItems,
  entryBaseEnvelopes,
  entryBaseMaximum,
  startBattleBaseMaximum,
  authorBattleBaseMaximum,
  maxSingleAction,
  activePoisonUpper,
  fivePlayerTurnUpper,
  authorSixTurnUpper,
  legacyFullLoadEvidence,
  scriptStore: project.scriptStore?.stats,
  violations,
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
if (violations.length) process.exitCode = 1
