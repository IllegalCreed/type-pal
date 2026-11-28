// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { DsEmptyState, DsStatus } from './index.js'

test('feedback uses a live status for progress and an alert for failure', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsStatus tone="warning">资源仍在读取。</DsStatus>
      <DsStatus tone="error" action={<button type="button">重试读取</button>}>
        找不到技能图像。
      </DsStatus>
    </>,
  )
  expect(host.querySelector('[role="status"]')?.textContent).toBe('资源仍在读取。')
  const failure = host.querySelector('[role="alert"]')!
  expect(failure.querySelector('span')?.textContent).toBe('找不到技能图像。')
  expect(failure.querySelector('button')?.textContent).toBe('重试读取')
})

test('empty-state layout follows the context heading and keeps the supplied action', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsEmptyState
        title="没有素材"
        description="上传一张精灵图。"
        action={<button type="button">上传素材</button>}
      />
      <DsEmptyState layout="embedded" title="暂无初始道具" description="可从右上角添加。" />
    </>,
  )
  const pageEmpty = host.querySelector('[data-layout="card"]')!
  expect(pageEmpty.querySelector('h2')?.textContent).toBe('没有素材')
  expect(pageEmpty.querySelector('p')?.textContent).toBe('上传一张精灵图。')
  expect(pageEmpty.querySelector('button')?.textContent).toBe('上传素材')
  const collectionEmpty = host.querySelector('[data-layout="embedded"]')!
  expect(collectionEmpty.querySelector('h4')?.textContent).toBe('暂无初始道具')
  expect(collectionEmpty.querySelector('p')?.textContent).toBe('可从右上角添加。')
  expect(collectionEmpty.classList.contains('ds-empty-state--embedded')).toBe(true)
})
