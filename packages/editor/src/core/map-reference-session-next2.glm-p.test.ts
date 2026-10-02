// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 NEXT2（map-reference-session-next2.glm-p）：edit-session 地图引用
 * 扫描域 12 合同（Codex next2 packet P-NEXT2-01～12）。
 * 输入纪律：全部经 buildNext2Lab（seed → 文件级合法多地图 index/body → memoryAuthorDirectory
 * → 公开 loader → toEditorState(maps={}) 懒工作副本 → assertProjectSaveValid）构造真实
 * EditSession；读取门只声明 deferred/拒绝（允许的 port），真实读取仍走公开 loadProjectMap。
 * 去重（真实旧 fullName 锚，逐合同见 wave-P/next2/contracts.json）：
 * - tileset-references.test.ts › scans exact id/path without hydrating maps…（已证基础扫描/
 *   hydrate 不发生/全局 version-history-dirty 不变/旧六 worker 行为）；本文件不重领。
 * - tileset-references.test.ts › fails closed on read errors…（已证 Error 读失败 fail-closed
 *   与 retryFailures:true 后仍失败）；本文件只测默认不重试/重试成功清失败/非 Error 消息。
 * - edit-session.test.ts › 订阅与通知（全局 subscribe/unsubscribe）；timeline:198 已提交
 *   observer、timeline:495 失败 undo 同快照——本文件只测 map 引用订阅域与 markSaved 后
 *   batch memo 稳定（不同轴）。
 * 六 worker cap、迟到旧 path 结果、scan+hydrate 共享读、删除/redo 复查均为旧证，不重做。
 */
import { describe, expect, test } from 'vitest'
import { buildNext2Lab, gatedLoadMap } from '../__tests__/glm-p/next2/lab.js'
import { EditSession } from './edit-session.js'

/** 等到条件成立（短轮询；不扩产品 timeout）。 */
async function until(condition: () => boolean, tick = 4, limit = 400): Promise<void> {
  for (let i = 0; i < limit && !condition(); i++)
    await new Promise((done) => setTimeout(done, tick))
  if (!condition()) throw new Error('condition not reached')
}

describe('P-NEXT2-01 foreign state 不是当前权限', () => {
  test('结构克隆/他 session state 整串拒收；当前 state 返回同一 batch', async () => {
    const lab = await buildNext2Lab(1)
    const session = new EditSession(lab.state, {
      loadMap: (_id, path) => lab.loadReal(path),
    })
    const viaCurrent = session.getCurrentMapReferenceBatch(session.getState())
    expect(viaCurrent).toBe(session.getMapReferenceBatch())
    expect(() => session.getCurrentMapReferenceBatch(structuredClone(lab.state))).toThrow(
      '地图引用许可不属于当前编辑会话。',
    )
    const other = new EditSession(structuredClone(lab.state), {
      loadMap: (_id, path) => lab.loadReal(path),
    })
    expect(() => session.getCurrentMapReferenceBatch(other.getState())).toThrow(
      '地图引用许可不属于当前编辑会话。',
    )
  })
})

describe('P-NEXT2-02 引用订阅退订', () => {
  test('扫描挂起期退订一个监听：幸存者收终态更新，退订者不再被调用', async () => {
    const lab = await buildNext2Lab(1)
    const { loadMap, gate } = gatedLoadMap(lab, { visit: () => 'hold' })
    const session = new EditSession(lab.state, { loadMap })
    let keptCalls = 0
    let keptTerminal = false
    const kept = session.subscribeMapReferences(() => {
      keptCalls++
      const batch = session.getMapReferenceBatch()
      if (!batch.running && batch.done) keptTerminal = true
    })
    let removedCalls = 0
    const removed = session.subscribeMapReferences(() => {
      removedCalls++
    })
    const scanning = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 2)
    removed()
    const removedAt = removedCalls
    expect(removedCalls).toBeGreaterThan(0)
    for (const id of lab.mapIds) gate.release(id)
    await scanning
    kept()
    expect(keptCalls).toBeGreaterThan(removedAt)
    expect(keptTerminal).toBe(true)
    expect(removedCalls).toBe(removedAt)
    expect(session.getMapReferenceBatch()).toMatchObject({ completed: 2, total: 2, done: true })
  })
})

describe('P-NEXT2-03 map 域扫描不打扰全局观察者', () => {
  test('引用通知发生；全局订阅零调用且 version/historyVersion/dirty 不变', async () => {
    const lab = await buildNext2Lab(1)
    const session = new EditSession(lab.state, {
      loadMap: (_id, path) => lab.loadReal(path),
    })
    let globalCalls = 0
    const stopGlobal = session.subscribe(() => {
      globalCalls++
    })
    let refCalls = 0
    const stopRef = session.subscribeMapReferences(() => {
      refCalls++
    })
    const before = {
      version: session.getVersion(),
      history: session.getHistoryVersion(),
      dirty: session.isDirty(),
    }
    const batch = await session.ensureMapReferencesIndexed()
    expect(batch).toMatchObject({ completed: 2, total: 2, done: true })
    expect(refCalls).toBeGreaterThanOrEqual(2)
    expect(globalCalls).toBe(0)
    expect(session.getVersion()).toBe(before.version)
    expect(session.getHistoryVersion()).toBe(before.history)
    expect(session.isDirty()).toBe(before.dirty)
    stopGlobal()
    stopRef()
  })
})

