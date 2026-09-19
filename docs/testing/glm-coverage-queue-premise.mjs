// Design-only probes for TB-01..03. No project/asset/coverage writes or browser QA.
// node --import tsx docs/testing/glm-coverage-queue-premise.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { deflateSync, inflateSync } from 'node:zlib'
import {
  checkAuthorDialogueCue,
  commandAssetTaggedReferencesAtNode,
  decodeFrameSequenceFrame,
  encodeFrameSequenceSync,
  parseFrameSequence,
} from '../../packages/content/src/index.ts'
import { quantizeFrameAnimationRequest } from '../../packages/editor/src/core/frame-animation-codec.ts'
import { quantizeFrameAnimationInWorker } from '../../packages/editor/src/core/frame-animation-worker-client.ts'
import { prepareAuthoredImage } from '../../packages/editor/src/core/image-import.ts'
import { SfxPlayer } from '../../packages/reforge/src/audio/sfx.ts'

const restoreGlobals = (names) => {
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  return () => {
    for (const [name, descriptor] of saved)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
  }
}
const setGlobal = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
const result = {}

const cue = {
  identity: { kind: 'unbound', portrait: { asset: 'portrait.probe', side: 'left' } },
  rows: [{ text: 'probe', speed: 0 }],
  autoAdvance: 0,
  cursorFrame: 0,
}
checkAuthorDialogueCue(cue, 'probe')
assert.deepEqual(commandAssetTaggedReferencesAtNode({ kind: 'dialog', cue }, 'probe'), [
  { asset: 'portrait.probe', expectedKind: 'portrait', where: 'probe.cue.identity.portrait.asset' },
])
result.unboundPortrait = 'valid current cue -> exact asset reference'

const encodedFrame = encodeFrameSequenceSync(
  { width: 1, height: 1, defaultFrameMs: 40, frames: [{ rgba: new Uint8Array([1, 2, 3, 255]) }] },
  deflateSync,
)
const oldLength = new DataView(encodedFrame.buffer, encodedFrame.byteOffset).getUint32(8, true)
const index = JSON.parse(new TextDecoder().decode(encodedFrame.subarray(12, 12 + oldLength)))
const reindex = (bytes) => {
  const payload = encodedFrame.subarray(12 + oldLength)
  const value = new Uint8Array(12 + bytes.length + payload.length)
  value.set(encodedFrame.subarray(0, 12))
  new DataView(value.buffer).setUint32(8, bytes.length, true)
  value.set(bytes, 12)
  value.set(payload, 12 + bytes.length)
  return value
}
const external = reindex(
  new TextEncoder().encode(JSON.stringify({ ...index, diagnosticLabel: '汉😀' })),
)
const externalFrame = await decodeFrameSequenceFrame(
  parseFrameSequence(external),
  0,
  async (bytes) => inflateSync(bytes),
)
assert.deepEqual([...externalFrame], [1, 2, 3, 255])
assert.throws(() => parseFrameSequence(reindex(new Uint8Array([255]))), /非法 UTF-8 起始字节/)
assert.throws(() => parseFrameSequence(reindex(new TextEncoder().encode('{'))), /非法 JSON/)
result.tpfsExternalIndex = {
  unicodeDecodeAccepted: true,
  realPixelRoundTrip: true,
  utf8AndJsonErrorsDistinct: true,
}

const wav = new ArrayBuffer(46)
const dv = new DataView(wav)
const tag = (at, text) => {
  for (const [i, ch] of [...text].entries()) dv.setUint8(at + i, ch.charCodeAt(0))
}
tag(0, 'RIFF')
dv.setUint32(4, 38, true)
tag(8, 'WAVE')
tag(12, 'fmt ')
dv.setUint32(16, 16, true)
dv.setUint16(20, 1, true)
dv.setUint16(22, 1, true)
dv.setUint32(24, 8000, true)
dv.setUint32(28, 16000, true)
dv.setUint16(32, 2, true)
dv.setUint16(34, 16, true)
tag(36, 'data')
dv.setUint32(40, 2, true)
const beforeWav = wav.slice(0)
const audioEvents = []
const restoreAudio = restoreGlobals(['window'])
try {
  class Context {
    state = 'running'
    destination = {}
    async decodeAudioData(input) {
      assert.notEqual(input, wav)
      assert.deepEqual(new Uint8Array(input), new Uint8Array(beforeWav))
      new Uint8Array(input).fill(99)
      return { decoded: true }
    }
    async resume() {
      audioEvents.push('resume')
    }
    createBufferSource() {
      return {
        connect() {
          audioEvents.push('connect')
        },
        start() {
          audioEvents.push('start')
        },
        stop() {
          audioEvents.push('stop')
        },
      }
    }
    async close() {
      this.state = 'closed'
      audioEvents.push('close')
    }
  }
  setGlobal('window', { AudioContext: Context })
  const player = new SfxPlayer({
    projectId: 'probe',
    record: () => ({
      kind: 'sound',
      path: 'assets/probe.wav',
      mediaType: 'audio/wav',
      bytes: wav.byteLength,
      sha256: createHash('sha256').update(new Uint8Array(wav)).digest('hex'),
      origin: { kind: 'authored' },
    }),
    readBytes: async () => wav,
  })
  await player.prepare(['sound.probe'])
  assert.deepEqual(new Uint8Array(wav), new Uint8Array(beforeWav))
  assert.equal(player.play('sound.probe'), true)
  await player.dispose()
  assert.deepEqual(audioEvents, ['connect', 'start', 'stop', 'close'])
  result.browserAdapter = {
    sourceBytesPreserved: true,
    events: audioEvents,
    scope: 'real browserAdapter with AudioContext host double; not PCM decoding proof',
  }
} finally {
  restoreAudio()
}

