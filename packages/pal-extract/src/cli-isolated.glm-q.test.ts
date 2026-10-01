// Q10 · pal-extract CLI 隔离实跑（对应 Codex COMMON-01：cli.ts REPO_ROOT 从模块位置派生，
// mkdtemp 复制模块树 + 合成小输入即可隔离覆盖公开 CLI，不触真实 data/raw/extracted）。
//
// 隔离方式：mkdtemp 临时树内复制 src/** 与 package.json（只读产品源的拷贝）、symlink 真实
// node_modules（依赖解析），REPO_ROOT 解析到临时树 → RAW/OUT 全部落临时目录。
// 合成输入为合法最小格式（SSS 5 chunk / WORD.DAT 565×10B / M.MSG 平铺 GBK），
// 不写真实 raw/extracted、不运行主工程生成。
import { spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeSpriteChunk } from '@type-pal/shared'
import { afterAll, expect, test } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_PACKAGE = resolve(HERE, '..')

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, true)
  return out
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value, true)
  return out
}

/** MKF 归档：N+1 个 u32 LE 偏移头 + 顺序 chunk 数据（shared/mkf.ts 合同）。 */
function mkf(chunks: Uint8Array[]): Uint8Array {
  const headerSize = (chunks.length + 1) * 4
  const bodyLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const buf = new Uint8Array(headerSize + bodyLength)
  const view = new DataView(buf.buffer)
  let offset = headerSize
  for (const [index, chunk] of chunks.entries()) {
    view.setUint32(index * 4, offset, true)
    buf.set(chunk, offset)
    offset += chunk.length
  }
  view.setUint32(chunks.length * 4, offset, true)
  return buf
}

const EVENT_OBJECT_SIZE = 32
const SCENE_SIZE = 8
const OBJECT_STRIDE = 14
const OBJECT_TABLE_SLOTS = 551 // 0..550（enemy 段到 550）
const WORD_RECORDS = 565
const WORD_LENGTH = 10

/** 场景入口 ip=1：showDialog(msg 0)；ip=2：end advance。指令 0 不可达填充。 */
function buildSss(options: { truncateEventObjects?: boolean } = {}): Uint8Array {
  const eventObject = new Uint8Array(EVENT_OBJECT_SIZE)
  const scene = new Uint8Array(SCENE_SIZE)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true) // mapNum
  sceneView.setUint16(2, 1, true) // scriptOnEnter → ip 1
  sceneView.setUint16(4, 2, true) // scriptOnTeleport → ip 2
  sceneView.setUint16(6, 0, true) // eventObjectIndex
  const objects = new Uint8Array(OBJECT_TABLE_SLOTS * OBJECT_STRIDE) // 全 0：无全局脚本入口
  // 物品 61 命名走 WORD.DAT；给 61 一个 giveItem 引用（指令 0，不可达填充不参与 slice）
  const messageOffsets = new Uint8Array([...u32(0), ...u32(9)])
  // bytecode：ip0 giveItem(61×1)，ip1 showDialog(msg0)，ip2 end-advance
  const bytecode = new Uint8Array([
    ...u16(0x001f),
    ...u16(61),
    ...u16(1),
    ...u16(0),
    ...u16(0xffff),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...u16(0x0001),
    ...u16(0),
    ...u16(0),
    ...u16(0),
  ])
  const chunk0 = options.truncateEventObjects ? eventObject.slice(0, 10) : eventObject
  return mkf([chunk0, scene, objects, messageOffsets, bytecode])
}

function buildWordDat(): Uint8Array {
  const buf = new Uint8Array(WORD_RECORDS * WORD_LENGTH).fill(0x20)
  // 记录 61 = 物品段第 0 条：'ITEMNAME1'（尾部标记 '1' 由 parseWordDat 剥除）
  const name = 'ITEMNAME1'
  for (const [index, ch] of [...name].entries()) buf[61 * WORD_LENGTH + index] = ch.charCodeAt(0)
  return buf
}

const MSG_TEXT = 'HELLO MSG'

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

function runCli(tree: string): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      [join(REAL_PACKAGE, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/cli.ts'],
      {
        cwd: join(tree, 'packages', 'pal-extract'),
        env: { ...process.env, NODE_COMPILE_CACHE: '' },
      },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr }))
  })
}

