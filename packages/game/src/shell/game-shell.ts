import { localize, subscribeLanguage } from '../localization/language.js'
import { startGamepadInput } from './gamepad-input.js'
import type { KeyboardInputSource } from './input.js'
import { INPUT_ROTATION_CHANGE, isInputRotated } from './input-rotation.js'
import { isMobileLayout, LAYOUT_CHANGE } from './presentation.js'
import { bindTouchControls, createTouchButton } from './touch-controls.js'
import { areTouchControlsVisible, TOUCH_VISIBILITY_CHANGE } from './touch-preference.js'
import './game-shell.css'

export interface GameShell {
  setScale(percent: number): void
  connect(input: KeyboardInputSource): void
  setToolsOpen(open: boolean): void
}

/** The shell owns available display space; the engine keeps its 320×200 framebuffer. */
export function createGameShell(canvas: HTMLCanvasElement): GameShell {
  const shell = document.createElement('main')
  shell.id = 'tp-game-shell'
  const stage = document.createElement('div')
  stage.id = 'tp-game-stage'
  canvas.replaceWith(shell)
  stage.append(canvas)

  const dpad = document.createElement('div')
  dpad.className = 'tp-dpad'
  dpad.setAttribute('role', 'group')
  dpad.setAttribute('aria-label', localize('方向控制', 'Direction controls'))
  const directionButtons: { button: HTMLButtonElement; chinese: string; english: string }[] = []
  for (const [key, rotation, label, english] of [
    ['Up', 0, '向上', 'Up'],
    ['Left', 270, '向左', 'Left'],
    ['Right', 90, '向右', 'Right'],
    ['Down', 180, '向下', 'Down'],
  ] as const) {
    const button = createTouchButton(key, '')
    button.setAttribute('aria-label', localize(label, english))
    directionButtons.push({ button, chinese: label, english })
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('aria-hidden', 'true')
    icon.style.transform = `rotate(calc(${rotation}deg + var(--tp-input-rotation, 0deg)))`
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M6 15 L12 9 L18 15')
    icon.append(path)
    button.append(icon)
    dpad.append(button)
  }
  const hub = document.createElement('span')
  hub.className = 'tp-dpad-hub'
  hub.setAttribute('aria-hidden', 'true')
  dpad.append(hub)
  const actions = document.createElement('div')
  actions.className = 'tp-touch-actions'
  const confirm = createTouchButton('Confirm', '确认')
  confirm.className = 'tp-touch-confirm'
  confirm.setAttribute('aria-label', '确认 / 交互')
  const menu = createTouchButton('Menu', '取消')
  menu.className = 'tp-touch-menu'
  menu.setAttribute('aria-label', '取消 / 菜单')
  actions.append(confirm, menu)
  stage.append(dpad, actions)
  shell.append(stage)

  const updateRotation = (): void => {
    const rotated = isInputRotated()
    dpad.dataset.rotated = String(rotated)
    dpad.style.setProperty('--tp-input-rotation', rotated ? '45deg' : '0deg')
  }
  updateRotation()
  window.addEventListener(INPUT_ROTATION_CHANGE, updateRotation)

  const updateLabels = (): void => {
    dpad.setAttribute('aria-label', localize('方向控制', 'Direction controls'))
    for (const { button, chinese, english } of directionButtons) {
      button.setAttribute('aria-label', localize(chinese, english))
    }
    confirm.textContent = localize('确认', 'OK')
    confirm.setAttribute('aria-label', localize('确认 / 交互', 'Confirm / interact'))
    menu.textContent = localize('取消', 'Back')
    menu.setAttribute('aria-label', localize('取消 / 菜单', 'Cancel / menu'))
  }
  updateLabels()
  const unsubscribeLanguage = subscribeLanguage(() => {
    if (shell.isConnected) updateLabels()
    else unsubscribeLanguage()
  })

  let input: KeyboardInputSource | undefined
  let scale = 100
  let toolsOpen = false
  let detachControls: (() => void) | undefined
  let detachGamepad: (() => void) | undefined
  const syncTouchVisibility = (): void => {
    const visible = areTouchControlsVisible()
    if (!visible) {
      detachControls?.()
      detachControls = undefined
    } else if (input && !detachControls) detachControls = bindTouchControls(shell, input)
    dpad.hidden = !visible
    actions.hidden = !visible
  }
  window.addEventListener(TOUCH_VISIBILITY_CHANGE, syncTouchVisibility)
  syncTouchVisibility()
  const media = window.matchMedia(
    '(pointer: coarse), (max-width: 959px), (max-width: 1024px) and (max-height: 500px)',
  )
  const fit = (): void => {
    if (isMobileLayout()) {
      const { width, height } = stage.getBoundingClientRect()
      const factor = Math.max(0, Math.min(width / 320, height / 200))
      canvas.style.width = `${320 * factor}px`
      canvas.style.height = `${200 * factor}px`
      canvas.style.position = 'static'
      canvas.style.transform = 'none'
    } else {
      canvas.style.width = `${Math.round((960 * scale) / 100)}px`
      canvas.style.height = `${Math.round((600 * scale) / 100)}px`
      canvas.style.position = 'fixed'
      canvas.style.left = '50%'
      canvas.style.top = '50%'
      canvas.style.transform = 'translate(-50%, -50%)'
    }
  }
  const updateLayout = (): void => {
    const layout = media.matches ? 'mobile' : 'desktop'
    const changed = document.documentElement.dataset.tpLayout !== layout
    document.documentElement.dataset.tpLayout = layout
    if (changed) {
      input?.releaseAll()
      input?.setEnabled(!(media.matches && toolsOpen))
      window.dispatchEvent(new Event(LAYOUT_CHANGE))
    }
    fit()
  }
  media.addEventListener('change', updateLayout)
  new ResizeObserver(fit).observe(stage)
  updateLayout()
  return {
    setScale(percent) {
      scale = percent
      fit()
    },
    connect(source) {
      input = source
      detachControls?.()
      detachGamepad?.()
      detachControls = bindTouchControls(shell, source)
      detachGamepad = startGamepadInput(source, () => toolsOpen)
      syncTouchVisibility()
    },
    setToolsOpen(open) {
      toolsOpen = open
      input?.setEnabled(!(isMobileLayout() && open))
      dpad.inert = open
      actions.inert = open
    },
  }
}
