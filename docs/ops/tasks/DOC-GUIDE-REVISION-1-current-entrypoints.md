# DOC-GUIDE-REVISION-1 — 现行指南五文件窄修订准入

Status: draft
Owner: Codex
Reviewer: 待准入
Phase: ops
Capability: 现行文档纠错；不改变能力格
Visual Verification Timing: N/A
Branch: 待build准入后安排

Revision: r1
Evidence freeze: a3ceaf05

## 目标与边界

用户要求接收DOC-CURSOR-1后另开修订准入。本卡只列已核实的五份源文档修改，**尚未开build**。
Cursor回执的六项事实成立，H7/N1经[Codex窄复核](../../testing/cursor-docs-hygiene-review.md)
已在65193a84/320800ec更正并接收。此处仅同步前置事实，本卡设计签字/准入仍另核，不自动开build。

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

- 原回执更正已接收；仍须按阶段门确定实现者与准入，不能仅凭本卡draft开始修改五份指南。
- 只读命令定义/当前注册表，必要时复用隔离argv探针；不执行真实迁移write或默认recover路径。
- 文档检查及其工具自测、diff白名单、原建议→最终改文逐项对应。无产品/测试/配置/资产/基线改动，
  不跑全仓测试或覆盖率，不将文档门通过写成产品验收。
- 原历史签字、时点覆盖率、E2E/full/Q1/Q2边界保持；不合main，除非后续收到明确集成指令。

## 推进签字

- Codex：2026-09-25 premise verified（接收报告H1～H6及CR-2直接证据）；design agree（上述五文件窄范围）。
- Kimi：pending（未请求，未代签）。
- GLM：pending（未请求，未代签）。
- 用户缺签豁免：本卡无；既有架构产品队列豁免不自动外推为此文档卡授权。
- build准入：not opened。原回执更正已接收；本卡推进签字或明确豁免另核后，由Codex统一核定。
- done准入：not opened；无实现，无实现验收签名。

## 交接

- 2026-09-25 Codex：只建立修订范围与验收，不修改指南。原卡CR-1/CR-2未闭，不请求他席基于错误回执背书。
- 同日窄返工接收后：原卡CR-1/CR-2已闭，此前阻断记录保留为历史；用户要求本卡准入另核，本轮不推进。

## 下一位Agent提示词

无下一位Agent提示词，等待用户决定修订准入。[DOC-CURSOR-1](DOC-CURSOR-1-current-guide-check.md)
材料已接收，但本卡不授权Cursor或其它Agent开始实现/合main/标done；推进签字路径另核。
