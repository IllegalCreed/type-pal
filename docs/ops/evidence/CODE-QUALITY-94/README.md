# CODE-QUALITY-94 evidence — menu integration

- [Codex 独立验收 counter](codex-review.md)：原始诊断、注释和测试质量反证，以及 GLM 返工提示词。

`source-manifest.json` 记录独立 main base、治理来源、30条原 closure SHA 与当前候选 SHA。旧卡/原件复制为历史证据，不代替新候选的质量门；CODE95 更正三份非法 fixture，更新后 manifest 必须标明字节已变并重新验证。

所有原始定向/typecheck/check/ratchet/protected-fast/lint/docs/ledger 回执放在本目录；两 source branch 的不同库存/状态分别记录，不将源分支 closed 数量直接搬到 main。

2026-10-15 GLM 逐文件复核结论与四维质量评定见 [glm-review.md](glm-review.md)（30/30、manifest SHA 机械核验、CODE95 三份裁定、E-1/2/3 改进登记）；独立复跑回执为 `glm-targeted.txt`、`glm-typecheck.txt`、`glm-docs.txt`、`glm-lint.txt`、`glm-ledger.txt`、`glm-check.txt`；coverage 门回执为 `glm-protected-fast.txt`（首跑按设计 fail-closed：范围变化+0回退）、`glm-ratchet.txt`（确认新基线）、`glm-protected-fast2.txt`（终跑）。

历史CODE92两份protected日志及当前targeted/typecheck的可读文本仅去行尾空白；同名raw.json保留逐字输出与SHA，不改变历史结果。

2026-10-15 Codex独立验收counter：见codex-review.md/proof.json；原GLM回执存在大量React act与jsdom导航诊断，不计干净统一门。CODE94/95均返工，CODE95完整字段/数组修正不消除真实caller前提counter；30条保持review，未合main。Codex真实定向241与typecheck原件/exit/raw.json同目录。

CODE95补充counter R4：applyAll物品fixture不可冒称真实单体目标入口；局部typed合法性结论已收紧为返工，不增加任何闭合。
