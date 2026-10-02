// Q10 r18 · CLI 字形与 lookup 尾段隔离实跑（BDF → glyphs.json 接线 + words/strings 产物）。
//
// 排重 basis（本批两例只打旧证未覆盖的窄轴）：
// - cli-isolated.glm-q.test.ts 对 BDF 只断言缺文件 warn（「unifont-cn.bdf 缺,跳过 font」）；
//   cli.ts:872-879 正向接线（existsSync → parseBdf → glyphsToJson → data/font/glyphs.json
//   + stdout 计数）从未走过。parseBdf/glyphsToJson 单元另有直测，不覆盖 CLI 总装。
// - lookup 产物（cli.ts:869-870 words.json/strings.json）：事件例只断言 scene 文件与
//   注记，lookup/words.json 与 strings.json 的内容无旧断言。corpus glyphs.json/lookup 0 命中。
// 反控 FL1/FL2 均为产品源码变异（Q-R18-01 后口径；见 counters/*.axis）。
import { spawn } from 'node:child_process'
import {
  cpSync,
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
import { afterAll, expect, test } from 'vitest'
import {
  buildDataMkfArchive,
  buildSssArchive,
  buildTailPipelineInputs,
  buildWordDatArchive,
} from './__tests__/glm-q/cli-pipeline-inputs.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_PACKAGE = resolve(HERE, '..')
const MSG_TEXT = 'HELLO MSG'

/** 最小合法 BDF：8×16 ASCII 'A'(65) + 16×16 CJK 0x4E2D(19970)，各 16 行位图。 */
function buildBdf(): Uint8Array {
  const rows = (widthBytes: number, firstRow: string): string[] =>
    Array.from({ length: 16 }, (_, i) => (i === 0 ? firstRow : '0'.repeat(widthBytes * 2)))
  const text = [
    'STARTFONT 2.1',
    'FONT Unifont',
    'SIZE 16 75 75',
    'FONTBOUNDINGBOX 16 16 0 0',
    'CHARS 2',
    'STARTCHAR latin_a',
    'ENCODING 65',
    'BBX 8 16 0 0',
    'BITMAP',
    ...rows(1, 'FF'),
    'ENDCHAR',
    'STARTCHAR cjk_zhong',
    'ENCODING 19970',
    'BBX 16 16 0 0',
    'BITMAP',
    ...rows(2, 'FFFF'),
    'ENDCHAR',
    'ENDFONT',
  ].join('\n')
  return new TextEncoder().encode(text)
}

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

const trees: string[] = []
afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true })
})

async function runTailCli(withBdf: boolean): Promise<{ tree: string; result: RunResult }> {
  const tree = mkdtempSync(join(tmpdir(), 'glm-q-cli-fl-'))
  const pkgDir = join(tree, 'packages', 'pal-extract')
  mkdirSync(pkgDir, { recursive: true })
  cpSync(join(REAL_PACKAGE, 'src'), join(pkgDir, 'src'), { recursive: true })
  cpSync(join(REAL_PACKAGE, 'package.json'), join(pkgDir, 'package.json'))
  symlinkSync(join(REAL_PACKAGE, 'node_modules'), join(pkgDir, 'node_modules'), 'dir')
  const rawDir = join(tree, 'data', 'raw')
  mkdirSync(rawDir, { recursive: true })
  const rawFiles: Record<string, Uint8Array> = {
    'SSS.MKF': buildSssArchive(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDatArchive(),
    'DATA.MKF': buildDataMkfArchive(),
    ...buildTailPipelineInputs(),
  }
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  if (withBdf) writeFileSync(join(rawDir, 'unifont-cn.bdf'), buildBdf())
  mkdirSync(join(rawDir, 'Musics'), { recursive: true })
  trees.push(tree)
  const result = await runCli(tree)
  return { tree, result }
}

test('Q10 CLI BDF 接线正向：合成 unifont-cn.bdf → data/font/glyphs.json 完整内容', async () => {
  const { tree, result } = await runTailCli(true)
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  expect(result.stdout).toContain('BDF → JSON font glyphs …')
  expect(result.stdout).toContain('font glyphs written: 2')
  expect(result.stderr).not.toContain('unifont-cn.bdf 缺')
  const glyphs = JSON.parse(
    readFileSync(join(tree, 'data', 'extracted', 'data', 'font', 'glyphs.json'), 'utf8'),
  )
  // bitmap：'A' 8×16（首行 0xFF 余 0，bytesPerRow=1）；CJK 16×16（首行 FF FF，bytesPerRow=2）
  const asciiBitmap = new Uint8Array(16)
  asciiBitmap[0] = 0xff
  const cjkBitmap = new Uint8Array(32)
  cjkBitmap[0] = 0xff
  cjkBitmap[1] = 0xff
  expect(glyphs).toEqual({
    count: 2,
    glyphs: [
      {
        codepoint: 65,
        width: 8,
        height: 16,
        bitmapBase64: Buffer.from(asciiBitmap).toString('base64'),
      },
      {
        codepoint: 19970,
        width: 16,
        height: 16,
        bitmapBase64: Buffer.from(cjkBitmap).toString('base64'),
      },
    ],
  })
})

test('Q10 CLI lookup 产物：words.json 扁平/分类切片与 strings.json 消息表', async () => {
  const { tree, result } = await runTailCli(false)
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  const words = JSON.parse(readFileSync(out('lookup/words.json'), 'utf8'))
  // flat：565 条；全空格记录剥成空串，记录 61='ITEMNAME1' 剥尾标 '1' → 'ITEMNAME'
  expect(words.flat).toHaveLength(565)
  expect(words.flat[0]).toBe('')
  expect(words.flat[61]).toBe('ITEMNAME')
  // 分类切片：61 是物品段第 0 条
  expect(words.items[0]).toBe('ITEMNAME')
  expect(words.persons).toHaveLength(6)
  // strings：M.MSG 按偏移 [0,9] 切出唯一消息
  const strings = JSON.parse(readFileSync(out('lookup/strings.json'), 'utf8'))
  expect(strings).toEqual([MSG_TEXT])
})
