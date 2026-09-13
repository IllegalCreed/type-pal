// node --import tsx docs/ops/audits/pre-e2e/probe-glm-history-prep.mjs
// GLM pre-e2e-prep r1 · G-H 组（撤销与事务）只读取证。
// 真实 EditSession/ScriptEditSession/EditorHistoryCoordinator/保存投影/序列化 + AST 抽取的真实 App undo/redo 回调。
// 内存 seed，无浏览器/网络/磁盘写。断言刻画当前行为，不是期望行为验收。
// 旧错误特征复现不是修复绿色。原探针零改动；本探针按工作包新建。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

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
  const { ScriptEditSession, SetItemPrivateScriptBodyCommand } =
    await server.ssrLoadModule('/src/core/script-editor.ts')
  const { UpdateItemCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { EditorHistoryCoordinator } = await server.ssrLoadModule(
    '/src/core/editor-history-coordinator.ts',
  )
  const { mergeEditorProjectionWithCurrentAuthorState: merge } = await server.ssrLoadModule(
    '/src/core/script-editor-projection.ts',
  )
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState, serializeProjectWithMapCopies } = await server.ssrLoadModule(
    '/src/core/project-io.ts',
  )
  const { loadCurrentProjectFrom, loadAllAuthorScenes, loadStampTemplates } =
    await server.ssrLoadModule('/../reforge/src/project-loader.ts')

  const files = await buildBlankProject('glm-history-prep')
  files['content/items.json'] = [
    {
      id: 'private',
      name: '私有脚本物品',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'scene', consuming: true, effects: [] },
    },
  ]
  // 环境边界适配（与 Codex reprobe 同口径，单列记录）：缺席文件抛 NotFoundError，
  // 满足当前 loader 的 save-state 缺席合同；不改变任何业务输入与断言。
  const get = (rel) => {
    if (!Object.hasOwn(files, rel)) throw new DOMException(rel, 'NotFoundError')
    return files[rel]
  }
  const source = {
    async readText(rel) {
      const x = get(rel)
      assert(!(x instanceof ArrayBuffer))
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel) {
      const x = get(rel)
      return x instanceof ArrayBuffer
        ? x.slice(0)
        : new TextEncoder().encode(await this.readText(rel)).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const stamps = await loadStampTemplates(project)
  const base = toEditorState(project, scenes, {}, {}, stamps)
  const scriptBase = {
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }

  // AST 抽取真实 App undo/redo 回调（含协调器优先 + historyOwnerRef 单栈 fallback）。
  const sf = ts.createSourceFile(
    'App.tsx',
    readFileSync(new URL('packages/editor/src/ui/App.tsx', root), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const callbacks = new Map()
  const subs = []
  function visit(n) {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      ['undo', 'redo'].includes(n.name.text) &&
      n.initializer &&
      ts.isCallExpression(n.initializer)
    ) {
      assert(!callbacks.has(n.name.text))
      callbacks.set(n.name.text, n.initializer.arguments[0])
    }
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(sf) === 'useEffect' &&
      n.arguments[0]?.getText(sf).includes('getHistoryVersion()')
    )
      subs.push(n.arguments[0])
    ts.forEachChild(n, visit)
  }
  visit(sf)
  assert.equal(subs.length, 2)
  assert.equal(callbacks.size, 2)

  function rig() {
    const main = structuredClone(base)
    const script = structuredClone(scriptBase)
    // 与原探针同款合法初始输入：物品预置一条 use 私有脚本效果（设置前置，不入历史）。
    const seededEffect = { kind: 'itemPrivateScript', script: { id: 'use', label: '正文', body: [] } }
    script.items[0].use.effects = [structuredClone(seededEffect)]
    main.items[0].use.effects = [structuredClone(seededEffect)]
    const session = new EditSession(main)
    const scriptSession = new ScriptEditSession(script)
    const historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
    const historyOwnerRef = { current: 'main' }
    const scope = {
      session,
      scriptSession,
      historyCoordinator,
      historyOwnerRef,
      reconcileLocationAfterHistory() {},
    }
    const actual = (n) =>
      vm.runInNewContext(
        ts.transpileModule(`(${n.getText(sf)})`, {
          compilerOptions: { target: ts.ScriptTarget.ES2022 },
        }).outputText,
        scope,
      )
    // 真实 App 的两份 subscribe 副作用（historyOwnerRef 归属启发式）。
    actual(subs[0])()
    actual(subs[1])()
    return {
      scope,
      undo: actual(callbacks.get('undo')),
      redo: actual(callbacks.get('redo')),
      session,
      scriptSession,
      historyCoordinator,
      owner: historyOwnerRef,
      price: () => (session.getState().items.find((i) => i.id === 'private') ?? { buyPrice: 0 }).buyPrice,
      body: () => {
        const item = (scriptSession.getState().items.find((i) => i.id === 'private') ?? { use: { effects: [] } })
        const effect = item.use?.effects?.find(
          (e) => e.kind === 'itemPrivateScript' && e.script?.id === 'use',
        )
        return effect ? effect.script.body : null
      },
      shellUseCount: () =>
        (session.getState().items.find((i) => i.id === 'private') ?? { use: { effects: [] } }).use?.effects?.length ?? 0,
    }
  }
  const M = (r, v) => r.session.dispatch(new UpdateItemCommand('private', { buyPrice: v }))
  const S = (r, body) =>
    r.scriptSession.dispatch(new SetItemPrivateScriptBodyCommand('private', 'use', 0, body))
  const WAIT1 = [{ kind: 'wait', ms: 1 }]
  const WAIT2 = [{ kind: 'wait', ms: 2 }]
  const P = (r, body, price) =>
    r.historyCoordinator.dispatch(
      new SetItemPrivateScriptBodyCommand('private', 'use', 0, body),
      new UpdateItemCommand('private', { buyPrice: price }),
    )

  // ── G-H01 普通交错 M→S→M / S→M→S 三次 undo 的当前顺序 ──
  {
    const r = rig()
    M(r, 10)
    S(r, [{ kind: 'wait', ms: 1 }])
    M(r, 20)
    const after = [r.price(), r.body()]
    r.undo()
    const u1 = [r.price(), r.body()]
    r.undo()
    const u2 = [r.price(), r.body()]
    r.undo()
    const u3 = [r.price(), r.body()]
    r.redo()
    r.redo()
    r.redo()
    const r3 = [r.price(), r.body()]
    const r2 = rig()
    S(r2, [{ kind: 'wait', ms: 1 }])
    M(r2, 10)
    S(r2, [{ kind: 'wait', ms: 2 }])
    r2.undo()
    const s1 = [r2.price(), r2.body()]
    r2.undo()
    const s2 = [r2.price(), r2.body()]
    record(
      'G-H01',
      'reproduced',
      `M/S/M after=${JSON.stringify(after)} undo1=${JSON.stringify(u1)} undo2=${JSON.stringify(u2)} undo3=${JSON.stringify(u3)} redo3=${JSON.stringify(r3)}；S/M/S undo1=${JSON.stringify(s1)} undo2=${JSON.stringify(s2)}（期望严格逆序：M/S/M 应 20→10/待观察、S/M/S 应先撤最后 S）`,
    )
  }

  // ── G-H02 pair→main→script 连续 undo 拆半 + 紧接 redo 边界 ──
  {
    const r = rig()
    P(r, [{ kind: 'wait', ms: 1 }], 10)
    M(r, 20)
    S(r, [{ kind: 'wait', ms: 2 }])
    r.undo() // 协调器: 顶部 S 单条不匹配 pair → fallback
    const u1 = [r.price(), r.body()]
    r.undo() // 顶部 M 单条 → fallback
    const u2 = [r.price(), r.body()]
    r.undo() // 顶部应为 pair
    const u3 = [r.price(), r.body()]
    r.undo() // 到底
    const u4 = [r.price(), r.body()]
    r.redo()
    const rd1 = [r.price(), r.body()]
    record(
      'G-H02',
      'reproduced',
      `P/M/S undo序列 u1=${JSON.stringify(u1)} u2=${JSON.stringify(u2)} u3=${JSON.stringify(u3)} u4=${JSON.stringify(u4)} redo1=${JSON.stringify(rd1)}（观察 pair 是否恰一次整笔、redo 是否恢复半笔）`,
    )
  }

  // ── G-H03 pair 位置矩阵：开头/中间/末尾、连续两 pair ──
  {
    const out = {}
    for (const layout of ['P-first', 'P-mid', 'P-last', 'P-P']) {
      const r = rig()
      if (layout === 'P-first') {
        P(r, [{ kind: 'wait', ms: 1 }], 10)
        M(r, 20)
        S(r, [{ kind: 'wait', ms: 2 }])
      } else if (layout === 'P-mid') {
        M(r, 10)
        P(r, [{ kind: 'wait', ms: 1 }], 20)
        S(r, [{ kind: 'wait', ms: 2 }])
      } else if (layout === 'P-last') {
        M(r, 10)
        S(r, [{ kind: 'wait', ms: 1 }])
        P(r, [{ kind: 'wait', ms: 2 }], 20)
      } else {
        P(r, [{ kind: 'wait', ms: 1 }], 10)
        P(r, [{ kind: 'wait', ms: 2 }], 20)
      }
      const steps = []
      for (let i = 0; i < 5; i++) {
        const before = [r.price(), r.body()]
        r.undo()
        steps.push(`${JSON.stringify(before)}→${JSON.stringify([r.price(), r.body()])}`)
        if (r.price() === 0 && r.body() === null && !r.session.isDirty()) break
      }
      out[layout] = steps
    }
    record('G-H03', 'reproduced', `各布局 undo 轨迹 ${JSON.stringify(out)}`)
  }

  // ── G-H07 一侧新作者分支是否清另一侧 redo（孤儿重做） ──
  {
    const r = rig()
    M(r, 10)
    r.undo()
    const mainRedoBefore = r.session.redo() // main 侧 redo 可用
    const priceAfterRedo = r.price()
    r.undo()
    S(r, [{ kind: 'wait', ms: 1 }]) // 脚本侧新作者提交
    const mainRedoAfterScript = r.session.redo() // main 孤儿 redo 仍可用？
    const priceAfterOrphan = r.price()
    record(
      'G-H07',
      'reproduced',
      `脚本侧新提交后 main 单栈 redo=${mainRedoAfterScript}（前置对照：脚本提交前 main redo=${mainRedoBefore}, price=${priceAfterRedo}; 孤儿重做后 price=${priceAfterOrphan}）——全局层面另一侧仍可重做孤儿`,
    )
  }

  // ── G-H08 no-op / 失败 dispatch 是否破坏 redo ──
  {
    const r = rig()
    M(r, 10)
    r.undo()
    const noop = r.session.dispatch(new UpdateItemCommand('private', { buyPrice: 0 }))
    const redoAfterNoop = r.session.redo()
    const priceAfter = r.price()
    const r2 = rig()
    M(r2, 10)
    r2.undo()
    const boom = new UpdateItemCommand('private', { buyPrice: 20 })
    const origApply = boom.apply.bind(boom)
    boom.apply = () => {
      throw new Error('apply 失败注入')
    }
    let failed = false
    try {
      r2.session.dispatch(boom)
    } catch {
      failed = true
    }
    const stateKept = r2.price() === 0
    const redoAfterFail = r2.session.redo()
    const priceAfterFail = r2.price()
    boom.apply = origApply
    const redoAfterRecover = r2.session.redo()
    record(
      'G-H08',
      'covered',
      `no-op dispatch 返回 ${noop} 后 redo=${redoAfterNoop} price=${priceAfter}；apply 失败抛错=${failed} 状态保持=${stateKept} 失败后 redo=${redoAfterFail} price=${priceAfterFail} 复原后 redo=${redoAfterRecover}（失败与 no-op 均不清 redo、不破坏状态）`,
    )
  }

  // ── G-H10 同一 Command 对象重复 dispatch 合同 ──
  {
    const r = rig()
    const cmd = new UpdateItemCommand('private', { buyPrice: 10 })
    const a = r.session.dispatch(cmd)
    const b = r.session.dispatch(cmd)
    const price = r.price()
    r.undo()
    const u1 = r.price()
    r.undo()
    const u2 = r.price()
    const r2 = rig()
    const pcmd = [
      new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }]),
      new UpdateItemCommand('private', { buyPrice: 10 }),
    ]
    r2.historyCoordinator.dispatch(pcmd[0], pcmd[1])
    let pairTwice = 'ok'
    try {
      r2.historyCoordinator.dispatch(pcmd[0], pcmd[1])
    } catch (e) {
      pairTwice = `throw:${e.message}`
    }
    record(
      'G-H10',
      'covered',
      `同对象两次 main dispatch=${a}/${b} price=${price} undo1=${u1} undo2=${u2}（按引用入栈两次、各撤一次）；同对象 pair 重复=${pairTwice}（对象身份不是事务唯一性凭据）`,
    )
  }

  // ── G-H11 第一/第二参与者 apply 失败 ──
  {
    const r = rig()
    let scriptChangedMidFailure = null
    const sub = r.scriptSession.subscribe(() => {
      scriptChangedMidFailure ??= r.body()
    })
    const failMain = new UpdateItemCommand('private', { buyPrice: 20 })
    failMain.apply = () => {
      throw new Error('第二参与者 apply 失败')
    }
    let threw = null
    try {
      r.historyCoordinator.dispatch(
        new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }]),
        failMain,
      )
    } catch (e) {
      threw = e.message
    }
    const bodyAfter = r.body()
    const mainDirty = r.session.isDirty()
    const scriptDirty = r.scriptSession.isDirty()
    const scriptUndo = r.scriptSession.undo()
    const bodyAfterUndo = r.body()
    sub()
    const r2 = rig()
    const failScript = new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }])
    failScript.apply = () => {
      throw new Error('第一参与者 apply 失败')
    }
    let threw2 = null
    try {
      r2.historyCoordinator.dispatch(failScript, new UpdateItemCommand('private', { buyPrice: 20 }))
    } catch (e) {
      threw2 = e.message
    }
    record(
      'G-H11',
      'reproduced',
      `第二参与者失败 throw=${JSON.stringify(threw)} 脚本半状态=${JSON.stringify(bodyAfter)} mainDirty=${mainDirty} scriptDirty=${scriptDirty} 失败后script可undo=${scriptUndo} 撤后=${JSON.stringify(bodyAfterUndo)}；第一参与者失败 throw=${JSON.stringify(threw2)}（receipt 回滚路径观察）`,
    )
  }

  // ── G-H12 invert/redo 失败的先 pop 后 apply 次序 ──
  {
    const r = rig()
    const cmd = new UpdateItemCommand('private', { buyPrice: 10 })
    r.session.dispatch(cmd)
    const origInvert = cmd.invert.bind(cmd)
    cmd.invert = () => {
      throw new Error('invert 失败注入')
    }
    let threw = null
    try {
      r.session.undo()
    } catch (e) {
      threw = e.message
    }
    const priceAfter = r.price()
    cmd.invert = origInvert // 复原后再观察后续 undo/redo
    const undoAgain = r.session.undo()
    const redoAvail = r.session.redo()
    // ScriptEditSession.undo 先 pop 再 invert（源码序），注入 invert 失败验证历史丢失
    const r3 = rig()
    const scmd = new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }])
    r3.scriptSession.dispatch(scmd)
    scmd.invert = () => {
      throw new Error('script invert 失败注入')
    }
    let threw3 = null
    try {
      r3.scriptSession.undo()
    } catch (e) {
      threw3 = e.message
    }
    const body3 = r3.body()
    const undo3again = r3.scriptSession.undo()
    const redo3 = r3.scriptSession.redo()
    record(
      'G-H12',
      'reproduced',
      `main undo invert 失败 throw=${JSON.stringify(threw)} price=${priceAfter} 再undo=${undoAgain} redo=${redoAvail}；script undo invert 失败 throw=${JSON.stringify(threw3)} body=${JSON.stringify(body3)} 再undo=${undo3again} redo=${redo3}（先pop后invert：失败项脱离双栈）`,
    )
  }

  // ── G-H13 事务期间同步订阅能否看见半状态 ──
  {
    const r = rig()
    const seen = []
    const sub = r.scriptSession.subscribe(() => {
      seen.push({ scriptBody: r.body(), mainPrice: r.price() })
    })
    P(r, [{ kind: 'wait', ms: 1 }], 10)
    sub()
    const halfVisible = seen.some((s) => s.scriptBody !== null && s.mainPrice === 0)
    record(
      'G-H13',
      'reproduced',
      `pair 提交期间脚本侧订阅共见 ${seen.length} 次通知=${JSON.stringify(seen)}；半状态(脚本已变/main未变)可见=${halfVisible}`,
    )
  }

  // ── G-H15 保存合并：引用缺正文/空正文/未引用记录正反控 ──
  {
    const r = rig()
    P(r, [{ kind: 'wait', ms: 1 }], 10)
    // 正控 A：shell 引用 + canonical 正文齐备 → merge 保留
    const mergedOk = merge(r.scriptSession.getState(), r.session.getState())
    const okItem = (mergedOk.items.find((i) => i.id === 'private') ?? {})
    const okEffects = (okItem.use?.effects ?? [])
    // 反控：仅 shell 有引用、canonical 无正文（模拟正文记录被删的中间态）
    const scriptNoBody = structuredClone(r.scriptSession.getState())
    const item = (scriptNoBody.items.find((i) => i.id === 'private') ?? { use: { effects: [] } })
    const use = item.use ?? {}
    use.effects = (use.effects ?? []).filter(
      (e) => !(e.kind === 'itemPrivateScript' && e.script?.id === 'use'),
    )
    item.use = use
    const mergedNoBody = merge(scriptNoBody, r.session.getState())
    const noBodyItem = (mergedNoBody.items.find((i) => i.id === 'private') ?? {})
    const noBodyEffects = noBodyItem.use?.effects?.length ?? 0
    // 正控 B：空正文 [] 合法保留
    const r2 = rig()
    P(r2, [], 5)
    const mergedEmpty = merge(r2.scriptSession.getState(), r2.session.getState())
    const emptyItem = (mergedEmpty.items.find((i) => i.id === 'private') ?? {})
    const emptyEffect = emptyItem.use?.effects?.find(
      (e) => e.kind === 'itemPrivateScript' && e.script?.id === 'use',
    )
    // 序列化两侧（当前是否拒绝缺正文）
    let serializeNoBody = 'ok'
    try {
      await serializeProjectWithMapCopies(mergedNoBody, source)
    } catch (e) {
      serializeNoBody = `throw:${e.message}`
    }
    record(
      'G-H15',
      'reproduced',
      `齐备→effects=${okEffects.length}；缺正文→effects=${noBodyEffects}(静默丢) 且序列化=${serializeNoBody}；空正文[]→effect=${JSON.stringify(emptyEffect?.script?.body)}(合法保留)`,
    )
  }

  console.log('\n=== G-H 动态观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
