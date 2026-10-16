import { isDeepStrictEqual } from 'node:util'
import { terminalRepoPath } from './terminal-git.mjs'
import { terminalFailure } from './terminal-json.mjs'

// A checks declared shapes and local associations, never approval, currentness or completeness.
export const terminalFixedBaseline = Object.freeze({
  path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json',
  revision: '33cc2df50c7279d2750ddad4fcf6c373b7b2bda3',
  gitObject: '00da11bb594126105abbb5ea596c7272ed8e5542',
  sha256: '1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5',
  denominator: 1838,
})

const fail = (path, message) => {
  throw terminalFailure('schema', `${path}: ${message}`)
}
const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'object required')
}
const string = (value, path) => {
  if (typeof value !== 'string' || !value.length) fail(path, 'nonempty string required')
}
const literal = (expected) => (value, path) => {
  if (value !== expected) fail(path, `expected ${JSON.stringify(expected)}`)
}
const choice =
  (...values) =>
  (value, path) => {
    if (!values.includes(value)) fail(path, `expected one of ${values.join(', ')}`)
  }
const pattern = (regex) => (value, path) => {
  if (typeof value !== 'string' || !regex.test(value)) fail(path, 'invalid literal syntax')
}
const sha = pattern(/^[a-f\d]{64}$/)
const oid = pattern(/^[a-f\d]{40}$/)
const id = (value, path) => {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 64 ||
    [...value].some((character) => character.charCodeAt(0) > 0x7f)
  )
    fail(path, '1-64 ASCII bytes required; actual approval is not checked by A')
}
const repoPath = (value, path) => {
  if (!terminalRepoPath(value)) fail(path, 'repository-relative scalar POSIX path required')
}
const integer = (minimum) => (value, path) => {
  if (!Number.isSafeInteger(value) || value < minimum)
    fail(path, `safe integer >=${minimum} required`)
}
const array =
  (item, minimum = 0) =>
  (value, path) => {
    if (!Array.isArray(value) || value.length < minimum)
      fail(path, `array length >=${minimum} required`)
    if (item)
      for (let index = 0; index < value.length; index++) item(value[index], `${path}[${index}]`)
  }
const nullable = (validate) => (value, path) => {
  if (value !== null) validate(value, path)
}
const shape = (fields) => (value, path) => {
  object(value, path)
  if (
    Object.keys(value).length !== Object.keys(fields).length ||
    Object.keys(fields).some((key) => !Object.hasOwn(value, key))
  )
    fail(path, `exact keys required: ${Object.keys(fields).join(', ')}`)
  for (const [key, validate] of Object.entries(fields)) validate(value[key], `${path}.${key}`)
}
const map =
  (keyRule, member, minimum = 0) =>
  (value, path) => {
    object(value, path)
    if (Object.keys(value).length < minimum) fail(path, `map size >=${minimum} required`)
    for (const key of Object.keys(value)) {
      keyRule(key, `${path} key`)
      member(value[key], `${path}[${JSON.stringify(key)}]`, key)
    }
  }
const named = (name) => (value, path) => validateTerminalNamed(name, value, path)
const pointer = array((value, path) => {
  if (typeof value !== 'string') fail(path, 'literal own-key string required')
}, 1)
const ranges = array((value, path) => {
  if (!Array.isArray(value) || value.length !== 2) fail(path, 'closed [start,end] required')
  integer(1)(value[0], path)
  integer(value[0])(value[1], path)
}, 1)
const union = (variants) => (value, path) => {
  object(value, path)
  if (!Object.hasOwn(value, 'kind') || !Object.hasOwn(variants, value.kind))
    fail(path, 'unknown or absent union kind')
  variants[value.kind](value, path)
}
const gitFields = { revision: oid, path: repoPath, gitObject: oid, sha256: sha }
const memberPath = (name) => (value, path, key) => {
  named(name)(value, path)
  if (value.path !== key) fail(path, 'member key must equal subject path')
}
const claimKind = (kind) => (value, path) => {
  named('EvidenceUse')(value, path)
  if (value.claim.kind !== kind) fail(path, `claim must be ${kind}`)
}

