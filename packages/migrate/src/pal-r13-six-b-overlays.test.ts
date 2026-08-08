import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './pal-migration.js'
import {
  applyPalR13SixBSceneOverlays,
  PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE,
} from './pal-r13-six-b-overlays.js'

function scene(anchor: string, outMs: number, inMs: number): MigrationJson {
  return {
    id: 'fixture',
    body: [
      { kind: 'fade', dir: 'out', ms: outMs },
      { kind: 'dialog', cue: { rows: [{ text: anchor }] } },
      { kind: 'fade', dir: 'in', ms: inMs },
    ],
  }
}

describe('PAL R13-6B 黑屏 transaction overlay', () => {
  test('四个源站点生成稳定 hold/reveal token 且幂等', () => {
    const input = new Map<string, MigrationJson>()
    for (const evidence of PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE)
      if (!input.has(evidence.scenePath))
        input.set(evidence.scenePath, scene(evidence.dialogAnchor, evidence.outMs, evidence.inMs))
      else {
        const current = input.get(evidence.scenePath) as { extra?: MigrationJson[] }
        current.extra ??= []
        current.extra.push(scene(evidence.dialogAnchor, evidence.outMs, evidence.inMs))
      }
    const once = applyPalR13SixBSceneOverlays(input)
    const serialized = JSON.stringify([...once.values()])
    for (const evidence of PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE) {
      expect(serialized).toContain(
        `"kind":"holdScreen","color":"black","token":"${evidence.token}"`,
      )
      expect(serialized).toContain(`"kind":"revealScreen","token":"${evidence.token}"`)
    }
    expect(applyPalR13SixBSceneOverlays(once)).toEqual(once)
  })

  test('缺源 reveal 时 fail-closed', () => {
    const evidence = PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE[0]!
    const broken = scene(evidence.dialogAnchor, evidence.outMs, evidence.inMs) as {
      body: MigrationJson[]
    }
    broken.body.pop()
    const input = new Map<string, MigrationJson>([[evidence.scenePath, broken]])
    expect(() => applyPalR13SixBSceneOverlays(input)).toThrow(/缺 dialog 或源 reveal fade/)
  })
})
