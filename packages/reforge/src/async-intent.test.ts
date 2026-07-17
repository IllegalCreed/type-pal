import { describe, expect, test } from 'vitest'
import { AsyncIntentController } from './async-intent.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

describe('AsyncIntentController', () => {
  test('世界失效后，旧 await continuation 在提交前收到 AbortError', async () => {
    const controller = new AsyncIntentController()
    const token = controller.capture()
    const gate = deferred<void>()
    let committed = false
    const pending = gate.promise.then(() => {
      controller.assertCurrent(token, '旧世界')
      committed = true
    })

    controller.invalidate()
    gate.resolve()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: '旧世界' })
    expect(committed).toBe(false)
  })

  test('新 begin 与显式 invalidate 都会作废尚未创建会话的旧启动', () => {
    const controller = new AsyncIntentController()
    const first = controller.begin()
    const second = controller.begin()
    expect(controller.isCurrent(first)).toBe(false)
    expect(controller.isCurrent(second)).toBe(true)
    controller.invalidate()
    expect(() => controller.assertCurrent(second, '旧战斗')).toThrowError(
      expect.objectContaining({ name: 'AbortError' }),
    )
  })

  test('战斗启动跨多个 await：最后一拍失效后不得挂载旧会话', async () => {
    const controller = new AsyncIntentController()
    const readiness = deferred<void>()
    const assets = deferred<void>()
    const token = controller.begin()
    let attached = false
    const launch = (async () => {
      await readiness.promise
      controller.assertCurrent(token, 'readiness 后已失效')
      await assets.promise
      controller.assertCurrent(token, '资产加载后已失效')
      attached = true
    })()

    readiness.resolve()
    await Promise.resolve()
    controller.invalidate()
    assets.resolve()

    await expect(launch).rejects.toMatchObject({
      name: 'AbortError',
      message: '资产加载后已失效',
    })
    expect(attached).toBe(false)
  })
})
