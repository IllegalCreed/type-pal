import { describe, expect, test } from 'vitest'
import type { P7GeneratedCanonical } from './p7-generated.js'
import { projectR13SourceSemanticsGenerated } from './r13-source-semantics-mg2.js'
import { projectR13SourceDispositionGenerated } from './source-instruction-disposition.js'

describe('R13 source semantics generated projection', () => {
  test('keeps exactly the fields consumed after the R13-5 parent ledger is complete', () => {
    const snapshot = { name: 'snapshot' }
    const r13CrossActivationParentSnapshot = { name: 'cross-parent' }
    const ir = { name: 'ir' }
    const ledgerDraft = { digest: 'ledger' }
    const c8Evidence = { name: 'c8' }
    const autoLifecycleRepairEvidence = { digest: 'auto-lifecycle' }
    const sceneSemanticRepairEvidence = { name: 'scene-repair' }
    const triggerActivationEvidence = { name: 'trigger-activation' }
    const autoIdleGateEvidence = { digest: 'auto-idle' }
    const confirmEvidence = { name: 'confirm' }
    const itemThrowEvidence = { name: 'item-throw' }
    const omittedProject = { name: 'project' }
    const generated = {
      snapshot,
      r13CrossActivationParentSnapshot,
      ir,
      ledgerDraft,
      c8Evidence,
      autoLifecycleRepairEvidence,
      sceneSemanticRepairEvidence,
      triggerActivationEvidence,
      autoIdleGateEvidence,
      confirmEvidence,
      itemThrowEvidence,
      project: omittedProject,
    } as unknown as P7GeneratedCanonical

    const dispositionProjected = projectR13SourceDispositionGenerated(generated)
    expect(Object.keys(dispositionProjected)).toEqual([
      'snapshot',
      'r13CrossActivationParentSnapshot',
      'ir',
      'ledgerDraft',
      'c8Evidence',
      'autoLifecycleRepairEvidence',
      'sceneSemanticRepairEvidence',
      'triggerActivationEvidence',
      'autoIdleGateEvidence',
      'confirmEvidence',
      'itemThrowEvidence',
    ])
    expect(dispositionProjected.r13CrossActivationParentSnapshot).toBe(
      r13CrossActivationParentSnapshot,
    )
    expect(dispositionProjected.confirmEvidence).toBe(confirmEvidence)
    expect(dispositionProjected.itemThrowEvidence).toBe(itemThrowEvidence)

    const projected = projectR13SourceSemanticsGenerated(dispositionProjected)

    expect(Object.isFrozen(projected)).toBe(true)
    expect(Object.keys(projected)).toEqual([
      'snapshot',
      'ir',
      'ledgerDraft',
      'c8Evidence',
      'autoLifecycleRepairEvidence',
      'sceneSemanticRepairEvidence',
      'triggerActivationEvidence',
      'autoIdleGateEvidence',
    ])
    expect(projected.snapshot).toBe(snapshot)
    expect(projected.ir).toBe(ir)
    expect(projected.ledgerDraft).toBe(ledgerDraft)
    expect(projected.c8Evidence).toBe(c8Evidence)
    expect(projected.autoLifecycleRepairEvidence).toBe(autoLifecycleRepairEvidence)
    expect(projected.sceneSemanticRepairEvidence).toBe(sceneSemanticRepairEvidence)
    expect(projected.triggerActivationEvidence).toBe(triggerActivationEvidence)
    expect(projected.autoIdleGateEvidence).toBe(autoIdleGateEvidence)
    expect('project' in projected).toBe(false)
  })
})
