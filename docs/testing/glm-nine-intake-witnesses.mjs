// Codex independent nine-batch review. No candidate files are modified.
// node docs/testing/glm-nine-intake-witnesses.mjs [--census-only]
// A zero exit means the diagnostic ran; read MISSED/criterion/fixture verdicts.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const batches = [
  {
    n: '02',
    root: '/Users/zhangxu/illegal/type-pal-glm-asset-io',
    sha: 'a7c48d9c',
    pkg: ['reforge'],
    card: 'TEST-REFORGE-ASSET-IO-1-read-cache-sfx',
    tool: 'docs/testing/glm-reforge-asset-io-mutants.mjs',
    pack: 'docs/testing/glm-reforge-asset-io.md',
    evidence: 'docs/testing/glm-reforge-asset-io-evidence.json',
    config: 'docs/testing/glm-reforge-asset-io.config.mts',
    tests: [
      'packages/reforge/src/audio/sfx-readiness.collections.test.ts',
      'packages/reforge/src/audio/sfx.staged-failures.test.ts',
      'packages/reforge/src/engine-chrome/registry.lifecycle.test.ts',
      'packages/reforge/src/file-source.cancel-windows.test.ts',
      'packages/reforge/src/fsa-source.cancel-windows.test.ts',
      'packages/reforge/src/project-image-cache.lifecycle.test.ts',
    ],
  },
  {
    n: '03',
    root: '/Users/zhangxu/illegal/type-pal-glm-import-codec',
    sha: 'f4c229ed',
    pkg: ['editor'],
    card: 'TEST-EDITOR-IMPORT-CODEC-1-workers-metadata',
    tool: 'docs/testing/glm-import-codec-mutants.mjs',
    pack: 'docs/testing/glm-editor-import-codec.md',
    evidence: 'docs/testing/glm-import-codec-evidence.json',
    config: 'docs/testing/glm-import-codec.config.mts',
    tests: [
      'packages/editor/src/core/battle-sprite-import.boundaries.test.ts',
      'packages/editor/src/core/frame-animation-codec.tpfs.test.ts',
      'packages/editor/src/core/frame-animation-codec.worker.test.ts',
      'packages/editor/src/core/frame-animation-images.boundaries.test.ts',
      'packages/editor/src/core/frame-animation-worker-client.boundaries.test.ts',
      'packages/editor/src/core/image-import.stages.test.ts',
      'packages/editor/src/core/video-metadata.boxes.test.ts',
    ],
  },
  {
    n: '04',
    root: '/Users/zhangxu/illegal/type-pal-glm-pal-tables',
    sha: '851a6ede',
    pkg: ['pal-extract'],
    card: 'TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs',
    tool: 'docs/testing/glm-pal-tables-mutants.mjs',
    pack: 'docs/testing/glm-pal-tables.md',
    evidence: 'docs/testing/glm-pal-tables-evidence.json',
    config: 'docs/testing/glm-pal-tables.config.mts',
    tests: [
      'packages/pal-extract/src/io/msg.boundaries.test.ts',
      'packages/pal-extract/src/io/sss.boundaries.test.ts',
      'packages/pal-extract/src/io/word.boundaries.test.ts',
      'packages/pal-extract/src/resources/enemy-pos.boundaries.test.ts',
      'packages/pal-extract/src/resources/parsers/__tests__/battle-fields.boundaries.test.ts',
      'packages/pal-extract/src/resources/parsers/__tests__/data-misc.boundaries.test.ts',
      'packages/pal-extract/src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts',
      'packages/pal-extract/src/resources/parsers/__tests__/items.boundaries.test.ts',
      'packages/pal-extract/src/resources/parsers/__tests__/stores.boundaries.test.ts',
    ],
  },
  {
    n: '05',
    root: '/Users/zhangxu/illegal/type-pal-glm-resource-tools',
    sha: 'd083e5c6',
    pkg: ['shared', 'pal-extract'],
    card: 'TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font',
    tool: 'docs/testing/glm-resource-tools-mutants.mjs',
    pack: 'docs/testing/glm-resource-tools.md',
    evidence: 'docs/testing/glm-resource-tools-evidence.json',
    config: 'docs/testing/glm-resource-tools.config.mts',
    tests: [
      'packages/pal-extract/src/__tests__/asset-manifest.boundaries.test.ts',
      'packages/pal-extract/src/events/disasm.boundaries.test.ts',
      'packages/pal-extract/src/events/recompile.boundaries.test.ts',
      'packages/pal-extract/src/events/slice.boundaries.test.ts',
      'packages/pal-extract/src/font/__tests__/bdf-to-json.boundaries.test.ts',
      'packages/pal-extract/src/resources/palette.boundaries.test.ts',
      'packages/shared/src/rle-encode.boundaries.test.ts',
      'packages/shared/src/rle.boundaries.test.ts',
    ],
  },
  {
    n: '06',
    root: '/Users/zhangxu/illegal/type-pal-glm-editor-map-data',
    sha: '0563eda7',
    pkg: ['editor'],
    card: 'TEST-EDITOR-MAP-DATA-1-selection-stamps',
    tool: 'docs/testing/glm-editor-map-data-mutants.mjs',
    pack: 'docs/testing/glm-editor-map-data.md',
    evidence: 'docs/testing/glm-editor-map-data-evidence.json',
    config: 'docs/testing/glm-editor-map-data.config.mts',
    tests: [
      'packages/editor/src/core/map-patch.boundaries.test.ts',
      'packages/editor/src/core/map-selection.boundaries.test.ts',
      'packages/editor/src/core/map-transform.boundaries.test.ts',
      'packages/editor/src/core/stamp-draft.boundaries.test.ts',
      'packages/editor/src/core/stamp-group-transform.boundaries.test.ts',
      'packages/editor/src/core/stamp-placement.boundaries.test.ts',
      'packages/editor/src/core/stamp-template.boundaries.test.ts',
    ],
  },
  {
    n: '07',
    root: '/Users/zhangxu/illegal/type-pal-glm-script-helpers',
    sha: '90369143',
    pkg: ['editor'],
    card: 'TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries',
    tool: 'docs/testing/glm-editor-script-helpers-mutants.mjs',
    pack: 'docs/testing/glm-editor-script-helpers.md',
    evidence: 'docs/testing/glm-editor-script-helpers-evidence.json',
    config: 'docs/testing/glm-editor-script-helpers.config.mts',
    tests: [
      'packages/editor/src/core/author-command-edit.boundaries.test.ts',
      'packages/editor/src/core/item-alchemy.boundaries.test.ts',
      'packages/editor/src/core/item-authoring.boundaries.test.ts',
      'packages/editor/src/core/script-editor-projection.boundaries.test.ts',
      'packages/editor/src/core/script-reference-catalog.boundaries.test.ts',
      'packages/editor/src/ui/enemy-defeated-events.boundaries.test.ts',
    ],
  },
  {
    n: '08',
    root: '/Users/zhangxu/illegal/type-pal-glm-game-menu',
    sha: 'b1deae49',
    pkg: ['game'],
    card: 'TEST-GAME-MENU-BOUNDARIES-1-navigation-requests',
    tool: 'docs/testing/glm-game-menu-boundaries-mutants.mjs',
    pack: 'docs/testing/glm-game-menu-boundaries.md',
    evidence: 'docs/testing/glm-game-menu-boundaries-evidence.json',
    config: 'docs/testing/glm-game-menu-boundaries.config.mts',
    tests: [
      'packages/game/src/core/menu/equip-menu.boundaries.test.ts',
      'packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts',
      'packages/game/src/core/menu/in-game-menu.boundaries.test.ts',
      'packages/game/src/core/menu/inventory-menu.boundaries.test.ts',
      'packages/game/src/core/menu/magic-select.boundaries.test.ts',
      'packages/game/src/core/menu/primitives.boundaries.test.ts',
      'packages/game/src/core/menu/sell-menu.boundaries.test.ts',
      'packages/game/src/core/menu/shop-menu.boundaries.test.ts',
    ],
  },
  {
    n: '09',
    root: '/Users/zhangxu/illegal/type-pal-glm-game-host',
    sha: '61f0af34',
    pkg: ['game'],
    card: 'TEST-GAME-HOST-BOUNDARIES-1-privacy-timer',
    tool: 'docs/testing/glm-game-host-boundaries-mutants.mjs',
    pack: 'docs/testing/glm-game-host-boundaries.md',
    evidence: 'docs/testing/glm-game-host-boundaries-evidence.json',
    config: 'docs/testing/glm-game-host-boundaries.config.mts',
    tests: [
      'packages/game/src/analytics/analytics-consent.boundaries.test.ts',
      'packages/game/src/analytics/google-analytics.boundaries.test.ts',
      'packages/game/src/shell/audio-volume.boundaries.test.ts',
      'packages/game/src/shell/fetch-retry.boundaries.test.ts',
      'packages/game/src/shell/input.boundaries.test.ts',
      'packages/game/src/tools/speedrun/time-format.boundaries.test.ts',
      'packages/game/src/tools/speedrun/timer.boundaries.test.ts',
    ],
  },
  {
    n: '10',
    root: '/Users/zhangxu/illegal/type-pal-glm-migration',
    sha: 'bd597558',
    pkg: ['migrate'],
    card: 'TEST-MIGRATION-BOUNDARIES-1-current-isolated-io',
    tool: 'docs/testing/glm-migration-boundaries-mutants.mjs',
    pack: 'docs/testing/glm-migration-boundaries.md',
    evidence: 'docs/testing/glm-migration-boundaries-evidence.json',
    config: 'docs/testing/glm-migration-boundaries.config.mts',
    tests: [
      'packages/migrate/src/migration-project-io.boundaries.test.ts',
      'packages/migrate/src/migration-transaction.boundaries.test.ts',
      'packages/migrate/src/migration-write-plan.boundaries.test.ts',
      'packages/migrate/src/pal-authored-overlays.boundaries.test.ts',
      'packages/migrate/src/pal-item-scheme-labels.boundaries.test.ts',
      'packages/migrate/src/pal-store-boundary.boundaries.test.ts',
      'packages/migrate/src/project-map-converter.boundaries.test.ts',
      'packages/migrate/src/source-facts.boundaries.test.ts',
    ],
  },
]
const probes = [
  {
    n: '02',
    pkg: 'reforge',
    id: 'fsa-invalid-json-swallowed',
    file: 'src/fsa-source.ts',
    tests: ['src/fsa-source.cancel-windows.test.ts'],
    from: '      return JSON.parse(text) as T',
    to: '      try { return JSON.parse(text) as T } catch { return {} as T }',
    oracle:
      "const {fsaSource}=await import(SRC+'/fsa-source.ts');const source=fsaSource({getFileHandle:async()=>({getFile:async()=>({text:async()=>'{bad'})})});\nconst outcome=await source.readJson('bad.json').then(()=>({ok:true}),e=>({ok:false,name:e.name}));expect(outcome).toEqual({ok:false,name:'SyntaxError'});",
  },
  {
    n: '03',
    pkg: 'editor',
    id: 'quantize-mutates-actual-input',
    file: 'src/core/frame-animation-codec.ts',
    tests: ['src/core/frame-animation-codec.tpfs.test.ts'],
    from: '    return rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength) as ArrayBuffer',
    to: '    new Uint8Array(frame).set(rgba);\n    return rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength) as ArrayBuffer',
    oracle:
      "const {quantizeFrameAnimationRequest}=await import(SRC+'/core/frame-animation-codec.ts');const rgba=new Uint8Array([250,1,1,255]);const before=rgba.slice();\nconst out=quantizeFrameAnimationRequest({width:1,height:1,colors:[[255,0,0]],mode:'nearest',frames:[rgba.buffer]});expect(new Uint8Array(out[0])).toEqual(new Uint8Array([255,0,0,255]));expect(rgba).toEqual(before);",
  },
  {
    n: '04',
    pkg: 'pal-extract',
    id: 'sss-mutates-consumed-buffer',
    file: 'src/io/sss.ts',
    tests: ['src/io/sss.boundaries.test.ts'],
    from: '  const chunk4 = readChunk(mkf, 4)',
    to: '  const chunk4 = readChunk(mkf, 4)\n  buf[0] = buf[0] ^ 1',
    oracle:
      "const {parseSss}=await import(SRC+'/io/sss.ts');const {mkfContainer,sssChunks}=await import(SRC+'/__tests__/glm-tb04-fixtures.ts');const buf=mkfContainer(sssChunks());const before=buf.slice();parseSss(buf);expect(buf).toEqual(before);",
  },
  {
    n: '06',
    pkg: 'editor',
    id: 'patch-mutates-actual-permission',
    file: 'src/core/map-patch.ts',
    tests: ['src/core/map-patch.boundaries.test.ts'],
    from: "  return prepareProjectMapPatchWithOwnership(map, patch, permission, { kind: 'ordinary' })",
    to: "  permission.hiddenLayerIds.push('__witness');\n  return prepareProjectMapPatchWithOwnership(map, patch, permission, { kind: 'ordinary' })",
    oracle:
      "const {prepareProjectMapPatch}=await import(SRC+'/core/map-patch.ts');const {buildBlankProjectMap}=await import(ROOT+'/packages/reforge/src/index.ts');const map=buildBlankProjectMap(2,2,'ts');const p={requiredWritableLayerIds:['floor'],hiddenLayerIds:[],lockedLayerIds:[]};const before=structuredClone(p);prepareProjectMapPatch(map,{visual:[],collision:[]},p);expect(p).toEqual(before);",
  },
  {
    n: '08',
    pkg: 'game',
    id: 'equip-done-phase-is-mutated',
    file: 'src/core/menu/equip-menu.ts',
    tests: ['src/core/menu/equip-menu.boundaries.test.ts'],
    from: "  if (state.phase !== 'list') return\n  const slot = state.list.inventory[state.list.cursor]",
    to: "  if (state.phase !== 'list') { state.phase='list'; return }\n  const slot = state.list.inventory[state.list.cursor]",
    oracle:
      "const {createEquipMenu,confirmEquipItem}=await import(SRC+'/core/menu/equip-menu.ts');const {createInitialGameState}=await import(SRC+'/core/game-state.ts');const gs=createInitialGameState({x:0,y:0,facing:'down'});const s=createEquipMenu(gs,[]);s.phase='done';const before=structuredClone(s);confirmEquipItem(s,[],{roles:{}},[]);expect(s).toEqual(before);",
  },
  {
    n: '09',
    pkg: 'game',
    id: 'request-method-ignores-init-override',
    file: 'src/shell/fetch-retry.ts',
    tests: ['src/shell/fetch-retry.boundaries.test.ts'],
    from: "      init?.method ??\n      (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')",
    to: "      (typeof Request !== 'undefined' && input instanceof Request ? input.method : (init?.method ?? 'GET'))",
    oracle:
      "const {installFetchRetry,uninstallFetchRetryForTest}=await import(SRC+'/shell/fetch-retry.ts');const original=globalThis.fetch;let calls=0;try{globalThis.fetch=async()=>{calls++;return new Response('gateway',{status:503})};installFetchRetry({retries:1,backoffMs:[0]});const response=await fetch(new Request('https://invalid.test/x',{method:'GET'}),{method:'POST'});expect(response.status).toBe(503);expect(calls).toBe(1);}finally{uninstallFetchRetryForTest(original);}",
  },
  {
    n: '10',
    pkg: 'migrate',
    id: 'writer-mutates-baseline-json',
    file: 'src/migration-write-plan.ts',
    tests: ['src/migration-write-plan.boundaries.test.ts'],
    from: '  return changes\n}',
    to: "  for(const value of nextBaseline.files.values()) if(value && typeof value==='object' && !Array.isArray(value)) value.__witness=1;\n  return changes\n}",
    oracle:
      "const {buildMigrationTransactionChanges}=await import(SRC+'/migration-write-plan.ts');const nextBaseline={files:new Map([['a.json',{x:1}],['b.json',{x:2}]]),managedFiles:new Set(['a.json','b.json'])};const before=structuredClone(nextBaseline);buildMigrationTransactionChanges({repo:OUT,plan:{writes:new Map(),deletes:[]},nextBaseline});expect(nextBaseline).toEqual(before);",
  },
]
const out = realpathSync(mkdtempSync(join(tmpdir(), 'codex-nine-review-')))
console.log(JSON.stringify({ outputDirectory: out }))
const ts = createRequire(join(batches[0].root, 'package.json'))('typescript')
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const criterion = []
for (const b of batches) {
  const path = join(b.root, b.tool),
    text = readFileSync(path, 'utf8')
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const globalBlocks = [],
    pinBlocks = []
  function visit(n) {
    if (ts.isIfStatement(n)) {
      if (n.expression.getText(ast) === 'item.expected === 1')
        globalBlocks.push(n.thenStatement.getText(ast))
      if (n.expression.getText(ast) === 'item.redTest !== undefined')
        pinBlocks.push(n.thenStatement.getText(ast))
    }
    ts.forEachChild(n, visit)
  }
  visit(ast)
  assert.equal(globalBlocks.length, 1)
  assert.equal(pinBlocks.length, 1)
  const check = new Function(
    'assert',
    'item',
    'output',
    'assertions',
    'log',
    `${globalBlocks[0]}\n${pinBlocks[0]}`,
  )
  const item = { name: 'review', redTest: 'target', expected: 1 }
  // A negative rejection only counts after the same extracted runtime predicate
  // accepts a valid control. Missing helper/context must never look like a fix.
  check(
    assert,
    item,
    'MUTATION_HIT review\nAssertionError: expected 1 to equal 2',
    [
      {
        title: 'target',
        status: 'failed',
        failureMessages: ['AssertionError: expected 1 to equal 2'],
      },
    ],
    'synthetic-control',
  )
  const message = 'Error: decoder rejected input\nCaused by AssertionError: nested detail'
  let accepted = true
  try {
    check(
      assert,
      item,
      `MUTATION_HIT review\n${message}`,
      [{ title: 'target', status: 'failed', failureMessages: [message] }],
      'synthetic',
    )
  } catch (error) {
    assert(error instanceof assert.AssertionError, 'Unsupported runtime predicate capture')
    accepted = false
  }
  criterion.push({ batch: b.n, ordinaryErrorWithNestedAssertionAccepted: accepted, tool: path })
}
console.log(JSON.stringify({ criterion }))
function declarations(path) {
  const text = readFileSync(path, 'utf8'),
    ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  return ts
    .transpileModule(
      ast.statements
        .filter((n) => ts.isVariableStatement(n) || ts.isFunctionDeclaration(n))
        .map((n) => n.getText(ast))
        .join('\n'),
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
    )
    .outputText.replaceAll('export ', '')
}
const fixtureSpecs = [
  {
    n: '02',
    file: 'packages/reforge/src/__tests__/glm-asset-io-fixtures.ts',
    expression: 'soundItem("x")',
    guard: 'validateItems',
    array: true,
  },
  {
    n: '07',
    file: 'packages/editor/src/core/author-command-edit.boundaries.test.ts',
    expression: '({s:{name:"s",self:"none",body}})',
    guard: 'validateAuthorSharedScripts',
  },
  {
    n: '07',
    file: 'packages/editor/src/core/script-editor-projection.boundaries.test.ts',
    expression: 'makeCanonical().scenes',
    guard: 'validateAuthorScenes',
  },
  {
    n: '07',
    file: 'packages/editor/src/core/item-alchemy.boundaries.test.ts',
    expression: 'gourdItem("g")',
    guard: 'validateItems',
    array: true,
  },
  {
    n: '10',
    file: 'packages/migrate/src/pal-item-scheme-labels.boundaries.test.ts',
    expression: 'args().scenes',
    guard: 'validateAuthorScenes',
  },
]
const fixtures = []
for (const spec of fixtureSpecs) {
  const b = batches.find((b) => b.n === spec.n),
    file = join(b.root, spec.file)
  const module = declarations(file)
  const script =
    'import * as c from ' +
    JSON.stringify(join(b.root, 'packages/content/src/index.ts')) +
    ';\n' +
    module +
    '\ntry{const value=' +
    spec.expression +
    ';c[' +
    JSON.stringify(spec.guard) +
    '](' +
    (spec.array ? '[value]' : 'value') +
    ');console.log(JSON.stringify({verdict:"accepted"}))}catch(e){console.log(JSON.stringify({verdict:"rejected",reason:e.message}))}'
  const r = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: b.root,
    encoding: 'utf8',
    timeout: 30000,
  })
  assert.equal(r.status, 0, r.stderr)
  fixtures.push({ ...spec, ...JSON.parse(r.stdout) })
}
console.log(JSON.stringify({ fixtures }))
const results = []
if (!process.argv.includes('--census-only'))
  for (const p of probes) {
    const b = batches.find((b) => b.n === p.n),
      src = join(b.root, 'packages', p.pkg, 'src'),
      file = join(b.root, 'packages', p.pkg, p.file)
    const tracked = [file, ...p.tests.map((f) => join(b.root, 'packages', p.pkg, f))]
    const hashes = Object.fromEntries(tracked.map((f) => [f, sha(f)]))
    assert.equal(readFileSync(file, 'utf8').split(p.from).length, 2, `${p.id}: unique point`)
    const oracleFile = join(out, `${p.id}.test.ts`),
      title = `Codex independent oracle: ${p.id}`
    writeFileSync(
      oracleFile,
      'import {expect,test} from ' +
        JSON.stringify(join(b.root, 'node_modules/vitest/dist/index.js')) +
        ';\n' +
        'const SRC=' +
        JSON.stringify(src) +
        ',ROOT=' +
        JSON.stringify(b.root) +
        ',OUT=' +
        JSON.stringify(out) +
        ';\n' +
        'test(' +
        JSON.stringify(title) +
        ',async()=>{' +
        p.oracle +
        '});\n',
    )
    for (const mutated of [false, true]) {
      const label = `${p.id}-${mutated ? 'mutant' : 'control'}`,
        config = join(out, `${label}.config.mjs`),
        reportPath = join(out, `${label}.json`)
      const point = { file, from: p.from, to: p.to, mutated, label }
      const settings = {
        include: [...p.tests, oracleFile],
        maxWorkers: 1,
        fileParallelism: false,
        ...(p.pkg === 'game'
          ? { environment: 'jsdom', setupFiles: [join(b.root, 'packages/game/vitest.setup.ts')] }
          : {}),
      }
      writeFileSync(
        config,
        'import {readFileSync} from "node:fs";import assert from "node:assert/strict";const p=' +
          JSON.stringify(point) +
          ';\n' +
          'export default {root:' +
          JSON.stringify(join(b.root, 'packages', p.pkg)) +
          ',plugins:[{name:"codex-nine-review",enforce:"pre",load(id){if(!p.mutated||id.split("?")[0]!==p.file)return;const s=readFileSync(p.file,"utf8");assert.equal(s.split(p.from).length,2);console.log("WITNESS_LOADED",p.label);return s.replace(p.from,p.to)}}],test:' +
          JSON.stringify(settings) +
          '};\n',
      )
      const run = spawnSync(
        'pnpm',
        [
          '--filter',
          `@type-pal/${p.pkg}`,
          'exec',
          'vitest',
          'run',
          '--config',
          config,
          '--reporter=json',
          '--outputFile',
          reportPath,
        ],
        { cwd: b.root, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 },
      )
      assert.equal(run.signal, null, `${label}: interrupted`)
      const report = JSON.parse(readFileSync(reportPath, 'utf8'))
      const tests = report.testResults.flatMap((f) => f.assertionResults)
      const oracle = tests.find((t) => t.title === title),
        candidate = tests.filter((t) => t.title !== title)
      assert(oracle && candidate.length > 0, `${label}: all tests must execute`)
      const failures = candidate.filter((t) => t.status === 'failed')
      const messages = tests.flatMap((t) => t.failureMessages ?? [])
      const log = `${run.stdout}\n${run.stderr}\n${messages.join('\n')}`
      writeFileSync(join(out, `${label}.log`), log)
      assert(
        candidate.every((t) => t.status === 'passed' || t.status === 'failed'),
        'no skip/pending',
      )
      const business = (ms) =>
        ms.length > 0 && ms.every((m) => /^AssertionError(?:\b|:)/.test(m.split('\n', 1)[0] ?? ''))
      if (!mutated) {
        assert.equal(run.status, 0, `${label}: original must pass`)
        assert(tests.every((t) => t.status === 'passed'))
      } else {
        assert.equal(run.status, 1, `${label}: oracle must detect`)
        assert.equal(oracle.status, 'failed')
        assert(business(oracle.failureMessages ?? []))
        assert(log.includes(`WITNESS_LOADED ${label}`))
      }
      const invalid = failures.some((t) => !business(t.failureMessages ?? []))
      results.push({
        batch: p.n,
        id: p.id,
        mode: mutated ? 'mutant' : 'control',
        exit: run.status,
        candidateTests: candidate.length,
        candidateFailures: failures.map((t) => ({ name: t.fullName, messages: t.failureMessages })),
        verdict: !mutated
          ? 'control'
          : invalid
            ? 'invalid-candidate-failure'
            : failures.length
              ? 'detected'
              : 'MISSED',
        report: reportPath,
      })
      console.log(JSON.stringify(results.at(-1)))
    }
    for (const [path, hash] of Object.entries(hashes)) assert.equal(sha(path), hash, path)
  }
writeFileSync(
  join(out, 'summary.json'),
  `${JSON.stringify({ batches, criterion, fixtures, results }, null, 2)}\n`,
)
console.log(JSON.stringify({ outputDirectory: out, summary: join(out, 'summary.json') }))