function makeTree(rawFiles: Record<string, Uint8Array>): string {
  const tree = mkdtempSync(join(tmpdir(), 'glm-q-cli-'))
  const pkgDir = join(tree, 'packages', 'pal-extract')
  mkdirSync(pkgDir, { recursive: true })
  cpSync(join(REAL_PACKAGE, 'src'), join(pkgDir, 'src'), { recursive: true })
  cpSync(join(REAL_PACKAGE, 'package.json'), join(pkgDir, 'package.json'))
  symlinkSync(join(REAL_PACKAGE, 'node_modules'), join(pkgDir, 'node_modules'), 'dir')
  const rawDir = join(tree, 'data', 'raw')
  mkdirSync(rawDir, { recursive: true })
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  return tree
}

/**
 * DATA.MKF 15 chunk（0..14）合成最小合法表：
 *   0 STORE 18B×1（首格 61=物品、余 0 截断）；1 ENEMY 70B×1；2 ENEMYTEAM 10B×1；
 *   3 PLAYERROLES 900B（spriteNum[0]=2，SoA 第 3 字段 offset 24）；4 MAGIC 32B×1；
 *   5 BATTLEFIELD 12B×1；6 LEVELUPMAGIC 20B×1（roleCount 5）；7/8 空；
 *   9 SPRITEUI = encodeSpriteChunk 正向构造的 sprite-group；10 同构 gzip blob；
 *   11 BATTLEEFFECTINDEX 40B；12 dialog icons 282B；13 ENEMYPOS 100B；14 LEVELEXP 200B。
 */
function buildDataMkf(): Uint8Array {
  const store = new Uint8Array([...u16(61), ...new Uint8Array(16)])
  const enemy = new Uint8Array(70)
  const team = new Uint8Array(10)
  const roles = new Uint8Array(900)
  const rolesView = new DataView(roles.buffer)
  rolesView.setUint16(24, 2, true) // SoA: avatar/spriteNumInBattle 之后第 3 字段 spriteNum, role 0
  const magic = new Uint8Array(32)
  const field = new Uint8Array(12)
  const levelUpMagic = new Uint8Array(20)
  const spriteChunk = encodeSpriteChunk([
    { width: 4, height: 4, pixels: new Uint8Array(16).fill(3), opaque: new Uint8Array(16).fill(1) },
  ])
  const effectIndex = new Uint8Array(40)
  const dialogIcons = new Uint8Array(282).fill(7)
  const enemyPos = new Uint8Array(100)
  const levelUpExp = new Uint8Array(200)
  const chunks = [
    store,
    enemy,
    team,
    roles,
    magic,
    field,
    levelUpMagic,
    new Uint8Array(0),
    new Uint8Array(0),
    spriteChunk,
    spriteChunk,
    effectIndex,
    dialogIcons,
    enemyPos,
    levelUpExp, // chunk10=原始 group（CLI 自行 gzip blob）
  ]
  return mkf(chunks)
}

/**
 * 图像/音频段合成输入（续批2）：
 *   RNG.MKF = 1 chunk 的 sub-MKF，其唯一 sub-chunk 为空（decodeRngFrames: byteLength 0 → []，
 *   chunk 仍落 .rle blob 且 manifest frameCount=0）；
 *   RGM.MKF / BALL.MKF = 各 1 chunk 合成 RLE 头像/图标（0x02 00 00 00 file header + 2×2 全不透明）；
 *   FIRE.MKF = 0 chunk 空 MKF（manifest chunkCount=0）；
 *   SOUNDS.MKF = 1 空 chunk + 1 带数据 chunk（空 skip 不写 wav，带数据者原样写 .wav）；
 *   Musics/ = 1 个 {NNN}.MID（归一化 .mid）+ 1 个 TRACKxx.ogg（原名）。
 * FBP.MKF 不提供 → splash 段 ENOENT 边界拒绝（exit 1）。
 */
function rleBitmap2x2(): Uint8Array {
  // decodeRle: width(2) height(2) + 4 个直接像素（opaque=1）
  return new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 9, 8, 7, 6])
}

function buildImageStageInputs(): Record<string, Uint8Array> {
  const rngChunk = mkf([new Uint8Array(0)]) // 空 sub-chunk → frames=[]
  const withHeader = (rle: Uint8Array): Uint8Array =>
    new Uint8Array([...new Uint8Array([0x02, 0x00, 0x00, 0x00]), ...rle])
  return {
    'RNG.MKF': mkf([rngChunk]),
    'RGM.MKF': mkf([withHeader(rleBitmap2x2())]),
    'BALL.MKF': mkf([withHeader(rleBitmap2x2())]),
    'FIRE.MKF': mkf([]),
    'SOUNDS.MKF': mkf([new Uint8Array(0), new TextEncoder().encode('WAVDATA-1')]),
  }
}

