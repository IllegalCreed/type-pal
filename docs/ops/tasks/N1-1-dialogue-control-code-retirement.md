# N1-1 - 对话控制码退出内容与运行时

Status: done
Phase: phase2
Capability: N1 / MG1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

把原版 `$NN`、`~NN`、`"`、`-`、`'`、`@`、`(`/`)`、`\` 等对话控制码只留在迁移器的
旧数据输入端。生成工程、locale、content schema、Reforge 运行时和编辑器统一使用结构化对话数据；
编辑器直接显示正文、速度、自动推进、光标、说话人、位置和立绘，不再让作者阅读或输入魔法字符。

## 范围

- 范围内:
  - 在 `@type-pal/migrate` 建完整、有状态的原版对话解码器，忠实承接一阶段控制码语义。
  - 将一个原版连续对话批次迁为单一 `DialogueCue`，批次内保留独立 `rows`，不再把多行粗暴拼成
    一个只有单一速度的字符串。
  - `$NN` 迁为每行真实 `speed`（ms/字）；`~NN` 迁为 cue 级 `autoAdvance`（ms）；`(`/`)` 迁为
    `cursorFrame`；姓名、slot、portrait 保持结构化。
  - 颜色控制码迁为 locale 中成对闭合的语义标签；每个 locale 值自身合法，跨源行颜色状态由迁移器
    展开，运行时不保存旧控制状态。
  - 迁移状态跨连续行、goto/callScript 分片入口和共享脚本上下文传播；同一原文在不同进入状态下需要时
    生成确定性的上下文变体 text id。
  - 删除 `packages/content/src/dialog-text.ts` 和 Reforge 的 `parseDialogControlCodes` 兜底路径。
  - 编辑器为结构化 cue/rows 提供完整控件和清晰摘要；旧工程在加载边界一次性升级，内存和保存产物只保留
    新格式。
  - 重生成 PAL 与 baseline，并保持 MG2 二跑零计划。
- 范围外:
  - 对话框美术、字体、分辨率和布局重做。
  - 对话分支 DSL、Ink/Yarn 或配音时间轴。
  - 修改原版台词、翻译文案或说话人归属。
- 明确不做:
  - 不在 editor/reforge 保留两套可执行格式。
  - 不把 `$10` 换成另一种无语义字符串标记。
  - 不只清理截图中的三句开场对白；必须修迁移器并全量重生成。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/dialogue/model-design.md:8-12,69-108`: 功能/结构控制码必须在数据生产期消失，运行时只消费
    结构化字段和 locale 富文本。
  - `docs/phase2/decisions.md:63-67`: 对话采用稳定 text id、真实毫秒属性和语义颜色标签。
  - `AGENTS.md`: 根因属于迁移器，必须先修上游再重生成，不得手改 `projects/pal`。
  - 用户于 2026-07-14 再次确认：对话中的魔法字符必须去掉，用现代、明确的属性替代。
- 代码锚点(`file:line`):
  - `packages/content/src/index.ts:43-58`: 现有 `DialogueLine` 已有 speed/autoAdvance/cursorFrame，但不足以表达
    一个迁移批次内多行不同速度。
  - `packages/content/src/dialog-text.ts:1-57`: 当前把旧控制码错误地放在 content/运行时解析。
  - `packages/reforge/src/dialog/dialog-box.ts:100-132`: 排版和时序仍调用旧控制码解析器。
  - `packages/migrate/src/translate-events.ts:556-601`: 当前 flush 直接把原文 `join('\n')` 写进 locale，未结构化。
  - `packages/editor/src/ui/CommandForm.tsx:190-226`: 编辑器只显示原始文本，其余字段退回 JSON。
  - `packages/editor/src/ui/ScriptTree.tsx:80-89`: 树摘要直接 lookup locale，因此把 `$10/~30` 展示给作者。
- 已知坑 / 审计文档:
  - `packages/game/src/present/dialog-box.ts:56-170`: 一阶段完整真值；颜色和速度状态可跨源行持续，`~NN`
    立即结束当前行并忽略其后字符。
  - `docs/phase2/foundation/n-dialog-text-audit.md:290-334`: 二阶段结构化目标与已知跨段速度缺口。
  - 当前 PAL 实测：`6,722` 条 dialog command 中 `speed/autoAdvance/cursorFrame` 均为 0 条；`1,234`
    条命令引用的 locale 仍含旧控制字符。
  - 当前生成 locale 有 `4,521` 个 `dlg.*`：`$NN` 113 处、`~NN` 107 处、ASCII quote 240 处、
    `(`/`)` 27 处。原始 `all.json` 13,513 条 showDialog 还含 18 个 `-` 颜色控制位。
  - 12 个原始连续批次在批内改变速度；现有“多行 join 后只取一个 speed”的模型无法忠实表达。
  - `dlg.9831/9832` 的黄色状态跨 text id 开/关，证明解析必须携带进入/离开状态并输出平衡标签。
- 不得重新引入:
  - runtime legacy parser、未闭合颜色标签、行内魔法字符、两个 canonical schema、按字符串替换猜语义。
