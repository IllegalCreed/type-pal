/**
 * YJ2 解压 —— 1998 Win9x 版(Win95/98)所用的 MKF 子文件压缩格式。
 * 算法 = 适配 Huffman 编码 + LZSS 回引。每解一个 symbol 后调整树权重。
 *
 * 1:1 port 自 reference/sdlpal/yj1.c::YJ2_Decompress(Win9x 版走 YJ2_Decompress,
 * 见 global.c:202 `Decompress = gConfig.fIsWIN95 ? YJ2_Decompress : YJ1_Decompress`)。
 *
 * 文件头:
 *   u32 LE  UncompressedLength
 *   接下来直接是位流(YJ2 无 magic;调用者按 MKF 文件类型决定是否解压)。
 *
 * 树结构(原 C 中是指针,这里全部用节点数组下标):
 *   节点 0..0x140  = 叶子(可能的 symbol 值 0..0x140);weight=1 初始
 *   节点 0x141..0x280 = 内部节点;node[0x141].left=0,right=1;ptr 步进 1,i 步进 2
 *   节点 0x280 是根,parent 指向自己
 *
 * Symbol 含义:
 *   0..0xFF   → 字面字节
 *   0x100..0x140 → LZSS 回引,长度 = val - 0xFD(3..67)
 *   pos == 0xFFF → 流结束
 */

// 0x100 字节查表(原 C: yj2_data1)。LZSS offset 高位
// biome-ignore format: 16-column table mirrors sdlpal yj1.c
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

/**
 * 树节点 —— 全部存在数组里,parent/left/right 是数组下标。
 * value 是 symbol 值;weight 用于自适应平衡。
 */
interface Tree {
  /** 641 个节点 */
  node: { weight: number; value: number; parent: number; left: number; right: number }[]
  /** 321 个 list 项:list[v] 指向值为 v 的叶子节点下标(只对 v ≤ 0x140 有效) */
  list: number[]
}

function buildTree(): Tree {
  const node: Tree['node'] = new Array(641)
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

  // 内部节点:i 从 0 步进 2,ptr 从 0x141 步进 1
  for (let i = 0, ptr = 0x141; ptr <= 0x280; i += 2, ptr++) {
    node[ptr]!.left = i
    node[ptr]!.right = i + 1
    node[i]!.parent = ptr
    node[i + 1]!.parent = ptr
    node[ptr]!.weight = node[i]!.weight + node[i + 1]!.weight
  }
  return { node, list }
}

/**
 * 读 1 bit。pos 是从 src 起始算的位偏移(低位先)。
 */
function bt(src: Uint8Array, srcOffset: number, pos: number): number {
  return (src[srcOffset + (pos >> 3)]! & (1 << (pos & 7))) >> (pos & 7)
}

/**
 * 调整树:把刚解码到的值的叶子节点的频度 +1,并维持 weight 排序不变性
 * (节点按 weight 单调递增)。具体见 sdlpal yj1.c::yj2_adjust_tree。
 */
function adjustTree(tree: Tree, value: number): void {
  let nodeIdx = tree.list[value]!
  while (tree.node[nodeIdx]!.value !== 0x280) {
    // 找当前 weight 段中下标最大的节点
    let tempIdx = nodeIdx + 1
    while (tempIdx < tree.node.length && tree.node[tempIdx]!.weight === tree.node[nodeIdx]!.weight) {
      tempIdx++
    }
    tempIdx--
    if (tempIdx !== nodeIdx) {
      // 与 temp 互换:先交换 parent 指针 + 修父链 + 修 list,然后值互换
      const tmp1 = tree.node[nodeIdx]!.parent
      tree.node[nodeIdx]!.parent = tree.node[tempIdx]!.parent
      tree.node[tempIdx]!.parent = tmp1

      if (tree.node[nodeIdx]!.value > 0x140) {
        // node 是内部节点:它的两个子的 parent 指向 temp
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
      // 节点值互换(C 端 `tmp = *node; *node = *temp; *temp = tmp;`)
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

export function decompressYj2(src: Uint8Array): Uint8Array {
  if (src.byteLength < 4) throw new Error('YJ2: source too small')
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength)
  const uncompLen = view.getUint32(0, true)
  const out = new Uint8Array(uncompLen)
  let dst = 0
  let ptr = 0 // bit position in src starting at offset 4
  const srcStart = 4 // 流头后的位流起点
  const tree = buildTree()

  while (true) {
    // Huffman 解码:从根(0x280)往下走,直到叶子(value ≤ 0x140)
    let nodeIdx = 0x280
    while (tree.node[nodeIdx]!.value > 0x140) {
      if (bt(src, srcStart, ptr)) {
        nodeIdx = tree.node[nodeIdx]!.right
      } else {
        nodeIdx = tree.node[nodeIdx]!.left
      }
      ptr++
    }
    const val = tree.node[nodeIdx]!.value

    // 树满了 → 归约权重防止溢出
    if (tree.node[0x280]!.weight === 0x8000) {
      for (let i = 0; i < 0x141; i++) {
        if (tree.node[tree.list[i]!]!.weight & 0x1) {
          adjustTree(tree, i)
        }
      }
      for (let i = 0; i <= 0x280; i++) {
        tree.node[i]!.weight >>= 1
      }
    }
    adjustTree(tree, val)

    if (val > 0xff) {
      // LZSS 回引
      let temp = 0
      let i = 0
      for (; i < 8; i++, ptr++) {
        temp |= bt(src, srcStart, ptr) << i
      }
      const tmp = temp & 0xff
      for (; i < YJ2_DATA2[tmp & 0xf]! + 6; i++, ptr++) {
        temp |= bt(src, srcStart, ptr) << i
      }
      temp >>>= YJ2_DATA2[tmp & 0xf]!
      const pos = (temp & 0x3f) | (YJ2_DATA1[tmp]! << 6)
      if (pos === 0xfff) break

      const preStart = dst - pos - 1
      const len = val - 0xfd
      for (let j = 0; j < len; j++) {
        out[dst] = out[preStart + j]!
        dst++
      }
    } else {
      // 字面字节
      out[dst++] = val
    }
  }

  return out
}
