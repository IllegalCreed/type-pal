/**
 * Necessary (never sufficient) target classes for a deliberately small CSS subset.
 * Audit DOMs are standards-mode. Pseudos, lists, attributes, escapes, namespaces and
 * non-ASCII syntax stay with Element.matches; do not infer requirements inside them.
 */
export function requiredTargetClasses(selector) {
  if (!/^[A-Za-z0-9_.#*>+~ \t\r\n\f-]+$/.test(selector)) return []
  const target = selector
    .trim()
    .split(/[>+~ \t\r\n\f]+/)
    .at(-1)
  if (!/^(?:[A-Za-z_-][A-Za-z0-9_-]*|\*)?(?:[.#][A-Za-z_-][A-Za-z0-9_-]*)+$/.test(target)) return []
  return [...target.matchAll(/\.([A-Za-z_-][A-Za-z0-9_-]*)/g)].map((match) => match[1])
}
