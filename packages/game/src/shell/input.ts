import type { AbstractKey, InputSnapshot, InputSource } from '@type-pal/shared'

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
  Escape: 'Cancel',
  KeyM: 'Menu',
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
    if (!this.held.has(k)) this.pressed.add(k)
    // sdlpal input.c:235:每次 KeyDown 刷新 dwKeyOrder 为最新计数。
    // JS Set 保 insertion order 但 add 已存在项是 no-op,故 delete-then-add
    // 把最新键推到末尾 → pickFacing 反向迭代即"最后按优先"。
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
