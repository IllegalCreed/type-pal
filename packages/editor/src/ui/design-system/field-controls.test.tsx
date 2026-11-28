// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { unmountHost } from '../../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import {
  DsControlGroup,
  DsDraftTextAreaField,
  DsDraftTextField,
  DsField,
  DsFieldGroup,
  DsIconButton,
  DsSelect,
  DsTextAreaField,
  DsTextField,
  DsTextInput,
} from './index.js'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await unmountHost({ host, root, restoreResourceObservers: restoreAct })
})

test('field wrappers bind author labels and both description sources to the native control', () => {
  const staticHost = document.createElement('div')
  const shared = {
    required: true,
    'aria-describedby': 'shared-guide',
    help: '工程指南中的命名约束',
  }
  staticHost.innerHTML = renderToStaticMarkup(
    <>
      <p id="shared-guide">保存后可在工程目录查看。</p>
      <DsTextField
        {...shared}
        id="sprite-id"
        label="精灵 ID"
        layout="inline"
        defaultValue="sprite-hero"
      />
      <DsTextAreaField {...shared} id="note" label="备注" defaultValue="调试配置" />
      <DsDraftTextField
        {...shared}
        id="skill-label"
        label="法术名称"
        draftKey="skill:healing:name"
        value="凝神归元"
        onCommit={() => undefined}
      />
      <DsDraftTextAreaField
        {...shared}
        label="法术说明"
        draftKey="skill:healing:description"
        value=""
        error="请填写说明"
        onCommit={() => undefined}
      />
    </>,
  )

  const labels = [...staticHost.querySelectorAll('label')]
  const cases = [
    { label: '精灵 ID*', tag: 'INPUT', value: 'sprite-hero', description: shared.help },
    { label: '备注*', tag: 'TEXTAREA', value: '调试配置', description: shared.help },
    { label: '法术名称*', tag: 'INPUT', value: '凝神归元', description: shared.help },
    { label: '法术说明*', tag: 'TEXTAREA', value: '', description: '请填写说明', error: true },
  ]
  expect(labels.map((label) => label.textContent)).toEqual(cases.map(({ label }) => label))
  expect(
    staticHost.querySelector('[data-field-id="sprite-id"]')?.classList.contains('ds-field--inline'),
  ).toBe(true)
  for (const { label, tag, value, description, error } of cases) {
    const input = labels.find((element) => element.textContent === label)?.control
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement))
      throw new Error(`Missing native field for ${label}`)
    expect(input.required).toBe(true)
    expect(input.tagName).toBe(tag)
    expect(input.value).toBe(value)
    const descriptionId = `${input.id}-description`
    expect(input.getAttribute('aria-describedby')).toBe(`shared-guide ${descriptionId}`)
    const support = staticHost.querySelector(`[id="${descriptionId}"]`)
    expect(support?.textContent).toBe(description)
    expect(input.getAttribute('aria-invalid')).toBe(error ? 'true' : null)
    expect(support?.getAttribute('role')).toBe(error ? 'alert' : null)
  }
})

test('字段的低频概念说明可放在标签旁帮助问号，不占用常驻支持行', async () => {
  await act(async () =>
    root.render(
      <DsField
        id="asset-role"
        label="标题菜单音乐"
        help={{
          label: '标题菜单音乐',
          content: '必选资源角色：audio.openingMenuMusic；需要音乐资源。',
        }}
      >
        {(field) => <DsTextInput {...field} />}
      </DsField>,
    ),
  )

  const input = host.querySelector<HTMLInputElement>('#asset-role')!
  const helpButton = host.querySelector<HTMLButtonElement>('button[aria-label="标题菜单音乐说明"]')!
  expect(input.getAttribute('aria-describedby')).toBeNull()
  expect(host.querySelector('.ds-field__help')).toBeNull()
  expect(helpButton.closest('.ds-field__label-group')).not.toBeNull()
  expect(document.getElementById(helpButton.getAttribute('aria-describedby')!)?.textContent).toBe(
    '必选资源角色：audio.openingMenuMusic；需要音乐资源。',
  )

  await act(async () =>
    root.render(
      <DsField
        id="asset-role"
        label="标题菜单音乐"
        error="请选择可用音乐"
        help={{
          label: '标题菜单音乐',
          content: '必选资源角色：audio.openingMenuMusic；需要音乐资源。',
        }}
      >
        {(field) => <DsTextInput {...field} />}
      </DsField>,
    ),
  )
  expect(
    host.querySelector<HTMLInputElement>('#asset-role')?.getAttribute('aria-describedby'),
  ).toBe('asset-role-description')
  expect(host.querySelector('.ds-field__error')?.textContent).toBe('请选择可用音乐')
  expect(host.querySelector('button[aria-label="标题菜单音乐说明"]')).not.toBeNull()
})

