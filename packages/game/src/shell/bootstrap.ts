import { loadAll } from '../assets/loader.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, npcFromEventObject } from '../core/game-state.js'
import { buildLabelMap } from '../core/event-system.js'
import { KeyboardInputSource } from './input.js'
import { startRafLoop, type LoopContext } from './main-loop.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { presentFrame, flushToCanvas, type PresentContext } from '../present/present.js'

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

  const { tilemap, palette, scene, events, tileImages, characterSprites } = assets

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
  const partyData = characterSprites.get(0)
  if (!partyData) throw new Error('队长 sprite (id 0) 加载失败')
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

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)

  const loopCtx: LoopContext = {
    gs,
    bus,
    input,
    tilemap,
    eventCommands,
    labelMap,
    onPresent: () => {
      presentFrame(fb, gs, presentCtx)
      flushToCanvas(fb, canvasCtx, palette)
    },
  }

  startRafLoop(loopCtx)
  console.log('[bootstrap] scene', SCENE_ID, 'started')
}
