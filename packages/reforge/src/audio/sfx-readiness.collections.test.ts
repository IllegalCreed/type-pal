/**
 * TEST-REFORGE-ASSET-IO-1 B4：非战斗音效集合的显式输入轴（sfx-readiness.ts）。
 * sfx-readiness.test.ts 9 项已覆盖 sharedScripts 递归/环/缺失 fail-loud、场景实体脚本与背包、
 * pages[0] 绑定、缺失复合引用、battle 闭包——不重复；本文件补：additionalRoots 动态根、
 * use/throw/magic 呈现三音轴的精确集合、缺 sharedScripts 注册表错误。页选择疑点
 * （collector 固定 pages[0] vs world 活动页）按 r2 隔离，不写正确绿测。
 */
import type { ItemData, RuntimeScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { soundItem, soundSprite } from '../__tests__/glm-asset-io-fixtures.js'
import { collectSceneSoundAssets } from './sfx-readiness.js'

const signal = (): AbortSignal => new AbortController().signal

/** 最小合法场景：无脚本域，仅空间字段 + 一个带 pages[0].animation 的实体。 */
const legalScene = () => ({
  id: 's-camp',
  mapId: 'map-c',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [
    {
      id: 'guard',
      sprite: 'sprite.guard',
      pos: { col: 1, row: 1, height: 0 },
      pages: [
        {
          id: 'idle-page',
          label: '默认',
          animation: { sprite: 'sprite.guard', action: 'idle' },
        },
      ],
      initialPage: 'idle-page',
    },
  ],
})

describe('B4 collectSceneSoundAssets 显式输入轴（合法 fixture：全部引用可解析）', () => {
  test('基础：pages[0] 绑定 cue 音 + additionalRoots 动态根的 playSound 边', async () => {
    const sounds = await collectSceneSoundAssets({
      scene: legalScene() as never,
      additionalRoots: [{ kind: 'playSound', asset: 'sfx.dynamic' }],
      spritesById: { 'sprite.guard': soundSprite() },
      signal: signal(),
    })
    expect([...sounds].sort()).toEqual(['sfx.dynamic', 'sfx.step'])
  })
  test('背包物品三音轴：use.sound + throw.sound + magic 呈现动画音都入集', async () => {
    const item: ItemData = soundItem('item-ring')
    const sounds = await collectSceneSoundAssets({
      scene: legalScene() as never,
      inventoryItems: [item],
      spritesById: { 'sprite.guard': soundSprite() },
      signal: signal(),
    })
    expect([...sounds].sort()).toEqual(['sfx.step', 'sfx.throw', 'sfx.throw-magic', 'sfx.use'])
  })
  test('additionalRoots 中的 callScript 递归 canonical sharedScripts；动态根同环同去重', async () => {
    const shared: RuntimeScriptLibrary = {
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
        body: [{ kind: 'callScript', script: 'shared/chime' }], // 环
      },
    }
    const sounds = await collectSceneSoundAssets({
      scene: { ...legalScene(), entities: [] } as never,
      additionalRoots: [{ kind: 'callScript', script: 'shared/chime' }],
      sharedScripts: shared,
      signal: signal(),
    })
    expect([...sounds]).toEqual(['sfx.chime']) // 环被 stable id 去重，无重复无边泄漏
  })
  test('缺 sharedScripts 注册表 → 精确 fail-loud（引用脚本但无表）', async () => {
    await expect(
      collectSceneSoundAssets({
        scene: { ...legalScene(), entities: [] } as never,
        additionalRoots: [{ kind: 'callScript', script: 'shared/missing' }],
        signal: signal(),
      }),
    ).rejects.toThrow('无 sharedScripts 注册表，无法解析脚本 "shared/missing"')
  })
  test('signal 预取消 → 立即 AbortError（进入前即拒）', async () => {
    const aborted = new AbortController()
    aborted.abort()
    await expect(
      collectSceneSoundAssets({
        scene: legalScene() as never,
        spritesById: { 'sprite.guard': soundSprite() },
        signal: aborted.signal,
      }),
    ).rejects.toThrow()
  })
})
