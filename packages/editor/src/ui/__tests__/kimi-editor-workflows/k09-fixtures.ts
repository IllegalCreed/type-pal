/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K09 专属夹具：LevelCurveEditor 指针/滚轮交互的浏览器硬件端口见证。
 *
 * 边界纪律（与 kit.ts / k05-fixtures 同一级别，不替换任何被测业务函数）：
 * - pointer capture 三件套：jsdom 未实现，按 HTML 语义记录每元素捕获集合与全局调用见证。
 * - 几何端口：jsdom 不布局，getBoundingClientRect 恒为零矩形会让组件的 viewBox 换算除零。
 *   这里只对 .level-curve-chart 给出与组件 viewBox 同尺寸（780×320，LevelCurveEditor.tsx:52-54
 *   的 W/H 常量）的原点矩形，使 clientX/clientY 与 viewBox 坐标 1:1，指针→级数/数值换算可精确
 *   断言；其余元素委托 jsdom 原生实现。观测范围仅限坐标换算，不宣称真实 CSS 布局。
 */

export interface LevelCurveDomPort {
  /** setPointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerCaptures: readonly number[]
  /** releasePointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerReleases: readonly number[]
}

/** 与 LevelCurveEditor.tsx:52-54 的 W/H 同步；几何端口据此让 client 坐标等于 viewBox 坐标。 */
export const LEVEL_CURVE_VIEWBOX_WIDTH = 780
export const LEVEL_CURVE_VIEWBOX_HEIGHT = 320

const savedDescriptors: Array<[object, string, PropertyDescriptor | undefined]> = []

function replaceProperty(owner: object, name: string, descriptor: PropertyDescriptor): void {
  savedDescriptors.push([owner, name, Object.getOwnPropertyDescriptor(owner, name)])
  Object.defineProperty(owner, name, { configurable: true, ...descriptor })
}

/** 恢复 installLevelCurveDomPorts 安装的全部描述符。 */
export function restoreLevelCurveDomPorts(): void {
  for (const [owner, name, descriptor] of savedDescriptors.splice(0)) {
    if (descriptor) Object.defineProperty(owner, name, descriptor)
    else Reflect.deleteProperty(owner, name)
  }
}

/** jsdom 缺失 DOM 硬件能力的最小语义实现 + 见证；重复安装幂等。 */
export function installLevelCurveDomPorts(): LevelCurveDomPort {
  restoreLevelCurveDomPorts()
  const pointerCaptures: number[] = []
  const pointerReleases: number[] = []
  const capturedByElement = new WeakMap<Element, Set<number>>()
  const nativeGetBoundingClientRect = Element.prototype.getBoundingClientRect

  replaceProperty(Element.prototype, 'setPointerCapture', {
    value(this: Element, pointerId: number) {
      const captured = capturedByElement.get(this) ?? new Set<number>()
      captured.add(pointerId)
      capturedByElement.set(this, captured)
      pointerCaptures.push(pointerId)
    },
  })
  replaceProperty(Element.prototype, 'hasPointerCapture', {
    value(this: Element, pointerId: number) {
      return capturedByElement.get(this)?.has(pointerId) ?? false
    },
  })
  replaceProperty(Element.prototype, 'releasePointerCapture', {
    value(this: Element, pointerId: number) {
      capturedByElement.get(this)?.delete(pointerId)
      pointerReleases.push(pointerId)
    },
  })
  replaceProperty(SVGElement.prototype, 'getBoundingClientRect', {
    value(this: SVGElement) {
      if (this.classList.contains('level-curve-chart')) {
        return {
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: LEVEL_CURVE_VIEWBOX_WIDTH,
          bottom: LEVEL_CURVE_VIEWBOX_HEIGHT,
          width: LEVEL_CURVE_VIEWBOX_WIDTH,
          height: LEVEL_CURVE_VIEWBOX_HEIGHT,
          toJSON: () => ({}),
        } as DOMRect
      }
      return nativeGetBoundingClientRect.call(this)
    },
  })
  return { pointerCaptures, pointerReleases }
}