const schemas = {
  RepoPath: repoPath,
  ApprovalId: id,
  RuleId: id,
  Pointer: pointer,
  DRef: shape({ path: repoPath, pointer }),
  Snapshot: shape({
    commit: oid,
    docsTree: oid,
    inventoryPolicy: literal('git-ls-tree-r-z-docs-v1'),
    inventorySha256: sha,
    wireFormat: literal('dref-map-v2'),
  }),
  FixedBaseline: shape(
    Object.fromEntries(
      Object.entries(terminalFixedBaseline).map(([key, value]) => [key, literal(value)]),
    ),
  ),
  CodeMember: shape({ path: repoPath, approvalId: id }),
  Documents: shape({
    byPath: map(repoPath, id),
    terminal: map(repoPath, memberPath('EnhancedCurrentRecord')),
  }),
  ApprovedSource: shape({ ...gitFields, approval: claimKind('reading') }),
  ReadScope: shape({
    effectiveCoverage: string,
    method: string,
    source: array(named('ReadSpan'), 1),
    after: array(named('ReadSpan'), 1),
    reuse: array(named('Reuse')),
    limits: array(),
  }),
  ReadSpan: shape({ ...gitFields, lineRanges: ranges, coverage: choice('full', 'delta') }),
  Reuse: shape({
    approval: claimKind('reading'),
    path: repoPath,
    gitObject: oid,
    sha256: sha,
    lineRanges: ranges,
    basis: string,
  }),
  GitRef: shape(gitFields),
  CaptureRef: shape({
    captureSha256: sha,
    sourceKind: literal('baseline-capture'),
    gitObject: nullable(oid),
    unresolvedOriginReason: string,
  }),
  Lineage: shape({
    from: (value, path) => {
      object(value, path)
      named(Object.hasOwn(value, 'sourceKind') ? 'CaptureRef' : 'GitRef')(value, path)
    },
    to: named('GitRef'),
    basis: string,
    approval: claimKind('lineage'),
  }),
  Disposition: shape({
    index: integer(0),
    kind: choice('historical-boundary', 'external-product-task', 'blocks-doc'),
    reason: string,
    approval: claimKind('disposition'),
  }),
  Approval: shape({
    mode: literal('authorized-non-author-workflow'),
    identityAssurance: literal('workflow-recorded; not cryptographic authentication'),
    eventIndex: map(id, named('EventLocator')),
    records: map(id, named('Event')),
  }),
  Basis: shape({
    kind: literal('agent-review-delivery'),
    sender: string,
    task: string,
    deliveredCandidate: oid,
    recordedText: string,
    receipt: nullable((value, path) => {
      object(value, path)
      named(Object.hasOwn(value, 'kind') ? 'ReceivedArtifact' : 'GitRef')(value, path)
    }),
  }),
  ReceivedArtifact: shape({
    kind: literal('received-artifact'),
    pathHint: string,
    sha256: sha,
    receivedViaMessage: string,
  }),
  Artifacts: shape({ byPath: map(repoPath, id), ruleBook: named('DRef') }),
  ArtifactRule: shape({
    kind: string,
    custodian: string,
    producer: string,
    association: string,
    retention: string,
    stopLine: string,
    approval: claimKind('artifact-rule'),
    members: shape({ count: integer(1), digest: sha }),
  }),
  GitMemberRef: shape({
    revision: oid,
    path: repoPath,
    format: choice('json', 'terminal-json-gzip-v1'),
    pointer,
  }),
  EvidenceUse: shape({ approvalId: id, subjectPath: repoPath, claim: named('ClaimSelector') }),
  GitObjectRef: shape({ ...gitFields, mode: choice('100644', '100755') }),
  CodeSubject: shape({
    path: repoPath,
    after: named('GitObjectRef'),
    readScope: named('ReadScope'),
  }),
  DocumentSubject: shape({
    path: repoPath,
    scopeClass: choice('accepted-document', 'reading-evidence'),
    source: named('GitRef'),
    after: named('GitObjectRef'),
    binding: named('ResolvedBinding'),
    record: named('RecordRef'),
    readScope: named('ReadScope'),
    sourceLineage: array(named('Lineage')),
    unresolvedDisposition: array(named('Disposition')),
  }),
  PolicyRef: shape({
    revision: oid,
    registryPath: repoPath,
    routingPath: repoPath,
    templateRegistryPath: repoPath,
  }),
  OverlayBinding: shape({
    docType: string,
    templateId: string,
    templateVersion: string,
    templatePath: repoPath,
    format: string,
    contractSha256: sha,
    templateSha256: sha,
  }),
}

