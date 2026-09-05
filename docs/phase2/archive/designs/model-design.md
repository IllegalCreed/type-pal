> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# 对话系统结构化数据模型 · 设计

> 状态:N1-1 done（2026-07-15）；C1-2 content14 人物身份 successor 已实现并处于 review（2026-08-14）。第二阶段铁律见 [READ-FIRST.md](../../READ-FIRST.md);内容总 schema 见 [content-schema.md](content-schema.md);本次决策记录见 [decisions.md](../../decisions.md) D11。
> **承接** [visual-spec.md](../../reference/dialogue-presentation.md)(GLM 写的对话框**外观**继承清单)——本文定**数据格式**,那份定**外观真值**;两件正交的事,本文把它们在架构里安顿到一起。

## 0. 这份文档解决什么(大白话)

一句话:**把对话从「文本里塞 `~30 $10 " -` 这类控制符」改成「结构化数据 + i18n locale 文本」。**

原版/第一阶段的对话是一个**塞满控制符的扁字符串**(in-band control codes)——`~30` 表尾停顿、`$10` 表打字速度、`"` 表黄色、末尾冒号表姓名。这是 1995 DOS 引擎在格式受限下的权宜,**把"控制信息"和"文本内容"焊死在一根字符串里**。第二阶段铁律 4(架构第一)、5(杜绝下标式身份)要消除这种耦合。

本文不是把这套控制符**搬到**新引擎(那是 GLM spec 倾向的「运行时 port `parseDialogText`」),而是**让功能/结构控制符在数据进引擎之前就被解析没了**(文本走 i18n locale 表),运行时只消费结构化字段 + 查表文本。

## 1. 决策边界(2026-06-26 与作者拍板)

讨论收敛出的范围,**先记死,避免范围漂移**:

- **做 A:对话数据结构化**——去掉 in-band 控制符,换成 `DialogueCue + DialogueRow` 结构化字段。
- **i18n 一等公民**:对话正文**也**走 text id + locale 查表(../decisions.md)),面向英文用户,不内嵌字面字符串。详见 §4。
- **分支留在演出层**:"给玩家俩选项、按选择/剧情走不同支"**不属于对话行**,属于演出 timeline 的 choice action + 世界变量条件([p0-content-schema §3](content-schema.md) + [§6](content-schema.md) 已留好家)。对话行只管"谁说了什么"。本文**只为分支留数据口,不实现**。
- **DSL 留口、现在不做**:类 Ink/Yarn 的对话脚本语言是给「无可视化编辑器的纯文本写作流」用的;reforge 规划里有 editor 包,可视化编辑器直接产出结构化数据 = DSL 编译后的产物,DSL 文本层多余。等编辑器成型、且确认"敲文本比可视化编排快"再议。

## 2. 核心原则:分清「语义真值」和「承载格式」

GLM spec 把原版的 `~NN/$NN/"` 当"原版真值"要 reforge 移植——这混淆了两样东西:

| | 例子 | 第二阶段怎么处理 |
|---|---|---|
| **语义真值**(继承) | 「这段字黄色」「打完停 30 拍」「说话人是游魂」「24ms/字」 | 照样复刻——这是游戏行为 |
| **承载格式**(淘汰) | 用 `"` 表黄、`~30` 表停顿、末尾 `:` 表姓名 | DOS 权宜,换成结构化字段 |

**结构化 = 留住左列语义,扔掉右列承载格式。** 这是全文的纲。

## 3. 数据模型

i18n 一等公民(见 §4):面向玩家的文本(对话正文、说话人名)一律走**稳定 text id** + locale 查表([decisions.md D9](../../decisions.md)),不内嵌字面。功能/结构控制符落到结构化字段;文本内容进 locale 表。

```ts
type TextId = string   // 稳定 key,运行时按当前 locale 查表

interface DialogueRow {
  text: TextId           // 一条原始 showDialog 对应一行
  speed?: number         // 原 $NN;单位 ms/字,省略 = 默认 24ms/字
}

interface DialogueCue {
  speaker?: TextId       // 人名也 i18n;省略 = 旁白
  rows: DialogueRow[]    // 同一次连续显示单元内的显式行
  autoAdvance?: number   // 原 ~NN;单位 ms,存在 = 打完停 N ms 自动推进、不等键
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  portrait?: { icon: number; side: 'left' | 'right' }
  cursorFrame?: 0 | 1 | 2
}

interface Dialogue {
  id: string
  cues: DialogueCue[]
}

type DialogCommand = { kind: 'dialog'; cue: DialogueCue }
```

