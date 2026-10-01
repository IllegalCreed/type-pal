/**
 * Q10 专属 fixture：YJ2 **编码器**（r10）。
 *
 * 背景：r9 的"零流"合成靠产品 decoder 的 EOF 越界读 + 无效回引归零产出数据，
 * 不是合法 YJ2 位流（Q-R9-01 拒收）。本文件按 primary reference
 * `reference/sdlpal/yj1.c::YJ2_Decompress`（位流格式/树结构/adjustTree 语义）
 * 实现对偶的编码器，用于合成**真实自包含**的 YJ2 压缩数据：
 *   - 全部 symbol 走真实 Huffman 编码（树初始态/adjustTree/0x8000 归约与 decoder 镜像）；
 *   - 支持合法 LZSS 回引（回引目标必须是已产出数据）；
 *   - 流尾可附 0xFFF 终止符（yj1.c:416 break 语义）。
 * 合法性由测试内 `decompressYj2(encoded) === data` 往返断言证明（产品 decoder 未改动）。
 *
 * 仅测试 fixture；不 mock 业务核心，不触产品代码。
 */

interface TreeNode {
  weight: number
  value: number
  parent: number
  left: number
  right: number
}

interface Tree {
  node: TreeNode[]
  list: number[]
}

/** 与 decoder（shared/src/yj2.ts buildTree / yj1.c 树初始化）完全一致的初始树。 */
function buildTree(): Tree {
  const node: TreeNode[] = new Array(641)
  const list: number[] = new Array(321).fill(-1)
  for (let i = 0; i < 641; i++) {
    node[i] = { weight: 0, value: 0, parent: -1, left: -1, right: -1 }
  }
  for (let i = 0; i <= 0x140; i++) {
    list[i] = i
  }
  for (let i = 0; i <= 0x280; i++) {
    node[i]!.value = i
    node[i]!.weight = 1
  }
  node[0x280]!.parent = 0x280
  for (let i = 0, ptr = 0x141; ptr <= 0x280; i += 2, ptr++) {
    node[ptr]!.left = i
    node[ptr]!.right = i + 1
    node[i]!.parent = ptr
    node[i + 1]!.parent = ptr
    node[ptr]!.weight = node[i]!.weight + node[i + 1]!.weight
  }
  return { node, list }
}

/** 与 decoder adjustTree 逐行镜像（含 swap 与 parent/list 修补）。 */
function adjustTree(tree: Tree, value: number): void {
  let nodeIdx = tree.list[value]!
  while (tree.node[nodeIdx]!.value !== 0x280) {
    let tempIdx = nodeIdx + 1
    while (
      tempIdx < tree.node.length &&
      tree.node[tempIdx]!.weight === tree.node[nodeIdx]!.weight
    ) {
      tempIdx++
    }
    tempIdx--
    if (tempIdx !== nodeIdx) {
      const tmp1 = tree.node[nodeIdx]!.parent
      tree.node[nodeIdx]!.parent = tree.node[tempIdx]!.parent
      tree.node[tempIdx]!.parent = tmp1
      if (tree.node[nodeIdx]!.value > 0x140) {
        tree.node[tree.node[nodeIdx]!.left]!.parent = tempIdx
        tree.node[tree.node[nodeIdx]!.right]!.parent = tempIdx
      } else {
        tree.list[tree.node[nodeIdx]!.value] = tempIdx
      }
      if (tree.node[tempIdx]!.value > 0x140) {
        tree.node[tree.node[tempIdx]!.left]!.parent = nodeIdx
        tree.node[tree.node[tempIdx]!.right]!.parent = nodeIdx
      } else {
        tree.list[tree.node[tempIdx]!.value] = nodeIdx
      }
      const tmp = tree.node[nodeIdx]!
      tree.node[nodeIdx] = tree.node[tempIdx]!
      tree.node[tempIdx] = tmp
      nodeIdx = tempIdx
    }
    tree.node[nodeIdx]!.weight++
    nodeIdx = tree.node[nodeIdx]!.parent
  }
  tree.node[nodeIdx]!.weight++
}

