import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import test from 'node:test'
import { chromium } from 'playwright'
import {
  createJourneyWatchdog,
  JourneyDeadlineError,
  killOwnedBrowser,
  withDeadline,
} from './browser-watchdog.mjs'

test('successful operations retain results and native errors, and cancel the watchdog', async () => {
  let kills = 0
  assert.equal(await withDeadline('RPC', () => 12, 20, { onTimeout: () => kills++ }), 12)
  const native = new Error('native transport failed')
  await assert.rejects(
    withDeadline('RPC', () => Promise.reject(native), 20),
    (e) => e === native,
  )
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(kills, 0)
})

test('a never-settling browser RPC times out without another health poll', async () => {
  let kills = 0
  await assert.rejects(
    withDeadline('newContext', () => new Promise(() => {}), 10, { onTimeout: () => kills++ }),
    (e) => e instanceof JourneyDeadlineError && /newContext/.test(e.message),
  )
  assert.equal(kills, 1)
})

test('the whole journey is bounded even if an unwrapped evaluate never settles', async () => {
  let kills = 0
  const watchdog = createJourneyWatchdog({
    deadline: 110,
    now: () => 100,
    terminate: () => kills++,
  })
  await assert.rejects(watchdog.run('journey', () => new Promise(() => {}), 240_000))
  assert.equal(kills, 1)
  let started = false
  const expired = createJourneyWatchdog({ deadline: 99, now: () => 100 })
  await assert.rejects(expired.run('expired', () => (started = true)))
  assert.equal(started, false)
})

test('an acquired launch result arriving after the deadline is disposed', async () => {
  let deliver
  const pending = new Promise((resolve) => (deliver = resolve))
  const disposed = []
  let finishDisposal
  const disposal = new Promise((resolve) => (finishDisposal = resolve))
  await assert.rejects(
    withDeadline('launch', () => pending, 10, {
      onLate: (v) => {
        disposed.push(v)
        finishDisposal()
      },
    }),
  )
  deliver('owned late server')
  await disposal
  assert.deepEqual(disposed, ['owned late server'])
})

test('termination failure cannot escape the timer or suppress the transport timeout', async () => {
  const cause = new Error('owned child already gone')
  await assert.rejects(
    withDeadline('RPC', () => new Promise(() => {}), 5, {
      onTimeout: () => {
        throw cause
      },
    }),
    (e) => e instanceof JourneyDeadlineError && e.cause === cause,
  )
})

test('diagnostic and cleanup RPCs are bounded independently after the journey expired', async () => {
  for (const label of ['failure observation', 'screenshot', 'capture cleanup', 'context close'])
    await assert.rejects(
      withDeadline(label, () => new Promise(() => {}), 5),
      /timeout/,
    )
})

test('hard termination targets only the exact owned process, never an existing browser/profile', async () => {
  const owned = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'])
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'])
  try {
    await Promise.all([once(owned, 'spawn'), once(unrelated, 'spawn')])
    const exited = once(owned, 'exit')
    assert.equal(killOwnedBrowser({ process: () => owned }), true)
    assert.equal((await exited)[1], 'SIGKILL')
    assert.equal(killOwnedBrowser({ process: () => owned }), false)
    assert.equal(unrelated.exitCode, null)
    assert.equal(unrelated.signalCode, null)
    assert.equal(killOwnedBrowser(undefined), false)
    assert.throws(
      () =>
        killOwnedBrowser({
          process: () => ({ pid: process.pid, exitCode: null, signalCode: null }),
        }),
      /child identity/,
    )
  } finally {
    unrelated.kill('SIGKILL')
    owned.kill('SIGKILL')
  }
})

test('a real owned Chrome RPC stalled at newContext is terminated and reaped', {
  timeout: 45_000,
}, async () => {
  const server = await chromium.launchServer({ channel: 'chrome', headless: true, timeout: 30_000 })
  const child = server.process()
  let browser
  try {
    browser = await chromium.connect(server.wsEndpoint(), { timeout: 5000 })
    const positive = await browser.newContext()
    await positive.close()
    child.kill('SIGSTOP') // Only this freshly spawned, isolated browser; creates a real stalled RPC.
    const exited = once(child, 'exit')
    const watchdog = createJourneyWatchdog({
      deadline: Date.now() + 1000,
      terminate: () => killOwnedBrowser(server),
    })
    await assert.rejects(
      watchdog.run('real newContext', () => browser.newContext(), 100),
      (e) => e instanceof JourneyDeadlineError && /real newContext/.test(e.message),
    )
    assert.equal((await withDeadline('owned Chrome exit', () => exited, 3000))[1], 'SIGKILL')
    assert.equal(killOwnedBrowser(server), false)
  } finally {
    killOwnedBrowser(server)
    await withDeadline('owned Chrome cleanup', () => server.close(), 3000)
  }
})
