import {
  type AiAction,
  AUTHOR_COMMAND_V5_KINDS,
  type AuthorCommandV5,
  type BattleChoreographyAction,
  checkSharedScriptLibraryV5,
  type EnemyDef,
  type EnemyHookCommand,
  type EnemyHookTransition,
  type EnemyOnDefeatedCommandV10,
  type ItemDataV5,
  SCENE_ENTRY_PREPARE_SAFETY,
  type SceneDefV5,
  type ScriptFlowV5,
  type SharedScriptLibraryV5,
  type SkillData,
  type SkillEffect,
  upgradeEmbeddedBattleChoreographyV9ToV10,
  validateEnemies,
  validateItemsV5,
  validateScenesV5,
  validateSkills,
} from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_RUNTIME_CAPABILITY_V3_METHOD = 'n3-p7-r13-runtime-capability-v3' as const

export type R13RuntimeCapabilityV3Status = 'executed' | 'refused'
export type R13RuntimeCapabilityV3Domain =
  | 'world-command'
  | 'battle-action'
  | 'enemy-hook-command'
  | 'enemy-hook-transition'
  | 'enemy-ai-action'
  | 'enemy-on-defeated'
  | 'skill-effect'

export interface R13RuntimeCapabilityV3Cell {
  domain: R13RuntimeCapabilityV3Domain
  context: string
  kind: string
  status: R13RuntimeCapabilityV3Status
  evidenceId: string
  constraint?: string
}

export interface R13RuntimeCapabilityV3Use extends R13RuntimeCapabilityV3Cell {
  path: string
}

export interface R13RuntimeEnemySkillReferenceV3 {
  path: string
  context: 'enemy-rule-act' | 'enemy-rule-turn-start' | 'enemy-fallback' | 'enemy-hook'
  skillId: string
  status: R13RuntimeCapabilityV3Status
  skillFound: boolean
  effectKinds: SkillEffect['kind'][]
}

export interface R13RuntimeCapabilityAuditV3 {
  kind: 'r13-runtime-capability-audit'
  version: 3
  methodVersion: typeof R13_RUNTIME_CAPABILITY_V3_METHOD
  generator: {
    corpusDigest: string
  }
  matrix: {
    domains: {
      domain: R13RuntimeCapabilityV3Domain
      contexts: string[]
      kinds: string[]
    }[]
    cells: R13RuntimeCapabilityV3Cell[]
  }
  uses: R13RuntimeCapabilityV3Use[]
  enemySkillReferences: R13RuntimeEnemySkillReferenceV3[]
  issues: string[]
  inventory: {
    scenes: number
    items: number
    enemies: number
    skills: number
    hookFlows: number
    hookStates: number
    choreographyEntries: number
    onDefeatedOwners: number
  }
  summary: {
    domains: number
    cells: number
    uses: number
    refusedUses: number
    openIssues: number
    enemySkillReferences: number
    enemyDistinctSkillIds: number
    enemyEffectUses: number
  }
  digest: string
}

interface RuntimeCorpusV3 {
  scenes: SceneDefV5[]
  items: ItemDataV5[]
  sharedScripts: SharedScriptLibraryV5
  enemies: EnemyDef[]
  skills: SkillData[]
}

const WORLD_CONTEXTS = [
  'scene-entry-prepare',
  'world-interactive',
  'world-auto',
  'item-private-world',
] as const
const BATTLE_ACTION_CONTEXTS = ['battle-choreography', 'enemy-hook-action'] as const
const ENEMY_AI_CONTEXTS = [
  'enemy-rule-act',
  'enemy-rule-turn-start',
  'enemy-fallback',
  'enemy-hook-effect',
] as const
const SKILL_CONTEXTS = ['skill-outdoor', 'skill-player-battle', 'skill-enemy-battle'] as const

const BATTLE_ACTION_EVIDENCE = {
  applyActorGrowth: 'reforge:battle-session:apply-fixed-actor-growth',
  dialog: 'reforge:battle-session:dialog',
  endBattle: 'reforge:battle-session:terminal-request',
  fleeBattle: 'reforge:battle-session:terminal-request',
  increaseHpMp: 'reforge:battle-session:increase-hp-mp',
  playActorCastEffect: 'reforge:battle-session:actor-cast-effect',
  playMusic: 'reforge:battle-session:music',
  playSound: 'reforge:battle-session:sfx',
  revivePartyAll: 'reforge:battle-session:revive-party',
  stopMusic: 'reforge:battle-session:music',
  wait: 'reforge:battle-session:gameplay-clock-wait',
} as const satisfies Record<BattleChoreographyAction['kind'], string>

