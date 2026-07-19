import { describe, expect, test, vi } from 'vitest'
import { AsyncIntentController } from './async-intent.js'
import { commitLatestPreparedSnapshot } from './latest-snapshot-transaction.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

interface PartySnapshot {
  hp: number
  equipment: string
  sprite: string
  members: string[]
}

describe('commitLatestPreparedSnapshot', () => {
  test('预载期间的 HP/装备修改不会被旧快照覆盖', async () => {
    let current: PartySnapshot = { hp: 10, equipment: 'wood', sprite: 'a', members: ['hero'] }
    const gate = deferred<void>()
    let committed: PartySnapshot | undefined
    const pending = commitLatestPreparedSnapshot({
      assertCurrent: () => undefined,
      snapshot: () => structuredClone(current),
      mutate: (snapshot) => snapshot.members.push('friend'),
      requiredResources: (snapshot) => [snapshot.sprite],
      prepare: () => gate.promise,
      commit: (snapshot) => {
        committed = snapshot
      },
    })

    await Promise.resolve()
    current = { ...current, hp: 3, equipment: 'steel' }
    gate.resolve()
    await pending

    expect(committed).toEqual({
      hp: 3,
      equipment: 'steel',
      sprite: 'a',
      members: ['hero', 'friend'],
    })
  })

  test('预载期间形象改用新资源时会再预载一次才提交', async () => {
    let current: PartySnapshot = { hp: 10, equipment: 'wood', sprite: 'a', members: ['hero'] }
    const gates = new Map([
      ['a', deferred<void>()],
      ['b', deferred<void>()],
    ])
    const prepare = vi.fn((resource: string) => gates.get(resource)!.promise)
    const commit = vi.fn()
    const pending = commitLatestPreparedSnapshot({
      assertCurrent: () => undefined,
      snapshot: () => structuredClone(current),
      mutate: () => undefined,
      requiredResources: (snapshot) => [snapshot.sprite],
      prepare,
      commit,
    })

    await Promise.resolve()
    current = { ...current, sprite: 'b' }
    gates.get('a')!.resolve()
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledWith('b'))
    expect(commit).not.toHaveBeenCalled()
    gates.get('b')!.resolve()
    await pending
    expect(commit).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ sprite: 'b' }))
  })

  test('被更新请求取代或 runner 取消后均零提交', async () => {
    for (const mode of ['supersede', 'abort'] as const) {
      const intent = new AsyncIntentController()
      const token = intent.begin()
      const controller = new AbortController()
      const gate = deferred<void>()
      const commit = vi.fn()
      const pending = commitLatestPreparedSnapshot({
        assertCurrent: () => {
          intent.assertCurrent(token, '旧队伍请求')
          if (controller.signal.aborted) {
            const error = new Error('runner 已取消')
            error.name = 'AbortError'
            throw error
          }
        },
        snapshot: () => ({ hp: 1, equipment: '', sprite: 'a', members: ['hero'] }),
        mutate: () => undefined,
        requiredResources: () => ['a'],
        prepare: () => gate.promise,
        commit,
      })
      await Promise.resolve()
      if (mode === 'supersede') intent.begin()
      else controller.abort()
      gate.resolve()
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
      expect(commit).not.toHaveBeenCalled()
    }
  })
})
