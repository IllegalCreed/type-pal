/** Node and canvas ports needed by editor fixtures under the browser TypeScript configuration. */

declare module 'node:module' {
  export interface NodeTestPortMap {
    'node:buffer': {
      Buffer: {
        from(data: ArrayBuffer | Uint8Array): Uint8Array
        from(data: string, encoding?: string): Uint8Array
      }
      Blob: typeof Blob
    }
    'node:crypto': { webcrypto: Crypto }
    'node:fs/promises': { readFile(path: string): Promise<Uint8Array> }
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
  ): <K extends keyof NodeTestPortMap>(id: K) => NodeTestPortMap[K]
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...paths: string[]): string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
