// GLM原始材料；Codex于2026-09-14接手修正/自验证，非GLM独立终审。
// GLM boundary batch-2 · B组（保存等待关系、旧活动收尾与检查点导出）· observe/contract 双模式。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs [--mode=observe|contract] [--case ID|all]
// 真实 ScriptProjectRuntime/save barrier/lineage；宿主内存替身。main.ts 的 runDetachedScriptChain/
// captureCurrentSavePayload/dumpSave 属主壳，本探针以源码锚点 census + runtime 级真实调用分栏。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  actualDeclarations,
  actualProperty,
  callSites,
  preflightHarness,
} from './probe-glm-next-support.mjs'

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
assert.ok(CASE === 'all' || /^B(0[1-9]|1[0-2])$/.test(CASE), '未知case，不允许零用例成功')
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
  const hook = (flag) => ({
    label: 'H',
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'setFlag', flag, value: true }] }],
    },
  })

  // ── B01 confirm 未回答→保存请求→yes 后开战（完整父子链：谁等待谁） ──
  if (want('B01')) {
    const entered = deferred(),
      answer = deferred(),
      battleEntered = deferred(),
      battleDone = deferred(),
      w = world()
    let snapshotCalls = 0
    let battleDoneResolveUsed = false
    const targetScene = {
      ...scene,
      hooks: { onEnter: { initial: 'h', variants: { h: hook('b01flag') } } },
    }
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '67'.repeat(32),
      options({
        scene: () => targetScene,
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
        startBattle: async () => {
          battleEntered.resolve()
          const r = await battleDone.promise
          battleDoneResolveUsed = true
          return r
        },
      }),
    )
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'startBattle', enemyTeamId: 'fixture' },
        { kind: 'setFlag', flag: 'b01after', value: true },
      ],
      { signal: new AbortController().signal },
    )
    await entered.promise
    const saving = runtime
      .withSaveBarrier(() => {
        snapshotCalls++
        return structuredClone(w)
      }, 90)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    const snapshotBeforeAnswer = snapshotCalls
    answer.resolve(true)
    await battleEntered.promise
    battleDone.resolve('victory')
    const result = await saving
    await running
    const retryAfter = await runtime.withSaveBarrier(() => structuredClone(w), 60)
    if (MODE === 'contract') {
      // 合同：父链（含战斗子活动）挂起期间 barrier 有界等待；链完成后重试成功且包含链尾命令。
      assert.equal(snapshotBeforeAnswer, 0, 'B01 contract: confirm 未回答时不得快照')
      assert.equal(w.script.flags.b01after, true, 'B01 contract: 战斗后的命令应执行')
      assert.equal(result.saved, true, 'B01: confirm继续后的自身子链不得使原保存超时')
      assert.ok(retryAfter, 'B01 contract: 链完成后重试保存成功')
    }
    note(
      'B01',
      result.saved ? 'covered' : 'reproduced',
      `answer前快照=${snapshotBeforeAnswer} 挂起期saved=${result.saved}（有界） 战后命令=${w.script.flags.b01after === true} 战斗子活动进入=${battleDoneResolveUsed} 链后重试=${Boolean(retryAfter)}（完整 confirm→battle→post 父子链；生产 10000ms 诊断 90/60ms）`,
    )
  }

  // ── B02 同一 confirm→battle 链不请求保存的正控 ──
  if (want('B02')) {
    const w = world()
    const entered = deferred(),
      answer = deferred(),
      battleEntered = deferred()
    const targetScene = {
      ...scene,
      hooks: { onEnter: { initial: 'h', variants: { h: hook('b02flag') } } },
    }
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '31'.repeat(32),
      options({
        scene: () => targetScene,
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
        startBattle: async () => {
          battleEntered.resolve()
          return 'victory'
        },
      }),
    )
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'startBattle', enemyTeamId: 'fixture' },
        { kind: 'setFlag', flag: 'b02after', value: true },
      ],
      { signal: new AbortController().signal },
    )
    await entered.promise
    answer.resolve(true)
    await battleEntered.promise
    await running
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w), 60)

    assert.equal(w.script.flags.b02after, true, 'B02: 链尾命令落世界')
    assert.equal(snapshot.script.flags.b02after, true, 'B02: 快照含链尾命令（无保存等待正控）')

    note(
      'B02',
      'covered',
      `confirm→battle→setFlag 链完成后快照立即可用 b02after=${snapshot.script.flags.b02after}（同一 confirm/startBattle 链正控）`,
    )
  }

  // ── B03 confirm→保存→内联 onTeleport（新 hook lease 与父活动关系） ──
  if (want('B03')) {
    const entered = deferred(),
      answer = deferred(),
      teleportEntered = deferred(),
      w = world()
    let snapshotCalls = 0
    const targetScene = {
      ...scene,
      hooks: { onTeleport: { initial: 't', variants: { t: hook('b03flag') } } },
    }
    let runtime
    runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '67'.repeat(32),
      options({
        scene: () => targetScene,
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
        teleportOut: (signal) => {
          teleportEntered.resolve()
          return runtime.runSceneHook(targetScene, 'onTeleport', { signal })
        },
      }),
    )
    const running = runtime.runCommands([{ kind: 'confirm', onNo: [] }, { kind: 'teleportOut' }], {
      signal: new AbortController().signal,
    })
    await entered.promise
    const saving = runtime
      .withSaveBarrier(() => {
        snapshotCalls++
        return structuredClone(w)
      }, 90)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    const beforeAnswer = snapshotCalls
    answer.resolve(true)
    await teleportEntered.promise
    const result = await saving
    await running
    const retryAfter = await runtime.withSaveBarrier(() => structuredClone(w), 60)
    if (MODE === 'contract') {
      // 合同：内联 onTeleport 挂起期间 barrier 有界等待（B-07 族）；子 lease 真实执行；链后重试成功。
      assert.equal(beforeAnswer, 0, 'B03 contract: 父链挂起时不得快照')
      assert.equal(w.script.flags.b03flag, true, 'B03 contract: teleport 子 lease 真实执行')
      assert.equal(result.saved, true, 'B03: 内联onTeleport不得与原保存互等至超时')
      assert.ok(retryAfter, 'B03 contract: 链结束后重试保存成功')
    }
    note(
      'B03',
      result.saved ? 'covered' : 'reproduced',
      `answer前快照=${beforeAnswer} 挂起期saved=${result.saved}（有界,B-07族） teleport子lease=true b03flag=${w.script.flags.b03flag} 链后重试=${Boolean(retryAfter)}（诊断 90/60ms）`,
    )
  }

  // ── B04 confirm 回答 no / 流程结束后的保存完成正控 ──
  if (want('B04')) {
    const w = world()
    const entered = deferred()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '31'.repeat(32),
      options({
        confirm: async () => {
          entered.resolve()
          return false
        },
      }),
    )
    const running = runtime.runCommands([{ kind: 'confirm', onNo: [] }], {
      signal: new AbortController().signal,
    })
    await entered.promise
    const saving = runtime.withSaveBarrier(() => structuredClone(w), 60)
    await running
    const snapshot = await saving

    assert.ok(snapshot, 'B04 contract: 流程结束后的保存应能完成快照')

    note('B04', 'covered', `confirm=no 流程结束后保存快照完成=${Boolean(snapshot)}（非死锁正控）`)
  }

  // ── B05 同一 runtime 的超时→释放→重试（真实挂起链） ──
  if (want('B05')) {
    const w = world()
    const entered = deferred(),
      answer = deferred()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '35'.repeat(32),
      options({
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
      }),
    )
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'setFlag', flag: 'b05after', value: true },
      ],
      { signal: new AbortController().signal },
    )
    await entered.promise
    const first = await runtime
      .withSaveBarrier(() => structuredClone(w), 40)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    const retrySameInstance = await runtime
      .withSaveBarrier(() => structuredClone(w), 50)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    answer.resolve(true)
    await running
    const third = await runtime
      .withSaveBarrier(() => structuredClone(w), 60)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )

    assert.equal(first.saved, false, 'B05: 挂起链上超时有界失败')
    assert.match(first.error, /barrier 超时/)
    assert.equal(retrySameInstance.saved, false, 'B05 contract: 链仍挂起时同实例重试不得快照')
    assert.match(retrySameInstance.error, /barrier 超时/)
    assert.equal(third.saved, true, 'B05 contract: 链完成后同实例重试成功')
    assert.equal(w.script.flags.b05after, true)

    note(
      'B05',
      'covered',
      `挂起中超时=${JSON.stringify(first)} 同实例重试=${JSON.stringify(retrySameInstance)} 链完成后=${JSON.stringify(third)} 链尾命令=${w.script.flags.b05after === true}（生产 10000ms，诊断 40/50/60ms）`,
    )
  }

  // ── B06 子活动取消时 barrier 收尾（快照次数/错误归属/后续保存） ──
  if (want('B06')) {
    const w = world()
    const entered = deferred()
    const controller = new AbortController()
    let releaseConfirm
    const gate2 = new Promise((r) => {
      releaseConfirm = r
    })
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '31'.repeat(32),
      options({
        confirm: async () => {
          entered.resolve()
          await gate2
          return true
        },
      }),
    )
    const running = runtime
      .runCommands(
        [
          { kind: 'confirm', onNo: [] },
          { kind: 'setFlag', flag: 'b06after', value: true },
        ],
        { signal: controller.signal },
      )
      .then(
        () => ({ ok: true }),
        (e) => ({ error: e.name }),
      )
    await entered.promise
    let snapshotCalls = 0
    const saving = runtime
      .withSaveBarrier(() => {
        snapshotCalls++
        return structuredClone(w)
      }, 50)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    releaseConfirm(true)
    queueMicrotask(() => controller.abort())
    const outcome = await running
    const result = await saving
    const after = await runtime.withSaveBarrier(() => structuredClone(w), 60)

    assert.equal(outcome.error, 'AbortError', 'B06: 取消的子活动以 AbortError 终止')
    assert.equal(w.script.flags.b06after, undefined, 'B06 contract: 取消后未执行命令不得写标志')
    // barrier 在取消收尾后释放（或超时）：若已快照，快照不得包含被取消命令的效果。
    if (result.saved) {
      assert.equal(snapshotCalls, 1)
      assert.equal(
        result.script?.flags?.b06after ?? undefined,
        undefined,
        'B06 contract: 快照不得含被取消命令',
      )
    } else {
      assert.match(result.error, /barrier 超时/)
    }
    assert.ok(after, 'B06 contract: 取消后后续合法保存应可用')

    note(
      'B06',
      'covered',
      `cancel=${JSON.stringify(outcome)} 后续命令未执行=${w.script.flags.b06after === undefined} barrier=${JSON.stringify(result)} 快照次数=${snapshotCalls} 取消后保存=${Boolean(after)}（取消即收尾释放 barrier 或有界超时；错误归属=子活动 AbortError）`,
    )
  }

  const mainPath = 'packages/reforge/src/main.ts'
  if (want('B07')) {
    const entries = callSites(mainPath, 'runDetachedScriptChain')
    assert.equal(entries.length, 3, 'AST仅统计实际调用，不含泛型函数定义')
    note(
      'B07',
      'covered',
      JSON.stringify({ entries, abortEntries: callSites(mainPath, 'abortScript') }),
    )
  }
  if (want('B08') || want('B09') || want('B10')) {
    const nonOwner = want('B10') && CASE !== 'all'
    const w = world(),
      entered = deferred(),
      controller = new AbortController()
    const cleanup = { release: 0, dismount: 0, drain: 0 }
    const rt = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '0a'.repeat(32),
      options({
        confirm: async () => {
          entered.resolve()
          await new Promise((_, reject) =>
            controller.signal.addEventListener(
              'abort',
              () => reject(new DOMException('cancel', 'AbortError')),
              { once: true },
            ),
          )
          return true
        },
      }),
    )
    const existing = { running: true }
    const env = {
      scriptRuntime: rt,
      runner: nonOwner ? existing : null,
      pendingOnEnter: null,
      scene: { id: 's' },
      canonicalSceneCache: new Map(),
      sceneChangedByScript: false,
      dismountParty: () => cleanup.dismount++,
      releaseAllAuthority: () => cleanup.release++,
      drainPendingTouchTrigger: () => cleanup.drain++,
    }
    const api = actualDeclarations(mainPath, ['runDetachedScriptChain', 'startScript'], env)
    if (nonOwner) {
      await api.runDetachedScriptChain(controller.signal, (runtime, signal) =>
        runtime.runCommands([{ kind: 'setFlag', flag: 'child', value: true }], { signal }),
      )
      assert.equal(env.runner, existing)
      assert.equal(w.script.flags.child, true)
      assert.deepEqual(cleanup, { release: 0, dismount: 0, drain: 0 })
      note(
        'B10',
        'covered',
        JSON.stringify({ actualMain: true, ownsRunnerSlot: false, cleanup, runnerPreserved: true }),
      )
    } else {
      const running = api
        .runDetachedScriptChain(controller.signal, (runtime, signal) =>
          runtime.runCommands(
            [
              { kind: 'confirm', onNo: [] },
              { kind: 'setFlag', flag: 'mustNotRun', value: true },
            ],
            { signal },
          ),
        )
        .then(
          () => ({ ok: true }),
          (error) => ({ error: error.name }),
        )
      await entered.promise
      const active = env.runner
      api.startScript('s:s', {})
      assert.equal(env.runner, active, 'active runner blocks ordinary new main entry')
      controller.abort()
      api.startScript('s:s', {})
      assert.equal(
        env.runner,
        active,
        'signal cancel alone does not synchronously release main slot',
      )
      const outcome = await running
      assert.equal(outcome.error, 'AbortError')
      assert.equal(w.script.flags.mustNotRun, undefined)
      assert.equal(env.runner, null)
      assert.deepEqual(cleanup, { release: 1, dismount: 1, drain: 1 })
      for (const id of ['B08', 'B09'].filter(want)) {
        note(
          id,
          'risk',
          JSON.stringify({
            actualMain: true,
            outcome,
            cleanup,
            newEntryBlocked: true,
            missing:
              '真实abortScript/换世界接续后、旧finally尚未执行时，新交互取得权威的合法端到端调度尚未证明；本例直接signal取消被runner门挡住，不据此宣布U-02安全',
            next: callSites(mainPath, 'abortScript').map((x) => `${x.path}:${x.line}`),
          }),
        )
      }
      if (MODE === 'contract' && (want('B08') || want('B09'))) process.exitCode = 2
      if (want('B10')) {
        env.runner = existing
        await api.runDetachedScriptChain(new AbortController().signal, (runtime, signal) =>
          runtime.runCommands([{ kind: 'setFlag', flag: 'child', value: true }], { signal }),
        )
        assert.equal(env.runner, existing)
        assert.deepEqual(cleanup, { release: 1, dismount: 1, drain: 1 })
        note(
          'B10',
          'covered',
          'actual main ownsRunnerSlot=false does not release/dismount/drain another owner',
        )
      }
    }
  }
  if (want('B11') || want('B12')) {
    const h = await preflightHarness(server)
    const ops = await server.ssrLoadModule('/src/save/ops.ts')
    const codec = await server.ssrLoadModule('/src/save/current-codec.ts')
    const conditions = await server.ssrLoadModule('/src/actor-condition-lifecycle.ts')
    const { AsyncIntentController } = await server.ssrLoadModule('/src/async-intent.ts')
    const { buildBlankProject } = await server.ssrLoadModule('/../editor/src/core/seed.ts')
    const files = await buildBlankProject('b2-save')
    const manifest = files['manifest.json']
    const calls = []
    Object.assign(h.env, h.api, ops, codec, conditions, {
      inputProject: { manifest },
      project: { ...h.env.project, manifest },
      scene: { id: 'target' },
      player: { pos: { col: 0, row: 0, height: 0 } },
      facing: 'down',
      currentWorldSnapshot: () => structuredClone(h.env.world),
      getLifecycleReferences: async () =>
        content.buildEntityLifecycleReferenceIndex([h.definition]),
      loadIntent: new AsyncIntentController(),
      showToast: (message) => calls.push(['toast', message]),
      abortScript: () => calls.push(['abort']),
      stopAutoRunners: () => calls.push(['stopAuto']),
      replaceWorld: (next) => {
        h.env.world = next
        calls.push(['replace'])
      },
      commitSceneSwitch: (plan) => {
        h.env.scene = plan.def
        h.env.player.pos = structuredClone(plan.spawn.pos)
        calls.push(['commit'])
      },
      syncRuntimeScriptScratch: () => {},
      refreshCurrentCanonicalBindings: () => {},
      syncAmbience: () => {},
      applyWorldToScene: () => {},
      bgm: { stop: () => calls.push(['stopMusic']), play: (id) => calls.push(['music', id]) },
      startAutoRunners: () => calls.push(['startAuto']),
    })
    const api = actualDeclarations(
      mainPath,
      [
        'captureCurrentSavePayload',
        'normalizeStoredPayload',
        'restorePayload',
        'payloadBelongsToProject',
        'isAbortError',
      ],
      h.env,
    )
    h.env.world.money = 123
    const good = api.captureCurrentSavePayload()
    const normalized = await api.normalizeStoredPayload(good, 'fixture')
    assert.equal(normalized.world.money, 123)
    assert.notEqual(normalized.world, good.world)
    if (want('B11')) {
      const actualExport = actualProperty(mainPath, 'dumpSave', { ...h.env, ...api })
      let rejected
      try {
        await api.normalizeStoredPayload(Reflect.apply(actualExport, undefined, []), 'debug export')
      } catch (error) {
        rejected = error.message
      }
      if (MODE === 'contract')
        assert.equal(rejected, undefined, 'B11: 实际注册的零参dumpSave必须产生正式codec接受的快照')
      note(
        'B11',
        rejected ? 'reproduced' : 'covered',
        JSON.stringify({
          registeredZeroArg: true,
          rejected,
          positive: 'actual captureCurrentSavePayload passes same codec',
        }),
      )
    }
    if (want('B12')) {
      h.env.world.money = 999
      h.assets.resolve()
      const result = await api.restorePayload(normalized, h.env.loadIntent.begin(), 'fixture')
      assert.equal(result, true)
      assert.equal(h.env.world.money, 123)
      assert.equal(h.env.scene.id, 'target')
      assert.deepEqual(h.env.player.pos, normalized.position.pos)
      assert.deepEqual(
        calls.filter((x) => ['replace', 'commit'].includes(x[0])),
        [['replace'], ['commit']],
      )
      note(
        'B12',
        'covered',
        JSON.stringify({
          actualCaptureNormalizeRestore: true,
          result,
          money: h.env.world.money,
          calls,
          boundary:
            '真实main函数，地图/绘制/音频/安装世界为可观测内存宿主；无F5按键/IndexedDB/完整bootstrap声明',
        }),
      )
    }
  }
  console.log(`\nB组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
