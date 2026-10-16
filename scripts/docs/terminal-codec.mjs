import { constants, deflateRawSync, inflateRawSync } from 'node:zlib'
import {
  canonicalTerminalJson,
  parseTerminalJson,
  terminalFailure,
  terminalLimits,
} from './terminal-json.mjs'

const header = Buffer.from('1f8b08000000000002ff', 'hex')
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

export function terminalCrc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function encodeTerminalArchive(value) {
  const decoded = canonicalTerminalJson(value)
  let body
  try {
    body = deflateRawSync(decoded, { level: 9, maxOutputLength: terminalLimits.frameBytes - 18 })
  } catch (error) {
    throw terminalFailure('frame-budget', error.message)
  }
  if (header.length + body.length + 8 > terminalLimits.frameBytes)
    throw terminalFailure('frame-budget', 'compressed frame byte limit exceeded')
  const footer = Buffer.alloc(8)
  footer.writeUInt32LE(terminalCrc32(decoded), 0)
  footer.writeUInt32LE(decoded.length, 4)
  return Buffer.concat([header, body, footer])
}

export function decodeTerminalArchive(frame) {
  if (!Buffer.isBuffer(frame) || frame.length > terminalLimits.frameBytes)
    throw terminalFailure('frame-budget', 'compressed frame limit exceeded or Buffer missing')
  if (frame.length < 18 || !frame.subarray(0, 10).equals(header))
    throw terminalFailure('framing', 'fixed single-frame header required')
  let result
  try {
    result = inflateRawSync(frame.subarray(10), {
      info: true,
      finishFlush: constants.Z_FINISH,
      maxOutputLength: terminalLimits.decodedBytes,
    })
  } catch (error) {
    throw terminalFailure('inflate', error.message)
  }
  const consumed = result.engine.bytesWritten
  if (!Number.isSafeInteger(consumed) || consumed <= 0 || 10 + consumed + 8 !== frame.length)
    throw terminalFailure(
      'framing',
      'exact DEFLATE consumption, eight-byte footer and EOF required',
    )
  const decoded = result.buffer
  const footer = 10 + consumed
  if (frame.readUInt32LE(footer) !== terminalCrc32(decoded))
    throw terminalFailure('crc', 'CRC32 mismatch')
  if (frame.readUInt32LE(footer + 4) !== decoded.length)
    throw terminalFailure('isize', 'decoded size mismatch')
  const value = parseTerminalJson(decoded)
  if (!canonicalTerminalJson(value).equals(decoded))
    throw terminalFailure('canonical', 'decoded bytes must be exact J with one final LF')
  return value
}
