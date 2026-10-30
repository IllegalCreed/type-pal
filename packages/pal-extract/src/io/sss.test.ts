import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { parseSss } from './sss.js'

const digest = (data: string | Uint8Array): string =>
  createHash('sha256').update(data).digest('hex')

it('parseSss 全原盘结构：每条语义/raw字段、表与完整字节码符合独立LE oracle', () => {
  const buf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')))
  const before = digest(buf)
  const sss = parseSss(buf)
  // Expected由独立Python struct按SDL布局读取原盘，不由当前TS生成；证据见CODE3b raw-tests。
  expect({
    inputSha256: before,
    eventObjects: sss.eventObjects.length,
    scenes: sss.scenes.length,
    objectWords: sss.objects.length,
    messageOffsets: sss.messageOffsets.length,
    bytecodeInstructions: sss.bytecode.byteLength / 8,
    eoDigest: digest(
      JSON.stringify(
        sss.eventObjects.map((o) => [
          o.vanishTime,
          o.x,
          o.y,
          o.layer,
          o.triggerScript,
          o.autoScript,
          o.state,
          o.triggerMode,
          o.spriteNum,
          o.nSpriteFrames,
          o.direction,
          o.currentFrameNum,
          o.scriptIdleFrame,
          o.spritePtrOffset,
          o.nSpriteFramesAuto,
          o.scriptIdleFrameCountAuto,
          Array.from(o.raw),
        ]),
      ),
    ),
    sceneDigest: digest(
      JSON.stringify(
        sss.scenes.map((s) => [
          s.mapNum,
          s.scriptOnEnter,
          s.scriptOnTeleport,
          s.eventObjectIndex,
          Array.from(s.raw),
        ]),
      ),
    ),
    objectDigest: digest(JSON.stringify(Array.from(sss.objects))),
    offsetDigest: digest(JSON.stringify(Array.from(sss.messageOffsets))),
    bytecodeDigest: digest(sss.bytecode),
  }).toStrictEqual({
    inputSha256: 'ce448a90c9797648eea315fe589b2bd434139ffc423bf0a5954dae6f4c8b4756',
    eventObjects: 5077,
    scenes: 295,
    objectWords: 3955,
    messageOffsets: 13514,
    bytecodeInstructions: 43503,
    eoDigest: '439658d77816db3cbc3dd54fcf3a6989c405716230998b0193838a557f262dcd',
    sceneDigest: 'dafd2356cb308d7cf4671b87d465473298bf8b3f6633bfb0140068f6ee47c305',
    objectDigest: '8c371169b681d006267d28ec85b2afd06324d8e2ac2f2d346c79b63f290c1ed0',
    offsetDigest: '8ea4810e4ee1001dfc4a91af44537cc0bfb6fd87f8a86f22fc9013edf79f948b',
    bytecodeDigest: '241ecddf16642de71eb4ba35f80b42677f7ececd42462c778d44c2e048a0dc70',
  })
  expect(digest(buf)).toBe(before)
})
