import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMessages } from './msg.js'
import { parseSss } from './sss.js'

const MSG_PATH = resolve(__dirname, '../../../../data/raw/M.MSG')
const SSS_PATH = resolve(__dirname, '../../../../data/raw/SSS.MKF')

describe('parseMessages', () => {
  const msgBuf = new Uint8Array(readFileSync(MSG_PATH))
  const sssBuf = new Uint8Array(readFileSync(SSS_PATH))
  const messages = parseMessages(msgBuf, parseSss(sssBuf).messageOffsets)

  it('至少有 1000 条消息(原版规模)', () => {
    expect(messages.length).toBeGreaterThan(1000)
  })

  it('随便取一条,是字符串', () => {
    expect(typeof messages[100]).toBe('string')
  })

  it('包含已知主角名"逍遥"出现的对白', () => {
    expect(messages.some((m) => m.includes('逍遥'))).toBe(true)
  })
})
