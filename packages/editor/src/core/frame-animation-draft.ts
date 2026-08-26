import type { AssetId, FrameSequenceFrameV1, FrameSequenceIndexV1 } from '@type-pal/content'

export type FrameColorTreatment = 'preserve' | 'project-standard'

export type CompleteFrameSource =
  | { readonly kind: 'asset'; readonly asset: AssetId; readonly frameIndex: number }
  | { readonly kind: 'pixels'; readonly rgba: Uint8Array }

export interface FrameAnimationDraftFrame {
  readonly id: string
  readonly source: CompleteFrameSource
  readonly durationMs?: number
}

export interface FrameAnimationDraft {
  readonly width: number
  readonly height: number
  readonly defaultFrameMs: number
  readonly colorTreatment: FrameColorTreatment
  readonly frames: readonly FrameAnimationDraftFrame[]
}

export interface CompleteFrameReader {
  frame(
    asset: AssetId,
    frameIndex: number,
  ): Promise<{ width: number; height: number; rgba: Uint8Array | Uint8ClampedArray }>
}

export interface FrameAnimationDraftHistory {
  readonly past: readonly FrameAnimationDraft[]
  readonly present: FrameAnimationDraft
  readonly future: readonly FrameAnimationDraft[]
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} 必须是正有限数`)
  return value
}

function dimension(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} 必须是正整数`)
  return value
}

function assertPixelLength(width: number, height: number, rgba: Uint8Array, label: string): void {
  const expected = width * height * 4
  if (rgba.byteLength !== expected) throw new Error(`${label} 应为 ${expected} 字节`)
}

export function createFrameAnimationDraft(input: {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment?: FrameColorTreatment
  frames: readonly FrameAnimationDraftFrame[]
}): FrameAnimationDraft {
  const width = dimension(input.width, '帧动画宽度')
  const height = dimension(input.height, '帧动画高度')
  const defaultFrameMs = positive(input.defaultFrameMs, '默认帧时长')
  if (input.frames.length === 0) throw new Error('帧动画至少需要一帧')
  const ids = new Set<string>()
  const frames = input.frames.map((frame, index) => {
    if (!frame.id || ids.has(frame.id)) throw new Error(`帧 ${index} 的内部 id 为空或重复`)
    ids.add(frame.id)
    if (frame.durationMs !== undefined) positive(frame.durationMs, `帧 ${index} 时长`)
    if (frame.source.kind === 'pixels')
      assertPixelLength(width, height, frame.source.rgba, `帧 ${index} 像素`)
    else if (!Number.isSafeInteger(frame.source.frameIndex) || frame.source.frameIndex < 0)
      throw new Error(`帧 ${index} 的来源索引非法`)
    return frame
  })
  return {
    width,
    height,
    defaultFrameMs,
    colorTreatment: input.colorTreatment ?? 'preserve',
    frames,
  }
}

export function draftFromFrameSequence(
  asset: AssetId,
  index: FrameSequenceIndexV1,
): FrameAnimationDraft {
  return createFrameAnimationDraft({
    width: index.width,
    height: index.height,
    defaultFrameMs: index.defaultFrameMs,
    colorTreatment: index.colorTreatment ?? 'preserve',
    frames: index.frames.map((frame, frameIndex) => ({
      id: `${asset}\0${frameIndex}`,
      source: { kind: 'asset', asset, frameIndex },
      ...(frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }),
    })),
  })
}

export function draftFrameDurationMs(draft: FrameAnimationDraft, frameIndex: number): number {
  const frame = draft.frames[frameIndex]
  if (!frame) throw new Error(`帧索引 ${frameIndex} 越界`)
  return frame.durationMs ?? draft.defaultFrameMs
}

export function draftDurationMs(draft: FrameAnimationDraft): number {
  return draft.frames.reduce(
    (total, _frame, index) => total + draftFrameDurationMs(draft, index),
    0,
  )
}

export async function resolveDraftFrame(
  draft: FrameAnimationDraft,
  frameIndex: number,
  reader: CompleteFrameReader,
): Promise<Uint8Array> {
  const frame = draft.frames[frameIndex]
  if (!frame) throw new Error(`帧索引 ${frameIndex} 越界`)
  if (frame.source.kind === 'pixels') return frame.source.rgba
  const loaded = await reader.frame(frame.source.asset, frame.source.frameIndex)
  if (loaded.width !== draft.width || loaded.height !== draft.height)
    throw new Error(
      `来源帧尺寸 ${loaded.width}x${loaded.height} 与草稿 ${draft.width}x${draft.height} 不同`,
    )
  const rgba =
    loaded.rgba instanceof Uint8Array
      ? loaded.rgba
      : new Uint8Array(loaded.rgba.buffer, loaded.rgba.byteOffset, loaded.rgba.byteLength)
  assertPixelLength(draft.width, draft.height, rgba, `帧 ${frameIndex} 像素`)
  return rgba
}