const ENEMY_HOOK_COMMAND_EVIDENCE = {
  ...BATTLE_ACTION_EVIDENCE,
  effect: 'reforge:enemy-hook-runtime:apply-enemy-effect',
  setFallback: 'reforge:enemy-hook-runtime:set-instance-fallback',
} as const satisfies Record<EnemyHookCommand['kind'], string>

const ENEMY_HOOK_TRANSITION_EVIDENCE = {
  advance: 'reforge:enemy-hook-runtime:resolve-transition',
  branch: 'reforge:enemy-hook-runtime:resolve-transition',
  commandOutcome: 'reforge:enemy-hook-runtime:resolve-transition',
  continue: 'reforge:enemy-hook-runtime:resolve-transition',
  random: 'reforge:enemy-hook-runtime:resolve-transition',
  restart: 'reforge:enemy-hook-runtime:resolve-transition',
  stay: 'reforge:enemy-hook-runtime:resolve-transition',
} as const satisfies Record<EnemyHookTransition['kind'], string>

const ENEMY_AI_ACTION_EVIDENCE = {
  attack: 'reforge:battle-core:resolve-enemy-ai-action',
  cast: 'reforge:battle-core:resolve-enemy-ai-action',
  divide: 'reforge:battle-core:resolve-enemy-ai-action',
  flee: 'reforge:battle-core:resolve-enemy-ai-action',
  pass: 'reforge:battle-core:resolve-enemy-ai-action',
  summon: 'reforge:battle-core:resolve-enemy-ai-action',
  transform: 'reforge:battle-core:resolve-enemy-ai-action',
} as const satisfies Record<AiAction['kind'], string>

const ENEMY_ON_DEFEATED_EVIDENCE = {
  addVar: 'reforge:canonical-v5-on-defeated-runner',
  branch: 'reforge:canonical-v5-on-defeated-runner',
  clearDialog: 'reforge:canonical-v5-on-defeated-runner',
  dialog: 'reforge:canonical-v5-on-defeated-runner',
  giveItem: 'reforge:canonical-v5-on-defeated-runner',
  giveMoney: 'reforge:canonical-v5-on-defeated-runner',
  loseItem: 'reforge:canonical-v5-on-defeated-runner',
  playMusic: 'reforge:canonical-v5-on-defeated-runner',
  playSound: 'reforge:canonical-v5-on-defeated-runner',
  setFlag: 'reforge:canonical-v5-on-defeated-runner',
  setVar: 'reforge:canonical-v5-on-defeated-runner',
  stopMusic: 'reforge:canonical-v5-on-defeated-runner',
  stopScript: 'reforge:canonical-v5-on-defeated-runner',
  wait: 'reforge:canonical-v5-on-defeated-runner',
} as const satisfies Record<EnemyOnDefeatedCommandV10['kind'], string>

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
  steal: true,
  summon: true,
  trance: true,
} as const satisfies Record<SkillEffect['kind'], true>

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

function value(snapshot: MigrationSnapshot, path: string): unknown {
  const found = snapshot.files.get(path)
  if (found === undefined) throw new Error(`R13 runtime capability v3: 缺 ${path}`)
  return found
}

function runtimeCorpus(snapshot: MigrationSnapshot): RuntimeCorpusV3 {
  const sceneIds = value(snapshot, 'content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string' || id.length === 0))
    throw new Error('R13 runtime capability v3: scenes/index.json 无效')
  const scenes = validateScenesV5(
    upgradeEmbeddedBattleChoreographyV9ToV10(
      sceneIds.map((id) => value(snapshot, `content/scenes/${String(id)}.json`)),
      'scenes',
    ),
  )
  const sharedScriptsValue = upgradeEmbeddedBattleChoreographyV9ToV10(
    value(snapshot, 'content/shared-scripts.json'),
    'shared-scripts',
  )
  checkSharedScriptLibraryV5(sharedScriptsValue)
  return {
    scenes,
    items: validateItemsV5(
      upgradeEmbeddedBattleChoreographyV9ToV10(value(snapshot, 'content/items.json'), 'items'),
    ),
    sharedScripts: sharedScriptsValue,
    enemies: validateEnemies(value(snapshot, 'content/enemies.json')),
    skills: validateSkills(value(snapshot, 'content/skills.json')).skills,
  }
}

