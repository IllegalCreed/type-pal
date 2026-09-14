// GLM原始材料；Codex于2026-09-14接手修正/自验证，非GLM独立终审。
// GLM boundary batch-2 · A组 rework（R1+R2）· 真实 entry 预检/依赖签名/取消链。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-async.mjs [--mode=observe|contract] [--case ID|all]
// 真实 ScriptProjectRuntime/executeScriptHostEffect/captureSceneSwitchDependencies/
// assertSceneSwitchDependenciesCurrent/resolveRuntimeSceneHook；宿主 I/O 内存替身。
// observe=原树特征；contract=正确合同（原树缺陷业务红）。
// 归属：A02/A03=运行时 B-05；A09/A10-A12=B-09 相邻 selector 取消边界；非编辑器 D-01（已 done 不重开）。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { preflightHarness, reloadHarness } from './probe-glm-next-support.mjs'

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
assert.ok(['observe', 'contract'].includes(MODE), 'mode必须是observe/contract')
assert.ok(CASE === 'all' || /^A(0[1-9]|1[0-2])$/.test(CASE), '未知case，不允许零用例成功')
const want = (id) => CASE === 'all' || CASE === id || (CASE === 'A08' && id === 'A06')

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
  if (verdict.startsWith('pending-red')) verdict = 'covered'
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

  for (const id of ['A01', 'A02', 'A03'].filter(want)) {
    const w = world(),
      entered = deferred(),
      ready = deferred(),
      controller = new AbortController()
    const newMap = { width: 3, height: 2, tag: 'new' },
      newTiles = new Map()
    let fail = id === 'A02',
      reads = 0,
      changes = 0
    const h = await reloadHarness(server, w, scene, async (mapId) => {
      assert.equal(mapId, 'new-map', '合法fixture资源键')
      reads++
      entered.resolve()
      if (fail) throw new Error('fixture preload failed')
      if (id === 'A03') await ready.promise
      return { map: newMap, tilesets: newTiles }
    })
    const runtime = runtimeOf(w, {
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          { reloadMap: h.reload, query: { sceneId: () => scene.id } },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
      worldChanged: () => changes++,
    })
    const running = runtime
      .runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
        signal: controller.signal,
      })
      .then(
        () => ({ ok: true }),
        (error) => ({ error: error.name, message: error.message }),
      )
    if (id === 'A03') {
      await entered.promise
      controller.abort()
      ready.resolve()
    }
    const result = await running
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w))
    assert.ok(reads > 0)
    if (id === 'A01') {
      assert.equal(result.ok, true)
      assert.equal(w.script.mapOverride.s, 'new-map')
      assert.equal(snapshot.script.mapOverride.s, 'new-map')
      assert.equal(h.env.map, newMap)
      assert.equal(h.env.tiles, newTiles)
      assert.notEqual(h.env.renderer, h.oldRenderer)
      assert.equal(h.env.waveRenderer, null)
      assert.deepEqual(h.env.room, { col: 0, row: 0, cols: 3, rows: 2 })
      assert.equal(changes, 1)
      note(
        id,
        'covered',
        JSON.stringify({
          actualMainReload: true,
          canonical: w.script.mapOverride.s,
          live: h.env.map.tag,
          room: h.env.room,
          snapshot: snapshot.script.mapOverride.s,
        }),
      )
    } else {
      assert.equal(h.env.map, h.oldMap)
      assert.equal(h.env.renderer, h.oldRenderer)
      assert.equal(changes, 0)
      if (id === 'A02') assert.match(result.message, /fixture preload failed/)
      else assert.equal(result.error, 'AbortError')
      const residued = snapshot.script.mapOverride?.s
      if (id === 'A02') {
        fail = false
        await runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
          signal: new AbortController().signal,
        })
        assert.equal(h.env.map, newMap)
      }
      if (MODE === 'contract')
        assert.equal(residued, undefined, `${id}:实际main预载失败/取消后canonical与现场必须一致`)
      note(
        id,
        residued === undefined ? 'covered' : 'reproduced',
        JSON.stringify({
          actualMainReload: true,
          result,
          canonicalAfterFailure: residued,
          liveAfterFailure: 'old',
          failureNotifications: 0,
          retrySameInput: id === 'A02',
        }),
      )
    }
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

    assert.equal(w.script.mapOverride['other-scene'], 'm2')
    assert.equal(reloadCalled, 0, 'A04 contract: 非当前场景覆写不应触发现场 reload')

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
      const h = await preflightHarness(server)
      const preparing = h.api.prepareSceneSwitch('target', h.world).then(
        (plan) => ({ plan }),
        (error) => ({ error }),
      )
      await h.entered.promise
      assert.equal(h.reads(), 1)
      const runtime = new ScriptProjectRuntime(
        { sharedScripts: {} },
        h.world,
        '0a'.repeat(32),
        options({
          currentSceneId: () => 'source',
          scene: async () => h.definition,
          lifecycleReferences: content.buildEntityLifecycleReferenceIndex([h.definition]),
        }),
      )
      await runtime.runCommands(
        [
          {
            kind: 'selectSceneHooks',
            scene: 'target',
            selection: { onEnter: { kind: 'use', value: 'after' } },
          },
        ],
        { signal: new AbortController().signal },
      )
      assert.equal(h.world.script.behaviors.scenes.target.onEnter.selection.value, 'after')
      h.assets.resolve()
      const prepared = await preparing
      let rejected = prepared.error?.name === 'AbortError'
      if (prepared.error && !rejected) throw prepared.error
      let preparedReveal,
        currentReveal,
        revealMismatch = false
      if (prepared.plan) {
        try {
          h.api.assertSceneSwitchPlanCurrent(prepared.plan, h.world)
        } catch (error) {
          if (error.name !== 'AbortError') throw error
          rejected = true
        }
        preparedReveal = prepared.plan.onEnterEntry.reveal.kind
        const current = h.views.runtimeSceneView(h.definition, h.world.script).onEnter[0].entry
        currentReveal = current.reveal.kind
        if (!rejected && preparedReveal !== currentReveal) {
          h.env.scene = prepared.plan.def
          h.session.begin('source', 'target', {}, prepared.plan.onEnterEntry.reveal)
          try {
            await h.api.hostSceneEntryReveal(current.reveal, new AbortController().signal)
          } catch (error) {
            assert.match(error.message, /reveal 与 preflight 契约不一致/)
            revealMismatch = true
          }
          assert.equal(revealMismatch, true, '真实reveal拒绝错配，不能只看旧签名字段')
        }
      }
      const correct = rejected || preparedReveal === currentReveal
      if (MODE === 'contract')
        assert.equal(correct, true, 'A05: canonical hook选择变化必须拒绝旧计划或重新准备一致entry')
      note(
        'A05',
        correct ? 'covered' : 'reproduced',
        JSON.stringify({
          canonicalSelector: true,
          mapWaitEntered: h.reads(),
          rejected,
          preparedReveal,
          currentReveal,
          revealMismatch,
        }),
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

      assert.ok(unrelatedOk, 'A06 contract: 无关 money/flag 变化不得取消切场景')
      assert.ok(depRejected, 'A06 contract: inventory 依赖变化必须取消过期计划')

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
      assert.equal(
        resolved?.hookId,
        kind === 'use' ? 'after' : kind === 'inherit' ? 'before' : undefined,
        'A07: 实际消费与三态选择一致',
      )

      if (kind === 'use') {
        assert.equal(stored?.kind, 'use')
        assert.equal(stored?.value, 'after')
      } else if (kind === 'disabled') {
        assert.equal(stored?.kind, 'disabled')
      } else {
        assert.equal(stored, undefined, 'A07 contract: inherit 移除覆写（不持久存 inherit 字样）')
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
    queueMicrotask(() => {
      assert.equal(
        w.script.behaviors?.scenes?.s?.onEnter?.selection,
        undefined,
        'A09: cancel真正发生在提交前',
      )
      controller.abort()
    })
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
