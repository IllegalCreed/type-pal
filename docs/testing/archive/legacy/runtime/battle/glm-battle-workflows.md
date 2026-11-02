# TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r5 窄返工）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-BATTLE-WORKFLOWS-1 GLM r5 窄返工实施回执（r4 候选 d9fb606e 被 Codex counter：N1/N2/N4 与 N3 其余合同已闭唯一业务残项=合击队友消费另两处计数勘误；本回执 r5 候选只补该消费回归并同步勘误已关闭项不重开；r1 设计三签保持未重签；Coding Owner GLM 分支 codex/glm-battle-workflows-r1 合入主线 16ba5e02@d5b43a92）。

## Scope

- 生产零改动（真四目标命令）：git diff 57dda7ed..HEAD 对 battle-session/battle-core/battle-anim/enemy-hook-runtime 四文件输出为空（开发期自检曾临时变异 battle-core.ts 消费门验证新断言红验证后还原并核零 diff）。

## Execution and assertions

- **交付 46 项**：6 测试文件：selection 14（r4 13+1）/round 6/action 6/script 8/terminal 6/writeback 6；新增仅 1 例「合击消费非施法队友行动（活敌场景）：敌存活回菜单，p2 无多余普攻、合击恰一次」；3 fixture+2 工具同 r4 路径零移动
- **合击消费残项闭合**：r4 一击致胜用例改为成本正控（标题去掉「队友普攻被消费」过宽宣称；施法者无普攻行只说明施法者本不走普攻）[91,91] 精确断言保留；新用例：敌 health 5000 存活 p1 ArrowRight+确认发起全体合击（p2 被填占位动作→全员交招）一轮真实结束回菜单后断言合体技行恰 1、无 p2 开头普攻行（非施法队友行动被消费——合同核心观察对象）、无 p1 普攻行、survivor 敌行动行存在（会话真实推进非卡死）；自检：battle-core.ts:1888 消费门改 false && 后本用例以 p2 多余普攻行业务红（与 Codex 活敌 oracle 同向）；产品已还原四目标零 diff
- **两处计数勘误**：判据自测数：r4 称「自测 12 类」实际 assert.equal(judge(...)) 为 11 条（mutants.mjs:228/229/239/249/254/274/301/303/330/331/336 其余 assert 为运行时守卫非自测）本版按 11 如实不发明第 12 类；相邻范围：r2-r4 的「相邻 src/battle/ 19 文件」来自带尾斜杠命令（仅匹配 battle 目录）；Codex 用无尾斜杠（子串过滤另含 4 个 battle-trial 测试）两数都真实但范围不同——本版起以无尾斜杠全范围为准：23 文件 333/333（r4 树同命令 23/332 +1 即新增消费用例）；r4 另两处勘误（分支净增 +44B、精灵 guard 落会话入口）保持已修正
- **负控与验证总账**：定向 6 文件 46/46；相邻无尾斜杠 23 文件 333/333；全 reforge 158 文件 1,460/1,460（r4 1,459+1）；TC rc0；Biome 改动文件 rc0；负控 6 正控+10 针全 detected（证据目录 /var/folders/…/bw1-mutants-vfFyQZ/）；消费门移除变异由本席开发期自检复红；覆盖率同口径 before/after 见机账（仅 /tmp）

## Results

- 剩余与归属：session render 段（~189 行）仍归视觉/渲染侧；组合状态/anim 演出臂/hook 剩余保留分母；Codex r1-r4 冻结见证工具零改动 r4 见证对 r5 由 Codex 自行复跑（其 oracle 与本包新用例同向）。

## Evidence

- 证据路径：本回执正文（quote 保全）；机账链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r5 窄返工 | 2026-09-24 | +1 消费回归+两勘误 | Codex 接受（后续统一集成 done） | r4 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/battle 的 GLM r5 实施回执；固定来源与 source SHA 见下方保全节。

## 原始结论

r5：合击消费活敌回归（p2 无多余普攻+合击恰一次+敌真实行动）+判据自测 11 非 12+相邻命令带/无尾斜杠范围差异澄清；四目标生产零改动。

## 当时证据

新用例断言、两勘误与验证总账在 quote 保全。

## 当前有效性

historical。r5 后续由统一集成收口 done。

## 继任文档

