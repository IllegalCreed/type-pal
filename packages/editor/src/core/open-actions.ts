/**
 * 工程动作(P4)—— 启动屏与编辑器内「工程」菜单共享:新建(克隆/空白)/ 打开 / 另存为。
 * 每个动作 = 拿本地目录句柄(原生选夹,须用户手势)→ 操作 → openLocalProject 装配 → Opened。
 * 用户取消选夹 → 返回 null(调用方静默忽略)。
 */
import { httpSource } from '@type-pal/reforge'
import { cloneFromPal } from './clone.js'
import { currentDirectoryPickerAvailability } from './file-system-access.js'
import { copyDirRecursive } from './fsa-copy.js'
import { saveHandle } from './handle-store.js'
import { openLocalProject, type OpenedProject } from './open-local.js'
import { preflightProjectWriteSet, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import type { SoundUpgradeProgress } from './upgrade-local-v2.js'

export type Opened = OpenedProject & { dir: FileSystemDirectoryHandle }

/** 弹原生选夹(readwrite);用户取消 → null。 */
export async function pickDir(): Promise<FileSystemDirectoryHandle | null> {
  const availability = currentDirectoryPickerAvailability()
  if (!availability.available) throw new Error(availability.message)
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/** 目录句柄 → 装配 Opened + 记入 IndexedDB(最近工程 / 重连)。 */
export async function finishOpen(
  dir: FileSystemDirectoryHandle,
  onSoundUpgradeProgress?: (progress: SoundUpgradeProgress) => void,
): Promise<Opened> {
  const opened = await openLocalProject(
    dir,
    onSoundUpgradeProgress ? { onSoundUpgradeProgress } : {},
  )
  await saveHandle(opened.project.manifest.id, dir.name, dir)
  return { ...opened, dir }
}

/** 打开已有本地工程。取消 → null。 */
export async function openExistingProject(
  onSoundUpgradeProgress?: (progress: SoundUpgradeProgress) => void,
): Promise<Opened | null> {
  const dir = await pickDir()
  return dir ? finishOpen(dir, onSoundUpgradeProgress) : null
}

/** 新建空白工程(选空夹 → 写骨架 → 打开)。取消 → null。 */
export async function newBlankProject(): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  await writeProject(dir, await buildBlankProject(dir.name))
  return finishOpen(dir)
}

/** 从 pal 克隆(选空夹 → 流式下载 207MB → 打开)。取消 → null。onProgress 驱动进度条。 */
export async function newFromPal(
  seedBaseUrl: string,
  onProgress: (done: number, total: number) => void,
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  await cloneFromPal(httpSource(seedBaseUrl), dir, onProgress)
  return finishOpen(dir)
}

/**
 * 另存为:先在原始点击手势内选目标夹，再异步组装当前工程文件集并写入。
 * File System Access 要求 transient user activation，不能先 await 序列化再弹 picker。
 */
export async function saveProjectAs(
  buildFiles: () => Promise<Record<string, unknown>>,
  srcDir?: FileSystemDirectoryHandle,
  removePaths: readonly string[] = [],
): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  const files = await buildFiles()
  await preflightProjectWriteSet(files)
  // A5 债修:先整树拷贝源目录(磁盘素材不在编辑器 state,不拷即丢 —— 克隆工程 200MB assets
  // 曾被另存为静默丢掉),再 writeProject 覆写内容文件(当前编辑赢)。选同一目录跳过拷贝。
  if (srcDir && !(await dir.isSameEntry(srcDir))) await copyDirRecursive(srcDir, dir)
  await writeProject(dir, files, { removePaths })
  return finishOpen(dir)
}
