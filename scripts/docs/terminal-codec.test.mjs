import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateRawSync, gunzipSync } from 'node:zlib'
import { biomeCli, runLintZero } from '../quality/lint-zero.mjs'
import { renderTaskIndex } from './check.mjs'
import { decodeTerminalArchive, encodeTerminalArchive, terminalCrc32 } from './terminal-codec.mjs'
import {
  terminalFixedBaseline,
  validateTerminalNamed,
  validateTerminalStructure,
} from './terminal-contract.mjs'
import {
  assertTerminalCommit,
  readTerminalGitBlob,
  terminalGitMetadataBytes,
  terminalIndexEntries,
  terminalSnapshotMetadata,
} from './terminal-git.mjs'
import { canonicalTerminalJson, parseTerminalJson, terminalLimits } from './terminal-json.mjs'
import {
  inspectTerminalNamespace,
  readTerminalPhysicalFile,
  terminalNamespace,
} from './terminal-namespace.mjs'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const zero40 = '0'.repeat(40)
const zero64 = '0'.repeat(64)
const failure = (code) => (error) => error.code === `TERMINAL_${code}`
const git = (root, args, input) =>
  execFileSync('git', ['-C', root, ...args], {
    input,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
  })
const gitText = (root, args, input) => git(root, args, input).toString('utf8').trimEnd()
function put(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), value)
}
function temporary(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'type-pal-terminal-a8-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return directory
}
function commit(root) {
  git(root, ['add', '.'])
  git(root, [
    '-c',
    'user.name=A8 owned fixture',
    '-c',
    'user.email=a8@example.invalid',
    'commit',
    '--no-gpg-sign',
    '-qm',
    'UNAPPROVED format fixture',
  ])
  return gitText(root, ['rev-parse', 'HEAD'])
}
function gitFixture(t) {
  const root = temporary(t)
  git(root, ['init', '-q'])
  // Borrow the real immutable33cc objects, without a fake baseline or an approval profile.
  const common = gitText(repository, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  put(root, '.git/objects/info/alternates', `${join(common, 'objects')}\n`)
  put(root, '.gitattributes', readFileSync(join(repository, '.gitattributes'), 'utf8'))
  put(root, 'docs/README.md', '# UNAPPROVED format fixture\n')
  const revision = commit(root)
  return { root, revision, path: `${terminalNamespace}/${revision}.json.gz` }
}

// These shape examples deliberately contain unverified source/event/binding refs.
// A accepts only their format. They are never actual reading, current or complete evidence.
function shapes(revision = zero40, metadata = { docsTree: zero40, inventorySha256: zero64 }) {
  const path = 'docs/UNAPPROVED.md'
  const codePath = 'scripts/UNAPPROVED.mjs'
  const gitRef = { revision: zero40, path, gitObject: zero40, sha256: zero64 }
  const after = { ...gitRef, mode: '100644' }
  const evidence = {
    approvalId: 'UNAPPROVED-source',
    subjectPath: path,
    claim: { kind: 'reading', side: 'source' },
  }
  const span = { ...gitRef, lineRanges: [[1, 1]], coverage: 'delta' }
  const scope = {
    effectiveCoverage: 'UNAPPROVED',
    method: 'shape only; no semantic reading',
    source: [span],
    after: [span],
    reuse: [],
    limits: ['Not approved or complete'],
  }
  const locatorFor = (approvalId) => ({
    kind: 'docs-event',
    ref: { path: 'docs/UNAPPROVED-events.json', pointer: ['events', approvalId] },
  })
  const locator = locatorFor('UNAPPROVED-source')
  const binding = {
    kind: 'unregistered-reading',
    reason: 'UNAPPROVED structural example',
    policyRevision: zero40,
    policySourcePaths: ['docs/UNAPPROVED-policy.json'],
  }
  const subject = {
    path,
    scopeClass: 'reading-evidence',
    source: gitRef,
    after,
    binding,
    record: {
      kind: 'terminal-history',
      record: { original: 'Unknown historical payload preserved' },
    },
    readScope: scope,
    sourceLineage: [],
    unresolvedDisposition: [],
  }
  const codeSubject = { path: codePath, after: { ...after, path: codePath }, readScope: scope }
  const basis = {
    kind: 'agent-review-delivery',
    sender: 'UNAPPROVED sender',
    task: 'UNAPPROVED example',
    deliveredCandidate: zero40,
    recordedText: 'Shape only, never an actual received approval',
    receipt: null,
  }
  const subjectSet = {
    kind: 'document-subjects',
    count: 1,
    digest: zero64,
    members: { [path]: subject },
  }
  const event = {
    kind: 'document-content',
    authorIdentities: ['UNAPPROVED author'],
    reviewerIdentities: ['UNAPPROVED reviewer'],
    subjects: subjectSet,
    basis,
    verdict: 'accept',
  }
  const record = {
    path,
    contentReviewStatus: 'partial-review-unknown',
    docType: 'UNAPPROVED',
    templateId: 'UNAPPROVED',
    templateCompliance: 'needs-migration',
    coreConclusion: 'Shape only',
    truthAnchors: ['unverified'],
    unresolved: [],
    nextStep: 'Perform real review',
    owner: 'UNAPPROVED',
    provenance: ['shape'],
    publicCallers: ['unverified'],
    legalInputs: ['unverified'],
    businessOracle: { type: 'shape', assertions: ['unverified'] },
    dedupe: { result: 'unknown', against: [] },
    revision: { currentSha: 'unknown', history: [] },
    evidence: { kind: 'unapproved', path: 'unverified' },
    history: ['Original unknown state'],
    supersedes: [],
    stopLine: 'No approval or completion credit',
    sourceSha256: zero64,
    afterSha256: zero64,
    reviewedLines: 'unverified',
    reviewDepth: 'partial-semantic',
    source: { ...gitRef, approval: evidence },
    readScope: scope,
    sourceLineage: [],
    unresolvedDisposition: [],
    approvalId: 'UNAPPROVED-current',
    approvalEvent: locatorFor('UNAPPROVED-current'),
    extraOriginalPayload: { untouched: true },
  }
  const top = {
    schemaVersion: 2,
    kind: 'terminal-docs-review',
    snapshot: {
      commit: revision,
      docsTree: metadata.docsTree,
      inventoryPolicy: 'git-ls-tree-r-z-docs-v1',
      inventorySha256: metadata.inventorySha256,
      wireFormat: 'dref-map-v2',
    },
    baseline: { ...terminalFixedBaseline },
    producer: { path: codePath, approvalId: 'UNAPPROVED-code' },
    owner: 'UNAPPROVED format experiment',
    approval: {
      mode: 'authorized-non-author-workflow',
      identityAssurance: 'workflow-recorded; not cryptographic authentication',
      eventIndex: { 'UNAPPROVED-code': locatorFor('UNAPPROVED-code') },
      records: {},
    },
    verifierBundle: { [codePath]: 'UNAPPROVED-code' },
    documents: { byPath: {}, terminal: {} },
    artifacts: { byPath: {}, ruleBook: { path: 'docs/UNAPPROVED-rules.json', pointer: ['rules'] } },
    history: ['UNAPPROVED mathematical shape; no approval, full corpus or production credit'],
    retention: 'retain-with-approved-git-history',
    runtimeExecutionPerformed: false,
  }
  const overlay = {
    docType: 'archive-record',
    templateId: 'UNAPPROVED',
    templateVersion: 'UNAPPROVED',
    templatePath: path,
    format: 'markdown',
    contractSha256: zero64,
    templateSha256: zero64,
  }
  const policy = {
    revision: zero40,
    registryPath: path,
    routingPath: path,
    templateRegistryPath: path,
  }
  return {
    top,
    path,
    codePath,
    gitRef,
    after,
    evidence,
    span,
    scope,
    locator,
    binding,
    subject,
    codeSubject,
    basis,
    subjectSet,
    event,
    record,
    overlay,
    policy,
  }
}
function installArchive(fixture) {
  const metadata = terminalSnapshotMetadata(fixture.root, { commit: fixture.revision })
  const value = shapes(fixture.revision, metadata).top
  const bytes = encodeTerminalArchive(value)
  put(fixture.root, fixture.path, bytes)
  return { value, bytes }
}
function rawFrame(decoded) {
  const bytes = Buffer.isBuffer(decoded) ? decoded : Buffer.from(decoded)
  const footer = Buffer.alloc(8)
  footer.writeUInt32LE(terminalCrc32(bytes))
  footer.writeUInt32LE(bytes.length, 4)
  return Buffer.concat([
    Buffer.from('1f8b08000000000002ff', 'hex'),
    deflateRawSync(bytes, { level: 9 }),
    footer,
  ])
}

test('J emits literal UTF8-sorted key tokens, -0 and well-formed scalar quoting', () => {
  const value = {
    2: 2,
    10: 10,
    '01': -0,
    '\ud800': '\udc00',
    é: 1,
    'e\u0301': 2,
    '\n': '"\\\u0000',
  }
  const expected =
    '{"01":-0,"10":10,"2":2,"\\n":"\\"\\\\\\u0000","\\ud800":"\\udc00","é":2,"é":1}\n'
  assert.equal(canonicalTerminalJson(value).toString(), expected)
  const parsed = parseTerminalJson(Buffer.from(expected))
  assert.ok(Object.is(parsed['01'], -0))
  assert.equal(parsed['\ud800'], '\udc00')
  assert.equal(Object.keys(parsed).length, 7)
})
test('J rejects unsupported members without evaluating getters', () => {
  let called = false
  const getter = Object.defineProperty({}, 'x', {
    enumerable: true,
    get: () => {
      called = true
      return 1
    },
  })
  const cycle = []
  cycle.push(cycle)
  const hole = Array(2)
  hole[1] = 1
  for (const value of [
    undefined,
    Infinity,
    NaN,
    1n,
    hole,
    [undefined],
    getter,
    cycle,
    new Date(),
    { [Symbol('x')]: 1 },
  ])
    assert.throws(() => canonicalTerminalJson(value), failure('JSON'))
  assert.equal(called, false)
})
test('parser detects decoded duplicate own keys at every depth without changing prototypes', () => {
  for (const json of ['{"x":1,"\\u0078":2}', '{"a":[{"__proto__":0,"\\u005f_proto__":1}]}'])
    assert.throws(() => parseTerminalJson(Buffer.from(json)), failure('JSON_DUPLICATE'))
  const parsed = parseTerminalJson(Buffer.from('{"__proto__":{"safe":true},"constructor":0}'))
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype)
  assert.ok(Object.hasOwn(parsed, '__proto__'))
  assert.equal(parsed.__proto__.safe, true)
  assert.equal({}.safe, undefined)
})
test('parser rejects malformed JSON grammar and invalid UTF8/BOM', () => {
  for (const json of [
    '',
    '[1,]',
    '{"x" 1}',
    '01',
    '1e',
    '1.',
    'truefalse',
    '1e999',
    '"\\q"',
    '"\n"',
  ])
    assert.throws(() => parseTerminalJson(Buffer.from(json)), failure('JSON'))
  for (const bytes of [
    Buffer.from([0xef, 0xbb, 0xbf, 0x31]),
    Buffer.from([0x22, 0xc0, 0x80, 0x22]),
    Buffer.from([0x22, 0xed, 0xa0, 0x80, 0x22]),
  ])
    assert.throws(() => parseTerminalJson(bytes), failure('UTF8'))
})
test('depth counts containers from one and does not add depth for primitive leaves', () => {
  const exact = `${'['.repeat(128)}0${']'.repeat(128)}`
  const parsed = parseTerminalJson(Buffer.from(exact))
  assert.equal(canonicalTerminalJson(parsed).toString(), `${exact}\n`)
  const excess = `${'['.repeat(129)}0${']'.repeat(129)}`
  assert.throws(() => parseTerminalJson(Buffer.from(excess)), failure('JSON_BUDGET'))
  assert.throws(() => canonicalTerminalJson([parsed]), failure('JSON_BUDGET'))
})
test('value budget counts the root and each element value once, not keys or containers twice', () => {
  const exact = `[${'0,'.repeat(terminalLimits.values - 2)}0]`
  assert.equal(parseTerminalJson(Buffer.from(exact)).length, terminalLimits.values - 1)
  assert.throws(
    () => parseTerminalJson(Buffer.from(`${exact.slice(0, -1)},0]`)),
    failure('JSON_BUDGET'),
  )
  assert.deepEqual(parseTerminalJson(Buffer.from('{"key":[0]}')), { key: [0] })
  assert.throws(
    () => canonicalTerminalJson(Array(terminalLimits.values).fill(0)),
    failure('JSON_BUDGET'),
  )
})
test('single-string limit counts original token UTF8 content including escapes for keys and values', () => {
  const exact = 'a'.repeat(terminalLimits.stringBytes)
  assert.equal(parseTerminalJson(Buffer.from(`"${exact}"`)).length, terminalLimits.stringBytes)
  for (const token of [
    `${exact}a`,
    '\\u0061'.repeat(Math.floor(terminalLimits.stringBytes / 6) + 1),
    `${'é'.repeat(terminalLimits.stringBytes / 2)}a`,
  ]) {
    assert.throws(() => parseTerminalJson(Buffer.from(`"${token}"`)), failure('JSON_BUDGET'))
    assert.throws(() => parseTerminalJson(Buffer.from(`{"${token}":0}`)), failure('JSON_BUDGET'))
  }
  assert.throws(() => canonicalTerminalJson(`${exact}a`), failure('JSON_BUDGET'))
})
test('manual fixed-header single-stream codec roundtrips canonical bytes and known CRC', () => {
  assert.equal(terminalCrc32(Buffer.from('123456789')), 0xcbf43926)
  const value = { 'UNAPPROVED-vector': [-0, '\ud800', 'é', 'é', null] }
  const frame = encodeTerminalArchive(value)
  assert.equal(frame.subarray(0, 10).toString('hex'), '1f8b08000000000002ff')
  assert.deepEqual(gunzipSync(frame), canonicalTerminalJson(value))
  assert.deepEqual(decodeTerminalArchive(frame), value)
  assert.deepEqual(encodeTerminalArchive(value), frame)
})
test('codec refuses extra members, padding, optional headers and truncated framing', () => {
  const good = encodeTerminalArchive({ valid: 'component only' })
  const optional = Buffer.from(good)
  optional[3] = 8
  for (const frame of [
    Buffer.concat([good, rawFrame('')]),
    Buffer.concat([good, good]),
    Buffer.concat([good, Buffer.from([0])]),
    optional,
    good.subarray(0, good.length - 1),
  ])
    assert.throws(() => decodeTerminalArchive(frame), failure('FRAMING'))
  assert.throws(
    () =>
      decodeTerminalArchive(
        Buffer.concat([good.subarray(0, 10), Buffer.from([7]), Buffer.alloc(8)]),
      ),
    failure('INFLATE'),
  )
})
test('codec validates CRC and ISIZE before parsing decoded bytes', () => {
  const good = rawFrame('not JSON')
  const crc = Buffer.from(good)
  crc[crc.length - 8] ^= 1
  const size = Buffer.from(good)
  size[size.length - 4] ^= 1
  assert.throws(() => decodeTerminalArchive(crc), failure('CRC'))
  assert.throws(() => decodeTerminalArchive(size), failure('ISIZE'))
  assert.throws(() => decodeTerminalArchive(good), failure('JSON'))
})
test('codec applies fatal UTF8, duplicate and exact J checks after valid framing', () => {
  assert.throws(
    () => decodeTerminalArchive(rawFrame(Buffer.from([0xef, 0xbb, 0xbf, 0x31]))),
    failure('UTF8'),
  )
  assert.throws(
    () => decodeTerminalArchive(rawFrame('{"x":0,"\\u0078":1}\n')),
    failure('JSON_DUPLICATE'),
  )
  for (const json of ['{}', '{}\n\n', '{ "x": 0 }\n', '{"2":2,"10":10}\n', '1.0\n', '"\\u0061"\n'])
    assert.throws(() => decodeTerminalArchive(rawFrame(json)), failure('CANONICAL'))
})
test('compressed input cap rejects before header while the exact cap reaches framing', () => {
  assert.throws(
    () => decodeTerminalArchive(Buffer.alloc(terminalLimits.frameBytes + 1)),
    failure('FRAME_BUDGET'),
  )
  assert.throws(
    () => decodeTerminalArchive(Buffer.alloc(terminalLimits.frameBytes)),
    failure('FRAMING'),
  )
  assert.throws(
    () => encodeTerminalArchive(randomBytes(8_500_000).toString('base64')),
    failure('FRAME_BUDGET'),
  )
})
test('decoded cap includes the unique LF and bounds native inflation before JSON parsing', () => {
  const value = Array(4).fill('a'.repeat(terminalLimits.stringBytes))
  value[3] = value[3].slice(14)
  const bytes = canonicalTerminalJson(value)
  assert.equal(bytes.length, terminalLimits.decodedBytes)
  assert.deepEqual(decodeTerminalArchive(rawFrame(bytes)), value)
  assert.throws(() => canonicalTerminalJson([...value, 0]), failure('JSON_BUDGET'))
  const inflatedExcess = Buffer.alloc(terminalLimits.decodedBytes + 1, 0x20)
  assert.throws(() => decodeTerminalArchive(rawFrame(inflatedExcess)), failure('INFLATE'))
  assert.throws(() => parseTerminalJson(inflatedExcess), failure('JSON_BUDGET'))
})

