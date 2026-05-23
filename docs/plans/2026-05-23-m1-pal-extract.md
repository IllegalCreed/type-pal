# M1 · pal-extract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `pal-extract`:从 `data/raw/` 一次性产出 `data/extracted/` 完整结构 —— 切片场景(开局一带)的资源 + 事件全量反汇编。M2 起的运行时直接消费这份产出,events.json 接口形态钉死。

**Architecture:** 双管线 + 共享底层(`io/`)+ shared 包扩 TS 类型。资源管线产切片资源,事件管线产全量 events.json 并 round-trip 自动验证。CLI 串起来。设计见 [`2026-05-23-m1-pal-extract-design.md`](2026-05-23-m1-pal-extract-design.md)。

**Tech Stack:** TypeScript(`NodeNext` + `strict`) / pnpm workspace / Vitest。新增第三方:`pngjs`(索引位图 PNG 编码)、`iconv-lite`(GBK → UTF-8)。算法规格 = `reference/sdlpal/`:`res.c`(MKF)、`yj1.c`(YJ1)、`video.c` / RLE 解码、`script.c`(opcode 语义)、`text.c`(M.MSG / WORD.DAT 格式)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

> 设计与本计划存在小幅结构调整 —— `internal/word.ts` 在本计划落到 `io/word.ts`(WORD.DAT 是原始数据文件解析,与 MKF/YJ1/RLE 同性质);GBK helper 独立到 `utils/gbk.ts`;`sss.ts` 也落 `io/`。这些都是结构性细化,不改变模块职责。

---

## File Structure(M1 末态)

```
type-pal/
├── packages/
│   ├── shared/src/
│   │   ├── index.ts                 修改(补 export)
│   │   ├── events.ts                新建(Command 联合类型、Event 文件)
│   │   ├── resources.ts             新建(tilemap / palette / sprite JSON)
│   │   ├── tables.ts                新建(数据表条目)
│   │   └── *.test.ts                各对应测试
│   └── pal-extract/src/
│       ├── cli.ts                   新建,`pnpm extract` 入口
│       ├── main.ts                  删除(M0 占位)
│       ├── main.test.ts             删除(M0 占位)
│       ├── io/
│       │   ├── mkf.ts               新建,MKF 归档 reader
│       │   ├── yj1.ts               新建,YJ1 解压
│       │   ├── rle.ts               新建,RLE 解码
│       │   ├── sss.ts               新建,SSS.MKF 5 chunk 切片
│       │   ├── msg.ts               新建,M.MSG → string[]
│       │   └── word.ts              新建,WORD.DAT → 分类名表
│       ├── resources/
│       │   ├── palette.ts           新建
│       │   ├── sprite.ts            新建
│       │   ├── map.ts               新建
│       │   └── tables.ts            新建
│       ├── events/
│       │   ├── opcodes.ts           新建,双向注册表
│       │   ├── disasm.ts            新建
│       │   ├── recompile.ts         新建
│       │   ├── slice.ts             新建,可达性切分
│       │   ├── annotate.ts          新建,_ 注释字段 + symbols.json
│       │   └── roundtrip.ts         新建,全量逐字节比对
│       ├── utils/
│       │   └── gbk.ts               新建,GBK → UTF-8 helper
│       └── **/*.test.ts             各对应测试
├── scripts/
│   └── sdlpal-rle-dump.sh           新建,sdlpal RLE 对拍 harness
├── data/extracted/                  新建,extract 产物(.gitignore 中)
└── docs/plans/                      (本计划 + design 已在此)
```

`data/extracted/` **不入 git**(把它加进 `.gitignore`)—— 它是从 `data/raw/` 派生的,任何人在本地跑一次 `pnpm extract` 就有。

---

## Test Strategy 概览

- **单测**:用内联 `Uint8Array` 字节 fixture 测核心解码(MKF / YJ1 / RLE / opcode 往返)。
- **集成**:对真实 `data/raw/SSS.MKF` 跑全量 events round-trip;对真实 `data/raw/M.MSG` / `WORD.DAT` 抽样断言。
- **sdlpal 对拍**:RLE 精灵走脚本(Task 20),不进 `pnpm check`。
- 所有 task TDD:先写失败的测试,跑确认失败,再实现到 pass。
- `vitest run` 在 node 环境;不引 jsdom。

---

## Task 1: 加入第三方依赖 + utils/gbk.ts

**Files:**
- Modify: `packages/pal-extract/package.json`(加 deps)
- Create: `packages/pal-extract/src/utils/gbk.ts`
- Create: `packages/pal-extract/src/utils/gbk.test.ts`
- Delete: `packages/pal-extract/src/main.ts` & `main.test.ts`(M0 占位)

- [ ] **Step 1.1: 装第三方依赖**

```sh
pnpm add iconv-lite pngjs --filter @type-pal/pal-extract
pnpm add -D @types/pngjs --filter @type-pal/pal-extract
```

Expected: `pal-extract/package.json` 增 `dependencies.iconv-lite` / `dependencies.pngjs` / `devDependencies.@types/pngjs`,`pnpm-lock.yaml` 更新。

- [ ] **Step 1.2: 删 M0 占位**

```sh
rm packages/pal-extract/src/main.ts packages/pal-extract/src/main.test.ts
```

- [ ] **Step 1.3: 写失败的测试 `packages/pal-extract/src/utils/gbk.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { decodeGbk } from './gbk.js'

describe('decodeGbk', () => {
  it('单字符 ASCII 不动', () => {
    expect(decodeGbk(new Uint8Array([0x41]))).toBe('A')
  })

  it('GBK "李逍遥" → UTF-8', () => {
    // 李 = 0xC0 0xEE, 逍 = 0xE2 0xCD, 遥 = 0xD2 0xA3
    const bytes = new Uint8Array([0xC0, 0xEE, 0xE2, 0xCD, 0xD2, 0xA3])
    expect(decodeGbk(bytes)).toBe('李逍遥')
  })

  it('遇到 0x00 截断(C 字符串语义)', () => {
    const bytes = new Uint8Array([0x41, 0x00, 0x42])
    expect(decodeGbk(bytes)).toBe('A')
  })
})
```

- [ ] **Step 1.4: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/pal-extract test`
Expected: FAIL —— `./gbk.js` 找不到。

- [ ] **Step 1.5: 实现 `packages/pal-extract/src/utils/gbk.ts`**

```ts
import iconv from 'iconv-lite'

/**
 * GBK 字节流 → UTF-8 字符串。原版数据中的对话 / 物品名 / 人名都是 GBK。
 * 遇 0x00 截断 —— 与 sdlpal text.c 的 C 字符串语义一致。
 */
export function decodeGbk(bytes: Uint8Array): string {
  let end = bytes.indexOf(0)
  if (end < 0) end = bytes.length
  return iconv.decode(Buffer.from(bytes.buffer, bytes.byteOffset, end), 'gbk')
}
```

- [ ] **Step 1.6: 跑测试 + typecheck,确认通过**

Run: `pnpm --filter @type-pal/pal-extract check`
Expected: 3 tests PASS,typecheck 通过。

- [ ] **Step 1.7: 提交**

```sh
git add packages/pal-extract/
git commit -m "build(M1.1): pal-extract 依赖 + GBK helper

- 装 iconv-lite / pngjs / @types/pngjs
- 删 M0 占位 main.ts / main.test.ts
- utils/gbk.ts:decodeGbk 含 C 字符串语义(0x00 截断)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: io/mkf.ts —— MKF 归档 reader

**Files:**
- Create: `packages/pal-extract/src/io/mkf.ts`
- Create: `packages/pal-extract/src/io/mkf.test.ts`

参考:`reference/sdlpal/res.c` `PAL_MKFGetChunkCount` / `PAL_MKFReadChunk`。

MKF 格式:文件头是 N+1 个 32-bit LE 偏移量(从文件开头算),`offsets[i]` 是子文件 i 的起点,`offsets[i+1]` 是子文件 i 的结束(= 子文件 i+1 的起点);`offsets[0] / 4 = N`(也即子文件个数 = `offsets[0]/4 - 1`)。

- [ ] **Step 2.1: 写失败的测试 `io/mkf.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk, chunkCount } from './mkf.js'

/**
 * 手造 MKF:2 个子文件,内容分别是 [0x10, 0x11] 和 [0x20, 0x21, 0x22]。
 * 偏移表 = [12, 14, 17](3 个 u32 LE);
 *   offsets[0] = 12 → 子文件 0 起点(头长 = 3 × 4 = 12)
 *   offsets[1] = 14 → 子文件 0 结束 + 子文件 1 起点
 *   offsets[2] = 17 → 子文件 1 结束
 *   子文件数 = offsets[0] / 4 - 1 = 2
 */
function makeFixture(): Uint8Array {
  const buf = new Uint8Array(17)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 12, true)
  view.setUint32(4, 14, true)
  view.setUint32(8, 17, true)
  buf.set([0x10, 0x11], 12)
  buf.set([0x20, 0x21, 0x22], 14)
  return buf
}

describe('mkf', () => {
  it('chunkCount 返回 2', () => {
    const mkf = openMkf(makeFixture())
    expect(chunkCount(mkf)).toBe(2)
  })

  it('readChunk 取出每个子文件', () => {
    const mkf = openMkf(makeFixture())
    expect(Array.from(readChunk(mkf, 0))).toEqual([0x10, 0x11])
    expect(Array.from(readChunk(mkf, 1))).toEqual([0x20, 0x21, 0x22])
  })

  it('readChunk 越界报错', () => {
    const mkf = openMkf(makeFixture())
    expect(() => readChunk(mkf, 2)).toThrow(/out of range/i)
  })
})
```

- [ ] **Step 2.2: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/pal-extract test`
Expected: FAIL —— `./mkf.js` 找不到。

- [ ] **Step 2.3: 实现 `io/mkf.ts`**

```ts
/**
 * MKF 归档 —— 仙剑原版打包格式。
 * 头:N+1 个 u32 LE 偏移;[i] 是子文件 i 起点;子文件数 = head[0]/4 - 1。
 * 参考 reference/sdlpal/res.c。
 */

export interface Mkf {
  readonly buffer: Uint8Array
  readonly offsets: readonly number[]
}

export function openMkf(buffer: Uint8Array): Mkf {
  if (buffer.byteLength < 4) {
    throw new Error('MKF: buffer too small for header')
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const firstOffset = view.getUint32(0, true)
  const count = firstOffset / 4 - 1
  if (firstOffset % 4 !== 0 || count < 0) {
    throw new Error(`MKF: bad first offset ${firstOffset}`)
  }
  const offsets: number[] = []
  for (let i = 0; i <= count; i++) {
    offsets.push(view.getUint32(i * 4, true))
  }
  return { buffer, offsets }
}

export function chunkCount(mkf: Mkf): number {
  return mkf.offsets.length - 1
}

export function readChunk(mkf: Mkf, index: number): Uint8Array {
  if (index < 0 || index >= chunkCount(mkf)) {
    throw new Error(`MKF: chunk ${index} out of range (count=${chunkCount(mkf)})`)
  }
  const start = mkf.offsets[index]!
  const end = mkf.offsets[index + 1]!
  return mkf.buffer.subarray(start, end)
}
```

- [ ] **Step 2.4: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/pal-extract test io/mkf`
Expected: 3 tests PASS。

- [ ] **Step 2.5: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.2): io/mkf.ts —— MKF 归档 reader

参考 sdlpal res.c。3 个手造 fixture 单测覆盖 chunkCount /
readChunk / 越界报错。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: io/yj1.ts —— YJ1 解压

**Files:**
- Create: `packages/pal-extract/src/io/yj1.ts`
- Create: `packages/pal-extract/src/io/yj1.test.ts`

参考:`reference/sdlpal/yj1.c::YJ_Uncompress`(C 端是位流 LZ-变体)。

YJ1 流头(16 字节):4 字节 magic `"YJ_1"` + 4 字节 uncompressed length(LE)+ 4 字节 compressed length(LE)+ 4 字节 unknown / flags。后面是位流。

