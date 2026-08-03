import type {
  AuthorCommandV5,
  BattleChoreography,
  EnemyDef,
  ItemDataV5,
  SceneDefV5,
  ScriptFlowV5,
  SharedScriptLibraryV5,
  SkillData,
  SkillEffect,
} from '@type-pal/content'
import { AUTHOR_COMMAND_V5_KINDS, SCENE_ENTRY_PREPARE_SAFETY } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_RUNTIME_CAPABILITY_METHOD = 'n3-p7-r13-runtime-capability-v2' as const

export const R13_COMMAND_CONTEXTS = [
  'scene-entry-prepare',
  'world-interactive',
  'world-auto',
  'item-private-world',
  'battle-choreography',
  'enemy-on-defeated',
] as const

export type R13CommandContext = (typeof R13_COMMAND_CONTEXTS)[number]
export type R13CapabilityStatus = 'executed' | 'equivalent' | 'refused'

export const R13_SKILL_CONTEXTS = [
  'skill-outdoor',
  'skill-player-battle',
  'skill-enemy-battle',
] as const

export type R13SkillContext = (typeof R13_SKILL_CONTEXTS)[number]

export interface R13RuntimeCapabilityCell {
  context: R13CommandContext
  kind: string
  status: R13CapabilityStatus
  evidenceId: string
  constraint?: string
}

export interface R13SkillCapabilityCell {
  context: R13SkillContext
  kind: SkillEffect['kind']
  status: R13CapabilityStatus
  evidenceId: string
}

interface R13RuntimeCapabilityUseBase {
  path: string
  status: R13CapabilityStatus
  evidenceId: string
}

export type R13RuntimeCapabilityUse =
  | (R13RuntimeCapabilityUseBase & {
      domain: 'command'
      context: R13CommandContext
      kind: AuthorCommandV5['kind']
    })
  | (R13RuntimeCapabilityUseBase & {
      domain: 'skill-effect'
      context: R13SkillContext
      kind: SkillEffect['kind']
    })

export interface R13RuntimeEnemyCastUse {
  path: string
  skillId: string
  skillFound: boolean
  effectKinds: SkillEffect['kind'][]
}

export interface R13RuntimeCapabilityDebt {
  id: string
  batch: 'R13-4'
  behavior: 'constant-result'
  context: 'world-interactive' | 'world-auto' | 'item-private-world'
  kind: 'confirm'
  sites: string[]
}

export interface R13RuntimeCapabilityAuditV2 {
  kind: 'r13-runtime-capability-audit'
  version: 2
  methodVersion: typeof R13_RUNTIME_CAPABILITY_METHOD
  matrix: {
    commandKinds: string[]
    commandCells: R13RuntimeCapabilityCell[]
    skillKinds: SkillEffect['kind'][]
    skillCells: R13SkillCapabilityCell[]
  }
  uses: R13RuntimeCapabilityUse[]
  enemyCasts: R13RuntimeEnemyCastUse[]
  debts: R13RuntimeCapabilityDebt[]
  issues: string[]
  summary: {
    commandKinds: number
    commandContexts: number
    commandCells: number
    skillKinds: number
    skillContexts: number
    skillCells: number
    uses: number
    refusedUses: number
    openDebts: number
    enemyCastRules: number
    enemyDistinctSkillIds: number
    enemyEffectUses: number
  }
  digest: string
}

interface RuntimeCorpus {
  scenes: SceneDefV5[]
  items: ItemDataV5[]
  sharedScripts: SharedScriptLibraryV5
  enemies: EnemyDef[]
  skills: SkillData[]
}

/**
 * The published R13-confirm seal predates `wait` becoming legal in a hidden
 * scene-entry prepare. Keep that compatibility axis local to the historical
 * audit instead of mutating the current shared capability table.
 */
interface R13RuntimeCapabilityAuditOptions {
  sceneEntryWaitSafe?: boolean
  /** R13-confirm matrix predates hold/reveal and resourceDelta. */
  r13SixBCapabilities?: boolean
}

const R13_RUNTIME_CAPABILITY_HISTORICAL_CONFIRM_OPTIONS = Object.freeze({
  sceneEntryWaitSafe: false,
  r13SixBCapabilities: false,
})