function worldCell(kind: string, context: string): R13RuntimeCapabilityV3Cell {
  if (context === 'scene-entry-prepare') {
    const v5Safe =
      kind === 'selectEntityBehavior' ||
      kind === 'selectEntityPage' ||
      kind === 'setEntityTriggerActivation' ||
      kind === 'selectSceneHooks'
    const legacySafe =
      SCENE_ENTRY_PREPARE_SAFETY[kind as keyof typeof SCENE_ENTRY_PREPARE_SAFETY] === 'safe'
    return {
      domain: 'world-command',
      context,
      kind,
      status:
        (v5Safe || legacySafe) && kind !== 'endBattle' && kind !== 'fleeBattle'
          ? 'executed'
          : 'refused',
      evidenceId: 'content:scene-entry-prepare-safety',
    }
  }
  const refused =
    context === 'world-auto'
      ? AUTO_REFUSED.has(kind)
      : context === 'item-private-world'
        ? ITEM_REFUSED.has(kind)
        : WORLD_REFUSED.has(kind)
  return {
    domain: 'world-command',
    context,
    kind,
    status: refused ? 'refused' : 'executed',
    evidenceId: refused
      ? context === 'world-auto'
        ? 'reforge:v5-auto-host-refusal'
        : context === 'item-private-world'
          ? 'reforge:v5-item-private-self-policy'
          : 'reforge:v5-world-command-host-refusal'
      : kind === 'confirm'
        ? 'reforge:v5-script-confirm-modal'
        : 'reforge:v5-world-command-host',
    ...(context === 'item-private-world' && kind === 'vanishEntity'
      ? { constraint: 'explicit target required' }
      : {}),
  }
}

function skillCell(kind: SkillEffect['kind'], context: string): R13RuntimeCapabilityV3Cell {
  const executed =
    context === 'skill-player-battle' ||
    (context === 'skill-outdoor' && OUTDOOR_SKILL_EFFECTS.has(kind)) ||
    (context === 'skill-enemy-battle' && ENEMY_SKILL_EFFECTS.has(kind))
  return {
    domain: 'skill-effect',
    context,
    kind,
    status: executed ? 'executed' : 'refused',
    evidenceId:
      context === 'skill-outdoor'
        ? 'reforge:outdoor-skill-effects'
        : context === 'skill-enemy-battle'
          ? 'reforge:enemy-battle-skill-effects'
          : 'reforge:player-battle-skill-effects',
  }
}

function aiActionCell(kind: AiAction['kind'], context: string): R13RuntimeCapabilityV3Cell {
  const status =
    context === 'enemy-rule-turn-start' ||
    (context === 'enemy-fallback' && kind !== 'cast' && kind !== 'pass') ||
    (context === 'enemy-hook-effect' &&
      kind !== 'summon' &&
      kind !== 'transform' &&
      kind !== 'divide')
      ? 'refused'
      : 'executed'
  return {
    domain: 'enemy-ai-action',
    context,
    kind,
    status,
    evidenceId:
      context === 'enemy-rule-turn-start'
        ? 'reforge:battle-core:decide-by-rules-act-only'
        : context === 'enemy-fallback'
          ? 'reforge:battle-core:instance-fallback'
          : context === 'enemy-hook-effect'
            ? 'reforge:enemy-hook-runtime:apply-enemy-effect'
            : ENEMY_AI_ACTION_EVIDENCE[kind],
  }
}

