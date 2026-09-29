# GLM Wave K：一阶段事件系统当前合同补测

入口：[已归档任务卡](../../ops/archive/tasks/done/TEST-GLM-EVENT-WAVE-K-1-current-script-contracts.md)；
[冻结目标与六组](targets.json)；[只读冻结核对](verify-targets.mjs)。
[Codex 对 4ebea2b5 的独立首轮审核](codex-review-4ebea2b5.md)：rework，候选未合 main。
[Codex 对 1f26d421 的独立接收与正式结算](codex-accept-r2-1f26d421.md)：done，正式基线 +55 分支。
GLM 交付记录：[evidence.md](evidence.md)（六组对照 / Vitest JSON / 质量门 / 反控
[counter-control/](counter-control/)）。

生产冻结 `aac9443bfe81799b06afdb1787d32abf7cb43e14`；只写六个新测试文件和本目录的隔离证据。
目标 `packages/game/src/core/event-system.ts` 与 Kimi/GLM 既有六个冻结队列无源码交集。
2026-09-29 受保护 fast 的该文件有 **595 个未覆盖分支**，这是选题线索，
不是当前可达或可新增收益。尤其已有 `event-system.test.ts` 超过 6,000 行，
相邻 `mode`、`scene-system`、`event-opcode-player` 和菜单测试也会间接证明本源；
每组先给出旧证据的 `file:line` / fullName、现行 caller 与一手真值，才加非重复断言。

K01–K06 的合同是 [targets.json](targets.json) 中的六类脚本入口。正控使用合法
`GameState`、当前全局脚本目录及实际 `tickEventSystem` / `tickAutoScripts` /
`runEnterScript` / `runScript` 入口；需要原版数据时从 `data/raw`/当前只读提取结果核字节，
需引擎语义时直接读 `reference/sdlpal/script.c`，不得把 SDL 推断称为 pal.exe 实测。
不靠直接调用私有 `applyRawOpcode`、强转、假造内部游标或 mock 被测核心凑覆盖。

GLM 回执应有逐组「现行 caller → 旧证据 → 新合同/已证/不可达」对照、
新鲜 Vitest JSON `file × fullName × status`、源冻结核对、定向及相邻测试、
Game typecheck、全仓 lint 零诊断、docs/diff、2–4 枚代表业务反控的对照与
有效红判据（失败例的绝对文件/fullName、执行数、恰一个业务失败、无 timeout/skip/基础设施红）。
反控可放本目录的 `counter-control/`，临时注入不得改产品或旧测并须清理。
如没有可证的新合同，该组记 existing-proof/unreachable，不许为了数字改真实行为。

无本批视觉要求：这是纯一阶段脚本测试，截图不能替代 opcode/帧序断言。
正式覆盖率仅由 Codex 在 main 选择性集成后串行 `check → ratchet → protected fast` 结算；
截至派发时全仓分支 78.12%，距 85% 仍差 4,360 臂，不承诺 Wave K 达成该目标。
