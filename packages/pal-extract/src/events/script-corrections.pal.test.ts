import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import { parseMessages } from '../io/msg.js'
import { parseSss } from '../io/sss.js'
import { dumpAllEventObjects, dumpScene } from '../resources/scene.js'
import { correctScripts } from './script-corrections.js'

const input = new Uint8Array(
  readFileSync(resolve(import.meta.dirname, '../../../../data/raw/SSS.MKF')),
)
const sourceSha256 = createHash('sha256').update(input).digest('hex')

const messages = parseMessages(
  new Uint8Array(readFileSync(resolve(import.meta.dirname, '../../../../data/raw/M.MSG'))),
  parseSss(input).messageOffsets,
)

function instruction(bytes: Uint8Array, ip: number): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + ip * 8, 8)
  return [0, 2, 4, 6].map((offset) => view.getUint16(offset, true))
}

test('supported source corrections preserve raw input and change only reviewed instructions', () => {
  const source = parseSss(input)
  const before = structuredClone(source)
  const corrected = correctScripts(source, sourceSha256, messages)
  expect(source).toEqual(before)
  expect(messages[1503]).toBe('看错痢?')
  expect(corrected.messages[1503]).toBe('看错了')
  expect(createHash('sha256').update(input).digest('hex')).toBe(sourceSha256)
  const changed: number[] = []
  for (let ip = 0; ip < source.bytecode.length / 8; ip++) {
    if (
      instruction(source.bytecode, ip).some(
        (word, i) => word !== instruction(corrected.sss.bytecode, ip)[i],
      )
    )
      changed.push(ip)
  }
  expect(changed).toEqual([
    3923, 7568, 7569, 12910, 14461, 14486, 16390, 16474, 27448, 28423, 30946, 30947, 30951, 31046,
    31047, 34025, 34029, 35092, 35394, 36936, 37482, 37848, 39352, 39471, 39476, 39481, 39486,
    39491, 39496, 39700, 43041, 43049, 43055, 43134,
  ])
  expect(instruction(corrected.sss.bytecode, 7568)).toEqual([10, 7566, 0, 0])
  expect(instruction(corrected.sss.bytecode, 7569)).toEqual([30, 65516, 7573, 0])
  expect([36936, 37482, 37848].map((ip) => instruction(corrected.sss.bytecode, ip)[1])).toEqual([
    164, 103, 116,
  ])
  expect(instruction(corrected.sss.bytecode, 39352)).toEqual([47, 3, 0, 0])
  expect(instruction(corrected.sss.bytecode, 39700)).toEqual([23, 14, 21, 98])
  expect(instruction(corrected.sss.bytecode, 43134)).toEqual([86, 370, 1, 0])
  expect(correctScripts(source, sourceSha256, messages)).toEqual(corrected)
})

test('unknown source fingerprint and drifted old instruction fail closed without changing source', () => {
  const source = parseSss(input)
  expect(() => correctScripts(source, '0'.repeat(64), messages)).toThrow(
    'Unsupported script source',
  )
  source.bytecode = source.bytecode.slice()
  source.bytecode[39352 * 8 + 2] = 1
  const before = structuredClone(source)
  expect(() => correctScripts(source, sourceSha256, messages)).toThrow(
    'D13: instruction 39352 precondition failed',
  )
  expect(source).toEqual(before)
})

test('governor corrected metadata is identical in global and scene resources without moving sprite', () => {
  const { sss, eventMetadata } = correctScripts(parseSss(input), sourceSha256, messages)
  const global = dumpAllEventObjects(sss.scenes, sss.eventObjects, eventMetadata).eventObjects[1518]
  const scene = dumpScene(81, sss.scenes, sss.eventObjects, eventMetadata).eventObjects.find(
    (object) => object.id === 1518,
  )
  expect(scene).toEqual(global)
  expect(scene).toMatchObject({
    id: 1518,
    x: 1616,
    y: 968,
    triggerMode: 6,
    autoTriggerOnce: true,
    autoTriggerAnchorX: 1600,
    autoTriggerAnchorY: 1040,
  })
  expect(parseSss(input).eventObjects[1518]?.triggerMode).toBe(3)
})

test('unexpected Chinese message bytes cannot silently receive the text repair', () => {
  const altered = [...messages]
  altered[1503] = 'another source'
  expect(() => correctScripts(parseSss(input), sourceSha256, altered)).toThrow('D01: message')
})
