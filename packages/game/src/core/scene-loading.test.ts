import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SceneAssets } from '../assets/loader.js'
import { SceneAssetsCache } from '../assets/loader.js'
import { createCommandBus } from './command-bus.js'
import {
  OP_CENTER_CAMERA_ON_PARTY,
  OP_PLAY_MUSIC,
  OP_SET_CAMERA,
  OP_SET_PARTY_DIRECTION,
  OP_SET_PARTY_POS,
  OP_SET_SCENE_OBJECT_STATE,
  setGlobalEvents,
} from './event-system.js'
import { createInitialGameState, setSpriteFrameCountProvider } from './game-state.js'
import { makeFlatMap, makeSceneAssets, snap } from './scene.test-fixtures.js'
import { loadScene, setCurrentMapNum, setSceneContext, tickSceneSystem } from './scene-system.js'

afterEach(() => {
  setGlobalEvents([])
  setSpriteFrameCountProvider(null)
  setSceneContext({ tilemap: makeFlatMap(0, 0), eventCommands: [], labelMap: {} })
  setCurrentMapNum(0)
  vi.restoreAllMocks()
})

/**
 * P0.e 测试用:构建含 wScriptOnEnter 入口的 SceneAssets。
 * enterCmds 会加 onEnterLabel='L_enter',被 loadScene 触发。
 *
 * P2#5:loadScene 经 resolveScriptLabel(全局 _globalLabelMap)解 onEnterLabel,
 * 故在此把 commands 注册为全局数组(L_enter → 全局 index 0),scene labelMap 已不参与解析。
 */
function makeFakeAssetsWithEnterScript(sceneId: number, enterCmds: Command[]): SceneAssets {
  const commands: Command[] = [
    ...enterCmds.map((c, i) => ({ ...c, label: i === 0 ? 'L_enter' : undefined })),
    { op: 'end' as const },
  ]
  const labelMap: Record<string, number> = { L_enter: 0 }
  setGlobalEvents(commands) // P2#5:onEnterLabel 走全局 labelMap
  return makeSceneAssets(sceneId, [], commands, labelMap, 'L_enter')
}

