// Read-only original script input for directed diagnosis after corrected resources are generated.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { disasm } from '../../../../packages/pal-extract/src/events/disasm.ts'
import { parseMessages } from '../../../../packages/pal-extract/src/io/msg.ts'
import { parseSss } from '../../../../packages/pal-extract/src/io/sss.ts'
import { dumpAllEventObjects } from '../../../../packages/pal-extract/src/resources/scene.ts'

const root = new URL('../../../../data/raw/', import.meta.url)
export function originalScripts() {
  const bytes = readFileSync(new URL('SSS.MKF', root))
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  assert.equal(sha256, 'ce448a90c9797648eea315fe589b2bd434139ffc423bf0a5954dae6f4c8b4756')
  const sss = parseSss(bytes)
  const messages = parseMessages(readFileSync(new URL('M.MSG', root)), sss.messageOffsets)
  const entries = [
    ...sss.scenes.flatMap((s) => [s.scriptOnEnter, s.scriptOnTeleport]),
    ...sss.eventObjects.flatMap((e) => [e.triggerScript, e.autoScript]),
  ]
  return {
    sha256,
    commands: disasm(sss.bytecode, messages, entries),
    objects: dumpAllEventObjects(sss.scenes, sss.eventObjects).eventObjects,
  }
}
