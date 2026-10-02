import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCaptureMedia, createLocalCapture, readableMs } from './capture-local.mjs'
import { innArguments, validatePredecessor } from './inn-contract.mjs'
import { kitchenArguments, validateKitchenPredecessor } from './kitchen-contract.mjs'
import { mealArguments, validateMealPredecessor } from './meal-contract.mjs'

test('capture is explicit, single-engine and excludes specialist inputs', () => {
  for (const parse of [innArguments, kitchenArguments, mealArguments]) {
    assert.equal(parse(['--from', '/tmp/real-report.json']).capture, undefined)
    assert.equal(parse(['--from', '/tmp/real-report.json', '--capture']).capture, true)
    assert.throws(() => parse(['--from', '/tmp/real-report.json', '--capture', '--capture']))
    assert.throws(
      () => parse(['--capture', '--game-report', '/tmp/a', '--reforge-report', '/tmp/b'], true),
      /single-engine/,
    )
  }
  assert.throws(
    () => innArguments(['--from', '/tmp/a', '--capture', '--hold-leader']),
    /specialist/,
  )
  for (const name of ['items', 'saves']) {
    assert.throws(
      () => mealArguments(['--from', '/tmp/a', '--case', name, '--capture']),
      /specialist/,
    )
    assert.throws(
      () => mealArguments(['--from', '/tmp/a', '--capture', '--case', name]),
      /specialist/,
    )
  }
})

test('capture receipts cannot feed any verify checkpoint chain', () => {
  for (const validate of [validatePredecessor, validateKitchenPredecessor, validateMealPredecessor])
    assert.throws(
      () => validate({ profile: 'capture', status: 'passed' }, {}, 'reforge', '{}'),
      /not a verify predecessor/,
    )
})

test('readable timing is bounded and proportional to actual displayed text', () => {
  assert.equal(readableMs('你好'), 1000)
  assert.equal(readableMs('字'.repeat(20)), 1900)
  assert.equal(readableMs('字'.repeat(200)), 5000)
  assert.equal(readableMs('  \n你好'), 1000)
})

test('disabled profile is inert: no browser install, capture, read, health or IO', async () => {
  const capture = createLocalCapture({ enabled: false, health: () => assert.fail('health') })
  await capture.install(null)
  await capture.arm(null)
  assert.equal(await capture.readable('text', 'key', () => assert.fail('read')), true)
  await capture.finish(null)
  await capture.cleanup()
  capture.assertComplete()
})

test('capture cannot succeed without its explicit semantic finish', () => {
  assert.throws(() => createLocalCapture({ enabled: true }).assertComplete(), /semantic end/)
})

test('capture refuses to invent a readability hold without rendered text', async () => {
  const capture = createLocalCapture({ enabled: true })
  await assert.rejects(() => capture.readable(undefined, 'key', () => 'key'), /actual rendered/)
})

function media() {
  const pcm = Buffer.alloc(4000)
  for (let i = 0; i < 1000; i++) pcm.writeFloatLE(Math.sin(i) * 0.1, i * 4)
  return {
    info: {
      format: { duration: '2' },
      streams: [
        { codec_type: 'video', codec_name: 'h264', width: 1280, height: 800 },
        { codec_type: 'audio', codec_name: 'aac', sample_rate: '48000' },
      ],
    },
    pcm,
    stats: {
      durationMs: 2000,
      phase: 'stopped',
      failures: [],
      canvasFrames: 60,
      renderedFrames: 120,
      audioContexts: 2,
      cleanup: { complete: true, prototypesRestored: true, mixerClosed: true, tracksEnded: true },
    },
  }
}

test('media gate proves stream identity, duration, actual frames, audio energy and cleanup', () => {
  const { info, pcm, stats } = media()
  const result = assertCaptureMedia(info, pcm, stats)
  assert(result.rms > 0.06 && result.peak > 0.09)
  assert.equal(result.duration, 2)
})

for (const [name, mutate, pattern] of [
  ['silent', (m) => m.pcm.fill(0), /silent/],
  ['missing audio', (m) => m.info.streams.pop(), /audio stream/],
  [
    'wrong resolution',
    (m) => {
      m.info.streams[0].width = 800
    },
    /1280/,
  ],
  [
    'truncated',
    (m) => {
      m.info.format.duration = '0.1'
    },
    /empty capture/,
  ],
  [
    'duration drift',
    (m) => {
      m.info.format.duration = '7'
    },
    /drift/,
  ],
  [
    'no rendered canvas',
    (m) => {
      m.stats.canvasFrames = 0
    },
    /actual canvas/,
  ],
  [
    'cleanup failure',
    (m) => {
      m.stats.cleanup.prototypesRestored = false
    },
    /cleanup/,
  ],
  [
    'browser failure',
    (m) => {
      m.stats.failures.push('decoder error')
    },
    /deep-equal/,
  ],
  [
    'missing cleanup evidence',
    (m) => {
      m.stats.cleanup = {}
    },
    /cleanup/,
  ],
  ['nonfinite audio', (m) => m.pcm.writeFloatLE(Number.NaN), /nonfinite/],
])
  test(`media gate rejects ${name}`, () => {
    const input = media()
    mutate(input)
    assert.throws(() => assertCaptureMedia(input.info, input.pcm, input.stats), pattern)
  })
