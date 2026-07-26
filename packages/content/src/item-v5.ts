import type { ItemData, ItemUseContext, ItemUseEffect, ThrowSpec, UseSpec } from './item.js'
import { ITEM_USE_EFFECT_KINDS, itemUseEffectSupportsContext } from './item.js'
import type { AuthorCommandV5, ScriptId } from './script-v5.js'

export interface ItemPrivateScriptV5 {
  id: 'use'
  label?: string
  body: AuthorCommandV5[]
}

export type ItemUseEffectV5 =
  | Exclude<ItemUseEffect, { kind: 'runScript' }>
  | { kind: 'runScript'; script: ScriptId }
  | { kind: 'itemPrivateScript'; script: ItemPrivateScriptV5 }

export interface UseSpecV5 extends Omit<UseSpec, 'effects'> {
  effects: ItemUseEffectV5[]
}

export interface ThrowSpecV5 extends Omit<ThrowSpec, 'effects'> {
  effects: ItemUseEffectV5[]
}

export interface ItemDataV5 extends Omit<ItemData, 'use' | 'throw'> {
  use?: UseSpecV5
  throw?: ThrowSpecV5
}

export type ItemDataMapV5 = Record<string, ItemDataV5>

export const ITEM_USE_EFFECT_KINDS_V5 = {
  ...ITEM_USE_EFFECT_KINDS,
  itemPrivateScript: true,
} satisfies Record<ItemUseEffectV5['kind'], true>

/** v5 effect×context 唯一真源；item-private 与稳定 shared script 都只属于世界上下文。 */
export function itemUseEffectSupportsContextV5(
  effect: ItemUseEffectV5,
  context: ItemUseContext,
): boolean {
  if (effect.kind === 'runScript' || effect.kind === 'itemPrivateScript') return context === 'world'
  return itemUseEffectSupportsContext(effect, context)
}

export function itemUseSupportsContextV5(use: UseSpecV5, context: ItemUseContext): boolean {
  if (context === 'world' && use.battleOnly) return false
  return (
    use.effects.length > 0 &&
    use.effects.every((effect) => itemUseEffectSupportsContextV5(effect, context))
  )
}
