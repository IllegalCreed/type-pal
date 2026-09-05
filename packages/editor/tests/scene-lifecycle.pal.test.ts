import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { collectCommandTargetReferences } from '@type-pal/content'
import {
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { toEditorState } from '../src/core/project-io.js'
import { projectReferenceSourceSceneId } from '../src/core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../src/core/project-reference-adapters.js'

const root = resolve(import.meta.dirname, '../../../projects/pal')
const source: FileSource = {
  async readText(path) {
    return readFileSync(resolve(root, path), 'utf8')
  },
  async readJson<T>(path: string) {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T
  },
  async readBytes(path) {
    const bytes = readFileSync(resolve(root, path))
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  },
  async urlFor(path) {
    return path
  },
}

test('s108 的 6,897 条 self 引用全部由 deletion scope 排除，只留下真实外部 blocker', async () => {
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const shell = toEditorState(project, scenes, {}, {}, await loadStampTemplates(project))
  const canonical = {
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }
  const s108 = scenes.find((scene) => scene.id === 's108')!
  const selfReferences = collectCommandTargetReferences(s108, 'scene:s108').filter((reference) => {
    switch (reference.target.kind) {
      case 'scene':
        return reference.target.id === 's108'
      case 'scene-entry':
      case 'scene-hook':
      case 'entity':
        return reference.target.sceneId === 's108'
      default:
        return false
    }
  })
  expect(selfReferences).toHaveLength(6897)

  const index = collectCurrentProjectReferenceIndex(shell, canonical)
  const target = { kind: 'scene' as const, id: 's108' }
  const impact = index.deletionImpact(target, index.deletionScopeFor([target]))
  expect(impact.blockers.length).toBeGreaterThan(0)
  expect(
    impact.blockers.filter((edge) => projectReferenceSourceSceneId(edge.source) === 's108'),
  ).toEqual([])
  expect(
    impact.blockers.every((edge) => {
      switch (edge.target.kind) {
        case 'scene':
          return edge.target.id === 's108'
        case 'scene-entry':
        case 'scene-hook':
        case 'entity':
          return edge.target.sceneId === 's108'
        default:
          return false
      }
    }),
  ).toBe(true)
})
