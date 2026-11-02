# TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 证据索引（GLM r2）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 的证据索引（GLM r2，r1 被一审反控 runner 判据拒收后重造）：交付物仅新增测试 player-roles.event-boundaries-1.test.ts（PR-NAME-BOUNDARY-1 名称缺省/越表 fail-soft、PR-ELEM-ORDER-1 elemResistance water/earth 键映射判别），产品/旧测/config/baseline/真实数据零 diff。

## 证据身份

- 配套：dedup-ledger.md（7 文件逐轴排重——events 五文件与 scene.ts 全轴 existing-proof/unreachable/blocked，仅 player-roles 2 条真实新合同）；identity.json（2 合同 source/caller/输入/oracle/机读精确 fullName/针位含指定 AssertionError 子串与红相位门）；counterproof.json（r2 runner v2：schema vitest-json-reporter-v2、2/2 针 VALID+13 自测用例全按预期）；run-counterproof.mjs+mutation-logs/（六相位机读 JSON 与 stdout 档案各含 .json 与 .raw）；门证据 adjacent.raw（定向 2/2+相邻 20 文件 206/206）、full-suite.raw（69 文件 417/417）、typecheck.raw、lint.raw（全仓 0/0/0）、docs-gate.raw。

## 来源与输入

- r2 反控口径（判据全部来自 vitest JSON reporter，stdout 只落档）：每相位 vitest run --reporter=json --outputFile=<mkdtemp>（cwd=包根裸 exec）；机读提取计数+完整执行集 file×fullName×status（排序稳定摘要+规范序列化 sha256）；旧 /1 failed/ 文本匹配与「stdout 首行」判据已废除。

## 断言与业务 oracle

- 红相位门：exit!==0&&signal===null&&spawnError===null&&numFailedTests===1&&pending/todo=0&&无 runtime/collection error；唯一失败 fullName 严格===目标（按 title 唯一提取）；failureMessages 恰 1 条 AssertionError 开头且含指定差异子串；红相位跑全文件不 -t 过滤。绿相位门：exit===0&&三失败类 0&&numTotalTests>0&&全 passed&&无 runtime error；restored 与 finalReplay 执行集与 original 逐三元组一致（identity set+sha 相等）。产品源每针记录原始/变异/恢复 sha。

## 结果

- 2 合同交付；main 既有环境观察（coverage 仪表×rng-frames 超时、board/index pin drift 随卡修复）如实登记。

## 限制与复核

- memory 补充：r2 已推 05fc43173（业务面被认可、runner 重造 v2）待 Codex 二审；重建 node run-counterproof.mjs。

## 历史范围

- TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 r2 证据索引（2 合同+r2 runner v2）；固定源 revision 183ec0bf0b7c…。

## 原始结论

- events/scene 全轴 existing-proof/unreachable/blocked；player-roles 两真新。

## 当时证据

- 文件清单与 r2 判据全文在 quote 保全。

## 当前有效性

historical。r2 时点待二审。

## 继任文档

当前结论归任务卡与 Codex 二审记录。

## 原文保全

