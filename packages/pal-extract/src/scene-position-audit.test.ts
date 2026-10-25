/** Real diagnostic script and files; redirect only its shared /tmp report into the owned tree. */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture(options: { blocked: boolean; missingMap?: boolean; caller?: boolean }) {
  const root = mkdtempSync(join(tmpdir(), 'scene-position-audit-'))
  roots.push(root)
  const scripts = join(root, 'packages/pal-extract/scripts')
  mkdirSync(scripts, { recursive: true })
  const entry = join(scripts, 'find-scenes-without-setpartypos.mjs')
  copyFileSync(join(packageRoot, 'scripts/find-scenes-without-setpartypos.mjs'), entry)
  const save = (path: string, value: unknown) => {
    const destination = join(root, 'data/extracted', path)
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, JSON.stringify(value))
  }
  save('events/scene-15.json', {
    scene: 15,
    segments: [{ name: 'scene-15.onEnter', commands: [{ op: 'end', label: 'L_1' }] }],
  })
  save('data/scene/15.json', { sceneId: 15, mapNum: 1, onEnterLabel: 'L_1', eventObjects: [] })
  if (!options.missingMap) {
    save('data/tilemap/1.json', {
      width: 64,
      height: 128,
      tileset: '',
      cells: Array.from({ length: 128 }, () =>
        Array.from({ length: 64 }, () => ({
          lower: options.blocked ? 0x2000 : 0,
          upper: options.blocked ? 0x2000 : 0,
        })),
      ),
    })
  }
  if (options.caller) {
    save('events/scene-1.json', {
      scene: 1,
      segments: [
        {
          name: 'scene-1.onEnter',
          commands: [
            { op: 'loadScene', sceneId: 15 },
            { op: 'raw', opcode: 70, operands: [5, 6, 1] },
            { op: 'end' },
          ],
        },
      ],
    })
  }
  // Keep the actual main, traversal and file IO; redirect only the fixed output
  // path so concurrent developer reports cannot be overwritten by this test.
  const report = join(root, 'report.json')
  const preload = join(root, 'owned-report.mjs')
  writeFileSync(
    preload,
    `import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const write = fs.writeFileSync;
fs.writeFileSync = (path, ...args) => {
  if (path !== '/tmp/scenes-without-setpartypos.json') throw new Error('unexpected report path');
  return write(process.env.SCENE_AUDIT_REPORT, ...args);
};
syncBuiltinESMExports();\n`,
  )
  const run = spawnSync(process.execPath, ['--import', preload, entry], {
    cwd: root,
    env: { ...process.env, SCENE_AUDIT_REPORT: report },
    encoding: 'utf8',
    timeout: 4000,
  })
  expect(run.error).toBeUndefined()
  expect(run.signal).toBeNull()
  return { run, rows: JSON.parse(readFileSync(report, 'utf8')) }
}

describe('scene position diagnostic report', () => {
  it.each([
    { name: 'fully blocked map', blocked: true },
    { name: 'unavailable map', blocked: false, missingMap: true },
  ])('$name keeps scene 15 as an explicit orphan and completes its report', (options) => {
    const { run, rows } = fixture(options)
    expect(rows).toEqual([
      {
        sceneNum: 15,
        mapNum: 1,
        onEnterLabel: 'L_1',
        strategy: 'ORPHAN',
        strategyKind: 'orphan',
        partyStart: null,
      },
    ])
    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')
    expect(run.stdout).toContain('[orphan]')
    expect(run.stdout).toContain('结果写入:')
  })

  it('keeps the later caller position and its half-cell pixel coordinates', () => {
    const { run, rows } = fixture({ blocked: false, caller: true })
    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')
    expect(rows).toHaveLength(1)
    expect(rows[0].strategyKind).toBe('caller')
    expect(rows[0].partyStart).toEqual({
      x: 176,
      y: 104,
      facing: 'down',
      _source: 'caller-trace',
      _caller: { ops: [5, 6, 1], callerScene: 1, ip: 1, direction: 'after', distance: 1 },
    })
    expect(run.stdout).toContain('pixel(176, 104)')
  })
})