const COMMAND_EVIDENCE = {
  prepare: 'content:scene-entry-prepare-safety',
  world: 'reforge:v5-world-command-host',
  autoRefusal: 'reforge:v5-auto-host-refusal',
  itemSelf: 'reforge:v5-item-private-self-policy',
  choreography: 'reforge:battle-choreography-runner',
  defeated: 'reforge:enemy-on-defeated-runner',
  confirm: 'reforge:v5-script-confirm-modal',
} as const

const SKILL_EVIDENCE = {
  outdoor: 'reforge:outdoor-skill-effects',
  player: 'reforge:player-battle-skill-effects',
  enemy: 'reforge:enemy-battle-skill-effects',
} as const

const WORLD_REFUSED = new Set(['endBattle', 'fleeBattle'])
const AUTO_REFUSED = new Set([
  ...WORLD_REFUSED,
  'loadScene',
  'takeEntity',
  'releaseEntity',
  'mountParty',
  'unmountParty',
  'ride',
])
const ITEM_REFUSED = new Set([...WORLD_REFUSED, 'chasePlayer'])
const CHOREOGRAPHY_EXECUTED = new Set(['dialog', 'playSound', 'fleeBattle', 'endBattle'])
const ON_DEFEATED_EXECUTED = new Set(['dialog', 'giveItem', 'branch', 'stopScript'])

const SKILL_EFFECT_KIND_TABLE = {
  applyPoison: true,
  applyStatus: true,
  buffStat: true,
  collectTreasure: true,
  curePoison: true,
  damage: true,
  fleeBattle: true,
  gate: true,
  healHp: true,
  healMp: true,
  instantKill: true,
  moneyDamage: true,
  removeStatus: true,
  revive: true,
  resourceDelta: true,
  steal: true,
  summon: true,
  trance: true,
} as const satisfies Record<SkillEffect['kind'], true>

const OUTDOOR_SKILL_EFFECTS = new Set<SkillEffect['kind']>([
  'healHp',
  'healMp',
  'revive',
  'curePoison',
])
const ENEMY_SKILL_EFFECTS = new Set<SkillEffect['kind']>([
  'gate',
  'instantKill',
  'applyPoison',
  'damage',
  'healHp',
  'applyStatus',
])

function commandStatus(
  kind: string,
  context: R13CommandContext,
  options: R13RuntimeCapabilityAuditOptions,
): R13RuntimeCapabilityCell {
  if (context === 'scene-entry-prepare') {
    const v5Safe =
      kind === 'selectEntityBehavior' ||
      kind === 'selectEntityPage' ||
      kind === 'setEntityTriggerActivation' ||
      kind === 'selectSceneHooks'
    const legacySafe =
      kind === 'wait' && options.sceneEntryWaitSafe === false
        ? false
        : SCENE_ENTRY_PREPARE_SAFETY[kind as keyof typeof SCENE_ENTRY_PREPARE_SAFETY] === 'safe'
    const status =
      (v5Safe || legacySafe) && kind !== 'endBattle' && kind !== 'fleeBattle'
        ? 'executed'
        : 'refused'
    return {
      context,
      kind,
      status,
      evidenceId: COMMAND_EVIDENCE.prepare,
    }
  }
  if (context === 'battle-choreography')
    return {
      context,
      kind,
      status: CHOREOGRAPHY_EXECUTED.has(kind) ? 'executed' : 'refused',
      evidenceId: COMMAND_EVIDENCE.choreography,
    }
  if (context === 'enemy-on-defeated')
    return {
      context,
      kind,
      status: ON_DEFEATED_EXECUTED.has(kind) ? 'executed' : 'refused',
      evidenceId: COMMAND_EVIDENCE.defeated,
      ...(kind === 'branch' ? { constraint: 'chance-only condition' } : {}),
    }
  if (context === 'world-auto')
    return {
      context,
      kind,
      status: AUTO_REFUSED.has(kind) ? 'refused' : 'executed',
      evidenceId: AUTO_REFUSED.has(kind)
        ? COMMAND_EVIDENCE.autoRefusal
        : kind === 'confirm'
          ? COMMAND_EVIDENCE.confirm
          : COMMAND_EVIDENCE.world,
    }
  if (context === 'item-private-world')
    return {
      context,
      kind,
      status: ITEM_REFUSED.has(kind) ? 'refused' : 'executed',
      evidenceId: ITEM_REFUSED.has(kind)
        ? COMMAND_EVIDENCE.itemSelf
        : kind === 'confirm'
          ? COMMAND_EVIDENCE.confirm
          : COMMAND_EVIDENCE.world,
      ...(kind === 'vanishEntity' ? { constraint: 'explicit target required' } : {}),
    }
  return {
    context,
    kind,
    status: WORLD_REFUSED.has(kind) ? 'refused' : 'executed',
    evidenceId: kind === 'confirm' ? COMMAND_EVIDENCE.confirm : COMMAND_EVIDENCE.world,
  }
}

