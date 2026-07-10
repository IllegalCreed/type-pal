/**
 * 工程动作(P4)—— 启动屏与编辑器内「工程」菜单共享:新建(克隆/空白)/ 打开 / 另存为。
 * 每个动作 = 拿本地目录句柄(原生选夹,须用户手势)→ 操作 → openLocalProject 装配 → Opened。
 * 用户取消选夹 → 返回 null(调用方静默忽略)。
 */
import type { MusicDef, SceneDef } from '@type-pal/content'
import { httpSource, type LoadedProject } from '@type-pal/reforge'
import type { OwnMap } from '@type-pal/reforge'
import { cloneFromPal } from './clone.js'
import { saveHandle } from './handle-store.js'
import { openLocalProject } from './open-local.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'

export interface Opened {
  project: LoadedProject
  scenes: SceneDef[]
  music: MusicDef[]
  /** W7:own 场景引用的自有地图(finishOpen 由 openLocalProject 透传)。 */
  ownMaps: Record<string, OwnMap>
  dir: FileSystemDirectoryHandle
}

/** 弹原生选夹(readwrite);用户取消 → null。 */
export async function pickDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/** 目录句柄 → 装配 Opened + 记入 IndexedDB(最近工程 / 重连)。 */
export async function finishOpen(dir: FileSystemDirectoryHandle): Promise<Opened> {
  const opened = await openLocalProject(dir)
  await saveHandle(opened.project.manifest.id, dir.name, dir)
  return { ...opened, dir }
}

/** 打开已有本地工程。取消 → null。 */
export async function openExistingProject(): Promise<Opened | null> {
  const dir = await pickDir()
  return dir ? finishOpen(dir) : null
}

/** 新建空白工程(选空夹 → 写骨架 → 打开)。取消 → null。 */
export async function newBlankProject(): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  await writeProject(dir, buildBlankProject(dir.name))
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

/** 另存为:当前工程文件集写到新选的夹 → 打开该副本(活动目标切到副本)。取消 → null。 */
export async function saveProjectAs(files: Record<string, unknown>): Promise<Opened | null> {
  const dir = await pickDir()
  if (!dir) return null
  await writeProject(dir, files)
  return finishOpen(dir)
}
