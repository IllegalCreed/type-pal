// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  cleanupDebug,
  command,
  debugHarness,
  drain,
  element,
  status,
} from './__tests__/debug-tools-fixtures.js'

afterEach(cleanupDebug)
describe('Debug operation failures', () => {
  test.each([
    'scene b',
    'pos 3,4',
    'give tonic 2',
    'money 80',
    'run-script mark',
    'run-trigger zone',
  ])('%s reports rejected detached ownership without invoking the runtime', async (line) => {
    const h = await debugHarness(),
      before = structuredClone(h.world)
    h.ctx.runDetached = async () => {
      throw new Error('host denied')
    }
    command(line)
    await drain()
    expect(status()).toContain('host denied')
    expect(element('[role="status"]').dataset.tone).toBe('error')
    expect(h.world).toEqual(before)
    expect(h.effects).toEqual([])
  })
  test('a synchronous detached throw is caught by the panel operation boundary', async () => {
    const h = await debugHarness()
    h.ctx.runDetached = () => {
      throw new Error('sync refused')
    }
    command('pos 1,2')
    await drain()
    expect(status()).toBe('pos: Error: sync refused')
  })
  test.each([
    'scene b',
    'run-script mark',
    'run-trigger zone',
  ])('%s requires presentation confirmation and cancellation performs no work', async (line) => {
    const h = await debugHarness()
    h.state.busy = true
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const before = structuredClone(h.world)
    command(line)
    await h.settle()
    expect(confirm).toHaveBeenCalledOnce()
    expect(h.operations).toEqual([])
    expect(h.world).toEqual(before)
    confirm.mockReturnValue(true)
    command(line)
    await h.settle()
    expect(h.operations).toHaveLength(1)
    expect(element('[role="status"]').dataset.tone).toBe('success')
  })
  test('battle console reports typed result and later rejection independently', async () => {
    const h = await debugHarness()
    h.startBattle
      .mockResolvedValueOnce('playerFled')
      .mockRejectedValueOnce(new Error('battle port failed'))
    command('battle team')
    await drain()
    expect(h.startBattle.mock.calls[0]?.[0]).toEqual({ enemyTeamId: 'team' })
    expect(status()).toBe('battle done: playerFled')
    command('battle team')
    await drain()
    expect(status()).toBe('battle: Error: battle port failed')
    expect(element('[role="status"]').dataset.tone).toBe('error')
  })
  test('completed operation is removed from disposal abort set', async () => {
    const h = await debugHarness()
    command('give tonic')
    await h.settle()
    const signal = h.signals[0]!
    h.dispose()
    expect(signal.aborted).toBe(false)
  })
  test('late completion cannot overwrite the status of a replacement panel', async () => {
    const h = await debugHarness()
    let complete!: () => void
    h.ctx.runDetached = async (signal, invoke) => {
      await new Promise<void>((resolve) => {
        complete = resolve
      })
      return invoke(h.runtime, signal)
    }
    command('scene b')
    const oldStatus = element('[role="status"]')
    const next = await debugHarness()
    command('step')
    const expected = status()
    complete()
    await drain()
    expect(oldStatus.textContent).toBe('scene b …')
    expect(status()).toBe(expected)
    expect(next.requestStep).toHaveBeenCalledOnce()
  })
})
