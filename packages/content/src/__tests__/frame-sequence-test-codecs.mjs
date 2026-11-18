import { TextEncoder } from 'node:util'
import { deflateSync, inflateSync } from 'node:zlib'

export const deflateBytes = (bytes) => new Uint8Array(deflateSync(bytes))
export const inflateBytes = (bytes) => new Uint8Array(inflateSync(bytes))
export const encodeText = (value) => new TextEncoder().encode(value)
