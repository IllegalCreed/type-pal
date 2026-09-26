import { describe, expect, test, vi } from 'vitest'
import { dialogue, flowOf, preview, settle } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview controls', () => {
  test('idle controls are harmless; a paused command gate releases exactly one command per step', async () => {
    const r = preview(),
      p = r.p
    const fresh = structuredClone(p.view)
    p.pause()
    p.resume()
    p.confirmDialog()
    p.toggleConfirm()
    p.submitConfirm()
    p.answerConfirm(true)
    expect(p.view).toEqual(fresh)
    expect(p.mode).toBe('idle')
    expect(p.tick(1000)).toBe(false)
    await r.start(
      flowOf([
        { kind: 'wait', ms: 10 },
        { kind: 'setPartyFacing', facing: 'left' },
        { kind: 'setPartyFacing', facing: 'right' },
      ]),
    )
    // Pause a real entered wait, so the next gate is a command gate, not a stage boundary.
    p.pause()
    expect(p.tick(10)).toBe(true)
    await settle()
    expect(p.view.player.facing).toBe('down')
    expect(p.mode).toBe('paused')
    p.step()
    await settle()
    expect(p.view.player.facing).toBe('left')
    expect(p.mode).toBe('paused')
    p.step()
    await settle()
    expect(p.view.player.facing).toBe('right')
    p.resume()
    await settle()
    expect(p.mode).toBe('done')
    r.unchanged()
  })

  test('resume releases the gate but never accepts an open dialogue', async () => {
    const r = preview(),
      p = r.p
    await r.start(flowOf([dialogue(), { kind: 'setPartyFacing', facing: 'up' }]), { paused: true })
    p.resume()
    await settle()
    expect(p.view.dialog?.cue.rows).toEqual([{ text: 'preview.question' }])
    p.pause()
    p.pause()
    p.resume()
    p.resume()
    await settle()
    expect(p.mode).toBe('running')
    expect(p.view.player.facing).toBe('down')
    expect(p.view.dialog?.cue.rows).toEqual([{ text: 'preview.question' }])
    p.step()
    await settle()
    expect(p.mode).toBe('done')
    expect(p.view.player.facing).toBe('up')
    r.unchanged()
  })

  test('dialogue step keeps the question under confirm; toggle and step choose yes once', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        dialogue(),
        { kind: 'confirm', onNo: [{ kind: 'giveMoney', delta: -8 }] },
        { kind: 'giveMoney', delta: 5 },
      ]),
    )
    const cue = structuredClone(p.view.dialog?.cue)
    p.step()
    await settle()
    expect(p.view.heldDialog).toEqual(cue)
    expect(p.view.confirm?.selectedYes).toBe(false)
    p.toggleConfirm()
    expect(p.view.confirm?.selectedYes).toBe(true)
    p.step()
    await settle()
    expect(p.view.confirm).toBeNull()
    expect(p.view.heldDialog).toBeUndefined()
    expect(p.view.logs).toEqual(['💰 +5 钱'])
    p.submitConfirm()
    p.answerConfirm(false)
    await settle()
    expect(p.view.logs).toEqual(['💰 +5 钱'])
    r.unchanged()
  })

  test('submitConfirm uses the default no and clearDialog discards the held question', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([dialogue(), { kind: 'confirm', onNo: [{ kind: 'giveMoney', delta: -1 }] }]),
    )
    p.confirmDialog()
    await settle()
    p.submitConfirm()
    await settle()
    expect(p.view.logs).toEqual(['💰 -1 钱'])
    await r.start(
      flowOf([dialogue('next'), { kind: 'clearDialog' }, { kind: 'giveMoney', delta: 2 }]),
    )
    p.confirmDialog()
    await settle()
    expect(p.view.heldDialog).toBeUndefined()
    expect(p.view.dialog).toBeNull()
    expect(p.view.logs).toEqual(['💰 +2 钱'])
    r.unchanged()
  })

  test('pause during movement finishes that command but gates the following command', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'moveParty', to: { col: 1, row: 0, height: 2 }, speed: 'normal' },
        { kind: 'giveMoney', delta: 9 },
      ]),
    )
    p.pause()
    p.tick(260)
    await settle()
    expect(p.mode).toBe('paused')
    expect(p.view.player.pos).toEqual({ col: 1, row: 0, height: 2 })
    expect(p.view.logs).toEqual([])
    p.resume()
    await settle()
    expect(p.mode).toBe('done')
    expect(p.view.logs).toEqual(['💰 +9 钱'])
    r.unchanged()
  })

  test('stop at a command gate cannot execute its queued tail', async () => {
    const r = preview(),
      p = r.p
    await r.start(flowOf([{ kind: 'giveMoney', delta: 11 }]), { paused: true, ownerId: 'npc' })
    expect(p.poi).toEqual({ kind: 'entity', id: 'npc' })
    const notify = vi.fn()
    p.onUi = notify
    p.stop()
    p.step()
    p.resume()
    await settle()
    expect(p.mode).toBe('idle')
    expect(p.view.logs).toEqual([])
    expect(p.activePath).toBeNull()
    expect(p.poi).toBeNull()
    expect(notify).toHaveBeenCalled()
    r.unchanged()
  })

  test('replacing a live move cancels its tail without finalizing the new dialogue', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'moveParty', to: { col: 4, row: 0, height: 2 }, speed: 'slow' },
        { kind: 'giveMoney', delta: 99 },
      ]),
    )
    expect(p.tick(200)).toBe(true)
    expect(p.view.player.pos.col).toBe(0.5)
    await r.start(flowOf([dialogue('replacement')]))
    expect(p.tick(5000)).toBe(false)
    await settle()
    expect(p.mode).toBe('running')
    expect(p.view.player.pos).toEqual(r.scene.entry.pos)
    expect(p.view.dialog?.cue.rows).toEqual([{ text: 'replacement' }])
    expect(p.view.logs).toEqual([])
    p.confirmDialog()
    await settle()
    expect(p.mode).toBe('done')
    r.unchanged()
  })
})
