// @vitest-environment jsdom
import { type AuthorCommand, expandGrantReward, type ItemReward } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { ScriptEditSession, UpdateSharedScriptCommand } from '../core/script-editor.js'
import { CanonicalScriptBodyEditor, type CanonicalScriptEditorContext } from './ScriptEditor.js'

const scene = {
  id: 'room',
  mapId: 'room-map',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
}
const reader: EditorAssetReader = {
  projectId: 'acquisition-dialogue-test',
  record() {
    throw new Error('dialogue fields must not read asset bytes')
  },
  async readBytes() {
    throw new Error('dialogue fields must not read asset bytes')
  },
  async readRoleBytes() {
    throw new Error('dialogue fields must not read asset bytes')
  },
  async urlFor() {
    throw new Error('dialogue fields must not read asset bytes')
  },
}
function Harness({ session }: { session: ScriptEditSession }) {
  const state = useSyncExternalStore(
    session.subscribe.bind(session),
    session.getStateSnapshot.bind(session),
  )
  const context: CanonicalScriptEditorContext = {
    state,
    shellScenes: [scene],
    currentSceneId: scene.id,
    locale: {},
    assetCatalog: { version: 1, assets: {} },
    assetReader: reader,
    audioResolver: reader,
    battleSprites: [],
    references: { choices: () => [], has: () => false, label: (_kind, id) => id },
  }
  return (
    <CanonicalScriptBodyEditor
      body={state.sharedScripts.reward!.body}
      context={context}
      onChange={(body) => session.dispatch(new UpdateSharedScriptCommand('reward', { body }))}
    />
  )
}

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
async function openDialogue() {
  const command = host.querySelector<HTMLElement>('[data-command-path="0"]')
  expect(command).not.toBeNull()
  await act(async () => command!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  expect(document.querySelector('dialog[open]')).not.toBeNull()
}
async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
    (entry) => entry.textContent?.trim() === label || entry.getAttribute('aria-label') === label,
  )
  expect(button, label).toBeDefined()
  await act(async () => button!.click())
}
async function input(label: string, value: string, commit = false) {
  const fieldLabel = [...document.querySelectorAll<HTMLLabelElement>('dialog[open] label')].find(
    (entry) => entry.textContent === label,
  )
  const field =
    document.querySelector<HTMLInputElement>(`dialog[open] input[aria-label="${label}"]`) ??
    (fieldLabel ? document.getElementById(fieldLabel.htmlFor) : null)
  expect(field, label).toBeInstanceOf(HTMLInputElement)
  if (!(field instanceof HTMLInputElement)) throw new Error(`missing input ${label}`)
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
  if (commit)
    await act(async () =>
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
  return field
}

test.each<ItemReward>([
  { kind: 'item', itemId: 'gift', count: 2 },
  { kind: 'money', amount: 30 },
])('$kind reward dialogue edits commit as one valid cue draft and preserve its identity and other rows', async (reward) => {
  const [expanded] = expandGrantReward(
    { kind: 'grantReward', rewards: [reward], notice: { kind: 'standard', timing: 'before' } },
    [{ id: 'gift', name: '止血草' }],
  )
  if (expanded?.kind !== 'dialog') throw new Error('expected an expanded standard reward notice')
  const original: Extract<AuthorCommand, { kind: 'dialog' }> = {
    ...expanded,
    cue: {
      ...expanded.cue,
      cursorFrame: 2,
      rows: [
        { ...expanded.cue.rows[0]!, speed: 24 },
        { text: '别弄丢了。', speed: 16 },
      ],
    },
  }
  const session = new ScriptEditSession({
    scenes: [scene],
    items: [],
    sharedScripts: { reward: { name: '归还物品', self: 'none', body: [original] } },
  })
  const saved = () => session.getStateSnapshot().sharedScripts.reward!.body[0]
  const quantityLabel = reward.kind === 'item' ? '对话第 1 行提示数量' : '对话第 1 行提示金额'
  await act(async () => root.render(<Harness session={session} />))
  await openDialogue()
  if (reward.kind === 'item') await input('奖励物品名称', '取消的物品名称')
  await input(quantityLabel, '4', true)
  expect(saved()).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  await click('关闭')
  expect(saved()).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)

  await openDialogue()
  const invalid = await input(quantityLabel, '0', true)
  expect(invalid.getAttribute('aria-invalid')).toBe('true')
  expect(invalid.title).toBe('不能小于 1。')
  await click('完成')
  expect(saved()).toEqual(original)
  expect(session.getHistoryVersion()).toBe(0)
  expect(document.querySelector('dialog[open]')).toBeNull()

  await openDialogue()
  if (reward.kind === 'item') await input('奖励物品名称', '雪莲子')
  await input(quantityLabel, reward.kind === 'item' ? '7' : '120', true)
  expect(saved()).toEqual(original)
  await click('完成')
  const edited: Extract<AuthorCommand, { kind: 'dialog' }> = {
    kind: 'dialog',
    cue: {
      identity: { kind: 'narration' },
      slot: 'narration',
      cursorFrame: 2,
      rows: [
        reward.kind === 'item'
          ? { reward: { kind: 'item', itemName: '雪莲子', count: 7 }, speed: 24 }
          : { reward: { kind: 'money', amount: 120 }, speed: 24 },
        { text: '别弄丢了。', speed: 16 },
      ],
    },
  }
  expect(saved()).toEqual(edited)
  expect(document.querySelector('dialog[open]')).toBeNull()
  expect(session.getHistoryVersion()).toBe(1)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(saved()).toEqual(original)
  expect(session.canUndo()).toBe(false)
  await act(async () => {
    expect(session.redo()).toBe(true)
  })
  expect(saved()).toEqual(edited)
})
