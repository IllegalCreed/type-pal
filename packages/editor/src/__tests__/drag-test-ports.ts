/** jsdom 缺失的 DataTransfer：按 HTML DnD 语义的真实类型化存储。 */
export class MemoryDataTransfer {
  effectAllowed = 'none'
  dropEffect = 'none'
  private readonly store = new Map<string, string>()

  get types(): readonly string[] {
    return [...this.store.keys()]
  }

  setData(type: string, value: string): void {
    this.store.set(type, value)
  }

  getData(type: string): string {
    return this.store.get(type) ?? ''
  }

  clearData(type?: string): void {
    if (type === undefined) this.store.clear()
    else this.store.delete(type)
  }
}

/** 以原生事件驱动 React DnD 处理器（dragstart/dragenter/dragover/drop 通用）。 */
export function dispatchDragEvent(
  target: Element,
  type: string,
  dataTransfer: MemoryDataTransfer,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  target.dispatchEvent(event)
}
