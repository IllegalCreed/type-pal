# DOC-CURSOR-3 — 覆盖率说明定点核对回执

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 DOC-CURSOR-3 的 Cursor 只读取证回执（工作树起点/证据树 `a2415868`；未运行覆盖率/ratchet/full/全仓测试/E2E/迁移/部署，未授权修改 coverage.md/README/脚本/CI/基线）：C01–C05 五组核验完成，合计确定不符 2 / 日期历史仍正确 6 / 待证 1 / 已有证据 1——不存在的问题不凑数。

## Scope

- 开卡基点 817be7df 的 8,039/641 线索已过时（见 C02-3 待证）；本地 summary 只标「本地快照」；脚本存在≠运行成功。

## Execution and assertions

- **C01 命令**：package.json:6,12-15 与 run.mjs:41-58；coverage:fast 写 fast 报告不写基线（无基线直接失败要求先 ratchet :485-486）；full 直接 --ratchet+full exit2（:52-54）；ratchet 仅提升/范围变化时写 baseline.fast.json（:508-517）；check 只含覆盖率工具自测不含 coverage:fast；C01-1/2 维护命令四条与「check→ratchet→受保护 strict」仪式句均日期历史仍正确不改
- **C02 快照**：coverage.md:14-30 A3-a 标「最新本地实测」8008/639 vs 入库 baseline.fast.json（08:55:15Z）与本地 summary（08:59:34Z）均 8090/641、四维 77.93/75.75/75.56/68.17%，七包 scope/exec digest 逐包相同；C02-1 确定不符：不改 8008 数字，A3-a 节改「历史本地实测」，文首加「最新本地实测」指向 grok-present-integration 与 baseline 的 8090/641 并声明非远端 CI/full/E2E；C02-2 日期历史表不改；C02-3 开卡 8039/641@05:37:55Z 现已不存在待证不写入正文
- **C03 范围**：scripts/coverage/config.mjs 七包；生产 include src/**/*.{ts,tsx}；fast 追加 fastPalTestGlobs+fastTestExcludes，full 不追加但要求 raw/extracted/PAL 合同输入（run.mjs:140-148）；C03-1/2 七包表头与 full=fast+PAL 真数据句日期历史仍正确
- **C04/C05**：README.md:55-56「当前数字见 coverage.md」会把读者带到 8008（确定不符，改「带日期的实测快照…文首最新节须与 baseline 对齐」不手抄 8090）；testing/README:129 索引与 :11 Grok 8090 已写日期历史仍正确；C05-1 C10 CI 映射（coverage.yml:1-54 触发/Node22/pnpm10.29.2/BASE_REF/artifact）已有证据不重报

## Results

- 待证清单：8,039 快照来源未核；8,090/641 未核对远端 Coverage workflow run不得写成 CI 已通过；未读 coverage/full/summary.json。
- 给 Codex 的可执行修订仅建议（本候选不改这些文件）；交付相对 a2415868 只新增本回执，分支 codex/cursor-coverage-guide-r1。

## Evidence

- 证据路径：本回执正文（quote 保全）；后续 Codex 接收见 cursor-coverage-guide-review.md（accept，候选已 cherry-pick 0ba9ed14）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| Cursor 取证 | 原文时点 | C01–C05 核验 | 待 Codex 接收（后续已 accept） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的 DOC-CURSOR-3 取证回执；固定来源与 source SHA 见下方保全节。

## 原始结论

五组核验完成：确定不符仅 C02-1（「最新」入口）与 C04-1（README 当前数字指向）；8039 待证；数字不改写只改入口归属。

## 当时证据

五组结果表、C02 三源对照表与修订建议在 quote 保全。

## 当前有效性

historical。快照数字按 a2415868 时点。

## 继任文档

