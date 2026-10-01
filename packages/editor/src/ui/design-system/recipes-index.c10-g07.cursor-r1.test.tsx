// @vitest-environment jsdom
/** C10-G07 collection-search/recipes/feedback/status/buttons/icons/index 剩余合同。 */
import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createDsHost,
  type DsMountedHost,
  dsClick,
  installDsRafStub,
  unmountDsHost,
} from '../../__tests__/cursor-asset-r1/design-system-harness.js'
import { DsButton, DsPressable } from './buttons.js'
import { DS_OPTION_VIRTUALIZE_ABOVE, filterDsCollection } from './collection-search.js'
import { classes, describedBy } from './control-utils.js'
import { DsTextInput } from './controls.js'
import { DsEmptyState, DsStatus } from './feedback.js'
import { DsIconButton } from './icon-button.js'
import { DsIcon } from './icons.js'
import { EDITOR_DESIGN_SYSTEM_VERSION } from './index.js'
import { DsFilePicker } from './native-inputs.js'
import { DsInlineComposer, DsSequenceIndex } from './recipes.js'
import { DsReadonlyValue, DsTag } from './status-values.js'

let mounted: DsMountedHost

beforeEach(() => {
  installDsRafStub(vi)
  mounted = createDsHost()
})

afterEach(async () => {
  await unmountDsHost(mounted)
  vi.unstubAllGlobals()
})

describe('C10-G07 collection-search 与 index', () => {
  test('C10-G07-01 filterDsCollection 空 query 返回原引用', () => {
    const items = [{ id: 'a' }]
    expect(filterDsCollection(items, '  ', (i) => [i.id])).toBe(items)
  })

  test('C10-G07-02 filterDsCollection 大小写不敏感子串', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]
    expect(filterDsCollection(items, 'ALP', (i) => [i.label]).map((i) => i.id)).toEqual(['a'])
  })

  test('C10-G07-03 DS_OPTION_VIRTUALIZE_ABOVE 为 80', () => {
    expect(DS_OPTION_VIRTUALIZE_ABOVE).toBe(80)
  })

  test('C10-G07-04 EDITOR_DESIGN_SYSTEM_VERSION  semver 形态', () => {
    expect(EDITOR_DESIGN_SYSTEM_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('C10-G07-05 control-utils describedBy 合并多 id', () => {
    expect(describedBy('a', 'b')).toBe('a b')
    expect(classes('a', false, 'b')).toBe('a b')
  })
})

describe('C10-G07 展示与原生输入', () => {
  test('C10-G07-06 DsTag tone 渲染 modifier class', () => {
    const html = renderToStaticMarkup(<DsTag tone="danger">错误</DsTag>)
    expect(html).toContain('ds-tag--danger')
  })

  test('C10-G07-07 DsReadonlyValue monospace class', () => {
    const html = renderToStaticMarkup(<DsReadonlyValue monospace>/a/b</DsReadonlyValue>)
    expect(html).toContain('ds-readonly-value--monospace')
    expect(html).toContain('/a/b')
  })

  test('C10-G07-08 DsStatus 与 DsEmptyState 渲染角色文案', async () => {
    await act(async () =>
      mounted.root.render(
        <>
          <DsStatus tone="warning">等待</DsStatus>
          <DsEmptyState title="空" description="暂无数据" />
        </>,
      ),
    )
    expect(mounted.host.textContent).toContain('等待')
    expect(mounted.host.textContent).toContain('暂无数据')
  })

  test('C10-G07-09 DsButton busy 禁用并显示处理中', async () => {
    await act(async () => mounted.root.render(<DsButton busy>保存</DsButton>))
    const btn = mounted.host.querySelector('button')!
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('处理中')
  })

  test('C10-G07-10 DsFilePicker disabled 加 is-disabled', () => {
    const html = renderToStaticMarkup(
      <DsFilePicker label="上传" disabled onChange={() => undefined} />,
    )
    expect(html).toContain('is-disabled')
  })
})

describe('C10-G07 recipes 与 icons', () => {
  test('C10-G07-11 DsSequenceIndex 渲染 value 与可读标签', async () => {
    await act(async () =>
      mounted.root.render(<DsSequenceIndex value={2} accessibleLabel="第 2 帧" />),
    )
    expect(mounted.host.textContent).toContain('2')
    expect(mounted.host.textContent).toContain('第 2 帧')
  })

  test('C10-G07-12 DsInlineComposer 渲染 control 与 action 槽', async () => {
    await act(async () =>
      mounted.root.render(
        <DsInlineComposer
          density="compact"
          control={<DsTextInput aria-label="名称" />}
          action={<DsIconButton label="添加" icon="add" onClick={() => undefined} />}
        />,
      ),
    )
    expect(mounted.host.querySelector('[aria-label="名称"]')).not.toBeNull()
    expect(mounted.host.querySelector('[aria-label="添加"]')).not.toBeNull()
  })

  test('C10-G07-13 DsIcon 渲染 svg 且 aria-hidden', () => {
    const html = renderToStaticMarkup(<DsIcon name="save" />)
    expect(html).toContain('<svg')
    expect(html).toContain('aria-hidden="true"')
  })

  test('C10-G07-14 DsPressable 默认 type=button', () => {
    const html = renderToStaticMarkup(<DsPressable>点</DsPressable>)
    expect(html).toContain('type="button"')
    expect(html).toContain('ds-pressable')
  })

  test('C10-G07-15 DsIconButton 点击触发 onClick', async () => {
    const onClick = vi.fn()
    await act(async () =>
      mounted.root.render(<DsIconButton label="关闭" icon="close" onClick={onClick} />),
    )
    await dsClick(mounted.host.querySelector('button')!)
    expect(onClick).toHaveBeenCalled()
  })
})
