import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { sceneMap, sceneSprite } from './__tests__/scene-render-fixtures.js'
import type { SpriteImage } from './draw-sprite.js'
import * as drawSpriteModule from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'
import { type PresentContext, presentFrame } from './present.js'
import { resetScreenWavePhase } from './screen-wave.js'

function sceneRoles(spriteNums: number[]): PlayerRoles {
  return {
    roles: spriteNums.map((spriteNum, id) => ({
      id,
      _name: `role${id}`,
      avatar: id,
      spriteNumInBattle: id,
      spriteNum,
      name: id,
      attackAll: 0,
      level: 1,
      maxHP: 100,
      maxMP: 30,
      hp: 100,
      mp: 30,
      attackStrength: 5,
      magicStrength: 5,
      defense: 5,
      dexterity: 5,
      fleeRate: 5,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      walkFrames: 3,
      attackSound: 0,
      weaponSound: 0,
      criticalSound: 0,
      magicSound: 0,
      deathSound: 0,
    })),
  }
}

function frameIndexSprites(count: number): SpriteImage[] {
  return Array.from({ length: count }, (_, i) => ({
    width: 1,
    height: 1,
    indices: Uint8Array.of(i + 1),
    opaque: Uint8Array.of(1),
    anchorX: 0,
    anchorY: 0,
  }))
}

