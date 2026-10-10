/** The same read-only projection is inserted into all later-fragment collectors.
 * It records independent frame-selection inputs, not another computed display index.
 */
export function reforgeActorObservation(
  entity = 'e',
  behavior = `world.script.behaviors?.entities?.[sid]?.[${entity}.id]??null`,
) {
  return `({position:[${entity}.pos.col,${entity}.pos.row,${entity}.pos.height],facing:${entity}.facing??'down',visible:!${entity}.hidden,
    state:host.getEntityState(${entity}.id),behavior:${behavior},
    sprite:typeof ${entity}.sprite==='string'&&${entity}.sprite.startsWith('sprite-')?Number(${entity}.sprite.slice(7)):${entity}.sprite??${entity}.actor??null,
    frameRendered:worldPresentation.renderedEntityFrame(${entity}.id)??null,
    frame:worldPresentation.renderedEntityFrame(${entity}.id)??worldPresentation.entityFrame(${entity}.id)??motion.gaitPhase(${entity}.id)??motion.explicitAnimation(${entity}.id)??entityActions.frame(${entity}.id)??0,
    frameDebug:{override:worldPresentation.entityFrame(${entity}.id)??null,gait:motion.gaitPhase(${entity}.id)??null,gaitOwner:motion.gaitOwner(${entity}.id)??null,
      gaitActivationOwner:motion.gaitActivationOwner(${entity}.id)??null,lastMovedWorldTick:motion.lastMovedWorldTick(${entity}.id)??null,
      explicit:motion.explicitAnimation(${entity}.id)??null,action:entityActions.frame(${entity}.id)??null,authority:motionRuntime.authority.get(${entity}.id)?.kind??'world',
      autoSlot:autoMotionSlots.get(${entity}.id)?.kind??null,scriptSlot:scriptMotionSlots.get(${entity}.id)?.kind??null}})`
}