export function setDraftDefaultFrameMs(
  draft: FrameAnimationDraft,
  defaultFrameMs: number,
): FrameAnimationDraft {
  positive(defaultFrameMs, '默认帧时长')
  return defaultFrameMs === draft.defaultFrameMs ? draft : { ...draft, defaultFrameMs }
}

export function setDraftColorTreatment(
  draft: FrameAnimationDraft,
  colorTreatment: FrameColorTreatment,
): FrameAnimationDraft {
  return colorTreatment === draft.colorTreatment ? draft : { ...draft, colorTreatment }
}

export function setDraftFrameDuration(
  draft: FrameAnimationDraft,
  frameIndex: number,
  durationMs?: number,
): FrameAnimationDraft {
  const frame = draft.frames[frameIndex]
  if (!frame) throw new Error(`帧索引 ${frameIndex} 越界`)
  if (durationMs !== undefined) positive(durationMs, '单帧时长')
  if (frame.durationMs === durationMs) return draft
  const next = [...draft.frames]
  next[frameIndex] =
    durationMs === undefined ? { id: frame.id, source: frame.source } : { ...frame, durationMs }
  return { ...draft, frames: next }
}

export function insertDraftFrames(
  draft: FrameAnimationDraft,
  at: number,
  frames: readonly FrameAnimationDraftFrame[],
): FrameAnimationDraft {
  if (!Number.isSafeInteger(at) || at < 0 || at > draft.frames.length)
    throw new Error(`插入位置 ${at} 越界`)
  if (frames.length === 0) return draft
  return createFrameAnimationDraft({
    ...draft,
    frames: [...draft.frames.slice(0, at), ...frames, ...draft.frames.slice(at)],
  })
}

export function replaceDraftFrame(
  draft: FrameAnimationDraft,
  frameIndex: number,
  source: CompleteFrameSource,
): FrameAnimationDraft {
  const frame = draft.frames[frameIndex]
  if (!frame) throw new Error(`帧索引 ${frameIndex} 越界`)
  const next = [...draft.frames]
  next[frameIndex] = { ...frame, source }
  return createFrameAnimationDraft({ ...draft, frames: next })
}

export function duplicateDraftFrame(
  draft: FrameAnimationDraft,
  frameIndex: number,
  id: string,
): FrameAnimationDraft {
  const frame = draft.frames[frameIndex]
  if (!frame) throw new Error(`帧索引 ${frameIndex} 越界`)
  return insertDraftFrames(draft, frameIndex + 1, [{ ...frame, id }])
}

export function deleteDraftFrames(
  draft: FrameAnimationDraft,
  frameIndices: readonly number[],
): FrameAnimationDraft {
  const remove = new Set(frameIndices)
  if (
    [...remove].some(
      (index) => !Number.isSafeInteger(index) || index < 0 || index >= draft.frames.length,
    )
  )
    throw new Error('删除帧索引越界')
  if (remove.size === 0) return draft
  const frames = draft.frames.filter((_frame, index) => !remove.has(index))
  if (frames.length === 0) throw new Error('帧动画至少需要一帧')
  return { ...draft, frames }
}

export function moveDraftFrame(
  draft: FrameAnimationDraft,
  from: number,
  to: number,
): FrameAnimationDraft {
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= draft.frames.length ||
    to >= draft.frames.length
  )
    throw new Error(`移动帧索引 ${from} -> ${to} 越界`)
  if (from === to) return draft
  const frames = [...draft.frames]
  const [frame] = frames.splice(from, 1)
  if (!frame) throw new Error(`移动帧 ${from} 失败`)
  frames.splice(to, 0, frame)
  return { ...draft, frames }
}

export function frameSelectionAfterReorder(
  frames: readonly FrameAnimationDraftFrame[],
  sourceId: string,
  selectedFrameIds: ReadonlySet<string>,
): {
  selectedFrameIds: ReadonlySet<string>
  selectedIndex: number
  selectionAnchor: number
} {
  const sourceIndex = frames.findIndex((frame) => frame.id === sourceId)
  if (sourceIndex < 0) throw new Error(`重排来源帧 ${sourceId} 不存在`)
  return {
    selectedFrameIds: selectedFrameIds.has(sourceId) ? selectedFrameIds : new Set([sourceId]),
    selectedIndex: sourceIndex,
    selectionAnchor: sourceIndex,
  }
}

