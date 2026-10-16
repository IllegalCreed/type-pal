import { TextDecoder } from 'node:util'

// Byte/structure budgets are protocol limits, not a heap or RSS guarantee.
export const terminalLimits = Object.freeze({
  frameBytes: 8_388_608,
  decodedBytes: 67_108_864,
  depth: 128,
  values: 2_000_000,
  stringBytes: 16_777_216,
})

export function terminalFailure(code, message) {
  const error = new Error(`terminal ${code}: ${message}`)
  error.code = `TERMINAL_${code.toUpperCase().replaceAll('-', '_')}`
  return error
}

export function decodeTerminalUtf8(buffer) {
  if (!Buffer.isBuffer(buffer)) throw terminalFailure('utf8', 'original Buffer required')
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf)
    throw terminalFailure('utf8', 'BOM is forbidden')
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer)
  } catch {
    throw terminalFailure('utf8', 'invalid UTF8 bytes')
  }
}

/** Parse original bytes before constructing unbounded subtrees or decoded key sets. */
export function parseTerminalJson(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > terminalLimits.decodedBytes)
    throw terminalFailure('json-budget', 'decoded byte limit exceeded or Buffer missing')
  decodeTerminalUtf8(buffer)
  let offset = 0
  let count = 0
  const fail = (message) => {
    throw terminalFailure('json', `${message} at byte ${offset}`)
  }
  const space = () => {
    while ([0x20, 0x09, 0x0a, 0x0d].includes(buffer[offset])) offset++
  }
  const string = () => {
    const start = offset++
    let escaped = false
    while (offset < buffer.length) {
      const byte = buffer[offset++]
      if (!escaped && byte === 0x22) {
        if (offset - start - 2 > terminalLimits.stringBytes)
          throw terminalFailure('json-budget', 'string token byte limit exceeded')
        try {
          return JSON.parse(buffer.subarray(start, offset).toString('utf8'))
        } catch {
          fail('invalid string token')
        }
      }
      if (offset - start - 1 > terminalLimits.stringBytes)
        throw terminalFailure('json-budget', 'string token byte limit exceeded')
      if (!escaped && byte < 0x20) fail('unescaped control character')
      if (!escaped && byte === 0x5c) escaped = true
      else escaped = false
    }
    fail('unterminated string')
  }
  const value = (depth) => {
    space()
    if (++count > terminalLimits.values)
      throw terminalFailure('json-budget', 'value count limit exceeded')
    const byte = buffer[offset]
    if (byte === 0x7b || byte === 0x5b) {
      if (depth + 1 > terminalLimits.depth)
        throw terminalFailure('json-budget', 'container depth limit exceeded')
      offset++
      space()
      const object = byte === 0x7b
      const close = object ? 0x7d : 0x5d
      const result = object ? {} : []
      const keys = object ? new Set() : undefined
      if (buffer[offset] === close) {
        offset++
        return result
      }
      while (offset < buffer.length) {
        // A further member/element needs a value slot before allocating its key or subtree.
        if (count >= terminalLimits.values)
          throw terminalFailure('json-budget', 'value count limit exceeded')
        let key
        if (object) {
          if (buffer[offset] !== 0x22) fail('object key required')
          key = string()
          if (keys.has(key)) throw terminalFailure('json-duplicate', 'duplicate decoded key')
          keys.add(key)
          space()
          if (buffer[offset++] !== 0x3a) fail('colon required')
        }
        const child = value(depth + 1)
        if (object)
          Object.defineProperty(result, key, {
            value: child,
            enumerable: true,
            configurable: true,
            writable: true,
          })
        else result.push(child)
        space()
        if (buffer[offset] === close) {
          offset++
          return result
        }
        if (buffer[offset++] !== 0x2c) fail('comma required')
        space()
      }
      fail('unterminated container')
    }
    if (byte === 0x22) return string()
    for (const [token, decoded] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ]) {
      if (buffer.subarray(offset, offset + token.length).equals(Buffer.from(token))) {
        offset += token.length
        return decoded
      }
    }
    const start = offset
    if (buffer[offset] === 0x2d) offset++
    if (buffer[offset] === 0x30) offset++
    else {
      if (!(buffer[offset] >= 0x31 && buffer[offset] <= 0x39)) fail('value required')
      while (buffer[offset] >= 0x30 && buffer[offset] <= 0x39) offset++
    }
    if (buffer[offset] === 0x2e) {
      offset++
      const fraction = offset
      while (buffer[offset] >= 0x30 && buffer[offset] <= 0x39) offset++
      if (offset === fraction) fail('fraction required')
    }
    if (buffer[offset] === 0x65 || buffer[offset] === 0x45) {
      offset++
      if (buffer[offset] === 0x2b || buffer[offset] === 0x2d) offset++
      const exponent = offset
      while (buffer[offset] >= 0x30 && buffer[offset] <= 0x39) offset++
      if (offset === exponent) fail('exponent required')
    }
    const number = Number(buffer.subarray(start, offset).toString('ascii'))
    if (!Number.isFinite(number)) fail('finite number required')
    return number
  }
  const result = value(0)
  space()
  if (offset !== buffer.length) fail('trailing input')
  return result
}

