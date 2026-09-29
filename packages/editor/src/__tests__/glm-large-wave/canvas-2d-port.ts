/**
 * TEST-GLM-LARGE-WAVE-4 白名单 fixture：canvas 2d 硬件端口替身（jsdom 无 2d 上下文）。
 * 以 CanvasRenderingContext2D 真原型派生实例承接组件调用——不是类型断言：
 * 组件实际触碰的成员由调用方以 vi.fn 显式提供，未提供的成员不会被触碰。
 * 仅测试导入，不进生产。
 */
import { vi } from 'vitest'

export type Canvas2dMember = ReturnType<typeof vi.fn>

/** 构造一个继承真 2d 上下文原型的替身实例；jsdom 不暴露该全局时回退 Object.prototype。 */
export function stubCanvas2dPort(members: Record<string, unknown> = {}): CanvasRenderingContext2D {
  const prototype = (globalThis as Record<string, unknown>).CanvasRenderingContext2D as
    | { prototype: object }
    | undefined
  return Object.assign(Object.create(prototype?.prototype ?? Object.prototype), {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    ...members,
  })
}

/** 让组件拿到的每个 canvas 都获得独立替身实例的 getContext spy。 */
export function spyCanvas2dPort(members: Record<string, unknown> = {}): void {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(
    this: HTMLCanvasElement,
  ) {
    let context = contexts.get(this)
    if (!context) {
      context = stubCanvas2dPort(members)
      contexts.set(this, context)
    }
    return context
  })
}
