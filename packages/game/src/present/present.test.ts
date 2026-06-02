import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Tilemap, Palette } from '@type-pal/shared'
import { presentFrame, applyDialogIconPaletteShift, type PresentContext } from './present.js'
import { startDialogLine, tickDialog, setWaitingEndKey, FRAMES_PER_CHAR } from './dialog-box.js'
import { createFramebuffer } from './framebuffer.js'
import { createInitialGameState } from '../core/game-state.js'
import type { SpriteImage } from './draw-sprite.js'
import * as drawSpriteModule from './draw-sprite.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function makeSprite(colorIdx: number = 1): SpriteImage {
  return {
    width: 16, height: 24,
    indices: new Uint8Array(16 * 24).fill(colorIdx),
    opaque: new Uint8Array(16 * 24).fill(1),
    anchorX: 8, anchorY: 24,
  }
}

function baseCtx(tilemap?: Tilemap): PresentContext {
  return {
    tilemap: tilemap ?? flatMap(10, 10),
    tileImages: { get: () => undefined },
    partyFrames: [makeSprite(5)],
    partyWalkFrames: 3,
    npcSprites: new Map([[1, makeSprite(3)], [2, makeSprite(4)]]),
  }
}

describe('presentFrame', () => {
  it('无 dialogBox → 不画对话框,不抛错', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partyFrames: [{ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 }],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const ok = () => presentFrame(fb, gs, ctx)
    expect(ok).not.toThrow()
  })

  it('有 dialogBox → 文本绘到 fb(sdlpal upper/center/lower 无 box bg,文本即唯一证据)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // Sync.2:已 typing 完成 + fontColor=200(全屏其他像素无此色),验文本像素存在
    gs.dialogBox = startDialogLine('你好', { style: 'center', fontColor: 200 })
    // typing 完整段(2 字 × FRAMES_PER_CHAR)
    for (let i = 0; i < FRAMES_PER_CHAR * 2; i++) tickDialog(gs.dialogBox)
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partyFrames: [{ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 }],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    presentFrame(fb, gs, ctx)
    const hasTextPx = Array.from(fb.indices).some((i) => i === 200)
    expect(hasTextPx).toBe(true)
  })

  // ── C3(gameOverActive 重构):死亡 hold 双分支 ──
  // deathHoldActive(T0 过渡帧):纯保持上一帧(战斗倒地帧),不画 dialog、不 fb.clear。
  // gameOverActive(0x4F 后):保持帧 + 画死亡 dialog。两者都跳过 fb.clear()+世界重绘。
  const minimalCtx = (): PresentContext => ({
    tilemap: flatMap(3, 3),
    tileImages: { get: () => undefined },
    partyFrames: [{ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]), anchorX: 0, anchorY: 0 }],
    partyWalkFrames: 3,
    npcSprites: new Map(),
  })

  it('deathHoldActive=true → 保持上一帧(不 fb.clear、不重绘世界):预写哨兵像素存活', () => {
    const fb = createFramebuffer()
    fb.indices[0] = 173 // 哨兵:模拟战斗倒地帧像素(世界重绘会清成 0/tilemap)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.deathHoldActive = true
    presentFrame(fb, gs, minimalCtx())
    expect(fb.indices[0]).toBe(173) // 哨兵存活 = 没 fb.clear()+重绘 = hold 住战斗帧
  })

  it('gameOverActive=true + dialogBox → 保持上一帧 + 画死亡对话', () => {
    const fb = createFramebuffer()
    fb.indices[0] = 173 // 战斗帧哨兵
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.gameOverActive = true
    gs.dialogBox = startDialogLine('大侠请重新来过吧', { style: 'center', fontColor: 200 })
    for (let i = 0; i < FRAMES_PER_CHAR * 8; i++) tickDialog(gs.dialogBox)
    presentFrame(fb, gs, minimalCtx())
    expect(fb.indices[0]).toBe(173) // 战斗帧 hold(未被世界重绘)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true) // 死亡对话画上去了
  })

  it('两者都 false(普通 explore)→ fb.clear()+正常重绘世界:哨兵被清', () => {
    const fb = createFramebuffer()
    fb.indices[0] = 173
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // deathHoldActive/gameOverActive 都未置 → 正常重绘
    presentFrame(fb, gs, minimalCtx())
    expect(fb.indices[0]).not.toBe(173) // 被 fb.clear()+世界重绘覆盖(不 hold)
  })
})