describe('P-NEXT2-04 良性保存保持引用快照身份', () => {
  test('markSaved 后 batch 同引用且 generation/refVersion 不变', async () => {
    const lab = await buildNext2Lab(1)
    const session = new EditSession(lab.state, {
      loadMap: (_id, path) => lab.loadReal(path),
    })
    await session.ensureMapReferencesIndexed()
    const before = session.getMapReferenceBatch()
    const generation = before.generation
    const refVersion = session.getMapReferenceVersion()
    let globalCalls = 0
    const stop = session.subscribe(() => {
      globalCalls++
    })
    session.markSaved()
    stop()
    expect(globalCalls).toBe(1)
    const after = session.getMapReferenceBatch()
    expect(after).toBe(before)
    expect(after.generation).toBe(generation)
    expect(session.getMapReferenceVersion()).toBe(refVersion)
  })
})

describe('P-NEXT2-05 双扫描共享一次扫描生命周期', () => {
  test('同一挂起扫描上第二个 ensure：每图恰读一次、单次 initial-terminal 通知、同结果 batch', async () => {
    const lab = await buildNext2Lab(2)
    const { loadMap, gate } = gatedLoadMap(lab, { visit: () => 'hold' })
    const session = new EditSession(lab.state, { loadMap })
    const batches: unknown[] = []
    const stop = session.subscribeMapReferences(() => {
      batches.push(session.getMapReferenceBatch())
    })
    const first = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 3)
    const second = session.ensureMapReferencesIndexed()
    for (const id of lab.mapIds) gate.release(id)
    const [b1, b2] = await Promise.all([first, second])
    stop()
    expect(gate.started.sort()).toEqual([...lab.mapIds].sort())
    expect(new Set(gate.started).size).toBe(3)
    expect(b1).toEqual(b2)
    expect(b1).toMatchObject({ completed: 3, total: 3, done: true, running: false })
    const runningWindows = batches.filter((b) => (b as { running: boolean }).running)
    expect(runningWindows).toHaveLength(1)
  })
})

describe('P-NEXT2-06 默认重复扫描不重试已记录失败', () => {
  test('一次失败后默认 ensure：零新读取、同失败快照、generation 不变', async () => {
    const lab = await buildNext2Lab(1)
    const { loadMap, gate } = gatedLoadMap(lab, {
      visit: (id) => (id === 'lab-1' ? { reject: new Error('磁盘读取失败') } : 'hold'),
    })
    const session = new EditSession(lab.state, { loadMap })
    const first = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 2)
    gate.release('start')
    const failed = await first
    expect(failed.failures).toEqual([
      expect.objectContaining({ mapId: 'lab-1', message: '磁盘读取失败' }),
    ])
    const callsAfterFirst = gate.started.length
    const generationAfterFirst = failed.generation
    const second = await session.ensureMapReferencesIndexed()
    expect(gate.started.length).toBe(callsAfterFirst)
    expect(second.failures).toEqual(failed.failures)
    expect(second.generation).toBe(generationAfterFirst)
    expect(second.done).toBe(true)
    expect(second.completed).toBe(2)
  })
})

describe('P-NEXT2-07 显式重试在真实成功后清空失败', () => {
  test('先失败后 retryFailures:true 健康读取：done、零失败、覆盖完整、无 dirty/history', async () => {
    const lab = await buildNext2Lab(1)
    let failOnce = true
    const { loadMap, gate } = gatedLoadMap(lab, {
      visit: (id) => {
        if (id === 'lab-1' && failOnce) {
          failOnce = false
          return { reject: new Error('磁盘读取失败') }
        }
        return 'hold'
      },
    })
    const session = new EditSession(lab.state, { loadMap })
    const firstScan = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 2)
    gate.release('start')
    await firstScan
    const historyBefore = session.getHistoryVersion()
    const versionBefore = session.getVersion()
    const retry = session.ensureMapReferencesIndexed({ retryFailures: true })
    await until(() => gate.started.length === 3)
    gate.release('lab-1')
    const retried = await retry
    expect(retried).toMatchObject({ completed: 2, total: 2, done: true, failures: [] })
    expect(retried.coverage.map((entry) => entry.mapId).sort()).toEqual([...lab.mapIds].sort())
    expect(session.isDirty()).toBe(false)
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getVersion()).toBe(versionBefore)
    expect(Object.keys(session.getState().maps)).toEqual([])
  })
})

describe('P-NEXT2-08 非 Error IO 拒绝的公开消息', () => {
  test('loadMap 拒绝自有字符串：fail-closed 消息恰为 String(cause)', async () => {
    const lab = await buildNext2Lab(1)
    const { loadMap, gate } = gatedLoadMap(lab, {
      visit: (id) => (id === 'lab-1' ? { reject: 'owned-io-refusal' } : 'hold'),
    })
    const session = new EditSession(lab.state, { loadMap })
    const scanning = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 2)
    gate.release('start')
    const batch = await scanning
    expect(batch.failures).toEqual([
      expect.objectContaining({ mapId: 'lab-1', message: 'owned-io-refusal' }),
    ])
    expect(batch.failures[0]?.message).not.toMatch(/Error|undefined/)
  })
})

