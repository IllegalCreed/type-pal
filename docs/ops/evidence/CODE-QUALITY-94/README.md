# CODE-QUALITY-94 evidence — menu integration

- [2026-10-25当前94–102复审与返工](current-review/README.md)：复用pre94关闭，补19项八维与必要修复；接口裁决及集中门尚未收口。下文为明示日期的历史回执，旧manifest保持冻结，不批量刷新成当前结论。

- [Codex最终完整模块窗口](codex-final-window.md)：两项获批修复、全部真实门、分项非零诊断、官方基线与未闭合边界；JSON机械证据含原件完整性与冻结源码核验。

- [Codex 三验及接手边界](codex-r3-review.md)：候选5477af1e4，监听器泄漏/C4假正例实测、精确退役核对、当前SHA与诊断原件；0新关闭，用户授权Codex继续低风险返工。
- [Codex 接手修复与验证](codex-takeover.md)：测试判别/隔离、注释真值和精确manifest修正，分提交记录与当前质量门。

- [Codex 独立验收 counter](codex-review.md)：原始诊断、注释和测试质量反证，以及 GLM 返工提示词。

`source-manifest.json` 记录独立 main base、治理来源、30条原 closure SHA 与当前候选 SHA。旧卡/原件复制为历史证据，不代替新候选的质量门；CODE95 更正三份非法 fixture，更新后 manifest 必须标明字节已变并重新验证。

所有原始定向/typecheck/check/ratchet/protected-fast/lint/docs/ledger 回执放在本目录；两 source branch 的不同库存/状态分别记录，不将源分支 closed 数量直接搬到 main。

2026-10-15 GLM 逐文件复核结论与四维质量评定见 [glm-review.md](glm-review.md)（30/30、manifest SHA 机械核验、CODE95 三份裁定、E-1/2/3 改进登记）；独立复跑回执为 `glm-targeted.txt`、`glm-typecheck.txt`、`glm-docs.txt`、`glm-lint.txt`、`glm-ledger.txt`、`glm-check.txt`；coverage 门回执为 `glm-protected-fast.txt`（首跑按设计 fail-closed：范围变化+0回退）、`glm-ratchet.txt`（确认新基线）、`glm-protected-fast2.txt`（终跑）。

历史CODE92两份protected日志及当前targeted/typecheck的可读文本仅去行尾空白；同名raw.json保留逐字输出与SHA，不改变历史结果。

2026-10-15 Codex独立验收counter：见codex-review.md/proof.json；原GLM回执存在大量React act与jsdom导航诊断，不计干净统一门。CODE94/95均返工，CODE95完整字段/数组修正不消除真实caller前提counter；30条保持review，未合main。Codex真实定向241与typecheck原件/exit/raw.json同目录。

CODE95补充counter R4：applyAll物品fixture不可冒称真实单体目标入口；局部typed合法性结论已收紧为返工，不增加任何闭合。
2026-10-15 R1–R4 返工（Codex counter 8c951cd7a）：回执 glm-r2-targeted（24files/241tests 零诊断）、glm-r2-typecheck、glm-r2-ledger、glm-r2-docs、glm-r2-lint、glm-r2-ratchet、glm-r2-protected；[codex-review.md](codex-review.md) 为 Codex counter 原件；manifest 已按 reworkCounter 更新 5 文件 SHA。act 警告归属量化见 glm-review.md 返工段（全部 editor 包，game 零贡献）。

- [Codex R2：94/95及97–102再验收](codex-r2-review.md)：分批counter/局部accept、逐文件读取表、三个真实函数反证及GLM提示词。codex-r2-*为独立原件，未覆盖前轮报告。
2026-10-15 C5 返工回执：glm-c5-targeted（36files/326tests 零诊断）、glm-c5-check、glm-c5-ratchet、glm-c5-protected（链式，含 act 警告计数与终态）。manifest 布尔已按当前候选重算（booleanRevision）。