- 相关测试:
  - `packages/game/src/present/dialog-box.test.ts`
  - `packages/content/src/dialog-text.test.ts`（迁移后由 migrate 真值测试替代）
  - `packages/migrate/src/translate-events.test.ts`
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/editor/src/ui/CommandForm.test.tsx`（若现有测试落点不同，由 build 按本地模式选择）

## 验收条件

- 功能:
  - canonical 形态采用单一结构，Codex 提案为:

    ```ts
    interface DialogueRow {
      text: TextId
      speed?: number
    }

    interface DialogueCue {
      speaker?: TextId
      rows: DialogueRow[]
      autoAdvance?: number
      slot?: 'top' | 'bottom' | 'narration' | 'center'
      portrait?: { icon: number; side: 'left' | 'right' }
      cursorFrame?: 0 | 1 | 2
    }

    type DialogCommand = { kind: 'dialog'; cue: DialogueCue }
    ```

  - 开场三段数据必须成为可读属性：第一段 `speed=112`、`autoAdvance=342`；第二段
    `speed=16`、`autoAdvance=457`；第三段继承 `speed=16`、`autoAdvance=685`，正文无 `$`/`~`。
  - 颜色 toggle、跨行颜色、转义、光标和尾部 `$` 状态传播与一阶段逐字符真值一致。
  - 编辑器脚本树只显示清洁正文；表单可编辑行、速度、自动推进、光标、slot、speaker、portrait。
  - 旧工程只允许在 loader/upgrader 边界转换一次；保存后只产生新格式。
- 测试:
  - 对原始控制码全集做表驱动测试，包含跨行颜色、跨行速度、`~` 后缀忽略、speaker/style/goto 分界。
  - 迁移器断言所有可达 showDialog 均被消费；遇到一个可见行中无法由 row speed 表达的真实中途变速时
    fail-loud，不得静默近似。
  - 结构化解析后的 PAL locale 不含旧功能控制码，所有富文本标签平衡且可由 `parseRichText` 完整消费。
  - content/reforge/editor 全仓无 `parseDialogControlCodes` 和旧运行时解析入口。
  - MG2 写盘后二跑 `writes=0 deletes=0 conflicts=0`；M3 脚本体积门禁不放宽。
  - `pnpm check` 与相关 build 全绿。
- 文档:
  - 回填 model-design、content-schema、capability-map；N1 在本任务完成前不得继续写“结构化 done”。
- 视觉 / 手工验证:
  - 6051 从新游戏跑开场三段，速度/自动推进/姓名/位置与一阶段一致，画面不显示控制码。
  - 编辑器打开 s000 与至少一组跨行黄色对话，属性可读、文本清洁、保存重开不回生控制码。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。现状与原设计直接冲突；建议 cue + rows 单一模型，旧码解析只归 migrate，
  loader 仅做一次性边界升级。
- Opus: **agree（2026-07-14,附 R1-R4 必改 + S1-S2 建议,见主审立场）**。独立地面重验,卡内基线数字全部吻合:
  `$NN`=113/`~NN`=107/`"`=240/`()`=27(出现次数口径)、dialog 命令 6,722 条(speed/autoAdvance/cursorFrame 全 0)、
  1,234 条引用含控制码 locale、join 值 2,392 个;开场三段 `$10`→112ms/`~30`→342ms、`$02`→16ms/`~40`→457ms、
  第三段继承 16ms/`~60`→685ms,逐条对上一阶段换算公式。**关键新证据——全语料 `$NN` 位置分类:行首(可见字前)103 /
  末字后 10 / 行中(真·中途变速)0**:PAL 全集不存在任何可见文字中途变速,rows 行级 speed + 状态携带 100% 覆盖,
  fail-loud 是纯保险而非预期路径(我按 join 值口径测得多速度批 9 个,与卡"12 个原始批次"口径差留 GLM 对账,
  两口径下全部属行界形态)。dlg.9831/9832 跨值黄色实证(`$12"…~70` 未闭合 → `…"$02~60` 闭合)确证 stateful decoder
  + 每值平衡标签展开必要。cue 级 autoAdvance 忠实:一阶段 `~` = 行止 + 行计数复位 = 页终不等键不画光标
  (game/present/dialog-box.ts:76-81),`~` 天然是 cue 边界,批中 `~` 即迁移期分 cue 点。runtime 删除有据:
  content/dialog-text.ts 文档头自认"二阶段渲染层解析",与 model-design §5(控制码在数据生产期消失)正面冲突;
  reforge dialog-box.ts:113-130 每次排版对同一文本双跑 legacy parser。loader 单向升级 line→cue 为单射结构平移
  (line.speed→row.speed / line.autoAdvance→cue.autoAdvance),与 R2"迁移产物拒绝+重迁"分工不冲突
  (PAL=重生成,作者工程=loader 升级)。
