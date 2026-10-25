const demand = (condition, message) => {
  if (!condition) throw new Error(`historical native family: ${message}`)
}
const object = (value, label) => {
  demand(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`,
  )
  return value
}
const text = (value, label, emptyAllowed = false) => {
  demand(
    typeof value === 'string' && (emptyAllowed || value.trim().length > 0),
    `${label} must be a string${emptyAllowed ? '' : ' with content'}`,
  )
  return value
}
const array = (value, label) => {
  demand(Array.isArray(value), `${label} must be an array`)
  return value
}
const count = (value, label) => {
  demand(
    Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0),
    `${label} must be a nonnegative safe integer`,
  )
  return value
}
const boolean = (value, label) => {
  demand(typeof value === 'boolean', `${label} must be boolean`)
  return value
}
const sha256 = (value, label) => {
  demand(
    typeof value === 'string' && /^[a-f\d]{64}$/.test(value),
    `${label} must be a SHA-256 declaration`,
  )
  return value
}
const forbid = (value, keys, label) => {
  for (const key of keys) demand(!Object.hasOwn(value, key), `${label} forbids ${key}`)
}
const unique = (values, label) =>
  demand(new Set(values).size === values.length, `${label} contains duplicate identities`)

function testCounts(value, label) {
  return {
    total: count(value.numTotalTests, `${label}.numTotalTests`),
    passed: count(value.numPassedTests, `${label}.numPassedTests`),
    failed: count(value.numFailedTests, `${label}.numFailedTests`),
  }
}

function reporter(value, family) {
  object(value, family)
  if (family === 'raw-reporter') forbid(value, ['distillation'], family)
  const counts = {
    ...testCounts(value, family),
    pending: count(value.numPendingTests, `${family}.numPendingTests`),
  }
  const suiteHierarchy = count(value.numTotalTestSuites, `${family}.numTotalTestSuites`)
  const success = boolean(value.success, `${family}.success`)
  const fileRows = array(value.testResults, `${family}.testResults`)
  const assertions = fileRows.flatMap((file, fileIndex) => {
    const label = `testResults[${fileIndex}]`
    object(file, label)
    const fileName = text(file.name, `${label}.name`)
    return array(file.assertionResults, `${label}.assertionResults`).map((item, index) => {
      const itemLabel = `${label}.assertionResults[${index}]`
      object(item, itemLabel)
      demand(
        item.status === 'passed' || item.status === 'failed',
        `${itemLabel}.status is outside the admitted passed/failed phases`,
      )
      const failureMessages = array(item.failureMessages, `${itemLabel}.failureMessages`).map(
        (message, n) => text(message, `${itemLabel}.failureMessages[${n}]`),
      )
      demand(
        item.status !== 'failed' || failureMessages.length > 0,
        `${itemLabel} failed without a failure message`,
      )
      return {
        file: fileName,
        fullName: text(item.fullName, `${itemLabel}.fullName`),
        status: item.status,
        failureMessages,
      }
    })
  })
  const passed = assertions.filter((item) => item.status === 'passed').length
  const failed = assertions.length - passed
  demand(
    counts.total === assertions.length &&
      counts.passed === passed &&
      counts.failed === failed &&
      counts.pending === 0,
    `${family} reported test counts disagree with assertion identities/statuses`,
  )
  demand(!success || failed === 0, `${family} success contradicts failed assertions`)
  // Suite hierarchy is the reporter's axis; it is not inferred from file record count.
  const reading = {
    family,
    counts,
    suiteHierarchy,
    fileRecords: fileRows.length,
    success,
    assertions,
  }
  if (family === 'distilled-reporter') {
    const distillation = object(value.distillation, 'distillation')
    reading.distillation = {
      note: text(distillation.note, 'distillation.note'),
      originalFileSha256: sha256(
        distillation.originalFileSha256,
        'distillation.originalFileSha256',
      ),
    }
  }
  return reading
}

function totalsSummary(value) {
  object(value, 'totals-summary')
  forbid(value, ['numPendingTests', 'testResults'], 'totals-summary')
  const counts = testCounts(value, 'totals-summary')
  const files = array(value.files, 'files').map((file, index) => {
    object(file, `files[${index}]`)
    return {
      file: text(file.file, `files[${index}].file`),
      tests: count(file.tests, `files[${index}].tests`),
    }
  })
  unique(
    files.map((file) => file.file),
    'summary files',
  )
  demand(
    counts.total === counts.passed + counts.failed &&
      counts.total === files.reduce((total, file) => total + file.tests, 0),
    'summary totals disagree with file test counts',
  )
  return { family: 'totals-summary', counts, pending: 'unreported', files }
}

function commandSummary(value) {
  object(value, 'command-summary')
  forbid(value, ['stdout', 'stderr'], 'command-summary')
  const argv = array(value.argv, 'argv').map((arg, index) => text(arg, `argv[${index}]`, true))
  demand(argv.length > 0 && argv[0].length > 0, 'argv needs an executable')
  const cwd = text(value.cwd, 'cwd')
  const exitCode = count(value.exitCode, 'exitCode')
  demand(
    value.signal === null && value.spawnError === null,
    'command-summary requires recorded null signal and spawnError',
  )
  object(value.summary, 'summary')
  const summary = {
    numTotalTests: count(value.summary.numTotalTests, 'summary.numTotalTests'),
    success: boolean(value.summary.success, 'summary.success'),
  }
  const identitySet = array(value.identitySet, 'identitySet').map((item, index) => {
    object(item, `identitySet[${index}]`)
    demand(
      item.status === 'passed',
      `identitySet[${index}].status is outside the admitted passed phase`,
    )
    return { fullName: text(item.fullName, `identitySet[${index}].fullName`), status: item.status }
  })
  unique(
    identitySet.map((item) => item.fullName),
    'command identities',
  )
  demand(
    summary.numTotalTests === identitySet.length,
    'command summary count disagrees with identitySet',
  )
  const sourceSha = Object.fromEntries(
    Object.entries(object(value.sourceSha, 'sourceSha')).map(([key, value]) => [
      text(key, 'sourceSha key'),
      sha256(value, `sourceSha.${key}`),
    ]),
  )
  demand(Object.keys(sourceSha).length > 0, 'sourceSha must retain source declarations')
  // No stream capture or zero-diagnostic claim follows from exitCode or summary.success.
  return {
    family: 'command-summary',
    argv,
    cwd,
    exitCode,
    signal: value.signal,
    spawnError: value.spawnError,
    summary,
    identitySet,
    sourceSha,
  }
}

function testIdentities(value) {
  const identities = array(value, 'test-identity-array').map((item, index) => {
    object(item, `identity[${index}]`)
    demand(
      item.status === 'passed',
      `identity[${index}].status is outside the admitted passed phase`,
    )
    return {
      file: text(item.file, `identity[${index}].file`),
      fullName: text(item.fullName, `identity[${index}].fullName`),
      status: item.status,
    }
  })
  unique(
    identities.map((item) => JSON.stringify([item.file, item.fullName])),
    'file/fullName pairs',
  )
  return { family: 'test-identity-array', identities }
}

function mutationDefinitions(value) {
  const definitions = array(value, 'mutation-definition-array').map((item, index) => {
    const label = `definition[${index}]`
    object(item, label)
    const allowed = ['id', 'file', 'line', 'find', 'replace', 'testFile', 'note']
    demand(
      Object.keys(item).every((key) => allowed.includes(key)),
      `${label} contains fields outside the mutation definition shape`,
    )
    const definition = {
      id: text(item.id, `${label}.id`),
      file: text(item.file, `${label}.file`),
      line: count(item.line, `${label}.line`),
      find: text(item.find, `${label}.find`),
      replace: text(item.replace, `${label}.replace`, true),
      testFile: text(item.testFile, `${label}.testFile`),
    }
    demand(definition.line > 0, `${label}.line must be one-based`)
    demand(definition.find !== definition.replace, `${label} does not define a change`)
    if (Object.hasOwn(item, 'note')) definition.note = text(item.note, `${label}.note`)
    return definition
  })
  unique(
    definitions.map((item) => item.id),
    'mutation IDs',
  )
  return { family: 'mutation-definition-array', definitions }
}

function historicalPathMap(value) {
  object(value, 'historical-path-map')
  demand(value.schemaVersion === 1, 'historical-path-map schemaVersion must be 1')
  const kindSummaryKeys = {
    'board-history': 'boardHistory',
    'audit-tool': 'auditTools',
    'task-evidence': 'taskEvidence',
  }
  const entries = array(value.entries, 'entries').map((item, index) => {
    const label = `entries[${index}]`
    object(item, label)
    demand(
      Object.hasOwn(kindSummaryKeys, item.kind),
      `${label}.kind is outside the admitted relocation kinds`,
    )
    text(item.reason, `${label}.reason`)
    object(item.evidence, `${label}.evidence`)
    return {
      from: text(item.from, `${label}.from`),
      to: text(item.to, `${label}.to`),
      kind: item.kind,
      sourceSha256: sha256(item.sourceSha256, `${label}.sourceSha256`),
      afterSha256: sha256(item.afterSha256, `${label}.afterSha256`),
      evidence: {
        sourceSha256: sha256(item.evidence.sourceSha256, `${label}.evidence.sourceSha256`),
        afterSha256: sha256(item.evidence.afterSha256, `${label}.evidence.afterSha256`),
      },
    }
  })
  unique(
    entries.map((item) => item.from),
    'relocation from paths',
  )
  unique(
    entries.map((item) => item.to),
    'relocation to paths',
  )
  object(value.summary, 'summary')
  const summary = { files: count(value.summary.files, 'summary.files') }
  demand(summary.files === entries.length, 'summary.files disagrees with relocation entries')
  for (const [kind, key] of Object.entries(kindSummaryKeys)) {
    summary[key] = count(value.summary[key], `summary.${key}`)
    demand(
      summary[key] === entries.filter((entry) => entry.kind === kind).length,
      `summary.${key} disagrees with relocation kinds`,
    )
  }
  // Current top-level after pins and nested historical evidence pins remain separate declarations.
  return {
    family: 'historical-path-map',
    schemaVersion: value.schemaVersion,
    id: text(value.id, 'id'),
    generatedBy: text(value.generatedBy, 'generatedBy'),
    sourceRevision: text(value.sourceRevision, 'sourceRevision'),
    appliedRevision: text(value.appliedRevision, 'appliedRevision'),
    rootWhitelist: array(value.rootWhitelist, 'rootWhitelist').map((entry, index) =>
      text(entry, `rootWhitelist[${index}]`),
    ),
    policy: text(value.policy, 'policy'),
    summary,
    entries,
  }
}

/** Read already parsed, byte-pinned historical JSON. Admission and execution credit belong to callers. */
export function nativeFamilyReading(value, family) {
  switch (family) {
    case 'raw-reporter':
    case 'distilled-reporter':
      return reporter(value, family)
    case 'totals-summary':
      return totalsSummary(value)
    case 'command-summary':
      return commandSummary(value)
    case 'test-identity-array':
      return testIdentities(value)
    case 'mutation-definition-array':
      return mutationDefinitions(value)
    case 'historical-path-map':
      return historicalPathMap(value)
    default:
      throw new Error(`historical native family: unsupported family ${String(family)}`)
  }
}
