const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/** 游戏页面持有持续按键和本帧按下边沿。 */
export class Keyboard {
  private readonly held = new Set<string>()
  private readonly pressed = new Set<string>()

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (!e.repeat) {
        this.pressed.add(e.key)
        // Set 的插入顺序决定移动优先级。系统连发不能把先按下的键重新提到最后。
        this.held.delete(e.key)
        this.held.add(e.key)
      }
      // F5 和 F9 已绑定快速存取档，游戏页面接管浏览器默认操作。
      if (
        MOVE_KEYS.has(e.key) ||
        e.key === ' ' ||
        e.key === 'Enter' ||
        e.key === 'F5' ||
        e.key === 'F9'
      ) {
        e.preventDefault()
      }
    })
    target.addEventListener('keyup', (e) => {
      this.held.delete(e.key)
    })
  }

  isDown(key: string): boolean {
    return this.held.has(key)
  }

  /** held 中最后初次按下的命中键(后按优先;插入序即按下序,取末位命中)。 */
  lastDownOf(keys: readonly string[]): string | undefined {
    let hit: string | undefined
    for (const k of this.held) if (keys.includes(k)) hit = k
    return hit
  }

  /** 取出「自上次起新按下」的键（边沿触发），并清空。 */
  consumePressed(): Set<string> {
    const s = new Set(this.pressed)
    this.pressed.clear()
    return s
  }
}
