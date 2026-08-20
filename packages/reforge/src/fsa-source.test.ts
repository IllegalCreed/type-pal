import { describe, expect, test, vi } from 'vitest'
import { fsaSource } from './fsa-source.js'

/** 内存 mock:files 以 'a/b.json' 全路径为键;值 = 字符串内容。递归造目录/文件句柄。 */
function mockDir(files: Record<string, string>): FileSystemDirectoryHandle {
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      async getDirectoryHandle(name: string) {
        return make(prefix ? `${prefix}/${name}` : name)
      },
      async getFileHandle(name: string) {
        const full = prefix ? `${prefix}/${name}` : name
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        return {
          async getFile() {
            const content = files[full] ?? ''
            return {
              text: async () => content,
              arrayBuffer: async () => new TextEncoder().encode(content).buffer,
            }
          },
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

describe('fsaSource', () => {
  const dir = mockDir({
    'manifest.json': '{"id":"proj"}',
    'content/actors.json': '[{"id":"a"}]',
    'assets/tilemap/1.json': '{"w":2}',
  })

  test('readText / readJson 逐段进目录取文件', async () => {
    const s = fsaSource(dir)
    expect(await s.readText('manifest.json')).toBe('{"id":"proj"}')
    expect(await s.readJson('content/actors.json')).toEqual([{ id: 'a' }])
    expect(await s.readJson('assets/tilemap/1.json')).toEqual({ w: 2 })
  })

  test('readBytes 返回 ArrayBuffer', async () => {
    const buf = await fsaSource(dir).readBytes('manifest.json')
    expect(new TextDecoder().decode(new Uint8Array(buf))).toBe('{"id":"proj"}')
  })

  test('urlFor 同路径缓存，dispose 统一 revoke', async () => {
    const createObjectURL = vi.fn(() => 'blob:xyz')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const source = fsaSource(dir)
    expect(await source.urlFor('manifest.json')).toBe('blob:xyz')
    expect(await source.urlFor('manifest.json')).toBe('blob:xyz')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    source.dispose?.()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:xyz')
    vi.restoreAllMocks()
  })

  test('拒绝越界与绝对路径', async () => {
    const source = fsaSource(dir)
    await expect(source.readText('../manifest.json')).rejects.toThrow('禁止空段、. 或 ..')
    await expect(source.readText('/manifest.json')).rejects.toThrow('禁止绝对路径')
  })

  test('缺文件 → 抛(NotFound 透传)', async () => {
    await expect(fsaSource(dir).readText('nope.json')).rejects.toThrow()
  })

  test('已取消读取立即抛 AbortError', async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(fsaSource(dir).readJson('manifest.json', ac.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