// ── P0.c party frame 取 stepFrame(sdlpal scene.c:678-685)───────────────────
//
// walkFrames=3:iStepFrameLeader = [0,1,0,2][stepFrame],wFrame = dir*3 + iStepFrameLeader
// walkFrames=4:wFrame = dir*4 + stepFrame
// walking=false:站立帧 dir * walkFrames(P0.0 既有)
describe('P0.c party frame 取 stepFrame(sdlpal scene.c:678-685)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 追踪 presentFrame 内 party drawSprite 的 frameIdx。
   * 替换 ctx.partyFrames 为 map:frameIdx→SpriteImage(唯一颜色),
   * 记录实际落到哪张图。
   */
  function trackPartyFrameIdx(
    gs: ReturnType<typeof createInitialGameState>,
    walkFrames: number,
  ): number {
    // 构造 walkFrames*4 帧,每帧颜色 = idx+1
    const frames: SpriteImage[] = Array.from({ length: walkFrames * 4 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const drawn: number[] = []
    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        const idx = frames.indexOf(sprite as SpriteImage)
        if (idx >= 0) drawn.push(idx)
      },
    )
    const fb = createFramebuffer()
    const ctx: PresentContext = {
      tilemap: flatMap(10, 10),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: walkFrames,
      npcSprites: new Map(),
    }
    presentFrame(fb, gs, ctx)
    spy.mockRestore()
    return drawn[0] ?? -1
  }

  it('walking=false → 站立帧:frameIdx = dir * walkFrames (P0.0 既有)', () => {
    // facing=right → dir=3, walkFrames=3 → frameIdx=9
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: false, stepFrame: 0 }
    expect(trackPartyFrameIdx(gs, 3)).toBe(9)

    // facing=down → dir=0 → frameIdx=0
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.walkingFrame = { walking: false, stepFrame: 2 }
    expect(trackPartyFrameIdx(gs2, 3)).toBe(0)
  })

  it('walking=true, walkFrames=3, stepFrame=0 → iStepFrameLeader=0 → frameIdx=dir*3+0', () => {
    // facing=right → dir=3, leader=0 → frameIdx=9
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: true, stepFrame: 0 }
    expect(trackPartyFrameIdx(gs, 3)).toBe(9)
  })

  it('walking=true, walkFrames=3, stepFrame=1 → iStepFrameLeader=1 → frameIdx=dir*3+1', () => {
    // facing=right → dir=3 → frameIdx=3*3+1=10
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: true, stepFrame: 1 }
    expect(trackPartyFrameIdx(gs, 3)).toBe(10)
  })

  it('walking=true, walkFrames=3, stepFrame=2 → iStepFrameLeader=0 → frameIdx=dir*3+0', () => {
    // facing=right → dir=3 → frameIdx=9(同 stepFrame=0)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: true, stepFrame: 2 }
    expect(trackPartyFrameIdx(gs, 3)).toBe(9)
  })

  it('walking=true, walkFrames=3, stepFrame=3 → iStepFrameLeader=2 → frameIdx=dir*3+2', () => {
    // facing=right → dir=3 → frameIdx=3*3+2=11
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: true, stepFrame: 3 }
    expect(trackPartyFrameIdx(gs, 3)).toBe(11)
  })

  it('walking=true, walkFrames=4 → frameIdx=dir*4+stepFrame', () => {
    // facing=right → dir=3, stepFrame=2 → frameIdx=3*4+2=14
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
    gs.walkingFrame = { walking: true, stepFrame: 2 }
    expect(trackPartyFrameIdx(gs, 4)).toBe(14)

    // facing=down → dir=0, stepFrame=3 → frameIdx=0*4+3=3
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.walkingFrame = { walking: true, stepFrame: 3 }
    expect(trackPartyFrameIdx(gs2, 4)).toBe(3)
  })

  it('4 方向 facing 映射:down=0/left=1/up=2/right=3(站立帧验证)', () => {
    const facings: Array<['down' | 'left' | 'up' | 'right', number]> = [
      ['down', 0], ['left', 1], ['up', 2], ['right', 3],
    ]
    for (const [facing, dir] of facings) {
      const gs = createInitialGameState({ x: 0, y: 0, facing })
      gs.walkingFrame = { walking: false, stepFrame: 0 }
      expect(trackPartyFrameIdx(gs, 3)).toBe(dir * 3)
    }
  })
})

