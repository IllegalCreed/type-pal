import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { FileSource } from '@type-pal/reforge'
import { loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { type ScriptEditorState, ScriptEditSession } from '../src/core/script-editor.js'

const projectRoot = resolve(import.meta.dirname, '../../../projects/pal')

function projectFile(rel: string): string {
  const path = resolve(projectRoot, rel)
  if (path !== projectRoot && !path.startsWith(`${projectRoot}/`))
    throw new Error(`PAL test source path escapes project root: ${rel}`)
  return path
}

function palSource(): FileSource {
  return {
    async readText(rel) {
      return readFile(projectFile(rel), 'utf8')
    },
    async readJson<T>(rel: string) {
      return JSON.parse(await readFile(projectFile(rel), 'utf8')) as T
    },
    async readBytes(rel) {
      return Uint8Array.from(await readFile(projectFile(rel))).buffer
    },
    async urlFor(rel) {
      return pathToFileURL(projectFile(rel)).href
    },
  }
}

function collectZoneFacingTargets(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectZoneFacingTargets)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const targets =
    record.kind === 'setEntityFacing' && record.target && typeof record.target === 'object'
      ? [
          `${String((record.target as Record<string, unknown>).scene)}/${String(
            (record.target as Record<string, unknown>).entity,
          )}`,
        ]
      : []
  return targets.concat(Object.values(record).flatMap(collectZoneFacingTargets))
}

describe('PAL editor boot smoke', () => {
  test('loads every canonical scene and preserves s056/e940 source-derived facing commands', async () => {
    const project = await loadCurrentProjectFrom(palSource())
    const scenes = await loadAllAuthorScenes(project)
    const canonical: ScriptEditorState = {
      scenes: structuredClone(scenes),
      items: structuredClone(project.authorContent.items) as ScriptEditorState['items'],
      sharedScripts: structuredClone(
        project.authorContent.sharedScripts,
      ) as ScriptEditorState['sharedScripts'],
    }

    const session = new ScriptEditSession(canonical)
    const e940 = session
      .getState()
      .scenes.find((scene) => scene.id === 's056')
      ?.entities.find((entity) => entity.id === 'e940')
    expect(e940 && 'zone' in e940).toBe(true)
    expect(collectZoneFacingTargets(e940)).toEqual(Array(4).fill('s056/e940'))
  })
})
