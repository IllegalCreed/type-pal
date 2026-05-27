import type { AbstractKey, InputSnapshot, InputSource } from '@type-pal/shared'

// 物理键 → AbstractKey。对照 sdlpal `input.c:60-92`(SDL2 → kKey*):
//   ESCAPE/INSERT/ALT/KP_0 → kKeyMenu(开 InGameMenu / 菜单内返回上一级)
//   RETURN/SPACE → kKeySearch(大世界调查 / 菜单内确认 → ts 'Confirm')
//   F → kKeyForce(暂未接;留 W0.0 之后扩)
// ts 端 'Cancel' 抽象保留 — M5 battle UI 用作回退键(battle menu 内退回上一菜单 step)
const CODE_MAP: Record<string, AbstractKey> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  KeyW: 'Up',
  KeyS: 'Down',
  KeyA: 'Left',
  KeyD: 'Right',
  Space: 'Confirm',
  Enter: 'Confirm',
  Escape: 'Menu', // sdlpal input.c:66 SDLK_ESCAPE → kKeyMenu(M5.6 W0.0 — 原误标 'Cancel')
  AltLeft: 'Menu', // sdlpal input.c:68
  AltRight: 'Menu', // sdlpal input.c:69
  Insert: 'Menu', // sdlpal input.c:67
  KeyM: 'Menu', // dev 常用键,保留
}

export function codeToAbstractKey(code: string): AbstractKey | null {
  return CODE_MAP[code] ?? null
}

export class KeyboardInputSource implements InputSource {
  private held = new Set<AbstractKey>()
  private pressed = new Set<AbstractKey>()
  private readonly handleDown = (e: KeyboardEvent): void => {
    const k = codeToAbstractKey(e.code)
    if (!k) return
    // sdlpal input.c:213:仅 `if (!fRepeat)` 时才更新 dwKeyOrder。
    // browser hold key 时每 ~30ms repeat 触发 keydown(e.repeat=true);
    // 若不过滤,被 hold 的键持续 delete-then-add 推到末尾,后按的键反被挤前 →
    // "后按优先" 失效(user 报"依然是固定优先级")。
    if (e.repeat) return
    if (!this.held.has(k)) this.pressed.add(k)
    // delete-then-add 把最新**初次按下**的键推到 Set 末尾,pickFacing 反向取末位即可。
    this.held.delete(k)
    this.held.add(k)
  }
  private readonly handleUp = (e: KeyboardEvent): void => {
    const k = codeToAbstractKey(e.code)
    if (!k) return
    this.held.delete(k)
  }

  constructor(private readonly target: Window) {
    target.addEventListener('keydown', this.handleDown)
    target.addEventListener('keyup', this.handleUp)
  }

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap: InputSnapshot = {
      held: new Set(this.held),
      pressed: new Set(this.pressed),
      frameNum,
    }
    this.pressed.clear()
    return snap
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.handleDown)
    this.target.removeEventListener('keyup', this.handleUp)
  }
}

export class ReplayInputSource implements InputSource {
  private cursor = 0
  constructor(private readonly snapshots: InputSnapshot[]) {}

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap = this.snapshots[this.cursor]
    this.cursor++
    if (!snap) {
      return { held: new Set(), pressed: new Set(), frameNum }
    }
    return snap
  }
}

export class RecordingInputSource implements InputSource {
  private readonly recording: InputSnapshot[] = []
  constructor(private readonly inner: InputSource) {}

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap = this.inner.nextSnapshot(frameNum)
    this.recording.push(snap)
    return snap
  }

  getRecording(): InputSnapshot[] {
    return this.recording
  }
}