单测策略:不手工构造 YJ1 字节流(算法复杂),改用**集成对拍** —— 真实 `data/raw/DATA.MKF` 中已知存在 YJ1 子文件;解压后断言 size + 头几个字节。

- [ ] **Step 3.1: 实现 `io/yj1.ts`(直接 port)**

按 sdlpal `yj1.c::YJ_Uncompress` 1:1 翻 TS。给出函数签名 + 头部解析骨架,内部解码循环按 C 端语义:

```ts
/**
 * YJ1 解压 —— 仙剑原版部分子文件压缩。
 * 参考 sdlpal yj1.c::YJ_Uncompress。
 * 流头:'YJ_1' + uncompLen(u32 LE) + compLen(u32 LE) + 4 字节 unused。
 * 后接 LZ-变体位流。
 */

const YJ1_MAGIC = 0x315f4a59 // 'YJ_1' little-endian

export function isYj1(buf: Uint8Array): boolean {
  if (buf.byteLength < 16) return false
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  return view.getUint32(0, true) === YJ1_MAGIC
}

export function decompressYj1(buf: Uint8Array): Uint8Array {
  if (!isYj1(buf)) throw new Error('YJ1: bad magic')
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const uncompLen = view.getUint32(4, true)
  // 位流解码(端口 yj1.c 内层 while 循环)。
  // ... (按 C 端逐位 + flag 块 + back-reference 复制语义实现) ...
  const out = new Uint8Array(uncompLen)
  // ... 主循环填充 out ...
  return out
}
```

> 主循环长约 50–100 行 TS,直接按 sdlpal yj1.c 行 30–150 的语义来,变量名保留 C 端原意以便对照。

- [ ] **Step 3.2: 写集成测试 `io/yj1.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from './mkf.js'
import { decompressYj1, isYj1 } from './yj1.js'

describe('yj1', () => {
  it('DATA.MKF 中至少有一个 YJ1 chunk', () => {
    const buf = readFileSync(resolve(__dirname, '../../../../data/raw/DATA.MKF'))
    const mkf = openMkf(new Uint8Array(buf))
    let yj1Count = 0
    for (let i = 0; i < mkf.offsets.length - 1; i++) {
      if (isYj1(readChunk(mkf, i))) yj1Count++
    }
    expect(yj1Count).toBeGreaterThan(0)
  })

  it('已知 YJ1 chunk 能解出非空 buffer,长度与流头声明一致', () => {
    const buf = readFileSync(resolve(__dirname, '../../../../data/raw/DATA.MKF'))
    const mkf = openMkf(new Uint8Array(buf))
    let idx = -1
    for (let i = 0; i < mkf.offsets.length - 1; i++) {
      if (isYj1(readChunk(mkf, i))) { idx = i; break }
    }
    expect(idx).toBeGreaterThanOrEqual(0)

    const compressed = readChunk(mkf, idx)
    const view = new DataView(compressed.buffer, compressed.byteOffset, compressed.byteLength)
    const declaredLen = view.getUint32(4, true)

    const decompressed = decompressYj1(compressed)
    expect(decompressed.byteLength).toBe(declaredLen)
  })
})
```

- [ ] **Step 3.3: 跑测试,确认 fail / impl / pass(TDD 内部循环)**

Run: `pnpm --filter @type-pal/pal-extract test io/yj1`
迭代到 PASS。这一步可能反复改 yj1.ts —— 算法移植容易错,对照 sdlpal C 端调试。

- [ ] **Step 3.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.3): io/yj1.ts —— YJ1 解压(port 自 sdlpal yj1.c)

- isYj1 / decompressYj1
- 集成测试:对真实 DATA.MKF 扫 YJ1 chunk + 解出长度匹配
- 算法与 sdlpal yj1.c::YJ_Uncompress 1:1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: io/rle.ts —— RLE 精灵解码

**Files:**
- Create: `packages/pal-extract/src/io/rle.ts`
- Create: `packages/pal-extract/src/io/rle.test.ts`

参考:`reference/sdlpal/video.c::PAL_RLEBlitToSurface` 中的 RLE 解码部分。

RLE 格式(仙剑精灵):每帧头部含宽 × 高(u16 LE × 2),后跟解码指令流 —— 字节 `b`:
- `b >= 0x80`:跳过 `b - 0x80` 个像素(留作透明)
- 其他:接下来 `b` 个字节是直接像素值(调色板下标)

输出:`{ width, height, pixels: Uint8Array(width*height) }`,透明像素值 = 0(原版调色板下标 0 是透明色)。

- [ ] **Step 4.1: 写失败的测试 `io/rle.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { decodeRle } from './rle.js'

describe('decodeRle', () => {
  it('2×2 实心方块', () => {
    // 头:width=2(0x0002 LE)、height=2;然后 4 个像素值 = 0xAA
    // 编码:0x04(直接 4 像素)+ 0xAA 0xAA 0xAA 0xAA
    const buf = new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xAA, 0xAA, 0xAA, 0xAA])
    const frame = decodeRle(buf)
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(2)
    expect(Array.from(frame.pixels)).toEqual([0xAA, 0xAA, 0xAA, 0xAA])
  })

  it('透明像素填 0', () => {
    // 2×1:跳 2 个像素(0x82) → 全透明
    const buf = new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x82])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0])
  })

  it('混合 —— 1 透明 + 2 实心 + 1 透明', () => {
    // 4×1:跳 1(0x81) + 直 2(0x02 0xCC 0xDD) + 跳 1(0x81)
    const buf = new Uint8Array([0x04, 0x00, 0x01, 0x00, 0x81, 0x02, 0xCC, 0xDD, 0x81])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0xCC, 0xDD, 0])
  })
})
```

- [ ] **Step 4.2: 跑测试,确认失败**

Run: `pnpm --filter @type-pal/pal-extract test io/rle`
Expected: FAIL —— `./rle.js` 找不到。

- [ ] **Step 4.3: 实现 `io/rle.ts`**

```ts
export interface RleFrame {
  width: number
  height: number
  pixels: Uint8Array // 长度 = width * height,值 = 调色板下标,0 = 透明
}

/**
 * RLE 精灵解码 —— 仙剑原版精灵格式。
 * 帧头 = 宽 u16 LE + 高 u16 LE;后接指令流。
 * 指令字节 b:
 *   b >= 0x80 → 跳 b-0x80 个像素(留透明,填 0)
 *   else      → 接下来 b 个字节是像素值
 * 参考 sdlpal video.c::PAL_RLEBlitToSurface。
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const width = view.getUint16(0, true)
  const height = view.getUint16(2, true)
  const pixels = new Uint8Array(width * height)

  let src = 4
  let dst = 0
  while (dst < pixels.length && src < buf.byteLength) {
    const b = buf[src++]!
    if (b >= 0x80) {
      const n = b - 0x80
      dst += n
    } else {
      for (let i = 0; i < b && dst < pixels.length; i++) {
        pixels[dst++] = buf[src++]!
      }
    }
  }

  return { width, height, pixels }
}
```

- [ ] **Step 4.4: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/pal-extract test io/rle`
Expected: 3 tests PASS。

- [ ] **Step 4.5: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.4): io/rle.ts —— RLE 精灵解码

- decodeRle 输出 { width, height, pixels(调色板下标)}
- 像素 0 = 透明
- 3 个手造单测:实心 / 透明 / 混合

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: io/sss.ts —— SSS.MKF 5 chunk 切片

**Files:**
- Create: `packages/pal-extract/src/io/sss.ts`
- Create: `packages/pal-extract/src/io/sss.test.ts`

`SSS.MKF` 是 5 个 chunk 的归档:0 = 事件对象数组,1 = 场景数组,2 = 对象数组(物品 / 法术 / 敌人),3 = 消息偏移表,4 = 字节码。本文件只做**结构性解析**(把 5 个 chunk 切出来 + 每条记录的 typed view),具体语义解释由 `resources/` 和 `events/` 各自负责。

参考:`reference/sdlpal/global.h::EVENTOBJECT` / `SCENE` / `OBJECT` / `global.c::PAL_InitGlobals`。

- [ ] **Step 5.1: 实现 `io/sss.ts` 骨架 + 集成测试 `io/sss.test.ts`**

`sss.ts`:

```ts
import { openMkf, readChunk, chunkCount } from './mkf.js'

/**
 * SSS.MKF 事件对象 —— 字段见 sdlpal global.h::EVENTOBJECT。
 * 这里给出 M1 用到的字段;余下保留 raw u16[]。
 */
export interface EventObject {
  state: number
  vanishTime: number
  x: number
  y: number
  spriteNum: number
  triggerScript: number  // 字节码指令下标
  autoScript: number     // 字节码指令下标
  layer: number
  triggerMode: number
  raw: Uint16Array
}

export interface Scene {
  mapNum: number
  scriptOnEnter: number
  scriptOnTeleport: number
  eventObjectIndex: number  // 第一个属于本场景的 EventObject 在数组中的下标
  raw: Uint16Array
}

export interface Sss {
  eventObjects: EventObject[]
  scenes: Scene[]
  objects: Uint16Array       // 物品/法术/敌人 raw 数组
  messageOffsets: Uint32Array // 消息偏移表(u32 LE)
  bytecode: Uint8Array       // chunk 4 原始字节码
}

export function parseSss(buf: Uint8Array): Sss {
  const mkf = openMkf(buf)
  if (chunkCount(mkf) < 5) {
    throw new Error(`SSS: expected 5 chunks, got ${chunkCount(mkf)}`)
  }

  const eventObjects = parseEventObjects(readChunk(mkf, 0))
  const scenes = parseScenes(readChunk(mkf, 1))
  const objects = new Uint16Array(readChunk(mkf, 2).slice().buffer)
  const messageOffsets = new Uint32Array(readChunk(mkf, 3).slice().buffer)
  const bytecode = readChunk(mkf, 4).slice() // 复制一份,避免悬空引用

  return { eventObjects, scenes, objects, messageOffsets, bytecode }
}

const EVENT_OBJECT_SIZE_BYTES = /* TODO 查 global.h EVENTOBJECT */ 0
const SCENE_SIZE_BYTES = /* TODO 查 SCENE */ 0

function parseEventObjects(buf: Uint8Array): EventObject[] {
  // 按 EVENT_OBJECT_SIZE_BYTES 切片,每片做 u16 解码
  // 实施时:对照 global.h::EVENTOBJECT 一字段一字段映射
  return []
}

function parseScenes(buf: Uint8Array): Scene[] {
  return []
}
```

`sss.test.ts`(集成):

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSss } from './sss.js'

describe('parseSss', () => {
  const buf = new Uint8Array(
    readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')),
  )
  const sss = parseSss(buf)

  it('字节码 chunk 非空', () => {
    expect(sss.bytecode.byteLength).toBeGreaterThan(0)
  })

  it('字节码长度是 8 的倍数(每指令 8 字节)', () => {
    expect(sss.bytecode.byteLength % 8).toBe(0)
  })

  it('至少有 1 个场景', () => {
    expect(sss.scenes.length).toBeGreaterThan(0)
  })

  it('至少有 1 个事件对象', () => {
    expect(sss.eventObjects.length).toBeGreaterThan(0)
  })

  it('消息偏移表非空', () => {
    expect(sss.messageOffsets.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 5.2: 实施时查 EVENTOBJECT / SCENE 结构体,填进常量,实现两个 parse 函数**

对照 sdlpal `global.h` 找 `typedef struct _EVENTOBJECT` / `_SCENE`,确认每字段是 `WORD` / `SHORT`(都是 2 字节),sizeof 由字段数决定。填 size 常量,把字段映射写完。

- [ ] **Step 5.3: 跑测试,迭代到通过**

Run: `pnpm --filter @type-pal/pal-extract test io/sss`
Expected: 5 tests PASS。

- [ ] **Step 5.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.5): io/sss.ts —— SSS.MKF 5 chunk 切片

- 事件对象 / 场景 / 对象数组 / 消息偏移表 / 字节码
- 结构字段对照 sdlpal global.h EVENTOBJECT / SCENE
- 集成测试断言真实 SSS.MKF 非空 + 字节码 8 字节对齐

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: io/msg.ts —— M.MSG → string[]

**Files:**
- Create: `packages/pal-extract/src/io/msg.ts`
- Create: `packages/pal-extract/src/io/msg.test.ts`

`M.MSG` 是一个偏移表 + 连接字符串区。消息偏移表在 `SSS.MKF chunk 3`(已由 `io/sss.ts` 给出);`M.MSG` 文件本身只是连续的 GBK 字符串区。给一个 index → 用 `messageOffsets[index]` / `messageOffsets[index+1]` 取范围,decodeGbk 出来。

参考:sdlpal `text.c::PAL_LoadGame` 中读 M.MSG 的部分。

- [ ] **Step 6.1: 写测试 `io/msg.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMessages } from './msg.js'
import { parseSss } from './sss.js'

