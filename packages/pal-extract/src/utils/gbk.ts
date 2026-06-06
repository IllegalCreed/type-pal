import iconv from 'iconv-lite'

/**
 * GBK 字节流 → UTF-8 字符串。原版数据中的对话 / 物品名 / 人名都是 GBK。
 * 遇 0x00 截断 —— 与 sdlpal text.c 的 C 字符串语义一致。
 *
 * ⚠ 本作 M.MSG 是繁体 BIG5 原版**不彻底简体化**的产物:正文转成了 GBK 简体,但残留三类没转干净
 *   的内容,纯 GBK 解码会把它们落到 Unicode 私用区(PUA, U+E000-U+F8FF)——下游字库(Unifont)无此
 *   码点 → 渲染成空心方块。三类残留(全 46 处,2026-06-06 byte-level 核验):
 *     1. 繁体字残留:GBK 造字区 AE/AF/FE 行自定义码位(AFBA=裡 AFAB=並 AEF0=係 AEB5=過 …)
 *     2. BIG5 标点:A140-A14A(A141=，A143=。A149=！…)— GBK 该区是造字区,iconv→PUA
 *     3. 整条未转码的 BIG5 台词("芬袍ぃì"实为 BIG5"煉蠱的材料不足";"瑈猐"实为"流氓乙")
 *   sdlpal 跑本作时这些位置同样是空白:它检测 codepage=GBK(global.c PAL_DetectCodePage),其
 *   cptbl_gbk(codepage.h)把这些字节也线性映射到 PUA,而 fontglyph_cn.h 的 PUA 区字形全 0 → 空白。
 *   故本函数据 BIG5 标准 + 用户逐字剧情判断把残留还原成正字,是对齐繁体原版本意(超越 sdlpal 丢字)。
 */
export function decodeGbk(bytes: Uint8Array): string {
  let end = bytes.indexOf(0)
  if (end < 0) end = bytes.length
  const s = iconv.decode(Buffer.from(bytes.buffer, bytes.byteOffset, end), 'gbk')
  return fixupTranscodeResidue(s)
}

// 转码残留全部落在 PUA;正常 GBK 简体文本解码后**无** PUA(已对全 46 处逐一核验) → 可作干净信号。
const PUA_LO = 0xe000
const PUA_HI = 0xf8ff

/**
 * 整条未转码 BIG5 台词 → 正确简体(4 条)。这些条 GBK 解码后多数字节落在 GBK 合法区,被误读成
 * 生僻字(瑈猐 / 芬袍)而非 PUA,无法靠 PUA 密度自动识别 → 按精确原串匹配。
 * 原串码点用数组写(避免源码内不可见 PUA 字符);由 GBK 解码确定且稳定。BIG5 重解结果见注释。
 */
const FULL_LINE_FIXUP = new Map<string, string>(
  ([
    [[0xe16c, 0xe4cf], '哼！'], //                                  BIG5「哼！」
    [[0xe4ca, 0x7448, 0x7310, 0xe5e7], '流氓乙'], //                BIG5「．流氓乙」(去前导．,敌名)
    [[0xe4ca, 0x7448, 0x7310, 0x30d2], '流氓甲'], //                BIG5「．流氓甲」
    [[0x82ac, 0x888d, 0xe019, 0xe7b4, 0xe19d, 0x3043, 0xec], '炼蛊的材料不足'], // BIG5「煉蠱的材料不足」
  ] as [number[], string][]).map(([cps, v]) => [String.fromCodePoint(...cps), v]),
)

/**
 * GBK 主体条里的个别残留 PUA → 正字。空串 = 删(对齐 sdlpal 缺字空白)。
 */
const PUA_CHAR_FIXUP: Record<number, string> = {
  // ── 繁体字残留(GBK 造字区自定义码位 → 简体,用户 2026-06-06 逐条确认) ──
  0xe1ef: '里', // AFBA 婶婶房◆传来声音 / 哪◆ / 手◆
  0xe1e0: '并', // AFAB 违者尽废武功◆逐出师门
  0xe1c7: '系', // AEF0 花多少钱都没关◆
  0xe18c: '过', // AEB5 不◆,我向来只保护女的
  0xe179: '板', // AEA2 方老◆
  0xe1e2: '采', // AFAD 妾身再去◆
  0xe1a1: '困', // AECA 我觉得好◆、想睡觉
  0xe1f1: '啰', // AFBC 句末语气(去◆ / 钱◆ / 施法◆)
  // ── BIG5 标点 A140-A14A(GBK 造字区 → BIG5 标准,线性 A140+n → U+E4C6+n) ──
  0xe4c6: '　', // A140 全角空格
  0xe4c7: '，', // A141 刃部锋利◆背部厚重
  0xe4c8: '、', // A142
  0xe4c9: '。', // A143 使死者复活◆
  0xe4ca: '．', // A144 (兜底;整条"流氓"已走 FULL_LINE_FIXUP)
  0xe4cc: '；', // A146
  0xe4cd: '：', // A147
  0xe4ce: '？', // A148
  0xe4cf: '！', // A149
  // ── 颜文字 / 噪声 → 删(用户确认 / 数据判定) ──
  0xe010: '', // AAB1 玩◆(颜文字)
  0xe790: '', // A6DC 讲话◆(颜文字)
  0xe16d: '', // ADF4 哥哥◆◆(颜文字)
  0xe47e: '', // FEB7 我也决◆不会离开他(BIG5 是罕见字 𤴓,噪声)
}

/**
 * 把转码残留 PUA 还原成正字。无 PUA → 原样快速返回(绝大多数正常文本走这条,零开销)。
 * 整条未转码 BIG5 命中 FULL_LINE_FIXUP → 整条替换;否则逐 PUA 查 PUA_CHAR_FIXUP,未知 PUA 删(空白)。
 */
export function fixupTranscodeResidue(s: string): string {
  let hasPua = false
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= PUA_LO && c <= PUA_HI) {
      hasPua = true
      break
    }
  }
  if (!hasPua) return s

  const full = FULL_LINE_FIXUP.get(s)
  if (full !== undefined) return full

  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    out += cp >= PUA_LO && cp <= PUA_HI ? (PUA_CHAR_FIXUP[cp] ?? '') : ch
  }
  return out
}
