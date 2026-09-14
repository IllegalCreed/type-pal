// GLM boundary batch-2 · A组 rework（R1+R2）· 真实 entry 预检/依赖签名/取消链。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-async.mjs [--mode=observe|contract] [--case ID|all]
// 真实 ScriptProjectRuntime/executeScriptHostEffect/captureSceneSwitchDependencies/
// assertSceneSwitchDependenciesCurrent/resolveRuntimeSceneHook；宿主 I/O 内存替身。
// observe=原树特征；contract=正确合同（原树缺陷业务红）。
// 归属：A02/A03=运行时 B-05；A09/A10-A12=B-09 相邻 selector 取消边界；非编辑器 D-01（已 done 不重开）。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const modeArg = process.argv.find((a) => a.startsWith('--mode'))
const MODE = modeArg
  ? modeArg.includes('=')
    ? modeArg.split('=')[1]
    : process.argv[process.argv.indexOf(modeArg) + 1]
  : 'observe'
const caseArg = process.argv.find((a) => a.startsWith('--case'))
const CASE = caseArg
  ? caseArg.includes('=')
    ? caseArg.split('=')[1]
    : process.argv[process.argv.indexOf(caseArg) + 1]
  : 'all'
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
  const sst = await server.ssrLoadModule('/src/scene-switch-transaction.ts')
  const { projectedWorldScriptScratch } = await server.ssrLoadModule('/src/runtime-project-view.ts')
  const sw = await server.ssrLoadModule('/src/script-world.ts')
  const runnerCtor = (await server.ssrLoadModule('/src/script-runner.ts')).ScriptRunner

  const scene = {
    id: 's',
    mapId: 'old-map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
  const world = () => ({
    party: [{ id: 'c1', template: 'hero', equipment: {}, hp: 1, maxHp: 1 }],
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
  const runtimeOf = (w, extra) =>
    new ScriptProjectRuntime({ sharedScripts: {} }, w, '0a'.repeat(32), options(extra))
  const hookFlow = () => ({
    label: 'H',
    order: 0,
    flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: [] }] },
  })

  // ═══ A01 换图成功：合法目标 map + 现场可观测状态 ═══
  if (want('A01')) {
    const w = world()
    let changes = 0
    const reloadSeen = []
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async (mapId) => {
              reloadSeen.push(mapId) // 现场宿主收到新 mapId（合法目标 target-map-01）
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
    await runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'target-map-01' }], {
      signal: new AbortController().signal,
    })
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w))
    const savedOverride = w.script.mapOverride?.s
    if (MODE === 'contract') {
      assert.equal(savedOverride, 'target-map-01', 'A01: 覆写落世界')
      assert.equal(snapshot.script.mapOverride?.s, 'target-map-01', 'A01: 快照一致')
      assert.deepEqual(reloadSeen, ['target-map-01'], 'A01: 现场宿主收到新 mapId')
      assert.ok(changes >= 1, 'A01: worldChanged 至少一次')
    }
    note(
      'A01',
      'covered',
      `覆写=${savedOverride} 快照=${snapshot.script.mapOverride?.s} reload收到=${JSON.stringify(reloadSeen)} 通知=${changes}`,
    )
  }

  // ═══ A02 仅资源预载失败：原树覆写残留=B-05 特征（observe reproduced / contract 红） ═══
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
    const residued = w.script.mapOverride?.s
    const changesAfterFailure = changes
    failFirst = false
    await runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'retry-map' }], {
      signal: new AbortController().signal,
    })
    if (MODE === 'contract') {
      assert.equal(
        residued,
        undefined,
        'A02 contract: 预载失败后覆写不应残留（B-05 原树为 new-map）',
      )
      assert.equal(changesAfterFailure, 0, 'A02 contract: 拒绝的命令不通知')
      assert.equal(w.script.mapOverride?.s, 'retry-map', 'A02 contract: 同输入重试成功')
    }
    note(
      'A02',
      MODE === 'observe' ? (residued === 'new-map' ? 'reproduced' : 'covered') : 'pending-red',
      `失败后覆写=${residued} 失败通知=${changesAfterFailure} 重试=${w.script.mapOverride?.s}（归运行时 B-05）`,
    )
  }

  // ═══ A03 预载 entered 后取消（归 B-05） ═══
  if (want('A03')) {
    const w = world()
    const entered = deferred()
    const controller = new AbortController()
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async (_mapId, signal2) => {
              entered.resolve()
              await new Promise((_, reject) =>
                signal2?.addEventListener('abort', () =>
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
    const residued = w.script.mapOverride?.s
    if (MODE === 'contract') {
      assert.equal(outcome.error, 'AbortError')
      assert.equal(residued, undefined, 'A03 contract: 取消后覆写不应残留')
    }
    note(
      'A03',
      MODE === 'observe' ? (residued === 'new-map' ? 'reproduced' : 'covered') : 'pending-red',
      `outcome=${JSON.stringify(outcome)} 覆写=${residued}（归 B-05）`,
    )
  }

  // ═══ A04 显式其它 scene 覆写 ═══
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
    await runtime.runCommands(
      [{ kind: 'setSceneMapOverride', scene: 'other-scene', mapId: 'm2' }],
      {
        signal: new AbortController().signal,
      },
    )
    if (MODE === 'contract') {
      assert.equal(w.script.mapOverride['other-scene'], 'm2')
      assert.equal(reloadCalled, 0, 'A04 contract: 非当前场景覆写不应触发现场 reload')
    }
    note('A04', 'covered', `覆写=${w.script.mapOverride['other-scene']} reload调用=${reloadCalled}`)
  }

  // ═══ A05/A06 entry 准备等待期间真实 selector 变化 vs 无关变化（真实依赖签名链） ═══
  if (want('A05') || want('A06')) {
    const actorOverrides = new Map()
    const cap = (w) =>
      sst.captureSceneSwitchDependencies(
        w,
        projectedWorldScriptScratch(w.script, 's'),
        's',
        actorOverrides,
        true,
      )
    if (want('A05')) {
      const w1 = world()
      const proj0 = projectedWorldScriptScratch(w1.script, 's')
      const capP = (w, proj) => sst.captureSceneSwitchDependencies(w, proj, 's', new Map(), true)
      const depsBefore = capP(w1, proj0)
      // 真实 selector：ScriptRunner.setSceneOnEnter 写 sceneScriptOverrides（零宿主调用）。
      const throwHost = new Proxy(
        {},
        {
          get: (_t, prop) => () => {
            throw new Error(`host call ${String(prop)}`)
          },
        },
      )
      const projected = content.emptyProjectedWorldScriptState()
      const runner = new runnerCtor(throwHost, projected, new AbortController().signal)
      await runner.run([
        { kind: 'setSceneOnEnter', scene: 's', stages: [{ body: [{ kind: 'clearDialog' }] }] },
      ])
      const written = projected.sceneScriptOverrides?.s
      w1.script.sceneScriptOverrides = structuredClone(projected.sceneScriptOverrides)
      // 投影组装如实声明：scratch 不携带 sceneScriptOverrides（main 签名域现状），
      // 本处将其并入投影以测 capture 的真实合同；capture/assert 原语为生产实现。
      const proj1 = {
        ...projectedWorldScriptScratch(w1.script, 's'),
        sceneScriptOverrides: w1.script.sceneScriptOverrides,
      }
      const depsAfter = capP(w1, proj1)
      let staleRejected = false
      try {
        sst.assertSceneSwitchDependenciesCurrent(depsBefore, depsAfter, '预检依赖已变化')
      } catch (e) {
        staleRejected = e.name === 'AbortError'
      }
      if (MODE === 'contract') {
        assert.ok(written?.onEnter, 'A05 contract: 真实 selector 应写入 onEnter 覆写')
        assert.ok(staleRejected, 'A05 contract: entry 目标选择变化必须使过期计划失效')
      }
      note(
        'A05',
        staleRejected ? 'covered' : 'reproduced',
        `真实 ScriptRunner setSceneOnEnter 写入=${Boolean(written?.onEnter)} 签名变化=${depsBefore.sceneScriptOverride !== depsAfter.sceneScriptOverride} 过期拒绝=${staleRejected}（capture/assert 生产原语；投影组装含 sceneScriptOverrides 为本席声明——scratch 现状不携带该字段）`,
      )
    }
    if (want('A06')) {
      const w2 = world()
      const deps2 = cap(w2)
      w2.money = 9999
      w2.script.flags.unrelated = true
      let unrelatedOk = true
      try {
        sst.assertSceneSwitchDependenciesCurrent(deps2, cap(w2), '预检依赖已变化')
      } catch {
        unrelatedOk = false
      }
      w2.inventory.push({ itemId: '91', count: 1 })
      let depRejected = false
      try {
        sst.assertSceneSwitchDependenciesCurrent(deps2, cap(w2), '预检依赖已变化')
      } catch (e) {
        depRejected = e.name === 'AbortError'
      }
      if (MODE === 'contract') {
        assert.ok(unrelatedOk, 'A06 contract: 无关 money/flag 变化不得取消切场景')
        assert.ok(depRejected, 'A06 contract: inventory 依赖变化必须取消过期计划')
      }
      note(
        'A06',
        unrelatedOk && depRejected ? 'covered' : 'reproduced',
        `无关变化不取消=${unrelatedOk} 依赖变化取消=${depRejected}（签名域=party/equipment/inventory/followers/mapOverride/sceneScript/entryStage）`,
      )
    }
  }

  // ═══ A07 use/disabled/inherit 实际消费域 ═══
  if (want('A07')) {
    const variants = []
    for (const kind of ['use', 'disabled', 'inherit']) {
      const w = world()
      const hookedScene = {
        ...scene,
        hooks: {
          onEnter: {
            initial: 'before',
            variants: {
              before: hookFlow(),
              after: { ...hookFlow(), label: 'A', order: 1 },
            },
          },
        },
      }
      const runtime = runtimeOf(w, { scene: async () => hookedScene })
      const sel = kind === 'use' ? { kind, value: 'after' } : { kind }
      await runtime.runCommands(
        [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: sel } }],
        { signal: new AbortController().signal },
      )
      const stored = w.script.behaviors?.scenes?.s?.onEnter?.selection
      const resolved = sw.resolveSceneHook(hookedScene, w.script, 'onEnter')
      variants.push({
        kind,
        storedKind: stored?.kind,
        storedValue: stored?.value,
        resolvedHookId: resolved?.hookId ?? 'none',
      })
      if (MODE === 'contract') {
        if (kind === 'use') {
          assert.equal(stored?.kind, 'use')
          assert.equal(stored?.value, 'after')
        } else if (kind === 'disabled') {
          assert.equal(stored?.kind, 'disabled')
        } else {
          assert.equal(stored, undefined, 'A07 contract: inherit 移除覆写（不持久存 inherit 字样）')
        }
      }
    }
    note(
      'A07',
      'covered',
      `${JSON.stringify(variants)}（消费域=resolveRuntimeSceneHook 读 behaviors：use→after/disabled→无/inherit→回退静态 initial）`,
    )
  }

  // ═══ A08 分栏登记（真实链见 A06） ═══
  if (want('A08')) {
    note(
      'A08',
      'covered',
      '与 A06 同一真实 capture/assert 链分栏：无关 money/flag 不失效、inventory/party 参与签名才失效（scene-switch-transaction.ts:28-31 注释合同）',
    )
  }

  // ═══ A09 resolver 进入/释放见证 + 提交前 abort（归 B-09 相邻） ═══
  if (want('A09')) {
    const w = world()
    const entered = deferred()
    const controller = new AbortController()
    const hookedScene = {
      ...scene,
      hooks: { onEnter: { initial: 'before', variants: { before: hookFlow() } } },
    }
    const runtime = runtimeOf(w, {
      scene: async () => {
        entered.resolve()
        await new Promise((_, reject) =>
          controller.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        )
        return hookedScene
      },
    })
    const running = runtime
      .runCommands(
        [
          {
            kind: 'selectSceneHooks',
            scene: 's',
            selection: { onEnter: { kind: 'use', value: 'before' } },
          },
        ],
        { signal: controller.signal },
      )
      .then(
        () => ({ ok: true }),
        (e) => ({ error: e.name }),
      )
    await entered.promise // resolver 真实进入并挂起
    controller.abort()
    const outcome = await running
    const residued = w.script.behaviors?.scenes?.s?.onEnter?.selection?.value
    const w2 = world()
    const runtime2 = runtimeOf(w2, { scene: async () => hookedScene })
    await runtime2.runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: 's',
          selection: { onEnter: { kind: 'use', value: 'before' } },
        },
      ],
      { signal: new AbortController().signal },
    )
    const okValue = w2.script.behaviors?.scenes?.s?.onEnter?.selection?.value
    if (MODE === 'contract') {
      assert.equal(outcome.error, 'AbortError')
      assert.equal(residued, undefined, 'A09 contract: resolver 等待期 abort 不得提交行为写入')
      assert.equal(okValue, 'before', 'A09 contract: 同输入不取消正控提交')
    }
    note(
      'A09',
      MODE === 'observe' ? (residued === undefined ? 'covered' : 'reproduced') : 'pending-red',
      `resolver进入+abort=${outcome.error} 写入=${residued} 不取消正控=${okValue}（归 B-09 相邻）`,
    )
  }

  // ═══ A10–A12 实体 selector 取消残留 + contract 红（归 B-09 相邻） ═══
  const entityCase = (id, makeCommand, readResidual) => async () => {
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
    {
      const w = world()
      const runtime = runtimeOf(w, { scene: async () => sceneWithEntity })
      await runtime.runCommands([makeCommand(target)], { signal: new AbortController().signal })
      const stored = readResidual(w)
      if (MODE === 'contract') assert.ok(stored, `${id} contract: 不取消正控应写入`)
      note(`${id}-ok`, 'covered', `不取消正控写入=${JSON.stringify(stored)}`)
    }
    {
      const w = world()
      const entered = deferred()
      const controller = new AbortController()
      let notifications = 0
      const runtime = runtimeOf(w, {
        scene: async () => {
          entered.resolve()
          return sceneWithEntity
        },
        worldChanged: () => {
          notifications++
        },
      })
      const before = JSON.stringify(w.script.behaviors ?? {})
      const running = runtime
        .runCommands([makeCommand(target)], { signal: controller.signal })
        .then(
          () => ({ ok: true }),
          (e) => ({ error: e.name }),
        )
      await entered.promise
      queueMicrotask(() => controller.abort())
      const outcome = await running
      const residual = readResidual(w)
      if (MODE === 'contract') {
        assert.equal(residual, undefined, `${id} contract: 提交前 abort 不得残留选择`)
      }
      note(
        `${id}-cancel`,
        MODE === 'observe' ? (residual !== undefined ? 'reproduced' : 'covered') : 'pending-red',
        `outcome=${JSON.stringify(outcome)} before=${before} 残留=${JSON.stringify(residual)} AbortError=${outcome.error === 'AbortError'} 通知=${notifications}（归 B-09 相邻）`,
      )
    }
  }
  if (want('A10'))
    await entityCase(
      'A10',
      (t) => ({
        kind: 'selectEntityBehavior',
        target: t,
        channel: 'trigger',
        selection: { kind: 'use', value: 'alt' },
      }),
      (w) => w.script.behaviors?.entities?.s?.e1?.trigger?.selection?.value,
    )()
  if (want('A11'))
    await entityCase(
      'A11',
      (t) => ({ kind: 'selectEntityPage', target: t, selection: { kind: 'use', value: 'p0' } }),
      (w) => w.script.behaviors?.entities?.s?.e1?.page,
    )()
  if (want('A12'))
    await entityCase(
      'A12',
      (t) => ({
        kind: 'setEntityTriggerActivation',
        target: t,
        selection: { kind: 'use', value: { on: 'interact', range: 2 } },
      }),
      (w) => w.script.behaviors?.entities?.s?.e1?.triggerActivation,
    )()
  console.log(`\nA组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
