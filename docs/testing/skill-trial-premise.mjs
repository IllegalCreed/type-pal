// D-04/D-05 current premise only: real SkillTab SSR and unchanged main bodies, memory-only IO.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { buildWorld, lookupText, validateSkills } from '../../packages/content/src/index.ts'
import { AsyncIntentController } from '../../packages/reforge/src/async-intent.ts'
import { expectDefined } from '../../packages/reforge/src/defined.ts'
import { loadCurrentProjectFrom } from '../../packages/reforge/src/project-loader.ts'
import { buildCurrentSavePayload, buildMeta } from '../../packages/reforge/src/save/ops.ts'
import { MemorySaveStore } from '../../packages/reforge/src/save/store.ts'
import { resolveInitialSceneId } from '../../packages/reforge/src/startup-entry.ts'

const root = new URL('../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const { default: react } = await import(req.resolve('@vitejs/plugin-react'))
const React = await import(req.resolve('react'))
const { renderToStaticMarkup } = await import(req.resolve('react-dom/server'))
assert.equal(typeof globalThis.indexedDB, 'undefined', 'No browser storage allowed')
const originalFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Premise probe forbids network')
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
  const files = await buildBlankProject('skill-trial-premise')
  const manifest = files['manifest.json']
  const entry = manifest.entryPoints.find((e) => e.id === manifest.defaultEntryId)
  const sceneIds = files['content/scenes/index.json'].scenes.map((s) => s.id)
  const workspaceId = '11111111-1111-4111-8111-111111111111'
  const skill = {
    id: 'probe-heal',
    name: '试放技能',
    desc: '',
    cost: { mp: 1 },
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 1 }],
    animation: { effectSprite: 0 },
  }
  validateSkills({ skills: [skill], levelUp: {} })
  files[manifest.content.skills] = { skills: [skill], levelUp: {} }
  const readJson = async (path) => {
    if (!(path in files)) throw new DOMException(path, 'NotFoundError')
    return structuredClone(files[path])
  }
  const loaded = await loadCurrentProjectFrom({
    readJson,
    readText: async (path) => JSON.stringify(await readJson(path)),
    readBytes: async () => {
      throw new Error('Metadata premise must not read asset binaries')
    },
    urlFor: async () => {
      throw new Error('Metadata premise must not create asset URLs')
    },
  })
  assert(loaded.skills[skill.id], 'saved current project must really contain the selected skill')
  assert.deepEqual(loaded.enemyTeamsById, {})
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
        throw new Error('SSR reference query')
      },
      playIdentity: { source: 'local', projectId: manifest.id, workspaceId },
    }),
  )
  const href = html.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&')
  assert(href)
  const params = new URL(href, 'https://probe.invalid/').searchParams
  assert.equal(params.get('project'), manifest.id)
  assert.equal(params.get('workspace'), workspaceId)
  assert.equal(params.get('scene'), 's001')
  assert.equal(params.get('battle'), '0')
  // Blank seed omits this optional table; current assembleCurrentProject maps absence to [].
  assert.equal(manifest.content.enemyTeams, undefined)
  assert.equal(files['content/enemy-teams.json'], undefined)
  const sceneId = resolveInitialSceneId(params.get('scene'), sceneIds, entry)
  assert.equal(sceneId, 'start')
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
    'enqueueSaveSnapshot',
    'doSave',
    'refreshSaveMetas',
    'quickSave',
  ])
  const bodies = new Map()
  let grant
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      names.has(node.name.text)
    ) {
      assert(!bodies.has(node.name.text))
      bodies.set(
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
    ts.forEachChild(node, visit)
  }
  visit(source)
  for (const name of names) assert(bodies.has(name), name)
  assert(grant)
  const transpile = (text) =>
    ts.transpileModule(text.replaceAll('import.meta.env.DEV', 'false'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText
  const factory = new Function(
    'env',
    `with(env){${transpile([...bodies.values()].join('\n'))};return {startBattleBody,quickSave,grant:()=>{const skillParam=params.get('skill');${transpile(grant)}}}}`,
  )
  const actors = Object.fromEntries(files['content/actors.json'].map((actor) => [actor.id, actor]))
  const world = buildWorld(entry.startWorld, actors, {}, {})
  const initial = structuredClone(world)
  const sourceActors = structuredClone(files['content/actors.json'])
  const store = new MemorySaveStore({ kind: 'workspace', projectId: manifest.id, workspaceId })
  const toasts = [],
    waits = []
  let sessions = 0
  const env = {
    world,
    params,
    project: loaded,
    frameStepState: { active: false, stepRequested: false },
    battleLaunchIntent: new AsyncIntentController(),
    scriptMutationIntent: new AsyncIntentController(),
    host: {
      wait: async (ms) => {
        waits.push(ms)
      },
    },
    showToast: (message) => toasts.push(message),
    scene: { id: sceneId },
    player: { pos: { col: 12, row: 0, height: 0 } },
    facing: 'down',
    inputProject: { manifest },
    saveStore: store,
    saveSnapshotQueue: Promise.resolve(),
    saveWriteQueue: Promise.resolve(),
    scriptRuntime: { withSaveBarrier: async (capture) => capture() }, // Idle barrier; no running script in this premise.
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
    BattleSession: class {
      constructor() {
        sessions++
        throw new Error('No real battle expected on the missing-team path')
      }
    },
  }
  const api = factory(env)
  const result = await api.startBattleBody('0', undefined, new AbortController().signal)
  assert.equal(result, 'victory')
  assert.equal(sessions, 0)
  assert.deepEqual(waits, [400])
  assert(toasts.some((t) => t.includes('敌队缺数据,桩胜')))
  await api.quickSave()
  const before = await store.getPayload('quick')
  assert.equal(before.world.party[0].maxMP, initial.party[0].maxMP)
  assert(!before.world.learnedSkills[initial.party[0].id].includes(skill.id))
  api.grant()
  await api.quickSave()
  const after = await store.getPayload('quick')
  assert.equal(after.projectId, manifest.id)
  assert.equal(after.world.party[0].maxMP, Math.max(initial.party[0].maxMP, 999))
  assert(after.world.learnedSkills[initial.party[0].id].includes(skill.id))
  assert.deepEqual(files['content/actors.json'], sourceActors)
  console.log(
    JSON.stringify(
      {
        href,
        sceneId,
        battleResult: result,
        sessions,
        savedBeforeMaxMP: before.world.party[0].maxMP,
        savedAfterMaxMP: after.world.party[0].maxMP,
        savedTrialSkill: true,
        authorInputUnchanged: true,
      },
      null,
      2,
    ),
  )
} finally {
  await server.close()
  globalThis.fetch = originalFetch
}
