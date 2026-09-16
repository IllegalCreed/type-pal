import type { FlowActivityLease, FlowLease, FlowRuntimeCoordinator } from './script-world.js'

/**
 * Reforge 内部 capability：同一 runtime + exact AbortSignal 表示同一条脚本 activity lineage。
 * token 不进入 content、host 公共接口或存档；WeakMap 也不会延长 runtime/signal 生命周期。
 */
interface Registration {
  coordinator: FlowRuntimeCoordinator
  lease: FlowLease
}

const activeLineages = new WeakMap<object, WeakMap<AbortSignal, Set<Registration>>>()

/** A finally-pending registration is not authority after its actual lease has closed. */
export function registeredScriptActivityLease(
  runtimeKey: object,
  coordinator: FlowRuntimeCoordinator,
  signal: AbortSignal,
): FlowLease | undefined {
  const registrations = activeLineages.get(runtimeKey)?.get(signal)
  let latest: FlowLease | undefined
  for (const registration of registrations ?? []) {
    if (registration.coordinator === coordinator && coordinator.hasActiveLease(registration.lease))
      latest = registration.lease
  }
  return latest
}

/**
 * 持久 flow 已经持有 coordinator lease；这里只登记不可伪造的内部 lineage，
 * 让 startBattle/onDefeated 子链复用父活动，避免 save gate 关闭后等待自己。
 */
export async function withRegisteredScriptActivityLineage<T>(
  runtimeKey: object,
  coordinator: FlowRuntimeCoordinator,
  signal: AbortSignal,
  lease: FlowLease,
  body: () => T | Promise<T>,
): Promise<T> {
  signal.throwIfAborted()
  if (!coordinator.hasActiveLease(lease))
    throw new Error('script lineage 需要当前 coordinator 的活跃 lease')
  let lineages = activeLineages.get(runtimeKey)
  if (!lineages) {
    lineages = new WeakMap()
    activeLineages.set(runtimeKey, lineages)
  }
  let registrations = lineages.get(signal)
  if (!registrations) {
    registrations = new Set()
    lineages.set(signal, registrations)
  }
  const registration = { coordinator, lease }
  registrations.add(registration)
  try {
    return await body()
  } finally {
    registrations.delete(registration)
    if (registrations.size === 0) lineages.delete(signal)
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
  signal.throwIfAborted()
  if (registeredScriptActivityLease(runtimeKey, coordinator, signal)) return await body()

  let activity: FlowActivityLease | undefined = coordinator.beginActivity()
  while (!activity && coordinator.gateClosed()) {
    await coordinator.waitForActivationGate(signal)
    signal.throwIfAborted()
    activity = coordinator.beginActivity()
  }
  if (!activity) throw new Error('script transient activity 无法登记')
  try {
    return await withRegisteredScriptActivityLineage(
      runtimeKey,
      coordinator,
      signal,
      activity,
      body,
    )
  } finally {
    activity.close()
  }
}
