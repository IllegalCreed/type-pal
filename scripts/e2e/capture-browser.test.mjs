import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { installLocalCapture } from './capture-browser.mjs'

// This tests instrumentation ownership/overload contracts, not browser PCM or image fidelity.
// The independent native Chrome sample supplies that evidence.
function harness({ codec = true, obscured = false } = {}) {
  const contexts = []
  const callbacks = []
  const logs = []
  const listeners = new Map()
  class Track {
    readyState = 'live'
    stop() {
      this.readyState = 'ended'
    }
  }
  class Stream {
    constructor(tracks = [new Track()]) {
      this.tracks = tracks
    }
    getTracks() {
      return this.tracks
    }
    getAudioTracks() {
      return this.tracks
    }
    addTrack(track) {
      this.tracks.push(track)
    }
  }
  class Node {
    constructor(context) {
      this.context = context
      this.edges = []
      this.gain = { value: 1 }
    }
    connect(destination, output = 0, input = 0) {
      if (input !== 0) throw new Error('native bad input')
      if (!this.edges.some((edge) => edge.destination === destination && edge.output === output))
        this.edges.push({ destination, output })
      return destination
    }
    disconnect(destination, output, input = 0) {
      if (input !== 0) throw new Error('native bad input')
      if (destination === undefined) this.edges = []
      else if (typeof destination === 'number')
        this.edges = this.edges.filter((edge) => edge.output !== destination)
      else {
        if (
          !this.edges.some(
            (edge) =>
              edge.destination === destination && (output === undefined || edge.output === output),
          )
        )
          throw new Error('native missing connection')
        this.edges = this.edges.filter(
          (edge) =>
            !(edge.destination === destination && (output === undefined || edge.output === output)),
        )
      }
    }
  }
  const original = { connect: Node.prototype.connect, disconnect: Node.prototype.disconnect }
  class Context {
    state = 'running'
    constructor() {
      this.destination = new Node(this)
      contexts.push(this)
    }
    createMediaStreamDestination() {
      return Object.assign(new Node(this), { stream: new Stream() })
    }
    createMediaStreamSource() {
      return new Node(this)
    }
    createGain() {
      return new Node(this)
    }
    async resume() {
      this.state = 'running'
    }
    async close() {
      this.state = 'closed'
    }
    decodeAudioData(_bytes, success, failure) {
      if (this.decodeFailure) throw this.decodeFailure
      const result = this.decodeResult ?? Promise.resolve({ decoded: true })
      if (success || failure) void result.then(success, failure)
      return result
    }
  }
  class Recorder {
    static isTypeSupported() {
      return codec
    }
    state = 'inactive'
    mimeType = 'video/webm;codecs=vp9,opus'
    start() {
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      this.ondataavailable({ data: new Blob(['sample']) })
      this.onstop()
    }
  }
  const canvas = {
    width: 320,
    height: 200,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 400 }),
  }
  const output = {
    getContext: () => ({ fillRect() {}, drawImage() {}, getImageData() {} }),
    captureStream: () => new Stream(),
  }
  const env = {
    AudioNode: Node,
    AudioContext: Context,
    BaseAudioContext: Context,
    MediaRecorder: Recorder,
    MediaStream: Stream,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    document: {
      querySelectorAll: (selector) => (selector === 'canvas#screen' ? [canvas] : []),
      createElement: () => output,
      elementsFromPoint: () => [obscured ? { tagName: 'DIV', ...canvas } : canvas],
    },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    performance,
    URL,
    Blob,
    Uint8Array,
    btoa,
    location: { href: 'http://localhost/' },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    cancelAnimationFrame: () => {},
    console: { error: (...args) => logs.push(args.join(' ')) },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  }
  env.window = env
  vm.runInNewContext(`(${installLocalCapture.toString()})()`, env)
  return { api: env.__localCapture, Context, Node, contexts, original, listeners, logs }
}

test('tap preserves native return, does not reroute speakers, deduplicates repeated connect', async () => {
  const h = harness(),
    app = new h.Context(),
    source = new h.Node(app)
  assert.equal(source.connect(app.destination), app.destination)
  source.connect(app.destination)
  assert.equal(source.edges.length, 2)
  assert.equal(source.edges.filter((edge) => edge.destination === app.destination).length, 1)
  const state = await h.api.finish(true)
  assert.equal(state.cleanup.prototypesRestored, true)
  assert.equal(app.state, 'running', 'recording cleanup cannot close the game context')
  assert.deepEqual(
    source.edges.map((edge) => edge.destination),
    [app.destination],
  )
  assert.equal(h.listeners.size, 0)
})