schemas.EventLocator = union({
  'docs-event': shape({ kind: literal('docs-event'), ref: named('DRef') }),
  'git-event': shape({ kind: literal('git-event'), ref: named('GitMemberRef') }),
  'terminal-event': shape({ kind: literal('terminal-event'), id }),
})
schemas.RecordRef = union({
  'snapshot-record': shape({ kind: literal('snapshot-record'), ref: named('DRef') }),
  'git-record': shape({
    kind: literal('git-record'),
    ref: (value, path) => {
      named('GitMemberRef')(value, path)
      if (value.format !== 'json') fail(path, 'git-record format must be json')
    },
  }),
  'terminal-current': shape({ kind: literal('terminal-current'), path: repoPath }),
  // Original historical native object: do not invent current extensions or Owner/status.
  'terminal-history': shape({ kind: literal('terminal-history'), record: object }),
})
schemas.ClaimSelector = union({
  reading: shape({ kind: literal('reading'), side: choice('source', 'after') }),
  lineage: shape({ kind: literal('lineage'), index: integer(0) }),
  disposition: shape({ kind: literal('disposition'), index: integer(0) }),
  'artifact-rule': shape({ kind: literal('artifact-rule'), pointer }),
})
schemas.ResolvedBinding = union({
  registered: shape({
    kind: literal('registered'),
    policy: named('PolicyRef'),
    docType: string,
    templateId: string,
    templateVersion: string,
    templatePath: repoPath,
    format: string,
    variant: nullable(string),
    contractSha256: sha,
    templateSha256: sha,
    overlay: nullable(named('OverlayBinding')),
  }),
  'unregistered-reading': shape({
    kind: literal('unregistered-reading'),
    reason: string,
    policyRevision: oid,
    policySourcePaths: array(repoPath, 1),
  }),
})
schemas.ExplicitSubjectSet = (value, path) => {
  shape({
    kind: choice('document-subjects', 'code-subjects'),
    count: integer(1),
    digest: sha,
    members: (members, memberLocation) =>
      map(
        repoPath,
        memberPath(value.kind === 'document-subjects' ? 'DocumentSubject' : 'CodeSubject'),
        1,
      )(members, memberLocation),
  })(value, path)
  if (value.count !== Object.keys(value.members).length) fail(path, 'subject count mismatch')
}
schemas.Event = (value, path) => {
  shape({
    kind: choice('document-content', 'governance-tool-code'),
    authorIdentities: array(string, 1),
    reviewerIdentities: array(string, 1),
    subjects: named('ExplicitSubjectSet'),
    basis: named('Basis'),
    verdict: literal('accept'),
  })(value, path)
  const expected = value.kind === 'document-content' ? 'document-subjects' : 'code-subjects'
  if (value.subjects.kind !== expected) fail(path, 'event/subject kind mismatch')
  const authors = new Set(value.authorIdentities)
  const reviewers = new Set(value.reviewerIdentities)
  if (
    authors.size !== value.authorIdentities.length ||
    reviewers.size !== value.reviewerIdentities.length ||
    [...reviewers].some((identity) => authors.has(identity))
  )
    fail(path, 'identity sets must be unique and disjoint; authenticity is not checked by A')
}

const nativeKeys = [
  'path',
  'contentReviewStatus',
  'docType',
  'templateId',
  'templateCompliance',
  'coreConclusion',
  'truthAnchors',
  'unresolved',
  'nextStep',
  'owner',
  'provenance',
  'publicCallers',
  'legalInputs',
  'businessOracle',
  'dedupe',
  'revision',
  'evidence',
  'history',
  'supersedes',
  'stopLine',
  'sourceSha256',
  'afterSha256',
  'reviewedLines',
  'reviewDepth',
]
schemas.EnhancedCurrentRecord = (value, path) => {
  object(value, path)
  for (const key of nativeKeys)
    if (!Object.hasOwn(value, key) || value[key] === null || value[key] === '')
      fail(path, `native field required: ${key}`)
  for (const key of [
    'coreConclusion',
    'nextStep',
    'owner',
    'docType',
    'templateId',
    'reviewedLines',
  ])
    string(value[key], `${path}.${key}`)
  repoPath(value.path, `${path}.path`)
  choice(
    'content-reviewed',
    'partial-review-unknown',
    'unread',
    'blocked',
  )(value.contentReviewStatus, path)
  choice('deep-semantic', 'structured-content', 'partial-semantic')(value.reviewDepth, path)
  choice(
    'template-compliant',
    'governed-legacy',
    'legacy-canonical',
    'needs-migration',
  )(value.templateCompliance, path)
  sha(value.sourceSha256, path)
  sha(value.afterSha256, path)
  for (const key of ['truthAnchors', 'provenance', 'publicCallers', 'legalInputs', 'history'])
    array(undefined, 1)(value[key], `${path}.${key}`)
  for (const key of ['unresolved', 'supersedes']) array()(value[key], `${path}.${key}`)
  for (const key of ['businessOracle', 'dedupe', 'revision', 'evidence'])
    object(value[key], `${path}.${key}`)
  if (
    !value.businessOracle.type ||
    !Array.isArray(value.businessOracle.assertions) ||
    !value.businessOracle.assertions.length
  )
    fail(path, 'native businessOracle incomplete')
  if (!value.dedupe.result || !Array.isArray(value.dedupe.against))
    fail(path, 'native dedupe incomplete')
  if (!value.revision.currentSha || !Array.isArray(value.revision.history))
    fail(path, 'native revision incomplete')
  if (!value.evidence.kind || !value.evidence.path) fail(path, 'native evidence incomplete')
  if (typeof value.stopLine !== 'string' || !value.stopLine.trim())
    fail(path, 'native stopLine empty')
  const extensions = {
    source: named('ApprovedSource'),
    readScope: named('ReadScope'),
    sourceLineage: array(named('Lineage')),
    unresolvedDisposition: array(named('Disposition')),
    approvalId: id,
    approvalEvent: named('EventLocator'),
  }
  for (const [key, validate] of Object.entries(extensions)) {
    if (!Object.hasOwn(value, key)) fail(path, `extension field missing: ${key}`)
    validate(value[key], `${path}.${key}`)
  }
  if (value.source.sha256 !== value.sourceSha256) fail(path, 'native/source SHA disagreement')
  const indices = value.unresolvedDisposition.map((entry) => entry.index)
  if (
    new Set(indices).size !== indices.length ||
    indices.some((index) => index >= value.unresolved.length)
  )
    fail(path, 'local unresolved disposition index invalid')
  // All native24, six extensions, and every extra original field remain untouched.
}

