import assert from 'node:assert/strict'

const engines = ['game', 'reforge']
const release = 'preflight'

/** A story barrier must never include the other engine's offline verification. */
export function createContinuousPreflightGate(send) {
  const ready = new Set()
  let released = false
  return {
    ready(engine) {
      assert(engines.includes(engine), 'unknown continuous preflight participant')
      assert(!ready.has(engine), 'duplicate continuous preflight readiness')
      ready.add(engine)
      if (ready.size === engines.length) {
        released = true
        for (const participant of engines) send(participant, { release })
      }
    },
    receipt: () => ({ ready: [...ready], released }),
  }
}

/** The parent owns peer failure/termination. Offline work has no story deadline;
 * disconnect rejects this wait rather than leaving an orphan waiting for input.
 */
export function waitContinuousPreflightRelease(channel = process) {
  if (!channel.send) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      channel.removeListener('message', onMessage)
      channel.removeListener('disconnect', onDisconnect)
    }
    const onDisconnect = () => {
      cleanup()
      reject(new Error('continuous preflight parent disconnected'))
    }
    const onMessage = (message) => {
      if (!Object.hasOwn(message ?? {}, 'release')) return
      cleanup()
      if (message.release !== release)
        reject(new Error(`unexpected preflight release ${message.release}`))
      else resolve()
    }
    channel.on('message', onMessage)
    channel.once('disconnect', onDisconnect)
    channel.send({ preflightReady: true }, (error) => {
      if (!error) return
      cleanup()
      reject(error)
    })
  })
}
