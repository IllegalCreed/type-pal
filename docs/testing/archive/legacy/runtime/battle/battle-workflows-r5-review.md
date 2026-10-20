# TEST-BATTLE-WORKFLOWS-1 r5 独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-BATTLE-WORKFLOWS-1 r5 独立接收（2026-09-24 Codex；候选 fd4efd76…b8d5a 设计 r1 保持）：**accept（实现接收）**——r4 唯一业务残项与两处计数勘误均闭合无新增 counter；此签不代表已集成/官方统计门禁通过/done；接收时 Kimi 额度耗尽终审 pending 同日用户明确「豁免他了」任务卡登记仅本候选终审缺签豁免不伪记 Kimi accept；统一质量门另文完成。

## Scope

- 队友消费闭合核：候选 selection-flows:165-201 敌 health=5000 p1 经公开方向键/确认发起合击 p2 非施法队友无私改状态或 mock core；:194/:196/:198/:201 分别钉一轮回 menu、合击恰一次、无 p2 普攻、敌真实行动排除一击致胜掩蔽；:122-162 原用例改名成本正控仍断言 victory 与 [91,91]。

## Execution and assertions

- **消费门见证**：复用冻结 r4 见证只在内存选择前 4 个消费门案例不改历史工具；正常：候选 46/46 绿+独立活敌 oracle 1/1 绿合击后无 p2 普攻；变异（core:1888 消费门 false &&）：候选 45 绿/1 红新增用例自身 AssertionError（:198）+oracle 1 红多出「p2 会心一击 攻击 survivor 造成 108」；唯一替换点与加载路径见证通过测试/产品前后 hash 不变失败非超时环境错误
- **oracle 对齐**：原 oracle 先复跑同向；另一次仅将 oracle 敌身法改候选默认 10、tick 改候选 500ms 对齐输入后仍同向；正常与变异均真实回 menu 合击伤害 35 敌反击 19 一致差异恰是 p2 多余普攻；复建命令（node --input-type=module 三处替换只对齐 oracle 输入不修改候选）在 quote
- **计数勘误接受**：TypeScript AST 实数 mutants 工具 11 个 assert.equal(judge(...)) 自测（行号清单）11 条均调用实际 judge 回执/机账已纠正；无尾斜杠 23 文件/333 项带尾斜杠 19 文件/279 项差 4 个 battle-trial 文件 54 项与回执解释相符（历史 r4 对应 19/278、23/332 本轮各 +1）不把不同子串选择范围混作同口径不将此前差异误判环境失败
- **独立复跑**：定向 6 文件 46/46；全 Reforge 158 文件/1,460；无尾斜杠 23/333、带尾斜杠 19/279；TC exit0；白名单 Biome 12 文件/0；GLM 原工具 6 正控+10 针 detected exit0；r5 相对 r4 的 packages 差异仅 selection-flows 测试；四生产目标相对 57dda7ed 零 diff；旧测试/基线/统计配置/冻结历史见证未改；本人复用 detached 树 GLM 工作树零修改

## Results

- 阶段门与额度：Codex 本席签 accept 原 counter 关闭；GLM 测试贡献者自验不充当独立第三方；本轮只落 Reviewer 席位/证据不合候选不代改 Status；未运行整仓门官方基线仍 7,826/633 不采 GLM 局部增量作全仓并集；用户明确 Kimi 额度耗尽登记 unavailable 接收后同日豁免本候选终审未安排代班未代签——风险缺该席最终实现审查用户已接受补审不再作 done 必需条件不外推其它卡；旧兼容审查 pass；不标 done 不改 full/Q1/Q2 边界；无下一位提示词本轮不转 Kimi。

## Evidence

- 证据路径：本接收正文（quote 保全）；机账与两见证目录（原 oracle+输入对齐）链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r5 接收 | 2026-09-24 | 消费门双跑+两勘误核实 | accept（Kimi 豁免登记；门禁另文） | r4 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/battle 的 r5 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：合击消费双跑同向（候选新用例 :198 红+oracle 多 p2 普攻 108）；计数勘误 11 自测/23vs19 范围澄清；Kimi 豁免如实登记不伪记。

## 当时证据

消费门表、oracle 对齐、复建命令与独立复跑在 quote 保全。

## 当前有效性

historical。accept 后统一集成收口 done。

## 继任文档

