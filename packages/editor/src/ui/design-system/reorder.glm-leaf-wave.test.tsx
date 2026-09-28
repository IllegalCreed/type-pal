// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsReorderCollection,
  type DsReorderEntry,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  sameDsSerializableValue,
  useDsReorderKeys,
} from './reorder.js'

let host: HTMLDivElement
let root: Root

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

describe('reorderDsItems 剩余合同', () => {
  test('insert moves preserve the other items in order', () => {
    expect(reorderDsItems(['a', 'b', 'c'], { fromIndex: 0, toIndex: 2 })).toEqual(['b', 'c', 'a'])
    expect(reorderDsItems(['a', 'b', 'c'], { fromIndex: 2, toIndex: 0 })).toEqual(['c', 'a', 'b'])
  })

  test('swap exchanges exactly the two endpoints', () => {
    expect(reorderDsItems(['a', 'b', 'c'], { fromIndex: 0, toIndex: 2 }, 'swap')).toEqual([
      'c',
      'b',
      'a',
    ])
  })

  test('degenerate and out-of-range intents return the original array reference', () => {
    const items = ['a', 'b', 'c']
    expect(reorderDsItems(items, { fromIndex: 1, toIndex: 1 })).toBe(items)
    expect(reorderDsItems(items, { fromIndex: -1, toIndex: 1 })).toBe(items)
    expect(reorderDsItems(items, { fromIndex: 0, toIndex: -2 })).toBe(items)
    expect(reorderDsItems(items, { fromIndex: 3, toIndex: 0 })).toBe(items)
    expect(reorderDsItems(items, { fromIndex: 0, toIndex: 7 })).toBe(items)
  })

  test('no-op moves with a custom equal collapse back to the original reference', () => {
    const items = [
      { id: 1, weight: 2 },
      { id: 2, weight: 2 },
    ]
    const equal = (left: { id: number; weight: number }, right: { id: number; weight: number }) =>
      left.weight === right.weight
    expect(reorderDsItems(items, { fromIndex: 0, toIndex: 1 }, 'insert', equal)).toBe(items)
    expect(reorderDsItems(items, { fromIndex: 0, toIndex: 1 }, 'swap', equal)).toBe(items)
    expect(reorderDsItems(items, { fromIndex: 0, toIndex: 1 }, 'insert')).not.toBe(items)
  })
})

describe('sameDsSerializableValue 剩余合同', () => {
  test('compares persisted JSON shapes deeply, including nesting and key order', () => {
    expect(sameDsSerializableValue({ a: [1, { b: 'x' }] }, { a: [1, { b: 'x' }] })).toBe(true)
    expect(sameDsSerializableValue({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false)
    expect(sameDsSerializableValue([1, 2], [2, 1])).toBe(false)
    expect(sameDsSerializableValue({ a: undefined }, {})).toBe(true)
  })
})

function CollectionHarness(props: {
  entries: readonly DsReorderEntry[]
  disabled?: boolean
  onReorder: (intent: DsReorderIntent) => boolean | undefined
}) {
  return (
    <DsReorderCollection
      adoptionId="lab/reorder"
      scopeKey="scope-a"
      revision={0}
      entries={props.entries}
      disabled={props.disabled}
      onReorder={props.onReorder}
    >
      {props.entries.map((entry) => (
        <DsReorderItem key={entry.key} itemKey={entry.key}>
          {entry.label}
          <DsReorderMoveButton itemKey={entry.key} direction="forward" />
          <DsReorderMoveButton itemKey={entry.key} direction="backward" />
          <DsReorderMoveButton itemKey={entry.key} direction="last" />
        </DsReorderItem>
      ))}
    </DsReorderCollection>
  )
}

describe('DsReorderMoveButton 剩余合同', () => {
  test('commits one button-input intent with resolved target, placement and keys', async () => {
    const onReorder = vi.fn((_intent: DsReorderIntent) => true)
    const entries: DsReorderEntry[] = [
      { key: 'a', label: '甲' },
      { key: 'b', label: '乙' },
      { key: 'c', label: '丙' },
    ]
    await act(async () =>
      root.render(<CollectionHarness entries={entries} onReorder={onReorder} />),
    )
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="下移甲"]')?.click())
    expect(onReorder).toHaveBeenCalledTimes(1)
    const intent = onReorder.mock.calls[0]![0]!
    expect(intent).toMatchObject({
      adoptionId: 'lab/reorder',
      scopeKey: 'scope-a',
      sourceKey: 'a',
      targetKey: 'b',
      fromIndex: 0,
      toIndex: 1,
      placement: 'after',
      input: 'button',
    })
  })

  test('walks over drop-disabled chains and disables at boundaries and collection locks', async () => {
    const onReorder = vi.fn((_intent: DsReorderIntent) => true)
    const entries: DsReorderEntry[] = [
      { key: 'a', label: '甲' },
      { key: 'locked', label: '锁定位', dropDisabled: true },
      { key: 'c', label: '丙' },
    ]
    await act(async () =>
      root.render(<CollectionHarness entries={entries} onReorder={onReorder} />),
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="上移甲"]')?.disabled).toBe(true)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="下移丙"]')?.disabled).toBe(true)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="下移甲"]')?.disabled).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="上移丙"]')?.disabled).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="上移锁定位"]')?.disabled).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="将甲移到最后"]')?.disabled).toBe(
      false,
    )

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="下移甲"]')?.click())
    expect(onReorder).toHaveBeenCalledTimes(1)
    const walked = onReorder.mock.calls[0]![0]!
    expect(walked).toMatchObject({
      sourceKey: 'a',
      targetKey: 'c',
      fromIndex: 0,
      toIndex: 2,
      placement: 'after',
      input: 'button',
    })

    await act(async () =>
      root.render(<CollectionHarness entries={entries} disabled onReorder={onReorder} />),
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="将甲移到最后"]')?.disabled).toBe(
      true,
    )
    expect(onReorder).toHaveBeenCalledTimes(1)
  })
})