export function buildR13RuntimeCapabilityMatrixV3(): R13RuntimeCapabilityAuditV3['matrix'] {
  const worldKinds = Object.entries(AUTHOR_COMMAND_V5_KINDS)
    .filter(([, enabled]) => enabled)
    .map(([kind]) => kind)
    .sort(stableStringCompare)
  const battleKinds = Object.keys(BATTLE_ACTION_EVIDENCE).sort(stableStringCompare)
  const hookCommandKinds = Object.keys(ENEMY_HOOK_COMMAND_EVIDENCE).sort(stableStringCompare)
  const transitionKinds = Object.keys(ENEMY_HOOK_TRANSITION_EVIDENCE).sort(stableStringCompare)
  const aiKinds = Object.keys(ENEMY_AI_ACTION_EVIDENCE).sort(stableStringCompare)
  const defeatedKinds = Object.keys(ENEMY_ON_DEFEATED_EVIDENCE).sort(stableStringCompare)
  const skillKinds = Object.keys(SKILL_EFFECT_KIND_TABLE).sort(stableStringCompare)
  const domains: R13RuntimeCapabilityAuditV3['matrix']['domains'] = [
    { domain: 'world-command', contexts: [...WORLD_CONTEXTS], kinds: worldKinds },
    {
      domain: 'battle-action',
      contexts: [...BATTLE_ACTION_CONTEXTS],
      kinds: battleKinds,
    },
    { domain: 'enemy-hook-command', contexts: ['enemy-hook'], kinds: hookCommandKinds },
    {
      domain: 'enemy-hook-transition',
      contexts: ['enemy-hook'],
      kinds: transitionKinds,
    },
    { domain: 'enemy-ai-action', contexts: [...ENEMY_AI_CONTEXTS], kinds: aiKinds },
    {
      domain: 'enemy-on-defeated',
      contexts: ['enemy-on-defeated'],
      kinds: defeatedKinds,
    },
    { domain: 'skill-effect', contexts: [...SKILL_CONTEXTS], kinds: skillKinds },
  ]
  const cells = domains.flatMap((domain) =>
    domain.contexts.flatMap((context) =>
      domain.kinds.map((kind): R13RuntimeCapabilityV3Cell => {
        if (domain.domain === 'world-command') return worldCell(kind, context)
        if (domain.domain === 'skill-effect') return skillCell(kind as SkillEffect['kind'], context)
        if (domain.domain === 'enemy-ai-action')
          return aiActionCell(kind as AiAction['kind'], context)
        if (domain.domain === 'battle-action')
          return {
            domain: domain.domain,
            context,
            kind,
            status: 'executed',
            evidenceId: BATTLE_ACTION_EVIDENCE[kind as BattleChoreographyAction['kind']],
          }
        if (domain.domain === 'enemy-hook-command')
          return {
            domain: domain.domain,
            context,
            kind,
            status: 'executed',
            evidenceId: ENEMY_HOOK_COMMAND_EVIDENCE[kind as EnemyHookCommand['kind']],
          }
        if (domain.domain === 'enemy-hook-transition')
          return {
            domain: domain.domain,
            context,
            kind,
            status: 'executed',
            evidenceId: ENEMY_HOOK_TRANSITION_EVIDENCE[kind as EnemyHookTransition['kind']],
          }
        return {
          domain: domain.domain,
          context,
          kind,
          status: 'executed',
          evidenceId: ENEMY_ON_DEFEATED_EVIDENCE[kind as EnemyOnDefeatedCommandV10['kind']],
        }
      }),
    ),
  )
  return { domains, cells }
}

function capabilityKey(domain: string, context: string, kind: string): string {
  return `${domain}\0${context}\0${kind}`
}

function inventoryOf(corpus: RuntimeCorpusV3): R13RuntimeCapabilityAuditV3['inventory'] {
  let hookFlows = 0
  let hookStates = 0
  let choreographyEntries = 0
  let onDefeatedOwners = 0
  for (const enemy of corpus.enemies) {
    for (const flow of Object.values(enemy.ai.hooks ?? {})) {
      if (!flow) continue
      hookFlows += 1
      hookStates += Object.keys(flow.states).length
    }
    choreographyEntries += enemy.choreography?.length ?? 0
    if (enemy.onDefeated) onDefeatedOwners += 1
  }
  return {
    scenes: corpus.scenes.length,
    items: corpus.items.length,
    enemies: corpus.enemies.length,
    skills: corpus.skills.length,
    hookFlows,
    hookStates,
    choreographyEntries,
    onDefeatedOwners,
  }
}

