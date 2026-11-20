import { describe, expect, test } from 'vitest'
import { mp4HasAudioTrack } from './video-metadata.js'

function fourCc(name: string): Uint8Array {
  return Uint8Array.from(name, (character) => character.charCodeAt(0))
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

function box(name: string, content: Uint8Array): Uint8Array {
  return joinBytes(uint32(content.byteLength + 8), fourCc(name), content)
}

function fileType(): Uint8Array {
  return box('ftyp', joinBytes(fourCc('isom'), uint32(0), fourCc('isom')))
}

function handler(kind: 'soun' | 'vide', preDefined = uint32(0)): Uint8Array {
  return box(
    'hdlr',
    joinBytes(uint32(0), preDefined, fourCc(kind), new Uint8Array(12), Uint8Array.of(0)),
  )
}

// The detector consumes box metadata only. These inputs have no media samples.
function track(kind: 'soun' | 'vide'): Uint8Array {
  return box('trak', box('mdia', handler(kind)))
}

describe('MP4 audio metadata', () => {
  test.each([
    ['a short byte sequence', Uint8Array.of(1, 2, 3)],
    ['a first box other than ftyp', box('moov', new Uint8Array(8))],
  ])('does not identify %s as MP4', (_title, bytes) => {
    expect(mp4HasAudioTrack(bytes)).toBeUndefined()
  })

  test.each([
    ['soun', true],
    ['vide', false],
  ] as const)('recognizes the %s handler type inside a track', (kind, audible) => {
    expect(mp4HasAudioTrack(joinBytes(fileType(), box('moov', track(kind))))).toBe(audible)
  })

  test('reads the handler field rather than the preceding field', () => {
    // Deliberately corrupt the reserved pre-defined field of a video handler.
    const malformedHandler = handler('vide', fourCc('soun'))
    const movie = box('moov', box('trak', box('mdia', malformedHandler)))
    expect(mp4HasAudioTrack(joinBytes(fileType(), movie))).toBe(false)
  })

  test('ignores a handler without enough bytes for the handler type', () => {
    const small = box('hdlr', joinBytes(uint32(0), fourCc('soun')))
    expect(mp4HasAudioTrack(joinBytes(fileType(), box('moov', box('trak', small))))).toBe(false)
  })

  test('skips an unrelated top-level box and reaches the audio track', () => {
    const free = box('free', new Uint8Array(8))
    expect(mp4HasAudioTrack(joinBytes(fileType(), free, box('moov', track('soun'))))).toBe(true)
  })
})

describe('MP4 box bounds', () => {
  test('reads a movie box with a 64-bit size', () => {
    const audio = track('soun')
    const extended = joinBytes(
      uint32(1),
      fourCc('moov'),
      uint32(0),
      uint32(audio.byteLength + 16),
      audio,
    )
    expect(mp4HasAudioTrack(joinBytes(fileType(), extended))).toBe(true)
  })

  test.each([
    ['an incomplete extended header', joinBytes(uint32(1), fourCc('moov'), uint32(0))],
    [
      'an extended size beyond the available bytes',
      joinBytes(uint32(1), fourCc('moov'), uint32(0), uint32(0xffff_ffff), track('soun')),
    ],
    ['a size smaller than its header', joinBytes(uint32(4), fourCc('moov'), track('soun'))],
    ['a 32-bit size beyond its parent', joinBytes(uint32(10_000), fourCc('moov'), track('soun'))],
  ])('reports no audio for %s', (_title, malformed) => {
    expect(mp4HasAudioTrack(joinBytes(fileType(), malformed))).toBe(false)
  })

  test('treats a zero-size movie as the final top-level box', () => {
    const movie = joinBytes(uint32(0), fourCc('moov'), track('soun'))
    expect(mp4HasAudioTrack(joinBytes(fileType(), movie))).toBe(true)
  })

  test('does not read apparent sibling boxes beyond a zero-size file-type header', () => {
    const fileTypeToEnd = fileType()
    new DataView(fileTypeToEnd.buffer).setUint32(0, 0)
    expect(mp4HasAudioTrack(joinBytes(fileTypeToEnd, box('moov', track('soun'))))).toBe(false)
  })
})

describe('MP4 container traversal', () => {
  test('reads meta children after version and flags', () => {
    const metadata = box('meta', joinBytes(uint32(0), handler('soun')))
    const movie = box('moov', box('udta', metadata))
    expect(mp4HasAudioTrack(joinBytes(fileType(), movie))).toBe(true)
  })

  test('reaches supported nested containers within a meta box', () => {
    const innerTrack = box('trak', box('mdia', box('minf', handler('soun'))))
    const metadata = box('meta', joinBytes(uint32(0), box('moov', innerTrack)))
    expect(mp4HasAudioTrack(joinBytes(fileType(), metadata))).toBe(true)
  })

  test('reaches a handler under nested udta and edts boxes', () => {
    const movie = box('moov', box('udta', box('edts', handler('soun'))))
    expect(mp4HasAudioTrack(joinBytes(fileType(), movie))).toBe(true)
  })
})
