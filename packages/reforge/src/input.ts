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
      if (!e.repeat) {
        this.pressed.add(e.key)
        // 后按优先:初次按下 delete-then-add 推到插入序末位(lastDownOf 取末位命中)。
        // 仅初次按下时重排 —— OS 连发(e.repeat)会把按住的键反复顶回末位,
        // 反把后按的键挤前(一阶段 shell/input.ts 同坑,对齐 sdlpal input.c:213 !fRepeat)。
        this.held.delete(e.key)
        this.held.add(e.key)
      }
      // 阻止默认:移动键/空格/Enter 防滚动;F5/F9 防浏览器刷新(用作快速存/读热键)
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
