import { dirname, posix } from 'node:path'
import { markdownLinks, withoutFences } from './markdown.mjs'

function section(text, heading) {
  const lines = withoutFences(text).split('\n')
  const start = lines.indexOf(`## ${heading}`)
  if (start < 0) return undefined
  const tail = lines.slice(start + 1)
  const end = tail.findIndex((line) => /^## /.test(line))
  return tail.slice(0, end < 0 ? undefined : end).join('\n')
}

export function checkRouting(config, read) {
  const issues = []
  const entry = read(config.entry)
  const body = entry === undefined ? undefined : section(entry, config.entrySection)
  if (body === undefined) return [`${config.entry}: operation route section missing`]
  const routeNames = new Set()
  for (const route of config.routes) {
    if (routeNames.has(route.operation)) issues.push(`duplicate operation: ${route.operation}`)
    routeNames.add(route.operation)
    const rows = body.split('\n').filter((line) => line.startsWith(`| ${route.operation} |`))
    if (rows.length !== 1) {
      issues.push(`${route.operation}: expected one live route row`)
      continue
    }
    const linked = new Set(
      markdownLinks(rows[0]).map(({ target }) =>
        posix.normalize(posix.join(dirname(config.entry), target.split('#', 1)[0])),
      ),
    )
    for (const path of route.required) {
      if (!linked.has(path)) issues.push(`${route.operation}: mandatory link missing: ${path}`)
      if (read(path) === undefined) issues.push(`${route.operation}: target missing: ${path}`)
    }
    const cells = rows[0].split('|')
    if (!cells.at(-2)?.trim()) issues.push(`${route.operation}: reason missing`)
  }
  for (const path of config.forwardingEntries) {
    const text = read(path)
    if (
      text === undefined ||
      !markdownLinks(text).some(
        ({ target }) =>
          posix.normalize(posix.join(dirname(path), target.split('#', 1)[0])) === config.entry,
      )
    )
      issues.push(`${path}: forwarding link missing`)
  }
  return issues
}

/** Structure checks never grant content-reviewed or execution status. */
export function checkTemplateBody(text, template, { variant, additionalSections = [] } = {}) {
  const issues = []
  const contract = variant ? template.variants?.[variant] : template
  if (!contract) return [`unknown template variant: ${variant}`]
  if (contract.format === 'json') {
    let value
    try {
      value = JSON.parse(text)
    } catch {
      return ['invalid JSON']
    }
    if (value === null || Array.isArray(value) || typeof value !== 'object')
      return ['expected machine evidence object']
    for (const key of contract.requiredFields ?? [])
      if (!Object.hasOwn(value, key)) issues.push(`missing machine field: ${key}`)
    for (const [path, expected] of Object.entries(contract.requiredValues ?? {})) {
      const actual = path.split('.').reduce((object, key) => object?.[key], value)
      if (actual !== expected) issues.push(`machine field mismatch: ${path}`)
    }
    for (const key of template.requiredGovernanceFields ?? [])
      if (value._governance?.[key] === undefined || value._governance[key] === '')
        issues.push(`missing governance field: ${key}`)
    if (variant && value._governance?.variant !== variant)
      issues.push('governance variant mismatch')
    return issues
  }
  const visible = withoutFences(text)
  if ((visible.match(/^# /gm) ?? []).length !== 1) issues.push('expected one document title')
  for (const heading of new Set([
    ...(contract.requiredSections ?? template.requiredSections),
    ...additionalSections,
  ])) {
    const body = section(text, heading)
    if (body === undefined) issues.push(`missing section: ${heading}`)
    else if (!body.replace(/^#{3,}.*$/gm, '').trim()) issues.push(`empty section: ${heading}`)
  }
  return issues
}

export function checkDocumentModel(config, registry, read) {
  const issues = checkRouting(config, read)
  const templates = new Map(registry.types.map((type) => [type.templateId, type]))
  if (
    config.migratedDocuments.some((doc) => doc.historyOverlay) &&
    !templates.get(registry.historyOverlayTemplateId)?.requiredSections?.length
  )
    issues.push('history overlay contract missing')
  const paths = new Set()
  for (const doc of config.migratedDocuments) {
    if (paths.has(doc.path)) issues.push(`${doc.path}: duplicate migrated document`)
    paths.add(doc.path)
    const text = read(doc.path)
    const template = templates.get(doc.templateId)
    if (text === undefined) issues.push(`${doc.path}: migrated document missing`)
    else if (!template) issues.push(`${doc.path}: unknown template ${doc.templateId}`)
    else {
      for (const issue of checkTemplateBody(text, template, {
        variant: doc.variant,
        additionalSections: doc.historyOverlay
          ? (templates.get(registry.historyOverlayTemplateId)?.requiredSections ?? [])
          : [],
      }))
        issues.push(`${doc.path}: ${issue}`)
      if (template.format === 'json') {
        let metadata
        try {
          metadata = JSON.parse(text)._governance
        } catch {
          // The body check already reports malformed JSON.
        }
        if (
          metadata?.templateId !== template.templateId ||
          metadata?.templateVersion !== template.templateVersion
        )
          issues.push(`${doc.path}: machine template declaration mismatch`)
        continue
      }
      const visible = withoutFences(text)
      if (!/^Last reviewed: \d{4}-\d{2}-\d{2}$/m.test(visible))
        issues.push(`${doc.path}: review date missing`)
      if (!visible.includes(`Template: ${template.templateId} / ${template.templateVersion}`))
        issues.push(`${doc.path}: template declaration mismatch`)
    }
  }
  return issues
}
