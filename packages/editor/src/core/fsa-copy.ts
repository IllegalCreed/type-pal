/**
 * FSA 目录整树递归拷贝(A5 债修:「另存为」曾只写 serialize 文件集 —— 克隆工程磁盘上的
 * 既有素材不在编辑器 state,另存即丢)。另存为 = 先整树拷贝源目录,再覆写内容文件。
 */

/** src 全部文件/子目录递归拷进 dst(同名覆盖,他文件保留)。返回拷贝文件数。 */
export async function copyDirRecursive(
  src: FileSystemDirectoryHandle,
  dst: FileSystemDirectoryHandle,
): Promise<number> {
  let n = 0
  // entries() 是 FSA 标准异步迭代器(TS lib 未收录 → 局部窄化;同 export-zip)
  const iter = (
    src as unknown as {
      entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
    }
  ).entries()
  for await (const [name, handle] of iter) {
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      const fh = await dst.getFileHandle(name, { create: true })
      const w = await fh.createWritable()
      await w.write(file)
      await w.close()
      n++
    } else {
      const sub = await dst.getDirectoryHandle(name, { create: true })
      n += await copyDirRecursive(handle as FileSystemDirectoryHandle, sub)
    }
  }
  return n
}
