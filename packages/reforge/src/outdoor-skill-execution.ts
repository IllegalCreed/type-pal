import type { CharacterInstance, PoisonDef, SkillData, WorldState } from '@type-pal/content'
import { curePoisons } from './battle/battle-core.js'
import { expectDefined } from './defined.js'

/** Apply the selected restoration effects in authored order. Spend MP once if the cast changes a target. */
export function castOutdoorSkill(
  world: WorldState,
  skill: SkillData,
  casterIdx: number,
  target: number | 'all',
  poisonDefs: Record<number, PoisonDef> = {},
): boolean {
  const caster = world.party[casterIdx]
  if (!caster) return false
  const mpCost = skill.cost.mp ?? 0
  if (caster.mp < mpCost) return false
  const targets: CharacterInstance[] =
    target === 'all' ? world.party : world.party[target] ? [expectDefined(world.party[target])] : []
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
