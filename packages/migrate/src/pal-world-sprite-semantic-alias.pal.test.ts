import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type EntityDef, isActorEntity, type SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES } from './pal-world-sprite-layouts.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, path), 'utf8')) as unknown
}

describe('PAL 大世界视觉语义别名产物', () => {
  test.each([
    'projects/pal/content',
    'packages/migrate/baselines/pal/content',
  ])('%s 只保留稳定视觉定义且 7 个实体仍无 Actor 身份', (contentRoot) => {
    const sprites = readJson(`${contentRoot}/sprites.json`) as SpriteDef[]
    expect(sprites.some(({ id }) => id === 'sprite-2')).toBe(false)

    for (const alias of PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES)
      for (const { sceneId, entityId } of alias.references) {
        const scene = readJson(`${contentRoot}/scenes/${sceneId}.json`) as {
          entities: EntityDef[]
        }
        const entity = scene.entities.find(({ id }) => id === entityId)
        expect(entity, `${contentRoot}/${sceneId}/${entityId}`).toBeDefined()
        expect(entity).toEqual(expect.objectContaining({ sprite: alias.semanticId }))
        expect(entity && isActorEntity(entity)).toBe(false)
        expect(entity).not.toHaveProperty('actor')
      }
  })
})
