// @vitest-environment jsdom
import { expect, test } from 'vitest'
import {
  A_IDLE,
  A_SHARED,
  openImportPanel,
  openTab,
  setupBattleSuite,
  uploaderPicker,
  waitProof,
} from '../__tests__/battle-sprite-library-gestures.js'
import { loadBattleSpriteProject } from '../__tests__/battle-sprite-project.js'
import type { EditorState } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'

const suite = setupBattleSuite()

test('完成真实帧解码后打开导入，两个面板复用同一个滚动内容根', async () => {
  const mounted = await suite.mount('battle-workspace-import', { focus: 'shared-fighter-a' })
  await waitProof(mounted.host, 12, 2)
  const ready = verifyCanonicalObjectWorkspace(mounted.host, '战斗精灵工作区', { tagName: 'DIV' })
  expect(
    ready.content.querySelectorAll('[aria-label="全部源帧"] [data-source-frame-index]'),
  ).toHaveLength(12)

  await openImportPanel(mounted.host)
  const uploading = verifyCanonicalObjectWorkspace(mounted.host, '战斗精灵工作区', {
    tagName: 'DIV',
  })
  expect(uploading.content).toBe(ready.content)
  expect(uploading.content.contains(uploaderPicker(mounted.host))).toBe(true)
  expect(uploading.content.querySelector('[data-source-frame-index]')).toBeNull()
})

test('合法工程没有战斗精灵时，空提示仍由唯一工作区内容根持有', async () => {
  const project = await loadBattleSpriteProject('battle-workspace-empty', [])
  const previous = project.state
  const [firstEntry, ...otherEntries] = previous.manifest.entryPoints
  const withoutParty = (entry: typeof firstEntry) => ({
    ...entry,
    startWorld: { ...entry.startWorld, party: [] },
  })
  const state: EditorState = {
    ...previous,
    actors: previous.actors.map((actor) => ({ ...actor, battler: undefined })),
    manifest: {
      ...previous.manifest,
      entryPoints: [withoutParty(firstEntry), ...otherEntries.map(withoutParty)],
    },
    battleSprites: [],
    assetCatalog: {
      ...previous.assetCatalog,
      assets: Object.fromEntries(
        Object.entries(previous.assetCatalog.assets).filter(
          ([, record]) => record.kind !== 'battle-sprite',
        ),
      ),
    },
  }
  assertProjectSaveValid(state)
  const mounted = await suite.mountProject({ ...project, state }, { view: 'asset' })
  const empty = verifyCanonicalObjectWorkspace(mounted.host, '战斗精灵工作区', { tagName: 'DIV' })
  expect(empty.content.textContent).toContain('没有可预览的战斗精灵')
  expect(empty.content.querySelector('canvas')).toBeNull()
})

test('已登记的未配置源帧能独立预览，保持其源文件归属', async () => {
  const mounted = await suite.mount('battle-workspace-raw-source', { view: 'asset', focus: A_IDLE })
  await waitProof(mounted.host, 4, 0)
  const { content } = verifyCanonicalObjectWorkspace(mounted.host, '战斗精灵工作区', {
    tagName: 'DIV',
  })
  expect(content.querySelectorAll('[data-source-frame-index]')).toHaveLength(4)
  expect(mounted.host.querySelector('.inspector')?.textContent).not.toContain('召唤现身')
  expect(
    mounted.session.getState().battleSprites.some((definition) => definition.asset === A_IDLE),
  ).toBe(false)
})

test('检查器的共享页签保留键盘导航、可访问名称及面板关联', async () => {
  const mounted = await suite.mount('battle-workspace-inspector-tabs', {
    focus: 'shared-fighter-a',
  })
  await verifyInspectorTabs(mounted.host, '战斗精灵检查器', ['动作', /^引用 \d+$/, '源文件'])
})

test('源文件检查器显示当前真实帧容器的路径及 SHA，并使用共享文本控件', async () => {
  const mounted = await suite.mount('battle-workspace-source-metadata', {
    focus: 'shared-fighter-a',
  })
  const seed = mounted.project.seeded.get(A_SHARED)
  if (!seed) throw new Error('缺少合法的共享帧资源')
  await openTab(mounted.host, '源文件')
  const values = [
    ...mounted.host.querySelectorAll<HTMLElement>('.ds-overflow-text.ds-inspector-readonly'),
  ]
  expect(values.map((value) => value.textContent)).toEqual([seed.asset, seed.path, seed.sha256])
  expect(values.every((value) => !value.hasAttribute('title'))).toBe(true)
})
