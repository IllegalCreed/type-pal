import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAuthorScenes, validateSprites } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES } from './pal-world-sprite-layouts.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, path), 'utf8'))
}

describe('PAL 大世界视觉语义别名产物', () => {
  test.each([
    'projects/pal/content',
    'packages/migrate/baselines/pal/content',
  ])('%s 只保留稳定视觉定义且 51 个实体仍无 Actor 身份', (contentRoot) => {
    const sprites = validateSprites(readJson(`${contentRoot}/sprites.json`))
    expect(
      sprites.filter(({ id }) =>
        ['sprite-2', 'sprite-3', 'sprite-5', 'sprite-7', 'sprite-26'].includes(id),
      ),
    ).toEqual([])
    expect(
      PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES.map(({ semanticId, references }) => [
        semanticId,
        references.length,
      ]),
    ).toEqual([
      ['li-xiaoyao', 7],
      ['zhao-linger', 6],
      ['lin-yueru', 18],
      ['anu', 11],
      ['gai-luojiao', 9],
    ])

    const sceneIds = new Set(
      PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES.flatMap(({ references }) =>
        references.map(({ sceneId }) => sceneId),
      ),
    )
    const scenes = new Map(
      validateAuthorScenes(
        [...sceneIds].map((sceneId) => readJson(`${contentRoot}/scenes/${sceneId}.json`)),
      ).map((scene) => [scene.id, scene]),
    )
    for (const alias of PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES) {
      const def = sprites.find(({ id }) => id === alias.semanticId)
      expect(def?.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
      for (const { sceneId, entityId } of alias.references) {
        const entity = scenes.get(sceneId)?.entities.find(({ id }) => id === entityId)
        expect(entity, `${contentRoot}/${sceneId}/${entityId}`).toMatchObject({
          sprite: alias.semanticId,
        })
        expect(entity).not.toHaveProperty('actor')
      }
    }
  })
})
