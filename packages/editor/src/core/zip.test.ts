import { describe, expect, test } from 'vitest'
import { sha256Hex } from './binary-signature.js'
import { collectProjectZipEntries, validateProjectZipEntries } from './export-zip.js'
import { buildSeedAssets } from './seed-assets.js'
import { buildZip, crc32 } from './zip.js'

function projectDir(files: Record<string, string>): FileSystemDirectoryHandle {
  const tree = new Map<string, string>(Object.entries(files))
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      kind: 'directory',
      async *entries() {
        const children = new Map<string, 'file' | 'directory'>()
        for (const path of tree.keys()) {
          if (!path.startsWith(prefix)) continue
          const rest = path.slice(prefix.length)
          const [name, ...tail] = rest.split('/')
          if (!name) continue
          children.set(name, tail.length ? 'directory' : 'file')
        }
        for (const [name, kind] of children) {
          if (kind === 'directory') yield [name, make(`${prefix}${name}/`)]
          else {
            const value = tree.get(`${prefix}${name}`) ?? ''
            yield [
              name,
              {
                kind: 'file',
                async getFile() {
                  return new File([value], name)
                },
              } as FileSystemFileHandle,
            ]
          }
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

/** 解 zip(测试用最小 reader):按中央目录逐条取出并解压,验 roundtrip。 */
async function readZip(zip: Uint8Array): Promise<Map<string, Uint8Array>> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  // EOCD 定位(无注释 → 尾部 22 字节)
  const eocd = zip.length - 22
  expect(v.getUint32(eocd, true)).toBe(0x06054b50)
  const count = v.getUint16(eocd + 8, true)
  let p = v.getUint32(eocd + 16, true) // central dir offset
  const out = new Map<string, Uint8Array>()
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50)
    const method = v.getUint16(p + 10, true)
    const crc = v.getUint32(p + 16, true)
    const compSize = v.getUint32(p + 20, true)
    const rawSize = v.getUint32(p + 24, true)
    const nameLen = v.getUint16(p + 28, true)
    const localOff = v.getUint32(p + 42, true)
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen))
    // local header → payload
    expect(v.getUint32(localOff, true)).toBe(0x04034b50)
    const lNameLen = v.getUint16(localOff + 26, true)
    const lExtraLen = v.getUint16(localOff + 28, true)
    const dataStart = localOff + 30 + lNameLen + lExtraLen
    const payload = zip.subarray(dataStart, dataStart + compSize)
    const data =
      method === 0
        ? new Uint8Array(payload)
        : new Uint8Array(
            await new Response(
              new Blob([new Uint8Array(payload)])
                .stream()
                .pipeThrough(new DecompressionStream('deflate-raw')),
            ).arrayBuffer(),
          )
    expect(data.length).toBe(rawSize)
    expect(crc32(data)).toBe(crc)
    out.set(name, data)
    p += 46 + nameLen
  }
  return out
}

