// 仙术菜单状态机(纯逻辑;非视觉)。数据来自地基 learnedSkills → skills 表(调用方注入)。
// 流程 = 一阶段 in-game-magic-menu.ts(uigame.c:653-875 1:1)的 clean-rewrite:
//   pick-caster(多人队选施法人;单人队跳过)→ pick-spell(3 列网格;applyToAll 直放、
//   可连放)→ pick-target(选队员;连放;MP 不足退回 pick-spell)。
//   pick-spell Cancel = 关整个菜单(不回 pick-caster —— caster 框原版在循环外只弹一次)。
import type { CharacterInstance, SkillData, SkillDataMap, WorldState } from '@type-pal/content'
import { curePoisons } from './battle/battle-core.js'

/** 原版仙术网格列数(draw-magic.ts:3 列)。 */
export const MAGIC_GRID_COLS = 3

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

/** 解析角色当前可在大世界用的仙术:learnedSkills[casterId] → skills → 过滤 usableOutsideBattle。
 *  skills 表由调用方注入(去全局化:不再直接 import DEMO_SKILLS)。 */
export function resolveOutdoorSkills(
  world: WorldState,
  casterId: string,
  skills: SkillDataMap,
): SkillData[] {
  const ids = world.learnedSkills[casterId] ?? []
  return ids
    .map((id) => skills[id])
    .filter((s): s is SkillData => s != null)
    .filter((s) => s.usableOutsideBattle)
}

/** 开仙术面板:多人队进 pick-caster(光标 = 上次施法人记忆,越界归 0;uigame.c:674 static w);
 *  单人队跳过选人直进 pick-spell(uigame.c:677-681 goto start_magicmenu)。 */
export function openMagicMenu(
  world: WorldState,
  skills: SkillDataMap,
  lastCasterIdx = 0,
): MagicMenuState {
  if (world.party.length === 1) {
    const only = world.party[0]!
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

/** 确认施法人 → 解析其仙术进 pick-spell;死人(hp≤0)不可选(uigame.c:707-708 fEnabled)。
 *  活着但无大世界仙术仍可进(空列表;原版真值 L37)。 */
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
export type MagicSpellConfirm = { kind: 'castAll'; skill: SkillData } | { kind: 'toTarget' } | null

/** 选中技能:MP 门(不足 = 无效,原版 disabled 不可确认);allAllies → 直放(留 pick-spell 连放);
 *  单体 → 进 pick-target(uigame.c:740-861 真值分叉)。 */
export function magicConfirmSpell(s: MagicMenuState, world: WorldState): MagicSpellConfirm {
  if (s.phase !== 'pick-spell' || s.spells.length === 0) return null
  const caster = world.party[s.casterIdx]
  const skill = s.spells[s.cursor]
  if (!caster || !skill) return null
  if (caster.mp < (skill.cost.mp ?? 0)) return null
  if (skill.target === 'allAllies') return { kind: 'castAll', skill }
  s.targetIdx = 0
  s.phase = 'pick-target'
  return { kind: 'toTarget' }
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

// ── 施放结算(= 一阶段 magic-script.ts 大世界 opcode 的效果化版)──────────────────

/** 大世界施放:按 effects 对队员结算,返回「是否有真实变化」(sdlpal g_fScriptSuccess)。
 *  success 才扣 MP —— 满血奶/死人奶/复活活人不吃消耗(global.c:1324 avoid over treatment)。
 *  效果覆盖 = 大世界技能实测集(healHp×5/revive×2)+ 同构 healMp/curePoison;其余 kind 大世界无义,no-op。
 *  target:'all' = 全队(对齐 0x1B/0x22 applyToAll 遍历);数字 = party 下标。 */
export function castOutdoorSkill(
  world: WorldState,
  skill: SkillData,
  casterIdx: number,
  target: number | 'all',
  poisonDefs: Record<number, import('@type-pal/content').PoisonDef> = {},
): boolean {
  const caster = world.party[casterIdx]
  if (!caster) return false
  const mpCost = skill.cost.mp ?? 0
  if (caster.mp < mpCost) return false
  const targets: CharacterInstance[] =
    target === 'all' ? world.party : world.party[target] ? [world.party[target]!] : []
  let success = false
  for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'healHp':
        // 0x1B:仅活人;clamp 后无变化(满血)不算成功(global.c:1287/1324)
        for (const t of targets) {
          if (t.hp <= 0) continue
          const next = Math.min(t.maxHP, t.hp + eff.amount)
          if (next !== t.hp) {
            t.hp = next
            success = true
          }
        }
        break
      case 'healMp':
        for (const t of targets) {
          if (t.hp <= 0) continue
          const next = Math.min(t.maxMP, t.mp + eff.amount)
          if (next !== t.mp) {
            t.mp = next
            success = true
          }
        }
        break
      case 'revive':
        // 0x22:仅死人;HP = max×%(trunc,无保底 —— 一阶段真值)+ 解毒 ≤severe;活人 = 无效果
        for (const t of targets) {
          if (t.hp > 0) continue
          t.hp = Math.trunc((t.maxHP * eff.hpPercent) / 100)
          curePoisons(t, poisonDefs, 'severe')
          success = true
        }
        break
      case 'curePoison':
        // 数据现无大世界解毒技;同构支持(灵血咒若开 outdoor 即生效)
        for (const t of targets) {
          if (t.hp <= 0) continue
          const before = t.poisons?.length ?? 0
          if (eff.poisonId !== undefined)
            t.poisons = t.poisons?.filter((ap) => ap.poisonId !== Number(eff.poisonId))
          else curePoisons(t, poisonDefs, eff.curesTier ?? 'common')
          if ((t.poisons?.length ?? 0) !== before) success = true
        }
        break
      default:
        break // 战斗向效果(damage/status/…)大世界无义
    }
  }
  if (success) caster.mp -= mpCost
  return success
}