- GLM: **agree（2026-07-15;附 N1-N3 非阻塞 + R3 考证材料备齐,见下）**。六项复核逐条：

  **(1) 基线对账** ✅（独立实测全吻合）：113 `$NN`/107 `~NN`/240 `"`/27 `(`/`)`（拆 17+10）/6,722 dialog/2,392 join 值全逐项验证。12vs9 口径差异=定义不同（实测 6 值含>1 `$NN`），两口径行中=0——前提 `\u3000` 算非可见。**N1(build 必落)**：`parseDialogText` default 分支(:166-167)实际 emit `\u3000`，严格读法有 4 个行中变速；`\u3000` 可见性约定必须显式钉进 decoder 契约+测试。

  **(2) 表驱动测试矩阵完备性** ✅：对照 dialog-box.ts:98-180 全分支——`-`cyan toggle(无条件)/`'`/`@` toggle/`"`**R1 仅普通对话变黄 narration 只消费**(:130-132)/`$NN`跨行持续(:133-139)/`~NN`行止+**R2 其后全废含`$NN`**(:140-154 两形态并存 dlg.8624 vs 8603/9213/10217)/`\`转义(:161-165)/`(`icon=2 `)`icon=1(:155-160)/末尾冒号 speaker。R1/R2/R3 专项用例全部落表。✅

  **(3) R3 考证材料——18 处 `-` 全站点清单备齐** ✅：全为属性±N 文案（防御+N 身法-N / HP-N / 武术+N 身法-N / 敌人HP-N），无一叙事、无一转义。一阶段 :121-123 `-` 无条件 toggle CYAN → "身法-10"="身法"+[cyan on]+"10"。`+`非控制码故只`-`被吞。裁决选项备齐交用户：(A)忠实 toggle(负号消失+数字变青) vs (B)literal 负号。

  **(4) variant text id** ✅：命名必须与遍历顺序无关（S2）。**N2(build 必落)**：补"variant id 正序/逆序遍历输出相同"确定性测试。

  **(5)** 一阶段 parseDialogText 真值复核 ✅：dialog-box.ts:98-180 全分支独立验证，与 Opus 一致。

  **总结**：基线全吻合；R3 材料 18 站点备齐；测试矩阵方向完整。**agree**。

  **N1-N3 非阻塞（build 必落）**：N1 `\u3000`可见性约定钉死；N2 variant id 确定性测试；N3 1,234 控制码引用交叉口径写审计报告。

- counter / 分歧处理: Opus 无架构 counter;R1-R4 为设计必补,GLM 无 counter(标 N1-N3 build 必落 + R3 考证材料备齐)。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R4 必改 + N1-N3(`\u3000`可见性约定/variant id 确定性测试/1,234 交叉口径)纳入 build 范围。实现顺序：N1-1 优先。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-15）**。实现、自测、全量重迁移、MG2 二跑、静态残留审计、6051 开场与
  6010 编辑器实机检查均通过；浏览器会话无 console warning/error。自动化浏览器没有已授权的工程目录
  句柄，FSA 保存按钮会触发系统目录选择器，因此“真实保存后重开”留给 Opus 用已有目录句柄补验；
  canonical round-trip 与 loader 单向升级已由单测覆盖。
- Opus: **accept（2026-07-15,实现/视觉主审;附 D1 文档必改 + F1 独立发现,均不阻塞本卡语义）**。复核全过:
  1. **decoder 逐分支对照一阶段真值**:R1 `"` slot 分叉(legacy-dialog.ts:97-99,narration 只消费)、
     R2 `~` 后全废含死 `$NN`(:107-112,`i=chars.length` 整段丢弃、状态不污染)、`-'/@` 三 toggle、
     U+3000 非语义缩进约定(:86 + docblock)、真中途变速 fail-loud(:130-132)全部落地;测试八用例齐点名
     (含 GLM N1 `　` 约定与 N2 变体正逆序)。补验畸形序列:全语料 `$`/`~` 后非双位数字 **0 例**,
     decoder 严格正则与一阶段 `parseInt` 宽松解析的理论分歧零语料效果。
  2. **状态传播**:walkBody 携带 color/speed/speaker/slot/portrait;goto(:684)/分支臂(:795)/callScript(:1287)
     全站点传入口态;registry id 含状态哈希 `d-<hash>`(异态入口分脚本);callScript 出口态回传调用方
     (:1291-1292);speaker 行 decode 后弃状态(忠实一阶段 nameplate 独立绘制不动 iDelay);变体 id 用内容哈希
     (`stableScriptHash(decodedText)`)——与遍历顺序无关是构造性质,非约定;同 key 异文冲突 fail-loud。
  3. **产物数据面(独立重扫)**:8,637 个 dlg.* 值 0 控制码/0 换行/0 非平衡标签;变体 26;颜色标签值 125 个
     **全部 yellow**(cyan/red/redAlt 均 0,见 D1);开场三 cue 精确(112/342 center、16/457 speaker、
     双 row 16+16/685);dlg.9831→`<yellow>好吧．．．</yellow>` 与 dlg.9832.v-a4e078f7 跨值续闭合实证;
     dlg.8603 `~50$02` 死码丢弃 + 全角 `～`/U+3000 字面保留。
  4. **canonical 单一**:content dialog 命令仅 cue.rows,validator 拒 line(导向升级);dialogue-upgrade 纯结构
     平移、双格式共存 fail-loud、不解释控制码;editor 经 reforge loadProjectFrom/loadAllScriptChunks 共享
     升级边界(单一加载路);content/reforge/editor 全仓 `parseDialogControlCodes`/dialog-text 零引用。
  5. **测试/门禁(独立重跑)**:migrate legacy-dialog+dialogue-project 10 tests、translate-events 42、
     content 168、reforge 38 文件、editor 19 文件全绿;MG2 dry-run `writes=0 deletes=0 conflicts=0`,
     门禁 1.65x/1.13x/1.53x 与 Build 一致。
  6. **6051 开场(前台,页内 toDataURL 定时捕获+overlay 回放截图)**:三段零按键自动推进(112ms 慢打字/center
     → 16ms 快打字/speaker 李逍遥青名牌 → dither → s001 李大娘立绘+双行+等键光标),画面零控制码,
     console 0 error/warning。
  7. **保存重开实测(替代方案)**:自动化 profile 无已授权句柄(IndexedDB 空,与 Codex 同墙),改用 **OPFS 目录
     句柄**(同 FileSystemDirectoryHandle API、免授权)全真跑 FSA 通路:克隆 831 个 JSON → ?picker 启动屏
     「打开工程」→ 改 s000 首 cue speed 112→113 → 💾 保存(真 createWritable 写盘)→ 整页重载 →
     「最近工程」重连 → **113 持久、chunk 仍 cue 形态、零 `line`、原始字节零控制码、树摘要零码**;
     s173 黄色对白摘要清洁、富文本标签零泄漏。与用户真实磁盘句柄的差异仅存储后端,API 面等价。