/**
 * 全管线合成输入（增量批，r9）：使 CLI 完整走到底（asset-manifest + done）。
 *   FBP.MKF = 5 chunk：0 空(skip)、1 {0,0,0,0} 零流(解出 0B≠64000 warn skip)、
 *     2 坏流(decompress throw warn skip)、3/4 不提供(YJ2 数据难精确合成 64000，全走 skip 路径)；
 *   MAP.MKF = 2 chunk：0 = {65536 零流}（YJ2 解出 65536B 全零 → parseMap 走通，全 cell lower/upper=0）、
 *     1 短 chunk（YJ2 头 2B 解出 2B ≠ 65536 → parseMap throw → warn skip）；
 *   GOP.MKF = 1 chunk = encodeSpriteChunk 合成 1 帧（tileset gzip blob）；
 *   PAT.MKF = 2 chunk：0 = 768B 调色板（日间）、1 = 1536B（日+夜）；<768 chunk 不加；
 *   MGO/F/ABC.MKF = 0 chunk 空 MKF（dump-all 循环零次）；unifont-cn.bdf 不提供（warn 跳过）。
 */
function yj2Zeros(uncompressedLen: number): Uint8Array {
  const src = new Uint8Array(4 + 64)
  new DataView(src.buffer).setUint32(0, uncompressedLen, true)
  return src
}

function buildFullPipelineInputs(): Record<string, Uint8Array> {
  const palette768 = new Uint8Array(768)
  for (let i = 0; i < 256; i++) {
    palette768[i * 3] = i
    palette768[i * 3 + 1] = (i * 2) % 256
    palette768[i * 3 + 2] = 255 - i
  }
  const palette1536 = new Uint8Array(1536)
  palette1536.set(palette768, 0)
  palette1536.set(palette768, 768)
  return {
    ...buildImageStageInputs(),
    'FBP.MKF': mkf([
      new Uint8Array(0),
      yj2Zeros(0),
      new Uint8Array(0),
      new Uint8Array(0),
      new Uint8Array(0),
    ]), // chunk3/4 空 → splash skip
    'MAP.MKF': mkf([yj2Zeros(65536), yj2Zeros(65536)]), // chunk1 = scene(mapNum=1) 引用；两 chunk 均解出 65536B 全零
    'GOP.MKF': mkf([
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(3),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(5),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
    ]),
    'PAT.MKF': mkf([palette768, palette1536]),
    'MGO.MKF': mkf([]),
    'F.MKF': mkf([]),
    'ABC.MKF': mkf([]),
  }
}

const trees: string[] = []
afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true })
})

test('Q10 CLI 隔离实跑：合成小输入走完事件管线（round-trip 门 + 切片落盘 + 词表注记）', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  trees.push(tree)
  const result = await runCli(tree)
  // 事件管线全绿后，数据表阶段因缺 DATA.MKF 拒绝（合成输入只覆盖事件段）。
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('[pal-extract] events round-trip OK')
  expect(result.stdout).toContain('[pal-extract] events written: 1 scenes')
  expect(result.stderr).toContain('ENOENT')

  const eventsDir = join(tree, 'data', 'extracted', 'events')
  const scene = JSON.parse(readFileSync(join(eventsDir, 'scene-000.json'), 'utf8'))
  expect(scene.scene).toBe(0)
  const sceneCommands = scene.segments.flatMap(
    (segment: { commands: { op: string }[] }) => segment.commands,
  )
  expect(sceneCommands.map((command: { op: string }) => command.op)).toEqual(['showDialog', 'end'])
  expect(sceneCommands[0].text).toBe(MSG_TEXT)
  const shared = JSON.parse(readFileSync(join(eventsDir, 'shared.json'), 'utf8'))
  expect(shared.segments.flatMap((segment: { commands: unknown[] }) => segment.commands)).toEqual(
    [],
  )
  const objects = JSON.parse(readFileSync(join(eventsDir, 'objects.json'), 'utf8'))
  expect(objects.segments.flatMap((segment: { commands: unknown[] }) => segment.commands)).toEqual(
    [],
  )
  const all = JSON.parse(readFileSync(join(eventsDir, 'all.json'), 'utf8'))
  expect(all.segments).toHaveLength(1)
  const allCommands = all.segments[0].commands
  expect(allCommands).toHaveLength(3)
  const give = allCommands.find((command: { op: string }) => command.op === 'giveItem')
  expect(give.itemId).toBe(61)
  expect(give._item).toBe('ITEMNAME') // WORD.DAT 记录 61 + 尾标记剥除
})

