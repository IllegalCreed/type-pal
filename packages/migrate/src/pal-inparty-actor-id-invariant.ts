import { type ActorDef, collectActorTaggedReferences } from '@type-pal/content'

export interface PalInPartyActorIdReference {
  actorId: string
  where: string
}

export interface PalInPartyActorIdReport {
  references: PalInPartyActorIdReference[]
}

/**
 * PAL current-only 永久门禁：作者树中的 inParty 只允许引用现存稳定 ActorId。
 * 递归域直接复用 content 的 typed Actor reference walker，禁止在 migrate 再长第二套遍历。
 */
export function assertPalInPartyActorIdInvariant(args: {
  actors: readonly Pick<ActorDef, 'id'>[]
  commandRoots: readonly unknown[]
}): PalInPartyActorIdReport {
  const references = args.commandRoots.flatMap((root, index) =>
    collectActorTaggedReferences(root, `commandRoots[${index}]`)
      .filter((reference) => reference.kind === 'condition-in-party')
      .map(({ actorId, where }) => ({ actorId, where })),
  )
  const numeric = references.filter(({ actorId }) => /^\d+$/.test(actorId))
  if (numeric.length)
    throw new Error(
      `PAL inParty 仍含数字 ActorId: ${numeric.map(({ actorId, where }) => `${where}=${JSON.stringify(actorId)}`).join(', ')}`,
    )
  const actorIds = new Set(args.actors.map(({ id }) => id))
  const dangling = references.filter(({ actorId }) => !actorIds.has(actorId))
  if (dangling.length)
    throw new Error(
      `PAL inParty 引用未知 ActorId: ${dangling.map(({ actorId, where }) => `${where}=${JSON.stringify(actorId)}`).join(', ')}`,
    )
  return { references }
}