当前结论归 TEST-BATTLE-WORKFLOWS-1 完成卡。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `259e7f67ffab8ae9cb5334bef575dba64a27f451c21205075a8204d78116c899`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-BATTLE-WORKFLOWS-1 r5 独立接收
>
> 2026-09-24，Codex；候选 `fd4efd760219a9a945029b3869684b22230b8d5a`，设计 r1 保持。
> **accept（实现接收）**：r4 唯一业务残项与两处计数勘误均闭合，无新增 counter。
> 此签不代表已集成、官方统计门禁通过或 done。接收时Kimi额度耗尽、终审pending；同日用户随后明确
> “豁免他了”，已在任务卡登记仅本候选的终审缺签豁免，不伪记Kimi accept；统一质量门仍待完成。
>
> 本轮只审上述两点；N1/N2/N4 和 N3 已闭子项不重开。证据见[机账](battle-workflows-r5-evidence.json)。
>
> ## 1. 队友消费闭合
>
> 候选 `packages/reforge/src/battle/battle-session.selection-flows.test.ts:165-201`：
>
> - 敌 health=5000，p1 经公开方向键/确认发起合击，p2 是非施法队友；没有私改状态或 mock core。
> - `:194/:196/:198/:201` 分别钉一轮回 menu、合击恰一次、无 **p2** 普攻、敌真实行动，排除原一击致胜掩蔽。
> - `:122-162` 原用例明确改名为成本正控，仍断言 victory 与 `[91,91]`，不再宣称证明队友消费。
>
> 复用冻结 [r4 见证](../../unresolved-tools/battle-workflows-r4-witnesses.mjs)，只在内存选择前4个消费门案例，不改历史工具：
>
> | 实现 | 候选6文件 | 独立活敌 oracle |
> |---|---|---|
> | 正常 | 46/46 绿 | 1/1 绿，合击后无 p2 普攻 |
> | 仅将 core:1888 消费门改为 false && 原条件 | 45绿/1红，**新增用例自身 AssertionError，:198** | 1红，多出 `p2 会心一击 攻击 survivor 造成 108` |
>
> 唯一替换点与加载路径见证通过，测试/产品前后 hash 不变。失败不是超时或环境错误。
> 原 oracle 先复跑同向；另一次仅将 oracle 敌身法改为候选默认10、tick改为候选500ms，对齐输入后仍同向。
> 正常与变异均真实回到 menu，合击伤害35、敌反击19一致，差异恰是 p2 多余普攻。
>
> ## 2. 两处计数勘误接受
>
> - TypeScript AST 实数 mutants 工具中11个 `assert.equal(judge(...))` 自测，行号
>   `228/229/239/249/254/274/301/303/330/331/336`；11条均调用实际 judge。回执/机账已纠正为11。
> - 无尾斜杠命令实跑 **23文件/333项**；带尾斜杠实跑 **19文件/279项**。
>   两者差4个 battle-trial 文件、54项，与回执解释相符。历史r4对应19/278、23/332；本轮各增加1项。
>   不把不同子串选择范围混作同口径，也不将此前差异误判为环境失败。
>
> ## 独立复跑
>
> - 定向6文件 **46/46**（14/6/6/8/6/6）；全Reforge **158文件/1460项**。
> - `pnpm --filter @type-pal/reforge exec vitest run src/battle`：23/333。
> - `pnpm --filter @type-pal/reforge exec vitest run src/battle/`：19/279。
> - Reforge TC exit0；白名单Biome **12文件/0**；GLM原工具 **6正控+10针 detected，exit0**。
> - r5相对r4的 packages 差异仅 selection-flows 测试；四生产目标相对57dda7ed零diff；旧测试、基线、
>   统计配置、冻结历史见证未改。本人复用detached树，GLM工作树零修改。
>
> 复建消费门4个案例（仓库根运行，后两次替换只对齐 oracle 输入，不修改候选）：
>
> ```bash
> node --input-type=module - /Users/zhangxu/illegal/type-pal-battle-review <<'JS'
> import fs from 'node:fs'
> import assert from 'node:assert/strict'
> let source = fs.readFileSync('docs/testing/archive/legacy/unresolved-tools/battle-workflows-r4-witnesses.mjs', 'utf8')
> for (const [from, to] of [
>   ['for (const item of cases) {', 'for (const item of cases.slice(0, 4)) {'],
>   ['attackStrength:1,dexterity:1', 'attackStrength:1'],
>   ['h.idle(100)', 'h.idle(500)'],
> ]) {
>   assert.equal(source.split(from).length, 2)
>   source = source.replace(from, to)
> }
> await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
> JS
> ```
>
> 日志 `/tmp/type-pal-battle-r5-*.log`；见证目录 `battle-workflows-r4-review-E1iWbK`（原oracle）与
> `battle-workflows-r4-review-N4MQ2H`（输入对齐），完整路径/哈希/失败标题在机账。oracle不计候选46项。
>
> ## 阶段门与额度
>
> Codex本席签accept，原counter关闭；GLM是测试贡献者，其自验不充当独立第三方。
> 本轮只落Reviewer席位/证据，不合候选、不代Coding Owner改Status；后续由Codex统一集成和阶段推进。
> 尚未运行整仓check/ratchet/受保护strict-fast，官方基线仍7826/633，不采GLM局部增量作全仓并集。
>
> 用户明确Kimi额度耗尽：登记 unavailable；接收后同日明确豁免本候选终审，未安排代班、未代签。
> 风险是缺少该席最终实现审查，用户已接受；补审不再作为本候选done必需条件，不外推其它卡。
> 旧兼容审查pass（产品未改），统一集成/质量门不因此豁免。
> 不标done，不改full/Q1/Q2边界。
>
> 无下一位Agent提示词，本轮不转Kimi；等待后续统一集成/门禁，再由Codex核定done。
>
<!-- original-source-quote:end -->
