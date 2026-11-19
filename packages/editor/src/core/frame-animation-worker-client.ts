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

function runFrameWorker<Result>(
  operation: string,
  missing: string,
  send: (worker: Worker, id: number) => void,
  readResult: (message: WorkerResult) => Result | undefined,
): Promise<Result> {
  const id = ++requestId
  const worker = new Worker(new URL('./frame-animation-codec.worker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise<Result>((resolve, reject) => {
    const terminate = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }
    worker.onerror = (event) => {
      terminate()
      reject(new Error(event.message || `${operation} Worker 失败`))
    }
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      const { data } = event
      if (data.id !== id) return
      terminate()
      try {
        if (data.error) throw new Error(data.error)
        const value = readResult(data)
        if (value === undefined) throw new Error(missing)
        resolve(value)
      } catch (error) {
        reject(error)
      }
    }
    try {
      send(worker, id)
    } catch (error) {
      terminate()
      reject(error)
    }
  })
}

/** 后台重编码；没有 Worker 时仍走相同纯核。 */
export function encodeFrameAnimationInWorker(
  request: FrameAnimationEncodeRequest,
): Promise<Uint8Array> {
  if (typeof Worker === 'undefined') return encodeFrameAnimationRequest(request)
  return runFrameWorker(
    '帧动画编码',
    '帧动画编码 Worker 未返回数据',
    (worker, id) => {
      const source = request.source?.slice(0)
      const frames = request.frames.map((frame) =>
        'rgba' in frame ? { ...frame, rgba: frame.rgba.slice(0) } : frame,
      )
      const transfer: Transferable[] = []
      if (source) transfer.push(source)
      for (const frame of frames) if ('rgba' in frame) transfer.push(frame.rgba)
      worker.postMessage({ id, kind: 'encode', request: { ...request, source, frames } }, transfer)
    },
    ({ bytes }) => bytes && new Uint8Array(bytes),
  )
}

/** 批量完整帧量化；浏览器无 Worker 时降级到相同纯核。 */
export function quantizeFrameAnimationInWorker(
  request: FrameAnimationQuantizeRequest,
): Promise<Uint8Array[]> {
  if (typeof Worker === 'undefined')
    return Promise.resolve(
      quantizeFrameAnimationRequest(request).map((frame) => new Uint8Array(frame)),
    )
  return runFrameWorker(
    '帧动画量化',
    '帧动画量化 Worker 未返回完整帧',
    (worker, id) => {
      const frames = request.frames.map((frame) => frame.slice(0))
      worker.postMessage({ id, kind: 'quantize', request: { ...request, frames } }, frames)
    },
    ({ frames }) => frames?.map((frame) => new Uint8Array(frame)),
  )
}
