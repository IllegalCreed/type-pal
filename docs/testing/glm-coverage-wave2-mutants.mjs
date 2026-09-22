/** Codex takeover: fixed test identities, isolated source loading, no production writes. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-wave2-mutants-'))
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const { PNG } = createRequire(resolve(root, 'packages/migrate/package.json'))('pngjs')
const fixtureText = readFileSync(
  resolve(root, 'packages/reforge/src/__tests__/coverage-wave2/b-trial-catalog.ts'),
  'utf8',
)
const fixtureAst = ts.createSourceFile('fixture.ts', fixtureText, ts.ScriptTarget.Latest, true)
const pngSamples = []
function inspectFixture(node) {
  if (
    ts.isVariableDeclaration(node) &&
    ['chromePng', 'facePng'].includes(node.name.getText(fixtureAst))
  ) {
    assert(
      ts.isArrowFunction(node.initializer) && ts.isCallExpression(node.initializer.body),
      'PNG fixture entry changed',
    )
    const literal = node.initializer.body.arguments[0]
    assert(ts.isStringLiteral(literal), 'PNG fixture must have inspectable bytes')
    const bytes = Buffer.from(literal.text, 'base64'),
      parsed = PNG.sync.read(bytes, { checkCRC: true })
    const name = node.name.getText(fixtureAst),
      source = `packages/reforge/src/engine-chrome/assets/ui/num/${name === 'chromePng' ? 1 : 2}.png`
    assert.equal(
      Buffer.compare(bytes, readFileSync(resolve(root, source))),
      0,
      `${name}: source bytes differ`,
    )
    pngSamples.push({
      name,
      source,
      width: parsed.width,
      height: parsed.height,
      bytes: bytes.length,
    })
  }
  ts.forEachChild(node, inspectFixture)
}
inspectFixture(fixtureAst)
assert.equal(pngSamples.length, 2)
const prepared = JSON.parse(
  readFileSync(resolve(root, 'docs/testing/glm-coverage-wave2-results.json'), 'utf8'),
)
const expectedCounts = { reforge: 49, editor: 50, content: 45, migrate: 19 }
const mutations = [
  {
    id: 'B-reread-project',
    pkg: 'reforge',
    source: 'battle-trial-assets',
    test: 'battle-trial-assets',
    title: 'post-resource data drift rejects and releases already-created project bitmaps',
    from: '(await battleTrialRevision(await loadCurrentProjectFrom(input.source)))',
    to: '(await battleTrialRevision(input))',
  },
  {
    id: 'A-multi-target',
    pkg: 'reforge',
    source: 'script-project-core',
    test: 'script-project-core',
    title: 'setMultiEntityState 逐 target 全量写入后命令级一次通知',
    from: 'for (const target of command.targets)',
    to: 'for (const target of command.targets.slice(0, 1))',
  },
  {
    id: 'A-abort-before-commit',
    pkg: 'reforge',
    source: 'script-project-core',
    test: 'script-project-core',
    title: '提交前 abort：端点零写入零通知',
    from: 'if (committed) return\n            signal.throwIfAborted()',
    to: 'if (committed) return',
  },
  {
    id: 'A-session-drift',
    pkg: 'reforge',
    source: 'script-project-core',
    test: 'script-project-core',
    title: '提交时会话漂移（session 变化、scene 不变）：AbortError、端点零写入',
    from: "this.currentSceneSessionId() !== sceneSessionId\n            )\n              throw new DOMException('moveEntity scene session changed', 'AbortError')",
    to: "false\n            )\n              throw new DOMException('moveEntity scene session changed', 'AbortError')",
  },
  {
    id: 'B-text-freeze',
    pkg: 'reforge',
    source: 'battle-trial-assets',
    test: 'battle-trial-assets',
    title:
      'readText/readJson use frozen bytes after source mutation and seal rejects uncached paths',
    from: 'readText: async (path) => new TextDecoder().decode(await readBytes(path))',
    to: 'readText: async (path) => original.readText(path)',
  },
  {
    id: 'B-json-freeze',
    pkg: 'reforge',
    source: 'battle-trial-assets',
    test: 'battle-trial-assets',
    title:
      'readText/readJson use frozen bytes after source mutation and seal rejects uncached paths',
    from: 'JSON.parse(new TextDecoder().decode(await readBytes(path))) as T',
    to: 'await original.readJson<T>(path)',
  },
  {
    id: 'B-abort-listener',
    pkg: 'reforge',
    source: 'battle-trial-assets',
    test: 'battle-trial-assets',
    title: 'abortableTrial in-flight rejects before its original source is released',
    from: "signal.addEventListener('abort', abort, { once: true })",
    to: 'void abort',
  },
  {
    id: 'B-confirmation-set',
    pkg: 'editor',
    source: 'core/battle-simulator-commands',
    test: 'core/battle-simulator-commands',
    title:
      "incomplete or stale confirmation 'stale' rejects with exact dependencies and preserves input",
    from: 'if (JSON.stringify(dependents) !== JSON.stringify(confirmed))',
    to: 'if (dependents.length !== confirmed.length)',
  },
  {
    id: 'C-distinct-sites',
    pkg: 'editor',
    source: 'core/world-sprite-behavior',
    test: 'core/world-sprite-behavior',
    title:
      'same sprite used by two auto instances yields two exact sites after canonical projection',
    from: 'sites.push({',
    to: 'if (sites.some((site) => site.spriteId === sprite)) return; sites.push({',
  },
  {
    id: 'C-redo-fork',
    pkg: 'editor',
    source: 'core/frame-animation-draft',
    test: 'core/frame-animation-draft',
    title:
      'a new edit after undo clears nonempty redo, while same-present commits and empty undo/redo are no-ops',
    from: 'present: draft,\n    future: [],',
    to: 'present: draft,\n    future: history.future,',
  },
  {
    id: 'D-canonical-refresh',
    pkg: 'editor',
    source: 'core/project-reference-adapters',
    test: 'core/project-reference-adapters',
    title:
      'current provider observes canonical-session replacement on the same shell without retaining old variable edges',
    from: 'return (state) => collectCurrentProjectReferenceIndex(state, getCanonical())',
    to: 'let retained; return (state) => retained ??= collectCurrentProjectReferenceIndex(state, getCanonical())',
  },
  {
    id: 'D-proof-generation',
    pkg: 'editor',
    source: 'core/tileset-references',
    test: 'core/tileset-references',
    title:
      'removal proof rejects a real newer scan generation even when coverage and asset identities stay equal',
    from: 'assertCurrentProof(state, batch, proof.generation, proof.coverage)\n  const definition',
    to: 'assertCurrentProof(state, batch, batch.generation, proof.coverage)\n  const definition',
  },
  {
    id: 'E-probability-upper',
    pkg: 'content',
    source: 'enemy-script',
    test: 'enemy-script',
    title:
      "enemy AI rejects 'chance upper' through its real rule parent and retains all input fields",
    from: 'if (result < 0 || result > 100)',
    to: 'if (result < 0)',
  },
  {
    id: 'E-item-count',
    pkg: 'content',
    source: 'author-script-core',
    test: 'author-script-core',
    title:
      "current nested condition rejects 'has item count' and preserves the actual command tree",
    from: '!Number.isInteger(condition.atLeast) || Number(condition.atLeast) <= 0',
    to: '!Number.isInteger(condition.atLeast) || Number(condition.atLeast) < 0',
  },
  {
    id: 'F-sound-sign',
    pkg: 'migrate',
    source: 'migrate-enemies',
    test: 'migrate-enemies',
    title:
      'real enemy translator maps every stat, optional item and signed sound without changing extracted input',
    from: '...(stats.magicSound < 0 ? { suppressMagicEffectSound: true } : {})',
    to: '...({})',
  },
  {
    id: 'F-locale-drift',
    pkg: 'migrate',
    source: 'pal-casualty-scripts',
    test: 'pal-casualty-scripts',
    title:
      'locale-set drift rejects the complete overlay instead of silently dropping a source message',
    from: 'parsedKeys.some((key, index) => key !== expectedKeys[index])',
    to: 'false',
  },
  {
    id: 'F-authored-partition',
    pkg: 'migrate',
    source: 'script-library-audit',
    test: 'script-library-audit',
    title:
      'audit keeps authored bytes and nodes out of migration ratios and measures Unicode in UTF8',
    from: 'if (index.library?.[id])',
    to: 'if (!index.library?.[id])',
  },
]
const sources = prepared.modules.map((module) => module.file)
const hash = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex')
const hashes = Object.fromEntries(sources.map((path) => [path, hash(path)]))
const isAssertion = (entry) =>
  entry.status === 'failed' &&
  entry.failureMessages.length > 0 &&
  entry.failureMessages.every((text) =>
    /^AssertionError(?:\b|:)/.test(stripVTControlCharacters(text).trimStart()),
  )
assert(isAssertion({ status: 'failed', failureMessages: ['AssertionError: expected'] }))
for (const failureMessages of [
  ['Error: includes AssertionError'],
  ['AssertionError: expected', 'TypeError: setup'],
  ['Error: timed out'],
  [],
])
  assert(!isAssertion({ status: 'failed', failureMessages }))
assert(!isAssertion({ status: 'pending', failureMessages: ['AssertionError: skipped'] }))
const controls = new Map(),
  evidence = []
const selected = process.env.WAVE2_MUTANT
if (selected)
  assert(
    mutations.some((item) => item.id === selected),
    'unknown WAVE2_MUTANT',
  )
const cases = mutations.filter((item) => !selected || item.id === selected)
for (const mutation of cases)
  assert.equal(
    readFileSync(resolve(root, `packages/${mutation.pkg}/src/${mutation.source}.ts`), 'utf8').split(
      mutation.from,
    ).length - 1,
    1,
    `${mutation.id}: preflight unique needle`,
  )
const packages = [...new Set(cases.map((item) => item.pkg))]
for (const pkg of packages) {
  const includes = prepared.whitelist.testFiles
    .filter((path) => path.startsWith(`packages/${pkg}/`))
    .map((path) => path.slice(`packages/${pkg}/`.length))
  for (const mutation of [null, ...cases.filter((item) => item.pkg === pkg)]) {
    const id = mutation?.id ?? `${pkg}-control`
    const report = join(output, `${id}.json`),
      config = join(output, `${id}.config.mjs`)
    const target = mutation ? resolve(root, `packages/${pkg}/src/${mutation.source}.ts`) : ''
    const targetFile = mutation
      ? resolve(root, `packages/${pkg}/src/${mutation.test}.wave2.test.ts`)
      : ''
    const intended = mutation
      ? controls
          .get(pkg)
          .filter((entry) => entry.file === targetFile && entry.title === mutation.title)
      : []
    if (mutation) assert.equal(intended.length, 1, `${id}: exact control test not found`)
    const fileTestCount = mutation
      ? controls.get(pkg).filter((entry) => entry.file === targetFile).length
      : expectedCounts[pkg]
    const pattern = mutation
      ? `${[...mutation.title]
          .map((char) => ('.+*?^$[](){}|\\'.includes(char) ? `\\${char}` : char))
          .join('')}$`
      : undefined
    if (mutation)
      assert.equal(
        readFileSync(target, 'utf8').split(mutation.from).length - 1,
        1,
        `${id}: needle not unique`,
      )
    writeFileSync(
      config,
      `import {readFileSync,writeFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(resolve(root, `packages/${pkg}`))},
plugins:mutation?[{name:'wave2-isolated-mutant',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('nonunique mutant');writeFileSync(${JSON.stringify(join(output, `${id}.entered`))},id);return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(mutation ? [`src/${mutation.test}.wave2.test.ts`] : includes)},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
    )
    const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
      cwd: root,
      encoding: 'utf8',
    })
    writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
    assert.equal(run.signal, null, `${id}: interrupted`)
    assert(
      !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(
        stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`),
      ),
      `${id}: unhandled runtime failure`,
    )
    const data = JSON.parse(readFileSync(report, 'utf8'))
    assert.equal(data.numTotalTests, fileTestCount, `${id}: collection scope drift`)
    assert.equal(data.numPendingTests, mutation ? fileTestCount - 1 : 0)
    assert.equal(data.numTodoTests, 0)
    assert(
      data.testResults.every((file) => !file.message),
      `${id}: suite error`,
    )
    const entries = data.testResults.flatMap((file) =>
      file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
    )
    assert.equal(entries.length, fileTestCount)
    assert.equal(new Set(entries.map((entry) => entry.fullName)).size, entries.length)
    const failed = entries.filter((entry) => entry.status === 'failed')
    if (!mutation) {
      assert.equal(run.status, 0, `${id}: failed control, see ${output}`)
      assert.equal(data.success, true)
      assert.equal(failed.length, 0)
      controls.set(pkg, entries)
    } else {
      assert.equal(
        readFileSync(join(output, `${id}.entered`), 'utf8'),
        target,
        `${id}: loader mutation not entered`,
      )
      assert.equal(run.status, 1, `${id}: mutant not red; see ${output}`)
      assert.equal(data.success, false)
      assert.equal(data.numPassedTests, 0, `${id}: ran an unintended case`)
      assert.equal(failed.length, 1, `${id}: expected exactly the targeted assertion`)
      assert(failed.every(isAssertion), `${id}: non-business failure`)
      assert.equal(
        failed.filter(
          (entry) => entry.file === targetFile && entry.fullName === intended[0].fullName,
        ).length,
        1,
        `${id}: intended candidate case did not fail`,
      )
    }
    for (const [path, previous] of Object.entries(hashes))
      assert.equal(hash(path), previous, `${id}: production modified`)
    evidence.push({
      id,
      exit: run.status,
      tests: data.numTotalTests,
      executed: data.numTotalTests - data.numPendingTests,
      filteredByExactName: data.numPendingTests,
      failed: failed.map((entry) => ({ file: entry.file, title: entry.fullName })),
    })
    console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
  }
}
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ hashes, pngSamples, evidence }, null, 2)}\n`,
)
console.log(`Wave2: ${packages.length} controls + ${cases.length} mutations passed. ${output}`)
