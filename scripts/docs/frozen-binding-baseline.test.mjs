import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateCatalog } from './check-testing.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import {
  frozenBindingTemplate,
  frozenDocumentBaseline,
  inspectFrozenBaselineView,
  readFrozenBaselineRoot,
} from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const beforeRevision = 'ec2a87735435b409ff2c5b5e01bfb681af1e5c35'
const registryPath = 'docs/phase-governance/templates/registry.json'
const baselinePath = frozenDocumentBaseline.path
const hash = (value) => createHash('sha256').update(value).digest('hex')
const json = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const original = execFileSync(
  'git',
  ['show', `${frozenDocumentBaseline.revision}:${baselinePath}`],
  { cwd: root },
)
const candidate = json(baselinePath)
const document = {
  path: baselinePath,
  templateId: frozenBindingTemplate.templateId,
  variant: frozenBindingTemplate.variant,
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-frozen-binding-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (path, value) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), value)
  }
  const save = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`)
  execFileSync('git', ['init', '-q'], { cwd: directory })
  execFileSync('git', ['hash-object', '-w', '--stdin'], {
    cwd: directory,
    input: readFileSync(join(root, '.gitattributes')),
    encoding: 'utf8',
  })
  const specs = [frozenDocumentBaseline.revision, `${frozenDocumentBaseline.revision}^{tree}`]
  const parts = baselinePath.split('/')
  for (let i = 1; i <= parts.length; i++)
    specs.push(`${frozenDocumentBaseline.revision}:${parts.slice(0, i).join('/')}`)
  const objects = new Set()
  for (const spec of specs) {
    const object = execFileSync('git', ['rev-parse', spec], { cwd: root, encoding: 'utf8' }).trim()
    if (objects.has(object)) continue
    objects.add(object)
    const kind = execFileSync('git', ['cat-file', '-t', object], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    const buffer = execFileSync('git', ['cat-file', kind, object], { cwd: root })
    assert.equal(
      execFileSync('git', ['hash-object', '-t', kind, '-w', '--stdin'], {
        cwd: directory,
        input: buffer,
        encoding: 'utf8',
      }).trim(),
      object,
    )
  }
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  const registry = json(registryPath)
  const route = { ...document }
  const routing = {
    entry: 'AGENTS.md',
    entrySection: '操作与必读',
    forwardingEntries: [],
    routes: [],
    migratedDocuments: [route],
  }
  write('AGENTS.md', '# Fixture\n\n## 操作与必读\n\nFixed source-only governance fixture.\n')
  save(registryPath, registry)
  save('docs/phase-governance/routing.json', routing)
  const readBuffer = (path) => {
    try {
      return readFileSync(join(directory, path))
    } catch {
      return undefined
    }
  }
  const read = (path) => readBuffer(path)?.toString('utf8')
  const options = { readBuffer, readSourceBuffer: (pin) => readGitDocumentSnapshot(directory, pin) }
  const publish = (value = candidate) => {
    const bytes = Buffer.isBuffer(value)
      ? value
      : Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
    write(route.path, bytes)
    save(registryPath, registry)
    save('docs/phase-governance/routing.json', routing)
    save('docs/phase-governance/document-registry.json', {
      entries: [
        {
          path: route.path,
          templateId: route.templateId,
          templateVariant: route.variant,
          templateCompliance: 'template-compliant',
          reviewRecord: 'fixture.json',
        },
      ],
    })
    save('docs/phase-governance/reviews/fixture.json', {
      entries: [
        {
          path: route.path,
          contentReviewStatus: 'content-reviewed',
          templateCompliance: 'template-compliant',
          afterSha256: hash(bytes),
        },
      ],
    })
  }
  const cli = (name) => {
    const result = spawnSync(
      process.execPath,
      [`scripts/docs/${name}.mjs`, ...(name === 'report-governance-progress' ? ['--json'] : [])],
      { cwd: directory, encoding: 'utf8' },
    )
    assert.equal(result.error, undefined)
    assert(result.stdout, `CLI produced no report: exit=${result.status} stderr=${result.stderr}`)
    return {
      code: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      report: name === 'report-governance-progress' ? JSON.parse(result.stdout) : undefined,
    }
  }
  const reject = (reason, originalWithoutEnvelope = false) => {
    const model = cli('check-document-model'),
      progress = cli('report-governance-progress')
    assert.equal(model.code, 1, model.stdout + model.stderr)
    assert.equal(progress.code, 1)
    assert.equal(progress.report.completed.length, 0)
    assert.equal(progress.report.approvedCohort, 1838)
    assert(
      progress.report.issues.some((issue) => issue.includes(reason)),
      JSON.stringify(progress.report.issues),
    )
    assert(
      !progress.report.issues.some(
        (issue) =>
          /matching migrated route|completed review SHA drift/.test(issue) ||
          (!originalWithoutEnvelope && /variant mismatch/.test(issue)),
      ),
      JSON.stringify(progress.report.issues),
    )
  }
  publish()
  return {
    directory,
    write,
    save,
    read,
    readBuffer,
    registry,
    route,
    routing,
    publish,
    cli,
    reject,
    options,
  }
}

test('catalog default1.2 preserves actual complete18-entry old contract and both consumer responsibilities', async (t) => {
  const f = fixture(t)
  const beforeRegistry = JSON.parse(
    execFileSync('git', ['show', `${beforeRevision}:${registryPath}`], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  const old = beforeRegistry.types.find((entry) => entry.templateId === 'test-catalog-v1')
  const current = f.registry.types.find((entry) => entry.templateId === 'test-catalog-v1')
  assert.deepEqual(current.defaultRequiredGovernanceFields, old.requiredGovernanceFields)
  assert.equal(current.defaultRequiredGovernanceFields.length, 16)
  assert.equal(current.requiredGovernanceFields.length, 14)
  for (const key of ['requiredFields', 'requiredValues', 'entryReadingsField'])
    assert.deepEqual(current[key], old[key])
  assert.deepEqual(
    f.registry.types.find((entry) => entry.templateId === 'test-machine-evidence-v1'),
    beforeRegistry.types.find((entry) => entry.templateId === 'test-machine-evidence-v1'),
  )
  assert.deepEqual(f.registry.historicalSourcePins, beforeRegistry.historicalSourcePins)
  f.write(
    'scripts/docs/document-model-before.mjs',
    execFileSync('git', ['show', `${beforeRevision}:scripts/docs/document-model.mjs`], {
      cwd: root,
    }),
  )
  const beforeModel = (
    await import(pathToFileURL(join(f.directory, 'scripts/docs/document-model-before.mjs')))
  ).checkMigratedDocument
  const catalog = json('docs/testing/catalog.json')
  assert.equal(catalog.entries.length, 18)
  const cases = [
    ['canonical', () => {}, false, false],
    [
      'generatedBy value',
      (v) => {
        v.generatedBy = 'other actual producer'
      },
      false,
      false,
    ],
    [
      'generatedBy null',
      (v) => {
        v.generatedBy = null
      },
      false,
      false,
    ],
    [
      'generatedBy deleted',
      (v) => {
        delete v.generatedBy
      },
      true,
      false,
    ],
    [
      'schema3',
      (v) => {
        v.schemaVersion = 3
      },
      true,
      true,
    ],
    [
      'schema missing',
      (v) => {
        delete v.schemaVersion
      },
      true,
      true,
    ],
    ...[true, null, 'false', undefined].map((value) => [
      `runtime ${value}`,
      (v) => {
        if (value === undefined) delete v._governance.runtimeExecutionPerformed
        else v._governance.runtimeExecutionPerformed = value
      },
      true,
      false,
    ]),
    [
      'publicationRules',
      (v) => {
        delete v._governance.publicationRules
      },
      true,
      false,
    ],
    [
      'entryReadings',
      (v) => {
        delete v._governance.entryReadings
      },
      true,
      false,
    ],
    [
      'aligned empty ID',
      (v) => {
        const id = v.entries[0].id
        v.entries[0].id = ''
        v._governance.entryReadings.find((e) => e.id === id).id = ''
      },
      false,
      true,
    ],
    [
      'duplicate ID',
      (v) => {
        v.entries[0].id = v.entries[1].id
      },
      true,
      true,
    ],
    [
      'empty conclusion',
      (v) => {
        v._governance.entryReadings[0].conclusion = ' '
      },
      true,
      false,
    ],
    [
      'missing reading',
      (v) => {
        v._governance.entryReadings.pop()
      },
      true,
      false,
    ],
  ]
  for (const [name, mutate, genericRejects, catalogRejects] of cases) {
    const value = structuredClone(catalog)
    mutate(value)
    const before = structuredClone(value)
    before._governance.templateVersion = '1.1.0'
    const read = (path) =>
      path === 'docs/testing/catalog.json'
        ? JSON.stringify(value)
        : readFileSync(join(root, path), 'utf8')
    const oldRead = (path) =>
      path === 'docs/testing/catalog.json' ? JSON.stringify(before) : read(path)
    const doc = { path: 'docs/testing/catalog.json', templateId: 'test-catalog-v1' }
    const actual = checkMigratedDocument(doc, f.registry, read)
    assert.deepEqual(actual, beforeModel(doc, beforeRegistry, oldRead), name)
    assert.equal(actual.length > 0, genericRejects, name)
    assert.equal(
      validateCatalog(value, join(root, 'docs/testing'), '2026-10-16').length > 0,
      catalogRejects,
      name,
    )
  }
  const noGenerated = structuredClone(catalog)
  delete noGenerated.generatedBy
  const relaxed = structuredClone(f.registry)
  relaxed.types.find((entry) => entry.templateId === 'test-catalog-v1').requiredFields =
    current.requiredFields.filter((key) => key !== 'generatedBy')
  assert.deepEqual(
    checkMigratedDocument(
      { path: 'docs/testing/catalog.json', templateId: 'test-catalog-v1' },
      relaxed,
      () => JSON.stringify(noGenerated),
    ),
    [],
  )
})

test('real fixed Git Buffer root and unique governed baseline pass actual model/progress without self membership or recursion', (t) => {
  const f = fixture(t)
  const source = readGitDocumentSnapshot(f.directory, frozenDocumentBaseline)
  assert.equal(source.mode, '100644')
  assert.equal(hash(source.buffer), frozenDocumentBaseline.sha256)
  const fixed = readFrozenBaselineRoot(f.options.readSourceBuffer)
  assert.deepEqual(fixed.issues, [])
  assert.equal(fixed.entries.length, 1838)
  assert.equal(
    fixed.entries.some((entry) => entry.path === baselinePath),
    false,
  )
  assert(Object.isFrozen(fixed.native.entries[0]))
  assert.equal(inspectFrozenBaselineView(original, fixed).state, 'original')
  f.publish(original)
  f.reject('migration requires governed view', true)
  f.publish()
  assert.deepEqual(checkMigratedDocument(document, f.registry, f.read, f.options), [])
  assert.equal(f.cli('check-document-model').code, 0)
  const pass = f.cli('report-governance-progress')
  assert.equal(pass.code, 0)
  assert.equal(pass.report.incrementalMigrated, 1)
  assert.equal(pass.report.cohortMigrated, 0)
  assert.equal(pass.report.approvedCohort, 1838)
  rmSync(join(f.directory, baselinePath))
  const missing = f.cli('report-governance-progress')
  assert.equal(missing.code, 1)
  assert.equal(missing.report.completed.length, 0)
  assert(missing.report.issues.includes('baseline view requires original Buffer'))
  f.publish()
  assert(
    checkMigratedDocument(document, f.registry, f.read).includes(
      'frozen baseline requires real Buffer readers',
    ),
  )
  for (const pin of [
    { ...frozenDocumentBaseline, revision: frozenDocumentBaseline.gitObject },
    { ...frozenDocumentBaseline, path: 'docs/../wrong.json' },
    { ...frozenDocumentBaseline, path: 'docs/missing.json' },
  ])
    assert.equal(readGitDocumentSnapshot(f.directory, pin), undefined)
  const git = (args, input) =>
    execFileSync('git', args, { cwd: f.directory, input, encoding: 'utf8' }).trim()
  const tree = git(['rev-parse', `${frozenDocumentBaseline.revision}^{tree}`])
  const commit = (tree) =>
    git(
      ['-c', 'user.name=F1 fixture', '-c', 'user.email=f1@example.invalid', 'commit-tree', tree],
      'owned fixed-source negative\n',
    )
  const later = commit(tree)
  assert.notEqual(later, frozenDocumentBaseline.revision)
  assert.equal(
    readFrozenBaselineRoot((pin) =>
      readGitDocumentSnapshot(f.directory, { ...pin, revision: later }),
    ).issues.length,
    1,
  )
  const tag = git(
    ['mktag'],
    `object ${frozenDocumentBaseline.revision}\ntype commit\ntag owned-f1\ntagger F1 fixture <f1@example.invalid> 1792108800 +0000\n\nowned tag\n`,
  )
  for (const revision of [tree, tag])
    assert.equal(
      readGitDocumentSnapshot(f.directory, { ...frozenDocumentBaseline, revision }),
      undefined,
    )
  const linkBlob = git(['hash-object', '-w', '--stdin'], 'outside.json')
  for (const [mode, kind, object] of [
    ['120000', 'blob', linkBlob],
    ['160000', 'commit', frozenDocumentBaseline.revision],
  ]) {
    const inner = git(['mktree'], `${mode} ${kind} ${object}\talias.json\n`)
    const tree = git(['mktree'], `040000 tree ${inner}\tdocs\n`)
    assert.equal(
      readGitDocumentSnapshot(f.directory, { revision: commit(tree), path: 'docs/alias.json' }),
      undefined,
    )
  }
  assert.equal(readFrozenBaselineRoot({}).issues.length, 1)
  assert.equal(
    readGitDocumentSnapshot(f.directory, {
      ...frozenDocumentBaseline,
      revision: { toString: null },
    }),
    undefined,
  )
  assert(
    checkMigratedDocument(document, f.registry, f.read, {
      ...f.options,
      readBuffer: 'wrong reader',
    }).includes('frozen baseline requires real Buffer readers'),
  )
  const rawRoot = readFileSync(join(root, 'scripts/docs/frozen-document-source.mjs'), 'utf8')
  assert(!/^import .*from ['"].*(?:model|review|terminal)/m.test(rawRoot))
})

test('coordinated native/identity changes cannot gain completion; removing only owned native guard calibrates the same real CLI mutation', (t) => {
  const f = fixture(t)
  const mutations = [
    ...Object.keys(JSON.parse(original)).map((key) => [
      key,
      (v) => {
        v[key] =
          key === 'entries'
            ? v.entries.slice(1)
            : key === 'summary'
              ? { ...v.summary, newType: 0 }
              : null
      },
    ]),
    [
      'entry path',
      (v) => {
        v.entries[0].path = 'docs/fake.md'
      },
    ],
    [
      'entry hash',
      (v) => {
        v.entries[0].sourceSha256 = '0'.repeat(64)
      },
    ],
    [
      'entry order',
      (v) => {
        ;[v.entries[0], v.entries[1]] = [v.entries[1], v.entries[0]]
      },
    ],
    [
      'entry status',
      (v) => {
        v.entries[0].contentReviewStatus = 'content-reviewed'
        v.entries[0].reviewRecord = 'fake.json'
      },
    ],
  ]
  for (const [, mutate] of mutations) {
    const value = structuredClone(candidate)
    mutate(value)
    f.publish(value)
    f.reject('frozen baseline native fields changed')
  }
  const value = structuredClone(candidate)
  value.entries[0].sourceSha256 = '0'.repeat(64)
  f.publish(value)
  const helper = 'scripts/docs/frozen-document-source.mjs',
    code = f.read(helper)
  assert.equal(code.split('!isDeepStrictEqual(native, root.native)').length, 2)
  f.write(helper, code.replace('!isDeepStrictEqual(native, root.native)', 'false'))
  assert.equal(f.cli('check-document-model').code, 0)
  const calibrated = f.cli('report-governance-progress')
  assert.equal(calibrated.code, 0)
  assert.equal(calibrated.report.completed.length, 1)
  f.write(helper, code)
  f.publish()
  const meta = candidate._governance
  for (const key of ['sourceGitRevision', 'sourceGitObject', 'sourceSha256']) {
    const bad = structuredClone(candidate)
    bad._governance[key] = meta[key].replace(/./g, '0')
    f.publish(bad)
    f.reject('fixed source declaration mismatch')
  }
  f.publish()
  f.route.path = 'docs/testing/e2e/evidence/e2e-006.json'
  f.publish()
  f.reject('unique path and typed JSON binding')
  const modelPath = 'scripts/docs/document-model.mjs',
    model = f.read(modelPath)
  const hardPathGuard = /doc\.path !== frozenDocumentBaseline\.path \|\|\s+doc\.templateId/g
  assert.equal([...model.matchAll(hardPathGuard)].length, 1)
  f.write(modelPath, model.replace(hardPathGuard, 'false || doc.templateId'))
  assert.equal(f.cli('check-document-model').code, 0)
  const pathCalibration = f.cli('report-governance-progress')
  assert.equal(pathCalibration.code, 0)
  assert.equal(pathCalibration.report.completed.length, 1)
  f.write(modelPath, model)
  // Only in this owned fixture, move the one approved hard path to the already matching route.
  const helperMoved = code.replace(
    "path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json'",
    "path: 'docs/testing/e2e/evidence/e2e-006.json'",
  )
  assert.notEqual(helperMoved, code)
  // A candidate-supplied path cannot change the real frozen root: identity still rejects it.
  f.write(helper, helperMoved)
  f.reject('original Git Buffer identity mismatch')
  f.write(helper, code)
  assert.equal(f.read(modelPath), model)
})

test('strict UTF8/all-depth decoded duplicate keys and exact typed metadata reject through both real consumers', (t) => {
  const f = fixture(t)
  const metadata = [
    ...Object.keys(candidate._governance).map((key) => [
      `missing ${key}`,
      (v) => {
        delete v._governance[key]
      },
    ]),
    [
      'gov null',
      (v) => {
        v._governance = null
      },
    ],
    [
      'gov array',
      (v) => {
        v._governance = []
      },
    ],
    [
      'owner empty',
      (v) => {
        v._governance.owner = ' '
      },
    ],
    [
      'date invalid',
      (v) => {
        v._governance.lastReviewed = '2026-02-30'
      },
    ],
    [
      'primary object with noncallable includes',
      (v) => {
        v._governance.primarySource = { includes: 'not callable' }
      },
    ],
    [
      'date object with invalid coercion',
      (v) => {
        v._governance.lastReviewed = { toString: null }
      },
    ],
    [
      'primary empty',
      (v) => {
        v._governance.primarySource = []
      },
    ],
    [
      'history empty',
      (v) => {
        v._governance.history = []
      },
    ],
    [
      'audit true',
      (v) => {
        v._governance.currentAudit.runtimeExecutionPerformed = true
      },
    ],
    [
      'audit extra',
      (v) => {
        v._governance.currentAudit.result = 'pass'
      },
    ],
    [
      'capture review credit',
      (v) => {
        v._governance.captureReading.sourceDocumentSemanticReviewPerformed = true
      },
    ],
    [
      'capture binding credit',
      (v) => {
        v._governance.captureReading.entryBindingsAreCurrentTemplateApproval = true
      },
    ],
    [
      'capture summary credit',
      (v) => {
        v._governance.captureReading.captureSummaryIsCurrentRegistrySummary = true
      },
    ],
    [
      'capture missing meaning',
      (v) => {
        delete v._governance.captureReading.nativeFieldSemantics.policy
      },
    ],
    [
      'fake publication',
      (v) => {
        v._governance.entryReadings = []
      },
    ],
  ]
  for (const [, mutate] of metadata) {
    const value = structuredClone(candidate)
    mutate(value)
    f.publish(value)
    const model = f.cli('check-document-model'),
      progress = f.cli('report-governance-progress')
    assert.equal(model.code, 1)
    assert.equal(progress.code, 1)
    assert.equal(progress.report.completed.length, 0)
    assert(progress.report.issues.some((i) => /baseline/.test(i)))
  }
  const text = JSON.stringify(candidate)
  for (const bytes of [
    Buffer.from(text.replace('"_governance":', '"_governance":{},"_governance":')),
    Buffer.from(text.replace('"schemaVersion":1', '"schemaVersion":1,"schema\\u0056ersion":1')),
    Buffer.from(
      text.replace('"sourceSha256":', '"sourceSha256":"duplicate","sourceSha\\u003256":'),
    ),
    Buffer.from(text.replace('"entryCount":1838', '"entryCount":1838,"entry\\u0043ount":1838')),
    Buffer.concat([
      Buffer.from(text.slice(0, 20)),
      Buffer.from([0xff]),
      Buffer.from(text.slice(20)),
    ]),
  ]) {
    f.publish(bytes)
    f.reject('strict UTF8/JSON or duplicate decoded key invalid')
  }
  f.publish()
  for (const mutation of [
    (c) => {
      c.format = 'markdown'
      c.requiredSections = []
    },
    (c) => {
      c.variants[document.variant].format = 'markdown'
      c.variants[document.variant].requiredSections = []
    },
  ]) {
    const c = f.registry.types.find((entry) => entry.templateId === document.templateId)
    const old = structuredClone(c)
    mutation(c)
    f.publish()
    f.reject('unique path and typed JSON binding')
    Object.keys(c).forEach((key) => {
      delete c[key]
    })
    Object.assign(c, old)
  }
})
