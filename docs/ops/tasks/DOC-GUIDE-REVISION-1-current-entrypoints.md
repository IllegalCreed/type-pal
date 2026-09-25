# DOC-GUIDE-REVISION-1 — 现行指南五文件窄修订准入

Status: build
Owner: Cursor（限定五份指南实施）
Reviewer: Codex（独立验收与集成）
Phase: ops
Capability: 现行文档纠错；不改变能力格
Visual Verification Timing: N/A
Branch: codex/cursor-guide-revision-r1

Revision: r2（用户准入 + 当前委派模式；r1五文件范围不变）
Evidence freeze: a3ceaf05

## 目标与边界

用户要求接收DOC-CURSOR-1后另开修订准入。本卡只列已核实的五份源文档修改；
2026-09-25用户明确回复“准入，我说的”，本轮据此开放限定范围的 `build`。
Cursor回执的六项事实成立，H7/N1经[Codex窄复核](../../testing/cursor-docs-hygiene-review.md)
已在65193a84/320800ec更正并接收。开放实施不等于实现已验收或 `done`。

## 前提真值门

玩法/机制四向矩阵N/A：只让操作文档描述已经存在的脚本/注册表/入口，不改变任何产品行为。
工程前提见接收报告逐项源码锚点：脚本已退役、URL明确拒绝、catalog路径已闭包、模块注册表已有九项。
命令修订另有真实pnpm→tsx→生产参数校验片段的无写盘反证；不改迁移器来兼容错误示例。
最强替代解释是历史描述/旧组件未被页面使用；H7正因这一反证排除，历史统计不随本卡刷新。

## 拟议白名单与验收（仅五份，不重写原十二份）

| 文件 | 拟改范围 | 验收 |
|---|---|---|
| `docs/ops/guides/dev-servers.md` | H1旧e2e/6001入口；H3忽略目录/catalog闭包；N1两处多余`--` | 保留E2E=1 HTTP用途；index.json与二进制分别说明；迁移示例只传--write |
| `docs/ops/guides/browser-verification.md` | H2去掉skill URL，并说明旧试放拒绝 | 不删普通debug入口；不扩大为整本浏览器协议重写 |
| `README.md` | H4把bake拆成维护者engine-chrome说明 | 保留extract/migrate现有正确短写；不改时点统计或开发状态快照 |
| `docs/phase2/specs/editor-architecture.md` | H5模块表、子页标签、左栏说明按EDITOR_MODULES同步 | 精确九项顺序/标签/子页；设计草图及其它架构合同不改 |
| `docs/phase2/guides/debug-tools.md` | H2去掉skill URL；H6真实detached符号；T1删旧URL语义括号 | skill面板命令保留；不宣称其具有模拟器的存档隔离能力 |

`scene-entry-authoring.md`不在白名单。其UI调用域问题后续由Codex核定，不能照未被渲染的ScriptTree
替换所谓“当前文案”；本卡不恢复旧控件、不删旧组件、不升级为产品修复。
另外六份无本批确定修改需求的指南也不改，未宣称这些文档全文正确。

## 验证与禁止事项

- 原回执更正已接收；本卡已由用户明确授权进入 `build`，只有 Cursor 可在独立分支修改上述五份指南。
- 只读命令定义/当前注册表，必要时复用隔离argv探针；不执行真实迁移write或默认recover路径。
- 文档检查及其工具自测、diff白名单、原建议→最终改文逐项对应。无产品/测试/配置/资产/基线改动，
  不跑全仓测试或覆盖率，不将文档门通过写成产品验收。
- 原历史签字、时点覆盖率、E2E/full/Q1/Q2边界保持；Cursor 不合 main，由 Codex 在审查门满足后统一决定集成。

## 当前模式推进记录

- Codex 前提与范围核定：2026-09-25依据接收报告 H1～H6、N1/T1 的直接证据，同意上述五文件窄修；H7 不在本批。实施前不更改产品/UI/命令语义。
- 用户准入：2026-09-25明确回复“准入，我说的”；随后明确当前工作模式为“Codex 分配任务、其他 Agent 执行、Codex 验收”，三贤人固定签字暂时退休。本卡因此**不等待 Kimi/GLM 签字，也不逐卡登记缺签豁免**。
- build 准入：**Codex build allowed**，Coding Owner=Cursor，限定五份指南、独立工作树；其它文档和产品文件不得修改。
- 贡献者交付：pending。Codex 独立复核：pending。done 准入：尚未完成实施/验收；待 Codex 逐项核正文、文档门与白名单后按当前模式收口。纯文档事实修订不要求用户重复做技术复审，新的产品取舍仍交用户。

## 交接

- 2026-09-25 Codex：只建立修订范围与验收，不修改指南。原卡CR-1/CR-2未闭，不请求他席基于错误回执背书。
- 同日窄返工接收后：原卡CR-1/CR-2已闭，此前阻断记录保留为历史；用户要求本卡准入另核，本轮不推进。
- 同日用户明确“准入，我说的”，并纠正协作模式：Codex按本卡原范围核定 build，改由 Cursor 实施、Codex 独立验收；不再以三贤人签字/豁免阻挡。Cursor 优先实施本卡，DOC-CURSOR-3 排队。

## 下一位Agent提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 DOC-GUIDE-REVISION-1；任务卡 docs/ops/tasks/DOC-GUIDE-REVISION-1-current-entrypoints.md，状态 build。当前是 Codex 分派、你实施、Codex 独立验收的模式，不需要 Kimi/GLM 固定签字。你是 Cursor 限定范围的实施者；先读 AGENTS.md、CLAUDE.md、本卡、docs/testing/cursor-docs-hygiene.md 及 docs/testing/cursor-docs-hygiene-review.md。同步含 r2 准入的 main 并检查工作树，从 main 建独立 worktree /Users/zhangxu/illegal/type-pal-cursor-guides、分支 codex/cursor-guide-revision-r1；若已有未提交工作，先报告，不覆盖。
只修改卡面白名单五份：docs/ops/guides/dev-servers.md、docs/ops/guides/browser-verification.md、README.md、docs/phase2/specs/editor-architecture.md、docs/phase2/guides/debug-tools.md。逐项修 H1～H6、N1、T1；H7 场景 UI 待核，scene-entry-authoring.md 不动。保留历史时点统计与 E2E=1 用途，不把普通 grantSkill 命令写成隔离模拟器。先核现行源码/命令定义，再写可执行文字；不运行迁移 write/recover、覆盖率或 E2E，不改产品/脚本/测试/基线/其它指南。
本分支运行 node scripts/docs/check.mjs、git diff --check，并逐项给原建议→最终文字与文件行号，提交推送候选 SHA。你不得自行合 main 或标 done；Codex 独立复核、集成并清理交付分支。DOC-CURSOR-3 在本卡交付前暂后排。
```