当前结论归 TEST-BATTLE-WORKFLOWS-1 完成卡。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `ad320f5882b5f321164102b9b7f62d0ae8f2196b91bb50373ce50b555b8a8327`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r5 窄返工）
>
> 任务卡：[TEST-BATTLE-WORKFLOWS-1](../../../../../ops/archive/tasks/done/TEST-BATTLE-WORKFLOWS-1-session-flows.md)（r1 设计三签保持，
> 未重签）。r4 候选 d9fb606e 被 Codex counter（[r4 独立复核](battle-workflows-r4-review.md)：N1/N2/N4 与
> N3 其余合同已闭，唯一业务残项=合击队友消费，另两处计数勘误）；本回执为 **r5 候选**，只补该消费回归
> 并同步勘误。已关闭项一律不重开。
> Coding Owner：GLM。分支 `codex/glm-battle-workflows-r1`（合入主线 16ba5e02 @d5b43a92）。
> 机账：[glm-battle-workflows-evidence.json](glm-battle-workflows-evidence.json)。
>
> ## 生产零改动（真四目标命令）
>
> `git diff 57dda7ed..HEAD -- packages/reforge/src/battle/battle-session.ts packages/reforge/src/battle/battle-core.ts packages/reforge/src/battle/battle-anim.ts packages/reforge/src/battle/enemy-hook-runtime.ts` 输出为空。
> （开发期自检曾临时变异 battle-core.ts 消费门验证新断言红，验证后还原并核零 diff。）
>
> ## 交付（白名单内 9 代码文件 + 2 工具，46 项）
>
> - 6 个测试文件：selection **14**（r4 13 +1）/ round 6 / action 6 / script 8 / terminal 6 / writeback 6
>   = **46**。新增仅 1 例：`合击消费非施法队友行动（活敌场景）：敌存活回菜单，p2 无多余普攻、合击恰一次`。
> - 3 个 fixture、2 个工具同 r4 路径零移动。
>
> ## r4 唯一残项｜合击消费非施法队友行动（活敌公开会话回归）
>
> - r4 的一击致胜用例改为**成本正控**（标题去掉"队友普攻被消费"过宽宣称；施法者无普攻行只说明施法者
>   本不走普攻），`[91,91]` 精确断言保留。
> - 新用例：敌 health 5000 存活；p1 ArrowRight+确认发起全体合击（p2 被填占位动作→全员交招）；一轮真实
>   结束回菜单后断言：`合体技 ` 行**恰 1**、**无 `p2 ` 开头的普攻行**（非施法队友的行动被消费——这是
>   本合同的核心观察对象）、无 `p1 ` 普攻行、`survivor ` 敌行动行存在（会话真实推进非卡死）。
> - 自检：把 battle-core.ts:1888 消费门改为 `false &&` 原条件后，本用例以"p2 多余普攻行出现"业务红
>   （与 Codex 活敌 oracle 同向）；产品已还原、四目标零 diff。
>
> ## 两处计数勘误（Codex r4 复核）
>
> 1. **判据自测数**：r4 回执/机账称"自测 12 类"，实际 `assert.equal(judge(...))` 为 **11** 条
>    （mutants.mjs:228/229/239/249/254/274/301/303/330/331/336；其余 assert 为运行时守卫非自测）。
>    本版按 11 如实记录，不发明第 12 类。
> 2. **相邻范围/命令**：r2～r4 回执的"相邻 `src/battle/` 19 文件"来自**带尾斜杠命令**
>    `npx vitest run src/battle/`（仅匹配 battle 目录）；Codex 复核用**无尾斜杠**
>    `pnpm --filter @type-pal/reforge exec vitest run src/battle`（子串过滤，另含
>    `src/battle-trial-{assets,config,config.wave2,prepare.wave2}.test.ts` 4 文件）。两数都真实但范围不同；
>    本版起以无尾斜杠全范围为准并记录完整命令。r5 实测：**23 文件 333/333**（r4 树上同命令为 23/332，
>    +1 即本次新增消费用例）。
>
> （r4 的另两处勘误——分支净增 +44B、精灵 guard 落到会话入口——保持已修正状态，不再列。）
>
> ## 负控与验证总账（最终树）
>
> - 定向 6 文件 **46/46**（14/6/6/8/6/6）。
> - 相邻 `pnpm --filter @type-pal/reforge exec vitest run src/battle`：**23 文件 333/333**。
> - 全 reforge **158 文件 1460/1460**（r4 1459 + 新增 1）；TC rc0；Biome 改动文件 rc0。
> - 负控 **6 正控 + 10 针全 detected**（证据目录
>   `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/bw1-mutants-vfFyQZ/`）；消费门移除变异由本席
>   开发期自检复红。
> - 覆盖率同口径 before/after 见机账（输出仅 /tmp）。
>
> ## 剩余与归属
>
> - session render 段（~189 行）仍归视觉/渲染侧；组合状态/anim 演出臂/hook 剩余保留分母。
> - Codex r1/r2/r3/r4 冻结见证工具零改动；r4 见证对 r5 由 Codex 自行复跑（其 oracle 与本包新用例同向）。
>
<!-- original-source-quote:end -->