test('Q10 CLI 隔离实跑：合成 DATA.MKF 走完数据表段（逐表落盘 + SPRITEUI/effect blob）', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
    'DATA.MKF': buildDataMkf(),
  })
  trees.push(tree)
  const result = await runCli(tree)
  // 数据表段完成后，图像段缺 RNG.MKF → exit 1 ENOENT（合成输入只覆盖 DATA 表段）。
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('[pal-extract] events round-trip OK')
  expect(result.stdout).toContain('[pal-extract] SPRITEUI (chunk 9) written: 1 frames')

  const dataDir = join(tree, 'data', 'extracted', 'data')
  const stores = JSON.parse(readFileSync(join(dataDir, 'stores.json'), 'utf8'))
  expect(stores).toEqual([{ id: 0, items: [61] }]) // 首个 0 截断剩余 8 槽
  const magic = JSON.parse(readFileSync(join(dataDir, 'magic.json'), 'utf8'))
  expect(magic).toHaveLength(1)
  expect(magic[0].id).toBe(0)
  const enemies = JSON.parse(readFileSync(join(dataDir, 'enemies.json'), 'utf8'))
  expect(enemies).toHaveLength(1)
  const roles = JSON.parse(readFileSync(join(dataDir, 'player-roles.json'), 'utf8'))
  expect(roles.roles[0].spriteNum).toBe(2) // SoA offset 24 的真值回读
  const exp = JSON.parse(readFileSync(join(dataDir, 'level-up-exp.json'), 'utf8'))
  expect(exp).toHaveLength(100)
  const fields = JSON.parse(readFileSync(join(dataDir, 'battle-fields.json'), 'utf8'))
  expect(fields).toHaveLength(1)
  const icons = JSON.parse(readFileSync(join(dataDir, 'dialog-icons-raw.json'), 'utf8'))
  expect(icons.size).toBe(282)
  expect(existsSync(join(tree, 'data', 'extracted', 'images', 'ui', 'frame-00.png'))).toBe(true)
  expect(existsSync(join(tree, 'data', 'extracted', 'data', 'magic', 'effect.rle'))).toBe(true)
  // 图像段边界：缺 RNG.MKF 在数据表全部落盘后拒绝。
  expect(result.stderr).toContain('RNG.MKF')
})

test('Q10 CLI 隔离实跑：合成图像/音频段（RNG 空 chunk/RGM/BALL 合成 RLE/FIRE 空/SOUNDS/Musics），缺 FBP 边界拒绝', async () => {
  const inputs = {
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
    'DATA.MKF': buildDataMkf(),
    ...buildImageStageInputs(),
  }
  const tree = makeTree(inputs)
  // Musics/ 独立目录（非 MKF）
  const musics = join(tree, 'data', 'raw', 'Musics')
  mkdirSync(musics, { recursive: true })
  writeFileSync(join(musics, '7.MID'), new TextEncoder().encode('MIDI7'))
  writeFileSync(join(musics, 'TRACK02.ogg'), new TextEncoder().encode('OGG2'))
  trees.push(tree)
  const result = await runCli(tree)
  // 图像/音频段全部完成后，splash 段缺 FBP.MKF → exit 1 ENOENT。
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('RNG.MKF blobs written (1 chunks, 0 frames total)')
  expect(result.stdout).toContain('RGM.MKF written: 1 / 1 portraits')
  expect(result.stdout).toContain('BALL.MKF written: 1 / 1 icons')
  expect(result.stdout).toContain('FIRE.MKF blobs written (0 chunks, 0 frames total)')
  expect(result.stdout).toContain('SOUNDS.MKF: 1 WAV written + metadata (2 chunks)')
  expect(result.stdout).toContain('Musics: 1 MIDI + 1 CD ogg')
  expect(result.stderr).toContain('FBP.MKF')

  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  // RNG：空 sub-chunk 仍写 blob + manifest frameCount=0
  expect(existsSync(out('data/animation/rng-00.rle'))).toBe(true)
  const rngManifest = JSON.parse(readFileSync(out('data/rng-frames.json'), 'utf8'))
  expect(rngManifest.chunks).toEqual([{ chunkIndex: 0, frameCount: 0, frames: [] }])
  // RGM/BALL：2×2 合成 RLE → PNG + manifest 尺寸
  expect(existsSync(out('images/portraits/00.png'))).toBe(true)
  const portraits = JSON.parse(readFileSync(out('data/portraits.json'), 'utf8'))
  expect(portraits.portraits).toEqual([{ chunkIndex: 0, width: 2, height: 2 }])
  expect(existsSync(out('images/items/000.png'))).toBe(true)
  const icons = JSON.parse(readFileSync(out('data/items-icons.json'), 'utf8'))
  expect(icons.icons).toEqual([{ chunkIndex: 0, width: 2, height: 2 }])
  // FIRE 空 MKF：manifest chunkCount=0、无 blob
  const fire = JSON.parse(readFileSync(out('data/fire-sprites.json'), 'utf8'))
  expect(fire).toEqual({ chunkCount: 0, chunks: [] })
  // SOUNDS：空 chunk skip、带数据原样
  expect(existsSync(out('sounds/1.wav'))).toBe(true)
  expect(existsSync(out('sounds/0.wav'))).toBe(false)
  const sounds = JSON.parse(readFileSync(out('data/sounds-metadata.json'), 'utf8'))
  expect(
    sounds.chunks.map((c: { index: number; size: number; isEmpty: boolean }) => [
      c.size,
      c.isEmpty,
    ]),
  ).toEqual([
    [0, true],
    [9, false],
  ])
  // Musics：{NNN}.MID → 归一化 007.mid；ogg 原名
  expect(existsSync(out('music/007.mid'))).toBe(true)
  expect(existsSync(out('music/TRACK02.ogg'))).toBe(true)
  const music = JSON.parse(readFileSync(out('data/music-manifest.json'), 'utf8'))
  expect(music).toEqual({ midi: [7], cdTracks: ['TRACK02.ogg'] })
})

