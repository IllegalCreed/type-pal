/**
 * TEST-FOUNDATION-COVERAGE-1 A组 test-only fixture：MKF 容器构造器 + YJ2 固定向量。
 * 只放数据/薄构造器，不含产品算法，不被生产导入。
 *
 * YJ2 向量推导依据（yj2.ts 文档合同 :12-20,不含解码算法本体）：
 * - 初始树结构：叶 0..0x140、内部 0x141..0x27F、根 0x280；parent(i)=0x141+(i>>1)，
 *   节点为其父右子当且仅当 i 为奇数（:14-15 "node[0x141].left=0,right=1;ptr步进1,i步进2"）。
 * - 字面 symbol 0..0xFF 顺序输出；回引 0x100..0x140 长度=val-0xFD(3..67)，
 *   out[dst]=out[dst-pos-1+j] 顺序复制（重叠生效）；pos==0xFFF 提前结束，余量保持零初始化。
 * 向量由上述文档结构一次性导出后固定嵌入；期望值全部来自符号语义，非解码器回算。
 */

/** 构造 MKF 容器：N 个 chunk → 头 N+1 个 u32 LE 偏移 + chunk 顺序拼接。 */
export function mkMkf(chunks: ReadonlyArray<Uint8Array>): Uint8Array {
  const headerBytes = (chunks.length + 1) * 4
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(headerBytes + total)
  const view = new DataView(out.buffer)
  let cursor = headerBytes
  chunks.forEach((chunk, i) => {
    view.setUint32(i * 4, cursor, true)
    out.set(chunk, cursor)
    cursor += chunk.byteLength
  })
  view.setUint32(chunks.length * 4, cursor, true)
  return out
}

/** 三字面 [0x06,0xAA,0xBB]（uncompLen=3）。 */
export const YJ2_THREE_LITERALS = Uint8Array.from([
  0x03, 0x00, 0x00, 0x00, 0x43, 0x28, 0x38, 0x01,
])

/** 字面 ABC + 回引(pos=2,len=4)：out = ABC + out[0+j] = ABCABCA（重叠复制语义）。 */
export const YJ2_BACKREF_OVERLAP = Uint8Array.from([
  0x07, 0x00, 0x00, 0x00, 0xfb, 0x0f, 0x1c, 0xf4, 0xbf, 0x00,
])

/** 字面 A + EOS(pos=0xFFF)，uncompLen=5 → [0x41,0,0,0,0]（提前结束余量为零）。 */
export const YJ2_EARLY_EOS = Uint8Array.from([0x05, 0x00, 0x00, 0x00, 0xfb, 0xfd, 0x00, 0x7e])

/** RNG 帧增量 payload：解压为 [0x06,0xAA,0xBB]（写 1 对 literal）。 */
export const YJ2_RNG_PAIR = Uint8Array.from([
  0x03, 0x00, 0x00, 0x00, 0x43, 0x28, 0x38, 0x01,
])

/** RNG 帧增量 payload：解压为 [0x02,0x06,0xCC,0xDD]（skip 2 后写 1 对）。 */
export const YJ2_RNG_SKIP_THEN_PAIR = Uint8Array.from([
  0x04, 0x00, 0x00, 0x00, 0x03, 0x86, 0x48, 0x69, 0x03,
])
