import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  assertCaptureMedia,
  createLocalCapture,
  isAudioFailureMessage,
  isAudioResource,
  readableMs,
} from './capture-local.mjs'
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

test('audio failure classification is narrow and includes source resources/worklet', () => {
  for (const text of [
    '[audio] MIDI BGM 后端初始化失败 → BGM 静默',
    '[bgm] MIDI AssetId 1 读取失败',
    '[sfx] AudioContext 不可用，音效播放器停用',
  ])
    assert.equal(isAudioFailureMessage('warning', text), true)
  for (const text of ['Canvas2D readback advisory', '[audio] MIDI initialized', 'metadata 404'])
    assert.equal(isAudioFailureMessage('warning', text), false)
  assert.equal(isAudioFailureMessage('log', '[audio] failure example'), false)
  for (const path of [
    '/extracted/sounds/1.wav',
    '/projects/pal/assets/migrated/music/001.mid',
    '/soundfont.sf3',
    '/spessasynth_processor.min.js',
  ])
    assert.equal(isAudioResource(`http://localhost${path}?v=current`), true)
  for (const path of ['/projects/pal/.type-pal/save-state.json', '/image.png', '/module.js'])
    assert.equal(isAudioResource(`http://localhost${path}`), false)
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

for (const scenario of [
  'healthy',
  'late pageerror',
  'late SIGINT',
  'late Vite exit',
  'error after receipt write',
  'BGM failure while SFX remains',
  'SFX network failure while BGM remains',
])
  test(`actual capture controller publication handles ${scenario}`, async (t) => {
    const out = await mkdtemp(join(tmpdir(), 'capture-publication-test-'))
    const { info, pcm, stats } = media()
    let encoded = false
    let healthCalls = 0
    const failure = new Error(scenario)
    const exec = t.mock.method(childProcess, 'execFileSync', (command, args) => {
      if (command === 'ffprobe') return JSON.stringify(info)
      assert.equal(command, 'ffmpeg')
      if (args.includes('libx264')) {
        writeFileSync(args.at(-1), 'encoded native media fixture')
        encoded = true
        if (scenario === 'BGM failure while SFX remains')
          page.emit('console', {
            type: () => 'warning',
            text: () => '[bgm] MIDI 后端初始化失败 → BGM 静默',
          })
        if (scenario === 'SFX network failure while BGM remains')
          page.emit('response', {
            status: () => 404,
            url: () => 'http://localhost/extracted/sounds/1.wav',
          })
        return Buffer.alloc(0)
      }
      if (args.includes('f32le')) return pcm
      if (args.includes('rawvideo')) return Buffer.from([10, 20, 30])
      assert(args.at(-1).endsWith('.png'))
      writeFileSync(args.at(-1), 'frame fixture')
      return Buffer.alloc(0)
    })
    syncBuiltinESMExports()
    const window = {
      __localCapture: {
        arm: () => {},
        state: () => ({ failures: [] }),
        finish: () => ({ ...stats, bytes: 4 }),
        chunk: () => Buffer.from('webm').toString('base64'),
      },
    }
    const page = Object.assign(new EventEmitter(), {
      evaluate: async (fn, value) =>
        new Function('window', 'value', `return (${fn.toString()})(value)`)(window, value),
      isClosed: () => false,
    })
    const report = { fragment: '001', engine: 'game', revision: 'a'.repeat(40), hashes: {} }
    const capture = createLocalCapture({
      enabled: true,
      report,
      out,
      health: () => {
        healthCalls++
        if (scenario === 'healthy' || scenario.includes('while')) return
        if (scenario === 'error after receipt write' ? healthCalls === 3 : encoded) throw failure
      },
    })
    try {
      capture.observe(page)
      await capture.arm(page, { event: 'start' })
      if (scenario === 'healthy') {
        await capture.finish(page, { event: 'end' })
        capture.assertComplete()
      } else {
        await assert.rejects(
          () => capture.finish(page, { event: 'end' }),
          scenario.includes('while')
            ? /captured audio pipeline failed/
            : (error) => error === failure,
        )
        assert.throws(() => capture.assertComplete(), /semantic end/)
      }
      assert(encoded, 'the real controller must pass through its media pipeline before failure')
      const receipt = JSON.parse(await readFile(join(out, 'capture.json'), 'utf8'))
      assert.equal(receipt.status, scenario === 'healthy' ? 'passed' : 'failed')
      assert.equal(report.media.status, receipt.status)
      if (scenario !== 'healthy' && !scenario.includes('while'))
        assert.equal(receipt.failure, String(failure))
      await capture.cleanup(scenario !== 'healthy')
      assert.equal(page.eventNames().length, 0, 'audio observers released')
    } finally {
      exec.mock.restore()
      syncBuiltinESMExports()
      await rm(out, { recursive: true })
    }
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
