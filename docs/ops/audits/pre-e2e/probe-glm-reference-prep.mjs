// node --import tsx docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs
// GLM pre-e2e-prep r1 rework · G-R 组只读取证（R1 返工版）。
// 两场景 scene-target 删除矩阵：真实 seed/loader/双 session/成对删除命令/保存序列化/undo。
// 钩子生命周期观察独立分栏（不充场景删除通过）；根级 stages/machine 仅作 loader 接受性观察（撤回漏边主张）。
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
    DeleteSceneDefinitionCommand,
    AddSceneHookCommand,
    DeleteSceneHookCommand,
  } = await server.ssrLoadModule('/src/core/script-editor.ts')
  const { DeleteSceneCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { EditorHistoryCoordinator } = await server.ssrLoadModule(
    '/src/core/editor-history-coordinator.ts',
  )
  const adapters = await server.ssrLoadModule('/src/core/project-reference-adapters.ts')
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState, serializeProjectWithMapCopies } =
    await server.ssrLoadModule('/src/core/project-io.ts')
  const { mergeEditorProjectionWithCurrentAuthorState: merge } = await server.ssrLoadModule(
    '/src/core/script-editor-projection.ts',
  )
  const { loadCurrentProjectFrom, loadAllAuthorScenes } = await server.ssrLoadModule(
    '/../reforge/src/project-loader.ts',
  )

  const seed = await buildBlankProject('glm-ref-rework')
  const sceneDir = seed['manifest.json'].content.scenes
  const initialPath = seed[`${sceneDir}index.json`].scenes[0].path
  const plainScene = structuredClone(seed[initialPath])
  const sourceOf = (files) => ({
    async readText(path) {
      if (!Object.hasOwn(files, path)) throw new DOMException(path, 'NotFoundError')
      const x = files[path]
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(path) {
      return JSON.parse(await this.readText(path))
    },
    async readBytes(path) {
      if (!Object.hasOwn(files, path)) throw new DOMException(path, 'NotFoundError')
      const x = files[path]
      return x instanceof ArrayBuffer ? x.slice(0) : new TextEncoder().encode(x).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  })
  const hookChannel = (flow) => ({
    onEnter: { initial: 'main', variants: { main: { label: 'main', order: 0, flow } } },
  })

  // 两场景模型：source(start) 的 onEnter hook 流内放对 target 的引用；target 有自己的 hook。
  function rigSceneCase(mode) {
    const files = structuredClone(seed)
    const source = files[initialPath]
    const target = {
      ...structuredClone(plainScene),
      id: 'target',
      hooks: hookChannel({ kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] }),
    }
    files[`${sceneDir}target.json`] = target
    files[`${sceneDir}index.json`].scenes.push({
      id: 'target',
      name: 'Target',
      path: `${sceneDir}target.json`,
    })
    const flow =
      mode === 'transition'
        ? {
            kind: 'stateMachine',
            machine: {
              id: 'm',
              label: 'M',
              initial: 'one',
              states: {
                one: {
                  label: 'One',
                  body: [],
                  next: {
                    kind: 'branch',
                    cond: { kind: 'currentScene', scene: 'target' },
                    then: { kind: 'stay' },
                    else: { kind: 'stay' },
                  },
                },
              },
            },
          }
        : {
            kind: 'stages',
            initial: 's0',
            stages: [
              {
                id: 's0',
                body:
                  mode === 'none'
                    ? []
                    : [
                        {
                          kind: 'selectSceneHooks',
                          scene: 'target',
                          selection:
                            mode === 'use'
                              ? { onEnter: { kind: 'use', value: 'main' } }
                              : { onEnter: { kind: mode } },
                        },
                      ],
              },
            ],
          }
    source.hooks = hookChannel(flow)
    return { files, fs: sourceOf(files) }
  }
  async function loadRig(fs) {
    const project = await loadCurrentProjectFrom(fs)
    const scenes = await loadAllAuthorScenes(project)
    const main = new EditSession(toEditorState(project, scenes, {}, {}, []))
    const script = new ScriptEditSession({
      scenes,
      items: project.authorContent.items,
      sharedScripts: project.authorContent.sharedScripts,
    })
    return { main, script }
  }
  const targetRef = { kind: 'scene', id: 'target' }

  // ── 场景删除矩阵：G-R01/02/04 + 保存/撤销闭环（G-R09 场景域） ──
  const sceneResults = {}
  for (const mode of ['disabled', 'inherit', 'use', 'transition']) {
    const { fs } = rigSceneCase(mode)
    const { main, script } = await loadRig(fs)
    await serializeProjectWithMapCopies(merge(script.getState(), main.getState()), fs) // 正控:引用在场时保存合法
    const index = adapters.collectCurrentProjectReferenceIndex(main.getState(), script.getState())
    const impact = index.deletionImpact(targetRef, index.deletionScopeFor([targetRef]))
    const coordinator = new EditorHistoryCoordinator(main, script)
    let deleteError
    try {
      coordinator.dispatch(
        new DeleteSceneDefinitionCommand('target', (next) =>
          adapters.collectCurrentProjectReferenceIndex(main.getState(), next),
        ),
        new DeleteSceneCommand(
          'target',
          adapters.createCurrentProjectReferenceIndexProvider(() => script.getState()),
        ),
      )
    } catch (e) {
      deleteError = e.message
    }
    const remaining = main.getState().scenes.map((s) => s.id)
    let saveError
    try {
      await serializeProjectWithMapCopies(merge(script.getState(), main.getState()), fs)
    } catch (e) {
      saveError = e.message
    }
    let undoOk
    if (!deleteError) undoOk = coordinator.undo()
    sceneResults[mode] = {
      blockers: impact.blockers.length,
      deleteError,
      remaining,
      saveError,
      undoOk,
    }
  }
  const r = sceneResults
  record(
    'G-R01',
    r.disabled.blockers === 0 && !r.disabled.deleteError && r.disabled.saveError
      ? 'reproduced'
      : 'covered',
    `scene-target disabled: blockers=${r.disabled.blockers} 删除=${r.disabled.deleteError ? '拒' : '成功'} 保存=${r.disabled.saveError ? `拒(${r.disabled.saveError.slice(0, 30)}…)` : 'ok'} undo=${r.disabled.undoOk}——disabled 选择仍指向目标场景,删除后保存因引用悬空被拒(D-02 漏边)`,
  )
  record(
    'G-R02',
    r.inherit.blockers === 0 && !r.inherit.deleteError && r.inherit.saveError
      ? 'reproduced'
      : 'covered',
    `scene-target inherit: blockers=${r.inherit.blockers} 删除成功 保存拒(${(r.inherit.saveError ?? '').slice(0, 30)}…) undo=${r.inherit.undoOk}——inherit 同样指向目标场景`,
  )
  record(
    'G-R04',
    r.transition.blockers === 0 && !r.transition.deleteError && r.transition.saveError
      ? 'reproduced'
      : 'covered',
    `transition currentScene: blockers=${r.transition.blockers} 删除成功 保存拒(${(r.transition.saveError ?? '').slice(0, 30)}…) undo=${r.transition.undoOk}——状态机条件引用的目标场景删除未被阻断`,
  )
  record(
    'G-R09',
    r.use.blockers > 0 && r.use.deleteError && !r.use.saveError ? 'covered' : 'reproduced',
    `scene-target use 正控闭环: blockers=${r.use.blockers} 删除拒(${(r.use.deleteError ?? '').slice(0, 40)}…) 保存仍合法——有边时命令级删除+保存闭环正确;反例三态的删除后保存拒绝+undo恢复已在上三行`,
  )

  // ── 钩子生命周期（独立分栏，不充场景覆盖）: G-R03/08/10 + G-R09 钩子域 ──
  {
    const { fs } = rigSceneCase('none')
    const { main, script } = await loadRig(fs)
    script.dispatch(
      new AddSceneHookCommand('start', 'onEnter', 'hook-b', {
        label: 'B',
        order: 1,
        flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
      }),
    )
    script.dispatch(
      new AddSceneHookCommand('start', 'onEnter', 'hook-c', {
        label: 'C',
        order: 2,
        flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
      }),
    )
    const withUse = structuredClone(script.getState())
    const scene = withUse.scenes.find((s) => s.id === 'start')
    scene.hooks.onEnter.variants['hook-b'].flow.stages[0].body.push({
      kind: 'selectSceneHooks',
      scene: 'start',
      selection: { onEnter: { kind: 'use', value: 'hook-c' } },
    })
    const build = (state) => adapters.collectCurrentProjectReferenceIndex(main.getState(), state)
    const hookTarget = (hookId) => ({
      kind: 'scene-hook',
      sceneId: 'start',
      slot: 'onEnter',
      hookId,
    })
    const impactC = build(withUse).deletionImpact(hookTarget('hook-c'))
    let blockedThrow
    try {
      new ScriptEditSession(structuredClone(withUse)).dispatch(
        new DeleteSceneHookCommand('start', 'onEnter', 'hook-c'),
      )
      blockedThrow = 'dispatched'
    } catch (e) {
      blockedThrow = `throw:${e.message}`
    }
    const alone = build(withUse).deletionImpact(
      hookTarget('hook-c'),
      build(withUse).deletionScopeFor([hookTarget('hook-c')]),
    )
    const together = build(withUse).deletionImpact(
      hookTarget('hook-c'),
      build(withUse).deletionScopeFor([{ kind: 'scene', id: 'start' }, hookTarget('hook-c')]),
    )
    const cleared = structuredClone(withUse)
    const sc = cleared.scenes.find((s) => s.id === 'start')
    sc.hooks.onEnter.variants['hook-b'].flow.stages[0].body = []
    const session2 = new ScriptEditSession(cleared)
    session2.dispatch(new DeleteSceneHookCommand('start', 'onEnter', 'hook-c'))
    const gone = !session2.getState().scenes.find((s) => s.id === 'start').hooks.onEnter.variants[
      'hook-c'
    ]
    const undone = session2.undo()
    const edge = impactC.blockers.find((e) => e.relation.use === 'select-hook')
    record(
      'G-R03',
      impactC.blockers.length >= 1 ? 'covered' : 'reproduced',
      `[钩子域] use hook-c blockers=${impactC.blockers.length} 来源=${JSON.stringify(impactC.blockers.map((e) => `${e.relation.use}@${e.where}`))}（父场景 initial 边独立存在）`,
    )
    record(
      'G-R08',
      alone.blockers.length > 0 && together.blockers.length === 0 ? 'covered' : 'reproduced',
      `[钩子域] 单删 hook-c blockers=${alone.blockers.length};与来源场景同删 blockers=${together.blockers.length}（集合内部豁免正确——该机制为场景修复可复用）`,
    )
    record(
      'G-R09-hook',
      blockedThrow.startsWith('throw') && gone && undone ? 'covered' : 'reproduced',
      `[钩子域] 有引用删除=${blockedThrow.slice(0, 60)}…;清引用后删=${gone} undo恢复=${undone}（命令级守卫与撤销闭环）`,
    )
    record(
      'G-R10',
      edge ? 'covered' : 'reproduced',
      `[钩子域] use 边 locator 稳定(${edge?.where});场景漏边(G-R01/02/04)尚无 locator 可列——两种域分栏`,
    )
  }

  // ── 根级 stages/machine：loader 接受性观察（撤回漏边主张） ──
  {
    const out = {}
    for (const extra of ['stages', 'machine']) {
      const files = structuredClone(seed)
      files[initialPath][extra] =
        extra === 'stages'
          ? [{ id: 's0', body: [] }]
          : { id: 'm', initial: 'one', states: { one: { body: [] } } }
      let error
      try {
        const p = await loadCurrentProjectFrom(sourceOf(files))
        await loadAllAuthorScenes(p)
      } catch (e) {
        error = e.message
      }
      out[extra] = error ?? 'accepted'
    }
    record(
      'G-R06',
      'risk',
      `根级额外字段 loader 接受性: stages=${out.stages} machine=${out.machine}——【撤回原“引用漏边”主张】BaseSceneDef 未定义这两个脚本根、未证其执行语义;loader 接受额外字段只构成输入严格性待证,不立 D-02 新缺陷`,
    )
  }
  record(
    'G-R05',
    'risk',
    'all/any/not 嵌套与 loop/branch 内条件的覆盖矩阵未逐一动态核（编辑器 walkCommands 有 branch/loop case;content 侧组合递归待证）;不另造 walker',
  )
  record(
    'G-R07',
    'risk',
    '[静态] 冷/暖双链 caller 存在: App.tsx:1707-1712 暖(derived memo)/:1714-1716 冷(即时 provider);删除入口 App.tsx:1736-1738/1841-1869;本探针动态核的是冷链 oracle——该依赖被 UI 实际消费的覆盖证据未采集',
  )
  console.log('\n=== G-R 返工观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