describe('loadScene × nSpriteFramesAuto 回填(sdlpal res.c:295-298,血池冒泡/血柱动画根因)', () => {
  it('装载时按精灵总帧数回填 nSpriteFramesAuto;无 sprite(spriteNum=0)不回填', async () => {
    // bootstrap 注入的 provider 等价物:spriteNum → 已装帧数
    setSpriteFrameCountProvider((spriteNum) =>
      new Map([
        [272, 24],
        [11, 11],
      ]).get(spriteNum),
    )
    try {
      const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
      const cache = new SceneAssetsCache(async (id: number) =>
        makeSceneAssets(id, [
          {
            id: 0,
            x: 0,
            y: 0,
            spriteNum: 272,
            triggerMode: 0,
            nSpriteFrames: 0,
            currentFrameNum: 0,
          },
          {
            id: 1,
            x: 0,
            y: 0,
            spriteNum: 11,
            triggerMode: 0,
            nSpriteFrames: 0,
            currentFrameNum: 0,
          },
          { id: 2, x: 0, y: 0, spriteNum: 0, triggerMode: 0, nSpriteFrames: 0, currentFrameNum: 0 },
        ]),
      )
      await loadScene({ gs, sceneId: 7, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(24)
      expect(gs.npcs[1]!.nSpriteFramesAuto).toBe(11)
      expect(gs.npcs[2]!.nSpriteFramesAuto ?? 0).toBe(0)
    } finally {
      setSpriteFrameCountProvider(null)
    }
  })

  it('重复装载覆盖旧值(C 每次 kLoadScene 重新回填)', async () => {
    setSpriteFrameCountProvider(() => 24)
    try {
      const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
      const cache = new SceneAssetsCache(async (id: number) =>
        makeSceneAssets(id, [
          {
            id: 0,
            x: 0,
            y: 0,
            spriteNum: 272,
            triggerMode: 0,
            nSpriteFrames: 0,
            currentFrameNum: 0,
          },
        ]),
      )
      await loadScene({ gs, sceneId: 7, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(24)
      setSpriteFrameCountProvider(() => 6) // 换精灵后帧数变(0x17 setObjectSprite 场景)
      await loadScene({ gs, sceneId: 8, assets: cache })
      expect(gs.npcs[0]!.nSpriteFramesAuto).toBe(6)
    } finally {
      setSpriteFrameCountProvider(null)
    }
  })
})

describe('loadScene(M3.5 T9 / D33)', () => {
  it('切到新 scene → gs.npcs 由 eventObjects 重置;party 不传则不动', async () => {
    const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
    // 旧 npcs(模拟之前 scene 的残留)
    gs.npcs = [{ id: 99, x: 0, y: 0, spriteNum: 1 }]

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [
        // System A:npcFromEventObject 1:1 透传 eo.x/y
        { id: 0, x: 320, y: 160, spriteNum: 78, triggerMode: 0, triggerLabel: 'L_A' },
        { id: 1, x: 64, y: 32, spriteNum: 12, triggerMode: 0 },
      ]),
    )
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 7, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(7)
    expect(gs.npcs).toHaveLength(2)
    expect(gs.npcs[0]).toMatchObject({ id: 0, x: 320, y: 160, spriteNum: 78, triggerLabel: 'L_A' })
    expect(gs.npcs[1]).toMatchObject({ id: 1, x: 64, y: 32, spriteNum: 12 })
    // partyStart 未传 → party 不动
    expect(gs.party).toEqual({ x: 5 * 32, y: 5 * 16, facing: 'down' })
  })

  it('有 allEventObjects 时按 wNumScene 切全局引用,重进 scene 保留 sState/位置/vanishTime', async () => {
    const gs = createInitialGameState({ x: 5 * 32, y: 5 * 16, facing: 'down' })
    gs.allEventObjects = [
      { id: 0, x: 0, y: 0, spriteNum: 0, sState: 1 },
      { id: 1, x: 320, y: 160, spriteNum: 78, triggerMode: 5, sState: -1, sVanishTime: 123 },
      { id: 2, x: 64, y: 32, spriteNum: 12, triggerMode: 0, sState: 2 },
    ]
    // core loadScene 的 sceneId 是资源 dump 下标(0-based);sceneId=1 → wNumScene=2 → range key 1。
    gs.sceneEventRanges = { 1: [1, 3] }
    const cache = new SceneAssetsCache(async (id) =>
      makeSceneAssets(id, [
        { id: 1, x: 999, y: 999, spriteNum: 78, triggerMode: 5, sState: 1, vanishTime: 0 },
        { id: 2, x: 888, y: 888, spriteNum: 12, triggerMode: 0, sState: 1, vanishTime: 0 },
      ]),
    )

    await loadScene({ gs, sceneId: 1, assets: cache })

    expect(gs.wNumScene).toBe(2)
    expect(gs.npcs).toEqual([gs.allEventObjects[1], gs.allEventObjects[2]])
    expect(gs.npcs[0]).toMatchObject({ id: 1, x: 320, y: 160, sState: -1, sVanishTime: 123 })
    gs.npcs[0]!.sState = 0
    expect(gs.allEventObjects[1]?.sState).toBe(0)
  })

  it('传 partyStart → party 位置 / facing 重写;camera 跟到 party', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { x: 20 * 16, y: 30 * 8, facing: 'up' },
    })

    expect(gs.party).toEqual({ x: 20 * 16, y: 30 * 8, facing: 'up' })
    // camera = viewport = party - partyoffset(160, 112)
    expect(gs.camera).toEqual({ x: 20 * 16 - 160, y: 30 * 8 - 112 })
  })

  it('partyStart 不传 facing → 沿用当前 facing(只挪坐标)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'right' })
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({
      gs,
      sceneId: 2,
      assets: cache,
      partyStart: { x: 10 * 16, y: 15 * 8 },
    })

    expect(gs.party.x).toBe(10 * 16)
    expect(gs.party.y).toBe(15 * 8)
    expect(gs.party.facing).toBe('right')
  })

  // C6(gameOverActive 重构):死亡读档/场景重载是死亡演出的退出点。loadScene 必须把两个死亡标记都清掉,
  //   否则残留的 deathHoldActive(纯 hold)会让 present 永久保持上一帧、冻住新场景渲染。
  it('loadScene 清 gameOverActive + deathHoldActive(死亡演出退出 → 新场景恢复正常渲染)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.gameOverActive = true
    gs.deathHoldActive = true
    const cache = new SceneAssetsCache(async (id) => makeSceneAssets(id))

    await loadScene({ gs, sceneId: 3, assets: cache })

    expect(gs.gameOverActive).toBe(false)
    expect(gs.deathHoldActive).toBe(false)
  })

  it('SceneAssetsCache lazy hit:第二次切回同 scene,fetcher 不再调', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const fetcher = vi.fn(async (id: number) => makeSceneAssets(id))
    const cache = new SceneAssetsCache(fetcher)

    await loadScene({ gs, sceneId: 1, assets: cache })
    await loadScene({ gs, sceneId: 2, assets: cache })
    await loadScene({ gs, sceneId: 1, assets: cache })

    expect(fetcher).toHaveBeenCalledTimes(2) // 1 和 2 各 fetch 一次,第二次 1 cache hit
  })
})

