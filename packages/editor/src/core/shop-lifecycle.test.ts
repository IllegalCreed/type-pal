import type { AuthorCommand, ShopDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  AddItemCommand,
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  nextShopId,
  UpdateShopCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

async function state(shops?: ShopDef[]): Promise<EditorState> {
  const project = await loadBoundaryProject('shop-authoring')
  const items = new EditSession(project.state)
  for (const [id, name] of [
    ['100', '货品一'],
    ['101', '货品二'],
  ] as const) {
    items.dispatch(
      new AddItemCommand({ id, name, desc: [], buyPrice: 1, sellPrice: 0, sellable: true }),
    )
  }
  const loaded = items.getState()
  if (!shops) return loaded
  return {
    ...loaded,
    shops,
    manifest: {
      ...loaded.manifest,
      content: { ...loaded.manifest.content, shops: 'content/shops.json' },
    },
  }
}

function canonical(body: AuthorCommand[]): ScriptEditorState {
  return { scenes: [], items: [], sharedScripts: { shop: { name: '商店', self: 'none', body } } }
}

test('shop ID allocation starts at zero, advances past gaps and detects overflow', () => {
  expect(nextShopId([])).toBe(0)
  expect(
    nextShopId([
      { id: 7, items: [] },
      { id: 0, items: [] },
    ]),
  ).toBe(8)
  expect(() => nextShopId([{ id: Number.MAX_SAFE_INTEGER, items: [] }])).toThrow(
    '商店编号已超出安全整数范围',
  )
})

test('first shop declares its owned file and history restores the opening manifest', async () => {
  const initial = await state()
  const session = new EditSession(initial)
  expect(session.dispatch(new AddShopCommand(0))).toBe(true)
  expect(session.getState().manifest.content.shops).toBe('content/shops.json')
  expect(session.getState().shops).toEqual([{ id: 0, items: [] }])
  expect(() => session.dispatch(new AddShopCommand(0))).toThrow(/重复/)
  expect(() => session.dispatch(new AddShopCommand(-1))).toThrow(/非负/)
  expect(session.undo()).toBe(true)
  expect(session.getState().manifest).toEqual(initial.manifest)
  expect(session.getState().shops).toEqual([])
  expect(session.redo()).toBe(true)
  expect(session.getState().manifest.content.shops).toBe('content/shops.json')
  expect(session.getState().shops).toEqual([{ id: 0, items: [] }])
})

test('redo applies the captured ordered stock even after the caller reuses its buffer', async () => {
  const session = new EditSession(
    await state([
      { id: 7, items: ['101'] },
      { id: 8, items: ['100'] },
    ]),
  )
  const adjacent = session.getState().shops?.[1]
  const requested = ['100', '101', '100']
  expect(session.dispatch(new UpdateShopCommand(7, requested))).toBe(true)
  expect(session.getState().shops?.[0]?.items).toEqual(['100', '101', '100'])
  expect(session.getState().shops?.[1]).toBe(adjacent)
  expect(session.undo()).toBe(true)
  expect(session.getState().shops?.[0]?.items).toEqual(['101'])
  requested.splice(0, requested.length, '101')

  expect(session.redo()).toBe(true)
  expect(session.getState().shops?.[0]?.items).toEqual(['100', '101', '100'])
})

test('copy keeps its captured stock and stable ID after the source disappears', async () => {
  const initial = await state([{ id: 7, items: ['100', '101', '100'] }])
  const command = new DuplicateShopCommand(7, nextShopId(initial.shops ?? []))
  const copied = command.apply(initial)
  expect(copied.shops?.[1]).toEqual({ id: 8, items: ['100', '101', '100'] })
  expect(copied.shops?.[1]?.items).not.toBe(initial.shops?.[0]?.items)
  const undone = command.invert(copied)
  expect(command.apply({ ...undone, shops: [] }).shops).toEqual([
    { id: 8, items: ['100', '101', '100'] },
  ])
  expect(() => command.apply(copied)).toThrow(/重复/)
  expect(initial.shops).toEqual([{ id: 7, items: ['100', '101', '100'] }])
})

test('no registered shop leaves update and delete out of undo, while copy reports its missing source', async () => {
  const session = new EditSession(await state())
  const initial = session.getState()
  expect(session.dispatch(new UpdateShopCommand(9, ['100']))).toBe(false)
  expect(session.dispatch(new DeleteShopCommand(9, collectCurrentProjectReferenceIndex))).toBe(
    false,
  )
  expect(() => session.dispatch(new DuplicateShopCommand(9, 1))).toThrow(/^商店 9 不存在$/)
  expect(session.getState()).toBe(initial)
  expect(session.undo()).toBe(false)
})

test('delete restores original position and redo rechecks the latest canonical buy', async () => {
  const initial = await state([
    { id: 0, items: [] },
    { id: 7, items: ['100', '100'] },
    { id: 9, items: [] },
  ])
  const session = new EditSession(initial)
  let script = canonical([{ kind: 'openShop', mode: 'sell', shop: 999 }])
  const provider = (state: EditorState) => collectCurrentProjectReferenceIndex(state, script)
  expect(session.dispatch(new DeleteShopCommand(7, provider))).toBe(true)
  expect(session.getState().shops?.map(({ id }) => id)).toEqual([0, 9])
  expect(session.undo()).toBe(true)
  expect(session.getState().shops).toEqual(initial.shops)
  script = canonical([{ kind: 'openShop', mode: 'buy', shop: 7 }])
  expect(() => session.redo()).toThrow(/买入脚本引用/)
  expect(session.getState().shops).toEqual(initial.shops)
  expect(session.canRedo()).toBe(true)

  script = canonical([])
  expect(session.redo()).toBe(true)
  session.dispatch(new DeleteShopCommand(0, provider))
  session.dispatch(new DeleteShopCommand(9, provider))
  expect(session.getState().shops).toEqual([])
  expect(session.getState().manifest.content.shops).toBe('content/shops.json')
})

test('a reference provider error leaves the shop collection and history unchanged', async () => {
  const initial = await state([{ id: 0, items: [] }])
  const session = new EditSession(initial)
  const error = new Error('index failed')
  expect(() =>
    session.dispatch(
      new DeleteShopCommand(0, () => {
        throw error
      }),
    ),
  ).toThrow(error)
  expect(session.getState()).toBe(initial)
  expect(session.undo()).toBe(false)
})