describe('parseMessages', () => {
  const msgBuf = new Uint8Array(
    readFileSync(resolve(__dirname, '../../../../data/raw/M.MSG')),
  )
  const sssBuf = new Uint8Array(
    readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')),
  )
  const messages = parseMessages(msgBuf, parseSss(sssBuf).messageOffsets)

  it('至少有 1000 条消息(原版规模)', () => {
    expect(messages.length).toBeGreaterThan(1000)
  })

  it('随便取一条,是字符串', () => {
    expect(typeof messages[100]).toBe('string')
  })

  it('能找到某条已知 GBK 文本', () => {
    // 实施时:扫一遍 console.log 找一个有特征的对白,把字面值填进来。
    // 占位:断言存在含"逍遥"的条目(主角名,出现率高)。
    expect(messages.some((m) => m.includes('逍遥'))).toBe(true)
  })
})
```

- [ ] **Step 6.2: 实现 `io/msg.ts`**

```ts
import { decodeGbk } from '../utils/gbk.js'

/**
 * M.MSG 是一段连续 GBK 字符串;消息偏移表(在 SSS.MKF chunk 3)给每条消息起点。
 * parseMessages 用偏移表把它切成 string[]。
 * 参考 sdlpal text.c。
 */
export function parseMessages(msg: Uint8Array, offsets: Uint32Array): string[] {
  const out: string[] = []
  for (let i = 0; i < offsets.length - 1; i++) {
    const start = offsets[i]!
    const end = offsets[i + 1]!
    out.push(decodeGbk(msg.subarray(start, end)))
  }
  return out
}
```

- [ ] **Step 6.3: 跑测试 + 实施时调整断言里那条"已知文本"**

Run: `pnpm --filter @type-pal/pal-extract test io/msg`
Expected: 3 tests PASS。

- [ ] **Step 6.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.6): io/msg.ts —— M.MSG 解析为 string[]

- parseMessages 用 SSS chunk 3 的偏移表切 M.MSG
- 集成测试断言条数 > 1000 + 抽样匹配

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: io/word.ts —— WORD.DAT 分类名表

**Files:**
- Create: `packages/pal-extract/src/io/word.ts`
- Create: `packages/pal-extract/src/io/word.test.ts`

`WORD.DAT` 含游戏自带的具名:物品名、法术名、人物名、敌人名、地名。每名定长 10 字节 GBK(`text.c::WORD_LENGTH = 10`)。各类别在文件中的偏移由 sdlpal 的 `WORD_OFFSET_*` 常量定义。

- [ ] **Step 7.1: 写测试 `io/word.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseWordDat } from './word.js'

describe('parseWordDat', () => {
  const buf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/WORD.DAT')))
  const words = parseWordDat(buf)

  it('五类都不为空', () => {
    expect(words.items.length).toBeGreaterThan(0)
    expect(words.spells.length).toBeGreaterThan(0)
    expect(words.persons.length).toBeGreaterThan(0)
    expect(words.enemies.length).toBeGreaterThan(0)
    expect(words.scenes.length).toBeGreaterThan(0)
  })

  it('包含已知人物名"李逍遥"', () => {
    expect(words.persons).toContain('李逍遥')
  })

  it('包含已知物品名(药 / 葫芦 / 丸 / 针 / 剑 之一)', () => {
    // 实施时:dump 一遍 items 找个已知字串补进来
    expect(words.items.some((s) => /药|葫芦|丸|针|剑/.test(s))).toBe(true)
  })
})
```

- [ ] **Step 7.2: 实现 `io/word.ts`**

```ts
import { decodeGbk } from '../utils/gbk.js'

export interface Words {
  items: string[]
  spells: string[]
  persons: string[]
  enemies: string[]
  scenes: string[]
}

const WORD_LENGTH = 10 // sdlpal text.c

/**
 * WORD.DAT 解析。文件结构:每条名字定长 10 字节 GBK,五类紧密排布。
 * 各类别偏移按 sdlpal global.h 的 WORD_OFFSET_* 常量。
 *
 * 实施时:查 reference/sdlpal/global.h,填下方常量。
 */
const OFFSET_PERSONS = /* TODO */ 0
const OFFSET_ITEMS = /* TODO */ 0
const OFFSET_SPELLS = /* TODO */ 0
const OFFSET_ENEMIES = /* TODO */ 0
const OFFSET_SCENES = /* TODO */ 0
const COUNT_PERSONS = /* TODO */ 0
const COUNT_ITEMS = /* TODO */ 0
const COUNT_SPELLS = /* TODO */ 0
const COUNT_ENEMIES = /* TODO */ 0
const COUNT_SCENES = /* TODO */ 0

function readBlock(buf: Uint8Array, offset: number, count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const slice = buf.subarray(offset + i * WORD_LENGTH, offset + (i + 1) * WORD_LENGTH)
    out.push(decodeGbk(slice))
  }
  return out
}

export function parseWordDat(buf: Uint8Array): Words {
  return {
    persons: readBlock(buf, OFFSET_PERSONS, COUNT_PERSONS),
    items: readBlock(buf, OFFSET_ITEMS, COUNT_ITEMS),
    spells: readBlock(buf, OFFSET_SPELLS, COUNT_SPELLS),
    enemies: readBlock(buf, OFFSET_ENEMIES, COUNT_ENEMIES),
    scenes: readBlock(buf, OFFSET_SCENES, COUNT_SCENES),
  }
}
```

- [ ] **Step 7.3: 实施时查 sdlpal 填常量,跑测试**

Run: `pnpm --filter @type-pal/pal-extract test io/word`
Expected: 3 tests PASS。

> 注意:`global.h` 中的常量在 1995 / 1998 版可能略有差异;若直接读到的字符串错位,实施时按"对名字看起来对不对"调整。

- [ ] **Step 7.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.7): io/word.ts —— WORD.DAT 分类名表

- parseWordDat 出 { items, spells, persons, enemies, scenes }
- 集成测试断言李逍遥等已知名字存在

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: @type-pal/shared —— TS 类型扩充

**Files:**
- Create: `packages/shared/src/events.ts`
- Create: `packages/shared/src/resources.ts`
- Create: `packages/shared/src/tables.ts`
- Modify: `packages/shared/src/index.ts`(补 export)
- Create: `packages/shared/src/{events,resources,tables}.test.ts`(类型烟雾测)

设计见 design 文档 `## 5 shared 包扩充`。M1 这里只放**类型 + 极少量纯函数**;不依赖 io/。

- [ ] **Step 8.1: 写类型烟雾测试 `events.test.ts`**

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type { Command, RawCommand, GotoCommand, ShowDialogCommand } from './events.js'

describe('Command 联合类型', () => {
  it('RawCommand 有 op: "raw" + opcode + operands', () => {
    expectTypeOf<RawCommand>().toMatchTypeOf<{
      op: 'raw'
      opcode: number
      operands: [number, number, number]
    }>()
  })

  it('GotoCommand 有 op: "goto" + to', () => {
    expectTypeOf<GotoCommand>().toMatchTypeOf<{ op: 'goto'; to: string }>()
  })

  it('ShowDialogCommand 有 op: "showDialog" + text', () => {
    expectTypeOf<ShowDialogCommand>().toMatchTypeOf<{ op: 'showDialog'; text: string }>()
  })

  it('Command 是联合', () => {
    const c: Command = { op: 'raw', opcode: 0, operands: [0, 0, 0] }
    expectTypeOf(c).toMatchTypeOf<Command>()
  })
})
```

- [ ] **Step 8.2: 实现 `packages/shared/src/events.ts`**

```ts
/**
 * events.json schema(见 docs/05-events-schema.md)。
 * 为 M1 提供 ~10 个 M2 切片要用的具名 Command + raw 兜底。
 */

export interface RawCommand {
  op: 'raw'
  opcode: number
  operands: [number, number, number]
  label?: string
}

export interface EndCommand {
  op: 'end'
  advance?: boolean
  reset?: boolean
  label?: string
}

export interface GotoCommand {
  op: 'goto'
  to: string                // 跳转目标标签名
  frameDelay?: number
  label?: string
}

export interface ShowDialogCommand {
  op: 'showDialog'
  box: 'top' | 'center' | 'bottom' | 'narration'
  text: string              // 内联自 M.MSG
  label?: string
}

export interface GiveItemCommand {
  op: 'giveItem'
  itemId: number
  count: number
  _item?: string
  label?: string
}

export interface StartBattleCommand {
  op: 'startBattle'
  enemyTeamId: number
  _enemyTeam?: string
  label?: string
}

// 结构化命令(D17,新内容手写用)
export interface SequenceCommand {
  op: 'sequence'
  steps: Command[]
  label?: string
}

export interface IfCommand {
  op: 'if'
  cond: Command
  then: Command[]
  else?: Command[]
  label?: string
}

export interface ChoiceCommand {
  op: 'choice'
  prompt: string
  options: { text: string; then: Command[] }[]
  label?: string
}

export type Command =
  | RawCommand
  | EndCommand
  | GotoCommand
  | ShowDialogCommand
  | GiveItemCommand
  | StartBattleCommand
  | SequenceCommand
  | IfCommand
  | ChoiceCommand

export interface EventFile {
  scene?: number               // 场景文件携带场景号;shared.json / objects.json 不带
  segments: EventSegment[]
}

export interface EventSegment {
  /**
   * 段名 —— 人可读地说明这段从哪入口可达:
   *   "scene-NNN.onEnter"、"object-MM.trigger"、"object-MM.auto" …
   */
  name: string
  commands: Command[]
}
```

- [ ] **Step 8.3: 实现 `packages/shared/src/resources.ts`**

```ts
export interface Tilemap {
  width: number   // 单位:瓦片
  height: number
  tileWidth: number
  tileHeight: number
  /** 一维 tile id 数组,长度 = width * height,行优先 */
  tiles: number[]
  tilesetImage: string
}

export interface PaletteCycle {
  start: number      // 起始下标
  length: number
  step: number       // 每帧前进步数
  frameInterval: number
}

export interface Palette {
  colors: [number, number, number][]  // 256 个 RGB(0–255)
  cycles: PaletteCycle[]
}

export interface SpriteFrame {
  width: number
  height: number
  anchorX: number    // 原版精灵的"脚下中心点"
  anchorY: number
  image: string
}

export interface SpriteSet {
  frames: SpriteFrame[]
}
```

- [ ] **Step 8.4: 实现 `packages/shared/src/tables.ts`**

```ts
/**
 * 数据表条目类型 —— 物品 / 法术 / 怪物。
 * 字段以 sdlpal global.h::OBJECT_* / ENEMY 为准;M1 只覆盖切片需要的最小字段集。
 */

export interface Item {
  id: number
  name: string
  bitmap: number  // 图标精灵号
  price: number
  scriptOnUse: number
  scriptOnEquip: number
  scriptOnThrow: number
  flags: number
}

