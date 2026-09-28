// @vitest-environment jsdom
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateActorCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { loadLegalUiProject } from './__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { CasualtyEditor } from './CasualtyEditor.js'

/** 合法项目会话：hero 用自带 battleSprite，经真实 UpdateActorCommand 写入伤亡脚本。 */
async function casualitySession() {
  await stubNodeTestHost()
  const legal = await loadLegalUiProject('glm-leaf-casualty')
  const session = new EditSession(legal.state)
  const hero = session.getState().actors[0]!
  session.dispatch(
    new UpdateActorCommand(hero.id, {
      battler: { ...hero.battler!, casualty },
    }),
  )
  return { session, heroId: hero.id }
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function Harness(props: { session: EditSession; actorId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = current.actors.find((candidate) => candidate.id === props.actorId)!
  return (
    <CasualtyEditor
      actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      session={props.session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

async function render(props: { session: EditSession; actorId: string }): Promise<void> {
  await act(async () => root.render(<Harness session={props.session} actorId={props.actorId} />))
}

function button(text: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  expect(button, text).not.toBeNull()
  return button!
}

const casualty: { friendDeath: CasualtyScript; dying: CasualtyScript } = {
  friendDeath: {
    gates: [
      { chance: 40, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
    ],
    fallback: { lines: [], effects: [] },
  },
  dying: {
    gates: [],
    fallback: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] },
  },
}

describe('CasualtyEditor 剩余合同', () => {
  test('slot switch keeps per-slot data separate and mirrors external undo', async () => {
    const { session, heroId } = await casualitySession()
    await render({ session, actorId: heroId })
    // friendDeath 槽有一门；dying 槽空。
    expect(host.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('40')

    await act(async () => button('自己濒死时').click())
    // dying 槽只配了 fallback：无概率门输入，但兜底分支内容可见。
    expect(host.querySelector('input[type="number"]')).toBeNull()
    expect(host.textContent).toContain('兜底分支')
    expect(host.textContent).not.toContain('40')

    // 外部命令移除 friendDeath：组件外部 identity epoch 回显，不再显示 40 门。
    await act(async () => {
      session.dispatch(
        new UpdateActorCommand(heroId, {
          battler: {
            ...session.getState().actors[0]!.battler!,
            casualty: { dying: casualty.dying },
          },
        }),
      )
    })
    await render({ session, actorId: heroId })
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath).toBeUndefined()
    await act(async () => button('队友阵亡时').click())
    // friendDeath 槽已被外部命令清空：回显空槽而非残留 40 门。
    expect(host.querySelector('input[type="number"]')).toBeNull()
    expect(host.textContent).toContain('尚未配置')
  })

  test('chance gates write integers once per blur and undo restores the prior value', async () => {
    const { session, heroId } = await casualitySession()
    await render({ session, actorId: heroId })
    const chance = host.querySelector<HTMLInputElement>('input[type="number"]')!
    const historyBefore = session.getHistoryVersion()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(chance, '80.9')
      chance.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      chance.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[0]?.chance).toBe(80)
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[0]?.chance).toBe(40)
  })

  test('adding a gate then removing it returns to the previous script shape', async () => {
    const { session, heroId } = await casualitySession()
    await render({ session, actorId: heroId })
    await act(async () => button('添加概率分支').click())
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates).toHaveLength(2)
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[1]).toMatchObject({
      chance: 50,
      branch: { lines: [], effects: [] },
    })

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates).toHaveLength(1)
  })
})
