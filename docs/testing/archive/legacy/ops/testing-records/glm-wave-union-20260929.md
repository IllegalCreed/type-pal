# GLM A–J 测试 wave 并集集成回执（2026-09-29）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 GLM A–J 测试 wave 并集集成回执（集成基点 main 98637364…d9dd，隔离分支 codex/glm-union-intake-r1）：A–E 与 F–J 六条已独立接收候选依次合入无文件冲突；统一门全绿（check exit0/lint 2,749 文件 0/0/0；ratchet+受保护单次 fast exit0 10,659 测试/730 生产文件）；正式覆盖率 78.12% 分支（+448 臂）未达 85%，仍差 4,360 臂。

## Scope

- 六包候选 HEAD：A–E 4e200099…、F c5ecf694…、G fd1189a3…、H 6a25727c…、I 044d3fa4…、J acd67499…（各卡接收结论链接在 quote）。

## Execution and assertions

- **统一门**：集成后 pnpm check exit0（pal-extract 357/game 2,753/Reforge 1,999/migrate 1,008/editor 3,653）；最终 lint 2,749 文件 0/0/0；BASE_REF=origin/main ratchet exit0+同基准单次 fast exit0 与新基线一致零回退；无产品源码/旧测试/include-exclude/官方门规则改动
- **环境首轮红**：隔离树缺 gitignored data/raw/*.MKF、data/extracted 与 projects/pal/assets/migrated：pal-extract ENOENT 红、editor world-sprite-behavior.pal.test 035/044.rle 缺失红；Codex 只在隔离树建指向主树的本地资源链接（不覆盖不入 Git）；先定向复跑 2/2 再从头重跑完整 check 获单次全绿；环境首轮红不记为候选代码通过证据
- **覆盖率**：原 main 基线 10,380 fast→10,659（+279）；分支 49,081→49,529/63,398（+448，77.42%→78.12%）；生产文件 730 不变；包级净增 migrate +80/Reforge +80/game +121/editor +167；85% 至少需 53,889 命中分支当前差 4,360——不把隔离分支百分比相加、不缩范围/降门禁宣称达标
- **视觉与未证**：A–E/F 隔离视觉截图 hash 复核、G 试打/F5/I 菜单高亮已看图，但 G/I browser console 未形成逐条零错误证明（G 1 条 error 未归因、I 未采集）；G/I 保留 review 视觉补验不因集成自动 done；H 的 baseDamage≤0 RNG 消耗序与 physicalResistance=0 偏离仍为未证产品疑点；后续闭合：G favicon 404 URL 级补验消除+其余 8 条可解释（G done）；I 同场景 OpeningMenu 补验全 0（I 可 done，只补视觉不改变覆盖率结论）

## Results

- 新基线 baseline.fast.json SHA256 ea0fcdba…f40c9；A–E 与 F–J 冻结校验器仍用原冻结提交基线字节证派单时口径，不把合法 ratchet 误判成派单漂移（两套 60 源 digest 重核通过）。

## Evidence

- 证据路径：本回执正文（quote 保全）；六卡接收与 G/I console 补验链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 并集集成 | 2026-09-29 | 六候选合入+三门+覆盖率 | 集成完成；85% 未达（差 4,360 臂） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 A-J 并集集成回执；固定来源与 source SHA 见下方保全节。

## 原始结论

六候选统一门全绿；+448 分支至 78.12%；85% 目标明确未完成；G/I console 补验后续闭合。

## 当时证据

覆盖率对照表、环境首轮红处置与视觉未证清单在 quote 保全。

## 当前有效性

historical。集成与覆盖率按当时基点。

## 继任文档

当前结论归官方覆盖账与各 wave 完成卡。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `4c1fe9e3b4e59b496cdc78f28c2bac68882f0e0d36e16a6d5e75970a8b46598f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM A–J 测试 wave 并集集成回执（2026-09-29）
>
> 集成基点：`9863736420a48e9240ef85935e54d37cced6d9dd`（当时 main）。
> 隔离集成分支：`codex/glm-union-intake-r1`；A–E 与 F–J 六条已独立接收候选
> 依次合入，无文件冲突。各卡的代码接收结论见
> [A–E](../../batches/glm-large-wave/codex-accept-r3-4e200099.md)、
> [F](../../batches/glm-new-waves/codex-accept-F-r2-c5ecf694.md)、
> [G](../../batches/glm-new-waves/codex-accept-G-r2-fd1189a3.md)、
> [H](../../batches/glm-new-waves/codex-accept-H-r1-6a25727c.md)、
> [I](../../batches/glm-new-waves/codex-accept-I-r2-044d3fa4.md)、
> [J](../../batches/glm-new-waves/codex-accept-J-r2-acd67499.md)。
>
> | 包 | 最终候选 HEAD |
> |---|---|
> | A–E | `4e200099257ed5167b640eb5abadd7129859dfee` |
> | F | `c5ecf694ed4942a42ecd7e32f5f033e785d47b69` |
> | G | `fd1189a314e96863f052439cd1d33b01f1e2951d` |
> | H | `6a25727ccc0806640f444c01e271207094207ee8` |
> | I | `044d3fa4c525521658c28b4a7a5365098c706d86` |
> | J | `acd67499dc0d7a5e0b1de6fb7df2c7838b021a00` |
>
> ## 统一质量门
>
> - 集成后 `pnpm check` **exit 0**；七包 typecheck/test、docs/coverage/quality/E2E
>   工具测试和最终完整 lint 均通过。主要包测试数：pal-extract 357、game 2753、
>   Reforge 1999、migrate 1008、editor 3653；最终 lint 2749 文件，
>   **0 error / 0 warning / 0 info**。
> - `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:ratchet` **exit 0**；
>   随后同一受保护基准的**单次** `pnpm coverage:fast` **exit 0**，与新基线
>   一致、零回退。fast 10,659 测试 / 730 生产文件；无产品源码、旧测试、
>   include/exclude 或官方门规则改动。
> - 新基线 `scripts/coverage/baseline.fast.json` SHA256
>   `ea0fcdba42f41cf4be5b41c39b15a5c399e7ec0d944d454cdd5b68c07eff40c9`。
>   A–E 与 F–J 的冻结校验器仍用原冻结提交的基线字节证派单时口径，
>   不把这次合法 ratchet 误判成派单漂移；两套 60 源 digest 均重核通过。
> - 首轮集成树缺 gitignored `data/raw/*.MKF`、`data/extracted` 与
>   `projects/pal/assets/migrated`：pal-extract 曾因原始文件 ENOENT 红，editor
>   `world-sprite-behavior.pal.test.ts` 曾因 035/044.rle 缺失红。Codex 只在
>   **隔离集成树**为缺失路径建立指向主树的本地资源链接（无覆盖已有文件、
>   均不入 Git）；先定向复跑这两条 editor 用例 2/2，再从头重跑完整
>   `pnpm check` 获得上述单次全绿。环境首轮红不记为候选代码通过证据。
>
> ## 正式覆盖率：未达 85%
>
> | 指标 | 原 main 基线 | 本次并集严格结果 | 净增 |
> |---|---:|---:|---:|
> | fast 测试 | 10,380 | 10,659 | +279 |
> | 生产文件 | 730 | 730 | 0 |
> | 分支命中/总数 | 49,081/63,398 | **49,529/63,398** | **+448 分支** |
> | 分支覆盖率 | 77.42% | **78.12%** | **+0.71 个百分点** |
>
> 包级净增：migrate +80、Reforge +80、game +121、editor +167；其它包分支
> 命中不变。若分母仍为 63,398，85% 至少需 53,889 个命中分支，当前仍差
> **4,360**。这是本次目标的明确未完成项，不把隔离分支百分比相加、不缩
> 生产范围或降低门禁来宣称达标；后续须重新核真实 caller/旧测与可达性后
> 另开大缺口工作包。
>
> ## 视觉与未证
>
> - A–E/F 的隔离功能视觉截图 hash/代表画面由 Codex 复核；G 的试打/F5/
>   停止恢复画面及 I 的菜单高亮画面亦已看图，但两 wave 的 browser console
>   **未形成逐条零错误证明**：G 尚有 1 条 console error 未能归因，I 未采集
>   历史 console。G/I 任务仍保留 `review` 的视觉补验项，不因代码集成自动
>   标 done，也不冒充完整 E2E。
> - H 回执登记的 baseDamage≤0 RNG 消耗序与 physicalResistance=0 偏离仍为
>   未证产品疑点；本次仅集成测试，不自动授权产品修复。
>
> 后续收口：G 的宿主 favicon 404 已由 Codex
> [URL 级补验](../../batches/glm-new-waves/codex-G-console-closure-20260929.md)定位并消除；
> 试打 console 其余 8 条均是可解释的无存档探测，G 卡已 done。
> I 的菜单 console 历史在统一门当时仍未形成同场景逐条证据，因此曾留 review。
>
> 后续补验：I 已由 Codex 在同一 OpeningMenu 场景从页面加载到 ArrowDown
> 完成[console/光标补验](../../batches/glm-new-waves/codex-I-console-closure-20260929.md)：
> console error、≥400 response、requestfailed、pageerror 全为 0，
> 光标 0→1 与截图一致。I 卡现可 done；本次只补视觉证据，未改变上述
> 覆盖率结果或 85% 未达结论。
>
<!-- original-source-quote:end -->
