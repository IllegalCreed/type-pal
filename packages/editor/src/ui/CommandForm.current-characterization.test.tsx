// @vitest-environment jsdom
import type { ActorDef, Command, SceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { CommandForm } from './CommandForm.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const scene: SceneDef = {
  id: 's',
  mapId: 'map-s',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const actors: Record<string, ActorDef> = {
  hero: {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'sprite.hero',
    portraits: {
      default: 'portrait.hero',
      expressions: { angry: 'portrait.hero.angry' },
    },
  },
  friend: {
    id: 'friend',
    name: 'name.friend',
    spriteId: 'sprite.friend',
  },
}

const references: ScriptReferenceCatalog = {
  choices: () => [],
  has: () => false,
  label: (_kind, id) => id,
}

function render(cmd: Command, onChange = vi.fn(), onOverride = vi.fn()) {
  act(() => {
    root.render(
      <CommandForm
        cmd={cmd}
        scene={scene}
        locale={{ 'name.hero': '主角', 'name.friend': '队友' }}
        assetCatalog={{ version: 1, assets: {} }}
        audioResolver={{} as never}
        assetReader={{} as never}
        actors={actors}
        battleSprites={[]}
        references={references}
        worldVariables={{
          a: { kind: 'flag', name: 'Alpha', description: '', initial: false },
          b: { kind: 'flag', name: 'Beta', description: '', initial: true },
          count: { kind: 'number', name: 'Count', description: '', initial: 0 },
        }}
        onDialogueSpeakerOverrideChange={onOverride}
        onChange={onChange}
      />,
    )
  })
  return { onChange, onOverride }
}

function row(label: string): HTMLLabelElement {
  const found = [...host.querySelectorAll<HTMLLabelElement>('.cf-row')].find(
    (candidate) => candidate.querySelector('.cf-label')?.textContent === label,
  )
  if (!found) throw new Error(`缺表单项 ${label}`)
  return found
}

function control(label: string): HTMLInputElement | HTMLSelectElement {
  const found = row(label).querySelector<HTMLInputElement | HTMLSelectElement>('input, select')
  if (!found) throw new Error(`表单项 ${label} 缺控件`)
  return found
}

function openSelect(label: string, index = 0): HTMLButtonElement {
  const found = row(label).querySelectorAll<HTMLButtonElement>('[role="combobox"]')[index]
  if (!found) throw new Error(`表单项 ${label} 缺选择器`)
  act(() => found.click())
  return found
}

function chooseSelect(label: string, optionLabel: string): void {
  openSelect(label)
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === optionLabel,
  )
  if (!option) throw new Error(`表单项 ${label} 缺选项 ${optionLabel}`)
  act(() => option.click())
}

describe('当前对话身份表单', () => {
  test('人物立绘只列该人物的默认与命名表情', () => {
    render({
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'actor',
          actor: 'hero',
          portrait: { kind: 'expression', expression: 'angry', side: 'left' },
        },
        slot: 'bottom',
        rows: [{ text: 'dialog.hero' }],
      },
    } as Command)

    openSelect('人物立绘')
    expect(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(
        (option) => option.textContent,
      ),
    ).toEqual(['主立绘', 'angry'])
    expect(document.querySelector('[role="option"][aria-selected="true"]')?.textContent).toBe(
      'angry',
    )
    expect(host.textContent).not.toContain('全局立绘')
  })

  test('显示称谓交给 locale+cue 原子事务回调', () => {
    const { onChange, onOverride } = render({
      kind: 'dialog',
      cue: {
        identity: { kind: 'actor', actor: 'hero' },
        slot: 'bottom',
        rows: [{ text: 'dialog.hero' }],
      },
    } as Command)
    const input = control('显示称谓') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, '少侠')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onOverride).toHaveBeenCalledWith('少侠')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('切换人物会清除旧人物的表情引用', () => {
    const { onChange } = render({
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'actor',
          actor: 'hero',
          portrait: { kind: 'expression', expression: 'angry' },
        },
        slot: 'bottom',
        rows: [{ text: 'dialog.hero' }],
      },
    } as Command)
    chooseSelect('人物', '队友 (friend)')
    expect(onChange).toHaveBeenCalledWith({
      kind: 'dialog',
      cue: {
        identity: { kind: 'actor', actor: 'friend' },
        slot: 'bottom',
        rows: [{ text: 'dialog.hero' }],
      },
    })
  })
})

describe('CommandForm commit characterization', () => {
  test("number empty string commits Number('') === 0 immediately", () => {
    const { onChange } = render({ kind: 'wait', ms: 40 } as Command)
    const input = control('毫秒') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'wait', ms: 0 })
  })

  test('world variable picker commits only a registered id', () => {
    const { onChange } = render({ kind: 'setFlag', flag: 'a', value: false } as Command)
    chooseSelect('开关名', 'Beta · b')
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'setFlag', flag: 'b', value: false })
    expect(row('开关名').textContent).not.toContain('Count')
  })

  test('select commits the selected string directly', () => {
    const { onChange } = render({ kind: 'fade', dir: 'in', ms: 300 } as Command)
    const select = row('方向').querySelector<HTMLButtonElement>('[role="combobox"]')!
    act(() => select.click())
    const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('out'),
    )!
    act(() => option.click())
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'fade', dir: 'out', ms: 300 })
  })

  test('entity state uses the shared Chinese semantic selector and preserves raw values on open', () => {
    const { onChange } = render({
      kind: 'setEntityState',
      entity: 'e4',
      state: 3,
    } as Command)

    expect(row('状态').textContent).toContain('当前原值 3（显示，阻挡通行）')
    expect(onChange).not.toHaveBeenCalled()
    openSelect('状态')
    const hidden = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.startsWith('隐藏'),
    )
    expect(hidden).toBeDefined()
    act(() => hidden!.click())
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'setEntityState',
      entity: 'e4',
      state: 0,
    })
  })
})