test('Q10 CLI 隔离实跑：全管线合成输入走到底（MAP/GOP tileset + PAT 调色板 + 空 MGO/F/ABC + asset-manifest + done）', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
    'DATA.MKF': buildDataMkf(),
    ...buildFullPipelineInputs(),
  })
  const musics = join(tree, 'data', 'raw', 'Musics')
  mkdirSync(musics, { recursive: true })
  trees.push(tree)
  const result = await runCli(tree)
  expect(result.exitCode).toBe(0)
  // 全管线完成 → exit 0 + done 日志
  expect(result.stdout).toContain('tilesets written: 2 / 2 unique mapNums')
  expect(result.stdout).toContain('palette written (2 chunks)')
  expect(result.stdout).toContain('sprite blobs written: 0 sprites, 0 frames total')
  expect(result.stdout).toContain('battle sprite blobs written: 0 sprites, 0 frames total')
  expect(result.stdout).toContain('battle backgrounds written: 0 / 5 chunks')
  expect(result.stderr).toContain('unifont-cn.bdf 缺,跳过 font') // console.warn → stderr
  expect(result.stdout).toContain('[extract] asset-manifest.json:')
  expect(result.stdout).toContain('[pal-extract] done. output →')

  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  // MAP chunk0（零流 65536B 全零）：tilemap 走通、cell 全 0
  const tilemap = JSON.parse(readFileSync(out('data/tilemap/0.json'), 'utf8'))
  expect(tilemap.width).toBe(64)
  expect(tilemap.height).toBe(128)
  expect(tilemap.cells).toHaveLength(128)
  expect(tilemap.cells[0]).toHaveLength(64)
  expect(tilemap.cells[0][0]).toEqual({ lower: 130, upper: 0 }) // 零流 YJ2 首符号 130（Huffman 初始字面量），后续全 0
  expect(existsSync(out('data/tileset/0.rle'))).toBe(true)
  // PAT：768B 日间 + 1536B 日夜
  const pal0 = JSON.parse(readFileSync(out('data/palette/0.json'), 'utf8'))
  expect(pal0.colors).toHaveLength(256)
  expect(pal0.colors[1]).toEqual([4, 8, 255]) // 6bit→8bit 扩展 ((v<<2)|(v>>4))&0xff：1→4, 2→8, 254 输入实际是 (255-1)=254→255
  expect(pal0.nightColors).toBeUndefined()
  const pal1 = JSON.parse(readFileSync(out('data/palette/1.json'), 'utf8'))
  expect(pal1.nightColors).toHaveLength(256)
  // MAP chunk1 同为合法 65536B → tilemap/1.json 也写出
  const tilemap1 = JSON.parse(readFileSync(out('data/tilemap/1.json'), 'utf8'))
  expect(tilemap1.cells[0][0]).toEqual({ lower: 130, upper: 0 })
  // asset-manifest 自洽
  const manifest = JSON.parse(readFileSync(out('asset-manifest.json'), 'utf8'))
  expect(manifest.fileCount).toBeGreaterThan(10)
})

test('Q10 CLI 隔离实跑：截断 SSS chunk0 在解析边界精确拒绝且不产出事件文件', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss({ truncateEventObjects: true }),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  trees.push(tree)
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stdout).not.toContain('[pal-extract] events round-trip OK')
  expect(result.stderr).toContain('SSS chunk0: byte length 10 is not a multiple of 32')
  expect(existsSync(join(tree, 'data', 'extracted', 'events'))).toBe(false)
})
