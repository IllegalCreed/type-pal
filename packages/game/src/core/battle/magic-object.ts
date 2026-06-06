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

export function resolveMagicObject(
  objectId: number,
  spells: readonly Spell[],
  magics: readonly Magic[],
  objectMagics: readonly ObjectMagicView[] = [],
): ResolvedMagicObject | undefined {
  // 通常玩家法术落在 spells.json(OBJECT_MAGIC 296..397)。梦蛇这类边界对象
  // id=295 留在 item 段,但 OBJECT union 的 magic view 仍有效,需走 objectMagics 回退。
  const spell = spells.find((s) => s.id === objectId)
  if (spell) {
    const magic = magics.find((m) => m.id === spell.magicNumber)
    return magic ? { id: objectId, spell, magic, source: 'spell' } : undefined
  }

  const objectMagic = objectMagics.find((m) => m.id === objectId)
  if (!objectMagic)
    return undefined
  const magic = magics.find((m) => m.id === objectMagic.magicNumber)
  if (!magic)
    return undefined

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

export function explainMagicObjectResolution(
  objectId: number,
  spells: readonly Spell[],
  magics: readonly Magic[],
  objectMagics: readonly ObjectMagicView[] = [],
): UnresolvedMagicObject | undefined {
  const spell = spells.find((s) => s.id === objectId)
  if (spell) {
    const magic = magics.find((m) => m.id === spell.magicNumber)
    return magic ? undefined : { id: objectId, spell, magicNumber: spell.magicNumber, reason: 'magicNotFound' }
  }

  const objectMagic = objectMagics.find((m) => m.id === objectId)
  if (objectMagic) {
    const magic = magics.find((m) => m.id === objectMagic.magicNumber)
    return magic ? undefined : { id: objectId, objectMagic, magicNumber: objectMagic.magicNumber, reason: 'magicNotFound' }
  }

  return { id: objectId, reason: 'objectNotFound' }
}