describe('useDsReorderKeys 剩余合同', () => {
  test('keeps tokens on object identity through an imperative move', () => {
    const tokens: string[][] = []
    function Harness(): React.ReactNode {
      const [items, setItems] = useState([{ id: 'x' }, { id: 'y' }, { id: 'z' }])
      const hooks = useDsReorderKeys(items, (item) => item.id)
      tokens.push(hooks.keys)
      return (
        <button
          type="button"
          onClick={() => {
            hooks.move({ fromIndex: 0, toIndex: 2 })
            setItems([...reorderDsItems(items, { fromIndex: 0, toIndex: 2 })])
          }}
        >
          移动
        </button>
      )
    }
    act(() => root.render(<Harness />))
    const initial = tokens[0]!
    act(() => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(tokens.at(-1)).toEqual([initial[1], initial[2], initial[0]])
  })

  test('assigns distinct tokens to repeated values and keeps a survivor on removal', () => {
    const tokens: string[][] = []
    function Harness(): React.ReactNode {
      const [items, setItems] = useState(['dupe', 'dupe', 'solo'])
      const hooks = useDsReorderKeys(items)
      tokens.push(hooks.keys)
      return (
        <button type="button" onClick={() => setItems(['dupe', 'solo'])}>
          删除首个
        </button>
      )
    }
    act(() => root.render(<Harness />))
    const initial = tokens[0]!
    expect(new Set(initial).size).toBe(3)

    act(() => host.querySelector<HTMLButtonElement>('button')!.click())
    const afterRemoval = tokens.at(-1)!
    expect(afterRemoval).toHaveLength(2)
    expect(afterRemoval).toEqual([initial[0]!, initial[2]!])
  })

  test('reset drops every token and subsequent items get fresh identities', () => {
    const tokens: string[][] = []
    function Harness(): React.ReactNode {
      const [generation, setGeneration] = useState(0)
      const items = generation === 0 ? ['甲', '乙'] : ['丙']
      const hooks = useDsReorderKeys(items)
      tokens.push(hooks.keys)
      return (
        <button
          type="button"
          onClick={() => {
            hooks.reset()
            setGeneration(1)
          }}
        >
          重置
        </button>
      )
    }
    act(() => root.render(<Harness />))
    act(() => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(tokens[0]).toHaveLength(2)
    expect(tokens[1]).toHaveLength(1)
    expect(tokens[1]![0]).not.toBe(tokens[0]![0])
    expect(tokens[1]![0]).not.toBe(tokens[0]![1])
  })
})
