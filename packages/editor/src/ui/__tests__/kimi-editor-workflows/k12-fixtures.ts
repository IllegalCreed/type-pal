/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K12 组内 fixture（只被本组新测试导入，不被生产引用）。
 *
 * jsdom 缺失浏览器对象按 HTML 语义补齐（观测范围声明）：
 * - Path2D：node-canvas 3.x 不提供 Path2D，这里只记录路径段（moveTo/lineTo/closePath/rect），
 *   供真实 ctx.fill(path)/stroke(path) 吞入；本组不断言叠加层像素，故只补构造与记录语义。
 * - pointer capture：按元素记录活跃捕获指针集合，set/has/release 与 lostpointercapture 派发
 *   遵循 HTML 语义；release 未捕获指针时静默（MapMode 的 release 本就有 try/catch 兜底）。
 * - getBoundingClientRect：jsdom 无布局，canvas 矩形以属性宽高自洽（1:1 CSS 像素），
 *   其余元素返回零矩形；本组据此做确定性的屏幕↔世界坐标换算断言。
 * - scrollIntoView：jsdom 未实现，目录选中滚动不在本组观测范围，补空操作。
 * 业务真值（EditSession/commands/reader/解码/命中）不经此文件替换。
 */
import { formatProjectMap, gridToPixel, type MapIndexV1 } from '@type-pal/content'
import type { FileSource, ProjectMap } from '@type-pal/reforge'
import {
  fsaSource,
  latticeCenter,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { vi } from 'vitest'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import type { EditorState } from '../../../core/edit-session.js'
import { assertProjectSaveValid } from '../../../core/project-diagnostics.js'
import { toEditorState } from '../../../core/project-io.js'
import { buildBlankProject } from '../../../core/seed.js'
import { mapBoxOf } from '../../scene-stage.js'

/** 与 scene-stage.ts 的 StageView 同形（只读消费，不引入 hook 依赖）。 */
export interface StageViewLike {
  zoom: number
  panX: number
  panY: number
}

/** 记录型 Path2D：按 HTML 语义维护子路径段序列；不提供像素求值（本组不断言叠加像素）。 */
class RecordingPath2D {
  readonly segments: Array<readonly (string | number)[]> = []

  moveTo(x: number, y: number): void {
    this.segments.push(['M', x, y])
  }

  lineTo(x: number, y: number): void {
    this.segments.push(['L', x, y])
  }

  closePath(): void {
    this.segments.push(['Z'])
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.segments.push(['R', x, y, w, h])
  }
}

/**
 * 安装 jsdom 缺失对象（HTML 语义补齐；观测范围见文件头）。每次调用覆盖安装，
 * 与 vitest 的 restoreAllMocks/unstubAllGlobals 互不依赖。
 */
export function installJsdomStageSemantics(): void {
  const captures = new WeakMap<Element, Set<number>>()
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value(this: HTMLCanvasElement, pointerId: number) {
      const set = captures.get(this) ?? new Set<number>()
      set.add(pointerId)
      captures.set(this, set)
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value(this: HTMLCanvasElement, pointerId: number) {
      return captures.get(this)?.has(pointerId) ?? false
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value(this: HTMLCanvasElement, pointerId: number) {
      const set = captures.get(this)
      if (!set?.delete(pointerId)) return
      this.dispatchEvent(new Event('lostpointercapture', { bubbles: true }))
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: this.width,
        bottom: this.height,
        width: this.width,
        height: this.height,
        toJSON: () => ({}),
      }
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
  vi.stubGlobal('Path2D', RecordingPath2D)
}

/** 统一指针事件入口：真实 PointerEvent + 显式 pointerId（jsdom PointerEvent 支持 init）。 */
export function pointerOn(
  target: HTMLCanvasElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'pointerleave',
  init: {
    clientX: number
    clientY: number
    pointerId?: number
    button?: number
    altKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
  },
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: init.pointerId ?? 7,
      button: init.button ?? 0,
      clientX: init.clientX,
      clientY: init.clientY,
      altKey: init.altKey ?? false,
      ctrlKey: init.ctrlKey ?? false,
      metaKey: init.metaKey ?? false,
      shiftKey: init.shiftKey ?? false,
    }),
  )
}

export function wheelOn(
  target: HTMLCanvasElement,
  init: { deltaY: number; clientX: number; clientY: number },
): void {
  target.dispatchEvent(
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: init.deltaY,
      clientX: init.clientX,
      clientY: init.clientY,
    }),
  )
}

export function keyOnCanvas(
  target: HTMLCanvasElement,
  key: string,
  mods: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ctrlKey: mods.ctrlKey ?? false,
      metaKey: mods.metaKey ?? false,
      shiftKey: mods.shiftKey ?? false,
      altKey: mods.altKey ?? false,
    }),
  )
}

/** MapMode.tsx:612-620 的 fit 公式（独立复算，用来推导点击坐标；断言对象是行为而非本公式）。 */
export function mapModeFitView(
  map: { width: number; height: number },
  size: { w: number; h: number },
): StageViewLike {
  const box = mapBoxOf(map, undefined)
  const width = Math.max(1, box.maxX - box.minX)
  const height = Math.max(1, box.maxY - box.minY)
  const zoom = Math.max(0.05, Math.min(size.w / width, size.h / height, 3))
  return {
    zoom,
    panX: box.minX - (size.w / zoom - width) / 2,
    panY: box.minY - (size.h / zoom - height) / 2,
  }
}

/** ProjectMap 错排格中心 → 画布 client 坐标（rect 原点 0,0、1:1 缩放，见安装注释）。 */
export function mapCellClient(
  cell: { row: number; col: number },
  view: StageViewLike,
): { clientX: number; clientY: number } {
  const center = latticeCenter(cell)
  return {
    clientX: (center.x - view.panX) * view.zoom,
    clientY: (center.y - view.panY) * view.zoom,
  }
}

/** SceneCanvas 菱形轴格（gridToPixel 像素点）→ 画布 client 坐标。 */
export function sceneGridClient(
  cell: { col: number; row: number },
  view: StageViewLike,
): { clientX: number; clientY: number } {
  const point = gridToPixel({ col: cell.col, row: cell.row, height: 0 })
  return {
    clientX: (point.x - view.panX) * view.zoom,
    clientY: (point.y - view.panY) * view.zoom,
  }
}

/** 组装磁盘回退用的地图索引（仅 props 消费，不写会话）。 */
export function diskMapIndex(
  entries: readonly { id: string; name: string; path: string }[],
): MapIndexV1 {
  return { version: 1, maps: entries.map((entry) => ({ ...entry })) }
}

export interface LegalProjectWithDiskMaps {
  source: FileSource
  state: EditorState
  assetBase: import('@type-pal/reforge').AssetBase
}

/**
 * 合法 blank 项目 + 额外的「仅落盘、不进索引」地图文件（磁盘回退/迟到读取专用）。
 * 与 glm-ui-wave-kit 的 loadLegalUiProject 同一生产链路（seed→memory 目录→loader→
 * toEditorState→assertProjectSaveValid 自证），仅多写合法 serialize 的地图正文。
 */
export async function loadLegalProjectWithDiskMaps(
  name: string,
  extraDiskMaps: readonly { id: string; map: ProjectMap }[],
): Promise<LegalProjectWithDiskMaps> {
  const files: Record<string, unknown> = await buildBlankProject(name)
  for (const extra of extraDiskMaps)
    files[`content/maps/${extra.id}.json`] = formatProjectMap(extra.map)
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase }
}
