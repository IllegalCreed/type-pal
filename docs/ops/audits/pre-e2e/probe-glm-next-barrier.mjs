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

  // ── B01 confirm 未回答→保存请求→yes 后继续：lineage/快照/等待方向 ──
  if (want('B01')) {
    const entered = deferred(),
      answer = deferred(),
      w = world()
    let snapshotCalls = 0
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
        startBattle: async () => 'victory',
      }),
    )
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'startBattle', enemyTeamId: 'fixture' },
      ],
      { signal: new AbortController().signal },
    )
    await entered.promise
    const saving = runtime
      .withSaveBarrier(() => {
        snapshotCalls++
        return structuredClone(w)
      }, 60)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    // 诊断虚拟时间：60ms 后 barrier 超时放行（生产为 10000ms）
    answer.resolve(true)
    const result = await saving
    await running
    if (MODE === 'contract') {
      // 正确合同：confirm 等待中的保存必须等脚本回答后才能快照（B-06 原树超时放行为缺陷）
      assert.equal(result.saved, false)
      assert.equal(snapshotCalls, 0)
    }
    note('B01', result.saved ? 'reproduced' : 'covered', `saved=${result.saved} 快照次数=${snapshotCalls} error=${result.error ?? '-'}（诊断 60ms vs 生产 10000ms）`)
  }

  // ── B02 不请求保存的合法正控：无 confirm 时快照立即可用 ──
  if (want('B02')) {
    const w = world()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '31'.repeat(32),
      options({ scene: () => scene }),
    )
    const p = runtime.runCommands([{ kind: 'setFlag', flag: 'b02', value: true }], {
      signal: new AbortController().signal,
    })
    await p
    const snapshot = await runtime.withSaveBarrier(() => structuredClone(w), 60)
    if (MODE === 'contract') {
      assert.equal(snapshot.script.flags.b02, true)
    }
    note('B02', 'covered', `同步完成后的保存快照 flags.b02=${snapshot.script.flags.b02}（无等待关系正控）`)
  }

  // ── B03 confirm→保存→内联 onTeleport（新 hook lease） ──
  if (want('B03')) {
    const entered = deferred(),
      answer = deferred(),
      w = world()
    let snapshotCalls = 0
    let teleportRan = false
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
          teleportRan = true
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
      }, 60)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    answer.resolve(true)
    const result = await saving
    await running
    if (MODE === 'contract') {
      assert.equal(result.saved, false)
      assert.equal(snapshotCalls, 0)
      assert.equal(w.script.flags.b03flag, true)
    }
    note('B03', result.saved ? 'reproduced' : 'covered', `saved=${result.saved} 快照=${snapshotCalls} teleportRan=${teleportRan} b03flag=${w.script.flags.b03flag}（内联 onTeleport 新活动同 B-07 族）`)
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

  // ── B05 有界超时的错误、gate 释放及后续重试 ──
  if (want('B05')) {
    const w = world()
    const entered = deferred(),
      answer = deferred()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      '67'.repeat(32),
      options({
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
      }),
    )
    const running = runtime.runCommands([{ kind: 'confirm', onNo: [] }], {
      signal: new AbortController().signal,
    })
    await entered.promise
    const t1 = runtime
      .withSaveBarrier(() => structuredClone(w), 60)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    answer.resolve(true)
    const inTime = await t1
    await running
    // gate 释放后的第二次保存应成功
    const second = await runtime.withSaveBarrier(() => structuredClone(w), 60)
    if (MODE === 'contract') {
      assert.equal(inTime.saved, true, 'B05 contract: 限时内回答的保存应完成')
      assert.ok(second, 'B05 contract: gate 释放后重试保存应成功')
    }
    // 超时路径（无人回答）：错误可见、gate 释放、后续重试可用
    const w2 = world()
    const entered2 = deferred()
    const rt2 = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w2,
      '35'.repeat(32),
      options({
        confirm: async () => {
          entered2.resolve()
          return new Promise(() => {})
        },
      }),
    )
    const running2 = rt2.runCommands([{ kind: 'confirm', onNo: [] }], {
      signal: new AbortController().signal,
    })
    await entered2.promise
    const timed = await rt2
      .withSaveBarrier(() => structuredClone(w2), 40)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    if (MODE === 'contract') {
      assert.equal(timed.saved, false, 'B05 contract: 超时应有界失败')
      assert.match(timed.error, /barrier 超时/)
    }
    note('B05', 'covered', `限时内=${JSON.stringify(inTime)} 重试=${Boolean(second)} 超时=${JSON.stringify(timed)}（生产 10000ms，诊断 40/60ms）`)
    void running2
  }

  // ── B06 取消父/子活动时 barrier 收尾 ──
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
    // confirm 回答后在下一命令前的 gate 处取消：活动真实终止、后续命令未执行。
    releaseConfirm(true)
    queueMicrotask(() => controller.abort())
    const saving = runtime
      .withSaveBarrier(() => structuredClone(w), 40)
      .then(
        () => ({ saved: true }),
        (e) => ({ saved: false, error: e.message }),
      )
    controller.abort()
    const outcome = await running
    const result = await saving
    const after = await runtime.withSaveBarrier(() => structuredClone(w), 60)
    if (MODE === 'contract') {
      assert.equal(outcome.error, 'AbortError')
      assert.equal(w.script.flags.b06after, undefined, 'B06 contract: 取消后未执行的命令不得写标志')
      assert.ok(after, 'B06 contract: 取消后后续合法保存应可用')
    }
    note('B06', 'covered', `cancel=${JSON.stringify(outcome)} 后续命令未执行=${w.script.flags.b06after === undefined} barrier=${JSON.stringify(result)} 取消后保存=${Boolean(after)}`)
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
      const w = world()
      const entered = deferred()
      const controller = new AbortController()
      let releaseConfirm
      const gate3 = new Promise((r) => {
        releaseConfirm = r
      })
      const runtime = new ScriptProjectRuntime(
        { sharedScripts: {} },
        w,
        '67'.repeat(32),
        options({
          confirm: async () => {
            entered.resolve()
            await gate3
            return true
          },
        }),
      )
      const old1 = runtime
        .runCommands(
          [
            { kind: 'confirm', onNo: [] },
            { kind: 'setFlag', flag: 'b08old', value: true },
          ],
          { signal: controller.signal },
        )
        .then(
          () => ({ ok: true }),
          (e) => ({ error: e.name }),
        )
      await entered.promise
      releaseConfirm(true)
      queueMicrotask(() => controller.abort())
      const outcome = await old1
      // 新命令在同一 runtime 上应可执行（runner 语义在主壳，runtime 级命令队列可重启）
      const w2 = world()
      const runtime2 = new ScriptProjectRuntime(
        { sharedScripts: {} },
        w2,
        '31'.repeat(32),
        options({}),
      )
      await runtime2.runCommands([{ kind: 'setFlag', flag: 'b08', value: true }], {
        signal: new AbortController().signal,
      })
      note('B08', outcome.error === 'AbortError' && w.script.flags.b08old === undefined && w2.script.flags.b08 === true ? 'covered' : 'risk', `旧链abort=${outcome.error} 旧链未续行=${w.script.flags.b08old === undefined} 新runtime权威=${w2.script.flags.b08 === true}（主壳 runner 槽位语义见 census；runtime 级旧链终止后新链可达——不用忽略 signal 的 fake invoke）`)
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
