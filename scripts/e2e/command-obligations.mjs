import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

/** Finite domain ownership, not a list of exempt commands. Each named checker also runs in total admission. */
const groups = {
  persistent: [
    'giveItem',
    'loseItem',
    'giveMoney',
    'playMusic',
    'stopMusic',
    'setActorAppearance',
    'setParty',
    'selectSceneHooks',
    'selectEntityBehavior',
    'selectEntityPage',
    'setEntityTriggerActivation',
    'setEntityState',
    'setEntityPos',
    'setEntityPosRelParty',
  ],
  motion: [
    'animEntity',
    'faceEntityToParty',
    'setActorSprite',
    'setEntityFacing',
    'setEntityFrame',
    'setPartyFacing',
    'moveEntity',
    'moveParty',
    'nudgeEntity',
    'nudgeParty',
    'stepEntity',
    'teleportParty',
    'mountParty',
    'ride',
    'chasePlayer',
  ],
  authority: ['takeEntity', 'releaseEntity'],
  dialogue: ['dialog', 'clearDialog'],
  presentation: ['fade', 'ditherScreen'],
  lifecycle: [
    'wait',
    'loadScene',
    'runEntityTrigger',
    'branch',
    'repeat',
    'loop',
    'breakLoop',
    'continueLoop',
    'finishStep',
    'returnScript',
  ],
  // Only authored request identity/order: neither hardware audio output nor audible equivalence is claimed.
  'sound-request': ['playSound'],
}
export const COMMAND_DOMAINS = Object.freeze(
  Object.fromEntries(
    Object.entries(groups).flatMap(([domain, kinds]) => kinds.map((kind) => [kind, domain])),
  ),
)
export function commandDomain(command) {
  const kind = command?.kind === 'leaf' ? command.command?.kind : command?.kind
  requireTrace(
    Object.hasOwn(COMMAND_DOMAINS, kind),
    'unclassified-effect-domain',
    'audited command domain',
    kind,
    'unknown',
  )
  return COMMAND_DOMAINS[kind]
}

/** Actual extra effects cannot disappear just because no finite expected run mentions them. */
export function checkCommandCoverage(trace) {
  return checkTransitionTrace(
    {
      id: 'actual-command-domain-coverage/v1',
      initial: { domains: {}, commands: 0 },
      transitions: {
        command: (s, { event }) => {
          const domain = commandDomain(event.occurrence?.command)
          s.domains[domain] = (s.domains[domain] ?? 0) + 1
          s.commands++
          return s
        },
      },
      accept: () => {},
    },
    (trace.causes ?? [])
      .filter((e) => e.phase === 'command')
      .map((event) => ({ type: 'command', event })),
  )
}
