import { type ActorDef, collectActorTaggedReferences } from '@type-pal/content'

export interface PalInPartyActorIdReference {
  actorId: string
  where: string
}

export interface PalInPartyActorIdReport {
  references: PalInPartyActorIdReference[]
}

/**
 * 现行 PAL 发布先校验作者脚本结构，再核对 inParty 的 ActorId。
 * 旧数字角色编号单独报错，以便和已命名但缺定义的角色区分。
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
