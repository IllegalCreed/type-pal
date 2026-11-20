import type { RuntimeCommand, RuntimeSceneDef, RuntimeScriptLibrary } from '@type-pal/content'
import { expect, test } from 'vitest'
import { soundSprite } from '../__tests__/glm-asset-io-fixtures.js'
import { collectSceneSoundAssets } from './sfx-readiness.js'

const emptyScene: RuntimeSceneDef = {
  id: 's-camp',
  mapId: 'map-c',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

const guardScene: RuntimeSceneDef = {
  ...emptyScene,
  entities: [
    {
      id: 'guard',
      sprite: 'sprite.guard',
      pos: { col: 1, row: 1, height: 0 },
      pages: [
        {
          id: 'idle-page',
          label: '默认',
          animation: { sprite: 'sprite.guard', action: 'idle', loop: true },
        },
      ],
      initialPage: 'idle-page',
    },
  ],
}

test('场景工作集包含实体当前唯一页的音效和显式动态根', async () => {
  const dynamicCommand: RuntimeCommand = { kind: 'playSound', asset: 'sfx.dynamic' }
  const sounds = await collectSceneSoundAssets({
    scene: guardScene,
    additionalRoots: [dynamicCommand],
    spritesById: { 'sprite.guard': soundSprite() },
    signal: new AbortController().signal,
  })
  expect(sounds).toEqual(new Set(['sfx.dynamic', 'sfx.step']))
})

test('场景的动态调用根收集共享脚本的音效并终止循环引用', async () => {
  const sharedScripts: RuntimeScriptLibrary = {
    'shared/chime': {
      name: '铃',
      self: 'none',
      body: [
        { kind: 'playSound', asset: 'sfx.chime' },
        { kind: 'callScript', script: 'shared/echo' },
      ],
    },
    'shared/echo': {
      name: '回声',
      self: 'none',
      body: [
        { kind: 'playSound', asset: 'sfx.echo' },
        { kind: 'callScript', script: 'shared/chime' },
      ],
    },
  }
  const root: RuntimeCommand = { kind: 'callScript', script: 'shared/chime' }
  const sounds = await collectSceneSoundAssets({
    scene: emptyScene,
    additionalRoots: [root],
    sharedScripts,
    signal: new AbortController().signal,
  })
  expect(sounds).toEqual(new Set(['sfx.chime', 'sfx.echo']))
})

test('动态根引用共享脚本但没有注册表时报告缺失原因', async () => {
  const root: RuntimeCommand = { kind: 'callScript', script: 'shared/missing' }
  await expect(
    collectSceneSoundAssets({
      scene: emptyScene,
      additionalRoots: [root],
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('无 sharedScripts 注册表，无法解析脚本 "shared/missing"')
})

test('预取消的场景收集以 AbortError 拒绝', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    collectSceneSoundAssets({
      scene: guardScene,
      spritesById: { 'sprite.guard': soundSprite() },
      signal: controller.signal,
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
})
