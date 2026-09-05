// node --import tsx docs/ops/audits/pre-e2e/probe-editor-trial.mjs
// Real SkillTab SSR, startup selector, original main function bodies, memory-only saves.
// No browser boot/real database/network; assertions characterize the unfixed baseline.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { buildWorld, lookupText, validateSkills } from '../../../../packages/content/src/index.ts'
import { AsyncIntentController } from '../../../../packages/reforge/src/async-intent.ts'
import { expectDefined } from '../../../../packages/reforge/src/defined.ts'
import { buildCurrentSavePayload, buildMeta } from '../../../../packages/reforge/src/save/ops.ts'
import { MemorySaveStore } from '../../../../packages/reforge/src/save/store.ts'
import { resolveInitialSceneId } from '../../../../packages/reforge/src/startup-entry.ts'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const { default: react } = await import(req.resolve('@vitejs/plugin-react'))
const React = await import(req.resolve('react'))
const { renderToStaticMarkup } = await import(req.resolve('react-dom/server'))
assert.equal(typeof globalThis.indexedDB, 'undefined', 'Refuse existing browser storage')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Editor audit forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor/', root)),
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const { SkillTab } = await server.ssrLoadModule('/src/ui/SkillTab.tsx')
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const files = await buildBlankProject('audit-trial')
  const manifest = files['manifest.json']
  const entry = manifest.entryPoints.find((e) => e.id === manifest.defaultEntryId)
  const sceneIds = files['content/scenes/index.json'].scenes.map((s) => s.id)
  const skill = {
    id: 'audit-heal',
    name: '试放技能',
    desc: '',
    cost: { mp: 1 },
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 1 }],
    animation: { effectSprite: 0 },
  }
  validateSkills({ skills: [skill], levelUp: {} })
  const html = renderToStaticMarkup(
    React.createElement(SkillTab, {
      skills: [skill],
      items: [],
      session: { getHistoryVersion: () => 0 },
      assetBase: {},
      assetCatalog: { version: 1, assets: {} },
      assetReader: {},
      battleSprites: [],
      referenceStatus: 'loading',
      getCurrentReferenceIndex: () => {
        throw new Error('SSR must not query references')
      },
      projectId: manifest.id,
      workspaceId: 'memory-workspace',
    }),
  )
  const href = html.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&')
  assert(href)
  const params = new URL(href, 'https://audit.invalid/').searchParams
  assert.equal(params.get('project'), manifest.id)
  assert.equal(params.get('workspace'), 'memory-workspace')
  assert.equal(params.get('battle'), '0')
  assert.equal(params.get('scene'), 's001')
  const initialSceneId = resolveInitialSceneId(params.get('scene'), sceneIds, entry)
  assert.equal(initialSceneId, 'start')

  const source = ts.createSourceFile(
    'main.ts',
    readFileSync(new URL('packages/reforge/src/main.ts', root), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const names = new Set([
    'assertRunnerActive',
    'startBattleBody',
    'currentWorldSnapshot',
    'captureCurrentSavePayload',
    'doSave',
    'refreshSaveMetas',
    'quickSave',
  ])
  const found = new Map()
  let grant
  function walk(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      names.has(node.name.text)
    ) {
      assert(!found.has(node.name.text))
      found.set(
        node.name.text,
        ts.isFunctionDeclaration(node) ? node.getText(source) : `const ${node.getText(source)};`,
      )
    }
    if (
      ts.isIfStatement(node) &&
      node.expression.getText(source) === 'skillParam && project.skills[skillParam]'
    ) {
      assert.equal(grant, undefined)
      grant = node.getText(source)
    }
    ts.forEachChild(node, walk)
  }
  walk(source)
  for (const name of names) assert(found.has(name), name)
  assert(grant)
  // Materialize the bundler-only flag; these debug exposure branches are not reached here.
  const body = ts.transpileModule(
    [...found.values()].join('\n').replaceAll('import.meta.env.DEV', 'false'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText
  const grantJs = ts.transpileModule(grant, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  const factory = new Function(
    'env',
    `with(env){${body}; return { startBattleBody, quickSave, grantSkill:()=>{const skillParam=params.get('skill'); ${grantJs}} };}`,
  )
  const actors = Object.fromEntries(files['content/actors.json'].map((actor) => [actor.id, actor]))
  const world = buildWorld(entry.startWorld, actors, {}, {})
  const saveStore = new MemorySaveStore()
  const toasts = [],
    waits = []
  const env = {
    world,
    params,
    project: { enemyTeamsById: {}, enemiesById: {}, skills: { [skill.id]: skill }, locale: {} },
    frameStepState: { active: false, stepRequested: false },
    battleLaunchIntent: new AsyncIntentController(),
    scriptMutationIntent: new AsyncIntentController(),
    host: {
      wait: async (ms) => {
        waits.push(ms)
      },
    },
    showToast: (message) => toasts.push(message),
    scene: { id: initialSceneId },
    player: { pos: { col: 12, row: 0, height: 0 } },
    facing: 'down',
    inputProject: { manifest },
    saveStore,
    saveSnapshotQueue: Promise.resolve(),
    saveWriteQueue: Promise.resolve(),
    scriptRuntime: { withSaveBarrier: async (capture) => capture() }, // Idle runtime, no active scripts.
    saveMetasReady: Promise.resolve(),
    saveMetasInitialized: true,
    committedSavedTimes: 0,
    saveMetas: [],
    saveThumbs: new Map(),
    buildMeta,
    buildCurrentSavePayload,
    expectDefined,
    lookupText,
    MAP_NAME: manifest.name,
    canvas: {},
    captureThumbnail: () => new Blob(),
    createImageBitmap: async () => ({}),
  }
  const api = factory(env)
  const result = await api.startBattleBody(
    params.get('battle'),
    undefined,
    new AbortController().signal,
  )
  assert.equal(result, 'victory')
  assert.deepEqual(waits, [400])
  assert(toasts.some((message) => message.includes('敌队缺数据,桩胜')))
  console.log('D-trial-link', JSON.stringify({ href, initialSceneId, result, toasts }))

  const initial = structuredClone(world)
  await saveStore.putSlot(
    buildMeta('quick', world, 'baseline', (c) => c.id, 1),
    buildCurrentSavePayload(
      initial,
      { sceneId: initialSceneId, pos: env.player.pos, facing: env.facing },
      manifest.id,
    ),
    new Blob(),
  )
  assert.equal((await saveStore.getPayload('quick')).world.party[0].maxMP, 0)
  api.grantSkill()
  await api.quickSave() // Actual handler invoked after trial; no real keyboard/browser or IndexedDB.
  const after = await saveStore.getPayload('quick')
  assert.equal(after.projectId, manifest.id)
  assert.equal(after.world.party[0].maxMP, 999)
  assert.equal(after.world.party[0].mp, 999)
  assert(after.world.learnedSkills[after.world.party[0].id].includes(skill.id))
  assert.equal(files['content/actors.json'][0].battler.baseStats.maxMP, 0)
  console.log(
    'D-trial-save',
    JSON.stringify({
      initialMaxMP: initial.party[0].maxMP,
      savedMaxMP: after.world.party[0].maxMP,
      savedSkills: after.world.learnedSkills,
      sourceActorMaxMP: files['content/actors.json'][0].battler.baseStats.maxMP,
    }),
  )
} finally {
  await server.close()
  globalThis.fetch = oldFetch
}
