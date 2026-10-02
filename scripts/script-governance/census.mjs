import { callerContexts, digest, indexSource, sourceSegment } from './source.mjs'

export function visitCommands(value, visit, path = '') {
  if (!value || typeof value !== 'object') return
  if (!Array.isArray(value) && typeof value.kind === 'string') visit(value, path)
  for (const [key, child] of Object.entries(value)) visitCommands(child, visit, `${path}/${key}`)
}

function behaviorNodes(behavior) {
  const flow = behavior.flow
  if (flow?.kind === 'stages') return flow.stages ?? []
  if (flow?.kind === 'stateMachine')
    return Object.entries(flow.machine?.states ?? {}).map(([id, state]) => ({ id, ...state }))
  return []
}

function initialNode(behavior) {
  const flow = behavior.flow
  return behaviorNodes(behavior).find(
    (node) => node.id === (flow.kind === 'stages' ? flow.initial : flow.machine?.initial),
  )
}

export function canonicalTokens(body, owner) {
  const tokens = []
  visitCommands(body, (command) => {
    if (command.kind === 'dialog') {
      for (const row of command.cue?.rows ?? []) {
        const match = /^dlg\.(\d+)$/.exec(row.text)
        if (match) tokens.push(`dialog:${match[1]}`)
      }
    } else if (command.kind === 'giveItem')
      tokens.push(`item:${command.itemId}:${command.count ?? 1}`)
    else if (command.kind === 'setEntityFrame' && command.target?.entity === `e${owner}`)
      tokens.push(`frame:${owner}:${command.frame}`)
    else if (command.kind === 'loadScene') tokens.push(`scene:${command.sceneId}`)
  })
  return tokens
}

function canonicalIndex(scenes) {
  const entities = new Map()
  const selectors = []
  for (const scene of scenes) {
    for (const entity of scene.entities ?? []) {
      const key = `${scene.id}/${entity.id}`
      if (entities.has(key)) throw new Error(`Duplicate canonical identity: ${key}`)
      entities.set(key, entity)
    }
    visitCommands(scene, (command, path) => {
      if (command.kind === 'selectEntityBehavior')
        selectors.push({
          scene: scene.id,
          path,
          target: command.target,
          channel: command.channel,
          selection: command.selection,
        })
    })
  }
  return { entities, selectors }
}

const sameTokens = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index])

