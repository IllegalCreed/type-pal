import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAuthorItems, validateAuthorScenes, validateSceneIndex } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { inspectPalItemSchemeRoots } from './pal-item-scheme-labels.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function baselineContent() {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('缺 PAL baseline')
  const sceneIndex = validateSceneIndex(baseline.files.get('content/scenes/index.json'))
  return {
    items: validateAuthorItems(baseline.files.get('content/items.json')),
    scenes: validateAuthorScenes(sceneIndex.scenes.map((entry) => baseline.files.get(entry.path))),
  }
}

function projectContent() {
  const readJson = (path: string): unknown =>
    JSON.parse(readFileSync(resolve(repo, 'projects/pal', path), 'utf8')) as unknown
  const sceneIndex = validateSceneIndex(readJson('content/scenes/index.json'))
  return {
    items: validateAuthorItems(readJson('content/items.json')),
    scenes: validateAuthorScenes(sceneIndex.scenes.map((entry) => readJson(entry.path))),
  }
}

describe('PAL item scheme author labels', () => {
  test('canonical baseline and current author content retain the same 49 rooted schemes', () => {
    const expected = { expectedSchemes: 49, expectedItemRoots: 11 }
    const baseline = inspectPalItemSchemeRoots({ ...baselineContent(), ...expected })
    const current = projectContent()
    const before = structuredClone(current)
    const project = inspectPalItemSchemeRoots({ ...current, ...expected })

    expect(baseline).toMatchObject({
      schemes: 49,
      itemRoots: 11,
      opaqueLabels: 0,
    })
    expect(project).toMatchObject({
      schemes: 49,
      itemRoots: 11,
      opaqueLabels: 0,
    })
    const authoredNames = new Map([
      ['scenes.s001.entities.e19.behaviors.trigger.c8-74bc98f07f8e', '赠酒后：给钱托逍遥买鲜虾'],
      ['scenes.s003.entities.e62.behaviors.trigger.c8-321c0a7d7de1', '赠桂花酒：约定山神庙学剑'],
    ])
    expect(baseline.labels.filter((entry) => authoredNames.has(entry.path))).toHaveLength(2)
    expect(project.labels).toEqual(
      baseline.labels.map((entry) => ({
        ...entry,
        label: authoredNames.get(entry.path) ?? entry.label,
      })),
    )
    expect(current).toEqual(before)
    const handkerchief = project.labels.filter(({ itemId }) => itemId === '292')
    expect(handkerchief).toHaveLength(13)
    expect(handkerchief.map(({ label }) => label)).toEqual([
      '凤纹手绢剧情方案',
      ...Array.from({ length: 12 }, (_, index) => `凤纹手绢剧情方案 ${index + 2}`),
    ])
  })

  test('current author-name auditing still rejects an actual item root selecting a missing scheme', () => {
    const current = projectContent()
    const root = current.items
      .flatMap((item) => item.use?.effects ?? [])
      .find((effect) => effect.kind === 'itemPrivateScript')
    if (root?.kind !== 'itemPrivateScript') throw new Error('actual PAL item root missing')
    root.script.body = [
      {
        kind: 'selectEntityBehavior',
        target: { scene: 's001', entity: 'e19' },
        channel: 'trigger',
        selection: { kind: 'use', value: 'missing-author-scheme' },
      },
    ]
    expect(() =>
      inspectPalItemSchemeRoots({
        ...current,
        expectedSchemes: 49,
        expectedItemRoots: 11,
      }),
    ).toThrow('PAL 物品剧情方案悬空引用')
  })
})
