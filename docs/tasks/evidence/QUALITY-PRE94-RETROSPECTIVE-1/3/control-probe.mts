import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { annotate, parseSymbols } from '../../../../../packages/pal-extract/src/events/annotate.js'
import { disasm } from '../../../../../packages/pal-extract/src/events/disasm.js'
import { recompile } from '../../../../../packages/pal-extract/src/events/recompile.js'
import {
  type SliceResult,
  sliceByScene,
} from '../../../../../packages/pal-extract/src/events/slice.js'
import { parseMessages } from '../../../../../packages/pal-extract/src/io/msg.js'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const hash = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex')
const cli = readFileSync(`${root}/packages/pal-extract/src/cli.ts`, 'utf8')
const start = cli.indexOf("  const sssObjBuf = loadMkfChunk('SSS.MKF', 2)")
const end = cli.indexOf('  const rawCommands = disasm(', start)
assert(start > 0 && end > start)
const block = cli.slice(start, end)
const temporary = `${root}/packages/pal-extract/src/pre94-slice-control-caller.mts`
assert(!existsSync(temporary))
// Reuse the actual read-only entry collection; never import/execute the CLI cleaner.
const scaffold = `import {readFileSync} from 'node:fs'
import {openMkf,readChunk} from './io/mkf.js'
import {parseSss} from './io/sss.js'
import {parseWordDat} from './io/word.js'
import {parseItems,parseSpells,parseEnemyObjects,parseObjectPlayers} from './resources/tables.js'
const raw=${JSON.stringify(`${root}/data/raw/`)}
const read=(name:string)=>new Uint8Array(readFileSync(raw+name))
const sss=parseSss(read('SSS.MKF'))
const words=parseWordDat(read('WORD.DAT'))
const loadMkfChunk=(name:string,index:number)=>readChunk(openMkf(read(name)),index)
${block}
export {sss,words,globalScriptEntries,entryIps}
`

const bytes = (rows: number[][]): Uint8Array => {
  const result = new Uint8Array(rows.length * 8)
  assert(rows.every((row) => row.length === 4))
  const view = new DataView(result.buffer)
  rows.flat().forEach((value, index) => {
    assert(Number.isInteger(value) && value >= 0 && value <= 65535)
    view.setUint16(index * 2, value, true)
  })
  return result
}
const scene = (entry: number) => ({
  mapNum: 0,
  scriptOnEnter: entry,
  scriptOnTeleport: 0,
  eventObjectIndex: 0,
  raw: new Uint16Array([0, entry, 0, 0]),
})

function commandsFor(result: SliceResult, owner: 'scene' | 'global') {
  const file = owner === 'scene' ? result.scenes[0] : result.shared
  assert(file, 'probe scene output missing')
  const segment = file.segments[0]
  assert(segment, 'probe segment output missing')
  return segment.commands
}