export interface Spell {
  id: number
  name: string
  mp: number
  base: number
  effect: number
  flags: number
}

export interface Enemy {
  id: number
  name: string
  level: number
  hp: number
  mp: number
  attack: number
  defense: number
}
```

- [ ] **Step 8.5: Modify `packages/shared/src/index.ts` 补 export**

```ts
/**
 * 跨包共用的常量与类型。
 */

export * from './events.js'
export * from './resources.js'
export * from './tables.js'

export const FPS_EXPLORE = 10
export const FPS_BATTLE = 25
export const FRAME_MS_EXPLORE = 1000 / FPS_EXPLORE
export const FRAME_MS_BATTLE = 1000 / FPS_BATTLE
```

- [ ] **Step 8.6: 给 resources / tables 各写一条烟雾测试**

`resources.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Tilemap, Palette } from './resources.js'

describe('resources types', () => {
  it('Tilemap 有必要字段', () => {
    expectTypeOf<Tilemap>().toMatchTypeOf<{ width: number; tiles: number[] }>()
  })
  it('Palette colors 是 256 个三元组', () => {
    const p: Palette = { colors: [[0, 0, 0]], cycles: [] }
    expect(p.colors[0]).toEqual([0, 0, 0])
  })
})
```

(类似为 tables 加一个)

- [ ] **Step 8.7: 跑 `pnpm check`,全绿**

Run: `pnpm check`
Expected: 所有包 typecheck + 测试通过。

- [ ] **Step 8.8: 提交**

```sh
git add packages/shared/
git commit -m "feat(M1.8): @type-pal/shared 扩 events / resources / tables 类型

- events.ts:Command 联合类型(M1 ~10 个具名 + raw + 结构化子集)
- resources.ts:Tilemap / Palette / SpriteSet
- tables.ts:Item / Spell / Enemy(M1 最小字段集)
- index.ts 补 export
- 类型烟雾测试

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: resources/palette.ts —— 调色板

**Files:**
- Create: `packages/pal-extract/src/resources/palette.ts`
- Create: `packages/pal-extract/src/resources/palette.test.ts`

参考:`reference/sdlpal/palette.c`。256 色,每色 RGB 各 0–63(VGA 模式)→ 这里要 ×4 升到 0–255。循环动画段在 M1 先返回空,实施时若发现切片场景有循环段,再加从 MGO.MKF 解析的逻辑。

- [ ] **Step 9.1: 写测试 `resources/palette.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { decodePalette } from './palette.js'

describe('decodePalette', () => {
  it('256 色 VGA(0-63)解出 0-255', () => {
    // 256 * 3 = 768 字节;每色 0x3F → 0xFC
    const buf = new Uint8Array(768)
    buf.fill(0x3F)
    const palette = decodePalette(buf)
    expect(palette.colors).toHaveLength(256)
    expect(palette.colors[0]).toEqual([0xFC, 0xFC, 0xFC])
  })

  it('零调色板出 0', () => {
    const palette = decodePalette(new Uint8Array(768))
    expect(palette.colors[0]).toEqual([0, 0, 0])
  })
})
```

- [ ] **Step 9.2: 实现 `resources/palette.ts`**

```ts
import type { Palette } from '@type-pal/shared'

/**
 * 调色板 VGA(0-63)→ RGB(0-255)。256 色 × 3 字节 = 768 字节。
 * 循环动画段在 M1 先返回空。
 */
export function decodePalette(buf: Uint8Array, cycles: Palette['cycles'] = []): Palette {
  const colors: Palette['colors'] = []
  for (let i = 0; i < 256; i++) {
    const r6 = buf[i * 3]!
    const g6 = buf[i * 3 + 1]!
    const b6 = buf[i * 3 + 2]!
    // VGA 0-63 → 8-bit:左移 2 再或上低 2 位(等效 ×255/63)
    const r = ((r6 << 2) | (r6 >> 4)) & 0xFF
    const g = ((g6 << 2) | (g6 >> 4)) & 0xFF
    const b = ((b6 << 2) | (b6 >> 4)) & 0xFF
    colors.push([r, g, b])
  }
  return { colors, cycles }
}
```

- [ ] **Step 9.3: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/pal-extract test resources/palette`
Expected: 2 tests PASS。

- [ ] **Step 9.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.9): resources/palette.ts —— 调色板 VGA(0-63)→ RGB(0-255)

- 256 色 × 3 字节
- cycles 段 M1 留空(实施时按切片场景按需补)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: resources/sprite.ts —— 精灵 → 索引位图 PNG

**Files:**
- Create: `packages/pal-extract/src/resources/sprite.ts`
- Create: `packages/pal-extract/src/resources/sprite.test.ts`

输入:精灵 MKF(MGO / BALL / FBP / FIRE / F / GOP / PAT / ABC)。每个 MKF chunk 是一组帧。
输出:每精灵一个 PNG + 一个 JSON 描述帧偏移 / 锚点。

**PNG 编码取舍**:`pngjs` 默认是 RGBA。要真正的 grayscale 单通道,可能需要直接构造 PNG bytes。M1 简化做法:**用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)**,M2 / game 加载时只取 R 通道。这样磁盘占用大 4 倍但实现简单。

- [ ] **Step 10.1: 写测试 `resources/sprite.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { encodeIndexedPng, parseSpriteChunk } from './sprite.js'
import { decodeRle } from '../io/rle.js'

describe('sprite', () => {
  it('encodeIndexedPng 产 PNG 字节流,以 PNG 魔数开头', () => {
    const frame = decodeRle(new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xAA, 0xAA, 0xAA, 0xAA]))
    const png = encodeIndexedPng(frame.width, frame.height, frame.pixels)
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89)
    expect(png[1]).toBe(0x50)
    expect(png[2]).toBe(0x4E)
    expect(png[3]).toBe(0x47)
  })

  it('parseSpriteChunk 切多帧 —— 1 帧 fixture', () => {
    // 头:子帧数 u16 LE + (帧数 个 u16 LE offset)
    // 1 帧、offset = 4(头后立刻接);RLE = 2×2 实心
    const buf = new Uint8Array([
      0x01, 0x00,                         // 帧数 1
      0x04, 0x00,                         // offset[0] = 4
      0x02, 0x00, 0x02, 0x00, 0x04, 0xAA, 0xAA, 0xAA, 0xAA, // RLE
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(2)
    expect(frames[0]!.height).toBe(2)
  })
})
```

- [ ] **Step 10.2: 实现 `resources/sprite.ts`**

```ts
import { PNG } from 'pngjs'
import { decodeRle, type RleFrame } from '../io/rle.js'

/**
 * 精灵 chunk 头:u16 LE 帧数 + (帧数 个 u16 LE offset to RLE data)。
 * 偏移从 chunk 开头算。
 * 参考 sdlpal sprite.c::PAL_LoadSprite。
 */
export function parseSpriteChunk(buf: Uint8Array): RleFrame[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frameCount = view.getUint16(0, true)
  const frames: RleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const offset = view.getUint16(2 + i * 2, true)
    if (offset === 0) continue // 部分帧空缺
    frames.push(decodeRle(buf.subarray(offset)))
  }
  return frames
}

/**
 * 把索引位图编码为 PNG。M1 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)。
 * 不烤色;运行时游戏查调色板填色。
 */
export function encodeIndexedPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    const v = pixels[i]!
    png.data[i * 4] = v
    png.data[i * 4 + 1] = v
    png.data[i * 4 + 2] = v
    png.data[i * 4 + 3] = 255
  }
  return new Uint8Array(PNG.sync.write(png))
}

export interface SpriteFrameOut {
  index: number
  width: number
  height: number
  pngBytes: Uint8Array
}

export function framesToOut(frames: RleFrame[]): SpriteFrameOut[] {
  return frames.map((f, i) => ({
    index: i,
    width: f.width,
    height: f.height,
    pngBytes: encodeIndexedPng(f.width, f.height, f.pixels),
  }))
}
```

- [ ] **Step 10.3: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/pal-extract test resources/sprite`
Expected: 2 tests PASS。

- [ ] **Step 10.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.10): resources/sprite.ts —— 精灵 → 索引 PNG

- parseSpriteChunk 切多帧
- encodeIndexedPng RGBA 三通道复制法(简化 grayscale 写入)
- M1 接受磁盘占用 ×4 的代价,M3 视情况优化

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: resources/map.ts —— 瓦片地图

**Files:**
- Create: `packages/pal-extract/src/resources/map.ts`
- Create: `packages/pal-extract/src/resources/map.test.ts`

参考:sdlpal `map.c::PAL_LoadMap`。仙剑地图是固定网格 + 一个瓦片集 PNG。实施时按 `MAP_WIDTH` / `MAP_HEIGHT` 确认。

- [ ] **Step 11.1: 写最小集成测试**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from '../io/mkf.js'
import { parseMap } from './map.js'

describe('parseMap', () => {
  it('MAP.MKF chunk 0 解出非空 tilemap', () => {
    const buf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/MAP.MKF')))
    const mkf = openMkf(buf)
    const result = parseMap(readChunk(mkf, 0))
    expect(result.tilemap.width).toBeGreaterThan(0)
    expect(result.tilemap.height).toBeGreaterThan(0)
    expect(result.tilemap.tiles.length).toBe(result.tilemap.width * result.tilemap.height)
    expect(result.tilesetPng[0]).toBe(0x89) // PNG magic
  })
})
```

- [ ] **Step 11.2: 实现 `resources/map.ts`**

```ts
import type { Tilemap } from '@type-pal/shared'
import { encodeIndexedPng } from './sprite.js'

const MAP_WIDTH = /* TODO 查 sdlpal map.c */ 0
const MAP_HEIGHT = /* TODO */ 0
const TILE_WIDTH = /* TODO,通常 32 */ 32
const TILE_HEIGHT = /* TODO,通常 16 */ 16

export interface MapResult {
  tilemap: Tilemap
  tilesetPng: Uint8Array
}

/**
 * 地图 chunk:网格(每格 u16 tile id)+ 内嵌 / 关联的瓦片集。
 * 参考 sdlpal map.c::PAL_LoadMap。
 */
export function parseMap(buf: Uint8Array): MapResult {
  // 1. 切前 MAP_WIDTH * MAP_HEIGHT * 2 字节做 tile id 网格
  // 2. 后面是瓦片集 RLE 数据 / 直接像素
  // 3. 把瓦片集组装成单张大 PNG(瓦片横向排布)
  return {
    tilemap: {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      tileWidth: TILE_WIDTH,
      tileHeight: TILE_HEIGHT,
      tiles: [],
      tilesetImage: '',  // 由 CLI 总装时填实际 PNG 文件名
    },
    tilesetPng: new Uint8Array(),
  }
}
```

- [ ] **Step 11.3: 实施时翻 sdlpal map.c 把 parseMap 写完,跑测试到通过**

Run: `pnpm --filter @type-pal/pal-extract test resources/map`

- [ ] **Step 11.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.11): resources/map.ts —— 瓦片地图

- parseMap 出 { tilemap, tilesetPng }
- 参考 sdlpal map.c::PAL_LoadMap

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: resources/tables.ts —— 数据表(M1 直接全解全产)

**Files:**
- Create: `packages/pal-extract/src/resources/tables.ts`
- Create: `packages/pal-extract/src/resources/tables.test.ts`

DATA.MKF 含物品 / 法术 / 怪物各定长数组(每条按 `reference/sdlpal/global.h::OBJECT_ITEM` / `OBJECT_MAGIC` / `ENEMY`)。

**M1 决定**:直接全解全产,不做切片过滤。这等于把原 M4 "全数据表" 工作顺手吃掉。等做完更新 04-decisions 标 M4 这条已完成(由 Task 21 README 收尾时一并提及)。

- [ ] **Step 12.1: 写测试 `resources/tables.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openMkf, readChunk } from '../io/mkf.js'
import { parseItems, parseSpells, parseEnemies } from './tables.js'
import { parseWordDat } from '../io/word.js'