// ── P0.d follower 占位(sdlpal scene.c:692-707)───────────────────────────────
//
// sdlpal 偏移公式(M5 简版只做 partyMembers[1],occupying trail[1]):
//   dir = trail[1].wDirection
//   isWS = (dir == West || dir == South) → left / down
//   isWN = (dir == West || dir == North) → left / up
//   offsetX = isWS ? 16 : -16
//   offsetY = isWN ? 8 : -8
//
// partyMembers.length > 1 且 trail.length > 1 时才渲染 follower。
describe('P0.d follower 占位 + 偏移(sdlpal scene.c:692-707)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 追踪 presentFrame 内 drawSprite 调用,返回 id → {sprite, cx, cy} 映射。
   * 用 spy 拦截 drawSprite,通过 sprite 对象引用识别 party leader vs follower。
   * follower 在 ctx 中用与 leader 不同索引的 partyFrames 传入来追踪。
   */
  function trackFollowerDraw(
    gs: ReturnType<typeof createInitialGameState>,
    ctx: PresentContext,
  ): Array<{ spriteIdx: number; cx: number; cy: number }> {
    const calls: Array<{ spriteIdx: number; cx: number; cy: number }> = []
    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite, cx, cy) => {
        const idx = ctx.partyFrames.indexOf(sprite as SpriteImage)
        if (idx >= 0) calls.push({ spriteIdx: idx, cx, cy })
      },
    )
    const fb = createFramebuffer()
    presentFrame(fb, gs, ctx)
    spy.mockRestore()
    return calls
  }

  it('partyMembers=[0] 单人 → 不渲染 follower(只有 leader drawSprite)', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
    gs.partyMembers = [0]
    gs.trail = [
      { x: 284, y: 142, dir: 'right' },
      { x: 268, y: 134, dir: 'right' },
    ]
    // 构造 12 帧(4 dir × 3 frames)partyFrames
    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(20, 20),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    // 单人:只有 leader(1 次 drawSprite)
    expect(calls).toHaveLength(1)
  })

  it('partyMembers=[0, 1] 且 trail.length > 1 → 渲染 follower 在 trail[1] + 偏移', () => {
    // leader 在 (300, 150) facing=right,trail[1] dir=right
    // right(East): isWS = false → offsetX = -16; isWN = false → offsetY = -8
    // follower world = trail[1] + (-16, -8) = (268-16, 134-8) = (252, 126)
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
    gs.partyMembers = [0, 1]
    gs.trail = [
      { x: 284, y: 142, dir: 'right' },   // trail[0]
      { x: 268, y: 134, dir: 'right' },   // trail[1] → follower 用这个
    ]
    // new camera 语义 = sdlpal viewport = party - partyoffset(160, 112)
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // = (140, 38)

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(30, 30),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    // leader + follower = 2 drawSprite calls
    expect(calls).toHaveLength(2)

    // screen = world - camera(camera 已含 -partyoffset);drawSprite cy = screenY + 4
    //   (sdlpal scene.c:225-226 脚底净偏 +10-iLayer6 = +4,present 已对齐 116=112+4)。
    //   leader: 300-140=160, 150-38=112 → screen (160,112) → drawSprite cy=116
    //   follower world = (252, 126) → screen (112, 88) → drawSprite cy=92
    const leaderScreenX = 160
    const leaderDrawCy = 112 + 4
    const leaderCalls = calls.filter((c) => c.cx === leaderScreenX && c.cy === leaderDrawCy)
    const followerCalls = calls.filter((c) => c.cx !== leaderScreenX || c.cy !== leaderDrawCy)
    expect(leaderCalls).toHaveLength(1)
    expect(followerCalls).toHaveLength(1)
    expect(followerCalls[0]!.cx).toBe(112)
    expect(followerCalls[0]!.cy).toBe(88 + 4)
  })

  it('dir=left(West): isWS=true→offsetX=+16; isWN=true→offsetY=+8', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'left' })
    gs.partyMembers = [0, 1]
    gs.trail = [
      { x: 316, y: 158, dir: 'left' },
      { x: 332, y: 166, dir: 'left' },   // follower 用 trail[1]
    ]
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // sdlpal viewport = party - partyoffset

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(30, 30),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    expect(calls).toHaveLength(2)
    // dir=left: isWS=true→offsetX=16; isWN=true→offsetY=8
    // followerWorld = (332+16, 166+8) = (348, 174);camera=(140, 38)
    // screen = world - camera → (208, 136);drawSprite cy = 136 + 4(脚底净偏)
    const followerCalls = calls.filter((c) => c.cx !== 160)
    expect(followerCalls[0]!.cx).toBe(208)
    expect(followerCalls[0]!.cy).toBe(136 + 4)
  })

  it('dir=down(South): isWS=true→offsetX=+16; isWN=false→offsetY=-8', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'down' })
    gs.partyMembers = [0, 1]
    gs.trail = [
      { x: 316, y: 142, dir: 'down' },
      { x: 332, y: 134, dir: 'down' },
    ]
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // sdlpal viewport = party - partyoffset

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(30, 30),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    expect(calls).toHaveLength(2)
    // dir=down: isWS=true→offsetX=16; isWN=false→offsetY=-8
    // followerWorld = (332+16, 134-8) = (348, 126);camera=(140, 38)
    // screen = world - camera → (208, 88);drawSprite cy = 88 + 4(脚底净偏)
    const followerCalls = calls.filter((c) => c.cx !== 160)
    expect(followerCalls[0]!.cx).toBe(208)
    expect(followerCalls[0]!.cy).toBe(88 + 4)
  })

  it('dir=up(North): isWS=false→offsetX=-16; isWN=true→offsetY=+8', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'up' })
    gs.partyMembers = [0, 1]
    gs.trail = [
      { x: 284, y: 158, dir: 'up' },
      { x: 268, y: 166, dir: 'up' },
    ]
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // sdlpal viewport = party - partyoffset

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(30, 30),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    expect(calls).toHaveLength(2)
    // dir=up: isWS=false→offsetX=-16; isWN=true→offsetY=8
    // followerWorld = (268-16, 166+8) = (252, 174);camera=(140, 38)
    // screen = world - camera → (112, 136);drawSprite cy = 136 + 4(脚底净偏)
    const followerCalls = calls.filter((c) => c.cx !== 160)
    expect(followerCalls[0]!.cx).toBe(112)
    expect(followerCalls[0]!.cy).toBe(136 + 4)
  })

  it('partyMembers.length > 1 但 trail.length <= 1 → 不渲染 follower(避免 crash)', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
    gs.partyMembers = [0, 1]
    gs.trail = [{ x: 284, y: 142, dir: 'right' }]  // 只有 1 项,不够
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // sdlpal viewport = party - partyoffset

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(20, 20),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    // trail 不足,只画 leader
    expect(calls).toHaveLength(1)
  })

  it('partyMembers=[0, 1] 且 trail 为空 → 不渲染 follower', () => {
    const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
    gs.partyMembers = [0, 1]
    gs.trail = []
    gs.camera = { x: 300 - 160, y: 150 - 112 }  // sdlpal viewport = party - partyoffset

    const frames: SpriteImage[] = Array.from({ length: 12 }, (_, i) =>
      ({ width: 1, height: 1, indices: new Uint8Array([i + 1]), opaque: new Uint8Array([1]), anchorX: 0, anchorY: 0 }),
    )
    const ctx: PresentContext = {
      tilemap: flatMap(20, 20),
      tileImages: { get: () => undefined },
      partyFrames: frames,
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }
    const calls = trackFollowerDraw(gs, ctx)
    expect(calls).toHaveLength(1)
  })
})

