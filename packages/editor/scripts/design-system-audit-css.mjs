import Specificity from '@bramus/specificity'
import { JSDOM } from 'jsdom'
import { requiredTargetClasses } from './selector-prefilter.mjs'

function textOverflowCssConditionForRule(rule) {
  if (!rule?.cssRules) return undefined
  if (rule.constructor.name === 'CSSMediaRule') return `@media ${rule.conditionText}`
  if (rule.constructor.name === 'CSSContainerRule') return `@container ${rule.conditionText}`
  if (rule.constructor.name === 'CSSSupportsRule') return `@supports ${rule.conditionText}`
  return undefined
}

/** CSSOM is the sole inventory source; selector arms are normalized by the specificity parser. */
export function deriveTextOverflowCssCensus(cssSources) {
  const entries = []
  for (const [sourceOrder, { source, css }] of cssSources.entries()) {
    const dom = new JSDOM('<!doctype html><html><head><style></style></head><body></body></html>')
    dom.window.document.querySelector('style').textContent = css
    let ruleOrder = 0
    const walk = (cssRules, conditionStack = []) => {
      for (const rule of cssRules ?? []) {
        if (typeof rule.selectorText === 'string') {
          const declarations = []
          if (rule.style.getPropertyValue('text-overflow').trim() === 'ellipsis')
            declarations.push('text-overflow:ellipsis')
          if (rule.style.getPropertyValue('white-space').trim() === 'nowrap')
            declarations.push('white-space:nowrap')
          if (!declarations.length) continue
          ruleOrder += 1
          const condition = conditionStack.length ? conditionStack.join(' && ') : 'default'
          for (const specificity of Specificity.calculate(rule.selectorText))
            entries.push({
              source,
              selectorText: specificity.selectorString(),
              condition,
              declarations,
              specificity: specificity.toArray(),
              sourceOrder,
              ruleOrder,
            })
          continue
        }
        if (!rule.cssRules) continue
        const condition = textOverflowCssConditionForRule(rule)
        walk(rule.cssRules, condition ? [...conditionStack, condition] : conditionStack)
      }
    }
    walk(dom.window.document.styleSheets[0]?.cssRules)
    dom.window.close()
  }
  return entries.sort(
    (left, right) =>
      left.source.localeCompare(right.source) ||
      left.condition.localeCompare(right.condition) ||
      left.selectorText.localeCompare(right.selectorText),
  )
}

const parsedCssScrollRuleCache = new Map()
const cssElementScrollResultCache = new Map()

const cssContractProperties = new Set([
  'block-size',
  'height',
  'max-block-size',
  'max-height',
  'overflow',
  'overflow-x',
  'overflow-y',
])

function cssConditionForRule(rule) {
  if (!rule?.cssRules) return undefined
  if (rule.constructor.name === 'CSSMediaRule') return `@media ${rule.conditionText}`
  if (rule.constructor.name === 'CSSContainerRule') return `@container ${rule.conditionText}`
  if (rule.constructor.name === 'CSSSupportsRule') return `@supports ${rule.conditionText}`
  return undefined
}

const cssConditionProfileCache = new Map()

function cssConditionProfile(condition) {
  const cached = cssConditionProfileCache.get(condition)
  if (cached) return cached
  const constraints = new Map()
  const opaque = new Set()
  for (const clause of condition.split(' && ')) {
    if (clause.includes(',')) {
      opaque.add(clause)
      continue
    }
    const media = clause.match(/^@media\s+/)
    const container = clause.match(/^@container(?:\s+([A-Za-z0-9_-]+))?\s+/)
    const dimension = media
      ? 'media:viewport'
      : container
        ? `container:${container[1] ?? '<anonymous>'}`
        : undefined
    const bounds = [...clause.matchAll(/\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)]
    if (!dimension || !bounds.length) {
      opaque.add(clause)
      continue
    }
    const residue = clause
      .replace(/\((?:min|max)-width:\s*\d+(?:\.\d+)?px\)/g, '')
      .replace(/^@media\s+/, '')
      .replace(/^@container(?:\s+[A-Za-z0-9_-]+)?\s+/, '')
      .replace(/\band\b/g, '')
      .trim()
    if (residue) {
      opaque.add(clause)
      continue
    }
    const constraint = constraints.get(dimension) ?? {
      max: Number.POSITIVE_INFINITY,
      min: Number.NEGATIVE_INFINITY,
    }
    for (const match of bounds) {
      const value = Number(match[2])
      if (match[1] === 'min') constraint.min = Math.max(constraint.min, value)
      else constraint.max = Math.min(constraint.max, value)
    }
    constraints.set(dimension, constraint)
  }
  const result = { constraints, opaque }
  cssConditionProfileCache.set(condition, result)
  return result
}