describe('tables', () => {
  const dataBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/DATA.MKF')))
  const wordBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/WORD.DAT')))
  const words = parseWordDat(wordBuf)
  const dataMkf = openMkf(dataBuf)

  it('items 解出 >100 条,带名字', () => {
    // 实施时:查 sdlpal 知道 items 在第几个 chunk
    const items = parseItems(readChunk(dataMkf, /* TODO */ 0), words)
    expect(items.length).toBeGreaterThan(100)
    expect(items[0]!.name).toBeTruthy()
  })

  // spells / enemies 类似断言
})
```

- [ ] **Step 12.2: 实现 `resources/tables.ts`**

```ts
import type { Item, Spell, Enemy } from '@type-pal/shared'
import type { Words } from '../io/word.js'

const ITEM_SIZE_BYTES = /* TODO 查 global.h::OBJECT_ITEM */ 0
const SPELL_SIZE_BYTES = /* TODO::OBJECT_MAGIC */ 0
const ENEMY_SIZE_BYTES = /* TODO::ENEMY */ 0

export function parseItems(buf: Uint8Array, words: Words): Item[] {
  const out: Item[] = []
  const count = Math.floor(buf.byteLength / ITEM_SIZE_BYTES)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  for (let i = 0; i < count; i++) {
    const base = i * ITEM_SIZE_BYTES
    out.push({
      id: i,
      name: words.items[i] ?? `_item_${i}`,
      bitmap: view.getUint16(base + /* TODO 偏移 */ 0, true),
      price: view.getUint16(base + /* TODO */ 0, true),
      scriptOnUse: view.getUint16(base + /* TODO */ 0, true),
      scriptOnEquip: view.getUint16(base + /* TODO */ 0, true),
      scriptOnThrow: view.getUint16(base + /* TODO */ 0, true),
      flags: view.getUint16(base + /* TODO */ 0, true),
    })
  }
  return out
}

export function parseSpells(buf: Uint8Array, words: Words): Spell[] {
  // 类似实现
  return []
}

export function parseEnemies(buf: Uint8Array, words: Words): Enemy[] {
  return []
}
```

- [ ] **Step 12.3: 实施时查 sdlpal 把字段偏移填全,跑测试到通过**

Run: `pnpm --filter @type-pal/pal-extract test resources/tables`

- [ ] **Step 12.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.12): resources/tables.ts —— 数据表全解全产

- items / spells / enemies 全解
- 字段映射对照 sdlpal global.h::OBJECT_ITEM / OBJECT_MAGIC / ENEMY
- WORD.DAT 名字注入 name 字段
- 顺手把原 M4 这条任务吃了

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: events/opcodes.ts —— 双向 opcode 注册表

**Files:**
- Create: `packages/pal-extract/src/events/opcodes.ts`
- Create: `packages/pal-extract/src/events/opcodes.test.ts`

注册表 = 一份纯数据,每个 opcode 列出动词名 + 3 个操作数的字段名与 `kind`。disasm / recompile 都查它。

参考:sdlpal `script.c` 的大 switch。

**覆盖范围**:0x0000–0x00A6 + 0xFFFF,**所有 ~97 个都登记**;~15 个 M2 切片要用的给具名;其余只登记 `kind` 占位,走 `raw` 兜底。

- [ ] **Step 13.1: 写测试 `events/opcodes.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { opcodeTable, lookupOpcode, lookupVerb } from './opcodes.js'

describe('opcode registry', () => {
  it('包含所有 ~97 个 opcode(0x0000-0x00A6 + 0xFFFF)', () => {
    expect(opcodeTable[0x0000]).toBeDefined()
    expect(opcodeTable[0x00A6]).toBeDefined()
    expect(opcodeTable[0xFFFF]).toBeDefined()
  })

  it('lookupVerb / lookupOpcode 是双向的', () => {
    expect(lookupVerb(0xFFFF)).toBe('showDialog')
    expect(lookupOpcode('showDialog')).toBe(0xFFFF)
  })

  it('未具名的 opcode 仍有 kinds 占位', () => {
    // 例如 0x0050(肯定不在 ~15 具名列表里)
    const entry = opcodeTable[0x0050]
    expect(entry).toBeDefined()
    expect(entry!.fields).toHaveLength(3)
  })

  it('end 命令的几种形态', () => {
    expect(lookupVerb(0x0000)).toBe('end')
    expect(lookupVerb(0x0001)).toBe('end')  // advance
    expect(lookupVerb(0x0002)).toBe('end')  // reset
  })
})
```

- [ ] **Step 13.2: 实现 `events/opcodes.ts`**

```ts
export type FieldKind =
  | 'value' | 'label' | 'message'
  | 'object' | 'scene' | 'item' | 'spell' | 'enemy' | 'person' | 'sprite'

export interface OpcodeDef {
  /** 动词名:具名时是 'showDialog' / 'giveItem' / ...;未具名时 = 'raw' */
  name: string
  /** 3 个操作数的字段名与 kind(顺序固定) */
  fields: [
    { name: string; kind: FieldKind },
    { name: string; kind: FieldKind },
    { name: string; kind: FieldKind },
  ]
  /** 若 name 不为 'raw',表示具名 —— disasm 出具名 Command,否则出 RawCommand */
  named: boolean
  endAdvance?: boolean  // 0x0001 子语义
  endReset?: boolean    // 0x0002 子语义
}

const VALUE_OPERAND = { name: '_unused', kind: 'value' as FieldKind }

/**
 * opcode 注册表 —— ~97 条。
 * 具名条目(M1 ~15 个)给完整 fields;其余条目用占位 value/value/value + named: false。
 * 完整 opcode 语义见 sdlpal script.c。
 */
export const opcodeTable: Record<number, OpcodeDef> = {
  0x0000: { name: 'end', fields: [VALUE_OPERAND, VALUE_OPERAND, VALUE_OPERAND], named: true },
  0x0001: { name: 'end', fields: [VALUE_OPERAND, VALUE_OPERAND, VALUE_OPERAND], named: true, endAdvance: true },
  0x0002: { name: 'end', fields: [VALUE_OPERAND, VALUE_OPERAND, VALUE_OPERAND], named: true, endReset: true },
  0x0003: {
    name: 'goto',
    fields: [
      { name: 'to', kind: 'label' },
      { name: 'frameDelay', kind: 'value' },
      VALUE_OPERAND,
    ],
    named: true,
  },
  0x001F: {
    name: 'giveItem',
    fields: [
      { name: 'itemId', kind: 'item' },
      { name: 'count', kind: 'value' },
      VALUE_OPERAND,
    ],
    named: true,
  },
  0xFFFF: {
    name: 'showDialog',
    fields: [
      { name: 'box', kind: 'value' },          // 0x3B-0x3E mapping
      { name: 'messageIndex', kind: 'message' },
      VALUE_OPERAND,
    ],
    named: true,
  },
  // M2 切片要用的其余 ~10 个:setObjectState / setScriptEntry /
  // ifItemLess / ifPersonMet / playSfx / waitFrames / changeScene / startBattle ...
  // 实施时按 docs/05-events-schema.md "命令的形态" + sdlpal script.c 填进来。
}

// 其余 ~80 个 opcode 用通用占位填充
function fillUnnamedOpcodes(): void {
  for (let op = 0x0000; op <= 0x00A6; op++) {
    if (opcodeTable[op]) continue
    opcodeTable[op] = {
      name: 'raw',
      fields: [
        { name: 'op0', kind: 'value' },
        { name: 'op1', kind: 'value' },
        { name: 'op2', kind: 'value' },
      ],
      named: false,
    }
  }
}
fillUnnamedOpcodes()

const verbToOpcode = new Map<string, number>()
for (const [opStr, def] of Object.entries(opcodeTable)) {
  if (def.named && def.name !== 'raw') {
    if (!verbToOpcode.has(def.name)) verbToOpcode.set(def.name, Number(opStr))
  }
}

export function lookupVerb(opcode: number): string {
  return opcodeTable[opcode]?.name ?? 'raw'
}

export function lookupOpcode(verb: string): number {
  const op = verbToOpcode.get(verb)
  if (op === undefined) throw new Error(`unknown verb: ${verb}`)
  return op
}
```

- [ ] **Step 13.3: 实施时按 sdlpal script.c 大 switch 补全 ~15 个具名 opcode**

逐个对照填 fields。**M2 切片需要的优先**:`end` / `goto` / `showDialog` / `giveItem` / `setObjectState`(0x001A?) / `setScriptEntry`(0x0044?) / `ifItemLess` / `startBattle` / `playSfx` / `playMusic` / `changeScene` / `delay` / `waitForKey`。

> 不确定具体 opcode 号的不用强查 —— 让 disasm 跑全部 SSS.MKF,日志哪些 opcode 频次最高,挑前 15 个补。

- [ ] **Step 13.4: 跑测试,确认通过**

Run: `pnpm --filter @type-pal/pal-extract test events/opcodes`

- [ ] **Step 13.5: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.13): events/opcodes.ts —— 双向 opcode 注册表

- 所有 ~97 个 opcode 登记
- M2 切片要用的 ~15 个具名;其余占位走 raw
- lookupVerb / lookupOpcode 双向查询

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: events/disasm.ts —— 字节码 → JSON + 字符串内联

**Files:**
- Create: `packages/pal-extract/src/events/disasm.ts`
- Create: `packages/pal-extract/src/events/disasm.test.ts`

输入:`bytecode: Uint8Array`(每指令 8 字节)+ `messages: string[]`(用于内联)。
输出:`Command[]`(扁平命令清单,带 label 字段)。

跳转字段(kind: `label`)→ 标签名 `L_<index>`。
消息字段(kind: `message`)→ 直接取 `messages[idx]` 内联进 `text` 字段。

- [ ] **Step 14.1: 写单测 `events/disasm.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { disasm } from './disasm.js'

describe('disasm', () => {
  it('end(0x0000)', () => {
    const bc = new Uint8Array([0x00, 0x00, 0, 0, 0, 0, 0, 0])
    expect(disasm(bc, [])).toEqual([{ op: 'end' }])
  })

  it('goto(0x0003) 跳到指令 5,产 label "L_5"', () => {
    // 6 条指令:goto 5;指令 1-4 占位;指令 5 = end
    const bc = new Uint8Array(8 * 6)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x0003, true)
    view.setUint16(2, 5, true)        // operand 0 = jump target
    view.setUint16(5 * 8, 0x0000, true)
    const commands = disasm(bc, [])
    expect(commands[0]).toEqual({ op: 'goto', to: 'L_5', frameDelay: 0 })
    expect(commands[5]).toEqual({ label: 'L_5', op: 'end' })
  })

  it('showDialog(0xFFFF) 内联文本', () => {
    const bc = new Uint8Array(8)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0xFFFF, true)
    view.setUint16(2, 0x003D, true) // box = bottom
    view.setUint16(4, 7, true)      // messageIndex = 7
    expect(disasm(bc, ['', '', '', '', '', '', '', '你好,客官。'])).toEqual([
      { op: 'showDialog', box: 'bottom', text: '你好,客官。' },
    ])
  })

  it('未具名 opcode → raw', () => {
    const bc = new Uint8Array(8)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x0050, true)
    view.setUint16(2, 1, true)
    view.setUint16(4, 2, true)
    view.setUint16(6, 3, true)
    expect(disasm(bc, [])).toEqual([{ op: 'raw', opcode: 0x0050, operands: [1, 2, 3] }])
  })
})
```

- [ ] **Step 14.2: 实现 `events/disasm.ts`**

```ts
import type { Command } from '@type-pal/shared'
import { opcodeTable } from './opcodes.js'

const BOX_MAP: Record<number, 'top' | 'center' | 'bottom' | 'narration'> = {
  0x3B: 'top',
  0x3C: 'center',
  0x3D: 'bottom',
  0x3E: 'narration',
}