test('groups related fields on one responsive label track without changing field semantics', async () => {
  await act(async () =>
    root.render(
      <DsFieldGroup>
        <DsField id="field-group-label" label="标签" help="用于列表显示">
          {(field) => <DsTextInput {...field} defaultValue="新的故事" />}
        </DsField>
        <DsField id="field-group-video" label="入口视频资源" error="请选择可用视频">
          {(field) => <DsTextInput {...field} defaultValue="video.pal.003" />}
        </DsField>
      </DsFieldGroup>,
    ),
  )

  const group = host.querySelector<HTMLElement>('[data-ds-field-group]')
  expect(group?.dataset.layout).toBe('responsive')
  expect(group?.dataset.labelTrack).toBe('default')
  expect(group?.querySelectorAll(':scope > .ds-field')).toHaveLength(2)
  expect(group?.querySelector<HTMLLabelElement>('label[for="field-group-label"]')).not.toBeNull()
  expect(
    group?.querySelector<HTMLInputElement>('#field-group-label')?.getAttribute('aria-describedby'),
  ).toBe('field-group-label-description')
  expect(
    group?.querySelector<HTMLInputElement>('#field-group-video')?.getAttribute('aria-invalid'),
  ).toBe('true')

  await act(async () =>
    root.render(
      <DsFieldGroup labelTrack="wide">
        <DsField
          id="field-group-wide"
          label="特殊战胜利结算音乐"
          required
          error="请选择可用音乐"
          help={{ label: '特殊战胜利结算音乐', content: '宽标签帮助内容' }}
        >
          {(field) => <DsTextInput {...field} defaultValue="music.special-victory" />}
        </DsField>
      </DsFieldGroup>,
    ),
  )
  const wideGroup = host.querySelector<HTMLElement>('[data-ds-field-group]')!
  const wideInput = wideGroup.querySelector<HTMLInputElement>('#field-group-wide')!
  expect(wideGroup.dataset.layout).toBe('responsive')
  expect(wideGroup.dataset.labelTrack).toBe('wide')
  expect(wideGroup.querySelector('label')?.htmlFor).toBe(wideInput.id)
  expect(wideInput.getAttribute('aria-describedby')).toBe('field-group-wide-description')
  expect(wideInput.getAttribute('aria-invalid')).toBe('true')
  expect(wideGroup.querySelector('button[aria-label="特殊战胜利结算音乐说明"]')).not.toBeNull()

  await act(async () =>
    root.render(
      <DsFieldGroup layout="stacked">
        <DsField label="整组上下排列">
          <DsTextInput aria-label="整组上下排列" />
        </DsField>
      </DsFieldGroup>,
    ),
  )
  expect(host.querySelector('[data-ds-field-group]')?.getAttribute('data-layout')).toBe('stacked')
  expect(host.querySelector('[data-ds-field-group]')?.getAttribute('data-label-track')).toBe(
    'default',
  )
})

test('control groups preserve separate leading media, actual control and labelled actions', async () => {
  await act(async () =>
    root.render(
      <DsControlGroup
        leading={<span>音频缩略标志</span>}
        control={
          <DsSelect
            aria-label="特效音"
            value="335"
            options={[{ value: '335', label: 'PAL 音效 335' }]}
            onValueChange={() => undefined}
          />
        }
        actions={
          <>
            <DsIconButton label="试听" icon="play" variant="secondary" />
            <DsIconButton label="打开" icon="open" variant="secondary" size="compact" />
          </>
        }
      />,
    ),
  )
  const group = host.querySelector('.ds-control-group')!
  expect(group.querySelector('.ds-control-group__leading')?.textContent).toBe('音频缩略标志')
  expect(group.querySelector('.ds-control-group__control > [role="combobox"]')?.textContent).toBe(
    'PAL 音效 335',
  )
  const actions = group.querySelector('.ds-control-group__actions')!
  expect(actions.querySelector('[aria-label="试听"]')?.classList).toContain(
    'ds-icon-button--secondary',
  )
  expect(actions.querySelector('[aria-label="打开"]')?.classList).toContain(
    'ds-icon-button--compact',
  )
})