function classifyBinding({ edge, owner, source, canonical, competingTargets, protectedScenes }) {
  const identity = source.entities.get(owner)
  if (!identity) return { owner, status: 'unknown', reason: 'source-identity-not-found' }
  const entity = canonical.entities.get(`${identity.scene}/${identity.entity}`)
  if (!entity)
    return { owner, ...identity, status: 'unknown', reason: 'canonical-identity-not-found' }
  const first = sourceSegment(source.commands, edge.target, owner)
  const base = { owner, ...identity, source: first }
  if (protectedScenes.has(identity.scene)) {
    return {
      ...base,
      status: 'author-protected',
      reason: '001-005-author-content-no-automatic-verdict',
    }
  }
  const behaviors = Object.entries(entity.behaviors?.[edge.channel] ?? {})
  if (!first.tokens.length || first.terminal.kind === 'nonlinear' || first.unknownOpcodes.length) {
    return {
      ...base,
      status: 'unknown',
      reason: !first.tokens.length ? 'no-distinctive-body-evidence' : 'nonlinear-or-unknown-source',
    }
  }
  const matches = behaviors.filter(([, behavior]) =>
    sameTokens(first.tokens, canonicalTokens(initialNode(behavior)?.body, owner)),
  )
  const competitors = [...competingTargets].filter(
    (target) =>
      target !== edge.target &&
      sameTokens(first.tokens, sourceSegment(source.commands, target, owner).tokens),
  )
  if (matches.length !== 1 || competitors.length) {
    return {
      ...base,
      status: matches.length > 1 || competitors.length ? 'multicontext' : 'unknown',
      reason: competitors.length
        ? 'source-target-body-collision'
        : matches.length > 1
          ? 'canonical-body-collision'
          : 'author-body-different-or-unmapped',
      candidates: matches.map(([id]) => id),
      competingSourceEntries: competitors,
    }
  }
  const [behaviorId, behavior] = matches[0]
  const callers = canonical.selectors.filter(
    (selector) =>
      selector.target?.scene === identity.scene &&
      selector.target?.entity === identity.entity &&
      selector.channel === edge.channel &&
      selector.selection?.kind === 'use' &&
      selector.selection.value === behaviorId,
  )
  const allTokens = canonicalTokens(behavior.flow, owner)
  const result = {
    ...base,
    behavior: behaviorId,
    behaviorHash: digest(behavior),
    mapping: 'unique-owner-channel-initial-body-and-unique-source-target',
    canonicalCallers: callers.map(({ scene, path }) => ({ scene, path })),
    status: 'mapped',
    reason: 'continuation-not-reviewed',
  }
  const successor = first.terminal.successor
  if (successor === undefined || successor === edge.target)
    return { ...result, reason: 'no-different-source-successor' }
  const next = sourceSegment(source.commands, successor, owner)
  result.successor = next
  const initial = initialNode(behavior)
  const sourceHandoff = first.addresses.some((address) => {
    const command = source.commands[address]
    return (
      command.op === 'raw' &&
      command.opcode === edge.opcode &&
      [owner + 1, 65535].includes(command.operands[0]) &&
      command.operands[1] === successor
    )
  })
  const directHandoffs = (initial?.body ?? []).filter(
    (command) =>
      command.kind === 'selectEntityBehavior' &&
      command.target?.scene === identity.scene &&
      command.target?.entity === identity.entity &&
      command.channel === edge.channel &&
      command.selection?.kind === 'use' &&
      command.selection.value !== behaviorId,
  )
  if (
    sourceHandoff &&
    directHandoffs.length === 1 &&
    next.tokens.length &&
    next.terminal.kind !== 'nonlinear'
  ) {
    const targetBehavior = entity.behaviors?.[edge.channel]?.[directHandoffs[0].selection.value]
    if (
      targetBehavior &&
      sameTokens(next.tokens, canonicalTokens(initialNode(targetBehavior)?.body, owner))
    ) {
      return {
        ...result,
        reviewType: 'selection-handoff',
        reason: 'explicit-successor-handoff-content-present-cursor-unverified',
        handoffBehavior: directHandoffs[0].selection.value,
        handoffBehaviorHash: digest(targetBehavior),
      }
    }
  }
  let rewritesOwnBinding = false
  visitCommands(initial?.body, (command) => {
    if (
      command.kind === 'selectEntityBehavior' &&
      command.target?.scene === identity.scene &&
      command.target?.entity === identity.entity &&
      command.channel === edge.channel
    )
      rewritesOwnBinding = true
  })
  if (
    first.tokens.some((token) => token.startsWith('item:')) &&
    behavior.flow.kind === 'stages' &&
    behavior.flow.stages.length === 1 &&
    initial?.next === undefined &&
    !rewritesOwnBinding
  ) {
    result.risk = 'repeat-reward-candidate'
    result.reason = 'source-advances-but-current-single-stage-repeats-reward'
  }
  const novel = next.tokens.filter((token) => !first.tokens.includes(token))
  result.missingSuccessorTokens = novel.filter((token) => !allTokens.includes(token))
  if (result.missingSuccessorTokens.length) {
    result.risk = first.tokens.some((token) => token.startsWith('item:'))
      ? 'repeat-reward-and-missing-successor'
      : 'missing-successor-candidate'
    result.reason = 'successor-distinctive-content-absent-from-installed-behavior'
  } else if (novel.length) {
    result.reason = 'successor-content-present-cursor-not-proven'
  }
  // Presence anywhere is never "already-fixed". Those dispositions require reviewed runtime
  // evidence and exact content hashes in a separate ledger; this scanner cannot assign them.
  return result
}

function reachableRoots(source, contexts) {
  const reachable = new Set(source.roots.map((root) => root.id))
  const dependencies = []
  for (const edge of source.edges) {
    if (edge.effect === 'install' && edge.operand !== 65535)
      dependencies.push({ id: `install@${edge.address}`, address: edge.address })
  }
  source.commands.forEach((command, address) => {
    if (command.op === 'raw' && command.opcode === 0x6d) {
      for (const target of command.operands.slice(1))
        if (target > 0) dependencies.push({ id: `scene-hook@${address}:${target}`, address })
    }
  })
  // Contexts are retained for every physical opcode, not only installations, so dynamic hooks
  // can inherit reachability without pretending they have a world-entity self.
  let changed = true
  while (changed) {
    changed = false
    for (const { id, address } of dependencies) {
      if (
        !reachable.has(id) &&
        (contexts.get(address) ?? []).some((caller) => reachable.has(caller.root))
      ) {
        reachable.add(id)
        changed = true
      }
    }
  }
  return reachable
}

