/**
 * Q10 专属 fixture：YJ2 **字面量编码器**（r11，Q-R10-01 收窄）。
 *
 * 背景：r9 的"零流"合成靠产品 decoder 的 EOF 越界读 + 无效回引归零，非法（Q-R9-01 拒收）；
 * r10 按同思路实现了带通用回引的编码器，但 Codex 独立严格读流证明其 LZSS 扩展段
 * 写了 data2 位而 primary 解码实际读 data2+6 位（扩展段应为 data2-2 位）——回引后
 * 多出两位使后继 symbol 错位（literal7+回引+literal9 末字节 178 非 9）。实际 CLI
 * 只需要 literal-only 流 + 终止符（且该路径已通过严格 EOF/回引/输出边界与真尾标
 * 独立验证），故 r11 **删除未用的回引接口**（Yj2Backref/可选 b0/b1/反查 API），
 * 只保留字面量 + 0xFFF 终止符，并撤回 r10 的"回引全往返"主张。
 *
 * 按 primary `reference/sdlpal/yj1.c::YJ2_Decompress` 对偶实现：
 *   - 字面量走真实自适应 Huffman 编码（树初始态/adjustTree/0x8000 归约与 decoder 镜像）；
 *   - 流尾追加 pos=0xFFF 终止符（yj1.c:416 break 语义；b0=0→data1[0]=0x3f，
 *     扩展位按 decoder 总读位长 data2+6 精确写入）。
 * 合法性由测试内 `decompressYj2(encoded) === data` 往返断言证明（产品 decoder 未改动）。
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

/** sdlpal yj1.c yj2_data2（LZSS 扩展位宽表；终止符 b0=0 → data2[0]=8）。 */
const YJ2_DATA2 = new Uint8Array([
  0x08, 0x05, 0x06, 0x04, 0x07, 0x05, 0x06, 0x03, 0x07, 0x05, 0x06, 0x04, 0x07, 0x04, 0x05, 0x03,
])

/**
 * 把字面量字节序列编码为自包含 YJ2 位流（含 u32 LE UncompressedLength 头 + 0xFFF 终止符）。
 *
 * 编码过程与 decoder 完全镜像：同一棵初始树、同一个 adjustTree、同一个 0x8000 归约。
 * 仅支持字面量（CLI 合成输入全部走该路径）；回引编码未实现（见文件头背景说明）。
 */
export function yj2EncodeLiterals(data: Uint8Array): Uint8Array {
  const bits: number[] = []
  const tree = buildTree()

  const emit = (huffVal: number): void => {
    // Huffman：叶→根收集（bit=1 表示父的 right），反序输出 = 根→叶
    const rev: number[] = []
    let nodeIdx = tree.list[huffVal]!
    while (nodeIdx !== 0x280) {
      const parent = tree.node[nodeIdx]!.parent
      rev.push(tree.node[parent]!.right === nodeIdx ? 1 : 0)
      nodeIdx = parent
    }
    for (let i = rev.length - 1; i >= 0; i--) bits.push(rev[i]!)
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

  for (const byte of data) emit(byte)

  // 0xFFF 终止符（yj1.c:416）：回引 symbol 0x100 的 Huffman 码 + LZSS 位。
  // decoder 读法：低 8 bit（b0）→ data2[b0&0xf] → 再读 (data2[b0]+6-8) 扩展位；
  // 取 b0=0：data2[0]=8，总读 8+8=16 bit（扩展 8 bit）。temp = b0 | (ext<<8)，
  // ext 低 6 位全 1 → temp=0x3F → >>8=0 → pos = 0 | (data1[0]=0x3F << 6) = 0xFFF。
  emit(0x100)
  for (let i = 0; i < 8; i++) bits.push(0) // b0 = 0x00（LSB 先）
  const extra = YJ2_DATA2[0]! // = 8
  const ext = 0x3f // 低 6 位全 1（高位 2 位为 0）
  for (let i = 0; i < extra; i++) bits.push((ext >> i) & 1)

  const out = new Uint8Array(4 + Math.ceil(bits.length / 8))
  new DataView(out.buffer).setUint32(0, data.length, true)
  bits.forEach((bit, i) => {
    if (bit) out[4 + (i >> 3)]! |= 1 << (i & 7)
  })
  return out
}
