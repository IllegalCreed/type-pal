/**
 * 隔离实跑 BDF与lookup落盘：两个字形完整内容、WORD分类及M.MSG文本。
 * 与分段管线用例互补；原始codec另有单测，不冒称本文件证明实际原盘提取。
 * 临时树和子进程归cliHost，合成输入与内容oracle归本文件。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, test } from 'vitest'
import { type CliRunResult, createCliTestHost } from './__tests__/cli-host.js'
import {
  buildDataMkfArchive,
  buildSssArchive,
  buildTailPipelineInputs,
  buildWordDatArchive,
} from './__tests__/glm-q/cli-pipeline-inputs.js'

const MSG_TEXT = 'HELLO MSG'

/** 最小合法 BDF：8×16 ASCII 'A'(65) + 16×16 CJK '丂'(U+4E02，19970)，各 16 行位图。 */
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

const cliHost = createCliTestHost('glm-q-cli-fl-')
const { runCli } = cliHost
afterAll(cliHost.disposeAll)

async function runTailCli(withBdf: boolean): Promise<{ tree: string; result: CliRunResult }> {
  const tree = cliHost.createTree()
  const rawDir = join(tree, 'data', 'raw')
  writeFileSync(join(rawDir, 'mus.mkf'), new Uint8Array([8, 0, 0, 0, 8, 0, 0, 0]))
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
  const result = await runCli(tree)
  return { tree, result }
}

test('Q10 CLI BDF 接线正向：合成 unifont-cn.bdf → data/font/glyphs.json 完整内容', async () => {
  const { tree, result } = await runTailCli(true)
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  expect(result.stdout).toContain('BDF → JSON font glyphs …')
  expect(result.stdout).toContain('font glyphs written: 2')
  expect(result.stderr).toBe('')
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
  expect(result.stderr).toBe('[pal-extract] unifont-cn.bdf 缺,跳过 font\n')
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
