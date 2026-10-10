/**
 * 对会变化的运行时状态执行“预载后原子提交”。每次 await 后重新取最新快照；如果最新快照
 * 引用了尚未准备的资源，就继续预载并重试。最后一次 snapshot 到 commit 之间没有 await。
 */
export async function commitLatestPreparedSnapshot<TSnapshot, TResource>(hooks: {
  assertCurrent(): void
  snapshot(): TSnapshot
  mutate(snapshot: TSnapshot): void
  requiredResources(snapshot: TSnapshot): readonly TResource[]
  prepare(resource: TResource): Promise<void>
  waitForResources?(pending: Promise<void>): Promise<void>
  /** Ownership may suspend readiness; take the latest snapshot only inside the open boundary. */
  runAtBoundary?<T>(action: () => T): Promise<T>
  commit(snapshot: TSnapshot): void
}): Promise<void> {
  const ready = new Set<TResource>()

  while (true) {
    const attempt = () => {
      hooks.assertCurrent()
      const candidate = hooks.snapshot()
      hooks.mutate(candidate)
      const missing = [...new Set(hooks.requiredResources(candidate))].filter(
        (resource) => !ready.has(resource),
      )
      if (!missing.length) {
        hooks.assertCurrent()
        hooks.commit(candidate)
      }
      return missing
    }
    const missing = hooks.runAtBoundary ? await hooks.runAtBoundary(attempt) : attempt()

    if (missing.length > 0) {
      const pending = Promise.all(missing.map((resource) => hooks.prepare(resource))).then(() => {})
      await (hooks.waitForResources ? hooks.waitForResources(pending) : pending)
      hooks.assertCurrent()
      for (const resource of missing) ready.add(resource)
      continue
    }

    return
  }
}
