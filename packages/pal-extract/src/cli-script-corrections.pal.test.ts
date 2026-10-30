import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { EventFile } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { createCliTestHost } from './__tests__/cli-host.js'

const raw = resolve(import.meta.dirname, '../../../data/raw')

function copyScriptInputs(tree: string): void {
  for (const file of ['SSS.MKF', 'M.MSG', 'WORD.DAT'])
    copyFileSync(join(raw, file), join(tree, 'data/raw', file))
}

test('default CLI corrects gameplay before every event consumer is emitted', async ({
  onTestFinished,
}) => {
  const host = createCliTestHost('pal-corrected-cli-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  copyScriptInputs(tree)
  const result = await host.runCli(tree)
  expect(result.stdout).toContain('events round-trip OK')
  // The isolated input intentionally ends at the following DATA.MKF stage.
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('DATA.MKF')
  const all: EventFile = JSON.parse(
    readFileSync(join(tree, 'data/extracted/events/all.json'), 'utf8'),
  )
  expect(all.segments[0]?.commands[7568]).toMatchObject({
    op: 'raw',
    opcode: 10,
    operands: [7566, 0, 0],
  })
  const shared: EventFile = JSON.parse(
    readFileSync(join(tree, 'data/extracted/events/shared.json'), 'utf8'),
  )
  expect(shared.segments.flatMap((segment) => segment.commands)).toContainEqual(
    expect.objectContaining({ op: 'raw', opcode: 47, operands: [3, 0, 0] }),
  )
  const scene: EventFile = JSON.parse(
    readFileSync(join(tree, 'data/extracted/events/scene-081.json'), 'utf8'),
  )
  const allCommands = all.segments.flatMap((segment) => segment.commands)
  const palace: EventFile = JSON.parse(
    readFileSync(join(tree, 'data/extracted/events/scene-286.json'), 'utf8'),
  )
  expect(
    palace.segments
      .flatMap((segment) => segment.commands)
      .find((command) => command.label === 'L_43518'),
  ).toMatchObject({ op: 'loadScene', sceneId: 286 })
  expect(allCommands.find((command) => command.label === 'L_43518')).toMatchObject({
    op: 'loadScene',
    sceneId: 286,
  })
  for (const segment of scene.segments) {
    for (const command of segment.commands) {
      if (command.label)
        expect(allCommands.some((global) => global.label === command.label)).toBe(true)
    }
  }
  const manifest = JSON.parse(
    readFileSync(join(tree, 'data/extracted/script-corrections.json'), 'utf8'),
  )
  expect(manifest.mode).toBe('corrected')
  expect(manifest.rules.map((rule: { id: string }) => rule.id)).toContain('D12')
})

test('default CLI rejects an altered source before corrected event outputs; faithful mode remains explicit', async ({
  onTestFinished,
}) => {
  const host = createCliTestHost('pal-unknown-cli-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  copyScriptInputs(tree)
  const path = join(tree, 'data/raw/SSS.MKF')
  const bytes = readFileSync(path)
  // A valid header/table change keeps round-trip legal but changes the archive identity.
  bytes[24] = 1
  writeFileSync(path, bytes)
  mkdirSync(join(tree, 'data/extracted'), { recursive: true })
  writeFileSync(join(tree, 'data/extracted/keep.json'), 'previous output')
  const rejected = await host.runCli(tree)
  expect(rejected.stderr).toContain('Unsupported script source')
  expect(readFileSync(join(tree, 'data/extracted/keep.json'), 'utf8')).toBe('previous output')
  expect(existsSync(join(tree, 'data/extracted/events/all.json'))).toBe(false)
  const faithful = await host.runCli(tree, ['--faithful'])
  expect(faithful.stdout).toContain('events round-trip OK')
  expect(faithful.stderr).toContain('DATA.MKF')
  const manifest = JSON.parse(
    readFileSync(join(tree, 'data/extracted/script-corrections.json'), 'utf8'),
  )
  expect(manifest).toMatchObject({ mode: 'faithful', version: null, rules: [] })
})
