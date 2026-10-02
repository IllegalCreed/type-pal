// O-NEXT2-R1-01：局部真实类型化 Node IO 桥。本 .mjs 在 Node 测试宿主运行，
// .d.mts 为 TS 侧提供 Uint8Array 公开签名；不新增全局 node:zlib 声明，
// 不影响旧测试的既有 @ts-expect-error，不改 tsconfig/产品。
import { deflateSync, inflateSync } from 'node:zlib'

export const bridgeDeflate = (bytes) => new Uint8Array(deflateSync(bytes))
export const bridgeInflate = (bytes) => new Uint8Array(inflateSync(bytes))
