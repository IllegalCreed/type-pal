// @vitest-environment node
// Payload shape only; the drop owner checks asset identity and frame range.
import { describe, expect, test } from 'vitest'
import { inspectSpriteFrameDragPayload, SPRITE_FRAME_DRAG_MIME } from './SpriteFrameWorkbench.js'

describe('Sprite frame drag payload', () => {
  test('inspect：缺 MIME 返回 absent', () => {
    expect(inspectSpriteFrameDragPayload({ getData: () => '' })).toEqual({ kind: 'absent' })
  })

  test('inspect：非法 JSON 返回 invalid', () => {
    const result = inspectSpriteFrameDragPayload({
      getData: (type) => (type === SPRITE_FRAME_DRAG_MIME ? '{' : ''),
    })
    expect(result).toEqual({ kind: 'invalid' })
  })

  test('inspect：frame 非整数返回 invalid', () => {
    const result = inspectSpriteFrameDragPayload({
      getData: (type) =>
        type === SPRITE_FRAME_DRAG_MIME ? JSON.stringify({ asset: 'sprite.test', frame: 1.5 }) : '',
    })
    expect(result).toEqual({ kind: 'invalid' })
  })

  test('inspect：合法 payload 可读回', () => {
    const payload = inspectSpriteFrameDragPayload({
      getData: (type) =>
        type === SPRITE_FRAME_DRAG_MIME ? JSON.stringify({ asset: 'sprite.test', frame: 3 }) : '',
    })
    expect(payload).toEqual({ kind: 'payload', value: { asset: 'sprite.test', frame: 3 } })
  })

  test('inspect：JSON 标量不是拖拽 payload', () => {
    expect(
      inspectSpriteFrameDragPayload({
        getData: (type) => (type === SPRITE_FRAME_DRAG_MIME ? '"nope"' : ''),
      }),
    ).toEqual({ kind: 'invalid' })
  })
})
