import assert from 'node:assert/strict'
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