export function createDraftHistory(draft: FrameAnimationDraft): FrameAnimationDraftHistory {
  return { past: [], present: draft, future: [] }
}

export function commitDraftHistory(
  history: FrameAnimationDraftHistory,
  draft: FrameAnimationDraft,
  limit = 100,
): FrameAnimationDraftHistory {
  if (draft === history.present) return history
  return {
    past: [...history.past, history.present].slice(-limit),
    present: draft,
    future: [],
  }
}

export function undoDraftHistory(history: FrameAnimationDraftHistory): FrameAnimationDraftHistory {
  const previous = history.past.at(-1)
  if (!previous) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoDraftHistory(history: FrameAnimationDraftHistory): FrameAnimationDraftHistory {
  const next = history.future[0]
  if (!next) return history
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

export function draftFrameMetadata(draft: FrameAnimationDraft): FrameSequenceFrameV1[] {
  return draft.frames.map((frame) =>
    frame.durationMs === undefined ? {} : { durationMs: frame.durationMs },
  )
}

export type FrameQuantization = 'nearest' | 'floyd-steinberg'
export type RgbColor = readonly [number, number, number]

function nearestColor(r: number, g: number, b: number, colors: readonly RgbColor[]): RgbColor {
  let selected = colors[0]
  if (!selected) throw new Error('项目标准色彩不能为空')
  let best = Number.POSITIVE_INFINITY
  for (const color of colors) {
    const dr = r - color[0]
    const dg = g - color[1]
    const db = b - color[2]
    const distance = dr * dr + dg * dg + db * db
    if (distance < best) {
      selected = color
      best = distance
      if (distance === 0) break
    }
  }
  return selected
}

/** 真彩完整帧量化；alpha 原样保留，返回新的完整 RGBA8 画布。 */
export function quantizeCompleteFrame(
  rgba: Uint8Array,
  width: number,
  height: number,
  colors: readonly RgbColor[],
  mode: FrameQuantization = 'nearest',
): Uint8Array {
  dimension(width, '量化宽度')
  dimension(height, '量化高度')
  assertPixelLength(width, height, rgba, '量化输入')
  if (colors.length === 0) throw new Error('项目标准色彩不能为空')
  const out = new Uint8Array(rgba)
  if (mode === 'nearest') {
    for (let offset = 0; offset < out.length; offset += 4) {
      if (out[offset + 3] === 0) continue
      const color = nearestColor(
        out[offset] ?? 0,
        out[offset + 1] ?? 0,
        out[offset + 2] ?? 0,
        colors,
      )
      out[offset] = color[0]
      out[offset + 1] = color[1]
      out[offset + 2] = color[2]
    }
    return out
  }
  if (mode !== 'floyd-steinberg') throw new Error(`未知量化方式 ${String(mode)}`)

  const work = Float32Array.from(out)
  const spread = (
    x: number,
    y: number,
    er: number,
    eg: number,
    eb: number,
    factor: number,
  ): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const offset = (y * width + x) * 4
    if ((work[offset + 3] ?? 0) === 0) return
    work[offset] = (work[offset] ?? 0) + er * factor
    work[offset + 1] = (work[offset + 1] ?? 0) + eg * factor
    work[offset + 2] = (work[offset + 2] ?? 0) + eb * factor
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      if ((out[offset + 3] ?? 0) === 0) continue
      const r = Math.max(0, Math.min(255, work[offset] ?? 0))
      const g = Math.max(0, Math.min(255, work[offset + 1] ?? 0))
      const b = Math.max(0, Math.min(255, work[offset + 2] ?? 0))
      const color = nearestColor(r, g, b, colors)
      out[offset] = color[0]
      out[offset + 1] = color[1]
      out[offset + 2] = color[2]
      const er = r - color[0]
      const eg = g - color[1]
      const eb = b - color[2]
      spread(x + 1, y, er, eg, eb, 7 / 16)
      spread(x - 1, y + 1, er, eg, eb, 3 / 16)
      spread(x, y + 1, er, eg, eb, 5 / 16)
      spread(x + 1, y + 1, er, eg, eb, 1 / 16)
    }
  }
  return out
}