function mergeCssConditionProfiles(conditions) {
  const constraints = new Map()
  const opaque = new Set()
  for (const condition of conditions) {
    const profile = cssConditionProfile(condition)
    for (const value of profile.opaque) opaque.add(value)
    for (const [dimension, bound] of profile.constraints) {
      const merged = constraints.get(dimension) ?? {
        max: Number.POSITIVE_INFINITY,
        min: Number.NEGATIVE_INFINITY,
      }
      merged.min = Math.max(merged.min, bound.min)
      merged.max = Math.min(merged.max, bound.max)
      if (merged.min > merged.max) return undefined
      constraints.set(dimension, merged)
    }
  }
  return { constraints, opaque }
}

function cssConditionProfileImplies(source, target) {
  for (const value of target.opaque) if (!source.opaque.has(value)) return false
  for (const [dimension, targetBound] of target.constraints) {
    const sourceBound = source.constraints.get(dimension)
    if (!sourceBound || sourceBound.min < targetBound.min || sourceBound.max > targetBound.max)
      return false
  }
  return true
}

function cssConditionScenarios(conditions) {
  const unique = [...new Set(conditions)].sort()
  const scenarios = [{ activeConditions: new Set(), condition: 'default' }]
  for (const basis of unique) {
    const basisProfile = mergeCssConditionProfiles([basis])
    if (!basisProfile) continue
    const seeds = [[basis]]
    for (const peer of unique) {
      if (peer === basis) continue
      const combined = mergeCssConditionProfiles([basis, peer])
      if (!combined || cssConditionProfileImplies(basisProfile, cssConditionProfile(peer))) continue
      seeds.push([basis, peer])
    }
    const seen = new Set()
    for (const seed of seeds) {
      const profile = mergeCssConditionProfiles(seed)
      if (!profile) continue
      const activeConditions = new Set(
        unique.filter((condition) =>
          cssConditionProfileImplies(profile, cssConditionProfile(condition)),
        ),
      )
      const signature = [...activeConditions].sort().join(' && ')
      if (seen.has(signature)) continue
      seen.add(signature)
      scenarios.push({ activeConditions, condition: basis })
    }
  }
  return scenarios
}

export function parsedCssScrollRules(css) {
  const cached = parsedCssScrollRuleCache.get(css)
  if (cached) return cached
  const dom = new JSDOM('<!doctype html><html><head><style></style></head><body></body></html>')
  dom.window.document.querySelector('style').textContent = css
  const sheet = dom.window.document.styleSheets[0]
  const rules = []
  const conditions = new Set()
  let order = 0
  const walk = (cssRules, conditionStack = []) => {
    for (const rule of cssRules ?? []) {
      if (typeof rule.selectorText === 'string') {
        const declarations = []
        for (let index = 0; index < rule.style.length; index += 1) {
          const property = rule.style[index]
          if (!cssContractProperties.has(property)) continue
          declarations.push({
            property,
            value: rule.style.getPropertyValue(property).trim(),
            important: rule.style.getPropertyPriority(property) === 'important',
            declarationOrder: index,
          })
        }
        if (!declarations.length) continue
        order += 1
        const condition = conditionStack.length ? conditionStack.join(' && ') : 'default'
        if (condition !== 'default') conditions.add(condition)
        for (const specificity of Specificity.calculate(rule.selectorText))
          rules.push({
            condition,
            declarations,
            order,
            selector: specificity.selectorString(),
            specificity: specificity.toArray(),
            requiredTargetClasses: requiredTargetClasses(specificity.selectorString()),
          })
        continue
      }
      if (!rule.cssRules) continue
      const condition = cssConditionForRule(rule)
      walk(rule.cssRules, condition ? [...conditionStack, condition] : conditionStack)
    }
  }
  walk(sheet?.cssRules)
  const result = { conditions: [...conditions].sort(), document: dom.window.document, rules }
  parsedCssScrollRuleCache.set(css, result)
  if (parsedCssScrollRuleCache.size > 8)
    parsedCssScrollRuleCache.delete(parsedCssScrollRuleCache.keys().next().value)
  return result
}

