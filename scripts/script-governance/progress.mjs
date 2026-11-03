import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const PROGRESS_PATH = 'docs/testing/e2e/cross-stage/script-progress.json'
export const AXES = {
  review: ['unreviewed', 'in-review', 'verified', 'needs-review'],
  initialState: [
    'unreviewed',
    'evidence-collected',
    'configured',
    'saved',
    'verified',
    'needs-review',
  ],
  optimization: ['unassessed', 'not-needed', 'planned', 'changed', 'accepted', 'needs-review'],
}
const completed = {
  review: ['verified'],
  initialState: ['verified'],
  optimization: ['accepted', 'not-needed'],
}
const shaPattern = /^[a-f0-9]{64}$/
const id = (value) => typeof value === 'string' && value.trim().length > 0
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    )
  return value
}
export const fingerprint = (value) =>
  createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')
export const byteHash = (bytes) => createHash('sha256').update(bytes).digest('hex')

function keys(value, allowed, where) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${where}: expected object`)
  for (const key of Object.keys(value))
    assert(allowed.includes(key), `${where}: unknown field ${key}`)
}

export function entryKey(entry) {
  keys(entry, ['sceneId', 'entityId', 'channel', 'schemeId', 'stageId'], 'entry')
  assert([entry.sceneId, entry.schemeId, entry.stageId].every(id), 'entry: missing stable identity')
  assert(
    ['trigger', 'auto', 'onEnter', 'onTeleport'].includes(entry.channel),
    'entry: invalid channel',
  )
  const entityChannel = entry.channel === 'trigger' || entry.channel === 'auto'
  assert(
    entityChannel ? id(entry.entityId) : entry.entityId === undefined,
    'entry: owner/channel mismatch',
  )
  return JSON.stringify([
    entry.sceneId,
    entry.entityId ?? null,
    entry.channel,
    entry.schemeId,
    entry.stageId,
  ])
}

/** Enumerate declared steps, including empty and never-activated steps; execution is not inferred. */
export function inventoryScenes(scenes) {
  const entries = new Map()
  const sceneIds = new Set()
  for (const scene of scenes) {
    assert(id(scene.id) && !sceneIds.has(scene.id), `duplicate/missing scene: ${scene.id}`)
    sceneIds.add(scene.id)
    // Conservative scene boundary includes other participants and callers in this scene.
    const sceneHash = fingerprint(scene)
    const add = (owner, schemeId, scheme, ownerLabel) => {
      assert(
        scheme.flow?.kind === 'stages' && Array.isArray(scheme.flow.stages),
        'expected canonical stage flow',
      )
      for (const stage of scheme.flow.stages) {
        const entry = { ...owner, schemeId, stageId: stage.id }
        const key = entryKey(entry)
        assert(!entries.has(key), `duplicate step: ${key}`)
        entries.set(key, {
          entry,
          label: [
            scene.label ?? scene.name ?? scene.id,
            ownerLabel,
            scheme.label ?? schemeId,
            stage.label ?? stage.id,
          ].join(' / '),
          sourceFingerprint: fingerprint({ sceneHash, entry }),
        })
      }
    }
    const entityIds = new Set()
    for (const entity of scene.entities) {
      assert(
        id(entity.id) && !entityIds.has(entity.id),
        `duplicate/missing entity: ${scene.id}/${entity.id}`,
      )
      entityIds.add(entity.id)
      for (const channel of ['trigger', 'auto'])
        for (const [schemeId, scheme] of Object.entries(entity.behaviors?.[channel] ?? {}))
          add(
            { sceneId: scene.id, entityId: entity.id, channel },
            schemeId,
            scheme,
            entity.label ?? entity.actor ?? entity.id,
          )
    }
    for (const channel of ['onEnter', 'onTeleport'])
      for (const [schemeId, scheme] of Object.entries(scene.hooks?.[channel]?.variants ?? {}))
        add({ sceneId: scene.id, channel }, schemeId, scheme, channel)
  }
  return entries
}

export function previewFingerprint(entry, preview, library) {
  keys(preview, ['stateId', 'selection'], 'preview')
  assert(preview.stateId === null || id(preview.stateId), 'preview: invalid stateId')
  assert(['default', 'manual'].includes(preview.selection), 'preview: invalid selection')
  const matchingStates = library.states.filter((s) => s.id === preview.stateId)
  assert(matchingStates.length <= 1, `duplicate preview state: ${preview.stateId}`)
  const state = preview.stateId === null ? null : matchingStates[0]
  if (preview.stateId !== null && (!state || state.sceneId !== entry.sceneId)) return null
  const bindings = library.bindings.filter((binding) => entryKey(binding.entry) === entryKey(entry))
  assert(bindings.length <= 1, `duplicate preview binding: ${entryKey(entry)}`)
  const boundStateId = bindings[0]?.stateId ?? null
  if (preview.selection === 'default' && boundStateId !== preview.stateId) return null
  // A manually selected alternate context does not claim the step's saved default binding.
  return fingerprint({
    state,
    selection: preview.selection,
    ...(preview.selection === 'default' ? { boundStateId } : {}),
  })
}

function reference(ref, where) {
  keys(ref, ['path', 'sha256', 'revision', 'selector'], where)
  assert(
    id(ref.path) &&
      !ref.path.startsWith('/') &&
      !ref.path.includes('\\') &&
      !ref.path.split('/').some((s) => s === '..' || s === '.' || s === ''),
    `${where}: path must stay within repository`,
  )
  assert(shaPattern.test(ref.sha256), `${where}: invalid sha256`)
  if (ref.revision !== undefined)
    assert(/^[a-f0-9]{40}$/.test(ref.revision), `${where}: require fixed Git revision`)
  if (ref.selector !== undefined) assert(id(ref.selector), `${where}: empty selector`)
}

/** Historical evidence is never rewritten to reflect a newer result. Git remains the recovery source. */
export function assertAppendOnly(previous, current) {
  assert(current.events.length >= previous.events.length, 'event history was shortened')
  previous.events.forEach((event, index) => {
    assert.equal(
      fingerprint(current.events[index]),
      fingerprint(event),
      `event history changed at ${index}`,
    )
  })
}

export function validateLedger(ledger) {
  keys(ledger, ['kind', 'version', 'project', 'scope', 'events'], 'ledger')
  assert.equal(ledger.kind, 'type-pal-script-progress')
  assert.equal(ledger.version, 1)
  assert.equal(ledger.project, 'pal')
  assert.equal(ledger.scope, 'scene-hooks-and-entity-behavior-steps')
  assert(Array.isArray(ledger.events), 'events must be an array')
  const ids = new Set()
  const previous = new Map()
  let previousAt = -Infinity
  for (const event of ledger.events) {
    keys(
      event,
      [
        'id',
        'at',
        'actor',
        'reviewer',
        'entry',
        'context',
        'axis',
        'from',
        'to',
        'sourceFingerprint',
        'dependencies',
        'evidence',
        'preview',
        'previewFingerprint',
        'note',
      ],
      'event',
    )
    assert(id(event.id) && !ids.has(event.id), `duplicate/missing event id: ${event.id}`)
    ids.add(event.id)
    assert(
      typeof event.at === 'string' &&
        /^\d{4}-\d{2}-\d{2}T/.test(event.at) &&
        Number.isFinite(Date.parse(event.at)),
      'event: invalid timestamp',
    )
    assert(Date.parse(event.at) >= previousAt, 'event history is not chronological')
    previousAt = Date.parse(event.at)
    assert(id(event.actor) && id(event.note), 'event: actor and note required')
    keys(event.context, ['id', 'description'], 'context')
    assert(
      id(event.context.id) && id(event.context.description),
      'event: explicit invocation context required',
    )
    const key = JSON.stringify([entryKey(event.entry), event.context.id, event.axis])
    assert(
      Object.hasOwn(AXES, event.axis) && AXES[event.axis].includes(event.to),
      'event: invalid axis/status',
    )
    const last = previous.get(key) ?? AXES[event.axis][0]
    assert.equal(event.from, last, `event ${event.id}: previous status mismatch`)
    previous.set(key, event.to)
    assert(shaPattern.test(event.sourceFingerprint), 'event: source fingerprint required')
    assert(
      Array.isArray(event.dependencies) && event.dependencies.length > 0,
      'event: declare relevant dependencies',
    )
    const paths = new Set()
    for (const dependency of event.dependencies) {
      reference(dependency, 'dependency')
      assert(dependency.revision === undefined, 'dependencies must compare current files')
      assert(!paths.has(dependency.path), 'duplicate dependency')
      paths.add(dependency.path)
    }
    assert(Array.isArray(event.evidence) && event.evidence.length > 0, 'event: evidence required')
    for (const ref of event.evidence) reference(ref, 'evidence')
    if (completed[event.axis].includes(event.to))
      assert(
        id(event.reviewer) && event.reviewer !== event.actor,
        'completed claim needs independent reviewer',
      )
    else if (event.reviewer !== undefined) assert(id(event.reviewer), 'event: invalid reviewer')
    if (event.axis === 'initialState' && ['configured', 'saved', 'verified'].includes(event.to)) {
      assert(
        event.preview && shaPattern.test(event.previewFingerprint),
        'initial state needs saved selection fingerprint',
      )
    } else {
      assert(
        event.preview === undefined && event.previewFingerprint === undefined,
        'preview belongs to configured/saved/verified initial-state events',
      )
    }
  }
}

/** IO checks supply actual file fingerprints; no caller-provided passed booleans grant credit. */
export async function reportProgress({ scenes, library, ledger, readReference }) {
  validateLedger(ledger)
  const inventory = inventoryScenes(scenes)
  const groups = new Map()
  const orphaned = []
  for (const event of ledger.events) {
    const key = entryKey(event.entry)
    if (!inventory.has(key)) {
      orphaned.push({
        eventId: event.id,
        entry: event.entry,
        reason: 'entry-not-in-current-canonical',
      })
      continue
    }
    if (!groups.has(key)) groups.set(key, new Map())
    const contexts = groups.get(key)
    if (!contexts.has(event.context.id))
      contexts.set(event.context.id, { context: event.context, axes: {}, events: [] })
    const context = contexts.get(event.context.id)
    context.axes[event.axis] = event
    context.events.push(event.id)
  }
  const cache = new Map()
  const check = async (ref) => {
    const key = JSON.stringify([ref.revision ?? null, ref.path])
    if (!cache.has(key)) cache.set(key, Promise.resolve(readReference(ref)))
    const actual = await cache.get(key)
    return actual === null ? 'missing' : byteHash(actual) === ref.sha256 ? null : 'changed'
  }
  const rows = []
  for (const [key, item] of inventory) {
    const contexts =
      groups.get(key) ?? new Map([['unrecorded', { context: null, axes: {}, events: [] }]])
    for (const context of contexts.values()) {
      const statuses = {}
      for (const [axis, values] of Object.entries(AXES)) {
        const event = context.axes[axis]
        const issues = []
        if (event) {
          if (event.sourceFingerprint !== item.sourceFingerprint) issues.push('source-changed')
          for (const [kind, refs] of [
            ['dependency', event.dependencies],
            ['evidence', event.evidence],
          ])
            for (const ref of refs) {
              const problem = await check(ref)
              if (problem) issues.push(`${kind}-${problem}:${ref.path}`)
            }
          if (
            event.preview &&
            previewFingerprint(item.entry, event.preview, library) !== event.previewFingerprint
          )
            issues.push('preview-selection-changed-or-missing')
        }
        statuses[axis] = {
          recorded: event?.to ?? values[0],
          current: issues.length ? 'needs-review' : (event?.to ?? values[0]),
          eventId: event?.id ?? null,
          issues,
        }
      }
      rows.push({ ...item, context: context.context, statuses, events: context.events })
    }
  }
  return {
    scope: ledger.scope,
    totalEntries: inventory.size,
    eventCount: ledger.events.length,
    orphaned,
    rows,
  }
}

export function filterProgress(report, { scene, entity, pending = false } = {}) {
  return report.rows.filter(
    (row) =>
      (!scene || row.entry.sceneId === scene) &&
      (!entity || row.entry.entityId === entity) &&
      (!pending ||
        Object.entries(row.statuses).some(
          ([axis, status]) => !completed[axis].includes(status.current),
        )),
  )
}
