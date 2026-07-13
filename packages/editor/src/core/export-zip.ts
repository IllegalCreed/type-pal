/**
 * 工程导出 zip(A5)。工程自包含铁律 → 导出 = 把工程文件夹**原样**打包(递归全收,
 * 不挑不滤 —— 文件夹就是全部世界),分享/备份即这一个 zip。读磁盘:未保存改动不入包。
 */
import { buildZip, type ZipEntry } from './zip.js'

/** 递归收集 FSA 目录全部文件(路径正斜杠,相对工程根)。 */
async function collectDir(dir: FileSystemDirectoryHandle, prefix = ''): Promise<ZipEntry[]> {
  const out: ZipEntry[] = []
  // entries() 是 FSA 标准异步迭代器(TS lib 未收录 → 局部窄化)
  const iter = (
    dir as unknown as {
      entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
    }
  ).entries()
  for await (const [name, handle] of iter) {
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({ path: `${prefix}${name}`, data: new Uint8Array(await file.arrayBuffer()) })
    } else {
      out.push(...(await collectDir(handle as FileSystemDirectoryHandle, `${prefix}${name}/`)))
    }
  }
  return out
}

/** 打包工程目录 → 触发浏览器下载 <projectId>.zip。返回条目数(UI 提示用)。 */
export async function exportProjectZip(
  dir: FileSystemDirectoryHandle,
  projectId: string,
): Promise<number> {
  const entries = await collectDir(dir)
  if (entries.length === 0) throw new Error('工程文件夹是空的')
  const zip = await buildZip(entries)
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectId}.zip`
  a.click()
  URL.revokeObjectURL(url)
  return entries.length
}