for (const mode of ['all', 'output', 'destination', 'destination-output', 'full-overload'])
  test(`disconnect ${mode} removes its tap and permits a clean reconnect`, async () => {
    const h = harness(),
      app = new h.Context(),
      source = new h.Node(app)
    source.connect(app.destination, 1)
    const args = {
      all: [],
      output: [1],
      destination: [app.destination],
      'destination-output': [app.destination, 1],
      'full-overload': [app.destination, 1, 0],
    }[mode]
    source.disconnect(...args)
    assert.equal(source.edges.length, 0)
    source.connect(app.destination, 1)
    assert.equal(source.edges.length, 2)
    await h.api.finish(true)
    assert.equal(source.edges.length, 1)
  })

test('native disconnect rejection does not drop recording state; intermediate routes are untouched', async () => {
  const h = harness(),
    app = new h.Context(),
    source = new h.Node(app),
    intermediate = new h.Node(app)
  source.connect(app.destination)
  source.connect(intermediate)
  assert.throws(() => source.disconnect(app.destination, 0, 1), /native bad input/)
  assert.equal(source.edges.length, 3)
  source.disconnect(intermediate)
  assert.equal(source.edges.length, 2)
  await h.api.finish(true)
  assert.equal(source.edges.length, 1)
})

test('decode observer preserves Promise identity and native callbacks on success', async () => {
  const h = harness(),
    app = new h.Context()
  const decoded = { actualBuffer: true }
  app.decodeResult = Promise.resolve(decoded)
  let callback
  const result = app.decodeAudioData(new ArrayBuffer(1), (value) => {
    callback = value
  })
  assert.equal(result, app.decodeResult)
  assert.equal(await result, decoded)
  assert.equal(callback, decoded)
  assert.deepEqual([...h.api.state().failures], [])
  await h.api.finish(true)
})

test('decode observer preserves synchronous native throws', async () => {
  const h = harness(),
    app = new h.Context()
  const error = new TypeError('native invalid decode argument')
  app.decodeFailure = error
  assert.throws(
    () => app.decodeAudioData(null),
    (caught) => caught === error,
  )
  const result = await h.api.finish()
  assert.equal(result.phase, 'failed')
  assert.match(result.failures.join(' '), /native invalid decode argument/)
  assert(Object.values(result.cleanup).every(Boolean))
})

test('SFX decode rejection fails capture while another BGM output remains connected', async () => {
  const h = harness(),
    sfx = new h.Context(),
    bgm = new h.Context(),
    music = new h.Node(bgm)
  music.connect(bgm.destination)
  h.api.arm({ videoPath: null })
  const error = new Error('native SFX decode rejected')
  sfx.decodeResult = Promise.reject(error)
  let callback
  const promise = sfx.decodeAudioData(new ArrayBuffer(1), undefined, (value) => {
    callback = value
  })
  assert.equal(promise, sfx.decodeResult)
  await assert.rejects(promise, (caught) => caught === error)
  assert.equal(callback, error)
  assert.equal(bgm.state, 'running')
  assert(music.edges.some((edge) => edge.destination === bgm.destination))
  const result = await h.api.finish()
  assert.equal(result.phase, 'failed')
  assert.match(result.failures.join(' '), /audio decode failed/)
  assert(Object.values(result.cleanup).every(Boolean))
  assert.equal(bgm.state, 'running')
  await assert.rejects(() => h.api.chunk(0, 100), /no completed capture/)
})

test('stop returns actual ownership counters and restores originals without closing source contexts', async () => {
  const h = harness(),
    app = new h.Context(),
    source = new h.Node(app)
  source.connect(app.destination)
  h.api.arm({ videoPath: null })
  assert.throws(() => h.api.arm({ videoPath: null }), /cannot be armed/)
  const result = await h.api.finish()
  assert.equal(result.phase, 'stopped')
  assert.equal(result.canvasFrames, 1)
  assert.equal(result.audioContexts, 1)
  assert(Object.values(result.cleanup).every(Boolean))
  assert.equal(app.state, 'running')
  assert.equal(h.Node.prototype.connect, h.original.connect)
  assert.equal(h.Node.prototype.disconnect, h.original.disconnect)
  assert.equal(await h.api.chunk(0, 100), btoa('sample'))
})

for (const [name, options, expected] of [
  ['codec', { codec: false }, /MediaRecorder unavailable/],
  ['unknown overlay', { obscured: true }, /obscured/],
])
  test(`${name} failure cannot provide a successful payload`, async () => {
    const h = harness(options)
    h.api.arm({ videoPath: null })
    const result = await h.api.finish()
    assert.equal(result.phase, 'failed')
    assert.match(result.failures.join(' '), expected)
    assert(Object.values(result.cleanup).every(Boolean))
    await assert.rejects(() => h.api.chunk(0, 100), /no completed capture/)
  })
