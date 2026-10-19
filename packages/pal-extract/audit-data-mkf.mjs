import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 诊断只消费块长;先校验完整偏移表,不创建块内容视图。
function parseChunkOffsets(buffer) {
  if (buffer.byteLength < 4) {
    throw new Error('MKF: buffer too small for header')
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const firstOffset = view.getUint32(0, true)
  if (firstOffset % 4 !== 0 || firstOffset < 4) {
    throw new Error(`MKF: invalid offset table end ${firstOffset}`)
  }
  if (firstOffset > buffer.byteLength) {
    throw new Error(`MKF: offset table truncated (end=${firstOffset}, size=${buffer.byteLength})`)
  }
  const count = firstOffset / 4 - 1
  const offsets = []
  let previous = firstOffset
  for (let i = 0; i <= count; i++) {
    const offset = view.getUint32(i * 4, true)
    if (offset < previous) {
      throw new Error(`MKF: offsets not monotonic at ${i} (${offset} < ${previous})`)
    }
    if (offset > buffer.byteLength) {
      throw new Error(`MKF: offset ${offset} outside buffer size ${buffer.byteLength}`)
    }
    offsets.push(offset)
    previous = offset
  }
  return offsets
}

const here = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(here, '../../data/raw/DATA.MKF')
const buf = new Uint8Array(readFileSync(dataPath))
const offsets = parseChunkOffsets(buf)
const chunkCount = offsets.length - 1
console.log('DATA.MKF chunkCount =', chunkCount)
console.log(
  'offsets.length =',
  offsets.length,
  'last offset =',
  offsets[offsets.length - 1],
  'fileSize =',
  buf.byteLength,
)

// struct sizes
const STORE = 9 * 2 // 18
const ENEMY = 70
const ENEMYTEAM = 5 * 2 // 10
const PLAYERROLES = 900
const MAGIC = 32
const BATTLEFIELD = 12
const LEVELUPMAGIC_ALL = 5 * 4 // 20
const ENEMYPOS = 5 * 5 * 4 // 100
const LEVELUPEXP = 100 * 2 // 200
const BATTLEEFFECTIDX = 10 * 2 * 2 // 40

const meaning = {
  0: ['STORE', STORE],
  1: ['ENEMY', ENEMY],
  2: ['ENEMYTEAM', ENEMYTEAM],
  3: ['PLAYERROLES (single record)', PLAYERROLES],
  4: ['MAGIC', MAGIC],
  5: ['BATTLEFIELD', BATTLEFIELD],
  6: ['LEVELUPMAGIC_ALL', LEVELUPMAGIC_ALL],
  7: ['(empty / unused)', 0],
  8: ['(empty / unused)', 0],
  9: ['SPRITEUI (sprite group, raw)', 0],
  10: ['battle effect sprite group', 0],
  11: ['rgwBattleEffectIndex[10][2]', BATTLEEFFECTIDX],
  12: ['bufDialogIcons (282B sprite)', 0],
  13: ['EnemyPos 5x5 PALPOS', ENEMYPOS],
  14: ['rgLevelUpExp[100]', LEVELUPEXP],
}

for (let i = 0; i < chunkCount; i++) {
  const size = offsets[i + 1] - offsets[i]
  const [label, recordSize] = meaning[i] || ['?', 0]
  let recordInfo = ''
  if (recordSize > 0) {
    const recordCount = size / recordSize
    recordInfo = `recordSize=${recordSize} → records=${recordCount}${Number.isInteger(recordCount) ? '' : ' (NOT INTEGER!)'}`
  }
  console.log(
    `chunk ${String(i).padStart(2)}: size=${String(size).padStart(6)}  ${label.padEnd(34)} ${recordInfo}`,
  )
}
