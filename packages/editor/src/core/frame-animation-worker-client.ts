import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeRequest,
  type FrameAnimationQuantizeRequest,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

interface WorkerResult {
  id: number
  bytes?: ArrayBuffer
  frames?: ArrayBuffer[]
  error?: string
}

let requestId = 0

/** 后台重编码；测试/旧环境没有 Worker 时仍走相同纯核。 */
export function encodeFrameAnimationInWorker(
  request: FrameAnimationEncodeRequest,
): Promise<Uint8Array> {
  if (typeof Worker === 'undefined') return encodeFrameAnimationRequest(request)
  const id = ++requestId
  const worker = new Worker(new URL('./frame-animation-codec.worker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Uint8Array>((resolve, reject) => {
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || '帧动画编码 Worker 失败'))
    }
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (event.data.id !== id) return
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else if (event.data.bytes) resolve(new Uint8Array(event.data.bytes))
      else reject(new Error('帧动画编码 Worker 未返回数据'))
    }
    const source = request.source?.slice(0)
    const frames = request.frames.map((frame) =>
      'rgba' in frame ? { ...frame, rgba: frame.rgba.slice(0) } : frame,
    )
    const transfer: Transferable[] = []
    if (source) transfer.push(source)
    for (const frame of frames) if ('rgba' in frame) transfer.push(frame.rgba)
    worker.postMessage({ id, kind: 'encode', request: { ...request, source, frames } }, transfer)
  })
}

/** 批量完整帧量化；浏览器无 Worker 时降级到相同纯核。 */
export function quantizeFrameAnimationInWorker(
  request: FrameAnimationQuantizeRequest,
): Promise<Uint8Array[]> {
  if (typeof Worker === 'undefined')
    return Promise.resolve(
      quantizeFrameAnimationRequest(request).map((frame) => new Uint8Array(frame)),
    )
  const id = ++requestId
  const worker = new Worker(new URL('./frame-animation-codec.worker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Uint8Array[]>((resolve, reject) => {
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || '帧动画量化 Worker 失败'))
    }
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (event.data.id !== id) return
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else if (event.data.frames) resolve(event.data.frames.map((frame) => new Uint8Array(frame)))
      else reject(new Error('帧动画量化 Worker 未返回完整帧'))
    }
    const frames = request.frames.map((frame) => frame.slice(0))
    worker.postMessage({ id, kind: 'quantize', request: { ...request, frames } }, frames)
  })
}
