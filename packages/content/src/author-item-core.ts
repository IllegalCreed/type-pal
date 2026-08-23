import type { ItemData, ItemUseContext, ItemUseEffect, ThrowSpec, UseSpec } from './item.js'
import { ITEM_USE_EFFECT_KINDS, itemUseEffectSupportsContext } from './item.js'
import type { ScriptId } from './author-script-core.js'
import type { RuntimeCommand } from './runtime-script.js'

export interface ItemPrivateScript {
  id: 'use'
  label?: string
  body: RuntimeCommand[]
}

export type AuthorItemUseEffect =
  | Exclude<ItemUseEffect, { kind: 'runScript' }>
  | { kind: 'runScript'; script: ScriptId }
  | { kind: 'itemPrivateScript'; script: ItemPrivateScript }

export interface AuthorItemUseSpec extends Omit<UseSpec, 'effects'> {
  effects: AuthorItemUseEffect[]
}

/** 投掷没有 shared/private script；当前模型只允许使用能力拥有脚本引用。 */
export type AuthorItemThrowSpec = ThrowSpec

export interface AuthorItemCore extends Omit<ItemData, 'use' | 'throw'> {
  use?: AuthorItemUseSpec
  throw?: AuthorItemThrowSpec
}

export type AuthorItemCoreMap = Record<string, AuthorItemCore>

export const AUTHOR_ITEM_USE_EFFECT_KINDS = {
  ...ITEM_USE_EFFECT_KINDS,
  itemPrivateScript: true,
} satisfies Record<AuthorItemUseEffect['kind'], true>

/** 当前 effect×context 唯一真源；item-private 与稳定 shared script 都只属于世界上下文。 */
export function authorItemUseEffectSupportsContext(
  effect: AuthorItemUseEffect,
  context: ItemUseContext,
): boolean {
  if (effect.kind === 'runScript' || effect.kind === 'itemPrivateScript') return context === 'world'
  return itemUseEffectSupportsContext(effect, context)
}

export function authorItemUseSupportsContext(use: AuthorItemUseSpec, context: ItemUseContext): boolean {
  if (context === 'world' && use.battleOnly) return false
  return (
    use.effects.length > 0 &&
    use.effects.every((effect) => authorItemUseEffectSupportsContext(effect, context))
  )
}
