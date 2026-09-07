import { describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { sha256Hex } from './binary-signature.js'
import { collectProjectZipEntries, validateProjectZipEntries } from './export-zip.js'
import { buildSeedAssets } from './seed-assets.js'
import { buildZip, crc32 } from './zip.js'

vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  findWorkspaceRecordByHandle: async () => null,
}))

function projectDir(files: Record<string, string>): FileSystemDirectoryHandle {
  return memoryAuthorDirectory(files).dir
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

describe('zip 打包器(A5 项目导出)', () => {
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

  test('项目导出采集保留 map index 与零引用地图', async () => {
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

  test('沙盒 marker 作为目录身份旁车随原样 ZIP 导出并逐字节 roundtrip', async () => {
    const marker =
      '{"kind":"type-pal-editor-workspace","version":1,"mode":"sandbox","workspaceId":"44444444-4444-4444-8444-444444444444","projectId":"pal","source":"ui-samples"}\n'
    const entries = await collectProjectZipEntries(
      projectDir({
        'manifest.json': '{"id":"pal"}',
        '.type-pal/workspace.json': marker,
      }),
    )
    expect(entries.map((entry) => entry.path).sort()).toEqual([
      '.type-pal/workspace.json',
      'manifest.json',
    ])
    const back = await readZip(await buildZip(entries))
    expect(new TextDecoder().decode(back.get('.type-pal/workspace.json'))).toBe(marker)
  })

  test('不可压小文件择优 STORE(不反涨)', async () => {
    const tiny = new Uint8Array([1, 2, 3])
    const zip = await buildZip([{ path: 'a.bin', data: tiny }])
    const back = await readZip(zip)
    expect(back.get('a.bin')).toEqual(tiny)
  })

  test('恢复暂存子树不读取不入包，除此之外逐字节保留包括相似用户路径', async () => {
    const disk = memoryAuthorDirectory({
      'manifest.json': '{"id":"pal"}',
      '.type-pal/save-state.json': {
        kind: 'type-pal-author-save',
        version: 1,
        operationId: '11111111-1111-4111-8111-111111111111',
        phase: 'committed',
        planHash: 'a'.repeat(64),
      },
      '.type-pal/workspace.json': 'sandbox identity bytes\n',
      '.type-pal/pal-development.json': 'PAL identity bytes\n',
      '.type-pal/save-recovery/operation/plan.json': 'private plan',
      '.type-pal/save-recovery/operation/blobs/bytes': new Uint8Array([1, 2, 255]).buffer,
      '.type-pal/save-recovery-notes.txt': 'user file, not recovery',
      'notes/.type-pal/save-recovery/example.txt': 'nested user path, not root recovery',
    })
    const before = new Map(disk.files)
    const reads: string[] = []
    disk.hooks.afterRead = (path) => {
      reads.push(path)
    }
    const entries = await collectProjectZipEntries(disk.dir)
    const back = await readZip(await buildZip(entries))
    const published = [...disk.files].filter(
      ([path]) => !path.startsWith('.type-pal/save-recovery/'),
    )
    expect([...back.keys()].sort()).toEqual(published.map(([path]) => path).sort())
    for (const [path, bytes] of published) expect(back.get(path)).toEqual(new Uint8Array(bytes))
    expect(reads.some((path) => path.startsWith('.type-pal/save-recovery/'))).toBe(false)
    expect(disk.files).toEqual(before)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
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
    ).rejects.toThrow(/catalog 外的 extracted 资源副本/)
  })

  test('catalog battle-sprite ZIP 拒绝缺失/篡改/非 RLE 与退役 extracted 双副本', async () => {
    const gzip = new Uint8Array((await buildSeedAssets()).battleSpriteRle)
    const enc = new TextEncoder()
    const entriesFor = async (bytes: Uint8Array) => {
      const record = {
        kind: 'battle-sprite',
        path: 'assets/generated/battle-sprites/starter.rle',
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
                legacy: { families: ['effect-sprite'] },
              },
            }),
          ),
        },
        {
          path: 'assets/index.json',
          data: enc.encode(
            JSON.stringify({ version: 1, assets: { 'battle-sprite.generated.starter': record } }),
          ),
        },
        { path: record.path, data: bytes },
      ]
    }

    const valid = await entriesFor(gzip)
    await expect(validateProjectZipEntries(valid)).resolves.toBeUndefined()
    await expect(validateProjectZipEntries(valid.slice(0, 2))).rejects.toThrow(/资源缺失/)

    const tampered = valid.map((entry) => ({ ...entry, data: new Uint8Array(entry.data) }))
    tampered[2]!.data[3] = (tampered[2]!.data[3] ?? 0) ^ 0xff
    await expect(validateProjectZipEntries(tampered)).rejects.toThrow(/bytes\/sha256/)

    const junkGzip = new Uint8Array(
      await new Response(
        new Blob([new Uint8Array([1, 2, 3])]).stream().pipeThrough(new CompressionStream('gzip')),
      ).arrayBuffer(),
    )
    await expect(validateProjectZipEntries(await entriesFor(junkGzip))).rejects.toThrow(
      /battle-sprite 非 canonical/,
    )

    await expect(
      validateProjectZipEntries([
        ...valid,
        { path: 'assets/extracted/data/battle-sprites.json', data: enc.encode('{}') },
        { path: 'assets/extracted/data/battle-sprite/player/0.rle', data: gzip },
      ]),
    ).rejects.toThrow(/catalog 外的 extracted 资源副本/)
  })
})
