import { describe, expect, it } from 'vitest'
import { createFramebuffer } from '../../framebuffer.js'
import { presentFrame } from '../../present.js'
import { COVER, hiddenSprite, SENTINEL, sprite } from './fixtures/images.js'
import { baseContext, bitmapView, emptyMap, exploreState, worldView } from './fixtures/world.js'

/**
 * 队首、跟随者和 NPC 的脚底锚都落在屏幕 (159, 103)。
 * 队首/跟随 blit 用 sy+4，NPC 用 sy+7；高度 1、anchorY 1 时三者 dstY 相同。
 * sLayer 只进 NPC 排序键（y + sLayer*8 + 9），blit 时相消。
 * 跟随者与队首同世界坐标时排序键同为 y+10，后入列，稳定排序画在队首之上。
 */
function stackSprites() {
  const party = sprite(3, 1, [
    { x: 0, y: 0, index: 0x41 },
    { x: 1, y: 0, index: 0x42 },
    { x: 2, y: 0, index: 0x43 },
  ])
  const follower = sprite(3, 1, [
    { x: 0, y: 0, index: 0x51 },
    { x: 2, y: 0, index: 0 },
  ])
  const npc = sprite(3, 1, [{ x: 2, y: 0, index: 0x61 }])
  return { party, follower, npc }
}

describe('P11 大世界分层', () => {
  it('P11 同屏队首跟随与NPC在sLayer翻转后交换前后，透明孔露出下一层', () => {
    const { party, follower, npc } = stackSprites()
    const gs = exploreState({ x: 160, y: 100 })
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 8
    gs.trail = [
      { x: 160, y: 100, dir: 'down' },
      { x: 160, y: 100, dir: 'down' },
    ]
    gs.npcs = [{ id: 1, x: 160, y: 97, spriteNum: 3, sState: 1, sLayer: 0 }]
    const ctx = baseContext({
      partyFrames: [party],
      npcSprites: new Map([[3, npc]]),
      npcSpriteFrames: new Map([[8, [follower]]]),
    })
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)

    const beforeBits = [party, follower, npc].map((img) => bitmapView(img))
    const beforeWorld = worldView(gs)
    presentFrame(fb, gs, ctx)
    expect([party, follower, npc].map((img) => bitmapView(img))).toEqual(beforeBits)
    expect(worldView(gs)).toEqual(beforeWorld)
    expect(fb.indices[0]).toBe(0)

    // sLayer 0：NPC 排序键 106，队首/跟随 110。跟随在最上。
    // (159,103) 跟随不透明 0x51；(160,103) 跟随孔见队首 0x42；(161,103) 跟随不透明 0。
    expect(fb.indices[103 * 320 + 159]).toBe(0x51)
    expect(fb.indices[103 * 320 + 160]).toBe(0x42)
    expect(fb.indices[103 * 320 + 161]).toBe(0)

    gs.npcs[0]!.sLayer = 1
    const beforeRaised = worldView(gs)
    presentFrame(fb, gs, ctx)
    expect(worldView(gs)).toEqual(beforeRaised)
    expect([party, follower, npc].map((img) => bitmapView(img))).toEqual(beforeBits)

    // sLayer 1：NPC 排序键 114，画到最上，屏幕坐标不变。
    // (159,103) NPC 孔见跟随 0x51，不是队首 0x41；(160,103) 双孔见队首 0x42；
    // (161,103) NPC 不透明 0x61 盖住跟随的不透明 0。
    expect(fb.indices[103 * 320 + 159]).toBe(0x51)
    expect(fb.indices[103 * 320 + 160]).toBe(0x42)
    expect(fb.indices[103 * 320 + 161]).toBe(0x61)
  })

  it('P11 前景cover盖住后排NPC，前排透明孔见cover色而不见后排', () => {
    // 与 present.test.ts cover 几何相同：camera (0,-32)，cell(5,5) layer1 id 1、height 2。
    // cover 重画落在 (144,115)，全画只到 y=104..107。后排 NPC 先画 0x41，cover 再盖成 7，
    // 前排 sLayer=3 排在 cover 之后。
    const cover = {
      width: 4,
      height: 4,
      indices: new Uint8Array(16).fill(COVER),
      opaque: new Uint8Array(16).fill(1),
    }
    const rear = sprite(
      2,
      2,
      [
        { x: 0, y: 0, index: 0x41 },
        { x: 1, y: 0, index: 0x41 },
        { x: 0, y: 1, index: 0x41 },
        { x: 1, y: 1, index: 0x41 },
      ],
      { x: 1, y: 2 },
    )
    const front = sprite(
      2,
      2,
      [
        { x: 1, y: 0, index: 0x61 },
        { x: 0, y: 1, index: 0 },
      ],
      { x: 1, y: 2 },
    )
    const map = emptyMap(10, 10)
    map.cells[5]![5] = { lower: 0x02020000, upper: 0 }
    const gs = exploreState({ x: 160, y: 80 })
    gs.camera = { x: 0, y: -32 }
    gs.npcs = [
      { id: 1, x: 145, y: 78, spriteNum: 1, sState: 1, sLayer: 0 },
      { id: 2, x: 145, y: 78, spriteNum: 2, sState: 1, sLayer: 3 },
    ]
    const party = hiddenSprite(16, 24)
    const ctx = baseContext({
      tilemap: map,
      tileImages: { get: (index) => (index === 1 ? cover : undefined) },
      partyFrames: [party],
      npcSprites: new Map([
        [1, rear],
        [2, front],
      ]),
    })
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const beforeBits = [bitmapView(cover), bitmapView(rear), bitmapView(front), bitmapView(party)]
    const beforeWorld = worldView(gs)
    presentFrame(fb, gs, ctx)
    expect([bitmapView(cover), bitmapView(rear), bitmapView(front), bitmapView(party)]).toEqual(
      beforeBits,
    )
    expect(worldView(gs)).toEqual(beforeWorld)

    // (144,115) 前排孔见 cover 7，若 cover 没盖过后排则会是 0x41。
    expect(fb.indices[115 * 320 + 144]).toBe(COVER)
    expect(fb.indices[115 * 320 + 145]).toBe(0x61)
    // 不透明索引 0 写成 0；旁边的孔仍是 cover。
    expect(fb.indices[116 * 320 + 144]).toBe(0)
    expect(fb.indices[116 * 320 + 145]).toBe(COVER)
    // cover 带上方一像素不是这张 4×4 重画，也不能是后排色。
    expect(fb.indices[114 * 320 + 144]).not.toBe(0x41)
  })
})