function cssCascadeOrder(left, right) {
  return (
    Number(left.important) - Number(right.important) ||
    left.specificity[0] - right.specificity[0] ||
    left.specificity[1] - right.specificity[1] ||
    left.specificity[2] - right.specificity[2] ||
    left.order - right.order ||
    left.declarationOrder - right.declarationOrder
  )
}

function overflowAxisValues(value) {
  const values = value.split(/\s+/).filter(Boolean)
  return { x: values[0], y: values[1] ?? values[0] }
}

export function selectorClassTokens(selector) {
  return [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1])
}

function finiteBlockBoundary(value) {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '0') return false
  if (
    /\b(?:auto|content|fit-content|max-content|min-content|none|normal|inherit|initial|unset|revert|revert-layer)\b/.test(
      normalized,
    ) ||
    /(?:var|env)\(/.test(normalized) ||
    normalized.includes('%')
  )
    return false
  const withoutDimensions = normalized
    .replace(
      /-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|ex|ch|lh|rlh|cm|mm|q|in|pt|pc|vh|svh|lvh|dvh|vw|svw|lvw|dvw|vmin|svmin|lvmin|dvmin|vmax|svmax|lvmax|dvmax)\b/g,
      '',
    )
    .replace(/\b0\b/g, '')
    .replace(/\b(?:calc|min|max|clamp)\(/g, '(')
    .replace(/[\s(),+*/-]/g, '')
  return withoutDimensions === ''
}

function virtualElementSignature(metadata, elements) {
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  return path
    .map((site) => {
      const element = site === metadata.elementSite ? metadata : elements.get(site)
      return `${element?.tag ?? 'div'}#${[...(element?.classes ?? [])].sort().join('.')}#${JSON.stringify(element?.classVariants ?? [])}#${Boolean(element?.classVariantsTruncated)}#${JSON.stringify(element?.attributes ?? {})}#${JSON.stringify(element?.inlineScrollStyle ?? {})}`
    })
    .join('>')
}

function virtualElementClassPaths(metadata, elements) {
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  const elementPath = path.map((site) =>
    site === metadata.elementSite ? metadata : elements.get(site),
  )
  let truncated = elementPath.some((element) => element?.classVariantsTruncated)
  const classPaths = elementPath.reduce(
    (paths, element) => {
      const variants = element?.classVariants?.length
        ? element.classVariants
        : [element?.classes ?? []]
      const expanded = paths.flatMap((classes) => variants.map((variant) => [...classes, variant]))
      if (expanded.length > 256) truncated = true
      return expanded.slice(0, 256)
    },
    [[]],
  )
  return { classPaths, elementPath, truncated }
}

function selectorHasVariantCorrelationRisk(selector, elementPath) {
  const selectorTokens = new Set(selectorClassTokens(selector))
  let sensitiveElements = 0
  for (const element of elementPath) {
    const variants = element?.classVariants ?? []
    if (variants.length < 2) continue
    const union = new Set(variants.flat())
    const common = new Set(
      variants[0].filter((token) => variants.every((classes) => classes.includes(token))),
    )
    if ([...union].some((token) => !common.has(token) && selectorTokens.has(token)))
      sensitiveElements += 1
  }
  return sensitiveElements > 1
}

function buildVirtualElement(metadata, elements, document, classPath) {
  document.body.replaceChildren()
  let parent = document.body
  const append = (elementMetadata, classes = elementMetadata?.classes ?? []) => {
    const intrinsicTag = /^[a-z][A-Za-z0-9-]*$/.test(elementMetadata?.tag ?? '')
      ? elementMetadata.tag
      : 'div'
    const element = document.createElement(intrinsicTag)
    for (const token of classes) element.classList.add(token)
    for (const [name, value] of Object.entries(elementMetadata?.attributes ?? {}))
      try {
        element.setAttribute(name, value)
      } catch {
        // Invalid or framework-only JSX attribute names cannot contribute selector evidence.
      }
    parent.appendChild(element)
    parent = element
    return element
  }
  const path = [...(metadata.ancestorSites ?? []), metadata.elementSite]
  let target = parent
  path.forEach((site, index) => {
    target = append(site === metadata.elementSite ? metadata : elements.get(site), classPath[index])
  })
  return target
}