/**
 * 反汇编 —— 字节码 → 命令清单。两遍:
 *   第 1 遍:把每条字节码翻成 Command;收集跳转目标 indices。
 *   第 2 遍:对所有被跳转的指令打 label。
 */
export function disasm(bytecode: Uint8Array, messages: string[]): Command[] {
  if (bytecode.byteLength % 8 !== 0) {
    throw new Error(`bytecode length not multiple of 8: ${bytecode.byteLength}`)
  }
  const instructions = bytecode.byteLength / 8
  const view = new DataView(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength)

  const labelTargets = new Set<number>()
  const commands: Command[] = []

  for (let i = 0; i < instructions; i++) {
    const op = view.getUint16(i * 8, true)
    const o0 = view.getUint16(i * 8 + 2, true)
    const o1 = view.getUint16(i * 8 + 4, true)
    const o2 = view.getUint16(i * 8 + 6, true)
    const def = opcodeTable[op]
    if (!def || !def.named) {
      commands.push({ op: 'raw', opcode: op, operands: [o0, o1, o2] })
      continue
    }
    const operands = [o0, o1, o2]
    for (let f = 0; f < 3; f++) {
      if (def.fields[f]!.kind === 'label') labelTargets.add(operands[f]!)
    }
    commands.push(emitNamed(def, operands, messages))
  }

  // 第 2 遍打标签
  for (const target of labelTargets) {
    if (target < commands.length) {
      commands[target] = { ...commands[target], label: `L_${target}` } as Command
    }
  }

  return commands
}

function emitNamed(
  def: { name: string; fields: { name: string; kind: string }[]; endAdvance?: boolean; endReset?: boolean },
  operands: number[],
  messages: string[],
): Command {
  if (def.name === 'end') {
    const c: any = { op: 'end' }
    if (def.endAdvance) c.advance = true
    if (def.endReset) c.reset = true
    return c
  }
  if (def.name === 'goto') {
    return { op: 'goto', to: `L_${operands[0]}`, frameDelay: operands[1] ?? 0 }
  }
  if (def.name === 'showDialog') {
    return {
      op: 'showDialog',
      box: BOX_MAP[operands[0]!] ?? 'bottom',
      text: messages[operands[1]!] ?? '',
    }
  }
  if (def.name === 'giveItem') {
    return { op: 'giveItem', itemId: operands[0]!, count: operands[1]! }
  }
  // 其余具名 opcode 镜像填入
  return { op: 'raw', opcode: 0, operands: operands as [number, number, number] }
}
```

- [ ] **Step 14.3: 跑测试 → 实施 → 跑到通过**

Run: `pnpm --filter @type-pal/pal-extract test events/disasm`
Expected: 4 tests PASS。

- [ ] **Step 14.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.14): events/disasm.ts —— 字节码 → JSON + 字符串内联

- 两遍扫描:翻指令 → 打 label
- BOX_MAP(0x3B-0x3E)→ top/center/bottom/narration
- 未具名 opcode 直接落 RawCommand

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: events/recompile.ts —— JSON → 字节码

**Files:**
- Create: `packages/pal-extract/src/events/recompile.ts`
- Create: `packages/pal-extract/src/events/recompile.test.ts`

输入:`Command[]` + `messages: string[]`(用于把内联 text 反查到 message index)。
输出:`Uint8Array`(每命令 8 字节,N × 8 总长)。

**关键**:`disasm` 和 `recompile` 严格对偶 —— 跑 disasm 出的 JSON 再 recompile 必须字节相等。

- [ ] **Step 15.1: 写测试 `events/recompile.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('recompile / round-trip', () => {
  it('end / goto / showDialog / raw 都能往返', () => {
    const bc = new Uint8Array(8 * 4)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x0000, true) // end
    view.setUint16(8, 0x0003, true); view.setUint16(10, 3, true) // goto 3
    view.setUint16(16, 0xFFFF, true); view.setUint16(18, 0x003D, true); view.setUint16(20, 1, true) // showDialog msg 1
    view.setUint16(24, 0x0050, true); view.setUint16(26, 5, true); view.setUint16(28, 6, true); view.setUint16(30, 7, true) // raw

    const messages = ['', '你好']
    const commands = disasm(bc, messages)
    const back = recompile(commands, messages)
    expect(Array.from(back)).toEqual(Array.from(bc))
  })
})
```

- [ ] **Step 15.2: 实现 `events/recompile.ts`**

```ts
import type { Command } from '@type-pal/shared'

const BOX_RMAP: Record<string, number> = {
  top: 0x3B,
  center: 0x3C,
  bottom: 0x3D,
  narration: 0x3E,
}

export function recompile(commands: Command[], messages: string[]): Uint8Array {
  const buf = new Uint8Array(commands.length * 8)
  const view = new DataView(buf.buffer)

  // 1 遍:label → index 表
  const labels = new Map<string, number>()
  commands.forEach((c, i) => {
    if (c.label) labels.set(c.label, i)
  })

  // 消息文本 → index 反查(用第一次出现的位置)
  const messageIndex = new Map<string, number>()
  messages.forEach((m, i) => {
    if (!messageIndex.has(m)) messageIndex.set(m, i)
  })

  // 2 遍:翻字节
  commands.forEach((c, i) => {
    const off = i * 8
    if (c.op === 'raw') {
      view.setUint16(off, c.opcode, true)
      view.setUint16(off + 2, c.operands[0], true)
      view.setUint16(off + 4, c.operands[1], true)
      view.setUint16(off + 6, c.operands[2], true)
      return
    }
    if (c.op === 'end') {
      const op = c.advance ? 0x0001 : c.reset ? 0x0002 : 0x0000
      view.setUint16(off, op, true)
      return
    }
    if (c.op === 'goto') {
      view.setUint16(off, 0x0003, true)
      view.setUint16(off + 2, labels.get(c.to) ?? 0, true)
      view.setUint16(off + 4, c.frameDelay ?? 0, true)
      return
    }
    if (c.op === 'showDialog') {
      view.setUint16(off, 0xFFFF, true)
      view.setUint16(off + 2, BOX_RMAP[c.box] ?? 0x3D, true)
      view.setUint16(off + 4, messageIndex.get(c.text) ?? 0, true)
      return
    }
    if (c.op === 'giveItem') {
      view.setUint16(off, 0x001F, true)
      view.setUint16(off + 2, c.itemId, true)
      view.setUint16(off + 4, c.count, true)
      return
    }
    // 其余具名 opcode 镜像 disasm
    throw new Error(`recompile: unsupported op ${c.op}`)
  })

  return buf
}
```

- [ ] **Step 15.3: 跑测试到通过**

Run: `pnpm --filter @type-pal/pal-extract test events/recompile`

- [ ] **Step 15.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.15): events/recompile.ts —— JSON → 字节码(disasm 对偶)

- label → index、text → message index 反查
- end / goto / showDialog / giveItem / raw 都覆盖

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: events/roundtrip.ts —— 全量 round-trip 验证

**Files:**
- Create: `packages/pal-extract/src/events/roundtrip.ts`
- Create: `packages/pal-extract/src/events/roundtrip.test.ts`

集成测试:读真实 `data/raw/SSS.MKF` → parseSss 拿 bytecode + messageOffsets → parseMessages → disasm → recompile → 与 bytecode 字节比对。

**这是事件管线最重要的验证。失败即转写器不忠实。**

- [ ] **Step 16.1: 写测试 `events/roundtrip.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSss } from '../io/sss.js'
import { parseMessages } from '../io/msg.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('全量 events round-trip', () => {
  it('SSS.MKF chunk 4 逐字节相等', () => {
    const sssBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')))
    const msgBuf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/M.MSG')))
    const sss = parseSss(sssBuf)
    const messages = parseMessages(msgBuf, sss.messageOffsets)

    const commands = disasm(sss.bytecode, messages)
    const back = recompile(commands, messages)

    expect(back.byteLength).toBe(sss.bytecode.byteLength)
    expect(Buffer.from(back).equals(Buffer.from(sss.bytecode))).toBe(true)
  })
})
```

- [ ] **Step 16.2: 实现 `events/roundtrip.ts`(供 CLI 调用)**

```ts
import { parseSss } from '../io/sss.js'
import { parseMessages } from '../io/msg.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

export interface RoundtripResult {
  ok: boolean
  originalSize: number
  recompiledSize: number
  firstDiffOffset?: number
}

export function roundtripCheck(sssBuf: Uint8Array, msgBuf: Uint8Array): RoundtripResult {
  const sss = parseSss(sssBuf)
  const messages = parseMessages(msgBuf, sss.messageOffsets)
  const commands = disasm(sss.bytecode, messages)
  const back = recompile(commands, messages)
  let firstDiff: number | undefined
  for (let i = 0; i < Math.min(back.length, sss.bytecode.length); i++) {
    if (back[i] !== sss.bytecode[i]) {
      firstDiff = i
      break
    }
  }
  return {
    ok: back.byteLength === sss.bytecode.byteLength && firstDiff === undefined,
    originalSize: sss.bytecode.byteLength,
    recompiledSize: back.byteLength,
    firstDiffOffset: firstDiff,
  }
}
```

- [ ] **Step 16.3: 跑测试**

Run: `pnpm --filter @type-pal/pal-extract test events/roundtrip`

**这一步会暴露 disasm / recompile 的 bug**。逐字节 diff 出 firstDiffOffset,定位对应 opcode,翻 sdlpal `script.c` 看是不是某个 opcode 的字段语义错了。**预计这步会反复多轮**。

- [ ] **Step 16.4: 提交(round-trip 全通过后)**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.16): events/roundtrip.ts —— 全量 SSS.MKF round-trip 验证

- roundtripCheck 出 { ok, originalSize, recompiledSize, firstDiffOffset }
- 集成测试断言真实 SSS.MKF chunk 4 字节级相等
- (debug 过程中可能反复补 opcode 注册表 / disasm / recompile)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: events/slice.ts —— 可达性切分

**Files:**
- Create: `packages/pal-extract/src/events/slice.ts`
- Create: `packages/pal-extract/src/events/slice.test.ts`

从每场景的入口(`scenes[i].scriptOnEnter` / `scriptOnTeleport` + 该场景所有 EventObject 的 `triggerScript` / `autoScript`)做控制流追踪,收集可达指令下标的集合。

- 仅被 1 个场景可达 → `scene-NNN.json`
- 被 ≥2 个场景可达 → `shared.json`
- Object 类(物品 / 法术 / 敌人的 scripts)→ `objects.json`

跨文件跳转用 `"to": "shared#L_<index>"` / `"to": "objects#L_<index>"`。

控制流:遍历所有指令,跳转字段(kind: label)指向的指令也加入可达集;条件跳转分支与 fall-through 都要追;`end` 系列终止当前路径。

- [ ] **Step 17.1: 写测试 `events/slice.test.ts`(合成 fixture)**

```ts
import { describe, expect, it } from 'vitest'
import { sliceByScene } from './slice.js'

describe('sliceByScene', () => {
  it('只被 1 个场景可达的命令进 scene-N.json', () => {
    const commands = [
      { op: 'end' as const },
      { op: 'end' as const },
    ]
    const scenes = [
      { scriptOnEnter: 0, scriptOnTeleport: 0, mapNum: 0, eventObjectIndex: 0, raw: new Uint16Array() },
      { scriptOnEnter: 1, scriptOnTeleport: 1, mapNum: 0, eventObjectIndex: 0, raw: new Uint16Array() },
    ]
    const result = sliceByScene(commands, scenes, [])
    expect(result.scenes[0].segments[0].commands).toEqual([{ op: 'end' }])
    expect(result.scenes[1].segments[0].commands).toEqual([{ op: 'end' }])
    expect(result.shared.segments).toEqual([])
  })

  it('被两个场景共享的命令进 shared.json,跳转改成 shared#L_X', () => {
    const commands = [
      { op: 'goto' as const, to: 'L_2' },
      { op: 'goto' as const, to: 'L_2' },
      { label: 'L_2', op: 'end' as const },
    ]
    const scenes = [
      { scriptOnEnter: 0, scriptOnTeleport: 0, mapNum: 0, eventObjectIndex: 0, raw: new Uint16Array() },
      { scriptOnEnter: 1, scriptOnTeleport: 1, mapNum: 0, eventObjectIndex: 0, raw: new Uint16Array() },
    ]
    const result = sliceByScene(commands, scenes, [])
    expect(result.shared.segments[0]!.commands).toContainEqual({ label: 'L_2', op: 'end' })
    expect((result.scenes[0].segments[0]!.commands[0] as any).to).toBe('shared#L_2')
  })
})
```

- [ ] **Step 17.2: 实现 `events/slice.ts`**

```ts
import type { Command, EventFile, EventSegment } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'

