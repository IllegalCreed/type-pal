import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ItemData, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { projectP7CanonicalProject } from './p7-project.js'
import type { ScriptMigrationIRP6 } from './types.js'

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL canonical project assembly',
  () => {
    test('consumes the complete P6 owner ledger into valid v5 scenes and items', () => {
      const ir = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      const target = resolve(shadowRoot, 'target/project/content')
      const sceneIds = JSON.parse(
        readFileSync(resolve(target, 'scenes/index.json'), 'utf8'),
      ) as string[]
      const scenes = sceneIds.map(
        (sceneId) =>
          JSON.parse(
            readFileSync(resolve(target, `scenes/${sceneId}.json`), 'utf8'),
          ) as SceneDef,
      )
      const items = JSON.parse(readFileSync(resolve(target, 'items.json'), 'utf8')) as ItemData[]

      const projected = projectP7CanonicalProject({ ir, scenes, items })

      expect(projected.report).toEqual({
        sceneCount: 294,
        itemCount: 234,
        pageCount: 3_616,
        ownerCount: 4_584,
        entityBehaviorCount: 4_300,
        sceneHookCount: 284,
        simpleOwnerCount: 4_519,
        stateMachineOwnerCount: 65,
        simpleStageCount: 6_396,
        stateMachineStateCount: 771,
        canonicalFlowNodeCount: 7_167,
        itemPrivateScriptCount: 6,
        sharedScriptCount: 0,
      })
      expect(projected.scripts).toEqual({})
      expect(
        projected.scenes.some(
          (scene) => 'onEnter' in scene || 'onTeleport' in scene,
        ),
      ).toBe(false)
      expect(
        projected.scenes.some((scene) =>
          scene.entities.some((entity) =>
            entity.pages?.some(
              (page) =>
                typeof page.trigger === 'object' || typeof page.auto === 'object',
            ),
          ),
        ),
      ).toBe(false)
      const privateItems = projected.items.filter((item) =>
        item.use?.effects.some((effect) => effect.kind === 'itemPrivateScript'),
      )
      expect(privateItems.map((item) => item.id)).toEqual([
        '265',
        '266',
        '267',
        '280',
        '290',
        '293',
      ])
      expect(
        projected.items.some((item) =>
          item.use?.effects.some(
            (effect) =>
              effect.kind === 'runScript' && typeof effect.script !== 'string',
          ),
        ),
      ).toBe(false)
    }, 120_000)
  },
)