### 3.1 content14：人物身份与立绘归属

上面的 `speaker?/portrait?` 是已发布 content13 及更早历史输入，不能原地改写。C1-2 在 current
content14 增加必填判别联合，把“谁在说话”提升为作者语义真值：

```ts
type DialogueIdentityV14 =
  | { kind: 'narration' }
  | {
      kind: 'actor'
      actor: string
      speakerOverride?: TextId
      portrait?:
        | { kind: 'default'; side: 'left' | 'right' }
        | { kind: 'expression'; expression: string; side: 'left' | 'right' }
    }
  | ({ kind: 'unbound' } & (
      | { speaker: TextId; portrait?: { asset: AssetId; side: 'left' | 'right' } }
      | { portrait: { asset: AssetId; side: 'left' | 'right' }; speaker?: never }
    ))

interface DialogueCueV14 {
  identity: DialogueIdentityV14
  rows: DialogueRow[]
  autoAdvance?: number
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  cursorFrame?: 0 | 1 | 2
}
```

- `actor` 引用稳定 `ActorDef.id`；缺省姓名来自 `ActorDef.name`，`speakerOverride` 只表达伪装名、称谓
  等本次显示差异。人物立绘只能选该 Actor 的 default 或命名 expression，缺引用立即报错，不回退全局图。
- `narration` 明确表示无人物姓名/立绘；它与对话框位置 `slot` 正交。
- `unbound` 保留旁白以外、尚未归档的人名/泛称/portrait-only 历史内容。它不是失败状态，而是明确的
  非 Actor 作者通道。
- v13→v14 不按显示名、sprite、portrait 或 hash 猜人物：neither→narration，其余旧组合→unbound，
  rows/slot/timing/cursor/显示结果无损。PAL NPC 人工归档另由 C1-3 提供可审计映射。
- runtime、预览和脚本树只调用同一个 resolver，把 identity + Actor 表解析成历史显示投影；content14
  作者数据不泄漏给冻结的历史 runner。SAVE schema 仍为 8，content identity 单独推进到 14。

**locale 表**(每语言一份):`textId → 富文本字符串`。单色 = 纯文本(零标记);少数多色强调行 = 带**有语义、成对闭合**的颜色标记(仅样式,功能符已出文本):

```
zh: {
  "ghost.l1":   "……活人气味……这地方,可不该有活人啊……",   // 单色,纯文本
  "sword.give": "他递来一柄<cyan>青锋剑</cyan>。",            // 多色,样式标记
}
en: {
  "ghost.l1":   "...The scent of the living... no living soul belongs here...",
  "sword.give": "He hands you a <cyan>blue blade</cyan>.",
}
```

渲染层:逐 row 查 `locale[lang][row.text]` → 解析颜色标记 → `TextSpan[]`(渲染中间产物,**非内容字段**) → 着色绘制。

### 控制符 → 结构化 映射表(迁移器规格)

源:第一阶段 [dialog-box.ts:98-145](../../../../packages/game/src/present/dialog-box.ts) `parseDialogText` 全集。

| 原版 in-band | 语义 | 结构化落点 |
|---|---|---|
| `-` `'` `@` `"` | 颜色 toggle(青/红/红alt/黄) | **locale 富文本**成对标记 `<cyan>/<red>/<redAlt>/<yellow>` |
| `\X` | 转义,字面显示 X | locale 字符串按 i18n 规范转义 |
| `$NN` | 打字速度 `floor(NN*10/7)*8` ms/字 | `row.speed`(迁移器算好存 ms) |
| `~NN` | 尾停顿 `floor(NN*80/7)` ms + 自动推进 | 在该处分 cue,写 `cue.autoAdvance` |
| 末尾 `:` `：` `∶`(姓名行) | 姓名牌 | `cue.speaker`(TextId) |
| 每条 showDialog = 一行;4 行/页 | 分行 / 分页 | `cue.rows[]` + 渲染层分页(见 §6) |
| `)` `(` | 等键光标形态(0默认/1/2) | `cue.cursorFrame` |

