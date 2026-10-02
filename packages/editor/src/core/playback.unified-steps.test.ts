import { expect, test } from 'vitest'
import { flowOf, preview, settle } from './__tests__/playback-canonical-fixtures.js'

test.each([
  true,
  false,
])('selected-step preview executes the real confirmation arm and finishStep (%s)', async (accepted) => {
  const r = preview()
  await r.start(
    {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [{ kind: 'giveMoney', delta: 101 }] },
        {
          id: 'selected',
          body: [
            {
              kind: 'confirm',
              onYes: [
                { kind: 'giveMoney', delta: 7 },
                { kind: 'finishStep', next: { kind: 'complete' } },
              ],
              onNo: [
                { kind: 'giveMoney', delta: 3 },
                { kind: 'finishStep', next: { kind: 'stage', stage: 'first' } },
              ],
            },
            { kind: 'giveMoney', delta: 999 },
          ],
        },
      ],
    },
    { cursor: { kind: 'stage', stage: 'selected' } },
  )
  expect(r.p.view.confirm).not.toBeNull()
  r.p.answerConfirm(accepted)
  await settle()
  expect(r.p.mode).toBe('done')
  expect(r.p.view.logs).toEqual([`💰 +${accepted ? 7 : 3} 钱`])
  r.unchanged()
})

test('a named continueLoop skips inner and outer tails through the real preview runner', async () => {
  const r = preview()
  await r.run([
    {
      kind: 'repeat',
      id: 'attempt',
      label: '外层尝试',
      count: 3,
      body: [
        {
          kind: 'repeat',
          count: 2,
          body: [
            { kind: 'giveMoney', delta: 1 },
            { kind: 'continueLoop', loop: 'attempt' },
            { kind: 'giveMoney', delta: 99 },
          ],
        },
        { kind: 'giveMoney', delta: 88 },
      ],
    },
    { kind: 'giveMoney', delta: 7 },
  ])
  expect(r.p.view.logs).toEqual(['💰 +1 钱', '💰 +1 钱', '💰 +1 钱', '💰 +7 钱'])
})

test('breakLoop retains its common tail and shared return stays local', async () => {
  const r = preview()
  await r.start(
    flowOf([
      {
        kind: 'loop',
        mode: 'forever',
        body: [
          { kind: 'giveMoney', delta: 1 },
          { kind: 'breakLoop' },
          { kind: 'giveMoney', delta: 88 },
        ],
      },
      { kind: 'callScript', script: 'local' },
      { kind: 'giveMoney', delta: 7 },
    ]),
    {
      sharedScripts: {
        local: {
          name: '局部返回',
          self: 'none',
          body: [
            { kind: 'giveMoney', delta: 3 },
            { kind: 'returnScript' },
            { kind: 'giveMoney', delta: 99 },
          ],
        },
      },
    },
  )
  expect(r.p.mode).toBe('done')
  expect(r.p.view.logs).toEqual(['💰 +1 钱', '💰 +3 钱', '💰 +7 钱'])
  r.unchanged()
})

test('automatic preview advances only on its explicit wait and can still be stopped', async () => {
  const r = preview()
  await r.start(
    flowOf([
      {
        kind: 'loop',
        mode: 'forever',
        body: [
          { kind: 'wait', ms: 10 },
          { kind: 'giveMoney', delta: 1 },
        ],
      },
    ]),
    { timing: 'auto' },
  )
  expect(r.p.view.logs).toEqual([])
  r.p.tick(9)
  await settle()
  expect(r.p.view.logs).toEqual([])
  r.p.tick(1)
  await settle()
  expect(r.p.view.logs).toEqual(['💰 +1 钱'])
  r.p.tick(10)
  await settle()
  expect(r.p.view.logs).toEqual(['💰 +1 钱', '💰 +1 钱'])
  r.p.stop()
  await settle()
  expect(r.p.mode).toBe('idle')
  r.unchanged()
})
