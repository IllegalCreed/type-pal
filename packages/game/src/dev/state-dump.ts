/**
 * type-pal Sync.2:per-frame state dump,字段对齐 sdlpal `tp_dump_state.c`,
 * 用于和 sdlpal classic build 的 dump-frames patch 输出做 line-by-line diff。
 *
 * 启用方式(浏览器端):URL 加 `?tp_dump=1`,然后 `window.__tpDumpDownload()`
 * 触发 jsonl 文件下载。
 *
 * 字段顺序与 sdlpal patch 一致:
 *   { frame, scene, viewport, party:{x,y,dir,wFrame,role,sprite,members}, npcs:[...] }
 */

import type { GameState } from '../core/game-state.js'

/** sdlpal `palcommon.h`:kDirSouth=0 / kDirWest=1 / kDirNorth=2 / kDirEast=3。 */
const FACING_TO_DIR: Record<'down' | 'left' | 'up' | 'right', number> = {
  down: 0,
  left: 1,
  up: 2,
  right: 3,
}

/** 计算 leader wFrame —— 跟 present.ts 同一逻辑,只是不渲染只取数字。 */
function computeLeaderWFrame(gs: GameState, walkFrames: number): number {
  const dir = FACING_TO_DIR[gs.party.facing]
  if (gs.walkingFrame.walking) {
    if (walkFrames === 4) return dir * 4 + gs.walkingFrame.stepFrame
    const iStepFrameLeader = [0, 1, 0, 2][gs.walkingFrame.stepFrame] ?? 0
    return dir * walkFrames + iStepFrameLeader
  }
  const scripted = gs.partyScriptedFrame[0]
  if (scripted !== undefined) return scripted
  return dir * walkFrames
}

export function dumpFrameJson(gs: GameState, frame: number, walkFrames: number): string {
  const leaderRole = gs.partyMembers[0] ?? 0
  const sprite =
    gs.PlayerRolesRuntime.rgwSpriteNum?.[leaderRole] ??
    (leaderRole === 0 ? gs.partyLeaderSpriteId : undefined) ??
    0
  const obj = {
    frame,
    scene: gs.wNumScene,
    viewport: [gs.camera.x, gs.camera.y],
    party: {
      x: gs.party.x,
      y: gs.party.y,
      dir: FACING_TO_DIR[gs.party.facing],
      wFrame: computeLeaderWFrame(gs, walkFrames),
      role: leaderRole,
      sprite,
      members: gs.partyMembers.map((role) => ({
        role,
        sprite:
          gs.PlayerRolesRuntime.rgwSpriteNum?.[role] ??
          (role === 0 ? gs.partyLeaderSpriteId : undefined) ??
          0,
      })),
    },
    npcs: gs.npcs.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      dir: n.facing ? FACING_TO_DIR[n.facing] : 0,
      frame: n.scriptedFrame ?? 0,
      sState: n.sState ?? 1,
      sprite: n.spriteNum,
      layer: n.sLayer ?? 0,
      trigMode: n.triggerMode ?? 0,
    })),
  }
  return JSON.stringify(obj)
}

interface DumpController {
  push: (gs: GameState, walkFrames: number) => void
  enabled: boolean
}

type StateDumpWindow = Window & {
  __tpDumpBuffer?: string[]
  __tpDumpDownload?: () => void
}

/** 初始化 dump controller。URL `?tp_dump=1` 启用 + 暴露 window.__tpDumpDownload()。 */
export function initStateDump(): DumpController {
  if (typeof window === 'undefined') {
    return { push: () => {}, enabled: false }
  }
  const params = new URLSearchParams(window.location.search)
  const enabled = params.get('tp_dump') === '1'
  if (!enabled) return { push: () => {}, enabled: false }

  const buffer: string[] = []
  let frameCount = 0

  const w = window as StateDumpWindow
  w.__tpDumpBuffer = buffer
  w.__tpDumpDownload = () => {
    const blob = new Blob([`${buffer.join('\n')}\n`], { type: 'application/x-ndjson' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ts-dump.jsonl'
    a.click()
    URL.revokeObjectURL(url)
    console.log(`type-pal: dumped ${buffer.length} frames`)
  }
  console.log('type-pal: state dump enabled. Run __tpDumpDownload() to save.')

  return {
    enabled: true,
    push: (gs, walkFrames) => {
      buffer.push(dumpFrameJson(gs, frameCount++, walkFrames))
    },
  }
}