**两个刻意的决定:**

1. **颜色用语义名,不用 palette index**:标记标签 `<cyan>` + 渲染层映射 palette(`cyan→0x8D / red→0x1A / redAlt→0x17 / yellow→0x2D`;姓名牌固定 title 色 0x8C),内容 / locale 层不出现魔法数。铁律「杜绝魔法数 / 下标式身份」。
2. **`speed/autoAdvance` 存真实 ms,不存 sdlpal 原始 `NN`**:`floor(NN*10/7)*8`、`floor(NN*80/7)` 这种换算在迁移器做掉,数据里是看得懂的毫秒。

## 4. i18n:对话正文也走 text id(一等公民,审查重点已拍板)

作者定:**第二阶段可能主要面向英文用户,i18n 是一等公民,不是留口**。故对话正文**也**走 text id,[decisions.md D9](../../decisions.md) 字面执行、不打折(原草案"对话正文留口、内嵌字面"作废)。

- **功能 / 结构出文本**:`row.speed / cue.autoAdvance`(功能)、`cue.speaker / cue.rows`(结构)是结构化字段,**不进文本**。这正是作者反对「用 `~30` 在文本里代表功能」的彻底落实。
- **文本内容进 locale 表**:`text: TextId` → 每语言一条富文本字符串。
- **多色强调 = locale 译文里的样式标记**(2026-06-26 拍板):颜色是"强调",**本属文本且随译文走**(英文强调的词≠中文语序),所以只能跟着每种语言的译文,用**有语义、成对闭合**的标记(`<cyan>词</cyan>`)。这是 i18n 富文本的行业标准(Fluent / ICU)。**单色行(绝大多数)零标记。**

**为什么这不是"换个符号的 in-band 倒退"**:作者反对的是「无语义符号在文本里**代表功能**」(`~30` 停顿 / `$10` 变速)——这些**功能全部出了文本**。locale 里只剩**颜色样式标记**,而颜色样式**本就是文本的一部分**、必须随译文走;标记是有语义、成对闭合的(`<cyan>…</cyan>`),与原版无语义、混功能、靠位置的脆弱控制符是两种东西。

**text id 命名 / 组织**(per-scene 命名空间、自动生成 vs 手命名)留 schema / 迁移器细化,不在本文定死;只锚定「稳定 id、locale 查表」(../decisions.md) 稳定 text id 铁律)。

## 5. 控制符解析的归属(架构要点)

> **原版那套功能 / 结构控制符(`~$`/末尾冒号/分行)从「运行时」前移到「数据生产期」彻底消失;运行时只剩 i18n 富文本的颜色标记轻解析。**

- 原版那几千句:**迁移器**([p0-content-schema §8](content-schema.md))一次性吃掉控制符——功能 / 结构 → 结构化字段,文本 → locale 表(颜色 toggle → `<color>` 标记)。
- 新内容(鬼话 / DLC):编辑器 / 手写**直接产出**结构化 + locale 条目,从不经过原版控制符。
- reforge 运行时:**只消费** `DialogueCue`(读 `speaker / rows / autoAdvance / cursorFrame / slot / portrait`)+ 按 locale 查 row 的 `text` → **轻解析颜色标记** → 着色。
- 唯一旧码解码器位于 `packages/migrate/src/legacy-dialog.ts`;content/reforge/editor 不得出现同类解析入口。
- 老作者工程只允许在 loader 边界把旧 `{kind:'dialog',line}` 单向升级为 cue;升级器只搬结构,不解析控制码。PAL 必须从迁移器重新生成,不得依赖该兼容入口。

**这和「搬运 `parseDialogText`」的区别**:原版 `parseDialogText` 解析的是**功能 + 样式 + 结构混在一起**的脆弱控制符(`~/$`/冒号/转义/位置判定);其中功能和结构**已全部出文本变结构化字段**,运行时不碰。运行时唯一保留的解析,是 locale 富文本里**成对闭合的颜色标记**——这是 i18n 富文本的固有性质(文本带强调、渲染展开),性质上是另一回事,且极简。