describe('P0.b Y-sort + cover-tile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 追踪 drawSprite 调用顺序。
   * 用 spy 拦截 drawSprite,每次调用记录 fb + sprite 对象,
   * 返回 id 顺序列表。
   */
  function trackDrawOrder(cb: () => void): string[] {
    const order: string[] = []
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const npc2Sprite = makeSprite(4)

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite, _cx, _cy) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
        else if (sprite === npc2Sprite) order.push('npc-2')
      },
    )

    cb()
    spy.mockRestore()
    return { order, partySprite, npc1Sprite, npc2Sprite } as unknown as string[]
  }

  it('party.y > npc.y → party 在 NPC 之下方(屏幕),Y-sort 后 NPC 先绘 / party 后绘', () => {
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
      },
    )

    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 100, y: 200, facing: 'down' })  // party y=200(大 = 屏幕下方)
    gs.npcs = [{ id: 1, x: 100, y: 100, spriteNum: 1 }]                    // npc y=100(小 = 屏幕上方)

    const ctx: PresentContext = {
      tilemap: flatMap(10, 20),
      tileImages: { get: () => undefined },
      partyFrames: [partySprite],
      partyWalkFrames: 3,
      npcSprites: new Map([[1, npc1Sprite]]),
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // NPC(y=100+9=109)< party(y=200+10=210) → NPC 先,party 后
    expect(order.indexOf('npc-1')).toBeLessThan(order.indexOf('party'))
  })

  it('party.y < npc.y → NPC 在 party 之下方,Y-sort 后 party 先绘 / NPC 后绘', () => {
    const partySprite = makeSprite(5)
    const npc1Sprite = makeSprite(3)
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        if (sprite === partySprite) order.push('party')
        else if (sprite === npc1Sprite) order.push('npc-1')
      },
    )

    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'down' })   // party y=50(小)
    gs.npcs = [{ id: 1, x: 100, y: 200, spriteNum: 1 }]                    // npc y=200(大)

    const ctx: PresentContext = {
      tilemap: flatMap(10, 30),
      tileImages: { get: () => undefined },
      partyFrames: [partySprite],
      partyWalkFrames: 3,
      npcSprites: new Map([[1, npc1Sprite]]),
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // party(y=50+10=60)< npc(y=200+9=209) → party 先,npc 后
    expect(order.indexOf('party')).toBeLessThan(order.indexOf('npc-1'))
  })

  it('3 个 NPC 不同 y — Y-sort 正确(y 小先绘,y 大后绘)', () => {
    const sprites = new Map([
      [1, makeSprite(1)],
      [2, makeSprite(2)],
      [3, makeSprite(3)],
    ])
    const order: string[] = []

    const spy = vi.spyOn(drawSpriteModule, 'drawSprite').mockImplementation(
      (_fb, sprite) => {
        for (const [id, s] of sprites) {
          if (sprite === s) { order.push(`npc-${id}`); break }
        }
      },
    )

    const fb = createFramebuffer()
    // party 放很远,不干扰
    const gs = createInitialGameState({ x: 0, y: -9999, facing: 'down' })
    gs.npcs = [
      { id: 3, x: 0, y: 300, spriteNum: 3 },   // y=300(最大 → 最后画)
      { id: 1, x: 0, y: 100, spriteNum: 1 },   // y=100(最小 → 最先画)
      { id: 2, x: 0, y: 200, spriteNum: 2 },   // y=200(中间)
    ]

    const ctx: PresentContext = {
      tilemap: flatMap(10, 50),
      tileImages: { get: () => undefined },
      partyFrames: [makeSprite(99)],
      partyWalkFrames: 3,
      npcSprites: sprites,
    }

    presentFrame(fb, gs, ctx)
    spy.mockRestore()

    // npc-1(y=100+9=109)< npc-2(y=200+9=209)< npc-3(y=300+9=309)
    const i1 = order.indexOf('npc-1')
    const i2 = order.indexOf('npc-2')
    const i3 = order.indexOf('npc-3')
    expect(i1).toBeLessThan(i2)
    expect(i2).toBeLessThan(i3)
  })

  it('cover-tile:layer1 tile height>0 且满足条件 → tile 画在 fb 上(sprite 重叠)', () => {
    // 构造一个 layer-1 tile:
    //   cell(5, 5) 的 lower DWORD 里放 layer-1 tile height = 2,tileId = 1。
    //   sdlpal layer-1 DWORD: bits 16..23 = tile id 低 8 位,bits 24..27 = height,bits 28 = tile id bit 8
    //   tileId1 raw = ((d>>16)&0xff)|((d>>16)>>4 & 0x100) - 1
    //   我们要 tileId=1 → raw tileId+1=2 → hi byte = 2 → d bits 16..23 = 2
    //   iTileHeight=2 → d bits 24..27 = 2 → d bits 24..31 = 0x20
    //   full DWORD for lower: 0x0020_0200 (hi=0x00200200 → layer1 id raw = 2, h=2)
    //
    // party 在 (col*32, row*16) 相近位置,确保 sy 条件满足。
    // cover tile 条件: (dy + iTileHeight)*16 + dh*8 >= sy
    //   dy=5, iTileHeight=2, dh=0: (5+2)*16 + 0 = 112 >= sy
    //   sy = party.y + 10 → party.y <= 102 即可。
    // 让 party 在 x=5*32=160, y=80 → sy=90, (5+2)*16=112 >= 90 ✓

    // tile bitmap: 4×4 全 palette idx = 7
    const coverTileImg = {
      width: 4, height: 4,
      indices: new Uint8Array(16).fill(7),
      opaque: new Uint8Array(16).fill(1),
    }
    const tileImages = {
      get: (idx: number) => idx === 1 ? coverTileImg : undefined,
    }

    // Build tilemap: 10×10, cell(5,5).lower 编码 layer-1 tileId=1, height=2
    // layer-1 encoding: ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1 = tileId
    //   tileId=1 → raw = 2 → hi low byte = 2
    //   height=2 → hi bits 8..11 = 2 → hi = (2 << 8) | 2 = 0x0202
    //   full DWORD lower = hi << 16 = 0x02020000
    const L1_DWORD = 0x02020000   // layer-1: tileId raw=2 → id=1, height=2
    const cells = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (__, c) =>
        (r === 5 && c === 5) ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
      ),
    )
    const tilemap: Tilemap = { width: 10, height: 10, cells, tilesetImage: 'fake' }

    const fb = createFramebuffer()
    // party at x=160, y=80 → camera at same → party at screen center (160, 100)
    // sy = 80 + 10 = 90; condition: (5+2)*16 + 0*8 = 112 >= 90 ✓
    const gs = createInitialGameState({ x: 160, y: 80, facing: 'down' })
    // new camera 语义 = sdlpal viewport = party - partyoffset(160, 112)
    gs.camera = { x: 160 - 160, y: 80 - 112 }  // = (0, -32)
    const ctx: PresentContext = {
      tilemap,
      tileImages,
      partyFrames: [makeSprite(5)],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }

    presentFrame(fb, gs, ctx)

    // cover tile for party at cell(5, 5) h=0,offsetX/Y = -camera = (0, 32):
    //   screenX = 5*32 + 0 - 16 + 0 = 144
    //   screenY = 5*16 + 0 + 7 - 4 + 32 = 115
    const px = fb.indices[115 * 320 + 144]
    expect(px).toBe(7)
  })

  it('cover-tile blit_y 公式 = dy*16 + dh*8 + 7 - bitmap.height(sdlpal scene.c:358 相消化)', () => {
    // sdlpal PAL_AddSpriteToDraw 入数组 pos.y = dy*16 + dh*8 + 7 + l + iTileHeight*8 - vp.y,
    // iLayer = iTileHeight*8 + l;blit_y = pos.y - bitmap.height - iLayer →
    // iTileHeight*8 + l 项相消,净 blit_y = dy*16 + dh*8 + 7 - bitmap.height - vp.y。
    //
    // 验证策略:直接 spy addCoverTileEntries 输出(present.ts 内部走 entries.draw),
    // 比较抽 closure-captured Y 值 — 不去 fb 像素,因 sdlpal 真值 layer-1 也全画一遍
    // (cover tile 在 Y-sort 是"重画"位置上盖 sprite),fb 像素同时受全画 + cover-tile
    // 干扰难分。改用 collector pattern:替换 draw fn 收集 Y 入参。

    // 高 tile:48 px(屋顶/高柱子类),idx=9
    const coverTileImg = {
      width: 4, height: 48,
      indices: new Uint8Array(4 * 48).fill(9),
      opaque: new Uint8Array(4 * 48).fill(1),
    }
    const tileImages = {
      get: (idx: number) => idx === 1 ? coverTileImg : undefined,
    }

    // cell(2, 3).lower:layer-1 tileId=1, height=2 → hi = 0x0202 → DWORD 0x02020000
    const L1_DWORD = 0x02020000
    const cells = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (__, c) =>
        (r === 3 && c === 2) ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
      ),
    )
    const tilemap: Tilemap = { width: 10, height: 10, cells, tilesetImage: 'fake' }

    // sdlpal scene.c:480-491 真值:layer 0 + layer 1 全画 → 再 Y-sort sprites + cover tiles
    // 全画位置:h=0 tile 落在 (dx*32 - 16 + offsetX, dy*16 - 8 + offsetY) = (144, 92)
    // cover tile 重画位置(新公式):(dx*32 - 16 + offsetX, dy*16 + 7 - bitmap.height + offsetY) = (144, 59)
    //
    // 测视觉:cover tile 重画的 (144, 59..106) 范围内 fb 像素应为 idx=9,且独立于
    // 全画位置(144, 92..139)证明 cover tile 落点不同 — fb 在 (144, 65) 该像素应为 9,
    // 但 fb 在 (144, 60) 也应为 9(cover tile 重画起点 y=59)。
    //
    // 全画 alone 不会覆盖 (144, 60..91) 区域,cover-tile 重画后才填上 — 验证新 blit_y 真生效。
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 64, y: 48, facing: 'down' })
    // new camera 语义 = sdlpal viewport(屏幕左上 world 坐标)。
    // 测试本身只关心 cover tile blit_y 公式,camera 任意都可;
    // 为保持下方像素断言不变(旧用 offsetX=96 / offsetY=52),设 camera=(-96, -52)
    // 让新 offsetX=-camera.x=96, offsetY=-camera.y=52,与旧公式等价。
    gs.camera = { x: -96, y: -52 }
    const ctx: PresentContext = {
      tilemap,
      tileImages,
      partyFrames: [makeSprite(5)],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }

    presentFrame(fb, gs, ctx)

    // cover tile 重画起点 y=59 → (144, 60) 应为 idx=9。
    // 全画起点 y=92,(144, 60) 不在全画范围内,所以只有 cover tile 重画到这里 → 必为 9。
    expect(fb.indices[60 * 320 + 144]).toBe(9)
    // (144, 80) 也在 cover tile 重画范围 (59..106),全画范围 (92..139) 外 → 必为 9
    expect(fb.indices[80 * 320 + 144]).toBe(9)
    // (144, 58) 是 cover tile 重画 1 px 之上 + 全画 34 px 之上 → 不应为 9
    expect(fb.indices[58 * 320 + 144]).not.toBe(9)
  })

  it('cover-tile 不画超出范围的 tile(party 远离,height 条件不满足 → tile 不出现)', () => {
    // 同上 cell(5,5) layer-1 tile,但 party 在 y=500 → sy=510
    // condition: (5+2)*16=112 < 510 → tile 不被加入 entries → 不绘

    const coverTileImg = {
      width: 4, height: 4,
      indices: new Uint8Array(16).fill(7),
      opaque: new Uint8Array(16).fill(1),
    }
    const tileImages = {
      get: (idx: number) => idx === 1 ? coverTileImg : undefined,
    }

    const L1_DWORD = 0x02020000
    const cells = Array.from({ length: 40 }, (_, r) =>
      Array.from({ length: 10 }, (__, c) =>
        (r === 5 && c === 5) ? { lower: L1_DWORD, upper: 0 } : { lower: 0, upper: 0 },
      ),
    )
    const tilemap: Tilemap = { width: 10, height: 40, cells, tilesetImage: 'fake' }

    const fb = createFramebuffer()
    // party far away at y=500, camera at (160, 500)
    const gs = createInitialGameState({ x: 160, y: 500, facing: 'down' })
    gs.camera = { x: 160, y: 500 }
    const ctx: PresentContext = {
      tilemap,
      tileImages,
      partyFrames: [makeSprite(5)],
      partyWalkFrames: 3,
      npcSprites: new Map(),
    }

    presentFrame(fb, gs, ctx)

    // cover tile would be at screen x=5*32-16+(160-160)=144, y=5*16-8+(100-500)=-308 → off screen
    // Regardless, the height condition fails so it shouldn't be drawn.
    // If it were drawn off-screen, writePixel clips it. But the color 7 should NOT appear at (144,92)
    // because those screen coords are now something else (camera moved).
    // Just verify no palette-7 pixel was written anywhere (tile img fills with 7, which is unique here).
    const anyColor7 = Array.from(fb.indices).some((i) => i === 7)
    expect(anyColor7).toBe(false)
  })
})

