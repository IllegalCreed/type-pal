import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// CM1 explicitly includes the plan passed into Command, not just the result/base map.
// Reuse r1's load-only mutations, exact test identity, business-red and byte-hash checks.
const root = resolve(process.argv[2])
let runner = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'item-logic-review-witnesses.mjs'),
  'utf8',
)
const start = runner.indexOf('const probes = [\n')
const end = runner.indexOf('const results = []\n')
assert.ok(start > 0 && end > start)
const probes = [
  {
    id: 'group-command-plan-mutation',
    file: 'stamp-group-transform',
    module: 'stamp-group-command',
    from: 'structuredClone(plan.preparedPatch),',
    to: '(plan.mapRevision += 1, structuredClone(plan.preparedPatch)),',
    oracle: `const input=legalGroupMapWithOrdinarySentinel();
      const session=new EditSession(await editorStateWithMap('map-a',input));
      const plan=planStampGroupMove({mapId:'map-a',map:input,mapRevision:0,placementIds:['tree-a','tree-b'],targetAnchor:{row:0,col:1},permission:writable});
      expect(plan.canApply).toBe(true);const before=structuredClone(plan);
      const command=new TransformStampPlacementsCommand(plan);
      expect(session.dispatch(command)).toBe(true);expect(plan).toEqual(before);`,
  },
  {
    id: 'placement-command-plan-mutation',
    file: 'stamp-placement',
    module: 'stamp-placement-command',
    from: 'structuredClone(plan.preparedPatch),',
    to: '(plan.mapRevision += 1, structuredClone(plan.preparedPatch)),',
    oracle: `const input=legalBlankMap(8,8),template=legalDraftTemplate();
      const session=new EditSession(await editorStateWithMap('map-a',input));
      const plan=planStampPlacement({mapId:'map-a',map:input,mapRevision:0,template,anchor:{row:2,col:2},placementBaseHeight:1,mappings:[{layerSlotId:'base',targetLayerId:'floor'}],permission:{hiddenLayerIds:[],lockedLayerIds:[]},availableTileIdsByTileset:new Map([['tiles',new Set([1])]]),conflictPolicy:'reject'});
      expect(plan.canApply).toBe(true);const before=structuredClone(plan);
      const command=new PlaceStampCommand(plan);
      expect(session.dispatch(command)).toBe(true);expect(plan).toEqual(before);`,
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
  `for (const probe of probes) { const production=resolve(root, \`packages/editor/src/core/\${probe.module}.ts\`);`,
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
replaceOnce('},()=>{', '},async()=>{')
replaceOnce('codex-item-logic-review-', 'codex-map-r2-plan-')
const output = mkdtempSync(join(tmpdir(), 'codex-map-r2-plan-runner-'))
const path = join(output, 'runner.mjs')
writeFileSync(path, runner)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const result = spawnSync(process.execPath, [path, root], { env, stdio: 'inherit' })
assert.equal(result.signal, null)
assert.equal(result.status, 0)
