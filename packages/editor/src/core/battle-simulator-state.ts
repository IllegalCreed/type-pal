import {
  type BattleTrialConfig,
  type BattleTrialIssue,
  collectBattleTrialIssues,
  type TrialCatalog,
  type TrialMember,
} from '@type-pal/reforge'
import type { SimulatorDirectory } from './battle-simulator-commands.js'
import {
  type BattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
  type TrialPlan,
} from './battle-simulator-library.js'
import type { EditorState } from './edit-session.js'

export interface BattleSimulatorDraft {
  label: string
  plan: TrialPlan
  changed: boolean
  subject?: BattleTrialSubject
}
export type BattleTrialSubject = { kind: 'skill' | 'enemy-team' | 'enemy'; id: string }
export function emptyTrialMember(actorId: string): TrialMember {
  return {
    actorId,
    stats: {},
    equipment: {},
    skills: { kind: 'inherit' },
    hp: { kind: 'full' },
    mp: { kind: 'full' },
  }
}
export function emptyTrialPlan(state: EditorState): TrialPlan {
  return {
    party: { kind: 'inline', config: { members: [] } },
    enemies: { kind: 'inline', config: { kind: 'slots', slots: [null, null, null, null, null] } },
    bag: { kind: 'inline', config: { items: [] } },
    fieldId: state.battleFields?.[0]?.id ?? 0,
    music: { kind: 'default' },
    money: 0,
    auto: false,
    boss: false,
    overrides: {},
  }
}
export function trialCatalog(state: EditorState): TrialCatalog {
  const byId = <T extends { id: string }>(values: readonly T[]) =>
    Object.fromEntries(values.map((value) => [value.id, value]))
  return {
    actorsById: byId(state.actors),
    skills: byId(state.skills),
    items: byId(state.items),
    enemiesById: byId(state.enemies ?? []),
    enemyTeamsById: byId(state.enemyTeams ?? []),
    battleFields: state.battleFields ?? [],
    assetCatalog: state.assetCatalog,
  }
}
export function resolveTrialDraft(
  library: BattleSimulatorLibrary,
  plan: TrialPlan,
): BattleTrialConfig {
  const id = '__current-trial__'
  return resolveBattleSimulatorPlan(
    { ...library, plans: [{ id, name: '本场', description: '', config: plan }] },
    id,
  )
}
export function applyTrialSubject(
  plan: TrialPlan,
  library: BattleSimulatorLibrary,
  state: EditorState,
  subject: BattleTrialSubject,
  actorId?: string,
): TrialPlan {
  const next = structuredClone(plan)
  if (subject.kind === 'enemy-team') {
    if (!state.enemyTeams?.some((team) => team.id === subject.id))
      throw new Error('当前敌队已不存在')
    next.overrides.enemies = { kind: 'team', teamId: subject.id }
  } else if (subject.kind === 'enemy') {
    if (!state.enemies?.some((enemy) => enemy.id === subject.id))
      throw new Error('当前敌人已不存在')
    next.overrides.enemies = { kind: 'slots', slots: [subject.id, null, null, null, null] }
  } else {
    if (!state.skills.some((skill) => skill.id === subject.id)) throw new Error('当前技能已不存在')
    const party = resolveTrialDraft(library, next).party
    const member = party.members.find((member) => member.actorId === actorId)
    if (!member) throw new Error('请选择本方案中的施放队员')
    const known =
      member.skills.kind === 'replace'
        ? member.skills.ids
        : (state.actors.find((actor) => actor.id === member.actorId)?.battler?.initialMagic ?? [])
    member.skills = { kind: 'replace', ids: [...new Set([...known, subject.id])] }
    next.overrides.party = party
  }
  return next
}
export interface SimulatorRecordIssue extends BattleTrialIssue {
  directory: SimulatorDirectory
  recordId: string
}
export function collectSimulatorLibraryIssues(
  library: BattleSimulatorLibrary,
  state: EditorState,
): SimulatorRecordIssue[] {
  const issues: SimulatorRecordIssue[] = [],
    catalog = trialCatalog(state)
  for (const directory of ['allies', 'enemies', 'bags', 'plans'] as const)
    for (const record of library[directory]) {
      const base = emptyTrialPlan(state)
      if (directory === 'allies')
        base.party = { kind: 'inline', config: (record as (typeof library.allies)[number]).config }
      if (directory === 'enemies')
        base.enemies = {
          kind: 'inline',
          config: (record as (typeof library.enemies)[number]).config,
        }
      if (directory === 'bags')
        base.bag = { kind: 'inline', config: (record as (typeof library.bags)[number]).config }
      try {
        const config = resolveTrialDraft(
          library,
          directory === 'plans' ? (record as (typeof library.plans)[number]).config : base,
        )
        const prefix = directory === 'allies' ? 'party' : directory === 'bags' ? 'bag' : 'enemies'
        for (const issue of collectBattleTrialIssues(config, catalog))
          if (directory === 'plans' || issue.path.startsWith(prefix))
            issues.push({ ...issue, directory, recordId: record.id })
      } catch (error) {
        issues.push({
          directory,
          recordId: record.id,
          path: 'sources',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  return issues
}
