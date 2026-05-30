import type { AbstractKey, InputSnapshot, InputSource } from '@type-pal/shared'

// 物理键 → AbstractKey。完整对照 sdlpal `input.c:58-90`(M5.6 T1 真值补全)。
// sdlpal 真值键集合(SDL2 → kKey*):
//   方向:UP/DOWN/LEFT/RIGHT + Numpad 8/2/4/6
//   Menu:ESCAPE/INSERT/LALT/RALT/KP_0
//   Search(Confirm):RETURN/SPACE/KP_ENTER/LCTRL
//   PgUp/PgDn/Home/End + Numpad 9/3/7/1 对应
//   字母:r=Repeat / a=Auto / d=Defend / e=UseItem / w=ThrowItem / q=Flee / f=Force / s=Status
//
// 键位**以原版为准**(user 2026-05-31 决策:"原版 wasd 就不是用来控制方向的")—— 还原 sdlpal
// `input.c:83-90` WASD 原义,**不再**把 WASD 当方向键:
//   方向 = 方向键 + Numpad 8/2/4/6(原版即如此,行走/菜单导航/图标方向选都走方向键)
//   KeyW=ThrowItem / KeyA=Auto / KeyS=Status / KeyD=Defend(sdlpal input.c:87/84/90/85)
//   KeyR=Repeat / KeyE=UseItem / KeyQ=Flee / KeyF=Force(sdlpal input.c:83/86/88/89)
//   'Cancel' = sdlpal kKeyMenu(战斗 UI 回退/取消复用 Menu;'Cancel' 抽象仅留作单测别名)
const CODE_MAP: Record<string, AbstractKey> = {
  // ── 方向(sdlpal input.c:58-65;方向键 + numpad,WASD 不当方向)──────
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Numpad8: 'Up',
  Numpad2: 'Down',
  Numpad4: 'Left',
  Numpad6: 'Right',

  // ── Menu(sdlpal input.c:66-70 kKeyMenu) ───────────────────────────
  Escape: 'Menu',
  AltLeft: 'Menu',
  AltRight: 'Menu',
  Insert: 'Menu',
  Numpad0: 'Menu',
  KeyM: 'Menu', // dev 常用

  // ── Confirm/Search(sdlpal input.c:71-74 kKeySearch) ────────────────
  Space: 'Confirm',
  Enter: 'Confirm',
  NumpadEnter: 'Confirm',
  ControlLeft: 'Confirm',

  // ── 翻页 / Home/End(sdlpal input.c:75-82) ─────────────────────────
  PageUp: 'PgUp',
  Numpad9: 'PgUp',
  PageDown: 'PgDn',
  Numpad3: 'PgDn',
  Home: 'Home',
  Numpad7: 'Home',
  End: 'End',
  Numpad1: 'End',

  // ── 战斗 / 大世界专用键(sdlpal input.c:83-90,WASD 还原原义) ─────
  KeyR: 'Repeat',     // sdlpal SDLK_r 战斗重复上回合 action
  KeyA: 'Auto',       // sdlpal SDLK_a 战斗 auto 攻击
  KeyD: 'Defend',     // sdlpal SDLK_d 战斗防御
  KeyE: 'UseItem',    // sdlpal SDLK_e 战斗/大世界用物品
  KeyW: 'ThrowItem',  // sdlpal SDLK_w 战斗投掷物品
  KeyQ: 'Flee',       // sdlpal SDLK_q 战斗逃跑
  KeyF: 'Force',      // sdlpal SDLK_f 强制移动 / 战斗 force action
  KeyS: 'Status',     // sdlpal SDLK_s 状态屏
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