- GLM: **accept（2026-07-15;见下）**。六项独立实测 + 四包 841 tests pass + 1 skip。D1 文档修正已复核通过。

  **(1) 产物口径对账（独立重扫）** ✅：
  - 8,637 text id / 26 变体 / 125 yellow 标签值 / **0 cyan** / 0 残留控制码——逐项精确匹配。✅
  - dialog 命令口径：scripts chunks 实测 6,723 + enemies.json 135 = 6,858（卡内口径含敌人 choreography）。rows 14,200 同理（14,065 scripts + 135 enemy）。**口径差异 = 统计边界（scripts vs scripts+enemies），两者都正确**。✅
  - managed files 829（dry-run 确认 `[纯生成] 托管文件 829`）。✅

  **(2) N1-N3 落地验收** ✅：
  - **N1（U+3000 约定）**：legacy-dialog.ts:64-69 docblock 显式"U+3000...本语料只把它当行首缩进...判断 `$NN` 是否属于首字前设速时明确忽略"；emit(:84-87) 保留字面字符但排除出 `semanticSpeeds`；专测 legacy-dialog.test.ts:29-35 `'\u3000$10正文'→'\u3000正文' speed=112`。✅
  - **N2（变体 id 确定性）**：legacy-dialog.test.ts:59-70 正序/逆序 `build(false)===build(true)` 断言；id 用 `stableScriptHash`(FNV-1a 内容哈希,非插入序) + baseline 钉死默认色+bottom slot(:146 docblock)。✅
  - **N3（迁移前口径表）**：n1-dialogue-migration-audit.md:13-17 `脚本chunks 6,722/1,234 + 敌人 135/12 = 合计 6,857/1,246`。✅

  **(3) D1 核实——审计文档修正已到位** ✅：
  - **原问题**：审计文档 :45 原称"18 处 `-` 按 A 迁为 cyan toggle/减益数字写成 `<cyan>…</cyan>`"与产物 0 cyan 矛盾。
  - **修正文本**（实测 :45-48 现状）：`"用户选择 A 确定的是 legacy dialogue decoder 遇 - 时按 cyan toggle 解释；可达对话语料实际零命中。原始 18 处 -（17 个站点）均属 0xA7 道具描述块，由描述管线原文写入 items.json，不经过对话 decoder；字面负号原样保留才与原版及一阶段菜单直绘路径一致。"` ✅
  - **独立确认**：items.json 17 个 item desc 含字面 `-`（id 129/153-162/167/175/185/211/213/215/217/218/255，item 175 含 2 dash = 18 token）；translate-events.ts:1054 0xA7=noop；一阶段 script-desc.ts:30-38 `cmd.text` 原文直画不过 parseDialogText。**字面负号 = 原版/一阶段真实渲染，items.json 现状正确且忠实。** ✅
  - **结论**：D1 修正文本准确，不改实现/产物。✅

  **(4) 表驱动测试矩阵（legacy-dialog.test 八用例对照 parseDialogText）** ✅：
  - `'-/[@` 三色 toggle（cyan/red/redAlt, :9-12）✅
  - `"` 跨行颜色 + 每值独立闭合（:14-21）✅
  - `"` narration 只消费不变色（R1, :23-27）✅
  - `$NN` 跨行持续 + U+3000 非语义（:29-35）✅
  - 真·中途变速 fail-loud（:37-39）✅
  - `~` 后全废含死 `$NN`/颜色码（R2 两形态, :41-51）✅
  - 光标 `(`/`)` + 转义 `\`（:53-57）✅
  - 变体正逆序确定性（N2, :59-70）✅
  - **全分支覆盖，无漏。** ✅

  **(5) 敌人 choreography 对白（135/12）同 decoder 同门禁** ✅：
  - enemies.json 135 dialog 引用（130 distinct dlg id），经同一 decoder + 同一 locale 门禁。产物中 0 控制码、0 cyan、1 yellow。✅
  - **"12 含码"是迁移前口径**（audit doc :16），迁移后 0——符合预期。✅

  **(6) MG2 二跑零计划 + M3 体积门禁** ✅：
  - dry-run `writes=0 deletes=0 conflicts=0`，compact 1.65x / pretty 1.13x / commands 1.53x / closure 450582B。✅
  - 四包测试：migrate 174+1skip / content 168 / editor 165 / reforge 334 = **841 pass**。✅

  **总结**：产物口径全吻合（0 cyan/0 控制码/26 变体/125 yellow 独立确认）；N1-N3 全落地；D1 文档修正已到位且文本准确；测试矩阵八用例全分支无漏；敌人 choreography 同门禁；MG2 零计划 + 841 tests pass。**accept**。

- counter / 返工处理: **D1 已由 Codex 于 2026-07-15 落地, GLM 独立复核通过**（修正文本准确，见 GLM 签字 (3)）。无返工项。
  "18 处 `-` 按用户选择 A 迁移为 cyan toggle/减益数字写成 `<cyan>…</cyan>`"——**与产物事实不符**:
  全产物 0 个 cyan 值。实测 18 处(17 站点)全在 0xA7 道具描述脚本族(addr 39926-40790),该族由更早的道具
  管线(C3 期)迁入 items.json desc,**保留字面负号**,N1-1 对话管线不触及(0xA7=noop、desc 段不可达对话根)。
  且一阶段 script-desc.ts 对 desc 行**原文直画**(sdlpal WIN95 itemmenu.c:267-284 路径,不过 parseDialogText)
  ——**字面负号即原版/一阶段真实渲染,items.json 现状正确且忠实**。用户裁决 A 实际仅约束 decoder 缺省
  (已实现+已测,对可达对话语料零命中)。现已修正审计文档与 Build 摘要,明确"A=decoder 政策,
  17 站点属菜单文案不经对话管线,负号字面保留即忠实";未改任何实现与产物。
- 缺签豁免: N/A
- done 准入结论: **passed（Codex + Opus + GLM accept；D1 已落地并经 GLM 复核；用户于 2026-07-15 验收通过）。**

## Draft: 设计与风险

### 设计结论

1. **单一 cue 模型**：一个 `dialog` command 表示一次连续显示单元；cue 持有共享的 speaker/slot/portrait
   与结尾行为，rows 持有各行 textId 和 speed。这样既不要求每个原始 showDialog 单独等待按键，也不把
   多行速度压成一个值。
2. **legacy decoder 只在 migrate**：输入为原始文本和进入状态，输出清洁 rows、结构化属性、平衡富文本和
   离开状态。状态加入脚本 registry 的上下文 key，防止共享脚本从不同状态进入时误复用。
3. **runtime 无兼容层**：Reforge 只消费 cue；旧项目由版本化 upgrader 转成 cue 后再进入 content validator。
4. **编辑器所见即所得**：正文编辑 locale 内容；时间与光标走数值/选项控件。JSON 兜底不能作为这些常用字段
   的唯一入口。
5. **全量重生成**：上游修复后生成 PAL/baseline，静态门禁与 MG2 保证问题不会被下一次迁移带回。

### 已知风险

- 风险: schema 改动横跨 content/migrate/reforge/editor，并触及现有工程文件。
  - 缓解: loader 单向升级 + 内存单一格式；分提交保持每步可验证，不保留运行时 union。
- 风险: 控制状态跨 goto/shared 入口，单纯按 message id 写 locale 会发生上下文冲突。
  - 缓解: 把 color/speed 纳入翻译上下文与 deterministic variant id；审计同源多状态数量。
- 风险: 原始 `$NN` 可能真正在可见文字中途变速，row speed 无法表达。
  - 缓解: 当前 12 个异常批次逐项分类；只允许“首个可见字前设速”或“末字后影响下一行”，其他情况
    fail-loud 并由三方决定是否扩 `DialogueRun`，不得猜。
- 风险: ASCII quote 在原版均是控制符，但新作者可能真想输入引号。
  - 缓解: 只有 migrate legacy decoder 解释 ASCII 控制；新 locale 使用普通中文引号或转义后的字面文本，
    editor/runtime 不再解析它。

### 主审立场

- Reviewer: Opus（schema/运行时边界）+ GLM（迁移覆盖/测试矩阵）
- 结论(Opus,2026-07-14): **agree — DialogueCue + rows 应为唯一 canonical 形态**。三个核心问题裁定:
  1. **批内多速度**:全语料实测 `$NN` 行中出现 0 次(行首 103 / 末字后 10),行级 `row.speed` + 迁移器状态携带
     即 100% 覆盖;"真·中途变速 fail-loud 交三方裁"作为保险条款保留,预期永不点火。
  2. **跨行颜色**:dlg.9831/9832 未闭合/续闭合实证跨值状态真实存在;stateful decoder 携带进入/离开状态、
     每个 locale 值独立平衡标签,是唯一不把控制状态泄进运行时的方案。采纳。
  3. **autoAdvance cue 级**:一阶段 `~` 行止 + 行计数复位 = 页终(不等键不画光标),`~` 就是显示单元边界;
     批中出现 `~` 时迁移器在该点分 cue,各 cue 独立 autoAdvance——忠实且无损。采纳。
  runtime 删除 legacy parser、loader 单向升级、变体 text id 方向均无 counter。
- 必改项(R,设计层面补明,build 必落):
  - **R1 `"` 的 slot 依赖语义进 decoder 契约与测试表**:一阶段真值 `"` 仅 `!isDialog`(top/bottom/center 普通对话)
    toggle 黄色,narration(isDialog=TRUE)只消费不变色(game/present/dialog-box.ts:96,130-132)。decoder 输入必须含
    slot 上下文;测试表必须含"narration 内 `"` 消费不变色"与"普通对话 `"` 变黄"两个方向。卡现文"与一阶段逐字符
    真值一致"未点名此分叉,240 处 quote 全押在这上面。
  - **R2 尾部 `$NN` 两形态分家钉进测试**:`…$02~70`(`~` 前)= 速度状态改变,传播到下一行/下一 cue;
    `…~50$02`(`~` 后)= 死码,一阶段整段丢弃(text.c:1554 return),**不得让其污染后续速度状态**。实测两形态
    并存(dlg.8624 vs dlg.8603/9213/10217)。卡有"`~` 后缀忽略"一句,须精确为"其后所有字符含 `$NN`/颜色码一并作废"。
  - **R3 18 处 `-` 全部是属性±N 文案的负号,先考证再定去向**:实测 all.json 18 处 `-` 全落在
    `防御+13　身法-10`/`HP-30` 类属性增减文案,无一处叙事强调。按一阶段解析器语义它们会被当 cyan toggle 消费
    (负号消失、`身法` 后数字变青直到下个 `-` 关断)——视觉上像 bug 但可能是原版真行为。build 前必须:
    跑一阶段渲染取实况(或原版对照),连同 18 站点清单交用户裁决"忠实 toggle"vs"literal 负号(跟原版后期修复风格)";
    不得未考证默认按 toggle 吞负号。此裁决同时决定 decoder 对 `-'@` 三符的缺省策略。
  - **R4 row 内 `\n` 政策一句话钉死**:重生成后 PAL 每 row 一个 TextId(不再 join,消化现存 2,392 个 join 值);
    新内容 validator 禁止 locale 值内 `\n`;loader 升级旧工程 line→单 row 时保留既有 `\n` 作软换行豁免
    (升级器只动结构、不改写 locale)。防止"rows 与 `\n` 两套换行"变相双 canonical。
