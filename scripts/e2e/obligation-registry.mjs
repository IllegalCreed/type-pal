import assert from 'node:assert/strict'

const FRAGMENTS = ['001', '002', '003', '004', '005', '006']
const SPECIAL = {
  '001': 'assertOpeningMatrix',
  '002': 'assertInnEvidence',
  '003': 'assertKitchenTrace',
  '004': 'assertMealPhase',
  '005': 'assertErrandStory',
  '006': 'assertBoatStoryEnd/compareBoatObservations',
}

/** Required evidence inventory, not a replacement for the actual proof checkers. */
export const STORY_OBLIGATIONS = Object.freeze(
  Object.fromEntries(
    FRAGMENTS.map((fragment) => [
      fragment,
      Object.freeze([
        {
          id: `${fragment}:input-execution`,
          domain: 'input',
          evidence: ['actions'],
          checker: 'assertInputLedger',
        },
        {
          id: `${fragment}:actor-motion-pose`,
          domain: 'motion',
          evidence: ['events', 'worldRenders', 'assetIdentity'],
          checker: 'compareNpcStateTraces',
        },
        {
          id: `${fragment}:actual-draw-resources`,
          domain: 'resource',
          evidence: ['resources', 'drawResourceBinding'],
          checker: 'checkSpriteResources',
        },
        {
          id: `${fragment}:finite-author-execution`,
          domain: 'execution',
          engines: ['reforge'],
          evidence: ['authorBindings', 'causes'],
          checker: 'checkStoryExecutions',
        },
        {
          id: `${fragment}:actual-authority-lifetime`,
          domain: 'authority',
          engines: ['reforge'],
          evidence: ['lifecycle', 'causes'],
          checker: 'checkAuthoredOwnership/checkAutomaticLifecycle',
        },
        {
          id: `${fragment}:dialogue-display-consumption`,
          domain: 'dialogue',
          evidence: ['causes', 'pages', 'worldRenders', 'pageInstances'],
          checker: 'checkGameDialogueCausality/checkDialogueCorrespondence',
        },
        {
          id: `${fragment}:persistent-effects`,
          domain: 'persistent',
          engines: ['reforge'],
          evidence: ['causes', 'events'],
          checker: 'checkPersistentEffects',
        },
        ...(['004', '006'].includes(fragment)
          ? [
              {
                id: `${fragment}:explicit-screen-effects`,
                domain: 'presentation',
                engines: ['reforge'],
                evidence: ['presentation', 'causes'],
                checker: 'checkPresentationEffects',
              },
            ]
          : []),
        {
          id: `${fragment}:story-special-contract`,
          domain: 'story',
          evidence: ['events'],
          checker: SPECIAL[fragment],
        },
      ]),
    ]),
  ),
)

export function obligationsFor(fragment, engine) {
  assert(FRAGMENTS.includes(fragment), `unknown story fragment ${fragment}`)
  return STORY_OBLIGATIONS[fragment].filter(
    (o) => !engine || !o.engines || o.engines.includes(engine),
  )
}

/** Available evidence is not a proof. Missing evidence cannot be ignored by admission. */
export function inspectTraceCapabilities(fragment, trace, engine) {
  const nonempty = (value) => Array.isArray(value) && value.length > 0
  const draws = (trace?.events ?? []).filter(
    (event) => event.kind === 'actor-render' && event.state?.drawStatus === 'drawn',
  )
  const pages = (trace?.pages ?? []).filter((event) => event.page)
  const capabilities = {
    presentation: ['presentation-start', 'presentation-draw', 'presentation-end'].every((phase) =>
      (trace?.causes ?? []).some((e) => e.phase === phase && Number.isSafeInteger(e.effectId)),
    ),
    resources: nonempty(trace?.resources),
    drawResourceBinding:
      nonempty(draws) && draws.every((e) => Number.isSafeInteger(e.state.frameResourceId)),
    authorBindings: (trace?.causes ?? []).some((e) => e.phase === 'run-started' && e.author),
    lifecycle: (trace?.causes ?? []).some(
      (e) => e.lifecycle?.authority && Array.isArray(e.lifecycle.activations),
    ),
    events: nonempty(trace?.events),
    worldRenders: nonempty(trace?.worldRenders),
    pages: nonempty(pages),
    actions: nonempty(trace?.actions),
    causes: nonempty(trace?.causes),
    assetIdentity: nonempty(draws) && draws.every((event) => event.state.assetId != null),
    pageInstances:
      nonempty(pages) &&
      pages.every(
        (event) =>
          Number.isSafeInteger(event.page.instance) &&
          event.page.instance > 0 &&
          Number.isSafeInteger(event.sceneVisit),
      ),
  }
  return obligationsFor(fragment, engine).map((obligation) => {
    const missing = obligation.evidence.filter((field) => !capabilities[field])
    return {
      id: obligation.id,
      domain: obligation.domain,
      checker: obligation.checker,
      status: missing.length ? 'unknown' : 'available',
      missing,
    }
  })
}
