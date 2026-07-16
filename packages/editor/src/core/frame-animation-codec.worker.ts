import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeRequest,
  type FrameAnimationQuantizeRequest,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

type WorkerMessage =
  | {
      id: number
      kind: 'encode'
      request: FrameAnimationEncodeRequest
    }
  | {
      id: number
      kind: 'quantize'
      request: FrameAnimationQuantizeRequest
    }

interface WorkerResult {
  id: number
  bytes?: ArrayBuffer
  frames?: ArrayBuffer[]
  error?: string
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null
  postMessage(message: WorkerResult, transfer?: Transferable[]): void
}

scope.onmessage = (event): void => {
  const { id, kind, request } = event.data
  if (kind === 'quantize') {
    try {
      const frames = quantizeFrameAnimationRequest(request)
      scope.postMessage({ id, frames }, frames)
    } catch (error) {
      scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }
  void encodeFrameAnimationRequest(request).then(
    (encoded) => {
      const bytes = encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength,
      ) as ArrayBuffer
      scope.postMessage({ id, bytes }, [bytes])
    },
    (error: unknown) => {
      scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
    },
  )
}