- 建议项(S,不阻塞):
  - S1 编辑器 rows 表单显示 resolved 继承速度来源(行无显式 speed 时显示"继承 16ms/字"),纯 UX,build 裁量。
  - S2 变体 text id 命名规则写进 content-schema 文档,并注明必须与翻译遍历顺序无关(MG2 二跑同进程重放防不了
    顺序依赖式 id churn,基线稳定性靠命名本身确定)。
- 是否建议进入 build: **待 GLM 覆盖复核;R1-R4 纳入 build 范围后 build**。实现顺序用户已定:N1-1 优先,X3-1 后置。

### 三方争议记录(按需)

- Codex: 推荐 cue + rows；反对保留 `line.text` 与 `cue.rows` 双格式。
- Opus: **agree**,cue + rows 采纳为唯一 canonical(全语料 0 例行中变速,rows 覆盖率 100%;`~` = 页终真值故
  autoAdvance 归 cue 级正确);反对双格式立场一致。附 R1-R4:`"` slot 依赖、`~` 后死码、18 处 `-` 负号考证
  (需用户裁决 toggle vs literal)、`\n` 政策。
- GLM: **agree**。基线数字全吻合(113/107/240/27/6722/2392 独立实测);12vs9 口径差异=定义不同(6 值含>1 `$NN`),两口径行中=0 但依赖 `\u3000` 算非可见(N1 build 必落);R3 考证 18 处 `-` 全站点清单备齐(全属性±N 文案,一阶段无条件 cyan toggle);测试矩阵方向完整(R1 `"`slot依赖/R2 `~`后死码两形态/R3 18站点)。variant id 确定性需补测试(N2)。N1-N3 非阻塞。Evidence: 设计签字 GLM 行。
- 用户拍板: 控制码必须移除并改成现代明确属性；迁移缺陷优先处理。2026-07-15 选择 A（忠实原版）：
  legacy dialogue decoder 遇 `-` 时按 cyan toggle 解释，该控制码不得进入新版工程。D1 后续确认原始
  18 处 `-` 均属菜单描述直绘路径、不经过 decoder；这些站点保留字面负号才忠实。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none

