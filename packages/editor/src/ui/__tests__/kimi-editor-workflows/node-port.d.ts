/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 显式 Node 测试端口（与 vite-env.d.ts 同级的环境声明）。
 * editor tsconfig 看不到 @types/node；本文件只为本卡夹具声明实际使用面的类型，
 * 让 Node 桥接成为显式、可读、可审查的测试端口，不再依赖逐行 @ts-expect-error。
 * 刻意不声明 'node:buffer'/'node:crypto' 模块本体——既有旧测试在那两条模块上保有
 * 各自的 @ts-expect-error 桥接行，声明本体会使其失效；本卡经 createRequire 映射
 * 类型安全地取得 Blob/Buffer/webcrypto，不新建第二条通道。
 */

declare module 'node:module' {
  /** 本卡夹具实际使用的内建/硬件包类型映射；新增用途须先在这里登记类型。 */
  export interface KimiNodePortMap {
    'node:buffer': {
      Buffer: {
        from(data: ArrayBuffer | Uint8Array): Uint8Array
        from(data: string, encoding?: string): Uint8Array
      }
      Blob: typeof Blob
    }
    'node:crypto': { webcrypto: Crypto }
    canvas: {
      loadImage(source: ArrayBuffer | Uint8Array | string): Promise<{
        width: number
        height: number
        close?: () => void
      }>
      ImageData: new (
        width: number,
        height: number,
      ) => { data: Uint8ClampedArray; width: number; height: number }
    }
  }
  export function createRequire(
    filename: string,
  ): <K extends keyof KimiNodePortMap>(id: K) => KimiNodePortMap[K]
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...paths: string[]): string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
