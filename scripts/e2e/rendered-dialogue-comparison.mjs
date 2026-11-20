import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { sourceDialogueText } from './causal-recording-contract.mjs'

const styles = {
  setDialogStyleTop: 'top',
  setDialogStyleBottom: 'bottom',
  setDialogStyleCenter: 'center',
  setDialogStyleNarration: 'narration',
}
const normalize = (text) => text.replace(/\s/gu, '')
const heading = (text) => (text ? text.replace(/[∶：:]$/u, '').trim() : null)

export function inspectClearedDialogueFrames(draws, frames, scene) {
  const timeline = draws.filter((draw) => draw.scene === scene)
  let cursor = 0
  let painted
  for (const frame of frames) {
    while (cursor < timeline.length && timeline[cursor].atMs <= frame.atMs)
      painted = timeline[cursor++]
    if (painted?.slots.length !== 0)
      return { checked: frames.length, issue: { frame, painted: painted ?? null } }
  }
  return { checked: frames.length, issue: frames.length ? null : { frame: null, painted: null } }
}

/** Source windows must be a verified, linear execution path in the original script. */
export function sourceDialogueGroups(commands, windows) {
  const groups = []
  for (const { scene, first, last, initialSlot } of windows) {
    let slot = initialSlot
    let speaker = null
    let portrait = null
    let portraitLayout = false
    let rows = []
    const finish = (keepIdentity = false) => {
      if (rows.length) {
        assert(slot, 'source dialogue window must name its initial slot')
        groups.push({ scene, slot, speaker, portrait, portraitLayout, rows })
      }
      rows = []
      if (!keepIdentity) {
        speaker = null
        portrait = null
      }
    }
    for (let ip = first; ip <= last; ip++) {
      const { op, arg0, opcode, text, messageIndex } = commands[ip]
      if (Object.hasOwn(styles, op)) {
        finish()
        slot = styles[op]
        portrait = ['top', 'bottom'].includes(slot) && arg0 > 0 ? arg0 : null
        portraitLayout = portrait !== null
      } else if (op === 'showDialog') {
        const visible = sourceDialogueText(text)
        if (/[∶：:]$/u.test(visible)) speaker = heading(visible)
        else {
          // PAL_ShowDialogText continues a top or bottom box after four body rows.
          if (rows.length === 4 && (slot === 'top' || slot === 'bottom')) finish(true)
          rows.push({ id: `dlg.${messageIndex}`, ip, text: visible })
        }
      } else if (op === 'raw' && opcode === 0x8e) {
        finish(true)
      } else if (op === 'end' || (op === 'raw' && [0x05, 0x09, 0x50].includes(opcode))) {
        finish()
      }
    }
    finish()
  }
  return groups
}

export function compareRenderedDialogue(draws, groups, locale = {}) {
  if (!draws?.length) return { status: 'rejected', findings: [{ issue: 'missing-dialogue-draws' }] }
  const expected = groups.map((group) => ({
    ...group,
    text: normalize(group.rows.map(({ text }) => text).join('')),
    identity: {
      slot: group.slot,
      speaker: group.speaker,
      portrait: group.portrait,
      portraitLayout: group.portraitLayout,
    },
  }))
  const seen = new Map()
  const findings = new Map()
  const record = (key, finding) => {
    if (!findings.has(key)) findings.set(key, finding)
  }
  for (const { scene, atMs, slots } of draws) {
    for (const slot of slots) {
      const missing = ['slot', 'lines', 'speaker', 'portrait', 'portraitLayout'].filter(
        (field) => !Object.hasOwn(slot, field),
      )
      if (missing.length) {
        record(`${scene}:missing:${missing.join(',')}`, {
          issue: 'incomplete-drawn-dialogue-record',
          scene,
          atMs,
          missing,
          actual: slot,
        })
        continue
      }
      const visible = normalize(slot.lines.join(''))
      if (!visible && !slot.ids?.length) continue
      const candidates = expected.filter(
        (group) =>
          group.scene === scene &&
          group.text.startsWith(visible) &&
          (!slot.ids ||
            isDeepStrictEqual(
              group.rows.map(({ id }) => id),
              slot.ids,
            )),
      )
      if (candidates.length === 0) {
        record(`${scene}:${slot.ids?.join(',') ?? visible}`, {
          issue: 'unexpected-drawn-dialogue',
          scene,
          atMs,
          actual: slot,
        })
        continue
      }
      const actual = {
        slot: slot.slot,
        speaker: heading(locale[slot.speaker] ?? slot.speaker),
        portrait: slot.portrait,
        portraitLayout: slot.portraitLayout,
      }
      const compatible = candidates.filter(({ identity }) => isDeepStrictEqual(identity, actual))
      if (compatible.length === 0) {
        const { rows, identity } = candidates[0]
        record(rows[0].id, {
          issue: 'wrong-drawn-dialogue-identity',
          scene,
          atMs,
          rows,
          expected: identity,
          actual,
        })
        continue
      }
      const group = compatible.find(({ text }) => text === visible)
      if (group && !seen.has(group)) seen.set(group, { atMs, ...actual })
    }
  }
  for (const group of expected) {
    if (!seen.has(group))
      record(group.rows[0].id, {
        issue: 'missing-complete-dialogue-draw',
        scene: group.scene,
        rows: group.rows,
      })
  }
  const observedOrder = [...seen.keys()].map(({ rows }) => rows[0].id)
  if (
    seen.size === expected.length &&
    !isDeepStrictEqual(
      observedOrder,
      expected.map(({ rows }) => rows[0].id),
    )
  )
    record('order', { issue: 'wrong-dialogue-order', observedOrder })
  return {
    status: findings.size ? 'rejected' : 'passed',
    findings: [...findings.values()],
    checked: expected.map((group) => ({
      scene: group.scene,
      rows: group.rows,
      expected: group.identity,
      firstComplete: seen.get(group) ?? null,
    })),
  }
}
