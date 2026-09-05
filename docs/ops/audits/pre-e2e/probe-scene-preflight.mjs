// Audit evidence, baseline 84434b8a; no product changes or real asset/network/storage I/O.
// node --import tsx docs/ops/audits/pre-e2e/probe-scene-preflight.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as content from '../../../../packages/content/src/index.ts'
import { expectDefined } from '../../../../packages/reforge/src/defined.ts'
import { Canvas2DRenderer } from '../../../../packages/reforge/src/render.ts'
import {
  projectedWorldScriptScratch,
  runtimeSceneView,
} from '../../../../packages/reforge/src/runtime-project-view.ts'
import { SceneEntrySession } from '../../../../packages/reforge/src/scene-entry-session.ts'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
} from '../../../../packages/reforge/src/scene-switch-transaction.ts'
import { resolveSceneSpawn } from '../../../../packages/reforge/src/scene-transition.ts'
import { selectBaseSceneHooks } from '../../../../packages/reforge/src/script-world.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined')
const originalFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Audit forbids network')
}
const source = readFileSync(
  new URL('../../../../packages/reforge/src/main.ts', import.meta.url),
  'utf8',
)
const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set([
  'getSceneDef',
  'runnableStages',
  'sceneScriptBinding',
  'bindingSceneEntry',
  'prepareSceneSwitch',
  'assertSceneSwitchPlanCurrent',
  'hostSceneEntryReveal',
])
const definitions = new Map()
function visit(node) {
  if (
    (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name) &&
    names.has(node.name.text)
  ) {
    assert(!definitions.has(node.name.text), `ambiguous original function ${node.name.text}`)
    definitions.set(
      node.name.text,
      ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
    )
  }
  ts.forEachChild(node, visit)
}
visit(ast)
assert.equal(definitions.size, names.size)
const js = ts.transpileModule([...definitions.values()].join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const factory = new Function(
  'env',
  `with(env) { ${js}; return {prepareSceneSwitch, assertSceneSwitchPlanCurrent, hostSceneEntryReveal}; }`,
)
const hook = (label, reveal) => ({
  label,
  order: 0,
  flow: {
    kind: 'stages',
    initial: 'initial',
    stages: [{ id: 'initial', body: [], entry: { prepare: [], reveal } }],
  },
})
const definition = {
  id: 'target',
  mapId: 'map',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  hooks: {
    onEnter: {
      initial: 'before',
      variants: {
        before: hook('before', { kind: 'fade', outMs: 10, inMs: 10 }),
        after: hook('after', { kind: 'cut' }),
      },
    },
  },
}
const actor = {
  id: 'hero',
  name: 'hero',
  spriteId: 'sprite',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}
const world = content.buildWorld({ party: ['hero'], money: 0, inventory: [] }, { hero: actor })
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const entered = deferred(),
  assets = deferred()
const sprite = { id: 'sprite', asset: 'sprite.asset' }
const session = new SceneEntrySession()
const env = {
  ...content,
  world,
  canonicalScript: world.script,
  runtimeSceneView,
  projectedWorldScriptScratch,
  captureSceneSwitchDependencies,
  assertSceneSwitchDependenciesCurrent,
  Canvas2DRenderer,
  resolveSceneSpawn,
  expectDefined,
  actorSpriteOverrides: new Map(),
  project: { actorsById: { hero: actor } },
  ctx: {},
  getCanonicalScene: async () => definition,
  requireSpriteDef: () => sprite,
  getMapAssets: async () => {
    entered.resolve()
    await assets.promise
    return { map: { width: 1, height: 1 }, tilesets: new Map() }
  },
  getStandardPalette: async () => ({ colors: [] }),
  spriteCache: { load: async () => ({ frames: [] }) },
  prepareSceneSounds: async () => {},
  sceneEntrySession: session,
  assertRunnerActive: (signal) => signal?.throwIfAborted(),
  markSceneLoad() {},
}
try {
  const api = factory(env)
  const preparing = api.prepareSceneSwitch('target', world)
  await entered.promise // Actual main function already captured dependencies and projected the old hook.
  selectBaseSceneHooks(world.script, definition, { onEnter: { kind: 'use', value: 'after' } })
  assets.resolve()
  const plan = await preparing
  assert.doesNotThrow(() => api.assertSceneSwitchPlanCurrent(plan, world))
  const current = runtimeSceneView(definition, world.script).onEnter[0].entry
  assert.equal(plan.onEnterEntry.reveal.kind, 'fade')
  assert.equal(current.reveal.kind, 'cut')
  // Exercise the exact reveal host after the same captured-plan session setup used by loadScene.
  // No claim to run the compositor or the entire bootstrap.
  env.scene = plan.def
  session.begin('source', 'target', {}, plan.onEnterEntry.reveal)
  await assert.rejects(
    api.hostSceneEntryReveal(current.reveal, new AbortController().signal),
    /reveal 与 preflight 契约不一致/,
  )
  console.log(
    JSON.stringify({
      id: 'B-08',
      signatureAcceptedStaleHook: true,
      preparedReveal: plan.onEnterEntry.reveal.kind,
      currentReveal: current.reveal.kind,
      revealRejectedMismatch: true,
      fullCompositorNotRun: true,
    }),
  )
} finally {
  globalThis.fetch = originalFetch
}
