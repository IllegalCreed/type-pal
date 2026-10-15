import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { parseMessages } from './msg.js'
import { parseSss } from './sss.js'

const digest = (data: string | Uint8Array): string =>
  createHash('sha256').update(data).digest('hex')

it('parseMessages 原盘固定文本：精确条数、首中末样本、控制标记和输入所有权', () => {
  const msgBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/M.MSG')))
  const sssBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')))
  const beforeMsg = digest(msgBuf)
  const beforeSss = digest(sssBuf)
  const offsets = parseSss(sssBuf).messageOffsets
  const beforeOffsets = digest(JSON.stringify(Array.from(offsets)))
  const messages = parseMessages(msgBuf, offsets)
  // 五条expected直接核raw DWORD区间与Python严格GBK；不是全正文/fixup/native oracle。
  expect({
    msgSha256: beforeMsg,
    sssSha256: beforeSss,
    offsets: offsets.length,
    messages: messages.length,
    samples: [0, 1, 100, 6757, 13512].map((id) => [id, messages[id]]),
  }).toStrictEqual({
    msgSha256: '5e553754fa0dcdab3b25590a01cb3f08a510c17ee9d59afd1c9f62b02841b846',
    sssSha256: 'ce448a90c9797648eea315fe589b2bd434139ffc423bf0a5954dae6f4c8b4756',
    offsets: 13514,
    messages: 13513,
    samples: [
      [0, '$10李～逍～遥，李～逍～遥！~30'],
      [1, '李逍遥:'],
      [100, '李逍遥∶'],
      [6757, '大嫂出来外面采花吗？'],
      [13512, '　哇～　怎么办！~60'],
    ],
  })
  expect(digest(msgBuf)).toBe(beforeMsg)
  expect(digest(sssBuf)).toBe(beforeSss)
  expect(digest(JSON.stringify(Array.from(offsets)))).toBe(beforeOffsets)
})
