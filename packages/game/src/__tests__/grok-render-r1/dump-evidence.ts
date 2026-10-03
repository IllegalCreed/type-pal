/**
 * 把已经画到真实 canvas / 已经写进真实 DOM 的结果落成 PNG。
 * 读回重新打开文件，核对像素和 DOM 原文。不生成替代画面。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCanvas, loadImage } from 'canvas'

// Visual readback is an execution witness, not a repository artifact.  Keep it
// in an isolated per-process temp tree so ordinary test/coverage runs cannot
// dirty docs/testing with generated PNGs and logs.  The assertions still write,
// reopen, hash, decode, and compare the real bytes before returning.
const pixelDir = mkdtempSync(join(tmpdir(), 'type-pal-grok-pixels-'))

export interface RgbaCheck {
  x: number
  y: number
  rgba: readonly [number, number, number, number]
}

export interface HostSnap {
  label: string
  text: string
  width: string
  flags: string[]
}

export function readHost(
  label: string,
  textEl: Element | null,
  widthEl: Element | null,
  flagEl: Element | null,
): HostSnap {
  return {
    label,
    text: textEl?.textContent ?? '',
    width: widthEl instanceof HTMLElement ? widthEl.style.width : '',
    flags: flagEl instanceof HTMLElement ? [...flagEl.classList] : [],
  }
}

export async function dumpFramebuffer(
  id: string,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  checks: readonly RgbaCheck[],
): Promise<void> {
  if (rgba.length !== width * height * 4) throw new Error(`${id} rgba length ${rgba.length}`)
  const png = encode(id, width, height, rgba)
  const decoded = await decode(id, png, width, height)
  const readback = checks.map((check) => {
    const got = pixelAt(decoded, width, check.x, check.y)
    if (!sameRgba(got, check.rgba)) {
      throw new Error(
        `${id} readback ${check.x},${check.y} ${got.join(',')} != ${check.rgba.join(',')}`,
      )
    }
    return { x: check.x, y: check.y, rgba: got }
  })
  writeLog(id, {
    id,
    kind: 'canvas',
    png: rel(id),
    sha256: sha256(png),
    bytes: png.length,
    width,
    height,
    readback,
  })
}

export async function dumpHost(id: string, snaps: readonly HostSnap[]): Promise<void> {
  if (snaps.length === 0) throw new Error(`${id} has no host snap`)
  const payloads = snaps.map(payloadOf)
  const byteRows = payloads.map((payload) => Buffer.from(payload, 'utf8'))
  const width = Math.max(201, ...byteRows.map((row) => 101 + row.length))
  const height = snaps.length
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < byteRows.length; index += 1) {
    const row = byteRows[index]
    if (!row) throw new Error(`${id} missing host row`)
    paintHostRow(rgba, width, index, snaps[index], row)
  }
  const png = encode(id, width, height, rgba)
  const decoded = await decode(id, png, width, height)
  const readback = snaps.map((snap, index) => readHostRow(decoded, width, index, snap))
  writeLog(id, {
    id,
    kind: 'host',
    png: rel(id),
    sha256: sha256(png),
    bytes: png.length,
    width,
    height,
    dom: snaps,
    readback,
  })
}

function paintHostRow(
  rgba: Uint8ClampedArray,
  width: number,
  row: number,
  snap: HostSnap | undefined,
  bytes: Buffer,
): void {
  if (!snap) throw new Error('missing host snap')
  const pct = percentOf(snap.width)
  const base = row * width
  put(rgba, base, bytes.length & 0xff, bytes.length >> 8, pct, 255)
  for (let x = 1; x <= 100; x += 1) {
    const on = x <= pct
    put(rgba, base + x, on ? 0 : 24, on ? 160 : 24, on ? 40 : 24, 255)
  }
  for (let i = 0; i < bytes.length; i += 1) {
    put(rgba, base + 101 + i, bytes[i] ?? 0, 0, pct, 255)
  }
  for (let x = 101 + bytes.length; x < width; x += 1) put(rgba, base + x, 0, 0, pct, 255)
}

function readHostRow(
  rgba: Uint8ClampedArray,
  width: number,
  row: number,
  snap: HostSnap,
): HostSnap & { widthPercent: number } {
  const base = row * width
  const byteLength = (rgba[base * 4] ?? 0) + ((rgba[base * 4 + 1] ?? 0) << 8)
  const storedPct = rgba[base * 4 + 2] ?? 0
  let bar = 0
  for (let x = 1; x <= 100; x += 1) {
    if ((rgba[(base + x) * 4 + 1] ?? 0) !== 160) break
    bar += 1
  }
  const chars: number[] = []
  for (let i = 0; i < byteLength; i += 1) chars.push(rgba[(base + 101 + i) * 4] ?? 0)
  const decoded = Buffer.from(chars).toString('utf8')
  if (decoded !== payloadOf(snap) || bar !== percentOf(snap.width) || storedPct !== bar) {
    throw new Error(`${snap.label} host readback mismatch`)
  }
  const [label, text, widthText, flags] = decoded.split('\t')
  return {
    label: label ?? '',
    text: text ?? '',
    width: widthText ?? '',
    flags: flags ? flags.split(',').filter((flag) => flag.length > 0) : [],
    widthPercent: bar,
  }
}

function payloadOf(snap: HostSnap): string {
  return `${snap.label}\t${snap.text}\t${snap.width}\t${snap.flags.join(',')}`
}

function percentOf(width: string): number {
  const matched = /^(\d+(?:\.\d+)?)%$/.exec(width)
  if (!matched?.[1]) return 0
  return Math.max(0, Math.min(100, Math.round(Number(matched[1]))))
}

function encode(id: string, width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  mkdirSync(pixelDir, { recursive: true })
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(width, height)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  const png = canvas.toBuffer('image/png')
  writeFileSync(join(pixelDir, `${id}.png`), png)
  return png
}

async function decode(
  id: string,
  png: Buffer,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const reread = readFileSync(join(pixelDir, `${id}.png`))
  if (!reread.equals(png)) throw new Error(`${id} readback bytes differ`)
  const image = await loadImage(reread)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  return ctx.getImageData(0, 0, width, height).data
}

function pixelAt(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const off = (y * width + x) * 4
  return [rgba[off] ?? 0, rgba[off + 1] ?? 0, rgba[off + 2] ?? 0, rgba[off + 3] ?? 0]
}

function sameRgba(
  got: readonly [number, number, number, number],
  expected: readonly [number, number, number, number],
): boolean {
  return got.every((channel, index) => channel === expected[index])
}

function put(
  rgba: Uint8ClampedArray,
  pixel: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const off = pixel * 4
  rgba[off] = r
  rgba[off + 1] = g
  rgba[off + 2] = b
  rgba[off + 3] = a
}

function writeLog(id: string, body: unknown): void {
  writeFileSync(join(pixelDir, `${id}.readback.json`), `${formatReadback(body)}\n`)
}

/** Biome 把放得进行宽的短数组收成一行。先收成同样形状，重跑测试不会把日志打回多行。 */
function formatReadback(body: unknown): string {
  const lines = JSON.stringify(body, null, 2).split('\n')
  const out: string[] = []
  let index = 0
  while (index < lines.length) {
    const collapsed = collapseShortArray(lines, index)
    if (collapsed) {
      out.push(collapsed.line)
      index = collapsed.next
      continue
    }
    out.push(lines[index] ?? '')
    index += 1
  }
  return out.join('\n')
}

function collapseShortArray(
  lines: readonly string[],
  index: number,
): { line: string; next: number } | undefined {
  const line = lines[index] ?? ''
  if (!line.endsWith('[')) return undefined
  const items: string[] = []
  let cursor = index + 1
  while (cursor < lines.length) {
    const trimmed = (lines[cursor] ?? '').trim()
    if (trimmed === ']' || trimmed === '],') {
      const joined = `${line.slice(0, -1)}[${items.join(', ')}]${trimmed.endsWith(',') ? ',' : ''}`
      if (items.length > 0 && joined.length <= 100 && items.every(isJsonPrimitive)) {
        return { line: joined, next: cursor + 1 }
      }
      return undefined
    }
    const item = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed
    if (!isJsonPrimitive(item)) return undefined
    items.push(item)
    cursor += 1
  }
  return undefined
}

function isJsonPrimitive(item: string): boolean {
  return (
    item === 'true' ||
    item === 'false' ||
    item === 'null' ||
    /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(item) ||
    /^"(?:[^"\\]|\\.)*"$/.test(item)
  )
}

function rel(id: string): string {
  return join(pixelDir, `${id}.png`)
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}