const restoreWorker = restoreGlobals(['self', 'Worker'])
try {
  const messages = []
  let encodedReady
  const encoded = new Promise((resolve) => {
    encodedReady = resolve
  })
  const scope = {
    onmessage: null,
    postMessage(message, transfer = []) {
      const copied = structuredClone(message, { transfer })
      messages.push(copied)
      assert(transfer.every((buffer) => buffer.byteLength === 0))
      if (copied.id === 2) encodedReady(copied)
    },
  }
  setGlobal('self', scope)
  await import('../../packages/editor/src/core/frame-animation-codec.worker.ts')
  assert.equal(typeof scope.onmessage, 'function')
  scope.onmessage({
    data: {
      id: 1,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[0, 0, 0]],
        mode: 'nearest',
        frames: [new Uint8Array([100, 120, 140, 255]).buffer],
      },
    },
  })
  assert.deepEqual([...new Uint8Array(messages[0].frames[0])], [0, 0, 0, 255])
  scope.onmessage({
    data: {
      id: 2,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ rgba: new Uint8Array([4, 5, 6, 255]).buffer }],
      },
    },
  })
  const encodedMessage = await encoded
  const parsed = parseFrameSequence(new Uint8Array(encodedMessage.bytes))
  const pixels = await decodeFrameSequenceFrame(
    parsed,
    0,
    async (bytes) =>
      new Uint8Array(
        await new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')),
        ).arrayBuffer(),
      ),
  )
  assert.deepEqual([...pixels], [4, 5, 6, 255])
  let terminations = 0
  let transferredCopyDetached = false
  class WorkerHost {
    terminate() {
      terminations++
    }
    postMessage(message, transfer) {
      const received = structuredClone(message, { transfer })
      transferredCopyDetached = transfer.every((buffer) => buffer.byteLength === 0)
      queueMicrotask(() =>
        this.onmessage({
          data: { id: received.id, frames: quantizeFrameAnimationRequest(received.request) },
        }),
      )
    }
  }
  setGlobal('Worker', WorkerHost)
  const original = new Uint8Array([100, 120, 140, 255]).buffer
  const frames = await quantizeFrameAnimationInWorker({
    width: 1,
    height: 1,
    colors: [[0, 0, 0]],
    mode: 'nearest',
    frames: [original],
  })
  assert.equal(original.byteLength, 4)
  assert.deepEqual([...new Uint8Array(original)], [100, 120, 140, 255])
  assert.deepEqual([...frames[0]], [0, 0, 0, 255])
  assert.equal(terminations, 1)
  assert.equal(transferredCopyDetached, true)
  result.workerProtocol = {
    realHandler: true,
    quantizeAndEncode: true,
    actualTransfer: true,
    callerBufferPreserved: true,
    terminations,
    scope: 'Node host protocol, not browser thread scheduling',
  }
} finally {
  restoreWorker()
}

// pngjs is an existing declared dependency of pal-extract, used only by this diagnostic.
const { PNG } = createRequire(new URL('../../packages/pal-extract/package.json', import.meta.url))(
  'pngjs',
)
const png = new PNG({ width: 320, height: 200 })
for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255
const pngBytes = PNG.sync.write(png)
assert.equal(PNG.sync.read(pngBytes).width, 320)
const palette = Array.from({ length: 256 }, (_, i) => [i, i, i])
const restoreImage = restoreGlobals(['createImageBitmap', 'document'])
try {
  async function run(failEncoding) {
    let closes = 0,
      encodes = 0
    setGlobal('createImageBitmap', async (blob) => {
      const decoded = PNG.sync.read(Buffer.from(await blob.arrayBuffer()))
      return {
        width: decoded.width,
        height: decoded.height,
        close() {
          closes++
        },
      }
    })
    setGlobal('document', {
      createElement() {
        let currentPixels = png.data
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage() {},
            getImageData: () => ({ data: new Uint8ClampedArray(png.data) }),
            createImageData: () => ({ data: new Uint8ClampedArray(320 * 200 * 4) }),
            putImageData(image) {
              currentPixels = image.data
            },
          }),
          toBlob(callback) {
            encodes++
            callback(
              failEncoding
                ? null
                : new Blob(
                    [PNG.sync.write({ width: 320, height: 200, data: Buffer.from(currentPixels) })],
                    { type: 'image/png' },
                  ),
            )
          },
        }
      },
    })
    let error
    try {
      await prepareAuthoredImage(
        new File([pngBytes], 'probe.png', { type: 'image/png' }),
        'battle-background',
        palette,
      )
    } catch (failure) {
      error = failure.message
    }
    return { closes, encodes, error: error ?? null }
  }
  const control = await run(false)
  assert.deepEqual(control, { closes: 1, encodes: 2, error: null })
  const failure = await run(true)
  assert.equal(failure.error, '浏览器无法编码 PNG')
  assert.equal(failure.encodes, 1)
  result.imageEncoding = {
    control,
    failure,
    leakObserved: failure.closes === 0,
    scope: 'real PNG bytes with Canvas host double, not visual QA',
  }
} finally {
  restoreImage()
}
console.log(JSON.stringify(result, null, 2))
