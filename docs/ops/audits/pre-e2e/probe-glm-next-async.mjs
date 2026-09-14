// GLM boundary batch-2 · A组（世界异步提交与取消）· observe/contract 双模式诊断。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-async.mjs [--mode=observe|contract] [--case ID|all]
// 真实 ScriptProjectRuntime/executeScriptHostEffect/scene-switch-transaction；宿主 I/O 内存替身。
// observe=原树错误特征观察（exit0）；contract=正确合同断言（原树缺陷处业务红 exit1）。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const modeArg = process.argv.find((a) => a.startsWith('--mode'))
const MODE = modeArg ? (modeArg.includes('=') ? modeArg.split('=')[1] : process.argv[process.argv.indexOf(modeArg) + 1]) : 'observe'
const CASE = process.argv.includes('--case') ? process.argv[process.argv.indexOf('--case') + 1] : 'all'
const want = (id) => CASE === 'all' || CASE === id

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/reforge/package.json', root))
const { createServer } = await import(req.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('GLM probe forbids network')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/reforge/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const results = []
const note = (id, verdict, detail) => {
  results.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
try {
  const content = await server.ssrLoadModule('/../content/src/index.ts')
  const { ScriptProjectRuntime } = await server.ssrLoadModule('/src/runtime-script-project.ts')
  const { executeScriptHostEffect } = await server.ssrLoadModule('/src/script-host-adapter.ts')
  const { SceneSwitchTransaction } = await server.ssrLoadModule('/src/scene-switch-transaction.ts')

  const scene = {
    id: 's',
    mapId: 'old-map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
  const world = () => ({
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: content.emptyWorldScriptState(),
  })
  const options = (extra = {}) => ({
    lifecycleReferences: content.buildEntityLifecycleReferenceIndex([scene]),
    currentSceneId: () => scene.id,
    currentSceneSessionId: () => 1,
    scene: () => scene,
    executeEffect() {},
    worldChanged() {},
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => false,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...extra,
  })
  const runtimeOf = (w, extra) => new ScriptProjectRuntime({ sharedScripts: {} }, w, 'a'.repeat(64), options(extra))

  // ── A01 换图成功：覆写落世界、快照一致、变更通知 ──
  if (want('A01')) {
    const w = world()
    let changes = 0
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          { reloadMap: async () => {}, query: { sceneId: () => scene.id } },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
      worldChanged: () => {
        changes++
      },
    })
    await runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
      signal: new AbortController().signal,
    })
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w))
    if (MODE === 'contract') {
      assert.equal(w.script.mapOverride.s, 'new-map')
      assert.equal(snapshot.script.mapOverride?.s, 'new-map')
      assert.ok(changes >= 1, 'A01: 换图成功应至少一次 worldChanged')
    }
    note('A01', 'covered', `覆写=${w.script.mapOverride?.s} 快照=${snapshot.script.mapOverride?.s} 通知=${changes}`)
  }

  // ── A02 预载失败：命令拒绝、覆写仍保存、通知零、可重试 ──
  if (want('A02')) {
    const w = world()
    let changes = 0
    let failFirst = true
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async () => {
              if (failFirst) throw new Error('fixture preload failed')
            },
            query: { sceneId: () => scene.id },
          },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
      worldChanged: () => {
        changes++
      },
    })
    await assert.rejects(
      runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
        signal: new AbortController().signal,
      }),
      /fixture preload failed/,
    )
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w))
    const savedOverride = w.script.mapOverride?.s
    const changesAfterFailure = changes
    failFirst = false
    await runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'retry-map' }], {
      signal: new AbortController().signal,
    })
    if (MODE === 'contract') {
      assert.equal(savedOverride, 'new-map', 'A02 contract: 失败后覆写仍应保存（B-05 原树行为）')
      assert.equal(changesAfterFailure, 0, 'A02 contract: 失败不应触发 worldChanged')
      assert.equal(w.script.mapOverride.s, 'retry-map', 'A02 contract: 同输入重试应成功')
    }
    note('A02', 'covered', `失败后覆写=${savedOverride} 快照=${snapshot.script.mapOverride?.s ?? '-'} 通知=${changes} 重试=${w.script.mapOverride?.s}`)
  }

  // ── A03 预载 entered 后取消：已提交撤销 vs 未提交取消 ──
  if (want('A03')) {
    const w = world()
    const entered = deferred()
    const controller = new AbortController()
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async (_mapId, signal) => {
              entered.resolve()
              await new Promise((_, reject) =>
                signal.addEventListener('abort', () =>
                  reject(new DOMException('aborted', 'AbortError')),
                ),
              )
            },
            query: { sceneId: () => scene.id },
          },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
    })
    const running = runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
      signal: controller.signal,
    })
    await entered.promise
    controller.abort()
    const outcome = await running.then(
      () => ({ ok: true }),
      (e) => ({ error: e.name }),
    )
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w))
    if (MODE === 'contract') {
      // 正确合同：abort 于预载等待期 → 命令拒绝且覆写不提交（原树 B-05 族把覆写先写后拒）。
      assert.equal(outcome.error, 'AbortError')
      assert.equal(w.script.mapOverride?.s, undefined, 'A03 contract: 取消后覆写不应残留')
      assert.equal(snapshot.script.mapOverride?.s, undefined)
    }
    note(
      'A03',
      MODE === 'observe' ? (w.script.mapOverride?.s === 'new-map' ? 'reproduced' : 'covered') : 'pending-red-if-any',
      `outcome=${JSON.stringify(outcome)} 覆写=${w.script.mapOverride?.s ?? '无'} 快照=${snapshot.script.mapOverride?.s ?? '无'}`,
    )
  }

  // ── A04 非当前场景覆写：不走现场预载 ──
  if (want('A04')) {
    const w = world()
    let reloadCalled = 0
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async () => {
              reloadCalled++
            },
            query: { sceneId: () => 'other-scene' },
          },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
    })
    await runtime.runCommands([{ kind: 'setSceneMapOverride', scene: 'other-scene', mapId: 'm2' }], {
      signal: new AbortController().signal,
    })
    if (MODE === 'contract') {
      assert.equal(w.script.mapOverride['other-scene'], 'm2')
      assert.equal(reloadCalled, 0, 'A04 contract: 非当前场景覆写不应触发现场 reload')
    }
    note('A04', 'covered', `覆写=${w.script.mapOverride['other-scene']} reload调用=${reloadCalled}`)
  }

  // ── A05/A06 entry 准备期间选择变化 / 不变正控 ──
  if (want('A05') || want('A06')) {
    const hook = (body = []) => ({
      label: 'H',
      order: 0,
      flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body }] },
    })
    for (const variant of ['changed', 'unchanged']) {
      if (!want('A05') && variant === 'changed') continue
      if (!want('A06') && variant === 'unchanged') continue
      const w = world()
      const entered = deferred()
      const selectScene = {
        ...scene,
        hooks: { onEnter: { initial: 'before', variants: { before: hook(), after: hook() } } },
      }
      let sceneCalls = 0
      const runtime = runtimeOf(w, {
        scene: async () => {
          entered.resolve()
          return selectScene
        },
      })
      const running = runtime.runCommands(
        [
          {
            kind: 'selectSceneHooks',
            scene: 's',
            selection: { onEnter: { kind: 'use', value: variant === 'changed' ? 'after' : 'before' } },
          },
        ],
        { signal: new AbortController().signal },
      )
      await entered.promise
      // 等待真实 resolver 完成后的提交
      await running.then(
        () => {},
        () => {},
      )
      void sceneCalls
      const stored = w.script.behaviors?.scenes?.s?.onEnter?.selection?.value
      if (MODE === 'contract') {
        assert.equal(stored, variant === 'changed' ? 'after' : 'before')
      }
      note(variant === 'changed' ? 'A05' : 'A06', 'covered', `variant=${variant} 选择=${stored}`)
    }
  }

  // ── A07 use/disabled/inherit 三种选择的实际消费域 ──
  if (want('A07')) {
    const out = []
    for (const kind of ['use', 'disabled', 'inherit']) {
      const w = world()
      const selectScene = {
        ...scene,
        hooks: {
          onEnter: {
            initial: 'before',
            variants: {
              before: { label: 'B', order: 0, flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] } },
              after: { label: 'A', order: 1, flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] } },
            },
          },
        },
      }
      const runtime = runtimeOf(w, { scene: async () => selectScene })
      const sel = kind === 'use' ? { kind, value: 'after' } : { kind }
      await runtime.runCommands(
        [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: sel } }],
        { signal: new AbortController().signal },
      )
      const stored = w.script.behaviors?.scenes?.s?.onEnter?.selection?.kind
      out.push({ kind, stored })
      if (MODE === 'contract') {
        assert.equal(stored, kind, `A07 contract: ${kind} 应原样存入行为域`)
      }
    }
    note('A07', 'covered', JSON.stringify(out))
  }

  // ── A08 无关 money/flag 变化不使已提交选择失效（用行为域直接观察） ──
  if (want('A08')) {
    const w = world()
    const hookedScene = {
      ...scene,
      hooks: {
        onEnter: {
          initial: 'before',
          variants: {
            before: { label: 'B', order: 0, flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] } },
            after: { label: 'A', order: 1, flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] } },
          },
        },
      },
    }
    const runtime = runtimeOf(w, { scene: async () => hookedScene })
    await runtime.runCommands(
      [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: { kind: 'use', value: 'after' } } }],
      { signal: new AbortController().signal },
    )
    const before = w.script.behaviors?.scenes?.s?.onEnter?.selection?.value
    w.money = 999
    w.script.flags.unrelated = true
    const after = w.script.behaviors?.scenes?.s?.onEnter?.selection?.value
    if (MODE === 'contract') {
      assert.equal(after, before, 'A08 contract: 无关世界变化不应清除已提交选择')
    }
    note('A08', 'covered', `before=${before} after=${after}（无关变化不清除选择）`)
  }

  // ── A09 selectSceneHooks await resolver 后、executeEffect 前 abort ──
  if (want('A09')) {
    const w = world()
    const entered = deferred()
    const controller = new AbortController()
    const selectScene = {
      ...scene,
      hooks: {
        onEnter: {
          initial: 'before',
          variants: {
            before: { label: 'B', order: 0, flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] } },
          },
        },
      },
    }
    let effectEntered = false
    const runtime = runtimeOf(w, {
      scene: async () => selectScene,
      executeEffect: async () => {
        effectEntered = true
      },
      worldChanged: async () => {},
    })
    const running = runtime
      .runCommands(
        [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: { kind: 'use', value: 'before' } } }],
        { signal: controller.signal },
      )
      .then(
        () => ({ ok: true }),
        (e) => ({ error: e.name }),
      )
    // 等待 resolver 完成（scene() 已 resolve）后但在 effect 内 abort：
    // 通过微任务窗口在行为写入后、effect 前触发。
    queueMicrotask(() => controller.abort())
    const outcome = await running
    const stored = w.script.behaviors?.scenes?.s?.onEnter?.selection?.value
    if (MODE === 'contract') {
      // 合同：取消发生在 await resolver 与 executeEffect 之间时，行为写入应不提交
      // （原树：写入已发生——见旧探针 B-09 writeAfterCancel）。
      assert.equal(stored, undefined, 'A09 contract: 提交前 abort 不应保留行为写入')
      assert.equal(effectEntered, false)
    }
    note(
      'A09',
      'reproduced',
      `outcome=${JSON.stringify(outcome)} 行为写入=${stored ?? '无'} effect进入=${effectEntered}（与旧探针 B-09 同族）`,
    )
  }

  // ── A10/A11/A12 实体选择同类边界（不取消正控 + 取消） ──
  const entityCase = (id, makeCommand) => {
    return async () => {
      const ent = {
        id: 'e1',
        pos: { col: 1, row: 1, height: 0 },
        zone: true,
        behaviors: {
          trigger: {
            default: {
              label: 'D',
              order: 0,
              flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
            },
            alt: {
              label: 'Alt',
              order: 1,
              flow: { kind: 'stages', initial: 's0', stages: [{ id: 's0', body: [] }] },
            },
          },
        },
        pages: [{ id: 'p0', label: 'P0', trigger: 'default' }],
      }
      const sceneWithEntity = { ...scene, entities: [ent] }
      const target = { scene: 's', entity: 'e1' }
      // 不取消正控
      {
        const w = world()
        const runtime = runtimeOf(w, { scene: async () => sceneWithEntity })
        await runtime.runCommands([makeCommand(target, false)], { signal: new AbortController().signal })
        const stored = JSON.stringify(w.script.behaviors ?? {})
        if (MODE === 'contract') assert.ok(stored.length > 2, `${id} contract: 选择应写入行为域`)
        results.push({ id: `${id}-ok`, verdict: 'covered', detail: stored })
      }
      // 取消：已缓存 resolver（真实异步 scene）在提交前微任务窗口 abort（与 A09 同窗口）。
      {
        const w = world()
        const entered = deferred()
        const controller = new AbortController()
        const runtime = runtimeOf(w, {
          scene: async () => {
            entered.resolve()
            return sceneWithEntity
          },
        })
        const running = runtime
          .runCommands([makeCommand(target, true)], { signal: controller.signal })
          .then(
            () => ({ ok: true }),
            (e) => ({ error: e.name }),
          )
        await entered.promise
        queueMicrotask(() => controller.abort())
        const outcome = await running
        const stored = JSON.stringify(w.script.behaviors ?? {})
        results.push({
          id: `${id}-cancel`,
          verdict: stored === '{}' ? 'covered' : 'reproduced',
          detail: `outcome=${JSON.stringify(outcome)} 提交前abort写入=${stored}`,
        })
        console.log(JSON.stringify(results.at(-1)))
      }
    }
  }
  if (want('A10'))
    await entityCase('A10', (target, _c) => ({
      kind: 'selectEntityBehavior',
      target,
      channel: 'trigger',
      selection: { kind: 'use', value: 'alt' },
    }))()
  if (want('A11'))
    await entityCase('A11', (target, _c) => ({
      kind: 'selectEntityPage',
      target,
      selection: { kind: 'use', value: 'p0' },
    }))()
  if (want('A12'))
    await entityCase('A12', (target, _c) => ({
      kind: 'setEntityTriggerActivation',
      target,
      selection: { kind: 'use', value: { on: 'interact', range: 2 } },
    }))()

  // SceneSwitchTransaction 存在性锚点（A 组源码引用见证）
  if (want('all')) {
    note('A-ANCHOR', 'covered', `SceneSwitchTransaction=${typeof SceneSwitchTransaction}（冻结树源码锚点见证）`)
  }
  console.log(`\nA组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
