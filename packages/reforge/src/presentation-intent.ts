/**
 * D14-2 演出意图词汇表——core 产 effect、呈现层执行的协议层。
 * v1 只覆盖现存五能力 + wait(K4:screenHold/dither/worldShake/worldWave/partyGesture/
 * actorSpriteOverrides/entityFrameOverride 等演出态 v1 不入协议,由 abortScript 兜底)。
 * 音频(playMusic/stopMusic)与 SFX 不入协议(世界态音频 + D12-1 边界)。
 * Cutscene = PresentationIntent[] 顺序编排,是 P2 编辑器时间线的数据源。
 */
import type { AssetId, DialogueCue, GridPos } from '@type-pal/content'

export type FadeColor = 'black' | 'red'

export type PresentationIntent =
  | { kind: 'dialog'; cue: DialogueCue }
  | { kind: 'clearDialog' }
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number; color?: FadeColor }
  | { kind: 'cameraPan'; dx: number; dy: number; frames: number }
  | { kind: 'cameraSnap'; to?: GridPos }
  | {
      kind: 'frameAnimation'
      asset: AssetId
      startFrame?: number
      endFrame?: number
      frameRate?: number
    }
  | { kind: 'video'; asset: AssetId }
  | { kind: 'wait'; ms: number }

export type Cutscene = readonly PresentationIntent[]