## 6. 分页 / 自动推进 / 状态机

现有 [reforge/dialogue.ts](../../../../packages/reforge/src/dialogue.ts) 是"每行 = 一页"的极简状态机,撑不起打字 + 分页 + 自动推进。升级方向:

- **对话 = cue 的序列,cue = row 的序列**;分页由**渲染层按对话框容量算**,不写死原版"4 行/页"(那是 320×200 框的限制,第二阶段不焊死)。
- **`autoAdvance` cue**:全部 rows 打完后停 N ms 自动进下一 cue、不画光标、不等键(原 `~NN`)。
- **状态机保持纯函数、不塞隐式等待态**——继承 GLM spec 对第一阶段 Bug2 的告诫(它把"渲染没画完"做成状态机里的隐式 `lineDoneRenderPending` 等待态,导致"按一下只过一行、要按很多遍")。reforge 不重蹈:渲染问题在渲染层解;逻辑层**一次按键 = 当前页一次性连锁瞬显**,不每行一个 tick。
- 打字时钟**与逻辑主循环解耦**(GLM spec 已论证):渲染层按 `performance.now()` 算 charsShown,不挂逻辑 tick——避免第一阶段"24ms/字被 10fps 采样打成 4 字一跳"。

## 7. 外观继承(承接 GLM spec)

[visual-spec.md](../../reference/dialogue-presentation.md) 的外观真值(字模 = **简体点阵 GNU Unifont CN**,非原版 FONT.MKF——见该 spec §1;姓名牌位置 / 色、打字 24ms/字、光标 DATA chunk 12、三层阴影、透明框)**整体继承**——这些是「语义真值」,第二阶段照搬合理(字模是开源点阵替代,因 i18n 必需)。**唯一改动**:渲染层的数据源从「`parseDialogText` 解析控制符字符串」换成「读结构化 `DialogueCue + DialogueRow` + locale 查表」。GLM spec 的移植清单(§1 资产、§2 渲染函数、§3 真值速查)照用,只把 §2 里的 `parseDialogText` 那步换成「locale 查表 + 轻解析颜色标记」。

## 8. 分支的归属(留口,不实现)

作者想要的分支 / 选项 / 条件能力,落点**不在对话行**:

- 一行对话永远只是"谁说了什么"。
- "给俩选项 / 按世界变量走不同支" = 演出 timeline 的 **choice action** + condition([p0-schema §6](content-schema.md) 演出 action + [§3](content-schema.md) 世界变量)。
- 本文只保证 `Dialogue` 能被 choice action 引用(稳定 id 已满足),**不实现 choice action**——等真要写分支内容时,在演出层做。

## 9. 实现:分三刀,先地基

| 刀 | 内容 | 验收 | 依赖 |
|---|---|---|---|
| **① 数据模型 + 状态机** | `DialogueCue + DialogueRow`;locale 查表 + 颜色标记解析;reforge 状态机升级(打字/分页/autoAdvance,纯函数) | 已完成 | 无 |
| **② 外观继承** | 落地 GLM spec 外观真值(透明框/姓名牌/打字/字模/光标/阴影),数据源 = 结构化 + locale | 鬼话长出原版对话框样子(GLM spec 切片1验收清单) | ① |
| **③ 迁移器** | 解析原版 in-band 控制符 → 结构化 cue/rows + 产出 locale 条目;状态跨 goto/callScript,上下文变体 id 与遍历顺序无关 | 已完成全量 PAL 重生成,三方复验中 | ①② |

N1-1 的全量迁移审计见 [n1-dialogue-migration-audit.md](../audits/n1-dialogue-migration-audit.md)。

## 10. 不在范围 / 留口清单

- **DSL / 对话脚本语言** —— §1 留口不做。
- **分支 choice action** —— §8 留口,演出层做。
- **多语言实际翻译(en 等)** —— i18n **机制**(text id + locale 表)本次就做(../decisions.md));具体译文按需补,locale 表先只有 zh。
- **item-box 等独立 UI** —— 不塞回普通 dialog schema,按各自 UI 能力实现。
- **更多语言实际译文(en 等)** —— 机制已具备,译文内容按后续计划补。
