/** Runtime presentation requests between the script host and its ordered executor.
 * Media-specific lifetime, clocks and playback policy belong to executor ports.
 * World audio and direct presentation effects such as shake and dither are outside this contract.
 */
import type { AssetId, DialogueCue, FadeColor, GridPos } from '@type-pal/content'

export type { FadeColor } from '@type-pal/content'

export type PresentationIntent =
  | { kind: 'dialog'; cue: DialogueCue }
  | { kind: 'clearDialog' }
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number; color?: FadeColor }
  | { kind: 'cameraPan'; dx: number; dy: number; frames: number; startImmediately?: true }
  | { kind: 'cameraSnap'; to?: GridPos }
  | {
      kind: 'frameAnimation'
      asset: AssetId
      startFrame?: number
      endFrame?: number
      frameRate?: number
      holdLastFrame?: boolean
      initialFadeInMs?: number
    }
  | { kind: 'clearFrameAnimation' }
  | { kind: 'video'; asset: AssetId }
  | { kind: 'wait'; ms: number }

export type Cutscene = readonly PresentationIntent[]