test('closed named schemas reject extra/missing fields and unknown union tags', () => {
  const s = shapes()
  const registered = {
    kind: 'registered',
    policy: s.policy,
    docType: 'UNAPPROVED',
    templateId: 'UNAPPROVED',
    templateVersion: 'UNAPPROVED',
    templatePath: s.path,
    format: 'markdown',
    variant: null,
    contractSha256: zero64,
    templateSha256: zero64,
    overlay: null,
  }
  const samples = [
    ['DRef', s.locator.ref],
    ['Snapshot', s.top.snapshot],
    ['FixedBaseline', s.top.baseline],
    ['CodeMember', s.top.producer],
    ['Documents', s.top.documents],
    ['ApprovedSource', s.record.source],
    ['ReadScope', s.scope],
    ['ReadSpan', s.span],
    [
      'Reuse',
      {
        approval: s.evidence,
        path: s.path,
        gitObject: zero40,
        sha256: zero64,
        lineRanges: [[1, 1]],
        basis: 'UNAPPROVED',
      },
    ],
    [
      'Lineage',
      {
        from: s.gitRef,
        to: s.gitRef,
        basis: 'UNAPPROVED',
        approval: { ...s.evidence, claim: { kind: 'lineage', index: 0 } },
      },
    ],
    ['GitRef', s.gitRef],
    [
      'CaptureRef',
      {
        captureSha256: zero64,
        sourceKind: 'baseline-capture',
        gitObject: null,
        unresolvedOriginReason: 'Unknown',
      },
    ],
    [
      'Disposition',
      {
        index: 0,
        kind: 'blocks-doc',
        reason: 'UNAPPROVED',
        approval: { ...s.evidence, claim: { kind: 'disposition', index: 0 } },
      },
    ],
    ['Approval', s.top.approval],
    ['Event', s.event],
    ['Basis', s.basis],
    [
      'ReceivedArtifact',
      {
        kind: 'received-artifact',
        pathHint: '/tmp/unapproved',
        sha256: zero64,
        receivedViaMessage: 'UNAPPROVED',
      },
    ],
    ['Artifacts', s.top.artifacts],
    [
      'ArtifactRule',
      {
        kind: 'UNAPPROVED',
        custodian: 'unknown',
        producer: 'unknown',
        association: 'unknown',
        retention: 'unknown',
        stopLine: 'Not approved',
        approval: { ...s.evidence, claim: { kind: 'artifact-rule', pointer: ['rules'] } },
        members: { count: 1, digest: zero64 },
      },
    ],
    ['GitMemberRef', { revision: zero40, path: s.path, format: 'json', pointer: [''] }],
    ['EvidenceUse', s.evidence],
    ['ExplicitSubjectSet', s.subjectSet],
    ['DocumentSubject', s.subject],
    ['GitObjectRef', s.after],
    ['CodeSubject', s.codeSubject],
    ['OverlayBinding', s.overlay],
    ['PolicyRef', s.policy],
    ...['docs-event', 'git-event', 'terminal-event'].map((kind) => [
      'EventLocator',
      kind === 'docs-event'
        ? s.locator
        : kind === 'terminal-event'
          ? { kind, id: 'UNAPPROVED' }
          : { kind, ref: { revision: zero40, path: s.path, format: 'json', pointer: ['id'] } },
    ]),
    ...[
      { kind: 'snapshot-record', ref: s.locator.ref },
      {
        kind: 'git-record',
        ref: { revision: zero40, path: s.path, format: 'json', pointer: ['record'] },
      },
      { kind: 'terminal-current', path: s.path },
      { kind: 'terminal-history', record: { nativeExtra: ['unchanged'] } },
    ].map((value) => ['RecordRef', value]),
    ...[
      s.evidence.claim,
      { kind: 'lineage', index: 0 },
      { kind: 'disposition', index: 0 },
      { kind: 'artifact-rule', pointer: [''] },
    ].map((value) => ['ClaimSelector', value]),
    ['ResolvedBinding', registered],
    ['ResolvedBinding', s.binding],
  ]
  for (const [name, value] of samples) {
    assert.strictEqual(validateTerminalNamed(name, value), value, name)
    assert.throws(
      () => validateTerminalNamed(name, { ...value, unexpected: true }),
      failure('SCHEMA'),
      name,
    )
    const missing = structuredClone(value)
    delete missing[Object.keys(missing)[0]]
    assert.throws(() => validateTerminalNamed(name, missing), failure('SCHEMA'), name)
  }
  for (const name of ['EventLocator', 'RecordRef', 'ClaimSelector', 'ResolvedBinding'])
    assert.throws(() => validateTerminalNamed(name, { kind: 'unknown' }), failure('SCHEMA'))
  assert.strictEqual(validateTerminalStructure(s.top), s.top)
  assert.throws(() => validateTerminalStructure({ ...s.top, extra: 1 }), failure('SCHEMA'))
})
test('native24 detailed predicates and typed six extensions preserve every original extra field', () => {
  const { record } = shapes()
  const before = canonicalTerminalJson(record)
  assert.strictEqual(validateTerminalNamed('EnhancedCurrentRecord', record), record)
  assert.deepEqual(canonicalTerminalJson(record), before)
  const bad = {
    truthAnchors: [],
    provenance: [],
    publicCallers: [],
    legalInputs: [],
    history: [],
    unresolved: {},
    supersedes: {},
    businessOracle: {},
    dedupe: {},
    revision: {},
    evidence: {},
    reviewedLines: 1,
    reviewDepth: 'unknown',
    stopLine: ' ',
    sourceSha256: 'bad',
    contentReviewStatus: 'verified',
    templateCompliance: 'unknown',
  }
  for (const [key, value] of Object.entries(bad))
    assert.throws(
      () => validateTerminalNamed('EnhancedCurrentRecord', { ...record, [key]: value }),
      failure('SCHEMA'),
      key,
    )
  for (const key of Object.keys(record).filter((key) => key !== 'extraOriginalPayload')) {
    const missing = structuredClone(record)
    delete missing[key]
    assert.throws(
      () => validateTerminalNamed('EnhancedCurrentRecord', missing),
      failure('SCHEMA'),
      key,
    )
  }
  const mismatch = structuredClone(record)
  mismatch.source.sha256 = '1'.repeat(64)
  assert.throws(() => validateTerminalNamed('EnhancedCurrentRecord', mismatch), failure('SCHEMA'))
  assert.doesNotThrow(() =>
    validateTerminalNamed('RecordRef', {
      kind: 'terminal-history',
      record: { originalFailure: 'counter', oldExtra: 3 },
    }),
  )
})
test('local schema relations use exact own paths/ids, disjoint identities and counts', () => {
  const s = shapes()
  assert.throws(
    () =>
      validateTerminalNamed('Documents', { byPath: {}, terminal: { 'docs/other.md': s.record } }),
    failure('SCHEMA'),
  )
  assert.throws(
    () =>
      validateTerminalNamed('Event', { ...s.event, reviewerIdentities: s.event.authorIdentities }),
    failure('SCHEMA'),
  )
  assert.throws(
    () => validateTerminalNamed('ExplicitSubjectSet', { ...s.subjectSet, count: 2 }),
    failure('SCHEMA'),
  )
  const missingId = structuredClone(s.top)
  missingId.producer.approvalId = 'toString'
  assert.throws(() => validateTerminalStructure(missingId), failure('SCHEMA'))
  const wrongFinalKey = structuredClone(s.top)
  wrongFinalKey.approval.eventIndex['UNAPPROVED-code'].ref.pointer = ['events', 'another-id']
  assert.throws(() => validateTerminalStructure(wrongFinalKey), failure('SCHEMA'))
  for (const path of ['/absolute', 'a/../b', 'a//b', 'a\\b', 'a:b', 'a\ud800'])
    assert.throws(() => validateTerminalNamed('RepoPath', path), failure('SCHEMA'))
  for (const path of ['docs/é.md', 'docs/é.md'])
    assert.doesNotThrow(() => validateTerminalNamed('RepoPath', path))
  assert.doesNotThrow(() => validateTerminalNamed('Pointer', ['']))
  assert.doesNotThrow(() => validateTerminalNamed('ApprovalId', 'x'.repeat(64)))
  assert.throws(() => validateTerminalNamed('ApprovalId', 'x'.repeat(65)), failure('SCHEMA'))
})

