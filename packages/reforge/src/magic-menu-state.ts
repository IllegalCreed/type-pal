// 仙术菜单状态机(纯逻辑;非视觉)。数据来自地基 learnedSkills → DEMO_SKILLS。
// 参考一阶段 game in-game-magic-menu.ts 的 moveSpellGrid。
import { DEMO_SKILLS, type SkillData, type WorldState } from '@type-pal/content'

/** 原版仙术网格列数(draw-magic.ts:3 列)。 */
export const MAGIC_GRID_COLS = 3

export interface MagicMenuState {
  active: boolean
  phase: 'pick-spell' | 'pick-target' // 选技能 / 选目标:选完技能才进 pick-target,选人红箭头仅此阶段画
  spells: SkillData[] // 已解析 + 已过滤 outdoor 的可用仙术(网格按此渲染)
  cursor: number // 选中索引(0-based,flat)
}

/** 解析角色当前可在大世界用的仙术:learnedSkills[casterId] → DEMO_SKILLS → 过滤 usableOutsideBattle。
 *  注:MP 不足的"禁用"判定目前在渲染层(magic-box 按 caster.mp >= cost.mp 灰显),查看版够用。
 *  将来支持施法(选 MP 不足的仙术应 no-op)时,disabled 判定应上移到这里/状态机,别让壳层盲选。 */
export function resolveOutdoorSkills(world: WorldState, casterId: string): SkillData[] {
  const ids = world.learnedSkills[casterId] ?? []
  return ids
    .map((id) => DEMO_SKILLS[id])
    .filter((s): s is SkillData => s != null)
    .filter((s) => s.usableOutsideBattle)
}

export function openMagicMenu(spells: SkillData[]): MagicMenuState {
  return { active: true, phase: 'pick-spell', spells, cursor: 0 }
}

export function closeMagicMenu(): MagicMenuState {
  return { active: false, phase: 'pick-spell', spells: [], cursor: 0 }
}

/** 选中技能 → 进选目标阶段(选人红箭头此后才出)。空列表不进。 */
export function magicConfirmSpell(s: MagicMenuState): MagicMenuState {
  if (s.phase !== 'pick-spell' || s.spells.length === 0) return s
  return { ...s, phase: 'pick-target' }
}

/** 选目标阶段返回 → 回选技能(取消目标)。 */
export function magicBackFromTarget(s: MagicMenuState): MagicMenuState {
  if (s.phase !== 'pick-target') return s
  return { ...s, phase: 'pick-spell' }
}

/** 网格导航:↑↓ = ±MAGIC_GRID_COLS,←→ = ±1;越界吸附首/尾、不 wrap(对齐 inventory-menu setCursorClamp)。 */
export function magicMoveCursor(
  s: MagicMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): MagicMenuState {
  if (s.phase !== 'pick-spell') return s // 仅选技能阶段走网格
  const n = s.spells.length
  if (n === 0) return s
  const delta =
    dir === 'up' ? -MAGIC_GRID_COLS : dir === 'down' ? MAGIC_GRID_COLS : dir === 'left' ? -1 : 1
  // 越界吸附首/尾(对齐一阶段 inventory-menu.ts setCursorClamp,非"不动")
  const next = s.cursor + delta
  return { ...s, cursor: next < 0 ? 0 : next >= n ? n - 1 : next }
}