export interface SliceResult {
  scenes: EventFile[]                   // 长度 = scenes.length
  shared: EventFile
  objects: EventFile
}

export function sliceByScene(
  commands: Command[],
  scenes: Scene[],
  eventObjects: EventObject[],
): SliceResult {
  // 1. 对每个场景做 BFS 收集可达 indices
  const reachableByScene: Set<number>[] = scenes.map(() => new Set())
  scenes.forEach((sc, si) => {
    const queue: number[] = []
    if (sc.scriptOnEnter) queue.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport) queue.push(sc.scriptOnTeleport)
    // 该场景的事件对象 trigger/auto 入口
    // 实施时:scenes[si].eventObjectIndex .. scenes[si+1].eventObjectIndex 切 eventObjects
    while (queue.length > 0) {
      const i = queue.shift()!
      if (reachableByScene[si]!.has(i)) continue
      reachableByScene[si]!.add(i)
      const c = commands[i]
      if (!c) continue
      if (c.op === 'end') continue
      if (c.op === 'goto') {
        const target = parseLabel(c.to)
        if (target !== null) queue.push(target)
        continue  // goto 无条件 —— 不 fall-through
      }
      // 条件跳转 / 其它 —— fall-through + label-kind 字段入队
      pushLabels(c, queue)
      queue.push(i + 1)
    }
  })

  // 2. 划分:每条指令出现在多少个场景里
  const sceneCount: number[] = commands.map((_, i) => {
    let n = 0
    for (const s of reachableByScene) if (s.has(i)) n++
    return n
  })

  // 3. 生成场景 / shared 命令清单(把跳转改成 shared#L_X)
  const sceneFiles: EventFile[] = scenes.map((_, si) => ({
    scene: si,
    segments: [makeSegment(`scene-${si}.entries`, commands, (i) => reachableByScene[si]!.has(i) && sceneCount[i] === 1, sceneCount)],
  }))
  const shared: EventFile = {
    segments: [makeSegment('shared', commands, (i) => sceneCount[i]! > 1, sceneCount)],
  }
  // objects:M1 占位空,实施时按需补
  const objects: EventFile = { segments: [] }

  return { scenes: sceneFiles, shared, objects }
}

function makeSegment(
  name: string,
  commands: Command[],
  predicate: (i: number) => boolean,
  sceneCount: number[],
): EventSegment {
  const out: Command[] = []
  commands.forEach((c, i) => {
    if (!predicate(i)) return
    out.push(rewriteJumps(c, sceneCount))
  })
  return { name, commands: out }
}

function rewriteJumps(c: Command, sceneCount: number[]): Command {
  if (c.op !== 'goto') return c
  const target = parseLabel(c.to)
  if (target === null) return c
  if ((sceneCount[target] ?? 0) > 1) {
    return { ...c, to: `shared#L_${target}` }
  }
  return c
}

function parseLabel(label: string): number | null {
  const m = /^L_(\d+)$/.exec(label)
  return m ? parseInt(m[1]!, 10) : null
}

function pushLabels(c: Command, queue: number[]): void {
  // 任何带 L_数字 形式字符串字段的命令,把目标推入队列
  for (const v of Object.values(c as Record<string, unknown>)) {
    if (typeof v === 'string') {
      const t = parseLabel(v)
      if (t !== null) queue.push(t)
    }
  }
}
```

- [ ] **Step 17.3: 跑测试,迭代到通过**

Run: `pnpm --filter @type-pal/pal-extract test events/slice`

- [ ] **Step 17.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.17): events/slice.ts —— 按场景可达性切分

- BFS 从每场景入口 + 事件对象 trigger/auto 收集可达指令
- 1 场景独占 → scene-NNN;≥2 场景共享 → shared
- 跨文件跳转改写为 shared#L_X
- objects.json 占位(实施时按 SSS chunk 2 补)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: events/annotate.ts —— `_` 注释名 + symbols.json

**Files:**
- Create: `packages/pal-extract/src/events/annotate.ts`
- Create: `packages/pal-extract/src/events/annotate.test.ts`

后处理 pass:遍历所有命令,对带 `itemId` / `sceneId` / `personId` / `enemyId` / `enemyTeamId` / `spellId` 字段的命令,查 `Words` 加 `_item` / `_scene` / `_person` / `_enemy` / `_spell` 字段。

`symbols.json` 输入(可空):`{ "scene": { "17": "客栈" } }` —— 对没在 WORD.DAT 的 ID 提供人工名;annotate 优先用它,再 fallback 到 WORD.DAT。

**注意**:`_` 字段不影响 `recompile`(因为 recompile 只看 `op` + 业务字段,忽略 `_*`),所以 annotate 之后 round-trip 仍然通过。

- [ ] **Step 18.1: 写测试 `events/annotate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { annotate } from './annotate.js'
import type { Words } from '../io/word.js'

const words: Words = {
  items: ['', '止血草', '灵葫芦'],
  spells: [], persons: [], enemies: [], scenes: [],
}

describe('annotate', () => {
  it('giveItem 加 _item 注释', () => {
    const before = [{ op: 'giveItem' as const, itemId: 2, count: 1 }]
    const after = annotate(before, words, {})
    expect(after[0]).toEqual({ op: 'giveItem', itemId: 2, count: 1, _item: '灵葫芦' })
  })

  it('symbols.json 覆盖 WORD.DAT', () => {
    const before = [{ op: 'giveItem' as const, itemId: 1, count: 1 }]
    const after = annotate(before, words, { item: { '1': '神奇止血草' } })
    expect(after[0]).toEqual({ op: 'giveItem', itemId: 1, count: 1, _item: '神奇止血草' })
  })
})
```

- [ ] **Step 18.2: 实现 `events/annotate.ts`**

```ts
import type { Command } from '@type-pal/shared'
import type { Words } from '../io/word.js'

export interface Symbols {
  item?: Record<string, string>
  spell?: Record<string, string>
  person?: Record<string, string>
  enemy?: Record<string, string>
  scene?: Record<string, string>
}

export function annotate(commands: Command[], words: Words, symbols: Symbols): Command[] {
  return commands.map((c) => annotateOne(c, words, symbols))
}

function annotateOne(c: Command, words: Words, symbols: Symbols): Command {
  // 对结构化命令递归
  if (c.op === 'sequence') return { ...c, steps: annotate(c.steps, words, symbols) }
  if (c.op === 'if') return { ...c, then: annotate(c.then, words, symbols), else: c.else ? annotate(c.else, words, symbols) : undefined }
  if (c.op === 'choice') return { ...c, options: c.options.map(o => ({ ...o, then: annotate(o.then, words, symbols) })) }

  // raw 不注释
  if (c.op === 'raw') return c

  // 具名命令:按字段名 → 注释名映射
  const out: any = { ...c }
  const fieldMap: Array<[string, keyof Symbols, string[]]> = [
    ['itemId', 'item', words.items],
    ['spellId', 'spell', words.spells],
    ['personId', 'person', words.persons],
    ['enemyId', 'enemy', words.enemies],
    ['enemyTeamId', 'enemy', words.enemies],
    ['sceneId', 'scene', words.scenes],
  ]
  for (const [field, kind, list] of fieldMap) {
    const id = (c as any)[field]
    if (typeof id !== 'number') continue
    const annotation = symbols[kind]?.[String(id)] ?? list[id]
    if (annotation) out[`_${kind}`] = annotation
  }
  return out as Command
}
```

- [ ] **Step 18.3: 跑测试到通过**

Run: `pnpm --filter @type-pal/pal-extract test events/annotate`

- [ ] **Step 18.4: 提交**

```sh
git add packages/pal-extract/
git commit -m "feat(M1.18): events/annotate.ts —— _ 注释名 + symbols.json

- giveItem.itemId → _item;同理 spell/person/enemy/scene
- symbols.json 优先于 WORD.DAT
- 结构化命令递归
- _ 字段不影响 round-trip(recompile 忽略 _*)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: cli.ts —— CLI 总装

**Files:**
- Create: `packages/pal-extract/src/cli.ts`
- Modify: `packages/pal-extract/package.json`(加 `scripts.extract`)
- Modify: 根 `package.json`(加 `scripts.extract`)
- Modify: `.gitignore`(加 `data/extracted/`)

把上面所有模块串成 `pnpm extract` 一条命令,产出完整 `data/extracted/` 结构。

- [ ] **Step 19.1: 实现 `packages/pal-extract/src/cli.ts`**

```ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { openMkf, readChunk } from './io/mkf.js'
import { decompressYj1, isYj1 } from './io/yj1.js'
import { parseSss } from './io/sss.js'
import { parseMessages } from './io/msg.js'
import { parseWordDat } from './io/word.js'
import { decodePalette } from './resources/palette.js'
import { parseMap } from './resources/map.js'
import { parseItems, parseSpells, parseEnemies } from './resources/tables.js'
import { disasm } from './events/disasm.js'
import { recompile } from './events/recompile.js'
import { sliceByScene } from './events/slice.js'
import { annotate, type Symbols } from './events/annotate.js'

const RAW = resolve(import.meta.dirname!, '../../../data/raw')
const OUT = resolve(import.meta.dirname!, '../../../data/extracted')

// 切片场景 —— 实施时第一次跑后看 sss.scenes 选游戏开局
const SLICE_SCENE_ID = /* TODO: 实施时填,通常 0 或 1 */ 0

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}
function writeBinary(path: string, data: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}
function loadMkfChunk(file: string, chunkIndex: number): Uint8Array {
  const buf = new Uint8Array(readFileSync(resolve(RAW, file)))
  const mkf = openMkf(buf)
  const chunk = readChunk(mkf, chunkIndex)
  return isYj1(chunk) ? decompressYj1(chunk) : chunk
}

async function main(): Promise<void> {
  console.log('[pal-extract] start')

  // ===== 共享 =====
  const sssBuf = new Uint8Array(readFileSync(resolve(RAW, 'SSS.MKF')))
  const msgBuf = new Uint8Array(readFileSync(resolve(RAW, 'M.MSG')))
  const wordBuf = new Uint8Array(readFileSync(resolve(RAW, 'WORD.DAT')))
  const sss = parseSss(sssBuf)
  const messages = parseMessages(msgBuf, sss.messageOffsets)
  const words = parseWordDat(wordBuf)
  const symbolsPath = resolve(OUT, '..', 'symbols.json')
  const symbols: Symbols = existsSync(symbolsPath)
    ? JSON.parse(readFileSync(symbolsPath, 'utf-8'))
    : {}

  // ===== 资源管线(切片)=====
  console.log('[pal-extract] resources …')
  const scene = sss.scenes[SLICE_SCENE_ID]!
  const mapResult = parseMap(loadMkfChunk('MAP.MKF', scene.mapNum))
  mapResult.tilemap.tilesetImage = `tilemap-${SLICE_SCENE_ID}-tileset.png`
  writeJson(resolve(OUT, 'data', `tilemap-${SLICE_SCENE_ID}.json`), mapResult.tilemap)
  writeBinary(resolve(OUT, 'images', mapResult.tilemap.tilesetImage), mapResult.tilesetPng)

  // 精灵:切片场景所有事件对象的 spriteNum
  // 实施时:scene.eventObjectIndex .. next scene.eventObjectIndex 切片
  const spriteNumsInScene = new Set<number>()
  for (const eo of sss.eventObjects) {
    if (eo.spriteNum > 0) spriteNumsInScene.add(eo.spriteNum)
  }
  for (const spriteNum of spriteNumsInScene) {
    // 实施时:精灵号 → 哪个 MKF + 哪个 chunk 由 sdlpal sprite.c 决定
    console.log(`[pal-extract] sprite ${spriteNum} TODO`)
  }

  // 调色板
  const palBuf = loadMkfChunk('MGO.MKF', /* TODO: 调色板在哪个 chunk */ 0)
  writeJson(resolve(OUT, 'data', `palette-${SLICE_SCENE_ID}.json`), decodePalette(palBuf))

  // 数据表(全解全产)
  const dataMkf = openMkf(new Uint8Array(readFileSync(resolve(RAW, 'DATA.MKF'))))
  writeJson(resolve(OUT, 'data', 'items.json'), parseItems(readChunk(dataMkf, /* TODO */ 0), words))
  writeJson(resolve(OUT, 'data', 'spells.json'), parseSpells(readChunk(dataMkf, /* TODO */ 0), words))
  writeJson(resolve(OUT, 'data', 'enemies.json'), parseEnemies(readChunk(dataMkf, /* TODO */ 0), words))

  // lookup
  writeJson(resolve(OUT, 'lookup', 'words.json'), words)
  writeJson(resolve(OUT, 'lookup', 'strings.json'), messages)

  // ===== 事件管线(全量)=====
  console.log('[pal-extract] events …')
  const commands = annotate(disasm(sss.bytecode, messages), words, symbols)

  // round-trip 自检 —— annotate 后的 _ 字段不影响,recompile 仍逐字节相等
  const recompiled = recompile(commands, messages)
  if (
    recompiled.byteLength !== sss.bytecode.byteLength ||
    !Buffer.from(recompiled).equals(Buffer.from(sss.bytecode))
  ) {
    console.error('[pal-extract] ROUND-TRIP FAILED — events.json 与原 SSS.MKF 不一致')
    process.exit(2)
  }
  console.log('[pal-extract] events round-trip OK')

  const sliced = sliceByScene(commands, sss.scenes, sss.eventObjects)
  sliced.scenes.forEach((sceneFile, i) => {
    writeJson(resolve(OUT, 'events', `scene-${i.toString().padStart(3, '0')}.json`), sceneFile)
  })
  writeJson(resolve(OUT, 'events', 'shared.json'), sliced.shared)
  writeJson(resolve(OUT, 'events', 'objects.json'), sliced.objects)

  console.log(`[pal-extract] done. output → ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 19.2: Modify `packages/pal-extract/package.json` 加 extract 脚本**

