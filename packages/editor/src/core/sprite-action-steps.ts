import type { SpriteActionDef, SpriteActionStep } from '@type-pal/content'

/** Insert a new occurrence while retaining the original step that starts the loop. */
export function insertSpriteActionStep(
  action: SpriteActionDef,
  step: SpriteActionStep,
  targetIndex: number,
): SpriteActionDef {
  const loopStep = action.loopFrom === undefined ? undefined : action.steps[action.loopFrom]
  const steps = [...action.steps]
  steps.splice(Math.max(0, Math.min(targetIndex, steps.length)), 0, step)
  const next = { ...action, steps }
  if (loopStep) next.loopFrom = steps.indexOf(loopStep)
  return next
}

/** When the loop start is removed, use the next surviving step or the new last step. */
export function removeSpriteActionStep(action: SpriteActionDef, index: number): SpriteActionDef {
  if (action.steps.length <= 1) return action
  const steps = action.steps.filter((_, position) => position !== index)
  const next = { ...action, steps }
  if (action.loopFrom !== undefined) {
    if (index < action.loopFrom) next.loopFrom = action.loopFrom - 1
    else if (index === action.loopFrom) next.loopFrom = Math.min(index, steps.length - 1)
  }
  return next
}

export function updateSpriteActionStep(
  action: SpriteActionDef,
  index: number,
  update: (step: SpriteActionStep) => SpriteActionStep,
): SpriteActionDef {
  return {
    ...action,
    steps: action.steps.map((step, position) => (position === index ? update(step) : step)),
  }
}
