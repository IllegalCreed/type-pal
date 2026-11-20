import type { AssetRecordV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-asset-io-fixtures.js'
import { type SfxAudioAdapter, SfxPlayer, SfxReadinessResourceError } from './sfx.js'

afterEach(() => vi.unstubAllGlobals())

function pcmWave(): ArrayBuffer {
  const bytes = new Uint8Array(46)
  for (const [offset, name] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data'],
  ] as const)
    bytes.set(new TextEncoder().encode(name), offset)
  const fields = new DataView(bytes.buffer)
  fields.setUint32(4, 38, true) // RIFF payload
  fields.setUint32(16, 16, true) // PCM format block
  fields.setUint16(20, 1, true) // linear PCM
  fields.setUint16(22, 1, true) // mono
  fields.setUint32(24, 8000, true) // samples per second
  fields.setUint32(28, 16000, true) // bytes per second
  fields.setUint16(32, 2, true) // bytes per sample frame
  fields.setUint16(34, 16, true) // bits per sample
  fields.setUint32(40, 2, true) // one sample frame
  fields.setInt16(44, 0x1234, true)
  return bytes.buffer
}

const recordOf = (path: string, bytes = 46): AssetRecordV1 => ({
  kind: 'sound',
  path,
  mediaType: 'audio/wav',
  bytes,
  sha256: 'a'.repeat(64),
  origin: { kind: 'authored' },
})

const audioPort = (decode: SfxAudioAdapter['decode']): SfxAudioAdapter => ({
  state: 'running',
  resume: async () => {},
  decode,
  play: () => ({ stop: () => {} }),
})

describe('SFX resource preparation', () => {
  test.each([
    {
      defect: 'RIFF marker',
      change: (buffer: ArrayBuffer) => {
        new Uint8Array(buffer)[3] = 0x45
        return buffer
      },
    },
    {
      defect: 'WAVE marker',
      change: (buffer: ArrayBuffer) => {
        new Uint8Array(buffer)[11] = 0x46
        return buffer
      },
    },
    { defect: 'short header', change: (buffer: ArrayBuffer) => buffer.slice(0, 8) },
  ])('rejects a malformed $defect before invoking the decoder', async ({ change }) => {
    const bytes = change(pcmWave())
    const decode = vi.fn(async () => ({}))
    const player = new SfxPlayer(
      { record: () => recordOf('bad.wav', bytes.byteLength), readBytes: async () => bytes },
      audioPort(decode),
    )
    try {
      await expect(player.prepare(['sfx.bad'])).rejects.toThrow('不是 RIFF/WAVE')
      expect(decode).not.toHaveBeenCalled()
    } finally {
      await player.dispose()
    }
  })

  test('a retry re-reads the repaired WAV and sends only its valid bytes to the decoder', async () => {
    const repaired = pcmWave()
    const damaged = repaired.slice(0)
    new Uint8Array(damaged)[3] = 0x45
    const decode = vi.fn(async (bytes: ArrayBuffer) => ({ bytes }))
    const readBytes = vi.fn(async () => repaired).mockResolvedValueOnce(damaged)
    const player = new SfxPlayer(
      { record: () => recordOf('retry.wav'), readBytes },
      audioPort(decode),
    )
    try {
      await expect(player.prepare(['sfx.retry'])).rejects.toThrow('不是 RIFF/WAVE')
      expect(player.play('sfx.retry')).toBe(false)
      expect(decode).not.toHaveBeenCalled()

      await player.prepare(['sfx.retry'])
      expect(player.play('sfx.retry')).toBe(true)
      expect(readBytes.mock.calls).toEqual([
        ['sfx.retry', 'sound'],
        ['sfx.retry', 'sound'],
      ])
      expect(decode).toHaveBeenCalledExactlyOnceWith(repaired)
      expect(decode.mock.calls[0]?.[0]).toBe(repaired)
    } finally {
      await player.dispose()
    }
  })

  test('disposal during a real resource read rejects the old preparation after the read finishes', async () => {
    const entered = deferred<void>()
    const read = deferred<ArrayBuffer>()
    const readBytes = vi.fn(() => {
      entered.resolve()
      return read.promise
    })
    const decode = vi.fn(async () => ({}))
    const player = new SfxPlayer(
      { record: () => recordOf('late.wav'), readBytes },
      audioPort(decode),
    )
    const pending = player.prepare(['sfx.late'])
    try {
      await entered.promise
      expect(readBytes).toHaveBeenCalledExactlyOnceWith('sfx.late', 'sound')
      expect(decode).not.toHaveBeenCalled()
      await player.dispose()
      read.resolve(pcmWave())
      await expect(pending).rejects.toBeInstanceOf(SfxReadinessResourceError)
    } finally {
      read.resolve(pcmWave())
      await player.dispose()
    }
  })
})

test('the browser adapter decodes a private byte copy and releases its source and context', async () => {
  const source = new Uint8Array(pcmWave())
  const original = source.slice()
  const events: string[] = []
  const decoded: Uint8Array[] = []
  class AudioContextDouble {
    readonly state = 'running'
    readonly destination = {}
    async decodeAudioData(bytes: ArrayBuffer) {
      decoded.push(new Uint8Array(bytes))
      events.push('decode')
      return { marker: 'buffer' }
    }
    createBufferSource() {
      events.push('create-source')
      return {
        buffer: undefined,
        onended: null,
        connect: () => events.push('connect'),
        start: () => events.push('start'),
        stop: () => events.push('stop'),
      }
    }
    async close(): Promise<void> {
      events.push('close')
    }
  }
  vi.stubGlobal('window', { AudioContext: AudioContextDouble })
  const player = new SfxPlayer({
    projectId: 'p-host',
    record: () => recordOf('host.wav'),
    readBytes: async () => source.buffer,
  })
  try {
    await player.prepare(['sfx.host'])
    expect(decoded).toHaveLength(1)
    const decoderInput = decoded[0]
    expect(decoderInput).toEqual(original)
    decoderInput?.fill(0)
    expect(source).toEqual(original)
    expect(player.play('sfx.host')).toBe(true)
    await player.dispose()
    expect(events).toEqual(['decode', 'create-source', 'connect', 'start', 'stop', 'close'])
  } finally {
    await player.dispose()
  }
})
