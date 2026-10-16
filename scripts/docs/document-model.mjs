import { createHash } from 'node:crypto'
import { dirname, posix } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parseTestingFrontMatter } from './check-testing.mjs'
import {
  frozenBindingTemplate,
  frozenDocumentBaseline,
  inspectFrozenBaselineView,
  inspectFrozenDocumentBaseline,
  readFrozenBaselineRoot,
} from './frozen-document-source.mjs'
import { markdownLinks, withoutFences } from './markdown.mjs'

function documentStatus(text, contract) {
  if (contract.format === 'json') {
    try {
      return JSON.parse(text)?.status
    } catch {
      return undefined
    }
  }
  // The live field belongs to the first root metadata paragraph after the title.
  // Searching all raw lines also matches HTML pre blocks and lazy blockquotes.
  const skipBlankLines = (value) => value.replace(/^(?:[ \t]*\n)+/, '')
  const content = skipBlankLines(withoutFences(text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')))
  if (!/^# [^\n]+\n/.test(content)) return undefined
  const paragraph = skipBlankLines(content.slice(content.indexOf('\n') + 1)).split(
    /\n[ \t]*\n/,
    1,
  )[0]
  if (
    !paragraph.split('\n').every((line) => /^(Status|Owner|Last reviewed|Template): .+/.test(line))
  )
    return undefined
  const fields = [...paragraph.matchAll(/^Status: (.*)$/gm)]
  if (fields.length !== 1) return undefined
  return /^([a-z][a-z-]*)(?=$|[\s（(])/.exec(fields[0][1])?.[1]
}

function publicationIssues(text, contract, read) {
  const catalogPath = contract.statusPolicy?.catalog
  if (!catalogPath) return []
  let catalog
  let id
  try {
    catalog = JSON.parse(read(catalogPath))
    id = contract.format === 'json' ? JSON.parse(text)?.id : parseTestingFrontMatter(text)?.id
  } catch {
    return ['publication status catalog or document identity invalid']
  }
  const entries = catalog?.entries?.filter((entry) => entry.id === id) ?? []
  if (!id || entries.length !== 1) return ['publication status requires one catalog identity']
  return documentStatus(text, contract) === entries[0].status
    ? []
    : ['publication status differs from catalog']
}

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
  if (contract.statusPolicy) {
    const status = documentStatus(text, contract)
    if (status === undefined) issues.push('one valid document status required')
    else if (!contract.statuses.includes(status))
      issues.push(`invalid ${contract.statusPolicy.axis} status: ${status}`)
  }
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
    for (const key of new Set([
      ...(!variant && template.defaultRequiredGovernanceFields
        ? template.defaultRequiredGovernanceFields
        : (template.requiredGovernanceFields ?? [])),
      ...(contract.requiredGovernanceFields ?? []),
    ]))
      if (value._governance?.[key] === undefined || value._governance[key] === '')
        issues.push(`missing governance field: ${key}`)
    if (variant && value._governance?.variant !== variant)
      issues.push('governance variant mismatch')
    if (contract.entryReadingsField) {
      const readings = contract.entryReadingsField
        .split('.')
        .reduce((object, key) => object?.[key], value)
      if (!Array.isArray(value.entries) || value.entries.length === 0)
        issues.push('catalog entries must be a non-empty array')
      if (!Array.isArray(readings)) issues.push('catalog entry readings must be an array')
      else {
        const entries = Array.isArray(value.entries) ? value.entries : []
        const ids = new Set(entries.map((entry) => entry?.id))
        const seen = new Set()
        for (const reading of readings) {
          if (!reading || typeof reading !== 'object') {
            issues.push('catalog reading must be an object')
            continue
          }
          if (!ids.has(reading.id) || seen.has(reading.id))
            issues.push(`unknown or duplicate catalog reading: ${reading.id}`)
          seen.add(reading.id)
          if (typeof reading.conclusion !== 'string' || !reading.conclusion.trim())
            issues.push(`catalog reading conclusion missing: ${reading.id}`)
        }
        for (const id of ids) if (!seen.has(id)) issues.push(`catalog reading missing: ${id}`)
      }
    }
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

function preservedSourceIssues(text, doc, registry, contract, read, options) {
  const { readSource } = options
  if (!contract?.preservedSource) return []
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return [] // The body contract reports malformed JSON.
  }
  if (!value || Array.isArray(value) || typeof value !== 'object') return []
  const pins = Array.isArray(registry.historicalSourcePins)
    ? registry.historicalSourcePins.filter((pin) => pin.path === doc.path)
    : []
  if (pins.length !== 1) return ['historical source requires one approved external path pin']
  const pin = pins[0]
  if (
    !/^[a-f\d]{40}$/.test(pin.revision ?? '') ||
    !/^[a-f\d]{40}$/.test(pin.gitObject ?? '') ||
    !/^[a-f\d]{64}$/.test(pin.sha256 ?? '')
  )
    return ['approved historical source pin invalid']
  if (contract.preservedSource) {
    if (
      contract.preservedSource.baseline !== frozenDocumentBaseline.path ||
      pin.revision !== frozenDocumentBaseline.revision
    )
      return ['historical source pin is outside the independently frozen snapshot']
    if (!readSource) return ['approved historical Git source unavailable']
    const baseline = inspectFrozenDocumentBaseline(read, readSource, options)
    if (baseline.issues.length) return baseline.issues
    const bindings = baseline.entries.filter((entry) => entry.path === doc.path)
    if (bindings.length !== 1 || bindings[0].sourceSha256 !== pin.sha256)
      return ['historical source pin differs from frozen baseline']
  }
  const metadata = value._governance
  if (
    metadata?.sourceGitRevision !== pin.revision ||
    metadata?.sourceGitObject !== pin.gitObject ||
    metadata?.sourceSha256 !== pin.sha256
  )
    return ['historical source declaration differs from approved external pin']
  const source = readSource?.(pin)
  if (!source || typeof source.text !== 'string')
    return ['approved historical Git source unavailable']
  if (
    source.gitObject !== pin.gitObject ||
    createHash('sha256').update(source.text).digest('hex') !== pin.sha256
  )
    return ['approved historical Git source blob or SHA mismatch']
  let original
  try {
    original = JSON.parse(source.text)
  } catch {
    return ['approved historical source is not JSON']
  }
  if (!original || Array.isArray(original) || typeof original !== 'object')
    return ['approved historical source is not an object']
  const issues = []
  if (Object.hasOwn(original, '_governance'))
    issues.push('historical source already contains a governance envelope')
  for (const [path, expected] of Object.entries(contract.preservedSource.requiredValues ?? {})) {
    const actual = path.split('.').reduce((object, key) => object?.[key], original)
    if (actual !== expected) issues.push(`historical source field mismatch: ${path}`)
  }
  const preserved = { ...value }
  delete preserved._governance
  if (!isDeepStrictEqual(preserved, original))
    issues.push('historical original machine fields changed')
  return issues
}

function bindingBaselineIssues(doc, template, contract, options) {
  if (
    doc.path !== frozenDocumentBaseline.path &&
    doc.variant !== frozenBindingTemplate.variant &&
    contract?.preservedSource?.kind !== frozenBindingTemplate.sourceKind
  )
    return undefined
  if (
    doc.path !== frozenDocumentBaseline.path ||
    doc.templateId !== frozenBindingTemplate.templateId ||
    doc.variant !== frozenBindingTemplate.variant ||
    template.format !== 'json' ||
    contract?.format !== 'json' ||
    contract?.preservedSource?.kind !== frozenBindingTemplate.sourceKind
  )
    return ['frozen baseline requires its unique path and typed JSON binding']
  if (typeof options.readBuffer !== 'function' || typeof options.readSourceBuffer !== 'function')
    return ['frozen baseline requires real Buffer readers']
  const root = readFrozenBaselineRoot(options.readSourceBuffer)
  if (root.issues.length) return root.issues
  const view = inspectFrozenBaselineView(options.readBuffer(doc.path), root)
  return view.state === 'governed'
    ? view.issues
    : [...view.issues, 'frozen baseline migration requires governed view']
}

/** The same complete per-document checks serve routing and completion accounting. */
export function checkMigratedDocument(doc, registry, read, options = {}) {
  const text = read(doc.path)
  const template = registry.types.find((type) => type.templateId === doc.templateId)
  if (text === undefined) return ['migrated document missing']
  if (!template) return [`unknown template ${doc.templateId}`]
  const overlay = registry.types.find(
    (type) => type.templateId === registry.historyOverlayTemplateId,
  )
  const issues = checkTemplateBody(text, template, {
    variant: doc.variant,
    additionalSections: doc.historyOverlay ? (overlay?.requiredSections ?? []) : [],
  })
  if (doc.historyOverlay && !overlay?.requiredSections?.length)
    issues.push('history overlay contract missing')
  const contract = doc.variant ? template.variants?.[doc.variant] : template
  if (contract) {
    issues.push(...publicationIssues(text, contract, read))
    const baselineIssues = bindingBaselineIssues(doc, template, contract, options)
    issues.push(
      ...(baselineIssues ?? preservedSourceIssues(text, doc, registry, contract, read, options)),
    )
  }
  if (!contract) issues.push(...(bindingBaselineIssues(doc, template, contract, options) ?? []))
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
      issues.push('machine template declaration mismatch')
    return issues
  }
  const visible = withoutFences(text)
  if (!/^Last reviewed: \d{4}-\d{2}-\d{2}$/m.test(visible)) issues.push('review date missing')
  if (!visible.includes(`Template: ${template.templateId} / ${template.templateVersion}`))
    issues.push('template declaration mismatch')
  return issues
}

export function checkDocumentModel(config, registry, read, options = {}) {
  const issues = checkRouting(config, read)
  const paths = new Set()
  for (const doc of config.migratedDocuments) {
    if (paths.has(doc.path)) issues.push(`${doc.path}: duplicate migrated document`)
    paths.add(doc.path)
    for (const issue of checkMigratedDocument(doc, registry, read, options))
      issues.push(`${doc.path}: ${issue}`)
  }
  return issues
}