// ── P2#5: trigger 解析走单一全局数组(原 P3.T1 per-scene gating 已废)──────────
//
// 原 P3.T1 测的是"loadScene 换入 per-scene labelMap,只有当前 scene 的 label 才能解析"
// 的 gating 行为。P2#5 故意**移除**该 gating:trigger 现统一经 _globalLabelMap 解析,
// **与当前加载哪个 scene 无关**(这正是 P2#5 目的 — 支持跨场景 trigger,如李大娘 L_560)。
//
// 下面两测改为验证新的全局解析语义:
//  1. trigger 经 setGlobalEvents 注册的全局 labelMap 解析,loadScene 加载的 scene 不影响。
//  2. 全局注册一次后,任意 scene 下同一 triggerLabel 都能解析(跨场景 trigger,反 gating)。
describe('P2#5 trigger 经全局 labelMap 解析(原 P3.T1)', () => {
  it('contact NPC triggerLabel 经全局 labelMap 解析 → 切 event(loadScene 用 _ctx singleton)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const globalCommands = [
      { op: 'showDialog' as const, messageIndex: 0, text: '草妖', label: 'L_41179' },
      { op: 'end' as const },
    ]
    // P2#5:trigger 走全局数组 — 注册全局即可解析(loadScene 的 sceneAssets labelMap 不再参与)。
    setGlobalEvents(globalCommands)

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [], globalCommands, { L_41179: 0 }),
    )
    const cache = new SceneAssetsCache(fetcher)
    await loadScene({ gs, sceneId: 15, assets: cache })

    // 装一个 contact NPC,triggerLabel 指向全局 label
    gs.npcs = [
      { id: 7, x: 5 * 16, y: 5 * 8, spriteNum: 468, triggerLabel: 'L_41179', triggerMode: 5 },
    ]
    const bus = createCommandBus()

    // tickSceneSystem 用 _ctx(loadScene 内 setSceneContext 写入的 singleton)
    tickSceneSystem(gs, snap(), bus)

    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(0) // 全局 ip
    // P2#5:生产 cursor 不内嵌 labelMap → 默认读全局数组。
    expect(gs.eventCursor?.labelMap).toBeUndefined()
  })

  it('全局 label 跨 scene 解析:任意 scene 下同一 triggerLabel 都能切 event(反 per-scene gating)', async () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    // P2#5:单一全局数组。L_scene2 落在 index 1(L_scene1 在 0)。
    const globalCommands = [
      { op: 'end' as const, label: 'L_scene1' },
      { op: 'end' as const, label: 'L_scene2' },
    ]
    setGlobalEvents(globalCommands)

    const fetcher = vi.fn(async (id: number) =>
      makeSceneAssets(id, [], globalCommands, { L_scene1: 0, L_scene2: 1 }),
    )
    const cache = new SceneAssetsCache(fetcher)

    // 加载 scene 1:旧模型下 L_scene2 不在 scene1 labelMap → 不触发。
    // 新模型:L_scene2 在全局 labelMap → 不论加载哪个 scene 都能触发(跨场景 trigger)。
    await loadScene({ gs, sceneId: 1, assets: cache })
    gs.npcs = [
      { id: 1, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 },
    ]
    tickSceneSystem(gs, snap(), createCommandBus())
    expect(gs.mode).toBe('event') // P2#5:全局解析 → 切 event(原 gating 下是 explore)
    expect(gs.eventCursor?.ip).toBe(1) // L_scene2 全局 ip

    // 切到 scene 2 后同样能解析(全局,不分 scene)。
    const gs2 = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    await loadScene({ gs: gs2, sceneId: 2, assets: cache })
    gs2.npcs = [
      { id: 2, x: 5 * 16, y: 5 * 8, spriteNum: 1, triggerLabel: 'L_scene2', triggerMode: 5 },
    ]
    tickSceneSystem(gs2, snap(), createCommandBus())
    expect(gs2.mode).toBe('event')
    expect(gs2.eventCursor?.ip).toBe(1)
  })
})