// sdlpal text.c:1408-1426 PAL_DialogWaitForKey 等键时 palette[0xF9..0xFE] 每 100ms 左轮转一格 →
//   箭头(像素 idx 0xf9)色彩流动。这是"闪烁"的真值机制(非 show/hide)。
describe('applyDialogIconPaletteShift(dialog 箭头 palette 轮转)', () => {
  afterEach(() => vi.restoreAllMocks())

  function palette256(): Palette {
    return {
      colors: Array.from({ length: 256 }, (_, i) => [i, i, i] as [number, number, number]),
      cycles: [],
    }
  }

  it('非等键 phase(typing)→ 原样返回 base 同引用', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogBox = startDialogLine('A', { style: 'bottom' }) // phase = typing
    const base = palette256()
    expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
  })

  it('等键 phase + step=1(t=100ms)→ 0xF9-0xFE 左轮转 1 格,区间外不动', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100) // floor(100/100)%6 = 1
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogBox = startDialogLine('A', { style: 'bottom' })
    setWaitingEndKey(gs.dialogBox)
    const base = palette256()
    const out = applyDialogIconPaletteShift(gs, base)
    expect(out).not.toBe(base)
    // 左轮转 1:out[0xF9]=base[0xFA] … out[0xFD]=base[0xFE],out[0xFE]=base[0xF9](回绕)
    expect(out.colors[0xf9]).toEqual(base.colors[0xfa])
    expect(out.colors[0xfd]).toEqual(base.colors[0xfe])
    expect(out.colors[0xfe]).toEqual(base.colors[0xf9])
    // 区间外像素不变
    expect(out.colors[0xf8]).toEqual(base.colors[0xf8])
    expect(out.colors[0x42]).toEqual(base.colors[0x42])
  })

  it('等键 phase + step=0(整圈起点 t=600ms)→ 原样返回 base', () => {
    vi.spyOn(performance, 'now').mockReturnValue(600) // floor(600/100)%6 = 0
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dialogBox = startDialogLine('A', { style: 'bottom' })
    setWaitingEndKey(gs.dialogBox)
    const base = palette256()
    expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
  })
})
