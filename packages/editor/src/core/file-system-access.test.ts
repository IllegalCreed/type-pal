import { describe, expect, it } from 'vitest'
import { classifyDirectoryPicker } from './file-system-access.js'

describe('File System Access 来源能力', () => {
  it('安全上下文且有 directory picker 时可用', () => {
    expect(
      classifyDirectoryPicker({
        isSecureContext: true,
        hasDirectoryPicker: true,
        origin: 'https://192.168.1.20:6010',
      }),
    ).toEqual({ available: true })
  })

  it('HTTP 局域网 IP 优先报告安全上下文问题，而不是误报浏览器不支持', () => {
    const availability = classifyDirectoryPicker({
      isSecureContext: false,
      hasDirectoryPicker: false,
      origin: 'http://192.168.1.20:6010',
    })

    expect(availability).toMatchObject({
      available: false,
      reason: 'insecure-context',
    })
    if (!availability.available) {
      expect(availability.message).toContain('HTTPS')
      expect(availability.message).toContain('run dev:lan')
      expect(availability.message).toContain('默认端口 6010')
      expect(availability.message).toContain('http://localhost:6010')
      expect(availability.message).toContain('重新选择一次工程文件夹')
    }
  })

  it('安全上下文缺少 picker 时才报告浏览器不支持', () => {
    expect(
      classifyDirectoryPicker({
        isSecureContext: true,
        hasDirectoryPicker: false,
        origin: 'https://editor.example.test',
      }),
    ).toEqual({
      available: false,
      reason: 'unsupported-browser',
      message: '当前浏览器不支持文件夹读写，请使用桌面版 Chrome 或 Edge。',
    })
  })
})
