import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const mode = process.env.CURSOR_TOOLS_REVIEW_MODE
const root = resolve(process.env.CURSOR_TOOLS_REVIEW_ROOT ?? process.argv[2] ?? '.')
const here = fileURLToPath(import.meta.url)
const relocatePath = 'scripts/docs/relocate.mjs'
const auditPath = 'packages/editor/scripts/design-system-audit.mjs'
const markdownPath = 'scripts/docs/markdown.mjs'

const edits = {
  'path-boundary-fix': {
    path: relocatePath,
    from: "  const pattern = new RegExp(escaped.join('|'), 'g')",
    to: "  const pattern = new RegExp('(?:' + escaped.join('|') + ')(?![\\\\w.-])', 'g')",
  },
  'allowlist-array-mutation': {
    path: auditPath,
    from: '  const stale = [...allowlist.keys()].filter((identity) => !active.includes(identity))',
    to: `  if (unapproved.length) {
    violations.push({ ...unapproved[0] })
    console.error('CALL_HIT allowlist-array-mutation')
  }
  const stale = [...allowlist.keys()].filter((identity) => !active.includes(identity))`,
  },
  'allowlist-invalid-input': {
    path: auditPath,
    from: '  if (problems.length) return { code: 2, active: [], unapproved: [], stale: [], problems }',
    to: `  if (problems.length) {
    if (document && typeof document === 'object') document.reviewMutation = true
    console.error('CALL_HIT allowlist-invalid-input')
    return { code: 2, active: [], unapproved: [], stale: [], problems }
  }`,
  },
  'link-position-mutation': {
    path: markdownPath,
    from: `line: lineAt(i),
        ...(positions ? { start: parsed.start, end: parsed.targetEnd } : {}),`,
    to: `line: lineAt(i),
        ...(positions ? { start: parsed.start + 1, end: parsed.targetEnd } : {}),`,
  },
}

if (mode) {
  const edit = edits[mode]
  assert.ok(edit, `unknown witness mode: ${mode}`)
  const target = pathToFileURL(resolve(root, edit.path)).href
  registerHooks({
    load(url, context, nextLoad) {
      const loaded = nextLoad(url, context)
      if (url !== target) return loaded
      const source = loaded.source.toString()
      assert.equal(source.split(edit.from).length - 1, 1, `unique edit: ${mode}`)
      console.error(`LOAD_HIT ${mode}`)
      return { ...loaded, source: source.replace(edit.from, edit.to) }
    },
  })
} else {
  const folder = resolve(root, 'docs/testing/cursor-tool-regressions/tests')
  const tests = readdirSync(folder)
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => resolve(folder, name))
  const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
  const protectedPaths = [relocatePath, auditPath, markdownPath].map((p) => resolve(root, p))
  protectedPaths.push(...tests)
  const before = protectedPaths.map(digest)
  const results = []

  function run(label, mutation, args, expectedStatus) {
    const env = { ...process.env, CURSOR_TOOLS_REVIEW_ROOT: root }
    delete env.NODE_COMPILE_CACHE
    delete env.CURSOR_TOOLS_REVIEW_MODE
    if (mutation) env.CURSOR_TOOLS_REVIEW_MODE = mutation
    const child = spawnSync(process.execPath, [...(mutation ? ['--import', here] : []), ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
    })
    const output = `${child.stdout ?? ''}\n${child.stderr ?? ''}`
    assert.equal(child.error, undefined, `${label}: ${child.error?.message}`)
    assert.equal(child.status, expectedStatus, `${label}:\n${output}`)
    if (mutation) assert.ok(output.includes(`LOAD_HIT ${mutation}`), label)
    if (mutation?.startsWith('allowlist')) assert.ok(output.includes(`CALL_HIT ${mutation}`), label)
    if (expectedStatus === 1) assert.match(output, /ERR_ASSERTION/)
    const failedNames = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((match) => match[1])
    results.push({
      label,
      status: child.status,
      tests: Number(/^# tests (\d+)$/m.exec(output)?.[1] ?? 0),
      pass: Number(/^# pass (\d+)$/m.exec(output)?.[1] ?? 0),
      fail: Number(/^# fail (\d+)$/m.exec(output)?.[1] ?? 0),
      failedNames,
      loadHit: mutation ? output.includes(`LOAD_HIT ${mutation}`) : false,
      callHit: mutation?.startsWith('allowlist')
        ? output.includes(`CALL_HIT ${mutation}`)
        : undefined,
    })
  }

  const testArgs = ['--test', '--test-concurrency=1', ...tests]
  run('candidate-control', undefined, testArgs, 0)
  run('candidate-on-path-fix', 'path-boundary-fix', testArgs, 1)
  run('candidate-misses-array-mutation', 'allowlist-array-mutation', testArgs, 0)
  run('candidate-misses-invalid-document-mutation', 'allowlist-invalid-input', testArgs, 0)
  run('candidate-detects-position-mutation', 'link-position-mutation', testArgs, 1)

  const pathOracle = `
    import assert from 'node:assert/strict';
    const { rewriteRepositoryPaths } = await import(${JSON.stringify(pathToFileURL(resolve(root, relocatePath)).href)});
    const input = 'docs/old/deep-extra.md';
    const mapping = new Map([['docs/old', 'docs/archive/old'], ['docs/old/deep', 'docs/archive/deep']]);
    assert.equal(rewriteRepositoryPaths(input, mapping), 'docs/archive/old/deep-extra.md');
  `
  run('path-oracle-original-red', undefined, ['--input-type=module', '--eval', pathOracle], 1)
  run(
    'path-oracle-fixed-green',
    'path-boundary-fix',
    ['--input-type=module', '--eval', pathOracle],
    0,
  )

  const inputOracle = (invalid) => `
    import assert from 'node:assert/strict';
    const { evaluateAllowlist } = await import(${JSON.stringify(pathToFileURL(resolve(root, auditPath)).href)});
    const entry = { file: 'Example.tsx', line: 7, rule: 'native-button', owner: 'Codex', reason: 'x', verification: 'x', removalCondition: 'x' };
    const document = ${invalid ? '{version: 2, entries: []}' : '{version: 1, entries: [entry]}'};
    const rows = [{file: 'Other.tsx', line: 7, rule: 'native-button'}];
    const before = structuredClone({document, rows});
    evaluateAllowlist(document, rows);
    assert.deepEqual({document, rows}, before);
  `
  run('array-oracle-control', undefined, ['--input-type=module', '--eval', inputOracle(false)], 0)
  run(
    'array-oracle-mutant-red',
    'allowlist-array-mutation',
    ['--input-type=module', '--eval', inputOracle(false)],
    1,
  )
  run(
    'invalid-document-oracle-control',
    undefined,
    ['--input-type=module', '--eval', inputOracle(true)],
    0,
  )
  run(
    'invalid-document-oracle-mutant-red',
    'allowlist-invalid-input',
    ['--input-type=module', '--eval', inputOracle(true)],
    1,
  )

  assert.deepEqual(protectedPaths.map(digest), before, 'source/test hashes unchanged')
  console.log(JSON.stringify({ root, results, sourceAndTestHashesUnchanged: true }, null, 2))
}
