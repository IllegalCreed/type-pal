import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { collectPackages } from './package-collection.mjs'

const packages = ['shared', 'game', 'reforge', 'editor'].map((id) => ({ id }))

test('serial collection retains configured order and exact per-package results', async () => {
  const order = []
  const result = await collectPackages(
    packages,
    async ({ id }) => {
      order.push(id)
      return { report: id }
    },
    false,
  )
  assert.deepEqual(order, ['shared', 'game', 'reforge', 'editor'])
  assert.deepEqual(result, {
    shared: { report: 'shared' },
    game: { report: 'game' },
    reforge: { report: 'reforge' },
    editor: { report: 'editor' },
  })
})

test('parallel editor starts beside game and cannot finish the collection early', async () => {
  const order = []
  let releaseEditor
  const editor = new Promise((resolve) => {
    releaseEditor = resolve
  })
  const result = collectPackages(
    packages,
    async ({ id }) => {
      order.push(id)
      if (id === 'editor') await editor
      return id
    },
    true,
  )
  // The shared job has one asynchronous turn before game/editor start.
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(order, ['shared', 'editor', 'game', 'reforge'])
  releaseEditor()
  assert.deepEqual(await result, {
    shared: 'shared',
    game: 'game',
    reforge: 'reforge',
    editor: 'editor',
  })
})

test('parallel mode rejects a missing editor before running any job', async () => {
  const order = []
  await assert.rejects(
    collectPackages([{ id: 'game' }], async ({ id }) => order.push(id), true),
    /parallel editor 配置缺失/,
  )
  assert.deepEqual(order, [])
})

for (const failure of ['game', 'editor']) {
  test(`parallel ${failure} failure retains error ownership and joins the editor job`, () => {
    // Isolate rejection notifications in a real child. No coverage collector or
    // report is faked: this seam tests only the coordinator's own job lifetime.
    const program = `
      import { collectPackages } from ${JSON.stringify(new URL('./package-collection.mjs', import.meta.url).href)}
      const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
      const unhandled = []
      process.on('unhandledRejection', error => unhandled.push(error.message))
      let editorFinished = false
      let caught
      try {
        await collectPackages([{id: 'game'}, {id: 'editor'}], async ({id}) => {
          if (id === 'editor') {
            await pause(10)
            editorFinished = true
            if (${JSON.stringify(failure)} === 'editor') throw new Error('editor failed')
          } else {
            if (${JSON.stringify(failure)} === 'game') throw new Error('game failed')
            await pause(30)
          }
          return id
        }, true)
      } catch (error) { caught = error.message }
      const finishedBeforeReturn = editorFinished
      await pause(30)
      console.log(JSON.stringify({caught, finishedBeforeReturn, unhandled}))
    `
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
      encoding: 'utf8',
      timeout: 5000,
    })
    assert.ifError(run.error)
    assert.equal(run.status, 0, run.stderr)
    const observed = JSON.parse(run.stdout)
    assert.equal(observed.caught, `${failure} failed`)
    assert.equal(observed.finishedBeforeReturn, true, 'collector returned before its owned job')
    assert.deepEqual(observed.unhandled, [], 'editor rejection escaped the coordinator')
    assert.equal(run.stderr, '')
  })
}
