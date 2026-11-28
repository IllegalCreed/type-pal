// @vitest-environment jsdom

import type { AuthorCommand, AuthorSceneDef, AuthorScriptLibrary } from '@type-pal/content'
import { act } from 'react'
import { expect, test } from 'vitest'
import {
  catalogMetas,
  setKindFilter,
  setupWorldSpriteLibrarySuite,
} from '../__tests__/world-sprite-library-gestures.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'

const suite = setupWorldSpriteLibrarySuite()
const asset = 'sprite.authored.world-usage'
const definition = 'world-usage'
const target = { scene: 'start', entity: 'scripted-object' }
const specs = [
  {
    asset,
    label: '动作源素材',
    frameCount: 4,
    definitions: [
      {
        id: definition,
        label: '动作对象',
        layout: { kind: 'static' as const },
        poses: { loop: { label: '作者循环', steps: [{ frame: 0, durationMs: 150 }], loopFrom: 0 } },
      },
    ],
  },
]

function scriptedEntity(
  appearance: { sprite: string } | { actor: string },
  body: AuthorCommand[],
): AuthorSceneDef['entities'][number] {
  return {
    id: target.entity,
    ...appearance,
    pos: { col: 2, row: 2, height: 0 },
    initialPage: 'default',
    pages: [{ id: 'default', label: '默认', auto: 'watch' }],
    behaviors: {
      auto: {
        watch: {
          label: '自动行为',
          order: 0,
          flow: { kind: 'stages', initial: 'first', stages: [{ id: 'first', body }] },
        },
      },
    },
  }
}

test.each([
  false,
  true,
])('可复用脚本超过预览深度时，引用页保留可编辑地址（已解析前缀 %s）', async (withPrefix) => {
  const scripts: AuthorScriptLibrary = {}
  for (let level = 1; level <= 17; level++) {
    scripts[`level-${level}`] = {
      name: `调用 ${level}`,
      self: 'none',
      body:
        level === 17
          ? [
              { kind: 'setEntityFrame', target, frame: 1 },
              { kind: 'setEntityFrame', target, frame: 2 },
            ]
          : [{ kind: 'callScript', script: `level-${level + 1}` }],
    }
  }
  const body: AuthorCommand[] = [{ kind: 'callScript', script: 'level-1' }]
  if (withPrefix) body.unshift({ kind: 'setEntityFrame', target, frame: 3 })
  const project = await loadWorldSpriteProject('world-scripted-usage-depth', specs, {
    entities: [scriptedEntity({ sprite: definition }, body)],
    sharedScripts: scripts,
  })
  const canonical = structuredClone(project.canonical)
  const openedSites: SpriteAutomaticScriptInstanceSite[] = []
  const library = await suite.mount(project, {
    focus: definition,
    bindings: {
      canonical: project.canonical,
      onJumpAutomaticScriptInstance: (site) => openedSites.push(site),
    },
  })
  const referenceTab = library.host.querySelector<HTMLButtonElement>(
    '[role="tab"][aria-controls="world-sprite-inspector-panel-references"]',
  )!
  await act(async () => referenceTab.click())
  const panel = library.host.querySelector<HTMLElement>('#world-sprite-inspector-panel-references')!
  expect(panel.hidden).toBe(false)
  const reference = [...panel.querySelectorAll<HTMLButtonElement>('button.ds-reference-row')].find(
    (row) => row.textContent?.includes(`场景 ${target.scene} · 实体 ${target.entity}`),
  )!
  expect(reference.textContent).toContain('实例行为脚本')
  expect(reference.textContent).toContain(
    withPrefix
      ? '目前只能推断部分帧序，请到场景中播放确认。'
      : '暂时无法推断这段脚本的帧序，请到场景中播放确认。',
  )
  expect(reference.textContent).not.toMatch(/安全预算|采样|截断|检测到 #0/)
  expect(library.host.querySelector('.semantic-frame-shelf')?.textContent).not.toContain(
    '实例行为脚本',
  )
  await act(async () => reference.click())
  expect(openedSites).toEqual([
    expect.objectContaining({
      sceneId: target.scene,
      entityId: target.entity,
      spriteId: definition,
      site: `scene:${target.scene}:entity:${target.entity}`,
      via: 'direct',
    }),
  ])
  expect(project.canonical).toEqual(canonical)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('预制循环与角色实例自动脚本分别筛选资源', async () => {
  const project = await loadWorldSpriteProject('world-scripted-usage-filter', specs, {
    entities: [scriptedEntity({ actor: 'hero' }, [{ kind: 'setEntityFrame', target, frame: 1 }])],
  })
  const library = await suite.mount(project, {
    focus: definition,
    bindings: { canonical: project.canonical },
  })
  await setKindFilter(library.host, '含循环动作')
  expect(catalogMetas(library.host)).toEqual([asset])
  await setKindFilter(library.host, '含自动脚本')
  expect(catalogMetas(library.host)).toEqual(['sprite.generated.starter'])
  expect(library.session.getHistoryVersion()).toBe(0)
})

test.each([
  'direct',
  'shared',
  'foreign binding',
])('另一场景同名实体的帧不计入本场景自动行为（%s）', async (source) => {
  const remote = { scene: 'courtyard', entity: target.entity }
  const remotePose: AuthorCommand = { kind: 'setEntityFrame', target: remote, frame: 3 }
  const boundPose: AuthorCommand =
    source === 'direct'
      ? remotePose
      : {
          kind: 'callScript',
          script: 'remote-pose',
          ...(source === 'foreign binding' ? { self: remote } : {}),
        }
  const project = await loadWorldSpriteProject('world-scripted-usage-address', specs, {
    entities: [
      scriptedEntity({ sprite: definition }, [
        { kind: 'setEntityFrame', target, frame: 1 },
        { kind: 'wait', ms: 100 },
        boundPose,
        { kind: 'wait', ms: 180 },
      ]),
    ],
    sharedScripts:
      source === 'direct'
        ? {}
        : {
            'remote-pose': {
              name: '庭院动作',
              self: source === 'foreign binding' ? 'required' : 'none',
              body:
                source === 'foreign binding'
                  ? [{ kind: 'setEntityFrame', target: 'self', frame: 3 }]
                  : [remotePose],
            },
          },
    additionalScenes: [
      {
        id: remote.scene,
        mapId: 'start',
        entry: { pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
        entities: [{ id: remote.entity, sprite: definition, pos: { col: 3, row: 3, height: 0 } }],
      },
    ],
  })
  const library = await suite.mount(project, {
    focus: definition,
    bindings: { canonical: project.canonical, onJumpAutomaticScriptInstance: () => undefined },
  })
  const referenceTab = library.host.querySelector<HTMLButtonElement>(
    '[role="tab"][aria-controls="world-sprite-inspector-panel-references"]',
  )!
  await act(async () => referenceTab.click())
  const panel = library.host.querySelector('#world-sprite-inspector-panel-references')!
  const reference = [...panel.querySelectorAll('button.ds-reference-row')].find((row) =>
    row.textContent?.includes(`场景 ${target.scene} · 实体 ${target.entity}`),
  )!
  expect(reference.textContent).toContain('实例行为脚本')
  expect(reference.textContent).toContain('编辑自动脚本')
  expect(reference.textContent).toContain('移动、显隐或帧切换由这个场景实例的脚本决定')
  expect(reference.textContent).not.toContain('#3')
  expect(library.session.getHistoryVersion()).toBe(0)
})
