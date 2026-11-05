/**
 * Developer snapshots recorded after each logical tick by the DEV rAF loop.
 * The SDLPal dump-frames patch is a comparison reference, not an identical format:
 * TS adds party.members and keeps global NPC IDs; the patch uses scene-local NPC IDs.
 *
 * 启用方式(浏览器端):URL 加 `?tp_dump=1`,然后 `window.__tpDumpDownload()`
 * 触发 jsonl 文件下载。
 *
 * Snapshot shape:
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

/** Walking overrides a scripted pose. Frame counts come from the caller (normally 3 or 4),
 * rather than the renderer's per-role resource lookup.
 */
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

/** Diagnostic fallback for incomplete runtime inputs; an actual sprite number of zero is retained. */
function spriteForDump(gs: GameState, role: number): number {
  return (
    gs.PlayerRolesRuntime.rgwSpriteNum?.[role] ??
    (role === 0 ? gs.partyLeaderSpriteId : undefined) ??
    0
  )
}

export function dumpFrameJson(gs: GameState, frame: number, walkFrames: number): string {
  const leaderRole = gs.partyMembers[0] ?? 0
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
      sprite: spriteForDump(gs, leaderRole),
      members: gs.partyMembers.map((role) => ({
        role,
        sprite: spriteForDump(gs, role),
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

/** URL `?tp_dump=1` enables recording. Window ports retain this run for manual download
 * after the caller stops its rAF loop; a later initialization replaces those ports.
 */
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
