import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ItemData, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildP7ProjectCompatibility, legacyBindingDigestP7 } from './p7-compatibility.js'
import { projectP7CanonicalProject } from './p7-project.js'
import { stableJsonSha256 } from './stable-json.js'
import type { ScriptMigrationIRP6, ScriptTransitionLedgerDraftP6 } from './types.js'

test('P7 binding digest ignores ScriptRef chunks but retains stable ids', () => {
  const binding = [
    {
      body: [
        {
          kind: 'callScript',
          ref: { chunk: 'scene/old', id: 'scene/stable/script' },
        },
      ],
    },
  ]
  expect(
    legacyBindingDigestP7([
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/new', id: 'scene/stable/script' },
          },
        ],
      },
    ]),
  ).toBe(legacyBindingDigestP7(binding))
  expect(
    legacyBindingDigestP7([
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/old', id: 'scene/different/script' },
          },
        ],
      },
    ]),
  ).not.toBe(legacyBindingDigestP7(binding))
})

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL save compatibility projection',
  () => {
    test('covers every legacy entity/cursor/hook binding with stable target closures', () => {
      const ir = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      const ledger = JSON.parse(
        readFileSync(resolve(shadowRoot, 'transitions/script-v4-v5.draft.json'), 'utf8'),
      ) as ScriptTransitionLedgerDraftP6
      const target = resolve(shadowRoot, 'target/project/content')
      const sceneIds = JSON.parse(
        readFileSync(resolve(target, 'scenes/index.json'), 'utf8'),
      ) as string[]
      const sourceScenes = sceneIds.map(
        (sceneId) =>
          JSON.parse(readFileSync(resolve(target, `scenes/${sceneId}.json`), 'utf8')) as SceneDef,
      )
      const items = JSON.parse(readFileSync(resolve(target, 'items.json'), 'utf8')) as ItemData[]
      const project = projectP7CanonicalProject({ ir, scenes: sourceScenes, items })

      const { sidecar, report } = buildP7ProjectCompatibility({
        projectId: 'pal',
        ir,
        sourceScenes,
        targetScenes: project.scenes,
        sourceAuditDigest: ir.sourceAudit.digest,
        fullLedgerDigest: ledger.digest,
      })

      expect(report).toEqual({
        legacyEntities: 5_077,
        broadcastEntities: 0,
        legacyCursors: 4_066,
        broadcastCursors: 24,
        legacyBindings: 57,
        pageLineages: 3_616,
        stageLineages: 4_048,
        targetClosures: 4_105,
      })
      expect(sidecar.digest).toBe(
        stableJsonSha256(
          Object.fromEntries(Object.entries(sidecar).filter(([key]) => key !== 'digest')),
        ),
      )
      expect(
        sidecar.legacyBindings.some(
          (alias) =>
            alias.from.sceneId === 's059' &&
            alias.from.hook === 'onTeleport' &&
            alias.target.hookId === 'legacy-001',
        ),
      ).toBe(true)
      expect(
        sidecar.legacyCursors.find((alias) => alias.legacyKey === 'teleport:s059'),
      ).toMatchObject({
        mode: 'single',
        target: {
          target: {
            kind: 'scene-hook',
            sceneId: 's059',
            hook: 'onTeleport',
            hookId: 'legacy-001',
          },
        },
      })
    }, 120_000)
  },
)