固定 source revision `183ec0bf0b7ce290bcfa68839e5ce9d29af3245a`，source SHA `bf2310355750be965a3561ee2e9faad387fd1888b3a20785dd0fef882b774d62`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 证据索引（GLM r2）
>
> - 交付物（仅新增测试，产品/旧测/config/baseline/真实数据零 diff）：
>   `packages/pal-extract/src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts`
>   （PR-NAME-BOUNDARY-1 名称缺省/越表 fail-soft、PR-ELEM-ORDER-1 elemResistance water/earth 键映射判别）。
> - 排重账：[dedup-ledger.md](dedup-ledger.md)——7 个范围内文件逐 `source:line × 公开 caller × 合法
>   typed 输入 × 业务 oracle × 旧 fullName` 排重；events 五文件与 scene.ts 全轴 existing-proof /
>   unreachable / blocked（不换数字重测、不为未定政策造绿测），仅 player-roles 2 条真实新合同；
>   含 CLI/extract-videos「明确不做」复核与 main 既有环境观察（coverage 仪表×rng-frames 超时、
>   board/index content-review pin drift 随卡修复）。
> - 身份集：[identity.json](identity.json)——2 合同 source/caller/输入/oracle/机读精确 fullName/
>   针位（含指定 AssertionError 子串与红相位门）与排重依据。
> - 反控（**r2 runner v2**，Codex 一审返工后重造）：[counterproof.json](counterproof.json)
>   （schema `vitest-json-reporter-v2`；2/2 针 VALID + 13 自测用例全按预期）+ 可重放脚本
>   [run-counterproof.mjs](run-counterproof.mjs) + 六相位机读 JSON 与 stdout 档案
>   [mutation-logs/](mutation-logs/)（original / 每针 red+green / final-replay，各含 .json 与 .raw）。
> - 门证据：[adjacent.raw](adjacent.raw)（定向 2/2 + 相邻 events/scene/player-roles/tables 20 文件
>   206/206，双段 exit=0）、[full-suite.raw](full-suite.raw)（pal-extract 全包 69 文件 417/417）、
>   [typecheck.raw](typecheck.raw)（tsc --noEmit exit 0）、[lint.raw](lint.raw)（全仓 0/0/0）、
>   [docs-gate.raw](docs-gate.raw)（check:docs PASS）。
>
> ## 反控口径（r2：判据全部来自 vitest JSON reporter，stdout 只落档）
>
> - 每相位以 `vitest run --reporter=json --outputFile=<mkdtemp 临时树>` 执行（cwd=包根裸 exec），
>   机读 JSON 提取：计数（numFailedTests/numPendingTests/numTodoTests/numTotalTests）+ 完整执行集
>   `file×fullName×status`（排序稳定摘要 + 规范序列化 sha256）。旧 `/1 failed/` 文本匹配与
>   「stdout 首行」判据已废除。
> - **红相位门**：exit!==0 && signal===null && spawnError===null && numFailedTests===1 &&
>   numPendingTests===0 && numTodoTests===0 && 无 runtime/collection error；且唯一失败条目
>   fullName 严格 === 目标合同 fullName（original 执行集按 title 唯一提取），其 failureMessages
>   中恰 1 条以 AssertionError 开头且含指定差异子串。红相位跑**全文件不 -t 过滤**——同时证明
>   针不误伤兄弟测试。
> - **绿相位门**（original / 每针还原后 / final-replay）：exit===0 && 三失败类计数 0 &&
>   numTotalTests>0 && 全 passed && 无 runtime error；restored 与 finalReplay 的完整执行集必须与
>   original 逐三元组一致（identity set + sha 相等）。
> - 产品源每针记录 原始/变异/恢复 sha256（还原字节=原始）；临时树 mkdtemp 在 finally 移除并留
>   存在性证明；清理复核 = 全仓 `git status --porcelain` 仅剩本卡证据/测试/文档新增。
> - **runner 自测反例**（synthetic phase 喂同一验证器，13 例）：两失败 / 错误 fullName / 红相位
>   exit 0 / pending / todo / runtime error / collection error / signal / spawn 失败 / 绿相位带失败
>   ——全部必须被拒；canonical 红/绿正控必须被接收（防验证器恒拒）；identity 漂移必须被检出。
>   任何一步不符即非零退出，不产出合格回执。
>
> ## 范围与不做
>
> - CLI.ts、extract-videos.ts、真实 data/raw|extracted 提取入口：零接触（子进程零覆盖归因是既有
>   结论）；无进程内 import、无真实写盘、无覆盖率凑数。
> - 覆盖率/例数不是完成条件：2 合同为少而精补充，不设数量门槛；未标 done，等待 Codex 独立验收。
> - board.md / tasks/index.md content-review pin：r1 前即 drift（main 7a9157ac5 未刷 pin），按
>   「三 pin drift 随卡修复」判例在 `docs/phase-governance/reviews/20261004-semantic-current-batch.json`
>   做三处 sha 外科替换 + history 头插，未重排 JSON、未改任何文档语义；r2 追加的 board/evidence
>   README 行更新同样随改随刷。
>
> ## r1→r2 返工记录（Codex 一审意见）
>
> 业务测试 2/2 绿、typecheck/docs/lint 通过被认可；反控 runner 不合格（默认 reporter 首行 +
> `/1 failed/` 非锚定匹配、无执行集/严格相位验证/自测反例）。r2 重造 runner v2（上文口径），
> 六相位全部重跑，替换 r1 的四态 raw 命名（r1 版本在 git 历史 aa8de30f3 保留）；合同测试、产品、
> 旧测、config、baseline、真实数据零改动。
>
<!-- original-source-quote:end -->
