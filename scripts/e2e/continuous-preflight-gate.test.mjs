import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import test from 'node:test'
import { createContinuousPreflightGate } from './continuous-preflight-gate.mjs'

const worker = `
import {waitContinuousPreflightRelease} from ${JSON.stringify(new URL('./continuous-preflight-gate.mjs', import.meta.url).href)};
const engine=process.argv[1], counter=process.argv[2]==='counter';
let started=false;
process.on('message',message=>{
  if(message.probe)process.send({probe:engine,started});
});
await new Promise(resolve=>process.once('message',resolve));
if(counter)process.send({preflightReady:true});
else await waitContinuousPreflightRelease();
started=true;
process.send({storyStarted:engine});
`

function observe(child) {
  const messages = [],
    waiters = []
  let stderr = ''
  child.stderr.on('data', (bytes) => {
    stderr += bytes
  })
  child.on('message', (message) => {
    messages.push(message)
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(message)) continue
      clearTimeout(waiter.timer)
      waiters.splice(waiters.indexOf(waiter), 1)
      waiter.resolve(message)
    }
  })
  return {
    wait(predicate) {
      const prior = messages.find(predicate)
      if (prior) return Promise.resolve(prior)
      return new Promise((resolve, reject) => {
        const waiter = {
          predicate,
          resolve,
          timer: setTimeout(
            () => reject(new Error(`IPC fixture did not settle: ${stderr}`)),
            10000,
          ),
        }
        waiters.push(waiter)
      })
    },
    errors: () => stderr,
  }
}

test('real IPC delays all story input until both verified peers are ready; bypassing the gate is rejected', async () => {
  const run = async (counter) => {
    const children = new Map(),
      observers = new Map()
    const gate = createContinuousPreflightGate((engine, message) =>
      children.get(engine).send(message),
    )
    try {
      for (const engine of ['game', 'reforge']) {
        const child = spawn(
          process.execPath,
          [
            '--input-type=module',
            '--eval',
            worker,
            engine,
            counter && engine === 'game' ? 'counter' : 'normal',
          ],
          {
            stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
          },
        )
        children.set(engine, child)
        observers.set(engine, observe(child))
        child.on('message', (message) => {
          if (message.preflightReady) gate.ready(engine)
        })
      }
      const first = children.get('game'),
        firstObserved = observers.get('game')
      first.send({ finishPreflight: true })
      await firstObserved.wait((message) => message.preflightReady)
      assert.deepEqual(gate.receipt(), { ready: ['game'], released: false })
      // A real IPC round trip fences the child's microtasks; no sleep-based oracle.
      first.send({ probe: true })
      const probe = await firstObserved.wait((message) => message.probe === 'game')
      assert.equal(probe.started, false, 'story started before peer preflight completed')
      children.get('reforge').send({ finishPreflight: true })
      await Promise.all(
        [...observers].map(([engine, observed]) =>
          observed.wait((message) => message.storyStarted === engine),
        ),
      )
      assert.deepEqual(gate.receipt(), { ready: ['game', 'reforge'], released: true })
      for (const observed of observers.values()) assert.equal(observed.errors(), '')
    } finally {
      await Promise.all(
        [...children.values()].map(async (child) => {
          if (child.exitCode !== null || child.signalCode !== null) return
          const exit = once(child, 'exit')
          child.kill('SIGTERM')
          await exit
        }),
      )
    }
  }
  await run(false)
  await assert.rejects(run(true), /story started before peer preflight completed/)
})
