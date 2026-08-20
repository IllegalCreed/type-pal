import type { FlowActivityLease, FlowRuntimeCoordinator } from './script-world.js'

/**
 * Reforge 内部 capability：同一 runtime + exact AbortSignal 表示同一条脚本 activity lineage。
 * token 不进入 content、host 公共接口或存档；WeakMap 也不会延长 runtime/signal 生命周期。
 */
const activeLineages = new WeakMap<object, WeakMap<AbortSignal, number>>()

function lineagesFor(runtimeKey: object): WeakMap<AbortSignal, number> {
  let lineages = activeLineages.get(runtimeKey)
  if (!lineages) {
    lineages = new WeakMap()
    activeLineages.set(runtimeKey, lineages)
  }
  return lineages
}

function hasLineage(runtimeKey: object, signal: AbortSignal): boolean {
  return (lineagesFor(runtimeKey).get(signal) ?? 0) > 0
}

/**
 * 持久 flow 已经持有 coordinator lease；这里只登记不可伪造的内部 lineage，
 * 让 startBattle/onDefeated 子链复用父活动，避免 save gate 关闭后等待自己。
 */
export async function withRegisteredScriptActivityLineage<T>(
  runtimeKey: object,
  signal: AbortSignal,
  body: () => T | Promise<T>,
): Promise<T> {
  const lineages = lineagesFor(runtimeKey)
  lineages.set(signal, (lineages.get(signal) ?? 0) + 1)
  try {
    return await body()
  } finally {
    const remaining = (lineages.get(signal) ?? 1) - 1
    if (remaining > 0) lineages.set(signal, remaining)
    else lineages.delete(signal)
  }
}

/**
 * 无父 flow 的 hostile/dev/物品等入口登记 transient activity；若 exact lineage 已存在，
 * 直接借用父 lease。新活动在 save gate 关闭时等待，且 abort 不会留下迟到执行。
 */
export async function withScriptActivityLineage<T>(
  runtimeKey: object,
  coordinator: FlowRuntimeCoordinator,
  signal: AbortSignal,
  body: () => T | Promise<T>,
): Promise<T> {
  if (hasLineage(runtimeKey, signal)) return await body()

  let activity: FlowActivityLease | undefined = coordinator.beginActivity()
  while (!activity && coordinator.gateClosed()) {
    await coordinator.waitForActivationGate(signal)
    signal.throwIfAborted()
    activity = coordinator.beginActivity()
  }
  if (!activity) throw new Error('script transient activity 无法登记')
  try {
    return await withRegisteredScriptActivityLineage(runtimeKey, signal, body)
  } finally {
    activity.close()
  }
}
