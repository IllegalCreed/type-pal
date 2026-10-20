# Codex L/M 接收与 N r2 复核（2026-09-30）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 L/M/N 三波并集复核记录：L r3（69b56cc3，15 文件/67 例）与 M r2（b59f1738，12 文件/31 例）独立代码验收 accept 但统一覆盖率门阻塞保持 review；N r2（7bcd0fcd）counter 保持 rework（三处双强转、非法短色板、r1 定向 JSON 未刷新、RC1 三态 hash 不符）。

## Scope

接收分支 codex/glm-lmn-acceptance-r1 基于 main 6750b9a0：L/M 共 98 个不同 fullName 无产品/旧测修改、62 冻结源核验通过；并集首次 check 因新工作树缺 gitignored 原版 MKF 五例 ENOENT，链接主树资源后完整重跑 exit0（content 1222/shared 128/game 2773/pal-extract 357/reforge 1999/editor 3786/migrate 450 合计 10715 例；lint 2724 文件 0/0/0；docs 803 Markdown/4212 链接零问题）。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - 官方 ratchet | env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=6750b9a0 pnpm coverage:ratchet --allow-scope-removal | Codex | exit1：migrate 比率门下降（statements 77.25%→71.85%、lines 78.66%→71.87%）；显式范围删除仅对应已批准退休文件 | 官方 baseline 字节未改；候选 ratchet 实测 10303 例/716 源、全仓分支 78.76% 非正式结算 |

## Results

历史结果（原卡时点，本页未复跑）：

L/M 代码验收 accept 未合 main；统一覆盖率门因 migrate 比率下降阻塞；Editor +215 命中/+5 分母含 main 作者变动不能全归因 L/M；下一步单列 migrate 补测范围不让 L/M 越界返工。

## Evidence

- 证据路径：本复核正文（quote 保全）；/tmp/type-pal-lm-acceptance.BarHmt/ 完整日志与 check.log/check-assets-ready.log 在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| L/M/N 三波复核 | 2026-09-30 | 并集门+独立验收 | L/M accept（coverage 门阻塞）、N counter | r1 各波 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-next-triple 的 L/M/N 并集复核记录；固定来源与 source SHA 见下方保全节。

## 原始结论

L/M 代码验收 accept 未合 main；统一覆盖率门因 migrate 比率下降阻塞；Editor +215 命中/+5 分母含 main 作者变动不能全归因 L/M；下一步单列 migrate 补测范围不让 L/M 越界返工。

## 当时证据

七包并集 check 表、migrate 三指标对照表、日志路径在 quote 保全。

## 当前有效性

historical。复核与门数字为 2026-09-30 时点。

## 继任文档

当前结论归 L/M/N 各自完成卡与现行 coverage 台账。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `da57d359f93e7e6ddc69f8682b87839e048169a84185d78f115f411728d9ddf3`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Codex L/M 接收与 N r2 复核（2026-09-30）
>
> 结论：L r3、M r2 独立代码验收 accept，统一覆盖率门阻塞，保持 review；
> N r2 counter，保持 rework。L/M 测试尚未合 main，三波均未 done 或清树。
>
> - L：`69b56cc388bbd0c0b7632d7ed59154461dd0410b`，15 文件/67 例。
> - M：`b59f1738f56f153a3c6d80b5f7dee1bcf27f7fae`，12 文件/31 例。
> - N：`7bcd0fcdc2c600b2c1ba74ce41d4d4b789b3b826`，三处双强转、非法短色板、
>   r1 定向 JSON 未刷新、RC1 三态 hash 不符；不纳入集成树。
> - 接收分支 `codex/glm-lmn-acceptance-r1`，基于 main `6750b9a0`；
>   L/M 共 98 个不同 fullName，无产品/旧测修改，62 冻结源核验通过。
>
> 详见 [L 卡](../../../../../ops/archive/tasks/done/TEST-GLM-WAVE-L-1-editor-map-scene.md)、
> [M 卡](../../../../../ops/archive/tasks/done/TEST-GLM-WAVE-M-1-editor-data-assets.md)、
> [N 卡](../../../../../ops/archive/tasks/done/TEST-GLM-WAVE-N-1-reforge-runtime-host.md)。
>
> ## 独立执行证据
>
> M 原候选 Editor 493 文件/3684 例、typecheck、lint 2778 文件完整 0/0/0；
> 10 例反控 self-test、四枚原输入/注入副本反控重跑全部通过。
> 候选未被写入，独立反控结果保存于本机临时 `codex-m-counters-Q9azOE/evidence.json`。
> L r3 packages 与已独立测过的 r2 完全相同，区间 diff 13 处尾空行已全部清零，
> 本次 lint 2780 文件完整 0/0/0；两波截图 hash/实际画面证据复核通过。
> N 串行包测 259 文件/2052 例、typecheck/lint 0/0/0 和区间 diff 通过，
> 不替代卡面四项 counter。三候选 docs 各仅缺本波共享导航，由 Codex 接收时维护。
>
> 并集首次 check 因新工作树缺 gitignored 原版 MKF 失败，五例 ENOENT 与两组 skip；
> 保留 `check.log`。链接主树现有 raw/extracted/PAL 资源（不写资产、不改测试）后，
> 完整原命令重跑 `check-assets-ready.log` **exit0**：
>
> | 包 | 文件 | 测试 |
> |---|---:|---:|
> | content | 123 | 1222 |
> | shared | 16 | 128 |
> | game | 243 | 2773 |
> | pal-extract | 59 | 357 |
> | reforge | 248 | 1999 |
> | editor | 510 | 3786 |
> | migrate | 77 | 450 |
>
> 合计 10715 例；root lint 2724 文件、完整 0 error/0 warning/0 info；
> docs 803 Markdown/4212 本地链接/241 卡，零问题；区间 diff 零诊断。
> jsdom navigation 提示原样保留，不冒称所有运行输出静默。
>
> 随后官方命令
> `env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=6750b9a0 pnpm coverage:ratchet --allow-scope-removal`
> **exit1**。显式范围删除仅对应已批准并真正退休的生产/测试文件，不改变 include、
> 排除、超时或覆盖率阈值；实际失败仍是不得下降的比率门：
>
> | migrate 指标 | 旧正式基线 | 实测 |
> |---|---|---|
> | statements | 5965/7722（77.25%） | 1879/2615（71.85%） |
> | branches | 4876/6444（75.67%） | 1368/1814（75.41%） |
> | lines | 5294/6730（78.66%） | 1643/2286（71.87%） |
>
> 官方 baseline 字节未改，protected fast 按串行门停止、未执行。
> ratchet 实测 10303 例/716 生产源；候选全仓分支 46292/58773（78.76%），
> **不是已生效的正式结算**，main 正式基线仍为 49584/63398（78.21%）。
> Editor 实测 23063/28489 对旧 22848/28484，净 +215 命中/+5 分母；同时包括
> 派发后 main 作者工程检查等变动，不能把该差值全部归因 L/M，更不能把孤立 +133 相加。
>
> 完整日志在 `/tmp/type-pal-lm-acceptance.BarHmt/`，失败测量摘要在接收树
> `coverage/fast/summary.json`。保留隔离分支和工作树，未降低规则或重写旧基线。
> 下一步需要单列剩余 migrate 覆盖率补测范围；不是让 L/M 越界返工。
>
<!-- original-source-quote:end -->
