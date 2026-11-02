import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(dir, '../../../../..')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const stale = [...report.files, ...report.context].filter(
  (pin) =>
    !fs.existsSync(path.join(root, pin.path)) ||
    sha(fs.readFileSync(path.join(root, pin.path))) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const core = path.join(root, 'packages/game/src/core/battle/')
  const before = execFileSync(
    'git',
    ['show', `${report.base}:packages/game/src/core/battle/battle-system.ts`],
    { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  )
  const after = fs.readFileSync(path.join(core, 'battle-system.ts'), 'utf8'),
    leaf = fs.readFileSync(path.join(core, 'battle-dialog.ts'), 'utf8')
  const parse = (s) => ts.createSourceFile('f.ts', s, ts.ScriptTarget.Latest, true),
    hash = (s) => crypto.createHash('sha256').update(s).digest('hex')
  const tokens = (s) => {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, s),
      a = []
    for (;;) {
      const k = scanner.scan()
      if (k === ts.SyntaxKind.EndOfFileToken) break
      a.push([k, scanner.getTokenText()])
    }
    return JSON.stringify(a)
  }
  const fn = (s, name) => {
    const ast = parse(s),
      n = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
    assert(n, name)
    return { ast, n, text: n.getText(ast), body: n.body.getText(ast) }
  }
  const moved = [
    ['tickBattleDialog', 'advanceBattleDialog'],
    ['isVerticalDialogSwap', 'isVerticalDialogSwap'],
    ['feedNextBattleDialogLine', 'feedNextBattleDialogLine'],
  ].map(([old, name]) => {
    const a = tokens(fn(before, old).body),
      b = tokens(fn(leaf, name).body)
    assert.equal(a, b, name)
    return { before: old, after: name, bodyTokensSha256: hash(a) }
  })
  const oldEntry = fn(before, 'tickBattleDialog'),
    newEntry = fn(after, 'tickBattleDialog')
  assert.equal(
    tokens(oldEntry.n.parameters.map((p) => p.getText(oldEntry.ast)).join(',')),
    tokens(newEntry.n.parameters.map((p) => p.getText(newEntry.ast)).join(',')),
  )
  assert.equal(tokens(newEntry.body), tokens('{ return advanceBattleDialog(state, gs, input) }'))
  assert.equal(tokens(fn(before, 'fleeStepDelta').body), tokens('{ return [5, 4] }'))
  let expanded = fn(before, 'tickBattleFleeAnim').text
  for (const [a, b] of [
    ['    const partyLen = state.players.length\n', ''],
    ['state.players.forEach((p, j) => {', 'state.players.forEach((p) => {'],
    ['      const [dx, dy] = fleeStepDelta(j, partyLen)\n', ''],
    ['p.pos.x + dx', 'p.pos.x + 5'],
    ['p.pos.y + dy', 'p.pos.y + 4'],
  ]) {
    assert.equal(expanded.split(a).length - 1, 1, a)
    expanded = expanded.replace(a, b)
  }
  assert.equal(
    tokens(expanded),
    tokens(fn(after, 'tickBattleFleeAnim').text),
    'private constant helper expansion',
  )
  const oldExpanded = before.replace(fn(before, 'tickBattleFleeAnim').text, expanded),
    removed = new Set([
      'tickBattleDialog',
      'isVerticalDialogSwap',
      'feedNextBattleDialogLine',
      'fleeStepDelta',
    ])
  function normalize(s) {
    const ast = parse(s)
    const t = ts.transform(ast, [
      (context) => (node) => {
        function visit(n) {
          if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return undefined
          if (ts.isFunctionDeclaration(n) && removed.has(n.name?.text)) return undefined
          if (
            ts.isVariableStatement(n) &&
            n.declarationList.declarations.some(
              (d) => d.name.getText(ast) === 'BATTLE_DIALOG_NARRATION_MS',
            )
          )
            return undefined
          return ts.visitEachChild(n, visit, context)
        }
        return ts.visitNode(node, visit)
      },
    ])
    const printed = ts.createPrinter({ removeComments: true }).printFile(t.transformed[0])
    t.dispose()
    return tokens(
      ts.transpileModule(printed, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      }).outputText,
    )
  }
  const a = normalize(oldExpanded),
    b = normalize(after)
  assert.equal(a, b, 'whole remaining battle runtime')
  const publicNames = (s) => {
    const names = []
    for (const n of parse(s).statements) {
      if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        names.push(...n.exportClause.elements.map((e) => e.name.text))
      else if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(n))
          names.push(...n.declarationList.declarations.map((d) => d.name.getText()))
        else if (n.name) names.push(n.name.text)
      }
    }
    return names.sort()
  }
  assert.deepEqual(publicNames(before), publicNames(after))
  const literal = parse(leaf).statements.find(
    (n) =>
      ts.isVariableStatement(n) &&
      n.declarationList.declarations.some((d) => d.name.getText() === 'BATTLE_DIALOG_NARRATION_MS'),
  )
  assert(literal)
  assert.equal(literal.declarationList.declarations[0].initializer.text, '1400')
  const actualContinuity = {
    moved,
    publicNames: publicNames(after),
    facadeSignatureEqual: true,
    privateConstantExpansion: true,
    runtimeRemainderSha256: hash(a),
    runtimeRemainderEqual: true,
    normalization:
      'Only imports/reexports, three moved declarations/facade, literal dialog timeout and proven private constant helper expansion; erase types; no opcode/numeric/branch masking.',
  }
  assert.deepEqual(actualContinuity, report.continuity)

  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(sha(packed), report.receipts.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(packed)))) {
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes, name)
    assert.equal(sha(bytes), item.sha256, name)
    archive.set(name, bytes)
  }
  assert.equal(archive.size, report.receipts.entries)
  const raw = (name) => {
      assert(archive.has(name), name)
      return archive.get(name)
    },
    json = (name) => JSON.parse(raw(name))
  const execution = (id, exit) => {
    const r = json(`${id}.execution.json`)
    assert.equal(r.exit, exit, id)
    assert.equal(r.signal, null)
    assert.equal(r.spawnError, null)
    assert.equal(raw(`${id}.stdout.raw`).length, r.stdoutBytes)
    assert.equal(raw(`${id}.stderr.raw`).length, r.stderrBytes)
  }
  execution('dialog-adjacent', 0)
  const native = json('dialog-adjacent.vitest.json')
  assert.equal(native.numPassedTests, 253)
  assert.equal(native.numFailedTests, 0)
  assert.equal(native.numPendingTests, 0)
  assert.equal(native.testResults.length, 7)
  assert.equal(raw('dialog-adjacent.stderr.raw').length, 0)
  assert(!/\b(?:stdout|stderr)\s*\|/.test(raw('dialog-adjacent.stdout.raw').toString()))
  for (const name of ['duration', 'append-corrected'])
    for (const phase of ['old', 'new']) {
      const id = `${name}-${phase}`
      execution(id, phase === 'old' ? 0 : 1)
      const r = json(`${id}.vitest.json`)
      assert.equal(r.numPassedTests, phase === 'old' ? 1 : 0)
      assert.equal(r.numFailedTests, phase === 'old' ? 0 : 1)
      const failures = r.testResults
        .flatMap((f) => f.assertionResults)
        .filter((t) => t.status === 'failed')
      if (phase === 'new') {
        assert.equal(failures.length, 1)
        assert(failures[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
      }
    }
  assert.equal(tokens(raw('counter-candidate.source.ts').toString()), tokens(leaf))
  assert.equal(
    tokens(raw('counter-candidate.test.ts').toString()),
    tokens(fs.readFileSync(path.join(core, '__tests__/battle-dialog.test.ts'), 'utf8')),
  )
  const oldCases = json('duration-old.vitest.json').testResults[0].assertionResults,
    newCases = native.testResults.find((f) =>
      f.name.endsWith('/battle-dialog.test.ts'),
    ).assertionResults
  assert.equal(oldCases.length, 13)
  assert.equal(newCases.length, 12)
  const missing = oldCases.filter((t) => !newCases.some((n) => n.fullName === t.fullName))
  assert.equal(missing.length, 1)
  assert.equal(missing[0].fullName, report.identity.retirement.mapping.before)
  const identity = (tests) =>
    sha(
      JSON.stringify(
        tests
          .map(
            (t) =>
              `${report.files[2].path} :: project root :: ${[...t.ancestorTitles, t.title].join(' > ')}`,
          )
          .sort((a, b) => a.localeCompare(b)),
      ),
    )
  assert.equal(identity(oldCases), report.identity.retirement.entry.previousIdentityDigest)
  assert.equal(identity(newCases), report.identity.retirement.entry.currentIdentityDigest)
  assert.equal(report.files[2].sha256, report.identity.retirement.entry.fileSha256)
  for (const [id, count] of [['retirement-tools-frozen', 83]]) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0)
    assert.match(raw(`${id}.stdout.raw`).toString(), new RegExp(`^# pass ${count}$`, 'm'))
    assert.match(raw(`${id}.stdout.raw`).toString(), /^# fail 0$/m)
  }
  for (const id of report.staticReceipts) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      publicExports: 21,
      identity: '13→12;one exact contract transfer',
      businessCounters: 2,
      rawEntries: archive.size,
      unifiedGates: 'DEFERRED',
    }),
  )
}