export function auditR13RuntimeCapabilitiesV3(
  snapshot: MigrationSnapshot,
): R13RuntimeCapabilityAuditV3 {
  const corpus = runtimeCorpus(snapshot)
  const matrix = buildR13RuntimeCapabilityMatrixV3()
  const cells = new Map(
    matrix.cells.map((cell) => [capabilityKey(cell.domain, cell.context, cell.kind), cell]),
  )
  const uses: R13RuntimeCapabilityV3Use[] = []
  const enemySkillReferences: R13RuntimeEnemySkillReferenceV3[] = []
  const issues: string[] = []
  const skillsById = new Map<string, SkillData>()
  for (const skill of corpus.skills) {
    if (skillsById.has(skill.id)) issues.push(`duplicate-skill-id:${skill.id}`)
    skillsById.set(skill.id, skill)
  }

  const noteUse = (
    domain: R13RuntimeCapabilityV3Domain,
    context: string,
    kind: string,
    path: string,
  ): R13RuntimeCapabilityV3Cell | undefined => {
    const cell = cells.get(capabilityKey(domain, context, kind))
    if (!cell) {
      issues.push(`missing-cell:${domain}:${context}:${kind}:${path}`)
      return undefined
    }
    uses.push({ ...cell, path })
    if (cell.status === 'refused') issues.push(`refused-use:${domain}:${context}:${kind}:${path}`)
    return cell
  }

  const noteSkillEffect = (effect: SkillEffect, context: string, path: string): void => {
    noteUse('skill-effect', context, effect.kind, path)
  }

  const noteEnemyCast = (
    path: string,
    context: R13RuntimeEnemySkillReferenceV3['context'],
    skillId: string,
    status: R13RuntimeCapabilityV3Status,
  ): void => {
    const skill = skillsById.get(skillId)
    enemySkillReferences.push({
      path,
      context,
      skillId,
      status,
      skillFound: skill !== undefined,
      effectKinds: skill?.effects.map((effect) => effect.kind) ?? [],
    })
    if (!skill) {
      issues.push(`enemy-cast-missing-skill:${skillId}:${path}`)
      return
    }
    if (status === 'executed')
      for (const [index, effect] of skill.effects.entries())
        noteSkillEffect(effect, 'skill-enemy-battle', `${path}/effects/${index}:${effect.kind}`)
  }

  const activeShared = new Set<string>()
  const completedShared = new Set<string>()
  const visitShared = (
    scriptId: string,
    context: (typeof WORLD_CONTEXTS)[number],
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
    const key = `${scriptId}\0${context}\0${hasSelf ? 'self' : 'no-self'}`
    if (activeShared.has(key) || completedShared.has(key)) return
    activeShared.add(key)
    visitAuthorCommands(script.body, context, `${path}/shared(${scriptId})`, hasSelf)
    activeShared.delete(key)
    completedShared.add(key)
  }

  const visitBattleActions = (
    actions: readonly BattleChoreographyAction[],
    context: (typeof BATTLE_ACTION_CONTEXTS)[number],
    path: string,
  ): void => {
    actions.forEach((action, index) => {
      noteUse('battle-action', context, action.kind, `${path}/${index}:${action.kind}`)
    })
  }

  const visitAuthorCommands = (
    commands: readonly AuthorCommandV5[],
    context: (typeof WORLD_CONTEXTS)[number],
    path: string,
    hasSelf: boolean,
  ): void => {
    commands.forEach((command, index) => {
      const commandPath = `${path}/${index}:${command.kind}`
      const cell = noteUse('world-command', context, command.kind, commandPath)
      if (
        cell?.status === 'executed' &&
        !hasSelf &&
        (command.kind === 'chasePlayer' ||
          (command.kind === 'vanishEntity' && command.target === undefined))
      )
        issues.push(`command-needs-self:${context}:${command.kind}:${commandPath}`)
      if (command.kind === 'callScript') {
        visitShared(command.script, context, commandPath, hasSelf, command.self !== undefined)
        return
      }
      if (command.kind === 'branch') {
        visitAuthorCommands(command.then, context, `${commandPath}/then`, hasSelf)
        if (command.else) visitAuthorCommands(command.else, context, `${commandPath}/else`, hasSelf)
        return
      }
      if (command.kind === 'loop') {
        visitAuthorCommands(command.body, context, `${commandPath}/body`, hasSelf)
        return
      }
      if (command.kind === 'confirm') {
        visitAuthorCommands(command.onNo, context, `${commandPath}/onNo`, hasSelf)
        return
      }
      if (command.kind === 'teleportOut' && command.onFail)
        visitAuthorCommands(command.onFail, context, `${commandPath}/onFail`, hasSelf)
      if (command.kind === 'startBattle') {
        if (command.onLose)
          visitAuthorCommands(command.onLose, context, `${commandPath}/onLose`, hasSelf)
        if (command.onFlee)
          visitAuthorCommands(command.onFlee, context, `${commandPath}/onFlee`, hasSelf)
        command.choreography?.forEach((entry, choreographyIndex) => {
          visitBattleActions(
            entry.body,
            'battle-choreography',
            `${commandPath}/choreography/${choreographyIndex}`,
          )
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
        visitAuthorCommands(
          node.entry.prepare,
          'scene-entry-prepare',
          `${path}/${node.id}/prepare`,
          hasSelf,
        )
      visitAuthorCommands(node.body, context, `${path}/${node.id}/body`, hasSelf)
    }
  }

  const visitHookTransition = (transition: EnemyHookTransition, path: string): void => {
    noteUse('enemy-hook-transition', 'enemy-hook', transition.kind, path)
    if (transition.kind === 'branch' || transition.kind === 'commandOutcome') {
      visitHookTransition(transition.then, `${path}/then:${transition.then.kind}`)
      visitHookTransition(transition.else, `${path}/else:${transition.else.kind}`)
      return
    }
    if (transition.kind === 'random')
      transition.choices.forEach((choice, index) => {
        visitHookTransition(choice.then, `${path}/choices/${index}:${choice.then.kind}`)
      })
  }

  const visitOnDefeated = (commands: readonly EnemyOnDefeatedCommandV10[], path: string): void => {
    commands.forEach((command, index) => {
      const commandPath = `${path}/${index}:${command.kind}`
      noteUse('enemy-on-defeated', 'enemy-on-defeated', command.kind, commandPath)
      if (command.kind === 'branch') {
        visitOnDefeated(command.then, `${commandPath}/then`)
        if (command.else) visitOnDefeated(command.else, `${commandPath}/else`)
      }
    })
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
        visitAuthorCommands(
          entity.hostile.onLose,
          'world-interactive',
          `scene(${scene.id})/entity(${entity.id})/hostile/onLose`,
          true,
        )
  }

  for (const item of corpus.items)
    item.use?.effects.forEach((effect, index) => {
      const path = `item(${item.id})/use/${index}:${effect.kind}`
      if (effect.kind === 'itemPrivateScript')
        visitAuthorCommands(effect.script.body, 'item-private-world', path, false)
      else if (effect.kind === 'runScript')
        visitShared(effect.script, 'item-private-world', path, false)
    })

  for (const skill of corpus.skills)
    for (const [index, effect] of skill.effects.entries()) {
      noteSkillEffect(
        effect,
        'skill-player-battle',
        `skill(${skill.id})/player/effects/${index}:${effect.kind}`,
      )
      if (skill.usableOutsideBattle)
        noteSkillEffect(
          effect,
          'skill-outdoor',
          `skill(${skill.id})/outdoor/effects/${index}:${effect.kind}`,
        )
    }

  for (const enemy of corpus.enemies) {
    enemy.choreography?.forEach((entry, index) => {
      visitBattleActions(
        entry.body,
        'battle-choreography',
        `enemy(${enemy.id})/choreography/${index}`,
      )
    })
    if (enemy.onDefeated) visitOnDefeated(enemy.onDefeated, `enemy(${enemy.id})/onDefeated`)
    for (const [ruleIndex, rule] of (enemy.ai.rules ?? []).entries()) {
      const context = rule.at === 'act' ? 'enemy-rule-act' : 'enemy-rule-turn-start'
      const path = `enemy(${enemy.id})/ai/rules/${ruleIndex}:${rule.do.kind}`
      const cell = noteUse('enemy-ai-action', context, rule.do.kind, path)
      if (rule.do.kind === 'cast')
        noteEnemyCast(path, context, rule.do.skillId, cell?.status ?? 'refused')
    }
    if (enemy.ai.fallback) {
      const action = enemy.ai.fallback.action
      const path = `enemy(${enemy.id})/ai/fallback:${action.kind}`
      const cell = noteUse('enemy-ai-action', 'enemy-fallback', action.kind, path)
      if (action.kind === 'cast')
        noteEnemyCast(path, 'enemy-fallback', action.skillId, cell?.status ?? 'refused')
    }
    for (const [channel, flow] of Object.entries(enemy.ai.hooks ?? {})) {
      if (!flow) continue
      for (const [stateId, state] of Object.entries(flow.states)) {
        const statePath = `enemy(${enemy.id})/ai/hooks/${channel}/states/${stateId}`
        state.body.forEach((command, index) => {
          const commandPath = `${statePath}/body/${index}:${command.kind}`
          noteUse('enemy-hook-command', 'enemy-hook', command.kind, commandPath)
          if (command.kind === 'setFallback') {
            const action = command.fallback?.action
            if (action) {
              const actionCell = noteUse(
                'enemy-ai-action',
                'enemy-fallback',
                action.kind,
                `${commandPath}/fallback:${action.kind}`,
              )
              if (action.kind === 'cast')
                noteEnemyCast(
                  `${commandPath}/fallback:${action.kind}`,
                  'enemy-hook',
                  action.skillId,
                  actionCell?.status ?? 'refused',
                )
            }
          } else if (command.kind === 'effect') {
            noteUse(
              'enemy-ai-action',
              'enemy-hook-effect',
              command.effect.kind,
              `${commandPath}/effect:${command.effect.kind}`,
            )
          } else {
            noteUse('battle-action', 'enemy-hook-action', command.kind, commandPath)
          }
        })
        visitHookTransition(state.next, `${statePath}/next:${state.next.kind}`)
      }
    }
  }

  uses.sort(
    (left, right) =>
      stableStringCompare(left.domain, right.domain) ||
      stableStringCompare(left.context, right.context) ||
      stableStringCompare(left.path, right.path) ||
      stableStringCompare(left.kind, right.kind),
  )
  enemySkillReferences.sort((left, right) => stableStringCompare(left.path, right.path))
  const uniqueIssues = [...new Set(issues)].sort(stableStringCompare)
  const inventory = inventoryOf(corpus)
  const withoutDigest = {
    kind: 'r13-runtime-capability-audit' as const,
    version: 3 as const,
    methodVersion: R13_RUNTIME_CAPABILITY_V3_METHOD,
    generator: { corpusDigest: stableJsonSha256(corpus) },
    matrix,
    uses,
    enemySkillReferences,
    issues: uniqueIssues,
    inventory,
    summary: {
      domains: matrix.domains.length,
      cells: matrix.cells.length,
      uses: uses.length,
      refusedUses: uses.filter((use) => use.status === 'refused').length,
      openIssues: uniqueIssues.length,
      enemySkillReferences: enemySkillReferences.length,
      enemyDistinctSkillIds: new Set(enemySkillReferences.map((reference) => reference.skillId))
        .size,
      enemyEffectUses: enemySkillReferences
        .filter((reference) => reference.status === 'executed')
        .reduce((total, reference) => total + reference.effectKinds.length, 0),
    },
  }
  return { ...withoutDigest, digest: stableJsonSha256(withoutDigest) }
}

export function assertR13RuntimeCapabilityAuditReportV3(report: R13RuntimeCapabilityAuditV3): void {
  if (
    report.kind !== 'r13-runtime-capability-audit' ||
    report.version !== 3 ||
    report.methodVersion !== R13_RUNTIME_CAPABILITY_V3_METHOD
  )
    throw new Error('R13 runtime capability v3: header 漂移')
  if (!/^[0-9a-f]{64}$/.test(report.generator.corpusDigest))
    throw new Error('R13 runtime capability v3: corpus digest 非 sha256')
  const expectedMatrix = buildR13RuntimeCapabilityMatrixV3()
  if (stableJsonSha256(report.matrix) !== stableJsonSha256(expectedMatrix))
    throw new Error('R13 runtime capability v3: matrix 漂移')
  const cells = new Map(
    expectedMatrix.cells.map((cell) => [capabilityKey(cell.domain, cell.context, cell.kind), cell]),
  )
  const useKeys = new Set<string>()
  for (const [index, use] of report.uses.entries()) {
    const key = `${use.domain}\0${use.context}\0${use.path}\0${use.kind}`
    if (useKeys.has(key)) throw new Error(`R13 runtime capability v3: duplicate use ${key}`)
    useKeys.add(key)
    if (index > 0) {
      const previous = report.uses[index - 1]!
      const order =
        stableStringCompare(previous.domain, use.domain) ||
        stableStringCompare(previous.context, use.context) ||
        stableStringCompare(previous.path, use.path) ||
        stableStringCompare(previous.kind, use.kind)
      if (order >= 0) throw new Error('R13 runtime capability v3: uses 排序漂移')
    }
    const cell = cells.get(capabilityKey(use.domain, use.context, use.kind))
    if (
      !cell ||
      cell.status !== use.status ||
      cell.evidenceId !== use.evidenceId ||
      cell.constraint !== use.constraint
    )
      throw new Error(
        `R13 runtime capability v3: use/cell 漂移 ${use.domain}:${use.context}:${use.kind}:${use.path}`,
      )
  }
  for (let index = 1; index < report.enemySkillReferences.length; index++)
    if (
      stableStringCompare(
        report.enemySkillReferences[index - 1]!.path,
        report.enemySkillReferences[index]!.path,
      ) >= 0
    )
      throw new Error('R13 runtime capability v3: enemy skill references 排序漂移')
  const issueSet = new Set(report.issues)
  if (issueSet.size !== report.issues.length)
    throw new Error('R13 runtime capability v3: issues 不唯一')
  for (let index = 1; index < report.issues.length; index++)
    if (stableStringCompare(report.issues[index - 1]!, report.issues[index]!) >= 0)
      throw new Error('R13 runtime capability v3: issues 排序漂移')
  for (const use of report.uses)
    if (
      use.status === 'refused' &&
      !issueSet.has(`refused-use:${use.domain}:${use.context}:${use.kind}:${use.path}`)
    )
      throw new Error(
        `R13 runtime capability v3: refused use 缺 issue ${use.domain}:${use.context}:${use.kind}:${use.path}`,
      )
  const expectedSummary: R13RuntimeCapabilityAuditV3['summary'] = {
    domains: expectedMatrix.domains.length,
    cells: expectedMatrix.cells.length,
    uses: report.uses.length,
    refusedUses: report.uses.filter((use) => use.status === 'refused').length,
    openIssues: report.issues.length,
    enemySkillReferences: report.enemySkillReferences.length,
    enemyDistinctSkillIds: new Set(
      report.enemySkillReferences.map((reference) => reference.skillId),
    ).size,
    enemyEffectUses: report.enemySkillReferences
      .filter((reference) => reference.status === 'executed')
      .reduce((total, reference) => total + reference.effectKinds.length, 0),
  }
  if (stableJsonSha256(report.summary) !== stableJsonSha256(expectedSummary))
    throw new Error('R13 runtime capability v3: summary 漂移')
  const { digest, ...withoutDigest } = report
  if (stableJsonSha256(withoutDigest) !== digest)
    throw new Error('R13 runtime capability v3: digest 漂移')
  if (report.issues.length)
    throw new Error(`R13 runtime capability v3 audit failed:\n${report.issues.join('\n')}`)
}

/**
 * 仅用于“刚由同一 snapshot 构建”的本地报告：builder 已读取 snapshot 一次，这里校验报告
 * 自洽、矩阵与零 issue，不再立刻重复构建 62k+ use。外部传入或可跨调用缓存的报告仍必须走
 * assertR13RuntimeCapabilityAuditV3 的 snapshot-backed rebuild。
 */
export function buildAndAssertR13RuntimeCapabilityAuditV3(
  snapshot: MigrationSnapshot,
): R13RuntimeCapabilityAuditV3 {
  const report = auditR13RuntimeCapabilitiesV3(snapshot)
  assertR13RuntimeCapabilityAuditReportV3(report)
  return report
}

export function assertR13RuntimeCapabilityAuditV3(
  report: R13RuntimeCapabilityAuditV3,
  snapshot: MigrationSnapshot,
): void {
  assertR13RuntimeCapabilityAuditReportV3(report)
  const rebuilt = auditR13RuntimeCapabilitiesV3(snapshot)
  if (stableJsonSha256(rebuilt) !== stableJsonSha256(report))
    throw new Error('R13 runtime capability v3: snapshot-backed rebuild 漂移')
}