try {
  writeFileSync(temporary, scaffold)
  const { sss, words, globalScriptEntries, entryIps } = await import(pathToFileURL(temporary).href)
  const messages = parseMessages(readFileSync(`${root}/data/raw/M.MSG`), sss.messageOffsets)
  const symbolsPath = `${root}/data/symbols.json`
  const symbols = existsSync(symbolsPath)
    ? parseSymbols(JSON.parse(readFileSync(symbolsPath, 'utf8')))
    : {}
  const raw = disasm(sss.bytecode, messages, entryIps)
  assert.deepEqual(recompile(raw, messages), sss.bytecode)
  const annotated = annotate(raw, words, symbols)
  assert.deepEqual(recompile(annotated, messages), sss.bytecode)
  const masked = annotated.map((command) => {
    switch (command.op) {
      case 'showDialog':
        return { ...command, text: '' }
      case 'giveItem':
        return { ...command, _item: '' }
      case 'startBattle':
        return { ...command, _enemyTeam: '' }
      case 'loadScene':
        return { ...command, _scene: '' }
      default:
        return command
    }
  })
  const normalize = (value: unknown): string =>
    JSON.stringify(value, (key, item) => (key === 'text' || key.startsWith('_') ? undefined : item))
  const rawResult = sliceByScene(annotated, sss.scenes, sss.eventObjects, globalScriptEntries)
  const maskedResult = sliceByScene(masked, sss.scenes, sss.eventObjects, globalScriptEntries)
  const projection = normalize(rawResult)
  const maskedProjection = normalize(maskedResult)
  const gotos = raw.flatMap((command, ip) =>
    command.op === 'goto' && (command.frameDelay ?? 0) > 0
      ? [{ ip, to: command.to, frameDelay: command.frameDelay }]
      : [],
  )
  const synthetic = []
  for (const kind of ['text', 'annotation']) {
    const input = bytes([
      [0, 0, 0, 0],
      kind === 'text' ? [65535, 0, 0, 0] : [31, 61, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [3, 3, 0, 0], // Unreachable jump independently labels the unreachable target 3.
    ])
    const owners: Array<'scene' | 'global'> = ['scene', 'global']
    for (const owner of owners) {
      const before = annotate(disasm(input, ['message'], [1]), words, {})
      const after = annotate(
        disasm(input, [kind === 'text' ? 'L_3' : 'message'], [1]),
        words,
        kind === 'annotation' ? parseSymbols({ item: { '61': 'L_3' } }) : {},
      )
      const scenes = [scene(owner === 'scene' ? 1 : 0)]
      const globals = owner === 'global' ? [1] : []
      const first = sliceByScene(before, scenes, [], globals)
      const second = sliceByScene(after, scenes, [], globals)
      const firstCommands = commandsFor(first, owner)
      const secondCommands = commandsFor(second, owner)
      assert.equal(firstCommands.length, 2)
      assert.equal(secondCommands.length, 3)
      const extra = secondCommands[2]
      assert(extra, 'probe extra command missing')
      assert.equal(extra.label, 'L_3')
      assert.deepEqual(recompile(before, []), input)
      assert.deepEqual(recompile(after, []), input)
      synthetic.push({
        kind,
        owner,
        input: [...input],
        before: first,
        after: second,
        sameRecompiledBytes: true,
      })
    }
  }
  const delayed = bytes([
    [0, 0, 0, 0],
    [3, 4, 2, 0],
    [71, 42, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ])
  const commands = disasm(delayed, [], [1])
  const eo = {
    vanishTime: 0,
    x: 0,
    y: 0,
    layer: 0,
    triggerScript: 1,
    autoScript: 0,
    state: 1,
    triggerMode: 0,
    spriteNum: 0,
    nSpriteFrames: 0,
    direction: 0,
    currentFrameNum: 0,
    scriptIdleFrame: 0,
    spritePtrOffset: 0,
    nSpriteFramesAuto: 0,
    scriptIdleFrameCountAuto: 0,
    raw: new Uint16Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  }
  const delayedResult = sliceByScene(commands, [scene(0)], [eo])
  const jump = commands[1]
  const target = commands[4]
  assert(jump && target, 'probe delayed goto fixture incomplete')
  assert.deepEqual(commandsFor(delayedResult, 'scene'), [jump, target])
  assert.deepEqual(recompile(commands, []), delayed)
  const inputs = ['SSS.MKF', 'WORD.DAT', 'M.MSG'].map((name) => ({
    path: `data/raw/${name}`,
    sha256: hash(readFileSync(`${root}/data/raw/${name}`)),
  }))
  const report = {
    callerBlockSha256: hash(block),
    callerBlockStartLine: cli.slice(0, start).split('\n').length,
    callerBlockEndLine: cli.slice(0, end).split('\n').length - 1,
    inputs,
    symbolsInput: {
      path: 'data/symbols.json',
      exists: existsSync(symbolsPath),
      sha256: existsSync(symbolsPath) ? hash(readFileSync(symbolsPath)) : null,
    },
    raw: {
      instructions: raw.length,
      scenes: sss.scenes.length,
      eventObjects: sss.eventObjects.length,
      globalEntries: globalScriptEntries.length,
      entryIps: entryIps.length,
      exactByteRoundtrip: true,
      metadataProjectionEqual: projection === maskedProjection,
      projectionSha256: hash(projection),
      maskedProjectionSha256: hash(maskedProjection),
      nonzeroDelayGotos: gotos,
    },
    synthetic,
    delayedGoto: {
      input: [...delayed],
      disassembled: commands,
      sliced: delayedResult,
      missingBySdlSource: [2, 3],
      source: 'script.c:3239-3258 / 3550-3571',
      limitation: 'SDL source verified; pal.exe and real runtime impact not executed',
    },
    productionAndInputsWritten: false,
  }
  console.log(JSON.stringify(report, null, 2))
} finally {
  if (existsSync(temporary)) unlinkSync(temporary)
}
