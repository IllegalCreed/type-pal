import {
  type BattleSimulatorLibrary,
  emptyBattleSimulatorLibrary,
  isBattleSimulatorEmpty,
  parseBattleSimulatorLibrary,
  type TrialPreset,
} from './battle-simulator-library.js'
import type { Command, EditorState } from './edit-session.js'

export type SimulatorDirectory = 'allies' | 'enemies' | 'bags' | 'plans'

/** A normal project history command: no private undo stack and no retained UI-owned aliases. */
export class SetBattleSimulatorLibraryCommand implements Command {
  readonly label = '编辑战斗模拟器配置'
  private before?: BattleSimulatorLibrary
  private captured = false
  private readonly next: BattleSimulatorLibrary | undefined

  constructor(value: BattleSimulatorLibrary) {
    const parsed = parseBattleSimulatorLibrary(value)
    this.next = isBattleSimulatorEmpty(parsed) ? undefined : parsed
  }
  apply(state: EditorState): EditorState {
    if (JSON.stringify(state.battleSimulator) === JSON.stringify(this.next)) return state
    if (!this.captured) {
      this.before = structuredClone(state.battleSimulator)
      this.captured = true
    }
    return this.replace(state, this.next)
  }
  invert(state: EditorState): EditorState {
    if (!this.captured) throw new Error('战斗模拟器命令尚未执行')
    return this.replace(state, this.before)
  }
  private replace(state: EditorState, value: BattleSimulatorLibrary | undefined): EditorState {
    const next = { ...state }
    if (value === undefined) delete next.battleSimulator
    else next.battleSimulator = structuredClone(value)
    return next
  }
}

/** Insert or replace by stable ID, retaining directory order when editing an existing row. */
export function putBattleSimulatorRecord(
  library: BattleSimulatorLibrary | undefined,
  directory: SimulatorDirectory,
  record: TrialPreset<unknown>,
): BattleSimulatorLibrary {
  const current = library ?? emptyBattleSimulatorLibrary()
  const rows: unknown[] = [...current[directory]]
  const index = current[directory].findIndex((entry) => entry.id === record.id)
  if (index < 0) rows.push(record)
  else rows[index] = record
  return parseBattleSimulatorLibrary({ ...current, [directory]: rows })
}

export function battleSimulatorDependentPlans(
  library: BattleSimulatorLibrary,
  directory: SimulatorDirectory,
  id: string,
): string[] {
  if (directory === 'plans') return []
  const section = directory === 'allies' ? 'party' : directory === 'bags' ? 'bag' : 'enemies'
  return library.plans
    .filter((plan) => {
      const source = plan.config[section]
      return source.kind === 'preset' && source.presetId === id
    })
    .map((plan) => plan.id)
}
export class BattleSimulatorPresetInUseError extends Error {
  constructor(readonly planIds: string[]) {
    super(`删除预设会使${planIds.length}个试打方案失效，请确认受影响方案`)
    this.name = 'BattleSimulatorPresetInUseError'
  }
}
/** Confirmation is bound to the exact current dependents, not a stale dialog's boolean. */
export function deleteBattleSimulatorRecord(
  library: BattleSimulatorLibrary,
  directory: SimulatorDirectory,
  id: string,
  confirmedPlanIds: readonly string[] = [],
): BattleSimulatorLibrary {
  const current = parseBattleSimulatorLibrary(library)
  if (!current[directory].some((entry) => entry.id === id)) throw new Error(`预设不存在：${id}`)
  const dependents = battleSimulatorDependentPlans(current, directory, id).sort()
  const confirmed = [...confirmedPlanIds].sort()
  if (JSON.stringify(dependents) !== JSON.stringify(confirmed))
    throw new BattleSimulatorPresetInUseError(dependents)
  return parseBattleSimulatorLibrary({
    ...current,
    [directory]: current[directory].filter((entry) => entry.id !== id),
  })
}
