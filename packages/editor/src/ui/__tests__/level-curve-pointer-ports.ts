/** Pointer capture and SVG bounds supplied by the browser outside jsdom. */
export interface LevelCurveDomPort {
  /** setPointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerCaptures: readonly number[]
  /** releasePointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerReleases: readonly number[]
}

/** The mounted SVG and synthetic pointer coordinates share this origin rectangle. */
const LEVEL_CURVE_VIEWBOX_WIDTH = 780
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
