import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ItemData, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
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
          JSON.parse(readFileSync(resolve(target, `scenes/${sceneId}.json`), 'utf8')) as SceneDef,
      )
      const items = JSON.parse(readFileSync(resolve(target, 'items.json'), 'utf8')) as ItemData[]
      const sourceCommands = (
        JSON.parse(
          readFileSync(resolve(process.cwd(), '../../data/extracted/events/all.json'), 'utf8'),
        ) as { segments: Array<{ commands: SourceCmd[] }> }
      ).segments.flatMap((segment) => segment.commands)
      const sourceAudit = JSON.parse(
        readFileSync(resolve(process.cwd(), 'baselines/script-control-flow/pal-v1.json'), 'utf8'),
      ) as ScriptControlFlowAuditV1

      const projected = projectP7CanonicalProject({
        ir,
        scenes,
        items,
        sourceCommands,
        sourceAudit,
      })

      expect(projected.report).toEqual({
        sceneCount: 294,
        itemCount: 234,
        pageCount: 3_616,
        ownerCount: 4_584,
        entityBehaviorCount: 4_300,
        sceneHookCount: 284,
        simpleOwnerCount: 4_497,
        stateMachineOwnerCount: 87,
        simpleStageCount: 6_728,
        stateMachineStateCount: 1_190,
        canonicalFlowNodeCount: 7_918,
        itemPrivateScriptCount: 6,
        sharedScriptCount: 0,
      })
      expect(projected.autoLifecycle).toMatchObject({
        inputPool: 1_051,
        summary: {
          terminal: 354,
          repeat: 690,
          idleGate: 7,
          invalid: 0,
          repeatRoot: 668,
          prefixTail: 20,
          complexRepeat: 2,
        },
        digest: 'def96ee2882d12329ae6b40425f21c5bfbae66369f3638487a93ae168766e46a',
      })
      expect(projected.scripts).toEqual({})
      expect(projected.scenes.some((scene) => 'onEnter' in scene || 'onTeleport' in scene)).toBe(
        false,
      )
      expect(
        projected.scenes.some((scene) =>
          scene.entities.some((entity) =>
            entity.pages?.some(
              (page) => typeof page.trigger === 'object' || typeof page.auto === 'object',
            ),
          ),
        ),
      ).toBe(false)
      const dynamicOnlyEntities = projected.scenes.flatMap((scene) =>
        scene.entities.filter(
          (entity) => entity.pages === undefined && entity.behaviors !== undefined,
        ),
      )
      expect(dynamicOnlyEntities).toHaveLength(125)
      expect(
        projected.scenes
          .find((scene) => scene.id === 's001')
          ?.entities.find((entity) => entity.id === 'e8')?.behaviors?.trigger?.['legacy-001'],
      ).toBeDefined()
      const entryStages = projected.scenes.flatMap((scene) =>
        Object.values(scene.hooks?.onEnter?.variants ?? {}).flatMap((hook) =>
          hook.flow.kind === 'stages'
            ? hook.flow.stages.flatMap((stage) =>
                stage.entry ? [{ scene: scene.id, hook, stage }] : [],
              )
            : [],
        ),
      )
      expect(entryStages.map((entry) => entry.scene).sort()).toEqual([
        's001',
        's018',
        's057',
        's090',
        's151',
        's180',
        's182',
        's196',
        's197',
        's198',
        's200',
      ])
      expect(
        entryStages.find((entry) => entry.scene === 's182')?.stage.entry?.reveal,
      ).toMatchObject({
        kind: 'dither',
        source: 'previousPresentedFrame',
      })
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
            (effect) => effect.kind === 'runScript' && typeof effect.script !== 'string',
          ),
        ),
      ).toBe(false)

      const deerAuto = projected.scenes
        .find((scene) => scene.id === 's048')
        ?.entities.find((entity) => entity.id === 'e796')?.behaviors?.auto
      expect(deerAuto).toBeDefined()
      for (let index = 1; index <= 6; index++) {
        const flow = deerAuto?.[`legacy-00${index}`]?.flow
        expect(flow?.kind).toBe('stages')
        if (flow?.kind !== 'stages') continue
        expect(flow.stages.map((stage) => stage.id)).toEqual(['initial', 'completed'])
        expect(flow.stages[0]?.next).toBe('completed')
        expect(flow.stages[1]?.body).toEqual([])
      }
      const deerPatrol = deerAuto?.['legacy-007']?.flow
      expect(deerPatrol?.kind).toBe('stateMachine')
      if (deerPatrol?.kind === 'stateMachine') {
        expect(deerPatrol.machine.cadence).toBe('transition')
        expect(deerPatrol.machine.initial).toBe('source-10448')
        expect(deerPatrol.machine.states['source-10451']?.next).toEqual({
          kind: 'to',
          state: 'source-10452',
          yield: 'worldTick',
        })
        expect(deerPatrol.machine.states['source-10452']?.next).toEqual({
          kind: 'continue',
          state: 'source-10451',
        })
      }

      const deerHerdAuto = projected.scenes
        .find((scene) => scene.id === 's082')
        ?.entities.find((entity) => entity.id === 'e1568')?.behaviors?.auto?.['legacy-001']?.flow
      expect(deerHerdAuto?.kind).toBe('stateMachine')
      if (deerHerdAuto?.kind === 'stateMachine') {
        expect(deerHerdAuto.machine.states['source-13497']?.next).toMatchObject({
          kind: 'branch',
          cond: { kind: 'chance', percent: 71 },
        })
      }
    }, 120_000)
  },
)
