import { readFileSync } from 'node:fs'

function openMkf(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const firstOffset = view.getUint32(0, true)
  const count = firstOffset / 4 - 1
  const offsets = []
  for (let i = 0; i <= count; i++) offsets.push(view.getUint32(i * 4, true))
  return { buffer, offsets }
}
const chunkCount = (m) => m.offsets.length - 1
const readChunk = (m, i) => m.buffer.subarray(m.offsets[i], m.offsets[i + 1])

const buf = new Uint8Array(readFileSync('/Users/zhangxu/illegal/type-pal/data/raw/DATA.MKF'))
const mkf = openMkf(buf)
const n = chunkCount(mkf)
console.log('DATA.MKF chunkCount =', n)
console.log('offsets.length =', mkf.offsets.length, 'last offset =', mkf.offsets[mkf.offsets.length-1], 'fileSize =', buf.byteLength)

// struct sizes
const STORE = 9*2          // 18
const ENEMY = 70
const ENEMYTEAM = 5*2      // 10
const PLAYERROLES = 900
const MAGIC = 32
const BATTLEFIELD = 12
const LEVELUPMAGIC_ALL = 5*4 // 20
const ENEMYPOS = 5*5*4     // 100
const LEVELUPEXP = 100*2   // 200
const BATTLEEFFECTIDX = 10*2*2 // 40

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

for (let i = 0; i < n; i++) {
  const size = readChunk(mkf, i).byteLength
  const m = meaning[i] || ['?', 0]
  let recInfo = ''
  if (m[1] > 0) {
    const recs = size / m[1]
    recInfo = `recordSize=${m[1]} → records=${size/m[1]}${Number.isInteger(recs) ? '' : ' (NOT INTEGER!)'}`
  }
  console.log(`chunk ${String(i).padStart(2)}: size=${String(size).padStart(6)}  ${m[0].padEnd(34)} ${recInfo}`)
}
