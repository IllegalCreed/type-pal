/// <reference types="vite/client" />

// File System Access 目录选择器(TS lib.dom 尚未含)。
interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite'
    id?: string
    startIn?: FileSystemHandle | string
  }): Promise<FileSystemDirectoryHandle>
}