test('nonGit exception requires absent namespace; discovery errors never become the exception', (t) => {
  const root = temporary(t)
  const absent = inspectTerminalNamespace(root)
  assert.equal(absent.ok, true)
  assert.equal(absent.status, 'namespace-not-applicable')
  mkdirSync(join(root, terminalNamespace), { recursive: true })
  assert.equal(inspectTerminalNamespace(root).ok, false)
  rmSync(join(root, '.governance'), { recursive: true })
  put(root, '.git', 'gitdir: missing\n')
  assert.equal(inspectTerminalNamespace(root).ok, false)
})
test('worktree format uses real D/docs/inventory/fixed33cc but grants no approval/current/complete', (t) => {
  const fixture = gitFixture(t)
  installArchive(fixture)
  const result = inspectTerminalNamespace(fixture.root)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.status, 'format-partial')
  assert.equal(result.qualityView, 'worktree')
  for (const key of ['approvalChecked', 'currentChecked', 'completeChecked'])
    assert.equal(result[key], false)
  assert.equal(result.observations.archives[0].baseline.sha256, terminalFixedBaseline.sha256)
  const subdirectory = join(fixture.root, 'docs')
  assert.deepEqual(inspectTerminalNamespace(subdirectory), result)
})
test('Git root discovery supports a real linked worktree gitfile and a child caller', (t) => {
  const fixture = gitFixture(t)
  const linked = temporary(t)
  git(fixture.root, ['worktree', 'add', '--quiet', '--detach', linked, fixture.revision])
  const linkedFixture = { ...fixture, root: linked }
  installArchive(linkedFixture)
  assert.match(readFileSync(join(linked, '.git'), 'utf8'), /^gitdir: /)
  const result = inspectTerminalNamespace(join(linked, 'docs'))
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.qualityView, 'worktree')
  assert.equal(result.approvalChecked, false)
})
test('designated metadata rejects actual tags, filename mismatch and wrong raw inventory', (t) => {
  const fixture = gitFixture(t)
  const { value } = installArchive(fixture)
  git(fixture.root, [
    '-c',
    'user.name=A8',
    '-c',
    'user.email=a8@example.invalid',
    'tag',
    '-a',
    'owned-tag',
    '-m',
    'not a commit',
  ])
  const tag = gitText(fixture.root, ['rev-parse', 'owned-tag'])
  assert.throws(() => assertTerminalCommit(fixture.root, tag), failure('GIT_IDENTITY'))
  const wrong = structuredClone(value)
  wrong.snapshot.inventorySha256 = zero64
  put(fixture.root, fixture.path, encodeTerminalArchive(wrong))
  assert.match(inspectTerminalNamespace(fixture.root).issues[0].message, /inventory mismatch/)
  put(fixture.root, fixture.path, encodeTerminalArchive(value))
  const differentName = `${terminalNamespace}/${zero40}.json.gz`
  put(fixture.root, differentName, encodeTerminalArchive(value))
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some((issue) => /filename D/.test(issue.message)),
  )
})
test('physical content is sole payload; bad old HEAD/index permit unstaged repair and expose differences', (t) => {
  const fixture = gitFixture(t)
  const { bytes } = installArchive(fixture)
  put(fixture.root, fixture.path, 'NOT_GZIP')
  commit(fixture.root)
  put(fixture.root, fixture.path, bytes)
  const repaired = inspectTerminalNamespace(fixture.root)
  assert.equal(repaired.ok, true, JSON.stringify(repaired))
  assert.equal(repaired.status, 'format-partial')
  const difference = repaired.observations.differences.find((entry) => entry.path === fixture.path)
  assert.equal(difference.indexMatchesWorktree, false)
  assert.equal(difference.headMatchesWorktree, false)
  assert.equal(repaired.currentChecked, false)
  git(fixture.root, ['add', fixture.path])
  put(fixture.root, fixture.path, 'NOT_GZIP')
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some(
      (issue) => issue.code === 'TERMINAL_FRAMING',
    ),
  )
})
test('index names/mode/stage/physical existence are enforced without reading its payload', (t) => {
  const fixture = gitFixture(t)
  installArchive(fixture)
  git(fixture.root, ['add', fixture.path])
  unlinkSync(join(fixture.root, fixture.path))
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some(
      (issue) => issue.code === 'TERMINAL_NAMESPACE_MISSING',
    ),
  )
  installArchive(fixture)
  git(fixture.root, ['update-index', '--chmod=+x', fixture.path])
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some(
      (issue) => issue.code === 'TERMINAL_NAMESPACE_INDEX',
    ),
  )
  git(fixture.root, [
    'update-index',
    '--add',
    '--cacheinfo',
    `160000,${fixture.revision},${fixture.path}`,
  ])
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some(
      (issue) => issue.code === 'TERMINAL_NAMESPACE_INDEX',
    ),
  )
  const oid = gitText(fixture.root, ['hash-object', '-w', '--stdin'], Buffer.from('NOT_GZIP'))
  git(fixture.root, ['update-index', '--force-remove', fixture.path])
  git(
    fixture.root,
    ['update-index', '--index-info'],
    `100644 ${oid} 1\t${fixture.path}\n100644 ${oid} 2\t${fixture.path}\n`,
  )
  assert.ok(
    inspectTerminalNamespace(fixture.root).issues.some(
      (issue) => issue.code === 'TERMINAL_NAMESPACE_INDEX',
    ),
  )
})
test('ignored padding, wrong suffix, extra directory and symlink cannot evade physical scan', (t) => {
  for (const kind of ['ignored', 'suffix', 'directory', 'symlink', 'backslash']) {
    const fixture = gitFixture(t)
    installArchive(fixture)
    if (kind === 'ignored') {
      put(fixture.root, '.gitignore', `${terminalNamespace}/padding\n`)
      put(fixture.root, `${terminalNamespace}/padding`, 'ignored')
    } else if (kind === 'suffix') put(fixture.root, `${terminalNamespace}/wrong.json`, '{}')
    else if (kind === 'directory') mkdirSync(join(fixture.root, terminalNamespace, 'extra'))
    else if (kind === 'symlink')
      symlinkSync('missing', join(fixture.root, terminalNamespace, 'link'))
    else put(fixture.root, `${terminalNamespace}/literal\\backslash`, 'invalid name')
    const result = inspectTerminalNamespace(fixture.root)
    if (kind === 'backslash') assert.ok(result.issues.some((issue) => issue.file.includes('\\')))
    assert.ok(
      result.issues.some((issue) => issue.code === 'TERMINAL_NAMESPACE_NAME'),
      kind,
    )
  }
})
test('staged deletion of a HEAD-only leaf is not a new physical quality obligation', (t) => {
  const fixture = gitFixture(t)
  put(fixture.root, fixture.path, 'NOT_GZIP')
  commit(fixture.root)
  git(fixture.root, ['rm', '-q', fixture.path])
  const result = inspectTerminalNamespace(fixture.root)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.observations.head.entries.length, 1)
  assert.equal(result.observations.index.length, 0)
  assert.equal(result.observations.physical.length, 0)
  assert.equal(result.currentChecked, false)
})
test('physical reader rejects executable/symlink parents and size before bounded allocation', (t) => {
  const root = temporary(t)
  const file = `${terminalNamespace}/${zero40}.json.gz`
  put(root, file, 'bounded')
  assert.equal(readTerminalPhysicalFile(root, file).buffer.toString(), 'bounded')
  chmodSync(join(root, file), 0o755)
  assert.throws(() => readTerminalPhysicalFile(root, file), failure('PHYSICAL'))
  chmodSync(join(root, file), 0o644)
  truncateSync(join(root, file), terminalLimits.frameBytes + 1)
  assert.throws(() => readTerminalPhysicalFile(root, file), failure('FRAME_BUDGET'))
  rmSync(join(root, '.governance'), { recursive: true })
  mkdirSync(join(root, 'outside'))
  symlinkSync('outside', join(root, '.governance'))
  assert.throws(() => readTerminalPhysicalFile(root, file), failure('PHYSICAL'))
})
test('explicit Git snapshot API reads exact immutable bytes without physical fallback or tag peeling', (t) => {
  const fixture = gitFixture(t)
  const source = readTerminalGitBlob(fixture.root, {
    revision: fixture.revision,
    path: 'docs/README.md',
  })
  put(fixture.root, 'docs/README.md', 'different worktree')
  assert.equal(source.buffer.toString(), '# UNAPPROVED format fixture\n')
  assert.deepEqual(
    readTerminalGitBlob(fixture.root, {
      revision: fixture.revision,
      path: 'docs/README.md',
      gitObject: source.gitObject,
    }).buffer,
    source.buffer,
  )
  assert.throws(
    () =>
      readTerminalGitBlob(fixture.root, { revision: fixture.revision, path: 'docs/missing.md' }),
    failure('GIT_IDENTITY'),
  )
  assert.throws(
    () =>
      readTerminalGitBlob(fixture.root, {
        revision: fixture.revision,
        path: 'docs/README.md',
        gitObject: zero40,
      }),
    failure('GIT_IDENTITY'),
  )
  assert.throws(
    () =>
      readTerminalGitBlob(fixture.root, { revision: fixture.revision, path: 'docs/README.md' }, 1),
    failure('GIT_BUDGET'),
  )
})
test('actual Git metadata overflow fails the fixed4MiB stdout budget', (t) => {
  const fixture = gitFixture(t)
  const oid = gitText(
    fixture.root,
    ['hash-object', '-w', '--stdin'],
    Buffer.from('metadata fixture'),
  )
  const entries = Array.from(
    { length: 5000 },
    (_, i) =>
      `100644 ${oid}\t${terminalNamespace}/${String(i).padStart(4, '0')}-${'p'.repeat(850)}\n`,
  ).join('')
  assert.ok(Buffer.byteLength(entries) > terminalGitMetadataBytes)
  git(fixture.root, ['update-index', '--index-info'], entries)
  assert.throws(() => terminalIndexEntries(fixture.root, terminalNamespace), failure('GIT_BUDGET'))
})

