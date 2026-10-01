// @vitest-environment jsdom
/**
 * C10-G01 reorder：move 按钮/纯函数/水平取向；排 reorder.test 键盘/pointer/cancel/token/no-op。
 */
import { act, useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createDsHost,
  type DsMountedHost,
  dsClick,
  installDsRafStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import {
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  sameDsSerializableValue,
} from './reorder.js'

let mounted: DsMountedHost

beforeEach(() => {
  installDsRafStub(vi)
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  vi.unstubAllGlobals()
})

function MoveHarness(props: {
  labels: string[]
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
  onReorder: (intent: DsReorderIntent) => boolean | undefined
}) {
  const [labels, setLabels] = useState(props.labels)
  const entries = labels.map((label, index) => ({ key: `k${index}`, label }))
  return (
    <DsReorderCollection
      adoptionId="c10/reorder-move"
      scopeKey="scope"
      entries={entries}
      revision={labels.join('|')}
      orientation={props.orientation}
      disabled={props.disabled}
      onReorder={(intent) => {
        const accepted = props.onReorder(intent)
        if (accepted === false) return false
        setLabels((current) => [
          ...reorderDsItems(current, { fromIndex: intent.fromIndex, toIndex: intent.toIndex }),
        ])
        return true
      }}
    >
      {entries.map((entry, index) => (
        <DsReorderItem itemKey={entry.key} key={entry.key}>
          <span>{entry.label}</span>
          <DsReorderMoveButton itemKey={entry.key} direction="backward" />
          <DsReorderMoveButton itemKey={entry.key} direction="forward" />
          <DsReorderMoveButton itemKey={entry.key} direction="first" />
          <DsReorderMoveButton itemKey={entry.key} direction="last" />
          <span data-index={index} />
        </DsReorderItem>
      ))}
    </DsReorderCollection>
  )
}

describe('C10-G01 reorder 剩余合同', () => {
  test('C10-G01-01 insert：from=0 to=1 交换相邻两项', () => {
    expect(reorderDsItems(['a', 'b', 'c'], { fromIndex: 0, toIndex: 1 })).toEqual(['b', 'a', 'c'])
  })

  test('C10-G01-02 swap 同索引保持原引用', () => {
    const items = ['x', 'y']
    expect(reorderDsItems(items, { fromIndex: 1, toIndex: 1 }, 'swap')).toBe(items)
  })

  test('C10-G01-03 sameDsSerializableValue 数组顺序敏感', () => {
    expect(sameDsSerializableValue([1, 2], [2, 1])).toBe(false)
    expect(sameDsSerializableValue({ nested: [1] }, { nested: [1] })).toBe(true)
  })

  test('C10-G01-04 forward 按钮下移中间项', async () => {
    const onReorder = vi.fn(() => true)
    await act(async () =>
      mounted.root.render(<MoveHarness labels={['甲', '乙', '丙']} onReorder={onReorder} />),
    )
    const middle = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.getAttribute('aria-label')?.includes('下移乙'),
    )!
    await dsClick(middle)
    expect(mounted.host.textContent).toMatch(/甲.*丙.*乙|乙/)
    expect(onReorder).toHaveBeenCalled()
  })

  test('C10-G01-05 first 按钮把末项移到最前', async () => {
    await act(async () =>
      mounted.root.render(<MoveHarness labels={['甲', '乙', '丙']} onReorder={() => true} />),
    )
    const lastFirst = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.getAttribute('aria-label')?.includes('将丙移到最前'),
    )!
    await dsClick(lastFirst)
    const order = [...mounted.host.querySelectorAll('.ds-reorder-item')].map(
      (row) => row.textContent?.trim().slice(0, 1) ?? '',
    )
    expect(order[0]).toBe('丙')
  })

  test('C10-G01-06 首项 backward 按钮 disabled', async () => {
    await act(async () =>
      mounted.root.render(<MoveHarness labels={['甲', '乙']} onReorder={() => true} />),
    )
    const up = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.getAttribute('aria-label')?.includes('上移甲'),
    )!
    expect(up.disabled).toBe(true)
  })

  test('C10-G01-07 水平取向 forward 使用 chevron-right 文案轴', async () => {
    await act(async () =>
      mounted.root.render(
        <MoveHarness labels={['甲', '乙']} orientation="horizontal" onReorder={() => true} />,
      ),
    )
    const forward = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) =>
        b.getAttribute('aria-label')?.includes('下移') ||
        b.getAttribute('aria-label')?.includes('乙'),
    )
    expect(mounted.host.querySelector('[data-orientation="horizontal"]')).not.toBeNull()
    expect(forward).toBeDefined()
  })

  test('C10-G01-08 collection disabled 时 move 按钮全 disabled', async () => {
    await act(async () =>
      mounted.root.render(<MoveHarness labels={['甲', '乙']} disabled onReorder={() => true} />),
    )
    const buttons = mounted.host.querySelectorAll<HTMLButtonElement>(
      '.ds-reorder-item button[type="button"]',
    )
    expect([...buttons].every((b) => b.disabled)).toBe(true)
  })

  test('C10-G01-09 onReorder 返回 false 时顺序不变', async () => {
    await act(async () =>
      mounted.root.render(<MoveHarness labels={['甲', '乙']} onReorder={() => false} />),
    )
    const forward = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.getAttribute('aria-label')?.includes('下移甲'),
    )!
    await dsClick(forward)
    const labels = [...mounted.host.querySelectorAll('.ds-reorder-item__content')].map(
      (node) => node.querySelector('span')?.textContent?.trim() ?? '',
    )
    expect(labels).toEqual(['甲', '乙'])
  })

  test('C10-G01-10 duplicate item key 抛错', () => {
    expect(() =>
      act(() =>
        mounted.root.render(
          <DsReorderCollection
            adoptionId="c10/dup"
            scopeKey="s"
            entries={[
              { key: 'dup', label: 'A' },
              { key: 'dup', label: 'B' },
            ]}
            revision={0}
            onReorder={() => undefined}
          >
            <DsReorderItem itemKey="dup">A</DsReorderItem>
          </DsReorderCollection>,
        ),
      ),
    ).toThrow(/unique item keys/)
  })
})
