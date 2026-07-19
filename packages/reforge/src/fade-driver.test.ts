import { describe, expect, test, vi } from 'vitest'
import { SupersedingFadeDriver } from './fade-driver.js'

describe('SupersedingFadeDriver', () => {
  test('新 fade 以 AbortError 收敛旧 Promise，并从当前亮度连续接管', async () => {
    const driver = new SupersedingFadeDriver(0)
    const oldDone = vi.fn()
    const nextDone = vi.fn()
    const old = driver.begin(1, 0, 100).then(oldDone)
    expect(driver.advance(40)).toBeCloseTo(0.4)

    const next = driver.begin(0, 40, 60).then(nextDone)
    await expect(old).rejects.toMatchObject({ name: 'AbortError' })
    expect(oldDone).not.toHaveBeenCalled()
    expect(driver.value).toBeCloseTo(0.4)
    expect(driver.advance(40)).toBeCloseTo(0.4)
    expect(driver.advance(70)).toBeCloseTo(0.2)
    expect(nextDone).not.toHaveBeenCalled()
    expect(driver.advance(100)).toBeCloseTo(0)
    await next
    expect(nextDone).toHaveBeenCalledOnce()
  })

  test('连续两次接管与 cancel 后所有 Promise 都以 AbortError 收敛', async () => {
    const driver = new SupersedingFadeDriver()
    const first = driver.begin(1, 0, 100)
    const second = driver.begin(0, 10, 100)
    const third = driver.begin(1, 20, 100)
    driver.cancel(0)
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    await expect(third).rejects.toMatchObject({ name: 'AbortError' })
    expect(driver.active).toBe(false)
    expect(driver.value).toBe(0)
  })

  test('runner 取消会以 AbortError 收敛当前 fade 并清掉半截幕布', async () => {
    const driver = new SupersedingFadeDriver(0)
    const controller = new AbortController()
    const running = driver.begin(1, 0, 100, controller.signal)
    expect(driver.advance(35)).toBeCloseTo(0.35)
    controller.abort()
    await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    expect(driver.active).toBe(false)
    expect(driver.value).toBe(0)
  })

  test('旧 signal 在请求被接管后不再能取消新 effect', async () => {
    const driver = new SupersedingFadeDriver(0)
    const oldController = new AbortController()
    const old = driver.begin(1, 0, 100, oldController.signal)
    driver.advance(40)
    const next = driver.begin(0, 40, 60)

    oldController.abort()
    await expect(old).rejects.toMatchObject({ name: 'AbortError' })
    expect(driver.active).toBe(true)
    expect(driver.advance(100)).toBeCloseTo(0)
    await expect(next).resolves.toBeUndefined()
  })

  test('旧事务 cleanup 不能取消已经接管的较新 owner', async () => {
    const driver = new SupersedingFadeDriver(0)
    const oldOwner = {}
    const newerOwner = {}
    const old = driver.begin(1, 0, 100, undefined, oldOwner)
    driver.advance(40)
    const newer = driver.begin(0, 40, 60, undefined, newerOwner)

    await expect(old).rejects.toMatchObject({ name: 'AbortError' })
    expect(driver.cancelOwned(oldOwner, 0)).toBe(false)
    expect(driver.active).toBe(true)
    expect(driver.advance(100)).toBeCloseTo(0)
    await expect(newer).resolves.toBeUndefined()
  })

  test('fade 正常完成后仍可由呈现 owner 复位幕布', async () => {
    const driver = new SupersedingFadeDriver(0)
    const owner = {}
    const done = driver.begin(1, 0, 100, undefined, owner)
    expect(driver.advance(100)).toBe(1)
    await expect(done).resolves.toBeUndefined()
    expect(driver.active).toBe(false)

    expect(driver.cancelOwned(owner, 0)).toBe(true)
    expect(driver.value).toBe(0)
  })
})
