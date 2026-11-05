import type { Magic, ObjectMagicView, Spell } from '@type-pal/shared'

export interface ResolvedMagicObject {
  id: number
  spell: Spell
  magic: Magic
  source: 'spell' | 'objectMagic'
}

export interface UnresolvedMagicObject {
  id: number
  spell?: Spell
  objectMagic?: ObjectMagicView
  magicNumber?: number
  reason: 'objectNotFound' | 'magicNotFound'
}

/**
 * Prefer the spell table even when its referenced magic is missing: a broken spell
 * must be reported, rather than hidden by a different OBJECT view of the same ID.
 * Magic and table Spell records are borrowed. A fallback Spell is newly assembled
 * but still borrows its flags; callers own script progress in GameState.
 */
export function resolveMagicObject(
  objectId: number,
  spells: readonly Spell[],
  magics: readonly Magic[],
  objectMagics: readonly ObjectMagicView[] = [],
): ResolvedMagicObject | undefined {
  // 当前 parseSpells 已含296..397及梦蛇295。只在没有该Spell时读取完整OBJECT的
  // magic-union视图；同ID的Spell存在但引用损坏时，不用另一视图掩盖错误。
  const spell = spells.find((s) => s.id === objectId)
  if (spell) {
    const magic = magics.find((m) => m.id === spell.magicNumber)
    return magic ? { id: objectId, spell, magic, source: 'spell' } : undefined
  }

  const objectMagic = objectMagics.find((m) => m.id === objectId)
  if (!objectMagic) return undefined
  const magic = magics.find((m) => m.id === objectMagic.magicNumber)
  if (!magic) return undefined

  return {
    id: objectId,
    source: 'objectMagic',
    spell: {
      id: objectMagic.id,
      magicNumber: objectMagic.magicNumber,
      scriptOnSuccess: objectMagic.scriptOnSuccess,
      scriptOnUse: objectMagic.scriptOnUse,
      scriptDesc: 0,
      flags: objectMagic.flags,
    },
    magic,
  }
}

/** Diagnose the same precedence as resolveMagicObject without creating a fallback Spell. */
export function explainMagicObjectResolution(
  objectId: number,
  spells: readonly Spell[],
  magics: readonly Magic[],
  objectMagics: readonly ObjectMagicView[] = [],
): UnresolvedMagicObject | undefined {
  const spell = spells.find((s) => s.id === objectId)
  if (spell) {
    const magic = magics.find((m) => m.id === spell.magicNumber)
    return magic
      ? undefined
      : { id: objectId, spell, magicNumber: spell.magicNumber, reason: 'magicNotFound' }
  }

  const objectMagic = objectMagics.find((m) => m.id === objectId)
  if (objectMagic) {
    const magic = magics.find((m) => m.id === objectMagic.magicNumber)
    return magic
      ? undefined
      : { id: objectId, objectMagic, magicNumber: objectMagic.magicNumber, reason: 'magicNotFound' }
  }

  return { id: objectId, reason: 'objectNotFound' }
}
