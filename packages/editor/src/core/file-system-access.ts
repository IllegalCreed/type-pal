export type DirectoryPickerAvailability =
  | { available: true }
  | {
      available: false
      reason: 'insecure-context' | 'unsupported-browser'
      message: string
    }

export interface DirectoryPickerEnvironment {
  isSecureContext: boolean
  hasDirectoryPicker: boolean
  origin: string
}

function localhostOrigin(origin: string): string {
  try {
    const url = new URL(origin)
    return `http://localhost${url.port ? `:${url.port}` : ''}`
  } catch {
    return 'http://localhost'
  }
}

/**
 * File System Access 的可用性不等于“是不是 Chrome”。
 * Chrome 会在 http://局域网IP 这种非安全上下文里直接隐藏 picker API，必须先区分来源安全性。
 */
export function classifyDirectoryPicker(
  environment: DirectoryPickerEnvironment,
): DirectoryPickerAvailability {
  if (!environment.isSecureContext) {
    return {
      available: false,
      reason: 'insecure-context',
      message:
        `当前地址 ${environment.origin} 不是安全上下文，Chrome 已禁用文件夹读写。` +
        '请先用项目的 `pnpm --filter @type-pal/editor run dev:lan` 启动 HTTPS（默认端口 6010），' +
        '再访问终端输出的 HTTPS 地址，' +
        `或在运行编辑器的电脑上打开 ${localhostOrigin(environment.origin)}。` +
        '切换地址后需要重新选择一次项目文件夹。',
    }
  }
  if (!environment.hasDirectoryPicker) {
    return {
      available: false,
      reason: 'unsupported-browser',
      message: '当前浏览器不支持文件夹读写，请使用桌面版 Chrome 或 Edge。',
    }
  }
  return { available: true }
}

export function currentDirectoryPickerAvailability(): DirectoryPickerAvailability {
  return classifyDirectoryPicker({
    isSecureContext: window.isSecureContext,
    hasDirectoryPicker: typeof window.showDirectoryPicker === 'function',
    origin: window.location.origin,
  })
}