function entryFixture(t) {
  const fixture = gitFixture(t)
  for (const path of [
    'scripts/docs/check.mjs',
    'scripts/docs/document-integrity.mjs',
    'scripts/docs/config.mjs',
    'scripts/docs/markdown.mjs',
    'scripts/docs/terminal-codec.mjs',
    'scripts/docs/terminal-json.mjs',
    'scripts/docs/terminal-git.mjs',
    'scripts/docs/terminal-namespace.mjs',
    'scripts/docs/terminal-contract.mjs',
    'scripts/quality/lint-zero.mjs',
    'biome.json',
  ]) {
    mkdirSync(dirname(join(fixture.root, path)), { recursive: true })
    copyFileSync(join(repository, path), join(fixture.root, path))
  }
  put(fixture.root, '.gitignore', 'node_modules\n')
  symlinkSync(join(repository, 'node_modules'), join(fixture.root, 'node_modules'), 'dir')
  const docs = {
    'docs/README.md': '# Owned entry fixture\n\n[ops](ops/README.md) [phase2](phase2/README.md)\n',
    'docs/ops/README.md': '# Ops\n\n[tasks](tasks/README.md) [board](board.md)\n',
    'docs/ops/board.md': '# Board\n',
    'docs/ops/tasks/README.md': '# Tasks\n\n[index](index.md)\n',
    'docs/ops/tasks/index.md': renderTaskIndex([]),
    'docs/phase2/README.md': '# Phase2\n\n[guides](guides/README.md) [specs](specs/README.md)\n',
    'docs/phase2/guides/README.md': '# Guides\n\n[shared](shared-script-author-guide.md)\n',
    'docs/phase2/guides/shared-script-author-guide.md': '# Shared\n\ncontent22 SAVE12\n',
    'docs/phase2/specs/README.md':
      '# Specs\n\n' +
      ['script-system', 'content-schema', 'save-system', 'project-lifecycle', 'editor-architecture']
        .map((name) => `[${name}](${name}.md)`)
        .join(' ') +
      '\n',
    'packages/content/README.md': '# Content\n\ncontent22 SAVE12\n',
    'packages/migrate/README.md': '# Migrate\n\ncontent22 SAVE12\n\n## 当前发布模型\n',
    'packages/content/src/character.ts':
      'export const CONTENT_VERSION = 22 as const\nexport const CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 12 as const\n',
    'reference/sdlpal/docs/README.md': '# Reference\n\n[LICENSE](LICENSE)\n',
    'reference/sdlpal/README.md': '# Reference\n\n[authors](AUTHORS.md)\n',
    'reference/sdlpal/.github/PULL_REQUEST_TEMPLATE.md': '[pulls](../pulls)\n',
  }
  for (const name of [
    'script-system',
    'content-schema',
    'save-system',
    'project-lifecycle',
    'editor-architecture',
  ])
    docs[`docs/phase2/specs/${name}.md`] = `# ${name}\n\ncontent22 SAVE12\n`
  for (const [path, text] of Object.entries(docs)) put(fixture.root, path, text)
  // Fixture source formatting uses the real unchanged formatter; no rule/cap override.
  const format = spawnSync(process.execPath, [biomeCli, 'format', '--write', '.'], {
    cwd: fixture.root,
    encoding: 'utf8',
  })
  assert.equal(format.status, 0, format.stderr)
  fixture.revision = commit(fixture.root)
  fixture.path = `${terminalNamespace}/${fixture.revision}.json.gz`
  return fixture
}
const entry = (fixture, path, args = []) =>
  spawnSync(process.execPath, [join(fixture.root, path), ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
test('actual docs CLI json/index hooks reject canonical-name NOT_GZIP before success output', (t) => {
  const fixture = entryFixture(t)
  assert.equal(entry(fixture, 'scripts/docs/check.mjs', ['--json']).status, 0)
  put(fixture.root, fixture.path, 'NOT_GZIP')
  const json = entry(fixture, 'scripts/docs/check.mjs', ['--json'])
  assert.equal(json.status, 1)
  assert.match(JSON.parse(json.stdout).issues[0].message, /terminal framing/)
  const index = entry(fixture, 'scripts/docs/check.mjs', ['--print-task-index'])
  assert.equal(index.status, 1)
  assert.equal(index.stdout, '')
  assert.match(index.stderr, /terminal framing/)
})
test('actual lint export and CLI collect namespace AND unchanged Biome diagnostics', (t) => {
  const fixture = entryFixture(t)
  const clean = runLintZero(fixture.root)
  assert.equal(clean.ok, true, JSON.stringify(clean))
  put(fixture.root, fixture.path, 'NOT_GZIP')
  const result = runLintZero(fixture.root)
  assert.equal(result.ok, false)
  assert.equal(
    result.report.summary.errors + result.report.summary.warnings + result.report.summary.infos,
    0,
  )
  assert.ok(result.namespace.issues.some((issue) => issue.code === 'TERMINAL_FRAMING'))
  const cli = entry(fixture, 'scripts/quality/lint-zero.mjs')
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /terminal framing/)
  put(fixture.root, 'ordinary.json', `${JSON.stringify({ text: 'a'.repeat(1_048_576) })}\n`)
  const both = runLintZero(fixture.root)
  assert.equal(both.ok, false)
  assert.ok(both.report.summary.warnings > 0)
  assert.ok(both.namespace.issues.some((issue) => issue.code === 'TERMINAL_FRAMING'))
  unlinkSync(join(fixture.root, fixture.path))
  const ordinary = runLintZero(fixture.root)
  assert.equal(ordinary.namespace.ok, true)
  assert.ok(ordinary.report.summary.warnings > 0)
  assert.equal(ordinary.ok, false)
})
test('owned single-hook removals calibrate the exact old falsegreen, then restored hooks refuse', (t) => {
  const fixture = entryFixture(t)
  put(fixture.root, fixture.path, 'NOT_GZIP')
  const paths = ['scripts/docs/check.mjs', 'scripts/quality/lint-zero.mjs']
  const before = new Map(
    paths.map((path) => [path, readFileSync(join(fixture.root, path), 'utf8')]),
  )
  for (const path of paths) {
    const original = before.get(path)
    const call = path.includes('/quality/')
      ? 'inspectTerminalNamespace(cwd)'
      : 'inspectTerminalNamespace(repoRoot)'
    assert.equal(original.split(call).length, 2)
    // Only the owned fixture is mutated; real implementation and its imports stay intact.
    put(
      fixture.root,
      path,
      original.replace(call, '{ ok: Boolean(inspectTerminalNamespace), issues: [] }'),
    )
    const run = entry(fixture, path, path.includes('/quality/') ? [] : ['--json'])
    assert.equal(run.status, 0, run.stderr)
    if (path.includes('/quality/')) {
      put(fixture.root, 'ordinary.json', `${JSON.stringify({ text: 'a'.repeat(1_048_576) })}\n`)
      const oversizeWithoutHook = entry(fixture, path)
      assert.equal(oversizeWithoutHook.status, 1)
      assert.match(oversizeWithoutHook.stderr, /warnings: [1-9]/)
      unlinkSync(join(fixture.root, 'ordinary.json'))
    }
    put(fixture.root, path, original)
    assert.equal(entry(fixture, path, path.includes('/quality/') ? [] : ['--json']).status, 1)
  }
  for (const [path, original] of before)
    assert.equal(readFileSync(join(fixture.root, path), 'utf8'), original)
  assert.ok(existsSync(join(fixture.root, fixture.path)))
})

for (const path of ['scripts/docs/check.mjs', 'scripts/quality/lint-zero.mjs'])
  test(`actual ${path} CLI directory alias cannot bypass the namespace hook`, (t) => {
    const fixture = entryFixture(t)
    put(fixture.root, fixture.path, 'NOT_GZIP')
    const alias = join(temporary(t), 'project-alias')
    symlinkSync(fixture.root, alias, 'dir')
    const args = path.includes('/quality/') ? [] : ['--json']
    const run = spawnSync(process.execPath, [join(alias, path), ...args], {
      cwd: fixture.root,
      encoding: 'utf8',
    })
    assert.equal(run.status, 1, 'a legal directory alias must execute the actual CLI gate')
    assert.match(run.stdout + run.stderr, /terminal framing/)
    unlinkSync(join(fixture.root, fixture.path))
    const clean = spawnSync(process.execPath, [join(alias, path), ...args], {
      cwd: fixture.root,
      encoding: 'utf8',
    })
    assert.equal(clean.status, 0, clean.stderr)
    if (args.length) assert.deepEqual(JSON.parse(clean.stdout).issues, [])
    else assert.match(clean.stdout, /lint: PASS .*0 errors \/ 0 warnings \/ 0 infos/)
  })

test('public runLintZero directory-alias cwd keeps the legal caller and checks real namespace bytes', (t) => {
  const fixture = entryFixture(t)
  const alias = join(temporary(t), 'public-cwd-alias')
  symlinkSync(fixture.root, alias, 'dir')
  const physical = runLintZero(fixture.root)
  const aliased = runLintZero(alias)
  for (const result of [physical, aliased]) {
    assert.ok(result.report.summary.unchanged > 0)
    for (const field of [
      'errors',
      'warnings',
      'infos',
      'skipped',
      'changed',
      'diagnosticsNotPrinted',
    ])
      assert.equal(result.report.summary[field], 0, field)
  }
  assert.equal(physical.ok, true, JSON.stringify(physical))
  assert.equal(aliased.ok, true, 'a legal public cwd alias must match the clean physical caller')
  assert.deepEqual(aliased.namespace, physical.namespace)
  put(fixture.root, fixture.path, 'NOT_GZIP')
  for (const cwd of [fixture.root, alias]) {
    const result = runLintZero(cwd)
    assert.equal(result.ok, false)
    assert.ok(result.namespace.issues.some((issue) => issue.code === 'TERMINAL_FRAMING'))
    assert.equal(
      result.report.summary.errors + result.report.summary.warnings + result.report.summary.infos,
      0,
    )
  }
  unlinkSync(join(fixture.root, fixture.path))
  assert.equal(runLintZero(alias).ok, true)
})

test('unresolvable public cwd aliases fail explicitly instead of taking the nonGit exception', (t) => {
  const parent = temporary(t)
  const cycle = join(parent, 'cycle-a')
  symlinkSync('cycle-b', cycle)
  symlinkSync('cycle-a', join(parent, 'cycle-b'))
  const missing = join(parent, 'missing-alias')
  symlinkSync('missing-target', missing)
  for (const [cwd, code] of [
    [cycle, 'ELOOP'],
    [missing, 'ENOENT'],
  ]) {
    const result = runLintZero(cwd)
    assert.equal(result.ok, false)
    assert.equal(result.namespace.status, 'format-rejected')
    assert.ok(
      result.namespace.issues.some((issue) => issue.code === code),
      JSON.stringify(result),
    )
    assert.equal(result.namespace.approvalChecked, false)
    assert.equal(result.namespace.currentChecked, false)
    assert.equal(result.namespace.completeChecked, false)
  }
})
