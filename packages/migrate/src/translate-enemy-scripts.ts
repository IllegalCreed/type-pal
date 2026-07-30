/**
 * 敌人三钩子迁移边界。
 *
 * ready / turnStart 必须保留 PAL 的 battle-local persistent cursor，不能再投影成绝对回合
 * AiRule；battleEnd 则是一次性 canonical onDefeated body，生成前严格限制为单 stage 与
 * EnemyOnDefeatedCommandV10 子集。
 */
import {
  type AiRule,
  type BattleChoreography,
  checkEnemyHookFlow,
  checkEnemyOnDefeatedCommandsV10,
  type EnemyFallback,
  type EnemyHookChannel,
  type EnemyHookFlow,
  type EnemyOnDefeatedCommandV10,
} from '@type-pal/content'
import { translateEnemyHookFlow, type EnemyHookOwner } from './translate-enemy-hook-flow.js'
import type { TranslateCtx } from './translate-events.js'
import { translateStages } from './translate-events.js'

export interface EnemyScriptTranslation {
  /** 保留作者侧无状态策略槽；PAL 源敌钩不再向这里生成伪 turn rule。 */
  rules: AiRule[]
  fallback?: EnemyFallback
  hooks?: Partial<Record<EnemyHookChannel, EnemyHookFlow>>
  /** PAL 敌钩演出归 hook owner；这里只保留兼容输出形状，成功时恒为空。 */
  choreography: BattleChoreography[]
  onDefeated?: EnemyOnDefeatedCommandV10[]
  /** 新 translator 遇缺口 fail-loud；成功迁移时恒为空。 */
  pending: string[]
}

function initialFallback(
  initialCast: { magic: number; rate: number } | undefined,
): EnemyFallback | undefined {
  if (!initialCast || initialCast.magic === 0) return undefined
  return {
    action:
      initialCast.magic === 0xffff
        ? { kind: 'pass' }
        : { kind: 'cast', skillId: String(initialCast.magic) },
    chancePercent: Math.max(0, Math.min(100, initialCast.rate * 10)),
  }
}

function ownerLabel(owner: EnemyHookOwner | undefined): string {
  return owner ? `${owner.id}「${owner.name}」` : 'enemy'
}

/** 翻译一个敌人的 ready / turnStart / battleEnd 三个入口。 */
export function translateEnemyScripts(
  ctx: TranslateCtx,
  hooks: { turnStart?: number; ready?: number; battleEnd?: number },
  initialCast?: { magic: number; rate: number },
  owner?: EnemyHookOwner,
): EnemyScriptTranslation {
  const out: EnemyScriptTranslation = {
    rules: [],
    choreography: [],
    pending: [],
  }
  const fallback = initialFallback(initialCast)
  if (fallback) out.fallback = fallback

  for (const channel of ['ready', 'turnStart'] as const) {
    const address = hooks[channel]
    if (!address) continue
    const translated = translateEnemyHookFlow(ctx, address, channel, owner)
    checkEnemyHookFlow(translated.flow, `${ownerLabel(owner)}.ai.hooks.${channel}@L_${address}`)
    out.hooks ??= {}
    out.hooks[channel] = translated.flow
  }

  if (hooks.battleEnd) {
    const address = hooks.battleEnd
    const path = `${ownerLabel(owner)} battleEnd L_${address}`
    const stages = translateStages(`L_${address}`, undefined, ctx)
    if (!stages || stages.length !== 1)
      throw new Error(`${path}: 期望恰好 1 个 stage，收到 ${stages?.length ?? 0}`)
    const body: unknown = stages[0]?.body
    checkEnemyOnDefeatedCommandsV10(body, `${path}.body`)
    if (body.length) out.onDefeated = body
  }

  return out
}
