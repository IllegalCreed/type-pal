// 仙术菜单状态机(纯逻辑;非视觉)。数据来自地基 learnedSkills → DEMO_SKILLS。
// 参考一阶段 game in-game-magic-menu.ts 的 moveSpellGrid。
import { DEMO_SKILLS, type SkillData, type WorldState } from '@type-pal/content'

/** 原版仙术网格列数(draw-magic.ts:3 列)。 */
export const MAGIC_GRID_COLS = 3

export interface MagicMenuState {
  active: boolean
  spells: SkillData[] // 已解析 + 已过滤 outdoor 的可用仙术(网格按此渲染)
  cursor: number // 选中索引(0-based,flat)
}

/** 解析角色当前可在大世界用的仙术:learnedSkills[casterId] → DEMO_SKILLS → 过滤 usableOutsideBattle。 */
export function resolveOutdoorSkills(world: WorldState, casterId: string): SkillData[] {
  const ids = world.learnedSkills[casterId] ?? []
  return ids
    .map((id) => DEMO_SKILLS[id])
    .filter((s): s is SkillData => s != null)
    .filter((s) => s.usableOutsideBattle)
}

export function openMagicMenu(spells: SkillData[]): MagicMenuState {
  return { active: true, spells, cursor: 0 }
}

export function closeMagicMenu(): MagicMenuState {
  return { active: false, spells: [], cursor: 0 }
}

/** 网格导航:↑↓ = ±MAGIC_GRID_COLS,←→ = ±1;越界 clamp(不动、不 wrap)。 */
export function magicMoveCursor(
  s: MagicMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): MagicMenuState {
  const n = s.spells.length
  if (n === 0) return s
  const delta =
    dir === 'up' ? -MAGIC_GRID_COLS : dir === 'down' ? MAGIC_GRID_COLS : dir === 'left' ? -1 : 1
  const next = s.cursor + delta
  if (next < 0 || next >= n) return s // 越界 → 不动
  return { ...s, cursor: next }
}
