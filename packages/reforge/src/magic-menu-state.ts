import type { SkillData, SkillDataMap, WorldState } from '@type-pal/content'
import { expectDefined } from './defined.js'
import { type GridDirection, MENU_GRID_COLUMNS, stepMenuGridCursor } from './menu/grid-cursor.js'

/** 原版仙术网格列数(draw-magic.ts:3 列)。 */
export const MAGIC_GRID_COLS = MENU_GRID_COLUMNS

export interface MagicMenuState {
  active: boolean
  /** 选施法人 / 选技能 / 选目标(选人红箭头仅 pick-target 画)。 */
  phase: 'pick-caster' | 'pick-spell' | 'pick-target'
  /** 施法人光标(party 下标;pick-caster 阶段 = 光标,之后 = 已选定施法者)。 */
  casterIdx: number
  /** 已解析 + 已过滤 outdoor 的可用仙术(网格按此渲染;确认施法人时解析)。 */
  spells: SkillData[]
  cursor: number // 技能网格选中索引(0-based,flat)
  /** 选目标光标(party 下标;pick-target 阶段用)。 */
  targetIdx: number
}

/** Keep the learned order and show only skills declared for use in the world. */
function resolveOutdoorSkills(
  world: WorldState,
  casterId: string,
  skills: SkillDataMap,
): SkillData[] {
  // A restored party can contain a member without a learned-skill row.
  if (!Object.hasOwn(world.learnedSkills, casterId)) return []
  return (world.learnedSkills[casterId] ?? []).flatMap((id) => {
    const skill = Object.hasOwn(skills, id) ? skills[id] : undefined
    return skill?.usableOutsideBattle ? [skill] : []
  })
}

/** 开仙术面板:多人队进 pick-caster(光标 = 上次施法人记忆,越界归 0;uigame.c:674 static w);
 *  单人队跳过选人直进 pick-spell(uigame.c:677-681 goto start_magicmenu)。 */
export function openMagicMenu(
  world: WorldState,
  skills: SkillDataMap,
  lastCasterIdx = 0,
): MagicMenuState {
  if (world.party.length === 1) {
    const only = expectDefined(world.party[0])
    return {
      active: true,
      phase: 'pick-spell',
      casterIdx: 0,
      spells: resolveOutdoorSkills(world, only.id, skills),
      cursor: 0,
      targetIdx: 0,
    }
  }
  const casterIdx = lastCasterIdx < world.party.length ? lastCasterIdx : 0
  return { active: true, phase: 'pick-caster', casterIdx, spells: [], cursor: 0, targetIdx: 0 }
}

export function closeMagicMenu(): MagicMenuState {
  return { active: false, phase: 'pick-spell', casterIdx: 0, spells: [], cursor: 0, targetIdx: 0 }
}

/** 选施法人光标:上下循环(一阶段 moveSelectionUp/Down % n;可停在死人上,确认时拦)。 */
export function magicMoveCaster(
  s: MagicMenuState,
  world: WorldState,
  dir: 'up' | 'down',
): MagicMenuState {
  if (s.phase !== 'pick-caster') return s
  const n = world.party.length
  if (n === 0) return s
  const next = (s.casterIdx + (dir === 'up' ? -1 : 1) + n) % n
  return { ...s, casterIdx: next }
}

/** A living member can open the spell panel even when no spells are available. */
export function magicConfirmCaster(
  s: MagicMenuState,
  world: WorldState,
  skills: SkillDataMap,
): MagicMenuState {
  if (s.phase !== 'pick-caster') return s
  const caster = world.party[s.casterIdx]
  if (!caster || caster.hp <= 0) return s
  return {
    ...s,
    phase: 'pick-spell',
    spells: resolveOutdoorSkills(world, caster.id, skills),
    cursor: 0,
  }
}

/** pick-spell 确认结果:直放全体 / 进选目标 / 无效(MP 不足、空列表)。 */
type MagicSpellConfirm =
  | { kind: 'castAll'; skill: SkillData }
  | { kind: 'toTarget'; state: MagicMenuState }
  | null

/** 选中技能:MP 门(不足 = 无效,原版 disabled 不可确认);allAllies → 直放(留 pick-spell 连放);
 *  单体 → 进 pick-target(uigame.c:740-861 真值分叉)。 */
export function magicConfirmSpell(s: MagicMenuState, world: WorldState): MagicSpellConfirm {
  if (s.phase !== 'pick-spell' || s.spells.length === 0) return null
  const caster = world.party[s.casterIdx]
  const skill = s.spells[s.cursor]
  if (!caster || !skill) return null
  if (caster.mp < (skill.cost.mp ?? 0)) return null
  if (skill.target === 'allAllies') return { kind: 'castAll', skill }
  return { kind: 'toTarget', state: { ...s, phase: 'pick-target', targetIdx: 0 } }
}

/** 选目标光标:±1 不 wrap(uigame.c:841/849 边界 noop)。 */
export function magicMoveTarget(
  s: MagicMenuState,
  world: WorldState,
  dir: 'up' | 'down',
): MagicMenuState {
  if (s.phase !== 'pick-target') return s
  const next = s.targetIdx + (dir === 'up' ? -1 : 1)
  if (next < 0 || next >= world.party.length) return s
  return { ...s, targetIdx: next }
}

/** 选目标阶段返回 → 回选技能(取消目标)。 */
export function magicBackFromTarget(s: MagicMenuState): MagicMenuState {
  if (s.phase !== 'pick-target') return s
  return { ...s, phase: 'pick-spell' }
}

export function magicMoveCursor(s: MagicMenuState, direction: GridDirection): MagicMenuState {
  if (s.phase !== 'pick-spell' || s.spells.length === 0) return s
  return { ...s, cursor: stepMenuGridCursor(s.cursor, s.spells.length, direction) }
}
