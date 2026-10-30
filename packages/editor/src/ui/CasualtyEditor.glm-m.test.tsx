// @vitest-environment jsdom
/**
 * 伤亡分支效果链：添加、切换恢复资源与效果类别、逐次撤销；
 * 临时增益比例提交/下限以及台词切换旁白后解析 locale 预览。
 * 与主测试的槽位、概率门、台词增删及重排合同相邻；保留本片两条效果工作流。
 */
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  blurField,
  buttonByText,
  fillAndBlur,
  loadLegalProject,
  pickCombobox,
  stubNodeTestHost,
  typeDraft,
} from '../__tests__/glm-m/kit.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { CasualtyEditor } from './CasualtyEditor.js'

type BattlerActor = ActorDef & { battler: NonNullable<ActorDef['battler']> }

/** 真实 blank 项目的占位主角 + 作者编排的伤亡脚本（合法 ActorDef，无强转）。 */
function withCasualty(
  hero: BattlerActor,
  casualty?: { friendDeath?: CasualtyScript; dying?: CasualtyScript },
): BattlerActor {
  return { ...hero, battler: { ...hero.battler, casualty } }
}

/** 真实项目的占位主角自带战斗档；运行时校验收窄，不做类型断言。 */
function currentHero(state: EditorState): BattlerActor {
  const hero = state.actors[0]
  const battler = hero?.battler
  if (!hero || !battler) throw new Error('真实项目缺少带战斗档的主角')
  return { ...hero, battler }
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = currentHero(current)
  return (
    <CasualtyEditor
      actor={actor}
      session={props.session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

const friendDeath: CasualtyScript = {
  gates: [],
  fallback: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] },
}

function actorCasualty(session: EditSession): CasualtyScript | undefined {
  return session.getState().actors[0]!.battler?.casualty?.friendDeath
}

describe('M03 CasualtyEditor 效果链当前合同', () => {
  test('添加效果默认 heal hp；恢复对象切真气；改类 tempStatBuff 默认 attack+10；undo 逐步还原', async () => {
    const { state } = await loadLegalProject('glm-wave-m-casualty')
    const hero = currentHero(state)
    const seeded: EditorState = {
      ...state,
      actors: state.actors.map((actor) =>
        actor.id === hero.id
          ? withCasualty(hero, { friendDeath: structuredClone(friendDeath) })
          : actor,
      ),
      locale: { ...state.locale, 'dlg.talk.0': '你好' },
    }
    assertProjectSaveValid(seeded)
    const session = new EditSession(seeded)
    await act(async () => {
      root.render(<Harness session={session} />)
    })
    const before = session.getHistoryVersion()

    await act(async () => buttonByText(host, '＋ 效果').click())
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'hp' }])
    expect(session.getHistoryVersion()).toBe(before + 1)

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 个效果恢复资源"]')!,
      '真气',
    )
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'mp' }])

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 个效果类型"]')!,
      '临时属性增益',
    )
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 10 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 3)

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'mp' }])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'hp' }])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(actorCasualty(session)!.fallback.effects).toEqual([])
  })

  test('tempStatBuff 提升比例 blur 提交并下钳 1；台词样式切换为旁白', async () => {
    const { state } = await loadLegalProject('glm-wave-m-casualty')
    const hero = currentHero(state)
    const scripted: BattlerActor = withCasualty(hero, {
      friendDeath: {
        gates: [],
        fallback: {
          lines: [{ text: 'dlg.talk.0', style: 'bottom' }],
          effects: [{ kind: 'tempStatBuff', stat: 'attack', percent: 10 }],
        },
      },
    })
    const seeded: EditorState = {
      ...state,
      actors: state.actors.map((actor) => (actor.id === hero.id ? scripted : actor)),
      locale: { ...state.locale, 'dlg.talk.0': '你好' },
    }
    assertProjectSaveValid(seeded)
    const session = new EditSession(seeded)
    await act(async () => {
      root.render(<Harness session={session} />)
    })
    const before = session.getHistoryVersion()

    const percent = host.querySelector<HTMLInputElement>(
      'input[aria-label="提升比例"], .casualty-percent-input input',
    )
    expect(percent, '提升比例输入').not.toBeNull()
    await typeDraft(percent!, '25')
    await blurField(percent!)
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 1)

    // 下钳 1：0 → normalize 成 1，仍是一次业务提交。
    await fillAndBlur(percent!, '0')
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 1 },
    ])

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 条台词样式"]')!,
      '旁白',
    )
    expect(actorCasualty(session)!.fallback.lines).toEqual([
      { text: 'dlg.talk.0', style: 'narration' },
    ])
    // 预览解析 locale 文本。
    expect(host.textContent).toContain('你好')
  })
})