export function validateTerminalNamed(name, value, path = name) {
  if (!Object.hasOwn(schemas, name)) fail(path, `unknown named schema: ${name}`)
  schemas[name](value, path)
  return value
}

export function validateTerminalStructure(value) {
  shape({
    schemaVersion: literal(2),
    kind: literal('terminal-docs-review'),
    snapshot: named('Snapshot'),
    baseline: named('FixedBaseline'),
    producer: named('CodeMember'),
    owner: string,
    approval: named('Approval'),
    verifierBundle: map(repoPath, id, 1),
    documents: named('Documents'),
    artifacts: named('Artifacts'),
    history: array(undefined, 1),
    retention: literal('retain-with-approved-git-history'),
    runtimeExecutionPerformed: literal(false),
  })(value, 'T')
  const { eventIndex, records } = value.approval
  const ownId = (key) => {
    if (!Object.hasOwn(eventIndex, key))
      fail('T.approval', 'typed reference missing from own eventIndex')
  }
  const readingIds = (scope) => {
    for (const reuse of scope.reuse) ownId(reuse.approval.approvalId)
  }
  const subjectIds = (subject) => {
    readingIds(subject.readScope)
    for (const lineage of subject.sourceLineage ?? []) ownId(lineage.approval.approvalId)
    for (const disposition of subject.unresolvedDisposition ?? [])
      ownId(disposition.approval.approvalId)
  }
  ownId(value.producer.approvalId)
  for (const key of Object.values(value.verifierBundle)) ownId(key)
  for (const key of Object.values(value.documents.byPath)) ownId(key)
  for (const event of Object.values(records))
    for (const subject of Object.values(event.subjects.members)) subjectIds(subject)
  for (const record of Object.values(value.documents.terminal)) {
    ownId(record.source.approval.approvalId)
    subjectIds(record)
  }
  for (const key of Object.keys(eventIndex)) {
    const locator = eventIndex[key]
    if (locator.kind === 'terminal-event' && (locator.id !== key || !Object.hasOwn(records, key)))
      fail('T.approval', 'terminal event id/own record mismatch')
    if (locator.kind !== 'terminal-event' && locator.ref.pointer.at(-1) !== key)
      fail('T.approval', 'Event pointer must end in its exact ApprovalId key')
  }
  for (const key of Object.keys(records))
    if (!Object.hasOwn(eventIndex, key) || eventIndex[key].kind !== 'terminal-event')
      fail('T.approval', 'inline record not selected by eventIndex')
  const localSubject = (key, path, kind) => {
    const locator = eventIndex[key]
    if (locator.kind !== 'terminal-event') return
    const event = records[key]
    if (event.kind !== kind || !Object.hasOwn(event.subjects.members, path))
      fail('T.approval', 'inline event kind/own subject path mismatch')
  }
  localSubject(value.producer.approvalId, value.producer.path, 'governance-tool-code')
  for (const [path, key] of Object.entries(value.verifierBundle))
    localSubject(key, path, 'governance-tool-code')
  for (const [path, key] of Object.entries(value.documents.byPath))
    localSubject(key, path, 'document-content')
  for (const record of Object.values(value.documents.terminal))
    if (
      !Object.hasOwn(value.documents.byPath, record.path) ||
      value.documents.byPath[record.path] !== record.approvalId ||
      !Object.hasOwn(eventIndex, record.approvalId) ||
      !isDeepStrictEqual(record.approvalEvent, eventIndex[record.approvalId])
    )
      fail('T.documents', 'current record local path/id/locator mismatch')
  return value
}
