/**
 * YJ2 测试向量派生工具（TEST-GLM-RUNTIME-RESOURCE-2 / R03 fire.ts 压缩分支）。
 *
 * 仓库只有解压器 packages/shared/src/yj2.ts（sdlpal yj1.c::YJ2_Decompress 移植）。
 * 本工具按同一份自适应树规则实现**编码侧**（树初始化 / adjustTree 与解压器逐行同构，
 * 编码 = 根→叶路径 emit，解码 = 路径走树），用于把本卡自选的 sprite-chunk 明文
 * 派生成已知输出的 YJ2 位流。派生出的向量字节硬编码进
 * packages/pal-extract/src/__tests__/glm-runtime-resource/，测试断言的是
 * sprite/PNG 语义层的手算期望，不回读解压器输出。
 *
 * 用法：node docs/testing/glm-runtime-resource-wave/tools/yj2-encode-derive.mjs
 */

function buildTree() {
  const node = new Array(641)
  const list = new Array(321).fill(-1)
  for (let i = 0; i < 641; i++) node[i] = { weight: 0, value: 0, parent: -1, left: -1, right: -1 }
  for (let i = 0; i <= 0x140; i++) list[i] = i
  for (let i = 0; i <= 0x280; i++) {
    node[i].value = i
    node[i].weight = 1
  }
  node[0x280].parent = 0x280
  for (let i = 0, ptr = 0x141; ptr <= 0x280; i += 2, ptr++) {
    node[ptr].left = i
    node[ptr].right = i + 1
    node[i].parent = ptr
    node[i + 1].parent = ptr
    node[ptr].weight = node[i].weight + node[i + 1].weight
  }
  return { node, list }
}

function adjustTree(tree, value) {
  let nodeIdx = tree.list[value]
  while (tree.node[nodeIdx].value !== 0x280) {
    let tempIdx = nodeIdx + 1
    while (tempIdx < tree.node.length && tree.node[tempIdx].weight === tree.node[nodeIdx].weight)
      tempIdx++
    tempIdx--
    if (tempIdx !== nodeIdx) {
      const tmp1 = tree.node[nodeIdx].parent
      tree.node[nodeIdx].parent = tree.node[tempIdx].parent
      tree.node[tempIdx].parent = tmp1
      if (tree.node[nodeIdx].value > 0x140) {
        tree.node[tree.node[nodeIdx].left].parent = tempIdx
        tree.node[tree.node[nodeIdx].right].parent = tempIdx
      } else {
        tree.list[tree.node[nodeIdx].value] = tempIdx
      }
      if (tree.node[tempIdx].value > 0x140) {
        tree.node[tree.node[tempIdx].left].parent = nodeIdx
        tree.node[tree.node[tempIdx].right].parent = nodeIdx
      } else {
        tree.list[tree.node[tempIdx].value] = nodeIdx
      }
      const tmp = tree.node[nodeIdx]
      tree.node[nodeIdx] = tree.node[tempIdx]
      tree.node[tempIdx] = tmp
      nodeIdx = tempIdx
    }
    tree.node[nodeIdx].weight++
    nodeIdx = tree.node[nodeIdx].parent
  }
  tree.node[nodeIdx].weight++
}

/** payload 全字面编码（本卡向量不含回引/EOS，故 DATA1/DATA2 回引表不参与）。 */
export function encodeYj2Literals(payload) {
  const tree = buildTree()
  const bits = []
  for (const v of payload) {
    if (v > 0xff) throw new Error('literal-only tool')
    // 叶子 = 当前值为 v 的节点；沿 parent 上溯收集位（right=1/left=0），根→叶序输出。
    const leaf = tree.list[v]
    while (tree.node[leaf].value > 0x140) throw new Error(`list[${v}] 不是叶子`)
    const path = []
    let cur = leaf
    while (cur !== 0x280) {
      const p = tree.node[cur].parent
      path.push(tree.node[p].right === cur ? 1 : 0)
      cur = p
    }
    path.reverse()
    bits.push(...path)
    adjustTree(tree, v)
  }
  const out = new Uint8Array(4 + Math.ceil(bits.length / 8))
  new DataView(out.buffer).setUint32(0, payload.length, true)
  bits.forEach((b, i) => {
    if (b) out[4 + (i >> 3)] |= 1 << (i & 7)
  })
  return out
}

const chunk11 = [
  0x01,
  0x00, // frameCount = 1（兼 frame0 word 偏移 = 1 → byte 2）
  0x02,
  0x00,
  0x02,
  0x00, // 2×2
  0x81, // 跳 1 透明
  0x02,
  0xaa,
  0x00, // 实心 2：0xAA、palette-0（不透明）
  0x81, // 跳 1 透明
]
const vec = encodeYj2Literals(chunk11)
console.log('payload   :', JSON.stringify(chunk11))
console.log('yj2 vector:', JSON.stringify([...vec]))