## Build: 实现与自测

- Coding Owner: Codex（三签齐，2026-07-15 已进入 build）
- 修改文件:
  - `packages/content`:唯一 `DialogueCue + DialogueRow` schema、严格校验、旧工程单向 upgrader；删除
    `dialog-text` 运行时解析器。
  - `packages/migrate`:有状态 legacy decoder、事件/敌人对白迁移、goto/branch/callScript 状态传播、
    确定性 text id 变体、全 PAL 永久产物门禁。
  - `packages/reforge`:loader 升级边界、cue/rows 状态机/排版/时序/runner 消费链；无旧控制码解析入口。
  - `packages/editor`:cue/rows 全字段表单、清洁脚本摘要、模板/预览/播放链；保存 round-trip fixture 改为
    canonical。
  - `projects/pal` + `packages/migrate/baselines/pal`:全量重生成；`projects/demo` 改为 canonical。
  - `docs/phase2`:model-design、content-schema、capability-map 与独立迁移审计。
- 实现摘要:
  - `$NN/~NN/-/'/@/"/()/\` 只由 `packages/migrate/src/legacy-dialog.ts` 解码；用户选择 A 将 decoder 的
    `-` 缺省语义定为 cyan toggle,但可达对话语料零命中。原始 18 处 `-` 均属 0xA7 道具描述块,
    不经过对话管线,在 `items.json` 中保留字面负号才是忠实结果。
  - 原始每条 showDialog 变成独立 row；`~` 在当前位置切 cue；速度与自动推进写真实毫秒。颜色状态、速度、
    speaker、slot、portrait 跨连续行与脚本控制流传播；同文本异入口态使用内容哈希变体 id。
  - 分支臂 memo key 与 ScriptRegistry id 都包含入口对话态；callScript 离开态回传调用方，已有专项回归。
  - 新 locale 禁止 CR/LF；旧作者工程只在 loader 边界保留软换行读取豁免，保存产物只写 cue。
  - 全 PAL 829 个 content JSON 中共 6,858 条 dialog / 14,200 rows，非 canonical 0；8,637 个正文
    text id 的旧控制字符、换行和非平衡标签均为 0；确定性变体 26。
- 运行命令:
  - `pnpm --filter @type-pal/migrate run migrate:content`（dry-run）:829 托管文件、294 场景、297 chunks；
    `writes=276 deletes=0 conflicts=0`，脚本 compact/pretty/command 比 `1.65x/1.13x/1.53x`，未放宽门禁。
  - 同命令写盘并同步 baseline；二次迁移严格 `writes=0 deletes=0 conflicts=0`。
  - `pnpm -r --workspace-concurrency=1 run check` + `pnpm lint`:7 个工作区包 typecheck + 3,497 项测试通过
    （另 1 项按既有条件跳过），Biome 检查 670 文件无错误。
  - 并发版 `pnpm check` 曾在同轮重型测试并行时触发 migrate/pal-extract/game 的超时；三个包随后分别单跑
    全绿，串行全仓门禁亦全绿，确认不是断言回归。
  - 专项:`legacy-dialog`、`translate-events`、`dialogue-project`、content upgrader、editor
    round-trip/脚本摘要测试均通过。
- 浏览器 / 手工检查:
  - 6051 `?entry=new-game`:连续取帧确认三段自动对白按序出现并自动进入 s001；画面无 `$NN/~NN`，
    speaker/center/bottom 正确，console warning/error 为 0。
  - 6010 s000:脚本树显示清洁正文；第一段表单 `speed=112/auto=342/center`，第三段双 row
    `16/16`、speaker 李逍遥、`auto=685`。
  - 6010 s173:跨源行黄色对白显示清洁摘要；表单保留平衡 `<yellow>…</yellow>` i18n 样式数据，
    `speed=136/auto=800/top` 可读；修复摘要曾直出富文本标签的问题后复验通过。
- 跳过的检查及原因:
  - 自动化会话没有 FSA 工程目录句柄，点击保存会被浏览器系统目录选择器以“非用户手势”拒绝；未产生
    磁盘写入。保存/重开结构由 `project-io` round-trip + loader upgrader 单测覆盖，Opus 用已有句柄补一轮
    真实 UI 保存重开。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: Codex in-app browser 实机访问 6051/6010；开场连续帧 + 编辑器 DOM/表单值 + console 日志。
- 截图 / 像素检查路径: Codex 浏览器会话；临时验收图未写入仓库，避免把二进制证据混入功能提交。
- 结论: Codex 视觉验收通过；旧控制码不显示、自动推进与显式属性一致、编辑器摘要清洁。
- Opus 独立复验(2026-07-15): 通过。方法独立于 Codex(chrome-devtools CDP):6051 开场经页内定时
  `canvas.toDataURL` 捕获 + overlay 回放截图逐段检视——段1 center 慢打字(112ms/字,全角 `～` 字面保留)、
  段2 speaker 李逍遥青名牌快打字(16ms/字)、s001 李大娘立绘+双 row+等键光标,全程零按键(autoAdvance 驱动)、
  画面零控制码、console 零错误/警告;6010 s000 树摘要清洁+表单全字段(行文本/速度/自动推进/位置/光标/立绘)、
  s173 黄色对白摘要清洁且富文本标签零泄漏。
- 保存重开补验(原留予 Opus 的未完成项,已完成): 自动化 profile 无已授权句柄(IndexedDB 空,与 Codex 同墙),
  以 **OPFS 目录句柄**等价替代(同 FileSystemDirectoryHandle API、免授权弹窗):克隆 831 个内容 JSON →
  ?picker 启动屏「打开工程」→ s000 首 cue speed 112→113 → 💾 真实 FSA 写盘 → 整页重载 → 「最近工程」
  重连 → **113 持久、chunk 仍 cue 形态、零 `line` 字段、原始字节零控制码**。旧码不回生 ✓。与真实磁盘
  句柄差异仅存储后端,API 面等价;测试目录与句柄记录已清理。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: **Codex、Opus、GLM 三方 accept**；D1 已经 GLM 独立复核通过。
- 必须返工项: 无。D1 已完成并验收(审计文档与 Build 摘要已区分 decoder 策略和 0xA7 道具描述
  实际路径；产物本身正确且忠实,未改实现)。
- 独立发现(非本卡范围,建议另开 lite 卡): **F1** 同 id 工程切换不重挂 App——`main.tsx` 以
  `key={manifest.id}` 挂 App,「打开工程」换到同 id 工程(pal→pal 克隆)时 React 不重建组件,
  `dirHandleRef/snapshotRef` 残留旧会话:保存时**再弹一次目录选择器**、zip 导出误判"无文件夹"。
  实测复现(种子 pal → OPFS pal 克隆);经 ?picker 启动屏全新挂载则一切正常。P4 期既有问题,
  4b215279 未触碰该文件,不阻塞本卡。
- Accept / rework: **accept**。
- Opus 自我修正(公开记录): 本卡设计期 R3 的前提陈述——"按一阶段解析器语义 18 处 `-` 会被当 cyan toggle
  消费"——**对这些站点不成立**:它们经由道具描述渲染路径(script-desc.ts 原文直画),从不进 parseDialogText。
  用户据此做出的 A 裁决实际是"decoder 缺省策略"决定(零语料命中),而非 18 站点的实际迁移方式;
  道具菜单里负号可见才是原版/一阶段真实观感。该前提错误由我在设计期引入,与 R2 卡 M3 期结论修正同格式
  记录在案。

## 用户验收

- 用户结论: **accept（2026-07-15）**。
- 后续任务: X3-1 场景入场呈现事务。

## 交接日志

- 2026-07-14 Codex: 复核设计文档、迁移器、runtime、editor 和 PAL 产物；确认运行时解析器是对已拍板
  架构的倒退，且当前结构无法表达批内多速度。建立 cue + rows 提案并签 agree。Evidence: 本卡基线统计。
  Next: Opus 做 schema/运行时设计主审；不得实现。
- 2026-07-14 Opus: 设计主审签 **agree + R1-R4 必改 + S1-S2 建议**。独立重验:卡内全部基线数字吻合
  (113/107/240/27、6,722/1,234、2,392 join 值、开场三段换算逐条对上);新证据 `$NN` 位置分类
  行首103/末字后10/**行中0** —— rows 模型 100% 覆盖 PAL,无一真·中途变速;dlg.9831/9832 跨值黄色实证
  stateful decoder 必要;`~` 页终真值支持 cue 级 autoAdvance。R1=`"` slot 依赖(仅普通对话变黄,narration
  只消费);R2=`~` 后 `$NN` 死码不得污染状态(两形态实测并存);R3=18 处 `-` 全为属性±N 负号,须考证原版
  渲染后交用户裁决 toggle/literal;R4=`\n` 政策(PAL 重生成去 join、新内容禁 `\n`、升级豁免)。同批完成
  X3-1 设计主审(agree + X-R1~X-R4,见该卡)。Evidence: 两卡主审立场 + 本人核验脚本输出。
  Next: GLM 覆盖/测试矩阵复核(两卡一并);三签齐后 Codex build,顺序 N1-1 优先。未改实现文件。