export function buildCensus({
  events,
  sourceScenes,
  canonicalScenes,
  externalTables = [],
  protectedSceneIds = ['s000', 's001', 's002', 's003', 's004', 's005'],
}) {
  const source = indexSource(events, sourceScenes, externalTables)
  const contexts = callerContexts(source)
  const reachable = reachableRoots(source, contexts)
  const canonical = canonicalIndex(canonicalScenes)
  const protectedScenes = new Set(protectedSceneIds)
  const ownerEntries = new Map()
  const resolved = source.edges.map((edge) => {
    const callers = contexts.get(edge.address) ?? []
    const owners =
      edge.operand === 0
        ? []
        : edge.operand === 65535
          ? [...new Set(callers.flatMap((caller) => (caller.owner === null ? [] : [caller.owner])))]
          : source.entities.has(edge.operand - 1)
            ? [edge.operand - 1]
            : []
    if (edge.effect === 'install') {
      for (const owner of owners) {
        const key = `${owner}:${edge.channel}`
        if (!ownerEntries.has(key)) ownerEntries.set(key, new Set())
        ownerEntries.get(key).add(edge.target)
      }
    }
    return {
      ...edge,
      callers,
      owners,
      unknownSelfContext:
        edge.operand === 65535 &&
        (callers.length === 0 || callers.some((caller) => caller.owner === null)),
      rootReachability: callers.some((caller) => !/^(install@|scene-hook@)/.test(caller.root))
        ? 'structurally-reached-from-static-root'
        : callers.some((caller) => reachable.has(caller.root))
          ? 'structurally-reached-via-dynamic-install'
          : callers.length
            ? 'unproven-dynamic-root'
            : 'not-observed-in-modeled-roots',
    }
  })
  const edges = resolved.map((edge) => {
    if (edge.effect !== 'install') return { ...edge, status: edge.effect, bindings: [] }
    const bindings = edge.owners.map((owner) =>
      classifyBinding({
        edge,
        owner,
        source,
        canonical,
        competingTargets: ownerEntries.get(`${owner}:${edge.channel}`) ?? new Set(),
        protectedScenes,
      }),
    )
    const status =
      edge.unknownSelfContext || !bindings.length
        ? 'unknown'
        : bindings.length > 1
          ? 'multicontext'
          : bindings[0].status
    return { ...edge, status, bindings }
  })
  const count = (key) =>
    Object.fromEntries(
      [...new Set(edges.map((edge) => edge[key]))]
        .sort()
        .map((value) => [value, edges.filter((edge) => edge[key] === value).length]),
    )
  const candidates = edges.flatMap((edge) =>
    edge.bindings
      .filter((binding) => binding.risk)
      .map((binding) => ({
        address: edge.address,
        target: edge.target,
        channel: edge.channel,
        edgeStatus: edge.status,
        ...binding,
      })),
  )
  candidates.sort(
    (a, b) =>
      Number(b.risk.startsWith('repeat')) - Number(a.risk.startsWith('repeat')) ||
      a.address - b.address,
  )
  return {
    reportVersion: 1,
    scope:
      'Read-only full raw 0x24/0x25 instruction-edge census; fingerprints and structural reachability are not defect or gameplay proofs.',
    inputHashes: {
      events: digest(events),
      sourceScenes: digest(sourceScenes),
      canonicalScenes: digest(canonicalScenes),
      externalTables: digest(externalTables),
    },
    totals: {
      sourceCommands: source.commands.length,
      sourceScenes: sourceScenes.length,
      sourceEntities: source.entities.size,
      staticRoots: source.roots.length,
      canonicalScenes: canonicalScenes.length,
      rawEdges: edges.length,
      byChannel: count('channel'),
      byEffect: count('effect'),
      byStatus: count('status'),
      byReachability: count('rootReachability'),
      selfEdges: edges.filter((edge) => edge.operand === 65535).length,
      uniqueNonzeroBindings: new Set(
        edges
          .filter((edge) => edge.effect === 'install')
          .map((edge) => `${edge.channel}:${edge.operand}:${edge.target}`),
      ).size,
      riskCandidates: candidates.length,
      handoffReviewCases: edges
        .flatMap((edge) => edge.bindings)
        .filter((binding) => binding.reviewType === 'selection-handoff').length,
      provenMissing: 0,
      alreadyFixed: 0,
    },
    topRiskCandidates: candidates.slice(0, 10),
    edges,
  }
}