describe('zip 打包器(A5 工程导出)', () => {
  test('crc32 已知值("123456789" → 0xCBF43926)', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  test('roundtrip:中文路径 + 文本 + 二进制,解回逐字节相等', async () => {
    const enc = new TextEncoder()
    const bin = new Uint8Array(4096)
    for (let i = 0; i < bin.length; i++) bin[i] = (i * 7) & 0xff
    const entries = [
      { path: 'manifest.json', data: enc.encode('{"id":"我的游戏","name":"测试"}') },
      { path: 'content/scenes/s000.json', data: enc.encode('{"id":"s000"}'.repeat(100)) },
      { path: 'assets/sprites/主角.rle', data: bin },
    ]
    const zip = await buildZip(entries)
    const back = await readZip(zip)
    expect(back.size).toBe(3)
    for (const e of entries) expect(back.get(e.path)).toEqual(e.data)
  })

  test('roundtrip:共享脚本 library 元数据与 body 同时保留', async () => {
    const enc = new TextEncoder()
    const dec = new TextDecoder()
    const index = {
      version: 1,
      shards: { scene: 16, shared: 16 },
      chunks: {
        'shared/00': { path: 'shared/00.json', bytes: 123, hash: 'deadbeef' },
      },
      library: {
        'shared/user/开门-abc123': {
          name: '客栈开门',
          description: '两个场景共同调用',
          self: 'required',
        },
      },
    }
    const chunk = {
      version: 1,
      chunk: 'shared/00',
      imports: [],
      scripts: {
        'shared/user/开门-abc123': [{ op: 'setEntityState', entity: 'self', state: 'open' }],
      },
    }
    const zip = await buildZip([
      { path: 'content/scripts/index.json', data: enc.encode(JSON.stringify(index)) },
      { path: 'content/scripts/shared/00.json', data: enc.encode(JSON.stringify(chunk)) },
    ])
    const back = await readZip(zip)

    expect(JSON.parse(dec.decode(back.get('content/scripts/index.json')))).toEqual(index)
    expect(JSON.parse(dec.decode(back.get('content/scripts/shared/00.json')))).toEqual(chunk)
  })

  test('工程导出采集保留 map index 与零引用地图', async () => {
    const entries = await collectProjectZipEntries(
      projectDir({
        'manifest.json': '{"id":"maps"}',
        'content/maps/index.json': '{"version":1,"maps":[{"id":"unused"}]}',
        'content/maps/unused.json': '{"version":1}',
      }),
    )
    expect(entries.map((entry) => entry.path).sort()).toEqual([
      'content/maps/index.json',
      'content/maps/unused.json',
      'manifest.json',
    ])
  })

  test('不可压小文件择优 STORE(不反涨)', async () => {
    const tiny = new Uint8Array([1, 2, 3])
    const zip = await buildZip([{ path: 'a.bin', data: tiny }])
    const back = await readZip(zip)
    expect(back.get('a.bin')).toEqual(tiny)
  })

  test('导出可复现:同内容两次打包字节全等(DOS 时间恒 1980)', async () => {
    const entries = [{ path: 'x.json', data: new TextEncoder().encode('{"v":1}') }]
    expect(await buildZip(entries)).toEqual(await buildZip(entries))
  })

  test('catalog tileset 必须逐字节闭包，拒绝篡改、裸 RLE 与 extracted 重复副本', async () => {
    const gzip = new Uint8Array((await buildSeedAssets()).tilesetRle)
    const enc = new TextEncoder()
    const entriesFor = async (bytes: Uint8Array) => {
      const record = {
        kind: 'tileset',
        path: 'assets/generated/tilesets/starter.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        origin: { kind: 'generated' },
      }
      return [
        {
          path: 'manifest.json',
          data: enc.encode(
            JSON.stringify({
              assets: {
                catalog: 'assets/index.json',
                roles: {},
                legacy: { families: ['sprite'] },
              },
            }),
          ),
        },
        {
          path: 'assets/index.json',
          data: enc.encode(
            JSON.stringify({ version: 1, assets: { 'tileset.generated.starter': record } }),
          ),
        },
        { path: record.path, data: bytes },
      ]
    }

    const valid = await entriesFor(gzip)
    await expect(validateProjectZipEntries(valid)).resolves.toBeUndefined()

    const tampered = valid.map((entry) => ({ ...entry, data: new Uint8Array(entry.data) }))
    tampered[2]!.data[2] = (tampered[2]!.data[2] ?? 0) ^ 0xff
    await expect(validateProjectZipEntries(tampered)).rejects.toThrow(/bytes\/sha256/)

    const bare = gzip.slice(2)
    await expect(validateProjectZipEntries(await entriesFor(bare))).rejects.toThrow(
      /非 canonical gzip/,
    )

    await expect(
      validateProjectZipEntries([
        ...valid,
        { path: 'assets/extracted/data/tileset/1.rle', data: gzip },
      ]),
    ).rejects.toThrow(/已退役/)
  })
})
