// node --import tsx docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs
// GLM pre-e2e-prep r1 · G-R 组（场景引用删除）只读取证。
// 真实 loader/ScriptEditSession/引用索引 oracle/删除判定链；内存 seed；无浏览器。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('GLM prep probe forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const log = []
const record = (id, verdict, detail) => {
  log.push({ id, verdict, detail })
  console.log(`[${id}] ${verdict}: ${detail}`)
}
try {
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const {
    ScriptEditSession,
    AddSceneHookCommand,
    DeleteSceneHookCommand,
    sceneHookReferences,
    buildCanonicalSchemeReferenceIndexesFromVisits,
    collectCanonicalScriptCommandVisits,
  } = await server.ssrLoadModule('/src/core/script-editor.ts')
  const adapters = await server.ssrLoadModule('/src/core/project-reference-adapters.ts')
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState } = await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes } = await server.ssrLoadModule(
    '/../reforge/src/project-loader.ts',
  )
  const content = await server.ssrLoadModule('/../content/src/index.ts')

  const files = await buildBlankProject('glm-ref-prep')
  const get = (rel) => {
    if (!Object.hasOwn(files, rel)) throw new DOMException(rel, 'NotFoundError')
    return files[rel]
  }
  const source = {
    async readText(rel) {
      const x = get(rel)
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel) {
      const x = get(rel)
      return x instanceof ArrayBuffer ? x.slice(0) : new TextEncoder().encode(x).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const editorState = toEditorState(project, scenes, {}, {}, [])
  const sceneId = scenes[0].id

  // 合法输入构造：真实 AddSceneHookCommand 增加非 initial 变体 hook-b/hook-c；
  // 场景 entry.prepare 注入 selectSceneHooks（先经 content checkBaseAuthorCommands 正控校验）。
  // 合法放置 = hook-b 变体 flow 体内的 selectSceneHooks（UI 实际可编辑域；命令先经
  // content checkBaseAuthorCommands 正控 + ScriptEditSession 构造校验）。
  function rig(selection) {
    const body = selection ? [{ kind: 'selectSceneHooks', scene: sceneId, selection }] : []
    content.checkBaseAuthorCommands(body, 'selectSceneHooks 正控')
    const flow = { kind: 'stages', initial: 's0', stages: [{ id: 's0', body }] }
    const script = { scenes: structuredClone(scenes), items: [], sharedScripts: {} }
    const session = new ScriptEditSession(script)
    session.dispatch(
      new AddSceneHookCommand(sceneId, 'onEnter', 'hook-b', { label: 'B', order: 0, flow }),
    )
    session.dispatch(
      new AddSceneHookCommand(sceneId, 'onEnter', 'hook-c', {
        label: 'C',
        order: 1,
        flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
      }),
    )
    return { session, state: session.getState() }
  }
  const hookTarget = (hookId) => ({ kind: 'scene-hook', sceneId, slot: 'onEnter', hookId })

  // G-R01 disabled：被选项不携带 hookId，不得产生 use 边（以非 initial 的 hook-c 为隔离对象）
  {
    const { state } = rig({ onEnter: { kind: 'disabled' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    const impactC = index.deletionImpact(hookTarget('hook-c'))
    let cmdDelete = 'throw'
    try {
      new ScriptEditSession(structuredClone(state)).dispatch(
        new DeleteSceneHookCommand(sceneId, 'onEnter', 'hook-c'),
      )
      cmdDelete = 'ok'
    } catch (e) {
      cmdDelete = `throw:${e.message}`
    }
    record(
      'G-R01',
      impactC.blockers.length === 0 && cmdDelete === 'ok' ? 'covered' : 'reproduced',
      `disabled 选择下 hook-c 索引 blockers=${impactC.blockers.length}；命令级删除=${cmdDelete}（disabled 不引用具体 hookId，删除应放行）`,
    )
  }
  // G-R02 inherit：继承静态定义不构成对具体变体的 use 边
  {
    const { state } = rig({ onEnter: { kind: 'inherit' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    const impactC = index.deletionImpact(hookTarget('hook-c'))
    let cmdDelete = 'throw'
    try {
      new ScriptEditSession(structuredClone(state)).dispatch(
        new DeleteSceneHookCommand(sceneId, 'onEnter', 'hook-c'),
      )
      cmdDelete = 'ok'
    } catch (e) {
      cmdDelete = `throw:${e.message}`
    }
    record(
      'G-R02',
      impactC.blockers.length === 0 && cmdDelete === 'ok' ? 'covered' : 'reproduced',
      `inherit 选择下 hook-c 索引 blockers=${impactC.blockers.length}；命令级删除=${cmdDelete}（不靠 use 边偶然兜住）`,
    )
  }
  // G-R03 use 语义 + initial 引用对照
  {
    const { state } = rig({ onEnter: { kind: 'use', value: 'hook-c' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    const impactC = index.deletionImpact(hookTarget('hook-c'))
    const where = impactC.blockers.map((e) => `${e.relation.kind}/${e.relation.use}@${e.where}`)
    record(
      'G-R03',
      impactC.blockers.length >= 1 ? 'covered' : 'reproduced',
      `use hook-c → blockers=${impactC.blockers.length} 来源=${JSON.stringify(where)}（select-hook 命令边 + 无 initial 干扰）`,
    )
  }
  // G-R08 同一删除集合内部引用豁免
  {
    const { state } = rig({ onEnter: { kind: 'use', value: 'hook-c' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    const alone = index.deletionImpact(hookTarget('hook-c'), index.deletionScopeFor([hookTarget('hook-c')]))
    const sceneTarget = { kind: 'scene', id: sceneId }
    const together = index.deletionImpact(
      hookTarget('hook-c'),
      index.deletionScopeFor([sceneTarget, hookTarget('hook-c')]),
    )
    record(
      'G-R08',
      alone.blockers.length > 0 && together.blockers.length === 0 ? 'covered' : 'reproduced',
      `单删 hook-c blockers=${alone.blockers.length}；与引用来源场景同删 blockers=${together.blockers.length}（removedSourceKeys 豁免集合内部引用，不一律阻断）`,
    )
  }
  // G-R09 拒删/可删 → undo → 序列化（核心层）；缺错误≠删除成功
  {
    const { session, state } = rig({ onEnter: { kind: 'use', value: 'hook-c' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    // hook-c 仅被 hook-b 流内 use 命令引用（initial 指向 hook-b 不干扰）。
    const refsBefore = sceneHookReferences(session.getState(), sceneId, 'onEnter', 'hook-c')
    let deleteBlocked = null
    try {
      session.dispatch(new DeleteSceneHookCommand(sceneId, 'onEnter', 'hook-c'))
      deleteBlocked = 'dispatched'
    } catch (e) {
      deleteBlocked = `throw:${e.message}`
    }
    const afterBlocked = session.getState().scenes.find((s) => s.id === sceneId)
    const stillB = Boolean(afterBlocked.hooks?.onEnter?.variants?.hook_b ?? afterBlocked.hooks?.onEnter?.variants?.['hook-b'])
    // 移除引用来源（删除 prepare 中的 selectSceneHooks）后应可删
    // 清引用来源：去掉 hook-b 流体内的 selectSceneHooks 后应可删。
    const cleared = structuredClone(state)
    const scene2 = cleared.scenes.find((s) => s.id === sceneId)
    const variants = scene2.hooks.onEnter.variants
    variants['hook-b'] = {
      ...variants['hook-b'],
      flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
    }
    const session2 = new ScriptEditSession(cleared)
    session2.dispatch(new DeleteSceneHookCommand(sceneId, 'onEnter', 'hook-c'))
    const deleted = session2.getState().scenes.find((s) => s.id === sceneId)
    const gone = !deleted.hooks?.onEnter?.variants?.['hook-c']
    const undone = session2.undo()
    const restored = Boolean(
      session2.getState().scenes.find((s) => s.id === sceneId).hooks?.onEnter?.variants?.['hook-c'],
    )
    record(
      'G-R09',
      deleteBlocked.startsWith('throw') && stillB && gone && undone && restored
        ? 'covered'
        : 'reproduced',
      `有引用(refs=${refsBefore.length})时删除=${deleteBlocked} 守卫拒绝后变体仍在=${stillB}；清引用后删除=${gone} undo=${undone} 恢复=${restored}（命令级守卫真实拦截，缺错误≠删除成功）`,
    )
  }
  // G-R10 稳定定位与反向控制
  {
    const { state } = rig({ onEnter: { kind: 'use', value: 'hook-c' } })
    const index = adapters.collectCurrentProjectReferenceIndex(editorState, state)
    const edge = index.deletionImpact(hookTarget('hook-c')).blockers.find(
      (e) => e.relation.use === 'select-hook',
    )
    const locator = edge?.locator
    const cleared = structuredClone(state)
    const sc = cleared.scenes.find((s) => s.id === sceneId)
    const vars = sc.hooks.onEnter.variants
    vars['hook-b'] = {
      ...vars['hook-b'],
      flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
    }
    const index2 = adapters.collectCurrentProjectReferenceIndex(editorState, cleared)
    const after = index2.deletionImpact(hookTarget('hook-c'))
    record(
      'G-R10',
      locator && after.blockers.length === 0 ? 'covered' : 'reproduced',
      `use 命令边 locator=${JSON.stringify(locator)} where=${edge?.where}；去引用后 blockers=${after.blockers.length}（定位稳定、反向控制成立）`,
    )
  }
  console.log('\n=== G-R 动态观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
