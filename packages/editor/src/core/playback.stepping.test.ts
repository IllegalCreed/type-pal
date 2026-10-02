import { describe, expect, test } from 'vitest'
import { dialogue, flowOf, preview, settle } from './__tests__/playback-canonical-fixtures.js'

describe('preview command stepping and continuous dialogue', () => {
  test('reading time uses resolved Unicode text, with fresh timing after manual advance or replacement', async () => {
    const r = preview({ short: '🙂', long: '字'.repeat(100), replacement: '新句' })
    await r.start(flowOf([dialogue('short'), dialogue('long'), { kind: 'giveMoney', delta: 3 }]))
    r.p.tick(1279)
    await settle()
    expect(r.p.view.dialog?.cue.rows[0]?.text).toBe('short')
    r.p.tick(1)
    await settle()
    expect(r.p.view.dialog?.cue.rows[0]?.text).toBe('long')
    r.p.tick(7999)
    await settle()
    expect(r.p.view.logs).toEqual([])
    r.p.tick(1)
    await settle()
    expect(r.p.view.logs).toEqual(['💰 +3 钱'])

    await r.start(flowOf([dialogue('short'), dialogue('replacement')]))
    r.p.tick(1000)
    r.p.confirmDialog()
    await settle()
    r.p.tick(280)
    await settle()
    expect(r.p.view.dialog?.cue.rows[0]?.text).toBe('replacement')
    await r.start(flowOf([dialogue('short'), { kind: 'giveMoney', delta: 4 }]))
    r.p.tick(1279)
    await settle()
    expect(r.p.view.logs).toEqual([])
    r.p.stop()
    r.p.tick(50_000)
    await settle()
    expect(r.p.view.dialog).toBeNull()
    expect(r.p.view.logs).toEqual([])
    expect(r.p.mode).toBe('idle')
    r.unchanged()
  })

  test('empty stages finish without a step, and replacing a queued step cannot mutate the new run', async () => {
    const r = preview()
    await r.start(flowOf([]), { paused: true })
    expect(r.p.mode).toBe('done')
    await r.start(flowOf([{ kind: 'giveMoney', delta: 90 }]), { paused: true })
    r.p.step()
    await r.start(flowOf([dialogue('新句')]), { paused: true })
    expect(r.p.view.dialog).toBeNull()
    expect(r.p.view.logs).toEqual([])
    r.p.step()
    await settle()
    expect(r.p.view.dialog?.cue.rows[0]?.text).toBe('新句')
    expect(r.p.view.logs).toEqual([])
    r.p.stop()
    await settle()
    expect(r.p.mode).toBe('idle')
  })

  test('branch and shared call steps stop at each highlighted command, including the shared body', async () => {
    const r = preview()
    await r.start(
      flowOf([
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'open', is: false },
          then: [{ kind: 'callScript', script: 'shared/user/turn' }],
          else: [{ kind: 'giveMoney', delta: 99 }],
        },
        { kind: 'setPartyFacing', facing: 'up' },
      ]),
      {
        paused: true,
        sharedScripts: {
          'shared/user/turn': {
            name: '转向',
            self: 'none',
            body: [{ kind: 'setPartyFacing', facing: 'left' }],
          },
        },
      },
    )
    for (const [path, facing] of [
      ['main/0', 'down'],
      ['main/0/branch/0', 'down'],
      ['main/0/branch/0/call:shared/user/turn/0', 'left'],
    ]) {
      r.p.step()
      await settle()
      expect(r.p.activePath).toBe(path)
      expect(r.p.view.player.facing).toBe(facing)
      expect(r.p.mode).toBe('paused')
    }
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('up')
    expect(r.p.view.logs).toEqual([])
    expect(r.p.mode).toBe('done')
    r.unchanged()
  })

  test('one step sequences its body without an empty transition click', async () => {
    const r = preview()
    await r.start(
      {
        kind: 'stages',
        initial: 'first',
        stages: [
          {
            id: 'first',
            body: [
              { kind: 'setPartyFacing', facing: 'left' },
              { kind: 'setPartyFacing', facing: 'right' },
            ],
          },
        ],
      },
      { paused: true },
    )
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('left')
    expect(r.p.activePath).toBe('first/0')
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('right')
    expect(r.p.mode).toBe('done')
    r.unchanged()
  })

  test('the first click executes one command and the last command needs no empty finish click', async () => {
    const r = preview()
    const started = r.start(
      flowOf([
        { kind: 'setPartyFacing', facing: 'left' },
        { kind: 'setPartyFacing', facing: 'right' },
      ]),
      { paused: true },
    )
    r.p.step()
    await started
    expect(r.p.view.player.facing).toBe('left')
    expect(r.p.activePath).toBe('main/0')
    expect(r.p.stepNumber).toBe(1)
    expect(r.p.mode).toBe('paused')
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('right')
    expect(r.p.mode).toBe('done')
    expect(r.p.stepNumber).toBe(2)
    r.unchanged()
  })

  test('ordinary dialogue advances automatically but never chooses a confirm option', async () => {
    const r = preview()
    await r.start(
      flowOf([
        dialogue('你好'),
        { kind: 'confirm', onYes: [], onNo: [{ kind: 'giveMoney', delta: -3 }] },
        { kind: 'giveMoney', delta: 7 },
      ]),
    )
    r.p.tick(1359)
    await settle()
    expect(r.p.view.dialog?.cue.rows).toEqual([{ text: '你好' }])
    r.p.tick(1)
    await settle()
    expect(r.p.view.dialog).toBeNull()
    expect(r.p.view.confirm?.selectedYes).toBe(false)
    r.p.tick(30_000)
    r.p.step()
    await settle()
    expect(r.p.view.confirm?.selectedYes).toBe(false)
    expect(r.p.view.logs).toEqual([])
    r.p.answerConfirm(true)
    await settle()
    expect(r.p.view.logs).toEqual([])
    r.p.step()
    await settle()
    expect(r.p.view.logs).toEqual(['💰 +7 钱'])
    expect(r.p.mode).toBe('done')
    r.unchanged()
  })

  test('pause freezes dialogue time; resume keeps remaining time and applies speed', async () => {
    const r = preview()
    await r.start(flowOf([dialogue('甲乙丙丁'), { kind: 'giveMoney', delta: 5 }]))
    r.p.tick(520)
    r.p.pause()
    r.p.tick(20_000)
    await settle()
    expect(r.p.view.dialog).not.toBeNull()
    r.p.speed = 2
    r.p.resume()
    r.p.tick(499)
    await settle()
    expect(r.p.view.dialog).not.toBeNull()
    r.p.tick(1)
    await settle()
    expect(r.p.mode).toBe('done')
    expect(r.p.view.logs).toEqual(['💰 +5 钱'])
  })

  test('dialogue stepping stays paused and grants only the next command, not the remaining script', async () => {
    const r = preview()
    await r.start(flowOf([dialogue('甲'), dialogue('乙'), { kind: 'giveMoney', delta: 9 }]))
    r.p.step()
    await settle()
    expect(r.p.mode).toBe('paused')
    expect(r.p.view.dialog?.cue.rows).toEqual([{ text: '乙' }])
    r.p.tick(20_000)
    expect(r.p.view.dialog?.cue.rows).toEqual([{ text: '乙' }])
    expect(r.p.view.logs).toEqual([])
    r.p.step()
    await settle()
    expect(r.p.view.logs).toEqual(['💰 +9 钱'])
    expect(r.p.mode).toBe('done')
  })

  test('stepping an in-flight move finishes it but rapid clicks cannot queue extra commands', async () => {
    const r = preview()
    await r.start(
      flowOf([
        { kind: 'moveParty', to: { col: 1, row: 0, height: 2 }, speed: 'normal' },
        { kind: 'giveMoney', delta: 9 },
        { kind: 'giveMoney', delta: 8 },
      ]),
    )
    r.p.step()
    r.p.step()
    r.p.tick(260)
    await settle()
    expect(r.p.view.player.pos).toEqual({ col: 1, row: 0, height: 2 })
    expect(r.p.mode).toBe('paused')
    expect(r.p.view.logs).toEqual([])
    r.p.step()
    r.p.step()
    await settle()
    expect(r.p.view.logs).toEqual(['💰 +9 钱'])
    r.p.resume()
    await settle()
    expect(r.p.view.logs).toEqual(['💰 +9 钱', '💰 +8 钱'])
  })

  test('entry and final safe points do not consume extra steps', async () => {
    const r = preview()
    await r.start(
      {
        kind: 'stages',
        initial: 'entry',
        stages: [
          {
            id: 'entry',
            entry: {
              prepare: [{ kind: 'setPartyFacing', facing: 'left' }],
              reveal: { kind: 'cut' },
            },
            body: [{ kind: 'setPartyFacing', facing: 'up' }],
          },
        ],
      },
      { paused: true, allowSceneEntry: true, runSceneEntry: true },
    )
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('left')
    expect(r.p.view.logs).toEqual(['入场呈现：直接切换'])
    expect(r.p.mode).toBe('paused')
    r.p.step()
    await settle()
    expect(r.p.view.player.facing).toBe('up')
    expect(r.p.mode).toBe('done')
  })
})