当前覆盖真值归 baseline.fast.json 与官方 ratchet。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `eed4ff0b1c8e33459baf6be82fe79363fd780d2e0971c5bb544db90b5a0b9c2a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # DOC-CURSOR-3 — 覆盖率说明定点核对回执
>
> 状态：Cursor 已完成 C01–C05 只读取证；待 Codex 独立接收。未授权修改 `coverage.md`、README、脚本、CI 或基线。
> 任务：[DOC-CURSOR-3](../../../../../ops/archive/tasks/done/DOC-CURSOR-3-coverage-guide-audit.md)。
> 工作树起点 / 证据树：`a2415868`（当前 `origin/main`；开卡基点 `817be7df` 的 8039/641 线索已过时，见 C02）。
> 未运行覆盖率、ratchet、full、全仓测试、E2E、迁移或部署。脚本存在 ≠ 运行成功；本地 `coverage/fast/summary.json` 只标「本地快照」。
>
> ## 检查完成情况
>
> | 组 | 结果 | 确定不符 | 日期历史仍正确 | 待证 | 已有证据 |
> |---|---|---:|---:|---:|---:|
> | C01 命令 | 已核 | 0 | 2 | 0 | 0 |
> | C02 快照 | 已核 | 1 | 1 | 1 | 0 |
> | C03 范围 | 已核 | 0 | 2 | 0 | 0 |
> | C04 入口 | 已核 | 1 | 1 | 0 | 0 |
> | C05 既有证据 | 已核 | 0 | 0 | 0 | 1 |
> | **合计** | | **2** | **6** | **1** | **1** |
>
> 不存在的问题不凑数。DOC-CURSOR-1 的 N2（时点统计表不改）仍然成立：本包只动「最新/当前」入口句，不建议改写 A3-a 或更早日期段的数字。
>
> ## C01 命令
>
> 现行定义（仓库根 cwd）：
>
> | 命令 | 定义 | 写报告 | 写基线 |
> |---|---|---|---|
> | `pnpm coverage:fast` | `package.json:13` → `test:coverage-tools` + `node scripts/coverage/run.mjs fast` | 写 `coverage/fast/summary.json` 与各包 `coverage-summary.json`（`run.mjs:445-475`） | 否；无基线时直接失败并要求先 `coverage:ratchet`（`:485-486`） |
> | `pnpm coverage:full` | `package.json:14` → `run.mjs full` | 写 `coverage/full/**` | 否；`--ratchet` + `full` 直接 exit 2（`:52-54`） |
> | `pnpm coverage:ratchet` | `package.json:15` → `run.mjs fast --ratchet` | 同 fast | 仅在有提升或范围变化时写 `scripts/coverage/baseline.fast.json`（`:508-517`） |
> | `pnpm check` | `package.json:6`：`check:docs` + 覆盖率**工具**自测 + 各包 `check` + lint | 不写覆盖率报告 | 否 |
> | `pnpm check:docs` | `package.json:12`：`test:docs-tools` + `node scripts/docs/check.mjs` | 否 | 否 |
>
> `run.mjs:41-58` 只接受 `fast|full` 与 `--ratchet` / `--allow-scope-removal`；后者必须与 `--ratchet` 同用。子进程 `cwd` 为仓库根（`:68`）。CI 在 PR/main push 上跑 `coverage:fast` 并设 `TYPE_PAL_COVERAGE_BASE_REF`（`.github/workflows/coverage.yml:35-43`），映射见前批 C10，不重报。
>
> | ID | 原文 file:line | 现行定义/报告 | 分类 | 替换句或不改理由 |
> |---|---|---|---|---|
> | C01-1 | `docs/testing/archive/legacy/quality/quality-gates/coverage.md:700-714` 维护命令四条 | 与根脚本及 `run.mjs` 旗标一致；ratchet 仅维护者在真实提升后更新基线 | 日期历史仍正确 | 不改。可保留「不要手改基线计数」。 |
> | C01-2 | `README.md:163-170`；`coverage.md:12`「check→官方ratchet→受保护单次strict-fast」 | `check` 不含 `coverage:fast`；批次仪式与 `run.mjs` / CI 保护基线一致 | 日期历史仍正确 | 不改。勿把完整 `pnpm check` 项数写成 fast/full 覆盖率。 |
>
> ## C02 快照
>
> 对照字段（本机未跑覆盖率，只读现成 JSON）：
>
> | 来源 | generatedAt | testCount | sourceFileCount | 全仓行/语句/函数/分支 |
> |---|---|---:|---:|---|
> | `coverage.md:14-30` 标题「最新本地实测」A3-a | 文内 2026-09-25 · 8eb93bb7 | 8008 | 639 | 77.43% / 75.24% / 75.23% / 67.82% |
> | 入库 `scripts/coverage/baseline.fast.json` | `2026-09-25T08:55:15.265Z` | 8090 | 641 | 54995/70570 · 61069/80617 · 11360/15034 · 43067/63176（77.93 / 75.75 / 75.56 / 68.17） |
> | 本地快照 `/Users/zhangxu/illegal/type-pal/coverage/fast/summary.json` | `2026-09-25T08:59:34.208Z` | 8090 | 641 | 与基线四维计数、七包 `scopeDigest` / `executionDigest` 全同 |
> | [Grok 正式接入](grok-present-integration.md:19-21) | 同日 `5fc04913` / `ec2bf0f7` | 8090 | 641 | 与上表同一套正式 fast 数字；文内写明未跑 full/远端替代 |
>
> 开卡写的本地 `2026-09-25T05:37:55.300Z` / 8039/641 在当前工作树和 main checkout 的 summary 中已不存在，不能当现报。
>
> 七包 scope/exec digest 本地快照与入库基线逐包相同，因此 8090/641 **可与当前提交基线比较**；这仍是本地/入库 fast 快照，**不是**远端 CI 绿或用户发布百分比。
>
> | ID | 原文 file:line | 现行定义/报告 | 分类 | 替换句或不改理由 |
> |---|---|---|---|---|
> | C02-1 | `coverage.md:14`「## 最新本地实测（2026-09-25 · A3首段帧调度/输入）」及 `:19,30` 8008/639 | 标题宣称「最新」，但入库基线与本地 summary 已是 8090/641；A3-a 段数字本身可作该日快照 | 确定不符 | 不要把 8008 改写成 8090。只改入口：把该节标题改为「历史本地实测（2026-09-25 · A3首段帧调度/输入）」。另在文首加一节「最新本地实测」，指向 [Grok 正式接入](../../ops/testing-records/grok-present-integration.md) 与 `baseline.fast.json` 的 **8090 项 / 641 生产文件**（行 77.93% / 语句 75.75% / 函数 75.56% / 分支 68.17%），并写「这是入库 fast 基线与本地 summary 对齐的快照，不是远端 CI、full 或 E2E」。 |
> | C02-2 | `coverage.md:37` 起各「历史本地实测 / 上一批实测」日期表 | 卡面要求按发生时点保留；与现行基线不同不构成错误 | 日期历史仍正确 | 不改 8008/639 及更早表。 |
> | C02-3 | 开卡线索 8039/641 @ `05:37:55.300Z` | 当前 main checkout 的 summary 已是 8090 @ `08:59:34.208Z`；未见该旧文件 | 待证 | 不把 8039 写入正文。若需追旧快照，另从备份/CI artifact 取证。 |
>
> ## C03 范围
>
> `scripts/coverage/config.mjs`：七包 `shared/content/pal-extract/migrate/reforge/game/editor`。生产 `include` 默认 `src/**/*.{ts,tsx}`；pal-extract / migrate 另含脚本 extraFiles。`coverageExcludes` 排除测试与 `.d.ts`。`testSelection` 在 fast 下追加 `fastPalTestGlobs` 与各包 `fastTestExcludes`，full 不追加这些排除，但要求 raw/extracted/PAL 合同输入（`run.mjs:140-148`）。严格比较走本地基线；设 `TYPE_PAL_COVERAGE_BASE_REF` 时再对 git 保护基线做只升不降（`:493-497`）。
>
> | ID | 原文 file:line | 现行定义/报告 | 分类 | 替换句或不改理由 |
> |---|---|---|---|---|
> | C03-1 | `coverage.md:21-30` 七包表头（shared…migrate） | 与 `coveragePackages` 七项 id 一致 | 日期历史仍正确 | 不改包名单。该表数字属 A3-a 快照，随 C02-1 降为历史。 |
> | C03-2 | `coverage.md:706-710` full=fast+PAL 真数据；ratchet 仅在提升后提高基线 | 与 `testSelection` / `assertFullInputs` / `writeBaseline` 一致 | 日期历史仍正确 | 不改。文档未声称 fast 含 `*.pal.test.*` 或 full 写基线，故不另报。 |
>
> ## C04 入口
>
> | ID | 原文 file:line | 现行定义/报告 | 分类 | 替换句或不改理由 |
> |---|---|---|---|---|
> | C04-1 | `README.md:55-56`「fast/full 口径和**当前数字**见 `docs/testing/archive/legacy/quality/quality-gates/coverage.md`」 | 读者会被 `coverage.md:14` 的「最新」带到 8008/639；现行入库数字是 8090/641 | 确定不符 | 改成「fast/full 口径、基线更新规则和**带日期的实测快照**见 `docs/testing/archive/legacy/quality/quality-gates/coverage.md`（文首「最新」节须与 `scripts/coverage/baseline.fast.json` 对齐；历史日期表不是当前基线）」。不在根 README 手抄 8090。 |
> | C04-2 | `docs/testing/README.md:129` 仅列覆盖率说明；`:11` 已写 Grok 正式 fast 8090/641 | 索引未把 A3-a 表标成当前官方结果 | 日期历史仍正确 | 不改。`:15` 已链本回执。 |
>
> ## C05 既有证据
>
> | ID | 原文 file:line | 现行定义/报告 | 分类 | 替换句或不改理由 |
> |---|---|---|---|---|
> | C05-1 | [C10](cursor-docs-wave2.md:246-257)：`coverage.yml` 触发、Node 22、pnpm 10.29.2、`TYPE_PAL_COVERAGE_BASE_REF`、artifact `coverage/fast` | 与当前 `.github/workflows/coverage.yml:1-54`、`run.mjs:493` 仍一致 | 已有证据 | 不重报为新发现。本包未远端触发 CI，不宣称 main 覆盖率 job 已绿。 |
>
> 前批 C10 无与本包冲突的命令映射。DOC-CURSOR-1 只核操作段、明确不审时点表，与 C02-1 入口句修订不冲突。
>
> ## 待证清单
>
> - **C02-3**：开卡记载的 8039/641 @ `2026-09-25T05:37:55.300Z` 本地 summary 现已不在 main checkout；来源未核。
> - 8090/641 **未**核对本席远端 Coverage workflow run；不得写成「CI 已通过」。
> - 未读 `coverage/full/summary.json`（本 worktree 无该报告）；full 与 fast 仍不互相替代。
>
> ## 给 Codex 的可执行修订（仅建议，本候选不改这些文件）
>
> 1. `coverage.md:14`：A3-a 节改称历史；文首按 C02-1 写 8090/641 入库 fast 快照，并链 `grok-present-integration.md` 与 `baseline.fast.json`。
> 2. `README.md:55-56`：按 C04-1 去掉「当前数字」暗示。
> 3. 不改历史日期表、不改命令块、不改脚本/基线/CI。
>
> ## 交付验证
>
> - 相对 `a2415868` 只新增本回执。
> - 分支：`codex/cursor-coverage-guide-r1`（worktree `/Users/zhangxu/illegal/type-pal-cursor-coverage`）。
> - 未改 `coverage.md` / README / 脚本 / CI / 基线 / 其它任务卡。
>
<!-- original-source-quote:end -->