describe('P-NEXT2-09 第 8 完成先于第 9 完成发布进度', () => {
  test('9 图挂起：快照出现 completed=8/running=true，随后终态 completed=9', async () => {
    const lab = await buildNext2Lab(8)
    const { loadMap, gate } = gatedLoadMap(lab, { visit: () => 'hold' })
    const session = new EditSession(lab.state, { loadMap })
    const snapshots: { completed: number; running: boolean; done: boolean }[] = []
    const stop = session.subscribeMapReferences(() => {
      const b = session.getMapReferenceBatch()
      snapshots.push({ completed: b.completed, running: b.running, done: b.done })
    })
    const scanning = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length >= 6)
    for (const id of lab.mapIds.slice(0, 8)) gate.release(id)
    await until(() => snapshots.some((s) => s.completed === 8 && s.running))
    const progressIndex = snapshots.findIndex((s) => s.completed === 8 && s.running)
    gate.release(lab.mapIds[8]!)
    const final = await scanning
    stop()
    const finalIndex = snapshots.findIndex((s) => s.completed === 9 && !s.running)
    expect(progressIndex).toBeGreaterThanOrEqual(0)
    expect(finalIndex).toBeGreaterThan(progressIndex)
    expect(final).toMatchObject({ completed: 9, total: 9, done: true, running: false })
  })
})

describe('P-NEXT2-10 释放一个 worker 只启动一个排队读取', () => {
  test('8 图按住前 6：放行 1 张后恰第 7 张开始、第 8 张仍排队', async () => {
    const lab = await buildNext2Lab(7)
    const { loadMap, gate } = gatedLoadMap(lab, { visit: () => 'hold' })
    const session = new EditSession(lab.state, { loadMap })
    const scanning = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 6)
    expect(new Set(gate.started).size).toBe(6)
    gate.release(lab.mapIds[0]!)
    await until(() => gate.started.length === 7)
    const seventh = gate.started[6]
    expect(new Set(gate.started.slice(0, 7)).size).toBe(7)
    await new Promise((done) => setTimeout(done, 24))
    expect(gate.started.length).toBe(7)
    for (const id of lab.mapIds.slice(1)) gate.release(id)
    await until(() => gate.started.length === 8)
    gate.release(lab.mapIds[7]!)
    const batch = await scanning
    expect(batch).toMatchObject({ completed: 8, total: 8, done: true })
    expect(new Set(gate.started).size).toBe(8)
    expect(seventh).toBeDefined()
  })
})

describe('P-NEXT2-11 退订引用订阅不打断扫描', () => {
  test('扫描中途退订唯一监听：全部地图完成、batch/refVersion 正确', async () => {
    const lab = await buildNext2Lab(1)
    const { loadMap, gate } = gatedLoadMap(lab, { visit: () => 'hold' })
    const session = new EditSession(lab.state, { loadMap })
    let calls = 0
    const stop = session.subscribeMapReferences(() => {
      calls++
    })
    const scanning = session.ensureMapReferencesIndexed()
    await until(() => gate.started.length === 2)
    const versionAtUnsubscribe = session.getMapReferenceVersion()
    stop()
    const callsAtUnsubscribe = calls
    for (const id of lab.mapIds) gate.release(id)
    const batch = await scanning
    expect(calls).toBe(callsAtUnsubscribe)
    expect(batch).toMatchObject({ completed: 2, total: 2, done: true, running: false })
    expect(session.getMapReferenceVersion()).toBeGreaterThan(versionAtUnsubscribe)
    expect(
      session
        .getMapReferenceBatch()
        .coverage.map((entry) => entry.mapId)
        .sort(),
    ).toEqual([...lab.mapIds].sort())
  })
})

describe('P-NEXT2-12 缺 loader 经扫描 API fail-closed', () => {
  test('无 loadMap 选项：每图恰抛未配置消息、不完成健康批、零 hydrate/history', async () => {
    const lab = await buildNext2Lab(2)
    const session = new EditSession(lab.state)
    const mapsBefore = session.getState().maps
    const historyBefore = session.getHistoryVersion()
    const versionBefore = session.getVersion()
    const batch = await session.ensureMapReferencesIndexed()
    expect(batch.failures.map((f) => [f.mapId, f.message]).sort()).toEqual([
      ['lab-1', '未配置地图加载器，无法读取 "lab-1"'],
      ['lab-2', '未配置地图加载器，无法读取 "lab-2"'],
      ['start', '未配置地图加载器，无法读取 "start"'],
    ])
    expect(batch.completed).toBe(3)
    expect(batch.facts).toEqual([])
    expect(session.getState().maps).toBe(mapsBefore)
    expect(Object.keys(session.getState().maps)).toEqual([])
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getVersion()).toBe(versionBefore)
    expect(session.isDirty()).toBe(false)
  })
})
