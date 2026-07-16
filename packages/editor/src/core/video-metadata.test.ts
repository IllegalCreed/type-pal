import { describe, expect, it } from 'vitest'
import { mp4HasAudioTrack } from './video-metadata.js'

function box(type: string, payload: Uint8Array): Uint8Array {
  const result = new Uint8Array(8 + payload.byteLength)
  new DataView(result.buffer).setUint32(0, result.byteLength)
  result.set(
    [...type].map((char) => char.charCodeAt(0)),
    4,
  )
  result.set(payload, 8)
  return result
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

function mp4(handler: 'soun' | 'vide'): Uint8Array {
  const ftyp = box('ftyp', Uint8Array.from([0x69, 0x73, 0x6f, 0x6d]))
  const hdlrPayload = new Uint8Array(12)
  hdlrPayload.set(
    [...handler].map((char) => char.charCodeAt(0)),
    8,
  )
  return concat(ftyp, box('moov', box('trak', box('mdia', box('hdlr', hdlrPayload)))))
}

describe('mp4 metadata', () => {
  it('从 hdlr box 区分音轨与纯视频', () => {
    expect(mp4HasAudioTrack(mp4('soun'))).toBe(true)
    expect(mp4HasAudioTrack(mp4('vide'))).toBe(false)
    expect(mp4HasAudioTrack(Uint8Array.from([1, 2, 3]))).toBeUndefined()
  })
})