describe('Party frame selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetScreenWavePhase()
  })
  describe('P0.c party frame 取 stepFrame(sdlpal scene.c:678-685)', () => {
    /**
     * 追踪 presentFrame 内 party drawSprite 的 frameIdx。
     * 帧带独立颜色，同时核实真实 drawSprite 入参与屏幕落点。
     * 记录实际落到哪张图。
     */
    function renderedPartyFrameIndex(
      gs: ReturnType<typeof createInitialGameState>,
      walkFrames: number,
      frameCount = walkFrames * 4,
    ): number {
      // 构造 walkFrames*4 帧,每帧颜色 = idx+1
      const frames = frameIndexSprites(frameCount)
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      const ctx: PresentContext = {
        tilemap: sceneMap(10, 10),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: walkFrames,
        npcSprites: new Map(),
      }
      presentFrame(fb, gs, ctx)
      const frame = spy.mock.calls.find(([, image]) => frames.includes(image))?.[1]
      expect(fb.indices[116 * 320 + 160]).toBe(frame?.indices[0])
      return frame ? frames.indexOf(frame) : -1
    }

    it('walking=false → 站立帧:frameIdx = dir * walkFrames (P0.0 既有)', () => {
      // facing=right → dir=3, walkFrames=3 → frameIdx=9
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: false, stepFrame: 0 }
      expect(renderedPartyFrameIndex(gs, 3)).toBe(9)

      // facing=down → dir=0 → frameIdx=0
      const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs2.walkingFrame = { walking: false, stepFrame: 2 }
      expect(renderedPartyFrameIndex(gs2, 3)).toBe(0)
    })

    it('walking=true, walkFrames=3, stepFrame=0 → iStepFrameLeader=0 → frameIdx=dir*3+0', () => {
      // facing=right → dir=3, leader=0 → frameIdx=9
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: true, stepFrame: 0 }
      expect(renderedPartyFrameIndex(gs, 3)).toBe(9)
    })

    it('walking=true, walkFrames=3, stepFrame=1 → iStepFrameLeader=1 → frameIdx=dir*3+1', () => {
      // facing=right → dir=3 → frameIdx=3*3+1=10
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: true, stepFrame: 1 }
      expect(renderedPartyFrameIndex(gs, 3)).toBe(10)
    })

    it('walking=true, walkFrames=3, stepFrame=2 → iStepFrameLeader=0 → frameIdx=dir*3+0', () => {
      // facing=right → dir=3 → frameIdx=9(同 stepFrame=0)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: true, stepFrame: 2 }
      expect(renderedPartyFrameIndex(gs, 3)).toBe(9)
    })

    it('walking=true, walkFrames=3, stepFrame=3 → iStepFrameLeader=2 → frameIdx=dir*3+2', () => {
      // facing=right → dir=3 → frameIdx=3*3+2=11
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: true, stepFrame: 3 }
      expect(renderedPartyFrameIndex(gs, 3)).toBe(11)
    })

    it('walking=true, walkFrames=4 → frameIdx=dir*4+stepFrame', () => {
      // facing=right → dir=3, stepFrame=2 → frameIdx=3*4+2=14
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.walkingFrame = { walking: true, stepFrame: 2 }
      expect(renderedPartyFrameIndex(gs, 4)).toBe(14)

      // facing=down → dir=0, stepFrame=3 → frameIdx=0*4+3=3
      const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs2.walkingFrame = { walking: true, stepFrame: 3 }
      expect(renderedPartyFrameIndex(gs2, 4)).toBe(3)
    })

    it('M2:队首 walkFrames 读 PlayerRolesRuntime.rgwWalkFrames,不再固定 ctx.partyWalkFrames=3', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'right' })
      gs.partyMembers = [0]
      gs.walkingFrame = { walking: true, stepFrame: 2 }
      gs.PlayerRolesRuntime.rgwWalkFrames[0] = 4
      // ctx 仍给旧 fallback=3;真正应按 runtime 4 帧:dir=3,step=2 → 14
      expect(renderedPartyFrameIndex(gs, 3, 16)).toBe(14)
    })

    it('4 方向 facing 映射:down=0/left=1/up=2/right=3(站立帧验证)', () => {
      const facings: Array<['down' | 'left' | 'up' | 'right', number]> = [
        ['down', 0],
        ['left', 1],
        ['up', 2],
        ['right', 3],
      ]
      for (const [facing, dir] of facings) {
        const gs = createInitialGameState({ x: 0, y: 0, facing })
        gs.walkingFrame = { walking: false, stepFrame: 0 }
        expect(renderedPartyFrameIndex(gs, 3)).toBe(dir * 3)
      }
    })
  })

  describe('P0.d follower 占位 + 偏移(sdlpal scene.c:692-707)', () => {
    /**
     * 追踪 presentFrame 内 drawSprite 调用,返回 id → {sprite, cx, cy} 映射。
     * 旁观真实 drawSprite 调用，用对象身份识别队首和跟随者，不替换像素绘制。
     * follower 在 ctx 中用与 leader 不同索引的 partyFrames 传入来追踪。
     */
    function observePartyDraws(
      gs: ReturnType<typeof createInitialGameState>,
      ctx: PresentContext,
    ): Array<{ spriteIdx: number; cx: number; cy: number }> {
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      presentFrame(fb, gs, ctx)
      return spy.mock.calls.flatMap(([, image, cx, cy]) => {
        const spriteIdx = ctx.partyFrames.indexOf(image)
        return spriteIdx < 0 ? [] : [{ spriteIdx, cx, cy }]
      })
    }

    function observeSpriteDraws(
      gs: ReturnType<typeof createInitialGameState>,
      ctx: PresentContext,
    ): Array<{ sprite: SpriteImage; cx: number; cy: number }> {
      const spy = vi.spyOn(drawSpriteModule, 'drawSprite')
      const fb = createFramebuffer()
      presentFrame(fb, gs, ctx)
      return spy.mock.calls.map(([, sprite, cx, cy]) => ({ sprite, cx, cy }))
    }

    it('partyMembers=[0] 单人 → 不渲染 follower(只有 leader drawSprite)', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [0]
      gs.trail = [
        { x: 284, y: 142, dir: 'right' },
        { x: 268, y: 134, dir: 'right' },
      ]
      // 构造 12 帧(4 dir × 3 frames)partyFrames
      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(20, 20),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
      // 单人:只有 leader(1 次 drawSprite)
      expect(calls).toHaveLength(1)
    })

    it('队首/跟随者按各自 rgwSpriteNum 渲染,不回退 role0 partyFrames', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [1, 2]
      gs.trail = [
        { x: 284, y: 142, dir: 'right' },
        { x: 268, y: 134, dir: 'right' },
        { x: 252, y: 126, dir: 'right' },
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 }
      gs.PlayerRolesRuntime.rgwSpriteNum[1] = 3
      gs.PlayerRolesRuntime.rgwSpriteNum[2] = 7

      const role0Fallback = sceneSprite(2)
      const leaderSprite = sceneSprite(30)
      const followerSprite = sceneSprite(70)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: Array.from({ length: 12 }, () => role0Fallback),
        partyWalkFrames: 3,
        npcSprites: new Map(),
        npcSpriteFrames: new Map([
          [3, Array.from({ length: 12 }, () => leaderSprite)],
          [7, Array.from({ length: 12 }, () => followerSprite)],
        ]),
        playerRoles: sceneRoles([2, 3, 7]),
      }

      const calls = observeSpriteDraws(gs, ctx)
      expect(calls.map((c) => c.sprite)).toEqual(
        expect.arrayContaining([leaderSprite, followerSprite]),
      )
      expect(calls.some((c) => c.sprite === role0Fallback)).toBe(false)
    })

    it('M2:跟随队员按自己的 runtime walkFrames 取帧', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: true, stepFrame: 2 }
      gs.trail = [
        { x: 284, y: 142, dir: 'right' },
        { x: 268, y: 134, dir: 'right' },
        { x: 252, y: 126, dir: 'right' },
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 }
      gs.PlayerRolesRuntime.rgwSpriteNum[1] = 7
      gs.PlayerRolesRuntime.rgwWalkFrames[0] = 3
      gs.PlayerRolesRuntime.rgwWalkFrames[1] = 4

      const role0Fallback = sceneSprite(2)
      const followerFrames = Array.from({ length: 16 }, (_, i) => sceneSprite(100 + i))
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: Array.from({ length: 12 }, () => role0Fallback),
        partyWalkFrames: 3,
        npcSprites: new Map(),
        npcSpriteFrames: new Map([[7, followerFrames]]),
        playerRoles: sceneRoles([2, 7]),
      }

      const calls = observeSpriteDraws(gs, ctx)
      // follower frameDir = trail[2].right=3, walkFrames=4, stepFrame=2 → 14
      expect(calls.some((c) => c.sprite === followerFrames[14])).toBe(true)
    })

    it('0x15 给跟随者设 partyScriptedFrame(静止演出)→ 跟随者按脚本帧转身,不用 trail 朝向(刘兄「等一下」bug)', () => {
      // sdlpal 0x15 写 rgParty[operand[2]].wFrame(script.c:736),operand[2] 可指跟随者;
      //   静止演出期间 PAL_GameUpdate 不调 PAL_UpdatePartyGestures(play.c:24-241)→ 该 wFrame
      //   不被 rgTrail 覆盖,跟随者按脚本朝向渲染。我们的渲染须对齐:静止时跟随者优先用
      //   partyScriptedFrame[m](与队长的 scripted-frame 优先级相同),否则李逍遥(跟随者)保持走来方向不转身。
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'down' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: false, stepFrame: 0 }
      gs.trail = [
        { x: 284, y: 142, dir: 'right' },
        { x: 268, y: 134, dir: 'right' },
        { x: 252, y: 126, dir: 'right' }, // trail[2].dir=right → 若误用 trail 朝向 = dir3*wf3 = 帧 9
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 }
      gs.PlayerRolesRuntime.rgwSpriteNum[1] = 7
      gs.PlayerRolesRuntime.rgwWalkFrames[1] = 3
      // sdlpal 0x15 [2,0,1]:rgParty[1].wFrame = 方向2*3 + 0 = 6(跟随者面向 dir2,与 trail 的 right 不同)
      gs.partyScriptedFrame[1] = 6

      const role0Fallback = sceneSprite(2)
      const followerFrames = Array.from({ length: 12 }, (_, i) => sceneSprite(100 + i))
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: Array.from({ length: 12 }, () => role0Fallback),
        partyWalkFrames: 3,
        npcSprites: new Map(),
        npcSpriteFrames: new Map([[7, followerFrames]]),
        playerRoles: sceneRoles([2, 7]),
      }

      const calls = observeSpriteDraws(gs, ctx)
      expect(calls.some((c) => c.sprite === followerFrames[6])).toBe(true) // 脚本帧生效
      expect(calls.some((c) => c.sprite === followerFrames[9])).toBe(false) // 不是 trail 朝向 right
    })

    it('已知队员 spriteNum 但资源未加载时,不把 follower 画成 role0', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [1, 2]
      gs.trail = [
        { x: 284, y: 142, dir: 'right' },
        { x: 268, y: 134, dir: 'right' },
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 }
      gs.PlayerRolesRuntime.rgwSpriteNum[1] = 3
      gs.PlayerRolesRuntime.rgwSpriteNum[2] = 7

      const role0Fallback = sceneSprite(2)
      const leaderSprite = sceneSprite(30)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: Array.from({ length: 12 }, () => role0Fallback),
        partyWalkFrames: 3,
        npcSprites: new Map(),
        npcSpriteFrames: new Map([[3, Array.from({ length: 12 }, () => leaderSprite)]]),
        playerRoles: sceneRoles([2, 3, 7]),
      }

      const calls = observeSpriteDraws(gs, ctx)
      expect(calls.map((c) => c.sprite)).toEqual([leaderSprite])
      expect(calls.some((c) => c.sprite === role0Fallback)).toBe(false)
    })

    it('walking 时渲染 follower 在 trail[1] + 偏移(scene.c:692-707 扇形布局)', () => {
      // leader 在 (300, 150) facing=right,trail[1] dir=right;走路态(fWalking)才用方向偏移公式。
      // right(East): isWS = false → offsetX = -16; isWN = false → offsetY = -8
      // follower world = trail[1] + (-16, -8) = (268-16, 134-8) = (252, 126)
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: true, stepFrame: 0 } // 偏移公式属 fWalking 分支
      gs.trail = [
        { x: 284, y: 142, dir: 'right' }, // trail[0]
        { x: 268, y: 134, dir: 'right' }, // trail[1] → follower 用这个
      ]
      // new camera 语义 = sdlpal viewport = party - partyoffset(160, 112)
      gs.camera = { x: 300 - 160, y: 150 - 112 } // = (140, 38)

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
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

    it('dir=left(West) walking: isWS=true→offsetX=+16; isWN=true→offsetY=+8', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'left' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: true, stepFrame: 0 } // 偏移公式属 fWalking 分支
      gs.trail = [
        { x: 316, y: 158, dir: 'left' },
        { x: 332, y: 166, dir: 'left' }, // follower 用 trail[1]
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 } // sdlpal viewport = party - partyoffset

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
      expect(calls).toHaveLength(2)
      // dir=left: isWS=true→offsetX=16; isWN=true→offsetY=8
      // followerWorld = (332+16, 166+8) = (348, 174);camera=(140, 38)
      // screen = world - camera → (208, 136);drawSprite cy = 136 + 4(脚底净偏)
      const followerCalls = calls.filter((c) => c.cx !== 160)
      expect(followerCalls[0]!.cx).toBe(208)
      expect(followerCalls[0]!.cy).toBe(136 + 4)
    })

    it('dir=down(South) walking: isWS=true→offsetX=+16; isWN=false→offsetY=-8', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'down' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: true, stepFrame: 0 } // 偏移公式属 fWalking 分支
      gs.trail = [
        { x: 316, y: 142, dir: 'down' },
        { x: 332, y: 134, dir: 'down' },
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 } // sdlpal viewport = party - partyoffset

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
      expect(calls).toHaveLength(2)
      // dir=down: isWS=true→offsetX=16; isWN=false→offsetY=-8
      // followerWorld = (332+16, 134-8) = (348, 126);camera=(140, 38)
      // screen = world - camera → (208, 88);drawSprite cy = 88 + 4(脚底净偏)
      const followerCalls = calls.filter((c) => c.cx !== 160)
      expect(followerCalls[0]!.cx).toBe(208)
      expect(followerCalls[0]!.cy).toBe(88 + 4)
    })

    it('dir=up(North) walking: isWS=false→offsetX=-16; isWN=true→offsetY=+8', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'up' })
      gs.partyMembers = [0, 1]
      gs.walkingFrame = { walking: true, stepFrame: 0 } // 偏移公式属 fWalking 分支
      gs.trail = [
        { x: 284, y: 158, dir: 'up' },
        { x: 268, y: 166, dir: 'up' },
      ]
      gs.camera = { x: 300 - 160, y: 150 - 112 } // sdlpal viewport = party - partyoffset

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(30, 30),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
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
      gs.trail = [{ x: 284, y: 142, dir: 'right' }] // 只有 1 项,不够
      gs.camera = { x: 300 - 160, y: 150 - 112 } // sdlpal viewport = party - partyoffset

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(20, 20),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
      // trail 不足,只画 leader
      expect(calls).toHaveLength(1)
    })

    it('partyMembers=[0, 1] 且 trail 为空 → 不渲染 follower', () => {
      const gs = createInitialGameState({ x: 300, y: 150, facing: 'right' })
      gs.partyMembers = [0, 1]
      gs.trail = []
      gs.camera = { x: 300 - 160, y: 150 - 112 } // sdlpal viewport = party - partyoffset

      const frames = frameIndexSprites(12)
      const ctx: PresentContext = {
        tilemap: sceneMap(20, 20),
        tileImages: { get: () => undefined },
        partyFrames: frames,
        partyWalkFrames: 3,
        npcSprites: new Map(),
      }
      const calls = observePartyDraws(gs, ctx)
      expect(calls).toHaveLength(1)
    })
  })
})
