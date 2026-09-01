import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const uiRoot = join(packageRoot, 'src/ui')

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

function productionSources() {
  return filesUnder(uiRoot)
    .filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    .sort()
}

function actionGroupSource(name, overrides) {
  return overrides[name] ?? readFileSync(join(uiRoot, name), 'utf8')
}

function actionGroupStaticAttribute(opening, name, sourceFile) {
  const attribute = opening.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name,
  )
  if (!attribute?.initializer) return undefined
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text
  if (!ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression)
    return undefined
  const expression = attribute.initializer.expression
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text
    : undefined
}

function actionGroupOpening(element) {
  return ts.isJsxElement(element) ? element.openingElement : element
}

function actionGroupFingerprint(opening, sourceFile) {
  const className = actionGroupStaticAttribute(opening, 'className', sourceFile)
  return className ? `className="${className}"` : undefined
}

function actionGroupFingerprintParts(fingerprint) {
  const match = /^([\w-]+)="([^"]+)"$/.exec(fingerprint)
  return match ? { name: match[1], value: match[2] } : undefined
}

function actionGroupCssRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's').exec(css)?.[1] ?? ''
}

function actionGroupCssDeclaration(body, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`, 's').exec(body)?.[1]?.trim()
}

function actionGroupMatchesFingerprint(opening, sourceFile, fingerprint) {
  const parts = actionGroupFingerprintParts(fingerprint)
  if (!parts) return false
  const value = actionGroupStaticAttribute(opening, parts.name, sourceFile)
  if (value === undefined) return false
  return parts.name === 'className'
    ? value.split(/\s+/).filter(Boolean).includes(parts.value)
    : value === parts.value
}

function actionGroupContains(ancestor, node) {
  let current = node
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}

function actionGroupMode(element, sourceFile, problems, sourceName) {
  const modes = []
  for (const child of element.children) {
    if (ts.isJsxText(child)) {
      if (!child.getText(sourceFile).trim()) continue
      problems.push(`${sourceName}: DsActionGroup contains non-action text`)
      continue
    }
    if (ts.isJsxExpression(child)) {
      if (child.expression)
        problems.push(`${sourceName}: DsActionGroup children must remain statically auditable`)
      continue
    }
    if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) {
      problems.push(`${sourceName}: DsActionGroup contains an unsupported child`)
      continue
    }
    const opening = actionGroupOpening(child)
    const tag = opening.tagName.getText(sourceFile)
    if (!['DsIconButton', 'DsReorderMoveButton', 'DsButton'].includes(tag)) {
      problems.push(`${sourceName}: DsActionGroup contains non-action child ${tag}`)
      continue
    }
    if (
      opening.attributes.properties.some(
        (property) => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'size',
      )
    )
      problems.push(`${sourceName}: ${tag} size must be owned by DsActionGroup density`)
    if (tag === 'DsIconButton' || tag === 'DsReorderMoveButton') modes.push('icon-only')
    else {
      const icon = opening.attributes.properties.find(
        (property) => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'icon',
      )
      modes.push(icon ? 'icon-text' : 'text')
    }
  }
  const distinct = [...new Set(modes)]
  if (distinct.length !== 1)
    problems.push(`${sourceName}: DsActionGroup must use one action presentation mode`)
  return distinct.length === 1 ? distinct[0] : 'mixed'
}

/** Production ActionGroup and raw reorder-action census used by Vitest and the CLI gate. */
export function validateActionGroupAdoption(document, overrides = {}) {
  const problems = []
  if (
    !document ||
    document.version !== 1 ||
    !document.baseline ||
    !Array.isArray(document.adopted) ||
    !Array.isArray(document.candidates)
  )
    return [
      'action-group-adoption.json must contain { version: 1, baseline: {}, adopted: [], candidates: [] }',
    ]

  const expectedBaseline = {
    groups: 13,
    moveButtons: 44,
    adoptedMoveButtons: 22,
    rawMoveButtons: 22,
    candidateSurfaces: 11,
  }
  if (JSON.stringify(document.baseline) !== JSON.stringify(expectedBaseline))
    problems.push(`action-group baseline must equal ${JSON.stringify(expectedBaseline)}`)

  const adoptedKeys = [
    'actionMode',
    'density',
    'fingerprint',
    'id',
    'moveButtonCount',
    'occurrence',
    'source',
    'verification',
  ].sort()
  const candidateKeys = [
    'disposition',
    'fingerprint',
    'id',
    'moveButtonCount',
    'occurrence',
    'owner',
    'reason',
    'source',
    'verification',
  ]
  const ids = new Set()
  const adoptedIdentities = new Set()
  for (const [index, entry] of document.adopted.entries()) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`action-group adopted[${index}] must be an object`)
      continue
    }
    if (JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(adoptedKeys))
      problems.push(`action-group adopted[${index}] must use exactly ${adoptedKeys.join(', ')}`)
    if (ids.has(entry.id)) problems.push(`duplicate action-group id ${entry.id}`)
    ids.add(entry.id)
    if (!['default', 'compact'].includes(entry.density))
      problems.push(`action-group ${entry.id} has invalid density ${entry.density}`)
    if (!['icon-only', 'icon-text', 'text'].includes(entry.actionMode))
      problems.push(`action-group ${entry.id} has invalid actionMode ${entry.actionMode}`)
    if (!Number.isInteger(entry.moveButtonCount) || entry.moveButtonCount < 0)
      problems.push(`action-group ${entry.id} moveButtonCount must be a non-negative integer`)
    if (!Number.isInteger(entry.occurrence) || entry.occurrence < 1)
      problems.push(`action-group ${entry.id} occurrence must be a positive integer`)
    if (!actionGroupFingerprintParts(entry.fingerprint))
      problems.push(`action-group ${entry.id} fingerprint must be a static JSX attribute`)
    const identity = `${entry.source}:${entry.fingerprint}:${entry.occurrence}`
    if (adoptedIdentities.has(identity))
      problems.push(`duplicate action-group identity ${identity}`)
    adoptedIdentities.add(identity)
    if (!entry.verification || !readFileSync(join(uiRoot, entry.verification), 'utf8').trim())
      problems.push(`action-group ${entry.id} verification must resolve to a non-empty test`)
  }
  const allowedDispositions = new Set(['equivalent-owner', 'deferred', 'N/A'])
  const candidateIdentities = new Set()
  for (const [index, entry] of document.candidates.entries()) {
    if (!entry || typeof entry !== 'object') {
      problems.push(`action-group candidates[${index}] must be an object`)
      continue
    }
    const expectedKeys = [
      ...candidateKeys,
      ...(entry.disposition === 'deferred' ? ['removalCondition'] : []),
      ...(entry.disposition === 'equivalent-owner' ? ['equivalentEvidence'] : []),
    ].sort()
    if (JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(expectedKeys))
      problems.push(
        `action-group candidate ${entry.id} must use exactly ${expectedKeys.join(', ')}`,
      )
    if (ids.has(entry.id)) problems.push(`duplicate action-group id ${entry.id}`)
    ids.add(entry.id)
    if (!allowedDispositions.has(entry.disposition))
      problems.push(
        `action-group candidate ${entry.id} has invalid disposition ${entry.disposition}`,
      )
    if (entry.moveButtonCount !== 2)
      problems.push(`action-group candidate ${entry.id} must own exactly two move buttons`)
    if (!Number.isInteger(entry.occurrence) || entry.occurrence < 1)
      problems.push(`action-group candidate ${entry.id} occurrence must be a positive integer`)
    if (!actionGroupFingerprintParts(entry.fingerprint))
      problems.push(`action-group candidate ${entry.id} fingerprint must be a static JSX attribute`)
    for (const key of ['owner', 'reason', 'verification'])
      if (typeof entry[key] !== 'string' || !entry[key].trim())
        problems.push(`action-group candidate ${entry.id} ${key} must be non-empty`)
    if (
      entry.disposition === 'deferred' &&
      (typeof entry.removalCondition !== 'string' || !entry.removalCondition.trim())
    )
      problems.push(`action-group deferred candidate ${entry.id} needs a removalCondition`)
    if (entry.disposition === 'equivalent-owner') {
      const evidence = entry.equivalentEvidence
      if (
        !evidence ||
        typeof evidence !== 'object' ||
        typeof evidence.parentSource !== 'string' ||
        typeof evidence.parentFingerprint !== 'string' ||
        typeof evidence.cssSource !== 'string' ||
        typeof evidence.selector !== 'string' ||
        !evidence.requiredDeclarations ||
        typeof evidence.requiredDeclarations !== 'object' ||
        typeof evidence.responsiveEvidence !== 'string' ||
        !evidence.responsiveEvidence.trim()
      )
        problems.push(`action-group equivalent candidate ${entry.id} needs structured evidence`)
      else {
        const parent = actionGroupSource(evidence.parentSource, overrides)
        if (!parent.includes(evidence.parentFingerprint))
          problems.push(`action-group equivalent candidate ${entry.id} parent evidence is stale`)
        const css = actionGroupSource(evidence.cssSource, overrides)
        const body = actionGroupCssRule(css, evidence.selector)
        if (!body) problems.push(`action-group equivalent candidate ${entry.id} CSS owner is stale`)
        for (const [property, value] of Object.entries(evidence.requiredDeclarations))
          if (actionGroupCssDeclaration(body, property) !== value)
            problems.push(
              `action-group equivalent candidate ${entry.id} requires ${property}:${value}`,
            )
      }
    }
    if (!entry.verification || !readFileSync(join(uiRoot, entry.verification), 'utf8').trim())
      problems.push(
        `action-group candidate ${entry.id} verification must resolve to a non-empty test`,
      )
    const identity = `${entry.source}:${entry.fingerprint}:${entry.occurrence}`
    if (candidateIdentities.has(identity))
      problems.push(`duplicate action-group candidate ${identity}`)
    candidateIdentities.add(identity)
  }

  const files = new Map()
  const groups = []
  const moveButtons = []
  for (const absolutePath of productionSources()) {
    const sourceName = relative(uiRoot, absolutePath)
    const source = actionGroupSource(sourceName, overrides)
    const sourceFile = ts.createSourceFile(
      sourceName,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const elements = []
    files.set(sourceName, { source, sourceFile, elements })
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) continue
      const bindings = statement.importClause.namedBindings
      if (!bindings) continue
      if (ts.isNamedImports(bindings)) {
        for (const specifier of bindings.elements) {
          const imported = specifier.propertyName?.text ?? specifier.name.text
          if (
            ['DsActionGroup', 'DsReorderMoveButton'].includes(imported) &&
            specifier.name.text !== imported
          )
            problems.push(`${sourceName}: ${imported} import aliases evade the action-group gate`)
        }
      }
    }
    const occurrenceByFingerprint = new Map()
    const visit = (node, currentGroup) => {
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.initializer)) {
        if (['DsActionGroup', 'DsReorderMoveButton'].includes(node.initializer.text))
          problems.push(`${sourceName}: ${node.initializer.text} variable aliases evade the gate`)
      }
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = actionGroupOpening(node)
        const tag = opening.tagName.getText(sourceFile)
        elements.push(node)
        if (tag.endsWith('.DsActionGroup') || tag.endsWith('.DsReorderMoveButton'))
          problems.push(`${sourceName}: namespace action-group tags evade the gate: ${tag}`)
        let nextGroup = currentGroup
        if (tag === 'DsActionGroup') {
          if (ts.isJsxSelfClosingElement(node)) {
            problems.push(`${sourceName}: DsActionGroup cannot be self-closing`)
          } else {
            if (opening.attributes.properties.some((property) => ts.isJsxSpreadAttribute(property)))
              problems.push(`${sourceName}: DsActionGroup spread props evade the gate`)
            if (
              opening.attributes.properties.some(
                (property) =>
                  ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'role',
              )
            )
              problems.push(`${sourceName}: DsActionGroup must remain a neutral layout wrapper`)
            const density = actionGroupStaticAttribute(opening, 'density', sourceFile)
            if (!['default', 'compact'].includes(density))
              problems.push(`${sourceName}: DsActionGroup density must be static default|compact`)
            const fingerprint = actionGroupFingerprint(opening, sourceFile)
            if (!fingerprint)
              problems.push(`${sourceName}: DsActionGroup needs a static className fingerprint`)
            const occurrence = fingerprint ? (occurrenceByFingerprint.get(fingerprint) ?? 0) + 1 : 1
            if (fingerprint) occurrenceByFingerprint.set(fingerprint, occurrence)
            const record = {
              source: sourceName,
              node,
              opening,
              fingerprint,
              occurrence,
              density,
              actionMode: actionGroupMode(node, sourceFile, problems, sourceName),
              moveButtonCount: 0,
            }
            groups.push(record)
            nextGroup = record
          }
        }
        if (tag === 'DsReorderMoveButton') {
          const record = { source: sourceName, node, group: nextGroup }
          moveButtons.push(record)
          if (nextGroup) nextGroup.moveButtonCount += 1
        }
        if (ts.isJsxElement(node)) {
          for (const child of node.children) visit(child, nextGroup)
        }
        return
      }
      ts.forEachChild(node, (child) => visit(child, currentGroup))
    }
    visit(sourceFile, undefined)
  }

  if (groups.length !== document.baseline.groups)
    problems.push(`action-group production groups ${groups.length} != ${document.baseline.groups}`)
  if (moveButtons.length !== document.baseline.moveButtons)
    problems.push(
      `action-group production move buttons ${moveButtons.length} != ${document.baseline.moveButtons}`,
    )
  const groupedMoves = moveButtons.filter((entry) => entry.group)
  const rawMoves = moveButtons.filter((entry) => !entry.group)
  if (groupedMoves.length !== document.baseline.adoptedMoveButtons)
    problems.push(
      `action-group adopted move buttons ${groupedMoves.length} != ${document.baseline.adoptedMoveButtons}`,
    )
  if (rawMoves.length !== document.baseline.rawMoveButtons)
    problems.push(
      `action-group raw move buttons ${rawMoves.length} != ${document.baseline.rawMoveButtons}`,
    )

  const matchedGroups = new Set()
  for (const entry of document.adopted) {
    const matches = groups.filter(
      (group) =>
        group.source === entry.source &&
        group.fingerprint === entry.fingerprint &&
        group.occurrence === entry.occurrence,
    )
    if (matches.length !== 1) {
      problems.push(`action-group ${entry.id} must bind exactly one production group`)
      continue
    }
    const group = matches[0]
    matchedGroups.add(group)
    if (group.density !== entry.density)
      problems.push(`action-group ${entry.id} density ${group.density} != ${entry.density}`)
    if (group.actionMode !== entry.actionMode)
      problems.push(
        `action-group ${entry.id} action mode ${group.actionMode} != ${entry.actionMode}`,
      )
    if (group.moveButtonCount !== entry.moveButtonCount)
      problems.push(
        `action-group ${entry.id} owns ${group.moveButtonCount} move buttons, expected ${entry.moveButtonCount}`,
      )
  }
  for (const group of groups)
    if (!matchedGroups.has(group))
      problems.push(
        `unregistered action-group ${group.source}:${group.fingerprint}:${group.occurrence}`,
      )

  const rawMoveOwners = new Map(rawMoves.map((move) => [move, []]))
  for (const entry of document.candidates) {
    const file = files.get(entry.source)
    if (!file) {
      problems.push(`action-group candidate ${entry.id} source is not production TSX`)
      continue
    }
    const owners = file.elements.filter((element) =>
      actionGroupMatchesFingerprint(
        actionGroupOpening(element),
        file.sourceFile,
        entry.fingerprint,
      ),
    )
    const owner = owners[entry.occurrence - 1]
    if (!owner) {
      problems.push(`stale action-group candidate ${entry.id}`)
      continue
    }
    const ownedMoves = rawMoves.filter(
      (move) => move.source === entry.source && actionGroupContains(owner, move.node),
    )
    if (ownedMoves.length !== entry.moveButtonCount)
      problems.push(
        `action-group candidate ${entry.id} owns ${ownedMoves.length} move buttons, expected ${entry.moveButtonCount}`,
      )
    for (const move of ownedMoves) rawMoveOwners.get(move)?.push(entry.id)
  }
  if (document.candidates.length !== document.baseline.candidateSurfaces)
    problems.push(
      `action-group candidate surfaces ${document.candidates.length} != ${document.baseline.candidateSurfaces}`,
    )
  for (const [move, owners] of rawMoveOwners)
    if (owners.length !== 1)
      problems.push(`${move.source}: raw move button must map to exactly one candidate owner`)

  return problems
}
