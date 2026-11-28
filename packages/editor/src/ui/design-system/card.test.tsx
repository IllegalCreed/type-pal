// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { DsCard } from './index.js'

test('groups the card heading and optional action above the content', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <DsCard title="精灵使用情况" actions={<button type="button">添加用途</button>}>
      <p>已有一个用途。</p>
    </DsCard>,
  )
  const card = host.querySelector('section')!
  expect(card.querySelector('header h2')?.textContent).toBe('精灵使用情况')
  expect(card.querySelector('header button')?.textContent).toBe('添加用途')
  expect(card.querySelector('header')?.nextElementSibling?.textContent).toBe('已有一个用途。')

  host.innerHTML = renderToStaticMarkup(<DsCard>尚无可展示内容。</DsCard>)
  expect(host.querySelector('header')).toBeNull()
  expect(host.querySelector('section')?.textContent).toBe('尚无可展示内容。')
})