function skillStatus(kind: SkillEffect['kind'], context: R13SkillContext): R13SkillCapabilityCell {
  if (context === 'skill-outdoor')
    return {
      context,
      kind,
      status: OUTDOOR_SKILL_EFFECTS.has(kind) ? 'executed' : 'refused',
      evidenceId: SKILL_EVIDENCE.outdoor,
    }
  if (context === 'skill-enemy-battle')
    return {
      context,
      kind,
      status: ENEMY_SKILL_EFFECTS.has(kind) ? 'executed' : 'refused',
      evidenceId: SKILL_EVIDENCE.enemy,
    }
  return {
    context,
    kind,
    status: 'executed',
    evidenceId: SKILL_EVIDENCE.player,
  }
}

function buildR13RuntimeCapabilityMatrixWithOptions(
  options: R13RuntimeCapabilityAuditOptions = {},
): R13RuntimeCapabilityAuditV2['matrix'] {
  const commandKinds = Object.entries(AUTHOR_COMMAND_V5_KINDS)
    .filter(([, enabled]) => enabled)
    .map(([kind]) => kind)
    .filter(
      (kind) =>
        options.r13SixBCapabilities !== false || (kind !== 'holdScreen' && kind !== 'revealScreen'),
    )
    .sort(stableStringCompare)
  const commandCells = R13_COMMAND_CONTEXTS.flatMap((context) =>
    commandKinds.map((kind) => commandStatus(kind, context, options)),
  )
  const skillKinds = (Object.keys(SKILL_EFFECT_KIND_TABLE) as SkillEffect['kind'][])
    .filter((kind) => options.r13SixBCapabilities !== false || kind !== 'resourceDelta')
    .sort(stableStringCompare)
  const skillCells = R13_SKILL_CONTEXTS.flatMap((context) =>
    skillKinds.map((kind) => skillStatus(kind, context)),
  )
  return { commandKinds, commandCells, skillKinds, skillCells }
}

export function buildR13RuntimeCapabilityMatrix(): R13RuntimeCapabilityAuditV2['matrix'] {
  return buildR13RuntimeCapabilityMatrixWithOptions()
}

function value<T>(snapshot: MigrationSnapshot, path: string): T {
  const entry = snapshot.files.get(path)
  if (entry === undefined) throw new Error(`R13 runtime capability: 缺 ${path}`)
  return entry as unknown as T
}

function runtimeCorpus(snapshot: MigrationSnapshot): RuntimeCorpus {
  const sceneIds = value<unknown[]>(snapshot, 'content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('R13 runtime capability: scenes/index.json 无效')
  const skills = value<{ skills?: unknown }>(snapshot, 'content/skills.json')
  if (!Array.isArray(skills.skills))
    throw new Error('R13 runtime capability: content/skills.json 无效')
  return {
    scenes: sceneIds.map((id) => value<SceneDefV5>(snapshot, `content/scenes/${String(id)}.json`)),
    items: value<ItemDataV5[]>(snapshot, 'content/items.json'),
    sharedScripts: value<SharedScriptLibraryV5>(snapshot, 'content/shared-scripts.json'),
    enemies: value<EnemyDef[]>(snapshot, 'content/enemies.json'),
    skills: skills.skills as SkillData[],
  }
}

function isChanceOnlyBranch(command: AuthorCommandV5): boolean {
  return command.kind !== 'branch' || command.cond.kind === 'chance'
}

function cellKey(context: R13CommandContext, kind: string): string {
  return `${context}\u0000${kind}`
}

function skillCellKey(context: R13SkillContext, kind: string): string {
  return `${context}\u0000${kind}`
}

function buildConfirmDebts(uses: readonly R13RuntimeCapabilityUse[]): R13RuntimeCapabilityDebt[] {
  const sitesByContext = new Map<R13RuntimeCapabilityDebt['context'], string[]>()
  for (const use of uses) {
    if (
      use.domain !== 'command' ||
      use.kind !== 'confirm' ||
      use.status !== 'refused' ||
      (use.context !== 'world-interactive' &&
        use.context !== 'world-auto' &&
        use.context !== 'item-private-world')
    )
      continue
    const sites = sitesByContext.get(use.context) ?? []
    sites.push(use.path)
    sitesByContext.set(use.context, sites)
  }
  return [...sitesByContext]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([context, sites]) => ({
      id: `r13-runtime:${context}:confirm`,
      batch: 'R13-4',
      behavior: 'constant-result',
      context,
      kind: 'confirm',
      sites: [...sites].sort(stableStringCompare),
    }))
}

