/**
 * 编辑器的试听入口共用一个活动 owner。各入口负责创建和释放自己的播放资源；
 * 只有当前 owner 的异步结果可以继续播放或更新界面。
 */
export interface EditorAudioPreviewOwner {
  stop(): void
}

let activeOwner: EditorAudioPreviewOwner | undefined

export function claimEditorAudioPreview(owner: EditorAudioPreviewOwner): void {
  if (activeOwner === owner) return
  const previous = activeOwner
  // 先撤销旧请求的所有权，再通知它停止；新入口在旧 stop 返回后接管。
  activeOwner = undefined
  previous?.stop()
  activeOwner = owner
}

export function releaseEditorAudioPreview(owner: EditorAudioPreviewOwner): void {
  if (activeOwner === owner) activeOwner = undefined
}

export function stopEditorAudioPreview(): void {
  const previous = activeOwner
  activeOwner = undefined
  previous?.stop()
}

export function isEditorAudioPreviewOwner(owner: EditorAudioPreviewOwner): boolean {
  return activeOwner === owner
}
