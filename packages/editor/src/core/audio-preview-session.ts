/**
 * 编辑器试听的单一 owner 协调器。
 *
 * transport 仍由各领域的既有 MIDI/WAV factory 创建；这里仅负责在新的试听开始前停止旧 owner，
 * 防止项目设置、资源工作台或相邻资源行同时发声。owner 自己负责销毁 transport。
 */
export interface EditorAudioPreviewOwner {
  stop(): void
}

let activeOwner: EditorAudioPreviewOwner | undefined

export function claimEditorAudioPreview(owner: EditorAudioPreviewOwner): void {
  if (activeOwner === owner) return
  const previous = activeOwner
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
