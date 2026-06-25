/**
 * 键盘输入：held（移动，连续）+ pressed（边沿，如交互按一次）。
 * 移动键 / 空格阻止默认滚动。
 */
const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export class Keyboard {
  private readonly held = new Set<string>()
  private readonly pressed = new Set<string>()

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.key)
      this.held.add(e.key)
      if (MOVE_KEYS.has(e.key) || e.key === ' ' || e.key === 'Enter') e.preventDefault()
    })
    target.addEventListener('keyup', (e) => {
      this.held.delete(e.key)
    })
  }

  isDown(key: string): boolean {
    return this.held.has(key)
  }

  /** 取出「自上次起新按下」的键（边沿触发），并清空。 */
  consumePressed(): Set<string> {
    const s = new Set(this.pressed)
    this.pressed.clear()
    return s
  }
}
