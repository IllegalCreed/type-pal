import type { RuntimeCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import { collectScriptSoundAssets } from './sfx-readiness.js'

const firstRoot: RuntimeCommand = { kind: 'playSound', asset: 'sfx.first' }
const actionRoot: RuntimeCommand = {
  kind: 'playEntityAction',
  target: { scene: 'inn', entity: 'keeper' },
  sprite: 'sprite.keeper',
  action: 'idle',
  loop: true,
}

test('取消时不会访问下一条具有错误的音效命令根', async () => {
  const controller = new AbortController()
  const collected = collectScriptSoundAssets([firstRoot, actionRoot], undefined, controller.signal)
  // The first visit runs synchronously up to the await between roots.
  controller.abort()
  await expect(collected).rejects.toMatchObject({ name: 'AbortError' })
})

test('未取消时下一条根会报告缺少精灵注册表', async () => {
  await expect(
    collectScriptSoundAssets([firstRoot, actionRoot], undefined, new AbortController().signal),
  ).rejects.toThrow('SFX readiness root[1]: 无 sprites 注册表，无法解析动作音效')
})

test('多条合法根都进入音效工作集', async () => {
  const secondRoot: RuntimeCommand = { kind: 'playSound', asset: 'sfx.second' }
  const collected = collectScriptSoundAssets(
    [firstRoot, secondRoot],
    undefined,
    new AbortController().signal,
  )
  await expect(collected).resolves.toEqual(new Set(['sfx.first', 'sfx.second']))
})
