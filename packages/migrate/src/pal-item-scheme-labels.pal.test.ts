import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAuthorItems, validateAuthorScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { assertPalItemSchemeLabelInvariant } from './pal-item-scheme-labels.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function baselineContent() {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('缺 PAL baseline')
  const sceneIds = baseline.files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('PAL baseline scene index 不是数组')
  return {
    items: validateAuthorItems(baseline.files.get('content/items.json')),
    scenes: validateAuthorScenes(
      sceneIds.map((id) => baseline.files.get(`content/scenes/${String(id)}.json`)),
    ),
  }
}

function projectContent() {
  const readJson = (path: string): unknown =>
    JSON.parse(readFileSync(resolve(repo, 'projects/pal', path), 'utf8')) as unknown
  const sceneIds = readJson('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('PAL project scene index 不是数组')
  return {
    items: validateAuthorItems(readJson('content/items.json')),
    scenes: validateAuthorScenes(
      sceneIds.map((id) => readJson(`content/scenes/${String(id)}.json`)),
    ),
  }
}

describe('PAL item scheme author labels', () => {
  test('baseline 与 current 镜像保持 49 个唯一 item root 和确定性作者名', () => {
    const expected = { expectedSchemes: 49, expectedMachineInners: 4, expectedItemRoots: 11 }
    const baseline = assertPalItemSchemeLabelInvariant({ ...baselineContent(), ...expected })
    const project = assertPalItemSchemeLabelInvariant({ ...projectContent(), ...expected })

    expect(baseline).toMatchObject({
      schemes: 49,
      machineInners: 4,
      itemRoots: 11,
      opaqueLabels: 0,
    })
    expect(project.labels).toEqual(baseline.labels)
    const handkerchief = project.labels.filter(({ itemId }) => itemId === '292')
    expect(handkerchief).toHaveLength(13)
    expect(handkerchief.map(({ label }) => label)).toEqual([
      '凤纹手绢剧情方案',
      ...Array.from({ length: 12 }, (_, index) => `凤纹手绢剧情方案 ${index + 2}`),
    ])
  })
})