- 2026-07-15 GLM: 设计复核签 **agree**。六项独立实测：(1)基线 113/107/240/27(拆17+10)/6722/2392 全吻合,12vs9=定义口径不同(6值含>1`$NN`),行中=0 依赖`\u3000`非可见(N1 build必落);(2)测试矩阵对照 parseDialogText:98-180 全分支方向完整,R1`"`slot依赖/R2`~`后死码两形态/R3专项全落表;(3)R3 材料 18处`-`全站点备齐(全属性±N,cmd39926-40790范围,一阶段:121-123无条件cyan toggle),裁决(A)忠实toggle vs(B)literal备齐交用户;(4)variant id 确定性需补正序/逆序测试(N2);(5)parseDialogText真值复核与Opus一致。N1(`\u3000`约定)/N2(variant确定性)/N3(1234交叉口径)非阻塞。Evidence: 设计签字GLM行。Next: 三签齐已 build allowed,N1-1优先;交 Codex build。未改实现文件。
- 2026-07-15 Codex: build 完成并签 review accept。唯一 cue/rows schema、旧工程 upgrader、有状态迁移 decoder、
  goto/callScript 状态传播、runtime/editor 单路消费、全 PAL/baseline 重生成均已落地；`pnpm check` 全绿，
  MG2 二跑零计划，PAL 旧控制字符/旧 line/换行/坏标签全为 0。6051 开场与 6010 s000/s173 实机复验
  通过；FSA 真实保存重开因自动化会话无目录句柄交 Opus 补验。Evidence:本卡 Build/视觉记录 +
  `docs/phase2/foundation/n1-dialogue-migration-audit.md`。Next:Opus 代码/架构/视觉主审；不得标 done。
