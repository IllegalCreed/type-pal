import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Reuse the independently checked source-hash/exit/AssertionError judge; change only scope/probes.
const root = resolve(process.argv[2])
const directory = dirname(fileURLToPath(import.meta.url))
let runner = readFileSync(join(directory, 'item-logic-review-witnesses.mjs'), 'utf8')
const start = runner.indexOf('const probes = [\n')
const end = runner.indexOf('const results = []\n')
assert.ok(start > 0 && end > start)
const probes = [
  {
    id: 'draft-move-input-mutation',
    file: 'stamp-draft',
    from: 'return { ...draft, layers }\n}\n\nexport function stampDraftBounds',
    to: 'draft.layers = layers; return draft\n}\n\nexport function stampDraftBounds',
    oracle: `const input=painted(2);const before=structuredClone(input);
      const out=moveStampDraftSelection(input,{kind:'visual',layerSlotId:'base'},[point(8,7)],'down');
      expect(out).not.toBeUndefined();expect(input).toEqual(before);`,
  },
  {
    id: 'selection-reducer-input-mutation',
    file: 'map-selection',
    from: 'return { maps: { ...state.maps, [action.mapId]: next } }',
    to: 'state.maps[action.mapId] = next; return state',
    oracle: `const input=createMapWorkspaceState(),before=structuredClone(input);
      const out=mapWorkspaceReducer(input,{type:'toggle-hidden-layer',mapId:'start',layerId:'objects'});
      expect(mapWorkspaceDocument(out,'start').hiddenLayerIds).toEqual(['objects']);
      expect(input).toEqual(before);`,
  },
  {
    id: 'stamp-group-lost-height',
    file: 'stamp-group-transform',
    from: "heightWrites.set(key, { channel: 'height', ref, value: member.height })",
    to: "heightWrites.set(key, { channel: 'height', ref, value: 0 })",
    oracle: `const input=legalGroupMap(false);
      const plan=planStampGroupMove({mapId:'map-a',map:input,mapRevision:0,placementIds:['tree-a'],targetAnchor:{row:2,col:1},permission:writable});
      expect(plan.canApply).toBe(true);
      const session=new EditSession(editorStateWithMap('map-a',input));
      expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true);
      const after=session.getState().maps['map-a'];
      expect(after.layers.find(layer=>layer.id==='objects').heights?.[3]?.[1]).toBe(3);`,
  },
]
runner = `${runner.slice(0, start)}const probes = ${JSON.stringify(probes)}\n${runner.slice(end)}`
function replaceOnce(from, to) {
  assert.equal(runner.split(from).length, 2, from)
  runner = runner.replace(from, to)
}
replaceOnce("const production = resolve(root, 'packages/content/src/item.ts')\n", '')
replaceOnce(
  'for (const probe of probes) {',
  `for (const probe of probes) {
 const production=resolve(root, \`packages/editor/src/core/\${probe.file}.ts\`)`,
)
replaceOnce(
  `packages/content/src/item.\${probe.file}.background.test.ts`,
  `packages/editor/src/core/\${probe.file}.background.test.ts`,
)
replaceOnce(
  'packages/content/src/__tests__/glm-item-logic-fixtures.ts',
  'packages/editor/src/core/__tests__/cursor-map-logic-fixtures.ts',
)
replaceOnce("resolve(root, 'packages/content')", "resolve(root, 'packages/editor')")
replaceOnce(
  `src/item.\${probe.file}.background.test.ts`,
  `src/core/\${probe.file}.background.test.ts`,
)
replaceOnce('codex-item-logic-review-', 'codex-cursor-map-review-')
const output = mkdtempSync(join(tmpdir(), 'codex-cursor-map-runner-'))
const path = join(output, 'runner.mjs')
writeFileSync(path, runner)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const result = spawnSync(process.execPath, [path, root], { env, stdio: 'inherit' })
assert.equal(result.signal, null)
assert.equal(result.status, 0)

// Exercise the candidate's actual judge, not a rewritten review-side predicate.
const candidateJudge = readFileSync(
  join(root, 'docs/testing/cursor-map-logic-r2/module-mutants.mjs'),
  'utf8',
)
const helpers = candidateJudge.slice(
  candidateJudge.indexOf('function resolveReportedFile('),
  candidateJudge.indexOf('function run(spec, config, paths)'),
)
const judgeRed = new Function('path', `${helpers};return judgeRed;`)({ resolve })
const spec = { title: 'target', fullName: 'suite target' }
const judgeCases = ['TypeError: broken', '  TypeError: broken', '\tError: broken'].map((header) => {
  const message = `AssertionError: wrong result\n${header}`
  const judged = judgeRed({
    status: 1,
    json: {
      testResults: [
        {
          name: '/abs/target.test.ts',
          assertionResults: [{ ...spec, status: 'failed', failureMessages: [message] }],
        },
      ],
      numFailedTests: 1,
    },
    spec,
    testFileAbsolute: '/abs/target.test.ts',
    before: 'same',
    after: 'same',
    hit: true,
  })
  return { message, accepted: judged.ok }
})
writeFileSync(join(output, 'judge.json'), JSON.stringify(judgeCases, null, 2))
console.log('candidate judge', JSON.stringify(judgeCases))

// Inspect actual factories under Vite (plain tsx cannot load reforge's import.meta.glob).
const test = resolve(root, 'packages/editor/src/core/stamp-group-transform.background.test.ts')
const facts = join(output, 'fixture.json')
const report = join(output, 'fixture-tests.json')
const config = join(output, 'fixture.config.mjs')
const extra = `\nimport {writeFileSync as codexWriteFacts} from 'node:fs';
test('Codex actual fixture contracts',async()=>{
  const {validateProjectMap,validateCurrentManifestStartup}=await import('@type-pal/content');
  const {legalBlankMap,legalPaintedMap,legalGroupMap,editorStateWithMap}=await import('./__tests__/cursor-map-logic-fixtures.js');
  const maps={blank:legalBlankMap(),painted:legalPaintedMap(),group:legalGroupMap()};
  for(const map of Object.values(maps))expect(()=>validateProjectMap(map)).not.toThrow();
  const state=editorStateWithMap('map-a',maps.group);let rejection;
  try{validateCurrentManifestStartup(state.manifest)}catch(error){rejection=error.message}
  codexWriteFacts(${JSON.stringify(facts)},JSON.stringify({maps:Object.keys(maps),manifest:state.manifest,rejection}));
});`
writeFileSync(
  config,
  `import {readFileSync}from'node:fs';export default{root:${JSON.stringify(resolve(root, 'packages/editor'))},plugins:[{name:'codex-fixture',enforce:'pre',load(id){if(id===${JSON.stringify(test)})return readFileSync(id,'utf8')+${JSON.stringify(extra)}}}],test:{include:['src/core/stamp-group-transform.background.test.ts'],maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}}`,
)
const fixtureRun = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
  cwd: root,
  env,
  encoding: 'utf8',
  timeout: 60000,
})
writeFileSync(join(output, 'fixture.log'), `${fixtureRun.stdout}\n${fixtureRun.stderr}`)
assert.equal(fixtureRun.signal, null)
assert.equal(fixtureRun.status, 0)
console.log('actual fixtures', readFileSync(facts, 'utf8'))
console.log('supplementary evidence', output)