function stringToken(value) {
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code === 0x22 || code === 0x5c || [8, 9, 10, 12, 13].includes(code)) bytes += 2
    else if (code < 0x20) bytes += 6
    else if (code < 0x80) bytes++
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4
        index++
      } else bytes += 6
    } else if (code >= 0xdc00 && code <= 0xdfff) bytes += 6
    else bytes += 3
    if (bytes > terminalLimits.stringBytes)
      throw terminalFailure('json-budget', 'string token byte limit exceeded')
  }
  return JSON.stringify(value)
}

/** J emits tokens directly: integer-looking keys must not be reordered by object stringify. */
export function canonicalTerminalJson(value) {
  let buffer = Buffer.allocUnsafe(4096)
  let length = 0
  let count = 0
  const ancestors = new Set()
  const append = (token) => {
    const bytes = Buffer.byteLength(token)
    if (length + bytes > terminalLimits.decodedBytes)
      throw terminalFailure('json-budget', 'canonical decoded byte limit exceeded')
    if (length + bytes > buffer.length) {
      const next = Buffer.allocUnsafe(
        Math.min(terminalLimits.decodedBytes, Math.max(length + bytes, buffer.length * 2)),
      )
      buffer.copy(next, 0, 0, length)
      buffer = next
    }
    buffer.write(token, length, bytes, 'utf8')
    length += bytes
  }
  const emit = (current, depth) => {
    if (++count > terminalLimits.values)
      throw terminalFailure('json-budget', 'canonical value count limit exceeded')
    if (current === null) return append('null')
    if (typeof current === 'string') return append(stringToken(current))
    if (typeof current === 'boolean') return append(String(current))
    if (typeof current === 'number' && Number.isFinite(current))
      return append(Object.is(current, -0) ? '-0' : JSON.stringify(current))
    if (typeof current !== 'object' || !current)
      throw terminalFailure('json', 'only finite JSON values are permitted')
    if (depth + 1 > terminalLimits.depth)
      throw terminalFailure('json-budget', 'canonical container depth limit exceeded')
    if (ancestors.has(current)) throw terminalFailure('json', 'cyclic value')
    const array = Array.isArray(current)
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(current)))
      throw terminalFailure('json', 'plain object required')
    if (Object.getOwnPropertySymbols(current).length)
      throw terminalFailure('json', 'symbol member forbidden')
    const keys = Object.keys(current)
    if (keys.length > terminalLimits.values - count)
      throw terminalFailure('json-budget', 'canonical member count limit exceeded')
    ancestors.add(current)
    append(array ? '[' : '{')
    if (array) {
      if (
        keys.length !== current.length ||
        Object.getOwnPropertyNames(current).length !== keys.length + 1
      )
        throw terminalFailure('json', 'dense array without extra members required')
      for (let index = 0; index < current.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(current, String(index))
        if (!descriptor || !('value' in descriptor))
          throw terminalFailure('json', 'array accessors or holes forbidden')
        if (index) append(',')
        emit(descriptor.value, depth + 1)
      }
    } else {
      if (Object.getOwnPropertyNames(current).length !== keys.length)
        throw terminalFailure('json', 'nonenumerable object member forbidden')
      const ordered = keys.map((key) => {
        const token = stringToken(key)
        return { key, token, bytes: Buffer.from(token) }
      })
      ordered.sort((a, b) => Buffer.compare(a.bytes, b.bytes))
      for (const [index, { key, token }] of ordered.entries()) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key)
        if (!descriptor || !('value' in descriptor))
          throw terminalFailure('json', 'object accessor forbidden')
        if (index) append(',')
        append(token)
        append(':')
        emit(descriptor.value, depth + 1)
      }
    }
    append(array ? ']' : '}')
    ancestors.delete(current)
  }
  emit(value, 0)
  append('\n')
  return buffer.subarray(0, length)
}