- 2026-07-15 Opus: review 主审签 **accept + D1 文档必改 + F1 独立发现**。代码面:decoder 八分支逐项对照
  一阶段真值(R1 quote-slot/R2 `~`后死码/U+3000/fail-loud 全落地),状态传播三通道(goto/分支/callScript)+
  registry 状态哈希+出口回传全验,变体 id 内容哈希构造性与序无关;数据面:8,637 值 0 残留、变体 26、
  开场三 cue 精确、9831/9832 跨值黄实证;门禁面:四包测试独立重跑全绿+MG2 dry-run 零计划;视觉面:6051
  三段零按键零控制码、6010 s000/s173 清洁;保存重开以 OPFS 句柄等价完成(113 持久/cue/零码回生)。
  **D1**:审计文档:45"18 处 `-` 迁为 cyan"与产物不符(0 个 cyan 值)——17 站点属 0xA7 道具描述族,
  经 C3 期道具管线入 items.json 字面负号,且一阶段 script-desc.ts 原文直画=忠实,产物正确、文档须改。
  **公开修正本人设计期 R3 前提**("会被当 cyan toggle"对这些站点不成立,desc 不经 parseDialogText);
  用户 A 裁决实际约束 decoder 缺省(已实现已测,语料零命中)。**F1**(非本卡,建议 lite 卡):main.tsx
  `key={manifest.id}` 同 id 工程切换不重挂 App,dirHandleRef/snapshotRef 残留 → 保存二次弹选夹/zip 误判,
  实测复现,P4 期既有。Evidence:done 前签字 Opus 行+视觉记录+Review 节。Next:Codex 落 D1(两处文档行);
  GLM 覆盖复核;不得标 done(仍需 GLM+用户验收)。未改实现文件。
- 2026-07-15 Codex: D1 文档返工已落地。独立重扫 `data/extracted/events/all.json` 得 18 个 `-`/17 站点,
  地址 39926–40790 且全部位于 0xA7 道具描述块；`walkDesc`、一阶段 `script-desc.ts` 与 `items.json`
  共同确认其走菜单原文直绘、不进对话 decoder。已修正迁移审计与 Build 摘要,未改实现或生成产物。
  Evidence: `docs/phase2/foundation/n1-dialogue-migration-audit.md`「残留与合法性」+ 本卡 Build 摘要。
  Next: GLM 覆盖/测试矩阵复核并签最后一签；不得标 done。
- 2026-07-15 GLM: done 前覆盖复验签 **accept**。六项独立实测+四包 841 pass：(1)产物口径 8637 textid/26变体/125 yellow/**0 cyan**/0控制码全精确匹配；dialog 6723 scripts+135 enemy=6858 口径差异=统计边界；(2)N1 U+3000 docblock(:64-69)+emit+专测(:29-35)/N2 变体正逆序(:59-70,FNV-1a内容哈希)/N3 迁移前口径表(audit:13-17 6722/1234+135/12=6857/1246)全落地；(3)**D1 文档修正已到位且经独立复核**——audit:45-48 现文准确("decoder政策...可达语料零命中...17站点属0xA7道具描述块不经对话decoder...字面负号原样保留=忠实")，items.json 17 item含字面`-`(id 129/153-162/167/175/185/211-218/255)，0xA7=noop(translate-events:1054)，script-desc.ts:30-38原文直画；(4)legacy-dialog.test 八用例对照parseDialogText全分支无漏(R1`"`slot/R2`~`后死码两形态/三色toggle/U+3000/fail-loud/转义光标/变体确定性)；(5)敌人135 dialog同decoder同门禁产物0码；(6)MG2 writes=0+门禁1.65x/1.13x/1.53x。D1返工复核通过无返工项。Evidence: done 准入 GLM 行。Next: 三签齐+D1落地，交用户验收。未改实现文件。
- 2026-07-15 Codex: 用户明确验收通过。三方 done 前签字齐、D1 已复核、无剩余返工；任务状态转 `done`,
  从进行中看板移除并将 capability N1 标记完成。Next: N1-1 无后续交接；X3-1 按独立任务卡推进。

## 下一位 Agent 提示词

无下一位 Agent 提示词：N1-1 已完成三方审查与用户验收并正式 `done`。后续 X3-1 使用其独立任务卡推进。