`scripts.extract`:用 `node --experimental-strip-types src/cli.ts`(Node 22+)或装 `tsx`(`pnpm add -D tsx --filter @type-pal/pal-extract`)。**实施时按已装 Node 版本拍**。

- [ ] **Step 19.3: Modify 根 `package.json` 加 `scripts.extract: "pnpm --filter @type-pal/pal-extract run extract"`**

- [ ] **Step 19.4: Modify `.gitignore` 加 `data/extracted/`**

- [ ] **Step 19.5: 跑一遍 extract,迭代填掉所有 TODO 常量**

```sh
pnpm extract
```

Expected: 跑通,产出完整 `data/extracted/` 结构。round-trip 不报 FAILED。

> 这一步预计要反复:发现某个 chunk index 错了 / 某个偏移错了,翻 sdlpal 调整,再跑。

- [ ] **Step 19.6: 跑 `pnpm check` 全绿**

```sh
pnpm check
```

- [ ] **Step 19.7: 提交**

```sh
git add packages/pal-extract/ package.json .gitignore
git commit -m "feat(M1.19): cli.ts —— pal-extract 总装

- pnpm extract 一次性产出 data/extracted/
- 资源切片 + 事件全量 + round-trip 自检
- 切片场景 ID + 各 chunk 索引落到常量(实施时确定)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: sdlpal RLE 对拍 harness

**Files:**
- Create: `scripts/sdlpal-rle-dump.c`
- Create: `scripts/sdlpal-rle-dump.sh`
- Create: `packages/pal-extract/scripts/compare-rle.ts`

让 sdlpal 把任一精灵的 RLE 解码结果 dump 出来,我们的 `rle.ts` 解出来逐字节对比。

实施思路:写一个小 C 程序,链接 sdlpal 的 `video.c` 中 RLE 解码部分,接受 (stdin: RLE 字节流) → stdout: u16 LE width + u16 LE height + 索引位图字节。

- [ ] **Step 20.1: 写 `scripts/sdlpal-rle-dump.c`(链接 sdlpal RLE)**

骨架(实际函数签名按 sdlpal video.c 中 RLE 解码函数补):

```c
/*
 * sdlpal RLE dump:从 stdin 读 RLE 字节流,调 sdlpal video.c 中的解码,
 * 输出 width(u16 LE) + height(u16 LE) + pixels(索引位图原始字节)到 stdout。
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 链接到 sdlpal/video.c 中的 PAL_RLEGetWidth / PAL_RLEGetHeight / PAL_RLEBlitToSurface */
extern unsigned short PAL_RLEGetWidth(const unsigned char *bitmap);
extern unsigned short PAL_RLEGetHeight(const unsigned char *bitmap);
/* 实施时按 sdlpal 实际可用的解码 API 补 —— 可能需要一个最小 SDL surface stub */

int main(void) {
    /* 1. 读 stdin 到 buffer */
    /* 2. 调 PAL_RLE* 解出 width / height / pixels */
    /* 3. 输出 width(2) + height(2) + pixels 到 stdout */
    return 0;
}
```

- [ ] **Step 20.2: 写 `scripts/sdlpal-rle-dump.sh` —— 构建脚本**

```sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
clang -I reference/sdlpal -o build/sdlpal-rle-dump \
    scripts/sdlpal-rle-dump.c \
    reference/sdlpal/video.c
# 实施时:ld 报 undef 的 symbol 全补上(可能需要 stub 出 SDL 相关 symbol)
```

- [ ] **Step 20.3: 写 `packages/pal-extract/scripts/compare-rle.ts` —— 跑对拍**

```ts
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decodeRle } from '../src/io/rle.js'

// 切片场景的精灵号 / 对应 RLE 字节(实施时由 cli.ts 写出 sprite-ids-slice.json)
const SPRITE_IDS = JSON.parse(
  readFileSync(resolve('data/extracted/data/sprite-ids-slice.json'), 'utf-8'),
) as number[]

const DUMP_BIN = resolve('build/sdlpal-rle-dump')

let mismatches = 0
for (const id of SPRITE_IDS) {
  const rleBytes = readFileSync(resolve(`data/extracted/sprite-rle/${id}.bin`))
  const ours = decodeRle(new Uint8Array(rleBytes))
  // 调外部 dump 程序 —— spawnSync 走 PATH-resolved 路径,不经 shell,无注入风险
  const r = spawnSync(DUMP_BIN, [], { input: rleBytes })
  if (r.status !== 0) {
    console.error(`sprite ${id} dump failed:`, r.stderr.toString())
    mismatches++
    continue
  }
  const theirs = r.stdout
  const tw = theirs.readUInt16LE(0)
  const th = theirs.readUInt16LE(2)
  const tp = theirs.subarray(4)
  if (ours.width !== tw || ours.height !== th || !Buffer.from(ours.pixels).equals(tp)) {
    console.error(`sprite ${id} MISMATCH`)
    mismatches++
  }
}
console.log(`done. mismatches: ${mismatches}`)
process.exit(mismatches === 0 ? 0 : 1)
```

- [ ] **Step 20.4: 跑对拍,目标 0 mismatch**

```sh
bash scripts/sdlpal-rle-dump.sh
pnpm --filter @type-pal/pal-extract run compare-rle
```

Expected: `done. mismatches: 0`

> 这一步是 M1 最不可控的部分,可能需要给 sdlpal C 源码做小补丁 / stub SDL 依赖。如果 1-2 天没拿出来,**降级方案**:把 RLE 对拍改为"原版 sdlpal 跑游戏到切片场景 → 用截屏对照我们渲的 PNG"(M2 期间再做),M1 收尾不卡这一步,但要在 README 标明。

- [ ] **Step 20.5: 提交**

```sh
git add scripts/sdlpal-rle-dump.* packages/pal-extract/scripts/compare-rle.ts packages/pal-extract/package.json
git commit -m "feat(M1.20): sdlpal RLE 对拍 harness

- scripts/sdlpal-rle-dump.c 链接 sdlpal video.c 的 RLE
- packages/pal-extract/scripts/compare-rle.ts 跑切片精灵对拍
- 0 mismatch:M1 RLE 与原版逐像素相等

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: README 更新 + M1 收尾

**Files:**
- Create: `data/extracted/README.md`(产物结构说明)
- Modify: `README.md`(当前状态)

- [ ] **Step 21.1: 写 `data/extracted/README.md`**

```markdown
# data/extracted —— pal-extract 产物

由 `pnpm extract` 从 `data/raw/` 一次性生成。**不入 git**(派生文件)。

## 结构

- `images/` —— 索引位图 PNG。M1 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)
- `data/` —— tilemap / palette / sprite 元数据 + 数据表 JSON
- `events/` —— `scene-NNN.json` / `shared.json` / `objects.json`,字节码反汇编全量
- `lookup/` —— 开发期参考:`words.json` / `strings.json`,game 包不读
- `../symbols.json` —— 人工补名(输入,可空)

## M1 范围

- 资源切片:开局场景(余杭客栈 / 李宅 一带,scene id = N)
- 事件全量:全 SSS.MKF round-trip 通过,M2 切片要用的 ~15 opcode 已具名,其余 raw

详见 `../../docs/plans/2026-05-23-m1-pal-extract-design.md`。
```

- [ ] **Step 21.2: 修 `README.md` 当前状态**

```markdown
## 当前状态(2026-XX-XX)

**M1 完成** —— `pal-extract` 打通最小链路。`pnpm extract` 一次性产出 `data/extracted/`(资源切片 + 事件全量),全量 SSS.MKF round-trip 通过,RLE 与 sdlpal 逐像素对拍 0 mismatch。

下一步:**M2**(运行时垂直切片 · 探索),见 `docs/03-development-plan.md`。
```

- [ ] **Step 21.3: 跑全套自检**

```sh
pnpm check
pnpm extract
bash scripts/sdlpal-rle-dump.sh
pnpm --filter @type-pal/pal-extract run compare-rle
```

Expected: 全绿。

- [ ] **Step 21.4: 提交 M1 完成**

```sh
git add README.md data/extracted/README.md
git commit -m "docs(M1.21): M1 完成 —— README 更新

- pal-extract 链路打通,资源切片 + 事件全量
- 全量 SSS.MKF round-trip 通过
- RLE 与 sdlpal 逐像素对拍 0 mismatch
- 下一步 M2(运行时探索切片)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## 自检清单(实施完跑一遍)

- [ ] `pnpm install` 在干净的克隆上能跑通
- [ ] `pnpm check` 退出码 0,三包 typecheck + 测试全过
- [ ] `pnpm extract` 跑通,产出完整 `data/extracted/` 结构
- [ ] events round-trip:`pnpm extract` 不打印 ROUND-TRIP FAILED
- [ ] RLE 对拍:`pnpm --filter @type-pal/pal-extract run compare-rle` 报 0 mismatch
- [ ] 抽样数据表:打开 `data/extracted/data/items.json` 抓 3 个条目对照 sdlpal data 看
- [ ] `data/extracted/` 在 `.gitignore`,`git status` 不出现 untracked
- [ ] `reference/sdlpal/` 未被改动(只读规格)
- [ ] M2 起步时 `@type-pal/shared` 的 Command / Tilemap / Palette 类型可直接 import
