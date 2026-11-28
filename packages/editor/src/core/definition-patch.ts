/** Capture only the fields a command will change so undo can preserve the rest of the definition. */
export function captureDefinitionPatch<Definition extends object>(
  definition: Definition,
  patch: NoInfer<Partial<Definition>>,
): Partial<Definition> {
  const previous: Partial<Definition> = {}
  for (const key in patch) {
    if (Object.hasOwn(patch, key)) previous[key] = structuredClone(definition[key])
  }
  return previous
}

/** An explicit undefined removes an optional field from the author document. */
export function applyDefinitionPatch<Definition extends object>(
  definition: Definition,
  patch: NoInfer<Partial<Definition>>,
): Definition {
  const next = { ...definition, ...patch }
  for (const key in patch) {
    if (Object.hasOwn(patch, key) && patch[key] === undefined) delete next[key]
  }
  return next
}