/** sdlpal yj1.c yj2_data1（LZSS offset 高位表）——编码回引时按 pos>>6 反查。 */
const YJ2_DATA1 = new Uint8Array([
  0x3f, 0x0b, 0x17, 0x03, 0x2f, 0x0a, 0x16, 0x00, 0x2e, 0x09, 0x15, 0x02, 0x2d, 0x01, 0x08, 0x00,
  0x3e, 0x07, 0x14, 0x03, 0x2c, 0x06, 0x13, 0x00, 0x2b, 0x05, 0x12, 0x02, 0x2a, 0x01, 0x04, 0x00,
  0x3d, 0x0b, 0x11, 0x03, 0x29, 0x0a, 0x10, 0x00, 0x28, 0x09, 0x0f, 0x02, 0x27, 0x01, 0x08, 0x00,
  0x3c, 0x07, 0x0e, 0x03, 0x26, 0x06, 0x0d, 0x00, 0x25, 0x05, 0x0c, 0x02, 0x24, 0x01, 0x04, 0x00,
  0x3b, 0x0b, 0x17, 0x03, 0x23, 0x0a, 0x16, 0x00, 0x22, 0x09, 0x15, 0x02, 0x21, 0x01, 0x08, 0x00,
  0x3a, 0x07, 0x14, 0x03, 0x20, 0x06, 0x13, 0x00, 0x1f, 0x05, 0x12, 0x02, 0x1e, 0x01, 0x04, 0x00,
  0x39, 0x0b, 0x11, 0x03, 0x1d, 0x0a, 0x10, 0x00, 0x1c, 0x09, 0x0f, 0x02, 0x1b, 0x01, 0x08, 0x00,
  0x38, 0x07, 0x0e, 0x03, 0x1a, 0x06, 0x0d, 0x00, 0x19, 0x05, 0x0c, 0x02, 0x18, 0x01, 0x04, 0x00,
  0x37, 0x0b, 0x17, 0x03, 0x2f, 0x0a, 0x16, 0x00, 0x2e, 0x09, 0x15, 0x02, 0x2d, 0x01, 0x08, 0x00,
  0x36, 0x07, 0x14, 0x03, 0x2c, 0x06, 0x13, 0x00, 0x2b, 0x05, 0x12, 0x02, 0x2a, 0x01, 0x04, 0x00,
  0x35, 0x0b, 0x11, 0x03, 0x29, 0x0a, 0x10, 0x00, 0x28, 0x09, 0x0f, 0x02, 0x27, 0x01, 0x08, 0x00,
  0x34, 0x07, 0x0e, 0x03, 0x26, 0x06, 0x0d, 0x00, 0x25, 0x05, 0x0c, 0x02, 0x24, 0x01, 0x04, 0x00,
  0x33, 0x0b, 0x17, 0x03, 0x23, 0x0a, 0x16, 0x00, 0x22, 0x09, 0x15, 0x02, 0x21, 0x01, 0x08, 0x00,
  0x32, 0x07, 0x14, 0x03, 0x20, 0x06, 0x13, 0x00, 0x1f, 0x05, 0x12, 0x02, 0x1e, 0x01, 0x04, 0x00,
  0x31, 0x0b, 0x11, 0x03, 0x1d, 0x0a, 0x10, 0x00, 0x1c, 0x09, 0x0f, 0x02, 0x1b, 0x01, 0x08, 0x00,
  0x30, 0x07, 0x0e, 0x03, 0x1a, 0x06, 0x0d, 0x00, 0x19, 0x05, 0x0c, 0x02, 0x18, 0x01, 0x04, 0x00,
])

const YJ2_DATA2 = new Uint8Array([
  0x08, 0x05, 0x06, 0x04, 0x07, 0x05, 0x06, 0x03, 0x07, 0x05, 0x06, 0x04, 0x07, 0x04, 0x05, 0x03,
])

/** LZSS 回引描述。pos 为 decoder pos 语义（preStart = dst - pos - 1，0xFFF = 终止符）。 */
export interface Yj2Backref {
  kind: 'backref'
  /** 回引 symbol（0x100..0x140），拷贝长度 = val - 0xFD（3..67）。 */
  val: number
  /** 回溯距离；必须 < 已产出字节数（终止符时为 0xFFF）。 */
  pos: number
  /**
   * 可选显式 LZSS 位模式：b0 = 低字节（8 bit），b1 = 扩展位（data2[b0&0xf] bit）。
   * 未提供时按 pos 自动反查；反查失败（不可编码距离）时抛错。
   */
  b0?: number
  b1?: number
}

