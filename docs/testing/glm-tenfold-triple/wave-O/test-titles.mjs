/** Wave O 共享源码解析：describe/test 结构与断言语句提取。
 *  tokenizer 规则：跳过 '…'、"…"、`…` 与 //…、块注释；括号深度跨行跟踪——
 *  修复旧生成器按行扫描导致的空参与截断 oracle。
 *  结构：先定位所有 describe/test 调用（标题 + 箭头函数体区间），
 *  再按体区间包含关系组装 fullName（describe 栈），不依赖易碎的顺序状态机。
 */

const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

/** 返回 source 中全部注释/字符串/模板区间的屏蔽副本（非代码字节替换为空格，保留换行）。 */
function maskNonCode(source) {
  const out = source.split('')
  let i = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    if (c === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') out[i++] = ' '
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      out[i++] = ' '
      out[i++] = ' '
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] !== '\n') out[i] = ' '
        i++
      }
      if (i < n) {
        out[i++] = ' '
        if (i < n) out[i++] = ' '
      }
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      out[i++] = ' '
      while (i < n) {
        if (source[i] === '\\') {
          out[i++] = ' '
          if (i < n) out[i++] = ' '
          continue
        }
        if (source[i] === quote) {
          out[i++] = ' '
          break
        }
        if (source[i] !== '\n') out[i] = ' '
        i++
      }
      continue
    }
    i++
  }
  return out.join('')
}

const lineAt = (source, index) => source.slice(0, index).split('\n').length

/** 读出 index 处引号串的字面内容（不跨行）；index 必须落在引号上。 */
function readQuoted(source, index) {
  const quote = source[index]
  let i = index + 1
  let out = ''
  while (i < source.length) {
    const c = source[i]
    if (c === '\\') {
      out += c + (source[i + 1] ?? '')
      i += 2
      continue
    }
    if (c === quote) return { text: out, end: i + 1 }
    if (c === '\n') return null
    out += c
    i++
  }
  return null
}

/** 自 braceStart（'{' 处）扫描到配对 '}' 的 index（不含）。masked 用于跳过字符串/注释。 */
function matchBrace(masked, braceStart) {
  let depth = 0
  for (let i = braceStart; i < masked.length; i++) {
    if (masked[i] === '{') depth++
    else if (masked[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** 解析全部 test() 调用：[{ title, fullName, bodyStart, bodyEnd, startLine }]。 */
export function parseTestTitles(source) {
  const masked = maskNonCode(source)
  const describes = []
  const tests = []
  for (let i = 0; i < masked.length - 5; i++) {
    const before = i === 0 ? '' : masked[i - 1]
    if (before && !/[\s{;,(=]/.test(before)) continue
    const isDescribe = masked.startsWith('describe(', i)
    const isIt = masked.startsWith('it(', i)
    const isTest = masked.startsWith('test(', i) || isIt
    if (!isDescribe && !isTest) continue
    // O-NEXT-01：it( 只有 3 字符，test( 5、describe( 9——此前统一按 5 推进，
    // it( 的标题起点被跳进字符串内部两位，导致真实 it 合同解析为 0。
    let p = i + (isDescribe ? 9 : isIt ? 3 : 5)
    // 空白跳过必须在原文上进行（masked 中标题串本身已被抹成空白）；
    // 再用 masked[p]===' ' 校验该引号确为字符串起点而非代码标识符。
    while (p < source.length && isWs(source[p])) p++
    const quote = source[p]
    if ((quote !== "'" && quote !== '"') || masked[p] !== ' ') continue
    const str = readQuoted(source, p)
    if (!str) continue
    const title = str.text
    // 找标题后的箭头函数体：跳过 , () 等参数区直到 '=>'（空参箭头的 ')' 不是终点）
    let q = str.end
    let arrowAt = -1
    while (q < masked.length && q - str.end < 200) {
      if (masked[q] === '=' && masked[q + 1] === '>') {
        arrowAt = q
        break
      }
      if (masked[q] === ';') break
      q++
    }
    if (arrowAt < 0) continue
    let b = arrowAt + 2
    while (b < masked.length && isWs(masked[b])) b++
    if (masked[b] !== '{') continue
    const bodyEnd = matchBrace(masked, b)
    if (bodyEnd < 0) continue
    const entry = { title, bodyStart: b, bodyEnd, startLine: lineAt(source, i) }
    ;(isDescribe ? describes : tests).push(entry)
  }
  for (const t of tests) {
    const stack = describes
      .filter((d) => d.bodyStart < t.bodyStart && d.bodyEnd > t.bodyEnd)
      .sort((a, b) => a.bodyStart - b.bodyStart)
    t.fullName = [...stack.map((d) => d.title), t.title].join(' ')
  }
  return tests
}

const ASSERT_WORDS = ['expect', 'fails', 'ok']

/** 提取 [bodyStart, bodyEnd) 内全部断言语句（跨行、字符串/注释感知）。
 *  返回 [{ text, startLine }]，text 为压缩空白后的完整语句（含 matcher 与预期值）。 */
export function extractAssertions(source, bodyStart, bodyEnd) {
  const masked = maskNonCode(source)
  const out = []
  let i = bodyStart
  while (i < bodyEnd) {
    const before = i === bodyStart ? '' : masked[i - 1]
    const atWordStart = !before || /[\s{;(,=&|?:]/.test(before)
    if (!atWordStart) {
      i++
      continue
    }
    let matched = null
    for (const w of ASSERT_WORDS) {
      if (masked.startsWith(w, i) && /[\s(]/.test(masked[i + w.length] ?? '')) {
        matched = w
        break
      }
    }
    if (!matched) {
      i++
      continue
    }
    // 语句终点 = 深度 0 处的 ';'（分号风格）或换行（本仓 Biome 无分号风格；
    // 跨行表达式必在括号/花括号内保持 depth>0，深度 0 换行即语句完结）
    let depth = 0
    let j = i
    let end = -1
    while (j < bodyEnd) {
      const c = masked[j]
      if (c === '(' || c === '[' || c === '{') depth++
      else if (c === ')' || c === ']' || c === '}') {
        depth--
        if (depth < 0) break // 语句越过 body（异常，截在 body 边界）
      } else if (depth === 0 && (c === ';' || c === '\n')) {
        end = j
        break
      }
      j++
    }
    if (end < 0) end = Math.min(j, bodyEnd)
    const text = source.slice(i, end).replace(/\s+/g, ' ').trim()
    out.push({ text, startLine: lineAt(source, i) })
    i = end + 1
  }
  return out
}
