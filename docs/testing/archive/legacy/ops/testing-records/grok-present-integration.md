# 一阶段菜单与索引渲染补测 — 正式接入

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 Grok 一阶段菜单/索引渲染补测的正式接入回执（2026-09-25）：隔离候选 503a2d24 经三轮独立复核 C1/C2/C3/C1a 全部闭合后，Codex 选择性移入 packages/game/src/present/__tests__/grok-present/（不合入旧分支树避免逆向差异）；正式提交 5fc04913（测试）+ec2bf0f7（文档/基线），原候选存远端标签 archive/grok-present-r1。

## Scope

- 十个测试文件 25 项：P01 物品列表 4/P02 物品目标 3/P03 装备 2/P04 商店 2/P05 菜单栈 4/P06 仙术 4/P07 角色状态 1/P08 结算 1/P09 背景 2/P10 PNG 2；23 项走真实生产绘制/解码、2 项仅检验共享快照工具（计入清单不冒充业务覆盖）。

## Execution and assertions

- **业务合同**：真实 Framebuffer、菜单公开工厂/确认函数、独立手算像素点、typed 输入；合法索引 0 与透明孔、实时库存数量、两人非顺序 roleId、装备有效属性、商店价与库存、背景 nibble 钳制、PNG 失败后 bitmap.close 均有断言；快照与绘制用同一实际 catalog 数组；可变输入先深拍后比
- **反控与适配**：P02/P05/P10 三针曾在隔离加载下指定业务断言红、磁盘生产源 hash 不变；正式测试只是路径/导入与 Biome 排版适配，断言语义保持；只增 14 个 game 测试/fixture 文件，产品/旧测试/配置/阈值/排除/超时/资产不改
- **统一门**：定向 25/25+typecheck+14 文件 Biome；完整 check exit0（game 2,426/reforge 1,610/migrate 534/editor 2,754）；ratchet 受保护 exit0 恰 +25 项旧测试无删改；单次严格 fast exit0 8,090/641 基线不降；较前基线 8,065：全仓语句 +335/分支 +157/函数 +37/行 +288；全仓行 77.93%/分支 68.17%

## Results

- full/PAL 真实资源、浏览器剧情视觉、Q1/Q2 及完整 E2E 未跑各按原归属；无新产品修复授权；worktree 与分支已清理（历史由标签恢复）。

## Evidence

- 证据路径：本回执正文（quote 保全）；三轮复核见 grok-present-review.md。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 正式接入 | 2026-09-25 | 25 项+三针+三门 | done（5fc04913/ec2bf0f7） | 三轮 counter 闭合 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 Grok 渲染补测接入回执；固定来源与 source SHA 见下方保全节。

## 原始结论

done：25 项（23 真实绘制）+三门 exit0；覆盖四维净增分列；archive 标签保历史。

## 当时证据

十项范围、统一门表与覆盖增量在 quote 保全。

## 当前有效性

historical。接入按当时主线；当前以官方基线为准。

## 继任文档

当前结论归官方覆盖账与后续渲染任务。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `af04288497b2fb5bfc70971a9bf4c523e14fea10205dc87a3f1c010198a4857c`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 一阶段菜单与索引渲染补测 — 正式接入
>
> 2026-09-25。Grok 的隔离候选 `503a2d24` 经 Codex 在[三轮独立复核](grok-present-review.md)中确认 C1/C2/C3/C1a 全部闭合；贡献者自验不充当独立证明。候选分支与 main 的共同基点为 `1763ac58`，直接 Git merge 会把后续已完成的文档、测试与基线形成大量逆向差异，因此本次只把通过验收的测试/fixture 选择性移入 `packages/game/src/present/__tests__/grok-present/`，不合入旧分支树。
>
> ## 正式范围与业务合同
>
> - 十个测试文件 **25 项**：P01物品列表4、P02物品目标3、P03装备2、P04商店2、P05菜单栈4、P06仙术4、P07角色状态1、P08结算1、P09背景2、P10 PNG2。其中**23项走真实生产绘制/解码，2项仅检验共享快照工具**；后两项计入测试清单但不冒充业务覆盖。
> - 用真实 `Framebuffer`、菜单公开工厂/确认函数、独立手算像素点、typed GameState/角色/物品输入。合法索引0与透明孔、实时库存数量、两人非顺序 roleId、装备有效属性、商店价与库存、P06运行时角色投影、背景nibble钳制、PNG失败后的 bitmap.close 均有业务断言。
> - 快照和每次绘制使用同一实际 catalog 数组；各可变输入的尺寸/字节/状态先于 draw 深拍并在调用后比较。Candidate P02/P05/P10 三针曾在隔离加载下使指定业务断言红，磁盘生产源 hash 不变；正式测试只是路径/导入及 Biome 排版适配，断言语义保持。
> - 正式提交 `5fc04913` 只增14个 game 测试/fixture 文件；产品函数、旧测试、配置、阈值、排除、超时、资产与格式均不改。没有借这些全绿宣称一阶段已无 bug，也未做视觉/原版二进制验收。
>
> ## Codex 统一门禁
>
> | 检查 | 结果 |
> |---|---|
> | 定向正式测试 | 25/25；`@type-pal/game` TypeScript、14文件 Biome 均通过 |
> | 完整 `pnpm check` | exit0；game 2426/2426、reforge1610/1610、migrate534/534、editor2754/2754，其余包与文档/工具门通过；全仓lint仅既有warning/info |
> | 官方 `coverage:ratchet` | 以 `TYPE_PAL_COVERAGE_BASE_REF=origin/main` 受保护执行exit0；只新增P01–P10十个fast测试身份、恰+25项，旧测试无删改 |
> | 单次严格 `coverage:fast` | 同一保护基准exit0：**8090项 / 641生产文件**，基线不下降 |
>
> 与前基线8065/641相比，全部生产分母和七包源码集合相同：全仓语句 **60734→61069/80617（+335）**、分支 **42910→43067/63176（+157）**、函数 **11323→11360/15034（+37）**、行 **54707→54995/70570（+288）**。game 分支 **7574→7731/11281**；其它六包无回退。当前全仓行 **77.93%**、语句 **75.75%**、函数 **75.56%**、分支 **68.17%**。这是正式fast实测，不是候选局部数字相加。
>
> full/PAL真实资源、浏览器剧情视觉、Q1/Q2及完整E2E未跑；它们仍各按原任务归属。正式包无新产品修复授权。
>
> 正式接入已推送 `origin/main`（`5fc04913` 测试、`ec2bf0f7` 文档/基线）。原隔离候选保存在远端标签 `archive/grok-present-r1`（指向 `503a2d24`），随后清理了干净的候选 worktree 及本地/远端 `codex/grok-present-tests-r1` 分支；历史仍可由该标签恢复。
>
<!-- original-source-quote:end -->