function auditR13RuntimeCapabilitiesWithOptions(
  snapshot: MigrationSnapshot,
  options: R13RuntimeCapabilityAuditOptions = {},
): R13RuntimeCapabilityAuditV2 {
  const corpus = runtimeCorpus(snapshot)
  const matrix = buildR13RuntimeCapabilityMatrixWithOptions(options)
  const commandCells = new Map(
    matrix.commandCells.map((cell) => [cellKey(cell.context, cell.kind), cell]),
  )
  const skillCells = new Map(
    matrix.skillCells.map((cell) => [skillCellKey(cell.context, cell.kind), cell]),
  )
  const uses: R13RuntimeCapabilityUse[] = []
  const enemyCasts: R13RuntimeEnemyCastUse[] = []
  const issues: string[] = []
  const activeShared = new Set<string>()
  const completedShared = new Set<string>()
  const skillsById = new Map<string, SkillData>()
  for (const skill of corpus.skills) {
    if (skillsById.has(skill.id)) issues.push(`duplicate-skill-id:${skill.id}`)
    skillsById.set(skill.id, skill)
  }
  const noteUse = (
    command: AuthorCommandV5,
    context: R13CommandContext,
    path: string,
    hasSelf: boolean,
  ): R13RuntimeCapabilityCell | undefined => {
    const cell = commandCells.get(cellKey(context, command.kind))
    if (!cell) {
      issues.push(`missing-command-cell:${context}:${command.kind}:${path}`)
      return undefined
    }
    uses.push({
      domain: 'command',
      context,
      kind: command.kind,
      path,
      status: cell.status,
      evidenceId: cell.evidenceId,
    })
    const isConfirmDebt =
      command.kind === 'confirm' &&
      (context === 'world-interactive' ||
        context === 'world-auto' ||
        context === 'item-private-world')
    if (cell.status === 'refused' && !isConfirmDebt)
      issues.push(`unregistered-refused-command:${context}:${command.kind}:${path}`)
    if (
      cell.status !== 'refused' &&
      !hasSelf &&
      (command.kind === 'chasePlayer' ||
        (command.kind === 'vanishEntity' && command.target === undefined))
    )
      issues.push(`command-needs-self:${context}:${command.kind}:${path}`)
    if (context === 'enemy-on-defeated' && !isChanceOnlyBranch(command))
      issues.push(`enemy-on-defeated-branch-not-chance:${path}`)
    return cell
  }

  const visitShared = (
    scriptId: string,
    context: R13CommandContext,
    path: string,
    callerHasSelf: boolean,
    explicitSelf = false,
  ): void => {
    const script = corpus.sharedScripts[scriptId]
    if (!script) {
      issues.push(`missing-shared-script:${scriptId}:${path}`)
      return
    }
    if (script.self === 'none' && explicitSelf)
      issues.push(`shared-script-rejects-explicit-self:${scriptId}:${path}`)
    const hasSelf = script.self === 'none' ? false : explicitSelf || callerHasSelf
    if (script.self === 'required' && !hasSelf) {
      issues.push(`shared-script-needs-self:${scriptId}:${path}`)
      return
    }
    const stateKey = `${scriptId}\u0000${context}\u0000${hasSelf ? 'self' : 'no-self'}`
    if (completedShared.has(stateKey) || activeShared.has(stateKey)) return
    activeShared.add(stateKey)
    visitCommands(script.body, context, `${path}/shared(${scriptId})`, hasSelf)
    activeShared.delete(stateKey)
    completedShared.add(stateKey)
  }

  const visitChoreography = (body: BattleChoreography['body'], path: string): void => {
    visitCommands(body as unknown as AuthorCommandV5[], 'battle-choreography', path, false)
  }

  const visitCommands = (
    commands: readonly AuthorCommandV5[],
    context: R13CommandContext,
    path: string,
    hasSelf: boolean,
  ): void => {
    commands.forEach((command, index) => {
      const commandPath = `${path}/${index}:${command.kind}`
      noteUse(command, context, commandPath, hasSelf)
      if (command.kind === 'callScript') {
        visitShared(command.script, context, commandPath, hasSelf, command.self !== undefined)
        return
      }
      if (command.kind === 'branch') {
        visitCommands(command.then, context, `${commandPath}/then`, hasSelf)
        if (command.else) visitCommands(command.else, context, `${commandPath}/else`, hasSelf)
        return
      }
      if (command.kind === 'loop') {
        visitCommands(command.body, context, `${commandPath}/body`, hasSelf)
        return
      }
      if (command.kind === 'confirm') {
        visitCommands(command.onNo, context, `${commandPath}/onNo`, hasSelf)
        return
      }
      if (command.kind === 'teleportOut' && command.onFail)
        visitCommands(command.onFail, context, `${commandPath}/onFail`, hasSelf)
      if (command.kind === 'startBattle') {
        if (command.onLose) visitCommands(command.onLose, context, `${commandPath}/onLose`, hasSelf)
        if (command.onFlee) visitCommands(command.onFlee, context, `${commandPath}/onFlee`, hasSelf)
        command.choreography?.forEach((entry, choreographyIndex) => {
          visitChoreography(entry.body, `${commandPath}/choreography/${choreographyIndex}`)
        })
      }
    })
  }

  const visitFlow = (
    flow: ScriptFlowV5,
    context: 'world-interactive' | 'world-auto',
    path: string,
    hasSelf: boolean,
  ): void => {
    const nodes =
      flow.kind === 'stages'
        ? flow.stages.map((stage) => ({
            id: stage.id,
            body: stage.body,
            entry: stage.entry,
          }))
        : Object.entries(flow.machine.states).map(([id, state]) => ({
            id,
            body: state.body,
            entry: state.entry,
          }))
    for (const node of nodes) {
      if (node.entry)
        visitCommands(
          node.entry.prepare,
          'scene-entry-prepare',
          `${path}/${node.id}/prepare`,
          hasSelf,
        )
      visitCommands(node.body, context, `${path}/${node.id}/body`, hasSelf)
    }
  }

  for (const scene of corpus.scenes) {
    for (const [slot, channel] of Object.entries(scene.hooks ?? {}))
      for (const [hookId, hook] of Object.entries(channel?.variants ?? {}))
        visitFlow(
          hook.flow,
          'world-interactive',
          `scene(${scene.id})/hook(${slot}:${hookId})`,
          false,
        )
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
          visitFlow(
            behavior.flow,
            channel === 'auto' ? 'world-auto' : 'world-interactive',
            `scene(${scene.id})/entity(${entity.id})/${channel}(${behaviorId})`,
            true,
          )
    for (const entity of scene.entities)
      if (Array.isArray(entity.hostile?.onLose))
        visitCommands(
          entity.hostile.onLose,
          'world-interactive',
          `scene(${scene.id})/entity(${entity.id})/hostile/onLose`,
          true,
        )
  }

  for (const item of corpus.items) {
    item.use?.effects.forEach((effect, index) => {
      const path = `item(${item.id})/use/${index}:${effect.kind}`
      if (effect.kind === 'itemPrivateScript')
        visitCommands(effect.script.body, 'item-private-world', path, false)
      else if (effect.kind === 'runScript')
        visitShared(effect.script, 'item-private-world', path, false)
    })
  }

  for (const enemy of corpus.enemies) {
    enemy.choreography?.forEach((entry, index) => {
      visitChoreography(entry.body, `enemy(${enemy.id})/choreography/${index}`)
    })
    if (enemy.onDefeated)
      visitCommands(
        enemy.onDefeated as unknown as AuthorCommandV5[],
        'enemy-on-defeated',
        `enemy(${enemy.id})/onDefeated`,
        false,
      )
  }

  const noteSkillUse = (effect: SkillEffect, context: R13SkillContext, path: string): void => {
    const cell = skillCells.get(skillCellKey(context, effect.kind))
    if (!cell) {
      issues.push(`missing-skill-cell:${context}:${effect.kind}:${path}`)
      return
    }
    uses.push({
      domain: 'skill-effect',
      context,
      kind: effect.kind,
      path,
      status: cell.status,
      evidenceId: cell.evidenceId,
    })
    if (cell.status === 'refused')
      issues.push(`unregistered-refused-skill-effect:${context}:${effect.kind}:${path}`)
  }

  for (const skill of corpus.skills)
    for (const [index, effect] of skill.effects.entries()) {
      noteSkillUse(
        effect,
        'skill-player-battle',
        `skill(${skill.id})/player/effects/${index}:${effect.kind}`,
      )
      if (skill.usableOutsideBattle)
        noteSkillUse(
          effect,
          'skill-outdoor',
          `skill(${skill.id})/outdoor/effects/${index}:${effect.kind}`,
        )
    }

  for (const enemy of corpus.enemies)
    for (const [ruleIndex, rule] of (enemy.ai.rules ?? []).entries()) {
      if (rule.do.kind !== 'cast') continue
      const skill = skillsById.get(rule.do.skillId)
      const rulePath = `enemy(${enemy.id})/ai/rules/${ruleIndex}:cast(${rule.do.skillId})`
      if (!skill) {
        enemyCasts.push({
          path: rulePath,
          skillId: rule.do.skillId,
          skillFound: false,
          effectKinds: [],
        })
        issues.push(`enemy-cast-missing-skill:${rule.do.skillId}:${rulePath}`)
        continue
      }
      enemyCasts.push({
        path: rulePath,
        skillId: rule.do.skillId,
        skillFound: true,
        effectKinds: skill.effects.map((effect) => effect.kind),
      })
      for (const [effectIndex, effect] of skill.effects.entries()) {
        noteSkillUse(
          effect,
          'skill-enemy-battle',
          `${rulePath}/effects/${effectIndex}:${effect.kind}`,
        )
      }
    }

  const debts = buildConfirmDebts(uses)
  uses.sort(
    (left, right) =>
      stableStringCompare(left.domain, right.domain) ||
      stableStringCompare(left.context, right.context) ||
      stableStringCompare(left.path, right.path),
  )
  enemyCasts.sort((left, right) => stableStringCompare(left.path, right.path))
  const uniqueIssues = [...new Set(issues)].sort(stableStringCompare)
  const withoutDigest = {
    kind: 'r13-runtime-capability-audit' as const,
    version: 2 as const,
    methodVersion: R13_RUNTIME_CAPABILITY_METHOD,
    matrix,
    uses,
    enemyCasts,
    debts,
    issues: uniqueIssues,
    summary: {
      commandKinds: matrix.commandKinds.length,
      commandContexts: R13_COMMAND_CONTEXTS.length,
      commandCells: matrix.commandCells.length,
      skillKinds: matrix.skillKinds.length,
      skillContexts: R13_SKILL_CONTEXTS.length,
      skillCells: matrix.skillCells.length,
      uses: uses.length,
      refusedUses: uses.filter((use) => use.status === 'refused').length,
      openDebts: debts.reduce((total, debt) => total + debt.sites.length, 0),
      enemyCastRules: enemyCasts.length,
      enemyDistinctSkillIds: new Set(enemyCasts.map((cast) => cast.skillId)).size,
      enemyEffectUses: enemyCasts.reduce((total, cast) => total + cast.effectKinds.length, 0),
    },
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

export function auditR13RuntimeCapabilities(
  snapshot: MigrationSnapshot,
): R13RuntimeCapabilityAuditV2 {
  return auditR13RuntimeCapabilitiesWithOptions(snapshot)
}

/** Rebuild the byte-pinned published R13-confirm audit under its historical matrix. */
export function auditHistoricalR13ConfirmRuntimeCapabilities(
  snapshot: MigrationSnapshot,
): R13RuntimeCapabilityAuditV2 {
  return auditR13RuntimeCapabilitiesWithOptions(
    snapshot,
    R13_RUNTIME_CAPABILITY_HISTORICAL_CONFIRM_OPTIONS,
  )
}

function assertR13RuntimeCapabilityAuditWithOptions(
  report: R13RuntimeCapabilityAuditV2,
  snapshot: MigrationSnapshot,
  options: R13RuntimeCapabilityAuditOptions = {},
): void {
  if (
    report.kind !== 'r13-runtime-capability-audit' ||
    report.version !== 2 ||
    report.methodVersion !== R13_RUNTIME_CAPABILITY_METHOD
  )
    throw new Error('R13 runtime capability: header 漂移')
  const expectedMatrix = buildR13RuntimeCapabilityMatrixWithOptions(options)
  if (stableJsonSha256(report.matrix) !== stableJsonSha256(expectedMatrix))
    throw new Error('R13 runtime capability: matrix 漂移')
  const commandCells = new Map(
    expectedMatrix.commandCells.map((cell) => [cellKey(cell.context, cell.kind), cell]),
  )
  const skillCells = new Map(
    expectedMatrix.skillCells.map((cell) => [skillCellKey(cell.context, cell.kind), cell]),
  )
  const useKeys = new Set<string>()
  for (const [index, use] of report.uses.entries()) {
    const domain = (use as { domain?: unknown }).domain
    if (domain !== 'command' && domain !== 'skill-effect')
      throw new Error(`R13 runtime capability: use domain 无效 ${String(domain)}`)
    const key = `${use.domain}\0${use.context}\0${use.path}`
    if (useKeys.has(key)) throw new Error(`R13 runtime capability: duplicate use ${key}`)
    useKeys.add(key)
    if (index > 0) {
      const previous = report.uses[index - 1]!
      const order =
        stableStringCompare(previous.domain, use.domain) ||
        stableStringCompare(previous.context, use.context) ||
        stableStringCompare(previous.path, use.path)
      if (order >= 0) throw new Error('R13 runtime capability: uses 排序漂移')
    }
    const cell =
      use.domain === 'command'
        ? commandCells.get(cellKey(use.context as R13CommandContext, use.kind))
        : skillCells.get(skillCellKey(use.context as R13SkillContext, use.kind))
    if (!cell || cell.status !== use.status || cell.evidenceId !== use.evidenceId)
      throw new Error(
        `R13 runtime capability: use/cell 漂移 ${use.context}:${use.kind}:${use.path}`,
      )
  }
  const expectedDebts = buildConfirmDebts(report.uses)
  if (stableJsonSha256(report.debts) !== stableJsonSha256(expectedDebts))
    throw new Error('R13 runtime capability: debts/confirm uses 漂移')
  const issueSet = new Set(report.issues)
  for (const use of report.uses) {
    if (use.status !== 'refused') continue
    const isConfirmDebt =
      use.domain === 'command' &&
      use.kind === 'confirm' &&
      (use.context === 'world-interactive' ||
        use.context === 'world-auto' ||
        use.context === 'item-private-world')
    if (isConfirmDebt) continue
    const expectedIssue =
      use.domain === 'command'
        ? `unregistered-refused-command:${use.context}:${use.kind}:${use.path}`
        : `unregistered-refused-skill-effect:${use.context}:${use.kind}:${use.path}`
    if (!issueSet.has(expectedIssue))
      throw new Error(
        `R13 runtime capability: refused use 缺 issue ${use.context}:${use.kind}:${use.path}`,
      )
  }
  for (let index = 1; index < report.issues.length; index++)
    if (stableStringCompare(report.issues[index - 1]!, report.issues[index]!) >= 0)
      throw new Error('R13 runtime capability: issues 排序/唯一性漂移')
  const enemyUses = report.uses.filter(
    (use) => use.domain === 'skill-effect' && use.context === 'skill-enemy-battle',
  )
  const enemyUseKeys = new Set(enemyUses.map((use) => `${use.path}\0${use.kind}`))
  const expectedEnemyUseKeys = new Set<string>()
  const enemyCastPaths = new Set<string>()
  for (const [index, cast] of report.enemyCasts.entries()) {
    if (enemyCastPaths.has(cast.path))
      throw new Error(`R13 runtime capability: duplicate enemy cast ${cast.path}`)
    enemyCastPaths.add(cast.path)
    if (index > 0 && stableStringCompare(report.enemyCasts[index - 1]!.path, cast.path) >= 0)
      throw new Error('R13 runtime capability: enemy casts 排序漂移')
    if (!cast.skillFound && cast.effectKinds.length)
      throw new Error(`R13 runtime capability: missing skill 带 effects ${cast.path}`)
    if (!cast.skillFound && !issueSet.has(`enemy-cast-missing-skill:${cast.skillId}:${cast.path}`))
      throw new Error(`R13 runtime capability: missing skill 缺 issue ${cast.path}`)
    cast.effectKinds.forEach((kind, effectIndex) => {
      const path = `${cast.path}/effects/${effectIndex}:${kind}`
      expectedEnemyUseKeys.add(`${path}\0${kind}`)
    })
  }
  if (
    stableJsonSha256([...enemyUseKeys].sort(stableStringCompare)) !==
    stableJsonSha256([...expectedEnemyUseKeys].sort(stableStringCompare))
  )
    throw new Error('R13 runtime capability: enemy casts/effect uses 漂移')
  const enemySkillIds = new Set(report.enemyCasts.map((cast) => cast.skillId))
  const expectedSummary = {
    commandKinds: expectedMatrix.commandKinds.length,
    commandContexts: R13_COMMAND_CONTEXTS.length,
    commandCells: expectedMatrix.commandCells.length,
    skillKinds: expectedMatrix.skillKinds.length,
    skillContexts: R13_SKILL_CONTEXTS.length,
    skillCells: expectedMatrix.skillCells.length,
    uses: report.uses.length,
    refusedUses: report.uses.filter((use) => use.status === 'refused').length,
    openDebts: expectedDebts.reduce((total, debt) => total + debt.sites.length, 0),
    enemyCastRules: report.enemyCasts.length,
    enemyDistinctSkillIds: enemySkillIds.size,
    enemyEffectUses: report.enemyCasts.reduce((total, cast) => total + cast.effectKinds.length, 0),
  }
  if (stableJsonSha256(report.summary) !== stableJsonSha256(expectedSummary))
    throw new Error('R13 runtime capability: summary 漂移')
  const { digest, ...withoutDigest } = report
  if (stableJsonSha256(withoutDigest) !== digest)
    throw new Error('R13 runtime capability: digest 漂移')
  const rebuilt = auditR13RuntimeCapabilitiesWithOptions(snapshot, options)
  if (stableJsonSha256(rebuilt) !== stableJsonSha256(report))
    throw new Error('R13 runtime capability: snapshot-backed rebuild 漂移')
  if (report.issues.length)
    throw new Error(`R13 runtime capability audit failed:\n${report.issues.join('\n')}`)
}

export function assertR13RuntimeCapabilityAudit(
  report: R13RuntimeCapabilityAuditV2,
  snapshot: MigrationSnapshot,
): void {
  assertR13RuntimeCapabilityAuditWithOptions(report, snapshot)
}

export function assertHistoricalR13ConfirmRuntimeCapabilityAudit(
  report: R13RuntimeCapabilityAuditV2,
  snapshot: MigrationSnapshot,
): void {
  assertR13RuntimeCapabilityAuditWithOptions(
    report,
    snapshot,
    R13_RUNTIME_CAPABILITY_HISTORICAL_CONFIRM_OPTIONS,
  )
}

export function assertR13NoRuntimeCapabilityDebt(
  report: R13RuntimeCapabilityAuditV2,
  snapshot: MigrationSnapshot,
): void {
  assertR13RuntimeCapabilityAudit(report, snapshot)
  const sites = report.debts.reduce((total, debt) => total + debt.sites.length, 0)
  if (sites !== 0) throw new Error(`R13-Z runtime capability: 仍有 ${sites} 个 open debt`)
}
