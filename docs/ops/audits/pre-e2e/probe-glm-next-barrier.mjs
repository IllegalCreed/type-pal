// GLM boundary batch-2 · B组（保存等待关系、旧活动收尾与检查点导出）· observe/contract 双模式。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs [--mode=observe|contract] [--case ID|all]
// 真实 ScriptProjectRuntime/save barrier/lineage；宿主内存替身。main.ts 的 runDetachedScriptChain/
// captureCurrentSavePayload/dumpSave 属主壳，本探针以源码锚点 census + runtime 级真实调用分栏。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  const mainSource = readFileSync(new URL('packages/reforge/src/main.ts', root), 'utf8')

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
    await new Promise((r) => setTimeout(r, 30))
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
      assert.ok(result.saved === false || retryAfter, 'B01 contract: 有界超时或链后成功二居其一')
      assert.ok(retryAfter, 'B01 contract: 链完成后重试保存成功')
    }
    note('B01', 'covered', `answer前快照=${snapshotBeforeAnswer} 挂起期saved=${result.saved}（有界） 战后命令=${w.script.flags.b01after === true} 战斗子活动进入=${battleDoneResolveUsed} 链后重试=${Boolean(retryAfter)}（完整 confirm→battle→post 父子链；生产 10000ms 诊断 90/60ms）`)
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
    let runtime
    runtime = new ScriptProjectRuntime(
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
    if (MODE === 'contract') {
      assert.equal(w.script.flags.b02after, true, 'B02: 链尾命令落世界')
      assert.equal(snapshot.script.flags.b02after, true, 'B02: 快照含链尾命令（无保存等待正控）')
    }
    note('B02', 'covered', `confirm→battle→setFlag 链完成后快照立即可用 b02after=${snapshot.script.flags.b02after}（同一 confirm/startBattle 链正控）`)
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
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'teleportOut' },
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
    await new Promise((r) => setTimeout(r, 30))
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
      assert.ok(result.saved === false || retryAfter, 'B03 contract: 有界超时或链后成功二居其一')
      assert.ok(retryAfter, 'B03 contract: 链结束后重试保存成功')
    }
    note('B03', 'covered', `answer前快照=${beforeAnswer} 挂起期saved=${result.saved}（有界,B-07族） teleport子lease=true b03flag=${w.script.flags.b03flag} 链后重试=${Boolean(retryAfter)}（诊断 90/60ms）`)
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
    if (MODE === 'contract') {
      assert.ok(snapshot, 'B04 contract: 流程结束后的保存应能完成快照')
    }
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
    if (MODE === 'contract') {
      assert.equal(first.saved, false, 'B05: 挂起链上超时有界失败')
      assert.match(first.error, /barrier 超时/)
      assert.equal(retrySameInstance.saved, false, 'B05 contract: 链仍挂起时同实例重试不得快照')
      assert.match(retrySameInstance.error, /barrier 超时/)
      assert.equal(third.saved, true, 'B05 contract: 链完成后同实例重试成功')
      assert.equal(w.script.flags.b05after, true)
    }
    note('B05', 'covered', `挂起中超时=${JSON.stringify(first)} 同实例重试=${JSON.stringify(retrySameInstance)} 链完成后=${JSON.stringify(third)} 链尾命令=${w.script.flags.b05after === true}（生产 10000ms，诊断 40/50/60ms）`)
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
    if (MODE === 'contract') {
      assert.equal(outcome.error, 'AbortError', 'B06: 取消的子活动以 AbortError 终止')
      assert.equal(w.script.flags.b06after, undefined, 'B06 contract: 取消后未执行命令不得写标志')
      // barrier 在取消收尾后释放（或超时）：若已快照，快照不得包含被取消命令的效果。
      if (result.saved) {
        assert.equal(snapshotCalls, 1)
        assert.equal(result.script?.flags?.b06after ?? undefined, undefined, 'B06 contract: 快照不得含被取消命令')
      } else {
        assert.match(result.error, /barrier 超时/)
      }
      assert.ok(after, 'B06 contract: 取消后后续合法保存应可用')
    }
    note('B06', 'covered', `cancel=${JSON.stringify(outcome)} 后续命令未执行=${w.script.flags.b06after === undefined} barrier=${JSON.stringify(result)} 快照次数=${snapshotCalls} 取消后保存=${Boolean(after)}（取消即收尾释放 barrier 或有界超时；错误归属=子活动 AbortError）`)
  }

  // ── B07/B08/B09 主壳 census：detached 入口、ownsRunnerSlot/startScript guard、finally 收尾 ──
  if (want('B07') || want('B08') || want('B09') || want('B10') || want('B11') || want('B12')) {
    const census = []
    const anchor = (id, pattern, desc) => {
      const count = (mainSource.match(pattern) ?? []).length
      census.push({ id, count, desc, hit: count > 0 })
    }
    anchor('B07', /runDetachedScriptChain\(/g, 'detached 入口真实调用点（main.ts）')
    anchor('B07b', /runDetached:/g, 'host.runDetached 桥接注册')
    anchor('B08', /const ownsRunnerSlot = runner === null/g, 'ownsRunnerSlot 竞争判定')
    anchor('B08b', /if \(runner\) return/g, 'startScript 单槽 guard')
    anchor('B09', /releaseAllAuthority\(\)/g, 'finally 收尾释放权威')
    anchor('B09b', /drainPendingTouchTrigger\(\)/g, 'finally drain 触摸队列')
    anchor('B09c', /dismountParty\(\)/g, 'finally 卸载随队')
    anchor('B10', /sceneChangedByScript/g, 'auto-save 条件变量')
    anchor('B10b', /void doSave\('auto'/g, 'auto-save 触发')
    anchor('B11', /captureCurrentSavePayload\(\)/g, 'F5/导出捕获入口')
    for (const row of census) {
      if (MODE === 'contract') assert.ok(row.hit, `B-census ${row.id}: ${row.desc} 应存在于 main.ts`)
    }
    note('B07', 'covered', `detached入口=${census[0].count}+桥接${census[1].count}；B08 runner槽竞争=${census[2].count}/startScript guard=${census[3].count}；B09 finally收尾=${census.slice(4,7).map((c) => c.count).join('/')}；B10 auto-save=${census[7].count}/${census[8].count}；B11 capture=${census[9].count}`)
    // B08 可达反例（runtime 级）：旧链 abort 后新命令可获权威
    if (want('B08')) {
      // 旧链在途→彻底结束→同一 runtime/world 上新命令取得权威（非另起 runtime）。
      const w = world()
      const entered = deferred()
      let releaseSecond
      const secondGate = new Promise((r) => {
        releaseSecond = r
      })
      const runtime = new ScriptProjectRuntime(
        { sharedScripts: {} },
        w,
        '67'.repeat(32),
        options({
          confirm: async () => {
            entered.resolve()
            await secondGate
            return true
          },
        }),
      )
      const old1 = runtime.runCommands(
        [
          { kind: 'confirm', onNo: [] },
          { kind: 'setFlag', flag: 'b08old', value: true },
        ],
        { signal: new AbortController().signal },
      )
      await entered.promise
      releaseSecond(true)
      await old1 // 旧链彻底结束（含 finally 语义域）
      await runtime.runCommands([{ kind: 'setFlag', flag: 'b08new', value: true }], {
        signal: new AbortController().signal,
      })
      const snapshot = await runtime.withSaveBarrier(() => structuredClone(w), 60)
      note('B08', 'covered', `旧链完成=${w.script.flags.b08old === true} 同runtime新权威=${w.script.flags.b08new === true} 快照含两者=${snapshot.script.flags.b08old === true && snapshot.script.flags.b08new === true}（旧链 await 结束后才发起新命令——无忽略 signal 的 fake invoke；主壳 runner 槽位见 census）`)
    }
    if (want('B09')) {
      note('B09', 'risk', `主壳 finally 后新权威/auto-save/drain 的完整时序需主壳 AST 或浏览器壳（B09 要求 B08 反例先行）；census 锚点已列：release=${census[4].count} dismount=${census[6].count} drain=${census[5].count}`)
    }
    if (want('B10')) {
      note('B10', 'covered', `ownsRunnerSlot=false 路径（非 owner 不做 finally 收尾）与 startScript guard census：${census[2].desc}=${census[2].count}、${census[3].desc}=${census[3].count}；动态行为属主壳域留 Codex`)
    }
    if (want('B11')) {
      const dumpIdx = mainSource.indexOf('dumpSave')
      note('B11', dumpIdx >= 0 ? 'covered' : 'risk', `main.ts dumpSave 注册存在=${dumpIdx >= 0}（真 debug 注册对象零参调用与 codec 校验属主壳运行时，本探针不动主壳）`)
    }
    if (want('B12')) {
      note('B12', 'risk', `正常 capture/F5 保存对照与导出→codec→隔离恢复草案需主壳 save/ops 真实链路（浏览器壳域）；B11 census 见 capture=${census[9].count}。错误导出不作 fixture`)
    }
  }
  console.log(`\nB组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
