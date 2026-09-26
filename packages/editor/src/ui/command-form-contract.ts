import type { AuthorCommand, Command } from '@type-pal/content'

/**
 * Author commands with a shape or editing policy that belongs to CanonicalCommandForm.
 * Every other author command may cross the shared CommandForm bridge without losing
 * author-only dialogue identity.
 */
export const AUTHOR_CUSTOM_COMMAND_KINDS = [
  'cameraSnap',
  'chasePlayer',
  'endBattle',
  'fleeBattle',
  'gameOver',
  'halveMoney',
  'increaseHpMp',
  'loadLastSave',
  'playFrameAnimation',
  'playVideo',
  'quitToTitle',
  'revivePartyAll',
  'setFollowers',
  'setSceneMapOverride',
  'setScreenWave',
  'shakeScreen',
  'stopMusic',
  'stopScript',
  'toggleDayNight',
  'unequip',
  'unmountParty',
  'suspendEntity',
  'hideEntity',
  'restoreEntity',
  'removeEntity',
  'setEntityState',
  'setMultiEntityState',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityLayer',
  'setEntityFacing',
  'setEntityFrame',
  'playEntityAction',
  'stopEntityAction',
  'moveEntity',
  'stepEntity',
  'animEntity',
  'nudgeEntity',
  'takeEntity',
  'releaseEntity',
  'mountParty',
  'ride',
  'startBattle',
  'teleportOut',
  'confirm',
  'branch',
  'loop',
  'selectEntityBehavior',
  'selectEntityPage',
  'setEntityTriggerActivation',
  'selectSceneHooks',
  'callScript',
] as const satisfies readonly AuthorCommand['kind'][]

export type AuthorCustomCommandKind = (typeof AUTHOR_CUSTOM_COMMAND_KINDS)[number]
export type SharedAuthorCommand = Exclude<AuthorCommand, { kind: AuthorCustomCommandKind }>

/** Public form dialect: legacy/runtime commands plus the shared canonical-author subset. */
export type CommandFormCommand = Command | SharedAuthorCommand

const authorCustomCommandKinds: ReadonlySet<AuthorCommand['kind']> = new Set(
  AUTHOR_CUSTOM_COMMAND_KINDS,
)

function isAuthorCustomCommand(
  command: AuthorCommand,
): command is Extract<AuthorCommand, { kind: AuthorCustomCommandKind }> {
  return authorCustomCommandKinds.has(command.kind)
}

export interface AuthorCommandFormBridge {
  command: SharedAuthorCommand
  commit(next: CommandFormCommand): SharedAuthorCommand
}

function hasAuthorDialogueIdentity(command: CommandFormCommand): boolean {
  return command.kind !== 'dialog' || 'identity' in command.cue
}

/**
 * Admits only the author subset owned by CommandForm. Commit rejects command-kind drift
 * and loss of canonical dialogue identity before returning to the author tree.
 */
export function createAuthorCommandFormBridge(
  command: AuthorCommand,
): AuthorCommandFormBridge | undefined {
  if (isAuthorCustomCommand(command)) return undefined
  const shared = command
  return {
    command: shared,
    commit(next) {
      if (next.kind !== shared.kind)
        throw new Error(`CommandForm changed command kind: ${shared.kind} -> ${next.kind}`)
      if (!hasAuthorDialogueIdentity(next))
        throw new Error('CommandForm removed canonical dialogue identity')
      return next as SharedAuthorCommand
    },
  }
}