// ── P0.e: wScriptOnEnter 真跑 ─────────────────────────────────────────────────
//
// sdlpal SCENE struct(global.h:115-121):wScriptOnEnter → 进场景即跑此段脚本。
// 6 具名 opcode 真编号(grep reference/sdlpal/script.c 得到):
//   OP_SET_PARTY_POS        = 0x0046 (70)  — Set the party position on the map
//   OP_SET_PARTY_DIRECTION  = 0x0015 (21)  — Set the direction and gesture for party member
//   OP_SET_CAMERA           = 0x007F (127) — Move the viewport(setCamera / centerCameraOnParty)
//   OP_CENTER_CAMERA_ON_PARTY = 0x007F     — 同 opcode,op[0]=0,op[1]=0 变体
//   OP_PLAY_MUSIC           = 0x0043 (67)  — Set background music
//   OP_SET_SCENE_OBJECT_STATE = 0x0049 (73)— Set state of current event object
describe('P0.e wScriptOnEnter 真跑', () => {
  it('loadScene 不传 partyStart → 跑 wScriptOnEnter,setPartyPos 把 party 放到指定位', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // setPartyPos col=6, row=4, h=0 → x=192, y=64
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(6 * 32) // 192
    expect(gs.party.y).toBe(4 * 16) // 64
    // camera = viewport = party - partyoffset(160, 112)
    expect(gs.camera.x).toBe(192 - 160)
    expect(gs.camera.y).toBe(64 - 112)
  })

  it('setPartyPos 坐标: col=41, row=18, h=0 → x=1312, y=288 (scene 1 真实值)', async () => {
    // scene 1 wScriptOnEnter: opcode 70 operands=[41, 18, 0]
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(1, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [41, 18, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 1, assets: cache })
    expect(gs.party.x).toBe(41 * 32) // 1312
    expect(gs.party.y).toBe(18 * 16) // 288
  })

  it('setPartyPos h=1 → 加 16/8 半 tile 偏移', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [2, 3, 1] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // x = 2*32 + 1*16 = 80; y = 3*16 + 1*8 = 56
    expect(gs.party.x).toBe(80)
    expect(gs.party.y).toBe(56)
  })

  it('setPartyDirection opcode → gs.party.facing 转换(dir=2→up)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [2, 0, 0] }, // kDirNorth=2 → up
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.facing).toBe('up')
  })

  it('setPartyDirection 4 方向映射: 0=down, 1=left, 2=up, 3=right', async () => {
    const mapping: [number, 'down' | 'left' | 'up' | 'right'][] = [
      [0, 'down'],
      [1, 'left'],
      [2, 'up'],
      [3, 'right'],
    ]
    for (const [dir, expected] of mapping) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      const assets = makeFakeAssetsWithEnterScript(5, [
        { op: 'raw', opcode: OP_SET_PARTY_DIRECTION, operands: [dir, 0, 0] },
      ])
      const cache = new SceneAssetsCache(async () => assets)
      await loadScene({ gs, sceneId: 5, assets: cache })
      expect(gs.party.facing).toBe(expected)
    }
  })

  it('loadScene 传显式 partyStart → override enter script(dev panel manual)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_PLAY_MUSIC, operands: [31, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({
      gs,
      sceneId: 5,
      assets: cache,
      partyStart: { x: 500, y: 250, facing: 'left' },
    })
    // enter script先执行，显式partyStart最后覆盖其位置。
    expect(gs.party.x).toBe(500)
    expect(gs.party.y).toBe(250)
    expect(gs.party.facing).toBe('left')
    expect(gs.wNumMusic).toBe(31)
  })

  it('未 dump wScriptOnEnter / 空 onEnterLabel → party 留在原坐标(不报错)', async () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'right' })
    // 没有 onEnterLabel 的 scene
    const assets = makeSceneAssets(5)
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(100)
    expect(gs.party.y).toBe(100)
    expect(gs.party.facing).toBe('right')
  })

  it('onEnterLabel 在 labelMap 中找不到 → party 留原位(不报错)', async () => {
    const gs = createInitialGameState({ x: 200, y: 150, facing: 'up' })
    // labelMap 里没有 L_enter
    const assets = makeSceneAssets(5, [], [], {}, 'L_enter_MISSING')
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.x).toBe(200)
    expect(gs.party.y).toBe(150)
  })

  it('setCamera opcode 真生效 → camera 跟 party', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_SET_CAMERA, operands: [9, 5, 0xffff] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // 绝对镜头指向(9,5)，不同于party(6,4)；跳过该opcode不能假通过。
    expect(gs.camera).toEqual({ x: 128, y: -32 })
    expect(gs.party).toMatchObject({ x: 192, y: 64 })
  })

  it('centerCameraOnParty opcode(0,0 变体)→ camera = party - partyoffset', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0] },
      { op: 'raw', opcode: OP_SET_CAMERA, operands: [9, 5, 0xffff] },
      { op: 'raw', opcode: OP_CENTER_CAMERA_ON_PARTY, operands: [0, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.camera.x).toBe(192 - 160)
    expect(gs.camera.y).toBe(64 - 112)
  })

  it('playMusic opcode 写 gs.wNumMusic(shell audio 轮询播放)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_PLAY_MUSIC, operands: [31, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.wNumMusic).toBe(31)
  })

  it('setSceneObjectState 缺失目标时告警并跳过，场景仍完成装载', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'raw', opcode: OP_SET_SCENE_OBJECT_STATE, operands: [1, 0, 0] },
    ])
    const cache = new SceneAssetsCache(async () => assets)
    try {
      await expect(loadScene({ gs, sceneId: 5, assets: cache })).resolves.toBeUndefined()
      expect(gs.npcs).toEqual([])
      expect(warning.mock.calls).toEqual([
        [
          'event-system: setSceneObjectState id(1-based)=1 → idx=0 不在当前 scene 也不在全局表,跳过',
        ],
      ])
    } finally {
      warning.mockRestore()
    }
  })

  it('enter script 含 showDialog → skip(不阻塞,party 位置已设)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // enter script: setPartyPos → showDialog → end
    const commands: Command[] = [
      { op: 'raw', opcode: OP_SET_PARTY_POS, operands: [6, 4, 0], label: 'L_enter' },
      { op: 'showDialog', messageIndex: 1, text: '你好', label: undefined },
      { op: 'end' as const },
    ]
    const labelMap: Record<string, number> = { L_enter: 0 }
    setGlobalEvents(commands) // P2#5:onEnterLabel 走全局 labelMap(L_enter → index 0)
    const assets = makeSceneAssets(5, [], commands, labelMap, 'L_enter')
    const cache = new SceneAssetsCache(async () => assets)
    await loadScene({ gs, sceneId: 5, assets: cache })
    // party 已被 setPartyPos 设好,showDialog 被 skip
    expect(gs.party.x).toBe(192)
    expect(gs.party.y).toBe(64)
    expect(gs.mode).toBe('explore') // 没切到 event 模式
  })
})
