import { loadAll } from '../assets/loader.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, npcFromEventObject } from '../core/game-state.js'
import { buildLabelMap } from '../core/event-system.js'
import { KeyboardInputSource } from './input.js'
import { startRafLoop, type LoopContext } from './main-loop.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  presentFrame,
  presentBattleFrame,
  flushToCanvas,
  type PresentContext,
} from '../present/present.js'
import { BattlePresent, type BattleAssets } from '../present/battle/present-battle.js'
import { setupDevPanel, type BattleFixturesData, type SceneJumpsData } from './dev-panel.js'
import battleFixturesRaw from '../data/battle-fixtures.json' with { type: 'json' }
import sceneJumpsRaw from '../data/scene-jumps.json' with { type: 'json' }

// JSON 静态 import 的 TS 类型推断会把每条 fixture 推成具体 key 集合(eg. fixture-zh1
// 没 "1" → 推 "1": undefined),与 BattleFixturesData 的 Record<string, ...> 不严格匹配。
// 这里显式 cast —— battle-fixtures.json 的 schema 由 BattleFixture 定义,运行时合法。
const battleFixtures = battleFixturesRaw as unknown as BattleFixturesData
// 同模式 cast —— scene-jumps.json schema 由 SceneJump 定义。
const sceneJumps = sceneJumpsRaw as unknown as SceneJumpsData

const SCENE_ID = 1

export function showError(canvas: HTMLCanvasElement, msg: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#400'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f88'
  ctx.font = '10px monospace'
  ctx.fillText(msg, 8, 32)
}

export async function bootstrap(canvas: HTMLCanvasElement): Promise<void> {
  const assets = await loadAll(SCENE_ID)

  const {
    tilemap, palette, scene, events, playerRoles, tileImages, characterSprites,
    battleSprites, battleBgs, enemies, enemyTeams, battleFields, items, spells, magics,
  } = assets

  // 队长精灵号 —— 从 player-roles.json (DATA.MKF chunk 3 真解) 取真值。
  // M3 T9 之前 M2 硬编码 = 2,现在改读 PlayerRoles.roles[0].spriteNum(实测 = 2);
  // 多人队伍切换留 M5。
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('bootstrap: playerRoles.roles[0] missing')
  const partyLeaderSpriteId = leader.spriteNum

  // party 起始位置 —— 真原版起始由 onEnter 脚本 setPartyPos opcode 设;M2 raw skip 后不自动设。
  // 实施时若 dev 验证位置不对,改这两个数字。
  const PARTY_START = { col: 32, row: 24, facing: 'down' as const }
  const gs = createInitialGameState(PARTY_START)
  gs.npcs = scene.eventObjects.map(npcFromEventObject)

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // onEnter 装载
  if (scene.onEnterLabel) {
    const ip = labelMap[scene.onEnterLabel]
    if (ip !== undefined) {
      gs.eventCursor = { commands: eventCommands, labelMap, ip }
      gs.mode = 'event'
    }
  }

  // sprite 装配
  const partyData = characterSprites.get(partyLeaderSpriteId)
  if (!partyData) throw new Error(`队长 sprite (id ${partyLeaderSpriteId}) 加载失败`)
  const partyFirst = partyData.frames[0]
  if (!partyFirst) throw new Error('队长 sprite 无 frame[0]')
  const partySprite = {
    width: partyFirst.width,
    height: partyFirst.height,
    indices: partyFirst.indices,
    anchorX: partyData.anchorX,
    anchorY: partyData.anchorY,
  }
  const npcSprites = new Map<number, typeof partySprite>()
  for (const [id, data] of characterSprites) {
    const f = data.frames[0]
    if (!f) continue
    npcSprites.set(id, {
      width: f.width,
      height: f.height,
      indices: f.indices,
      anchorX: data.anchorX,
      anchorY: data.anchorY,
    })
  }

  const fb = createFramebuffer()
  const canvasCtx = canvas.getContext('2d')
  if (!canvasCtx) throw new Error('canvas 2d context 不可用')

  const presentCtx: PresentContext = {
    tilemap,
    tileImages: { get: (i) => tileImages.get(i) },
    partySprite,
    npcSprites,
  }

  // M3 T28/T29:战斗一帧装配 —— BattlePresent 持有 floating nums 跨帧状态;
  // BattleAssets 注入资源表(sprites/bgs/items/spells/playerRoles)。
  const battlePresent = new BattlePresent()
  const battleAssets: BattleAssets = {
    battleSprites,
    battleBgs,
    playerRoles,
    spells,
    items,
  }

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)

  const loopCtx: LoopContext = {
    gs,
    bus,
    input,
    tilemap,
    eventCommands,
    labelMap,
    onPresent: (drained) => {
      // 按 gs.mode 路由 present:battle → presentBattleFrame(消费 commands 进 floating nums);
      // 否则走 explore/event 路径 presentFrame(commands 由 M2 EventSystem 直接消费 GameState)
      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained)) {
        presentFrame(fb, gs, presentCtx)
      }
      flushToCanvas(fb, canvasCtx, palette)
    },
  }

  // M3 T29:dev panel(仅 DEV;生产构建 dead-code)。快捷键 B 弹 fixture picker → 启战。
  // M3.5 T16:加 sceneJumps,picker 内多一段 scene jump 列表(stub,T17 接真切场景)。
  setupDevPanel({
    gs,
    fixtures: battleFixtures,
    sceneJumps,
    resources: {
      enemies, enemyTeams, battleFields,
      playerRoles, items, spells, magics,
      commands: eventCommands,
    },
  })

  startRafLoop(loopCtx)
  console.log('[bootstrap] scene', SCENE_ID, 'started')
}
