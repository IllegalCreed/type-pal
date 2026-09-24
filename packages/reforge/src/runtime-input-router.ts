/** Each active query is live. A consumed frame cannot fall through to a newly exposed layer. */
export interface RuntimeInputPorts {
  confirm: { active(): boolean; toggle(): void; yes(): void; no(): void }
  consumeShop(pressed: ReadonlySet<string>): boolean
  consumeReward(pressed: ReadonlySet<string>): boolean
  menu: { active(): boolean; input(pressed: ReadonlySet<string>): void; open(): void }
  dialogue: { active(): boolean; advance(realNow: number): void }
  scriptRunning(): boolean
  hostileBusy(): boolean
  quickSave(): void
  quickLoad(): void
  interact(): void
  changeDebugScene(pressed: ReadonlySet<string>): void
}

export function routeRuntimeInput(
  pressed: ReadonlySet<string>,
  realNow: number,
  ports: RuntimeInputPorts,
): void {
  const confirm = pressed.has(' ') || pressed.has('Enter')
  const cancel = pressed.has('Escape')
  if (ports.confirm.active()) {
    if (
      pressed.has('ArrowUp') ||
      pressed.has('ArrowDown') ||
      pressed.has('ArrowLeft') ||
      pressed.has('ArrowRight')
    )
      ports.confirm.toggle()
    else if (confirm) ports.confirm.yes()
    else if (cancel) ports.confirm.no()
    else if (pressed.has('F5')) ports.quickSave()
  } else if (ports.consumeShop(pressed)) {
    // The active shop, including an ignored key, owns this frame.
  } else if (ports.consumeReward(pressed)) {
    // Advancing one reward must not deliver the same key to the menu below it.
  } else if (ports.menu.active()) ports.menu.input(pressed)
  else if (ports.dialogue.active()) {
    if (confirm) ports.dialogue.advance(realNow)
  } else if (ports.scriptRunning() || ports.hostileBusy()) {
    // Script presentation / pending encounter preparation owns exploration input.
  } else {
    if (pressed.has('F5')) ports.quickSave()
    else if (pressed.has('F9')) ports.quickLoad()
    else if (cancel) ports.menu.open()
    else if (confirm) ports.interact()
    // These states may have changed synchronously through open/interact above.
    if (
      !ports.menu.active() &&
      !ports.dialogue.active() &&
      (pressed.has('[') || pressed.has(']'))
    ) {
      ports.changeDebugScene(pressed)
    }
  }
}