export function cssElementScrollContracts(metadata, elements, css) {
  let results = cssElementScrollResultCache.get(css)
  if (!results) {
    results = new Map()
    cssElementScrollResultCache.set(css, results)
    if (cssElementScrollResultCache.size > 8)
      cssElementScrollResultCache.delete(cssElementScrollResultCache.keys().next().value)
  }
  const key = virtualElementSignature(metadata, elements)
  if (results.has(key)) return results.get(key)
  const analysis = parsedCssScrollRules(css)
  const { classPaths, elementPath, truncated } = virtualElementClassPaths(metadata, elements)
  const scenarios = classPaths.flatMap((classPath, classVariant) => {
    const targetClasses = classPath.at(-1) ?? []
    const element = buildVirtualElement(metadata, elements, analysis.document, classPath)
    // Read the actual DOM after attributes have been applied; JSX attributes may
    // replace the initially assigned classes. This only rejects impossible matches.
    const elementClasses = new Set(element.classList)
    const matchedRules = analysis.rules.filter((rule) => {
      if (rule.requiredTargetClasses.some((token) => !elementClasses.has(token))) return false
      try {
        return element.matches(rule.selector)
      } catch {
        return false
      }
    })
    const conditionScenarios = cssConditionScenarios(
      matchedRules.map((rule) => rule.condition).filter((condition) => condition !== 'default'),
    )
    return conditionScenarios.map(({ activeConditions, condition }) => {
      const winners = new Map()
      for (const rule of matchedRules) {
        if (rule.condition !== 'default' && !activeConditions.has(rule.condition)) continue
        for (const declaration of rule.declarations) {
          const candidates = []
          if (declaration.property === 'overflow') {
            const values = overflowAxisValues(declaration.value)
            candidates.push(['overflow-x', values.x], ['overflow-y', values.y])
          } else candidates.push([declaration.property, declaration.value])
          for (const [property, value] of candidates) {
            const candidate = { ...rule, ...declaration, property, value }
            const winner = winners.get(property)
            if (!winner || cssCascadeOrder(winner, candidate) <= 0) winners.set(property, candidate)
          }
        }
      }
      for (const [declarationOrder, declaration] of (
        metadata.inlineScrollStyle?.declarations ?? []
      ).entries()) {
        const candidates = []
        if (declaration.property === 'overflow') {
          const values = overflowAxisValues(declaration.value)
          candidates.push(['overflow-x', values.x], ['overflow-y', values.y])
        } else candidates.push([declaration.property, declaration.value])
        for (const [property, value] of candidates) {
          const candidate = {
            condition: 'default',
            declarationOrder,
            important: false,
            order: Number.MAX_SAFE_INTEGER,
            property,
            selector: '<inline style>',
            specificity: [Number.MAX_SAFE_INTEGER, 0, 0],
            value,
          }
          const winner = winners.get(property)
          if (!winner || cssCascadeOrder(winner, candidate) <= 0) winners.set(property, candidate)
        }
      }
      const axis = (name) => {
        const winner = winners.get(`overflow-${name}`)
        return {
          ownerClasses: winner
            ? selectorClassTokens(winner.selector).filter((token) => targetClasses.includes(token))
            : [],
          scroll: ['auto', 'scroll'].includes(winner?.value),
          selector: winner?.selector,
          sourceCondition: winner?.condition,
          variantCorrelationUncertain: winner
            ? selectorHasVariantCorrelationRisk(winner.selector, elementPath)
            : false,
          value: winner?.value,
        }
      }
      const boundaryWinners = [
        winners.get('height'),
        winners.get('max-height'),
        winners.get('block-size'),
        winners.get('max-block-size'),
      ].filter(Boolean)
      const finiteBoundary = boundaryWinners.find((winner) => finiteBlockBoundary(winner.value))
      return {
        activeConditions: [...activeConditions].sort(),
        classVariant,
        condition,
        inlineStyleUncertain: Boolean(metadata.inlineScrollStyle?.uncertain),
        variantEnumerationTruncated: truncated,
        x: axis('x'),
        y: axis('y'),
        bounded: Boolean(finiteBoundary),
        boundary: finiteBoundary ? `${finiteBoundary.property}:${finiteBoundary.value}` : undefined,
      }
    })
  })
  results.set(key, scenarios)
  return scenarios
}