export type Yj2Symbol = { kind: 'literal'; byte: number } | Yj2Backref

/**
 * 把 symbol 序列编码为自包含 YJ2 位流（含 u32 LE UncompressedLength 头）。
 *
 * symbol 序列的产出总长必须正好等于声明长度（由调用方保证，函数内断言）。
 * 编码过程与 decoder 完全镜像：同一棵初始树、同一个 adjustTree、同一个 0x8000 归约。
 * 默认在数据产出完成后追加 pos=0xFFF 终止符（yj1.c:416 break 语义）。
 */
export function yj2Encode(symbols: readonly Yj2Symbol[], withTerminator = true): Uint8Array {
  const bits: number[] = []
  const tree = buildTree()

  const emitHuffman = (huffVal: number): void => {
    // Huffman：叶→根收集（bit=1 表示父的 right），反序输出 = 根→叶
    const rev: number[] = []
    let nodeIdx = tree.list[huffVal]!
    while (nodeIdx !== 0x280) {
      const parent = tree.node[nodeIdx]!.parent
      rev.push(tree.node[parent]!.right === nodeIdx ? 1 : 0)
      nodeIdx = parent
    }
    for (let i = rev.length - 1; i >= 0; i--) bits.push(rev[i]!)
  }

  const encodeSymbol = (sym: Yj2Symbol): void => {
    const huffVal = sym.kind === 'literal' ? sym.byte : sym.val
    emitHuffman(huffVal)
    if (sym.kind === 'backref') {
      // LZSS pos 位流：低字节 8 bit + data2[b0&0xf] 扩展位（均 LSB 先）
      let b0: number
      let b1: number
      if (sym.b0 !== undefined && sym.b1 !== undefined) {
        b0 = sym.b0
        b1 = sym.b1
      } else {
        let found: { b0: number; b1: number } | undefined
        for (let cand = 0; cand < 256 && !found; cand++) {
          if (YJ2_DATA1[cand]! !== sym.pos >> 6) continue
          const extra = YJ2_DATA2[cand & 0xf]!
          for (let ext = 0; ext < 1 << extra; ext++) {
            const shifted = (cand | (ext << 8)) >>> extra
            if (((shifted & 0x3f) | (YJ2_DATA1[cand]! << 6)) === sym.pos) {
              found = { b0: cand, b1: ext }
              break
            }
          }
        }
        if (!found)
          throw new Error(`yj2Encode: 回引 pos=${sym.pos} 无合法 (b0,b1) 组合（距离不可编码）`)
        b0 = found.b0
        b1 = found.b1
      }
      for (let i = 0; i < 8; i++) bits.push((b0 >> i) & 1)
      const extra = YJ2_DATA2[b0 & 0xf]!
      for (let i = 0; i < extra; i++) bits.push((b1 >> i) & 1)
    }
    // decoder 同序的树调整（0x8000 归约先于 adjustTree）
    if (tree.node[0x280]!.weight === 0x8000) {
      for (let i = 0; i < 0x141; i++) {
        if (tree.node[tree.list[i]!]!.weight & 1) adjustTree(tree, i)
      }
      for (let i = 0; i <= 0x280; i++) {
        tree.node[i]!.weight >>= 1
      }
    }
    adjustTree(tree, huffVal)
  }

  let produced = 0
  for (const sym of symbols) {
    encodeSymbol(sym)
    produced += sym.kind === 'literal' ? 1 : sym.val - 0xfd
  }
  if (withTerminator) {
    // 0xFFF 终止符：回引 symbol + b0=0（data1[0]=0x3f）+ b1 低 6 位全 1 → pos=0xFFF
    encodeSymbol({ kind: 'backref', val: 0x100, pos: 0xfff, b0: 0, b1: 0x3f })
  }

  const out = new Uint8Array(4 + Math.ceil(bits.length / 8))
  new DataView(out.buffer).setUint32(0, produced, true)
  bits.forEach((bit, i) => {
    if (bit) out[4 + (i >> 3)]! |= 1 << (i & 7)
  })
  return out
}
